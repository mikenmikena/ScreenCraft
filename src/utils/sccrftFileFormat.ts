import {
  ElementFormatting,
  ElementType,
  Scene,
  ScreenplayElement,
  StoryCharacter,
  StoryProject,
  StripboardStrip,
} from '../types/story';
import { parseFountain } from './screenplayParser';

export const SCCRFT_EXTENSION = '.sccrft';
export const STORAGE_KEY_USER_TEMPLATES = 'screencraft_user_templates_v1';

export interface SccrftFileEnvelope {
  format: 'ScreenCraftDocument';
  version: 1;
  savedAt: string;
  project: StoryProject;
}

export type UserTemplateCategory = 'film' | 'stage' | 'book' | 'television';

export interface UserDocumentTemplate {
  id: string;
  name: string;
  category: UserTemplateCategory;
  description: string;
  savedAt: string;
  templateProject: StoryProject;
}

interface NativeFileSystemWritable {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface NativeFileSystemHandle {
  name: string;
  createWritable: () => Promise<NativeFileSystemWritable>;
}

interface NativeWindowFilePickers extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<NativeFileSystemHandle>;
}

const fileHandlesByProjectId = new Map<string, NativeFileSystemHandle>();

export function hasBoundSccrftHandle(projectId: string): boolean {
  return fileHandlesByProjectId.has(projectId);
}

export function getSanitizedSccrftFileName(title: string): string {
  const base = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeBase = base || 'screenplay';
  return safeBase.toLowerCase().endsWith(SCCRFT_EXTENSION)
    ? safeBase
    : `${safeBase}${SCCRFT_EXTENSION}`;
}

export function normalizeSccrftFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_');
  const base = cleaned || 'screenplay';
  return base.toLowerCase().endsWith(SCCRFT_EXTENSION)
    ? base
    : `${base}${SCCRFT_EXTENSION}`;
}

export function serializeProjectToSccrft(project: StoryProject): string {
  const envelope: SccrftFileEnvelope = {
    format: 'ScreenCraftDocument',
    version: 1,
    savedAt: new Date().toISOString(),
    project,
  };
  return JSON.stringify(envelope, null, 2);
}

function triggerBlobDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type SaveSccrftResult =
  | { status: 'saved'; fileName: string; method: 'native_handle' | 'native_picker' | 'download' }
  | { status: 'cancelled' }
  | { status: 'needs_save_as_dialog'; suggestedFileName: string };

export async function saveSccrftLocally(
  project: StoryProject,
  options: { saveAs?: boolean; customFileName?: string } = {}
): Promise<SaveSccrftResult> {
  const content = serializeProjectToSccrft(project);
  const suggestedName = options.customFileName
    ? normalizeSccrftFileName(options.customFileName)
    : getSanitizedSccrftFileName(project.title);

  // If explicit custom filename is provided (e.g. from Save As modal), download directly
  if (options.customFileName) {
    triggerBlobDownload(content, suggestedName, 'application/vnd.screencraft+json');
    return { status: 'saved', fileName: suggestedName, method: 'download' };
  }

  // Write silently to an existing handle if saving (not Save As)
  const existingHandle = !options.saveAs ? fileHandlesByProjectId.get(project.id) : undefined;
  if (existingHandle) {
    try {
      const writable = await existingHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return {
        status: 'saved',
        fileName: existingHandle.name || suggestedName,
        method: 'native_handle',
      };
    } catch {
      fileHandlesByProjectId.delete(project.id);
    }
  }

  // Try native File System Access save picker when available
  const pickerWin = window as NativeWindowFilePickers;
  if (typeof pickerWin.showSaveFilePicker === 'function') {
    try {
      const handle = await pickerWin.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'ScreenCraft Document (.sccrft)',
            accept: {
              'application/vnd.screencraft+json': [SCCRFT_EXTENSION],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      fileHandlesByProjectId.set(project.id, handle);
      return {
        status: 'saved',
        fileName: handle.name || suggestedName,
        method: 'native_picker',
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { status: 'cancelled' };
      }
      // Cross-origin iframe / SecurityError fallback: let Save As ask filename or Save download directly
      if (options.saveAs) {
        return { status: 'needs_save_as_dialog', suggestedFileName: suggestedName };
      }
    }
  } else if (options.saveAs) {
    return { status: 'needs_save_as_dialog', suggestedFileName: suggestedName };
  }

  triggerBlobDownload(content, suggestedName, 'application/vnd.screencraft+json');
  return { status: 'saved', fileName: suggestedName, method: 'download' };
}

function eighthsToFraction(eighths: number): string {
  const safe = Math.max(1, eighths);
  const whole = Math.floor(safe / 8);
  const rem = safe % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
}

function formatTimecode(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

function parseIntExtAndDayNight(heading: string): {
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  dayNight: 'DAY' | 'NIGHT' | 'EVENING' | 'DUSK' | 'DAWN';
  setting: string;
} {
  const upper = heading.toUpperCase();
  const isIntExt = upper.includes('INT/EXT') || upper.includes('I/E') || upper.includes('EXT/INT');
  const isExt = !isIntExt && upper.includes('EXT');
  const intExt: 'INT' | 'EXT' | 'INT/EXT' = isIntExt ? 'INT/EXT' : isExt ? 'EXT' : 'INT';

  let dayNight: 'DAY' | 'NIGHT' | 'EVENING' | 'DUSK' | 'DAWN' = 'DAY';
  if (upper.includes('NIGHT')) dayNight = 'NIGHT';
  else if (upper.includes('DUSK')) dayNight = 'DUSK';
  else if (upper.includes('DAWN')) dayNight = 'DAWN';
  else if (upper.includes('EVENING')) dayNight = 'EVENING';

  const parts = upper.split(/[-–—]/);
  const setting = (parts[0] || upper)
    .replace(/^(SCENE\s+\d+\s*:?\s*)?(INT|EXT|INT\/EXT|EXT\/INT|I\/E)[\.\s]*/i, '')
    .trim();

  return {
    intExt,
    dayNight,
    setting: setting || 'MAIN LOCATION',
  };
}

function buildCharactersFromElements(
  elements: ScreenplayElement[],
  scenes: Scene[]
): StoryCharacter[] {
  const palette = ['#00d2d3', '#ff6b6b', '#feca57', '#54a0ff', '#1dd1a1', '#ff9ff3'];
  const names = Array.from(
    new Set(
      elements
        .filter((e) => e.type === 'CHARACTER')
        .map((e) => (e.character || e.text.replace(/\s*\([^)]*\)$/, '')).trim())
        .filter(Boolean)
    )
  );

  return names.map((name, idx) => ({
    name,
    color: palette[idx % palette.length],
    scenesCount: scenes.filter((s) => s.characters.includes(name)).length,
    speakingLines: elements.filter(
      (e) =>
        e.type === 'CHARACTER' &&
        (e.character || e.text.replace(/\s*\([^)]*\)$/, '')).trim() === name
    ).length,
  }));
}

function buildStripsFromScenes(scenes: Scene[]): StripboardStrip[] {
  return scenes.map((sc) => {
    const isNight = sc.dayNight === 'NIGHT' || sc.dayNight === 'DUSK';
    const isExt = sc.intExt === 'EXT';
    const colorClass = isNight
      ? isExt
        ? 'night-ext'
        : 'night-int'
      : isExt
      ? 'day-ext'
      : 'day-int';

    return {
      id: `strip-${sc.id}`,
      type: 'scene',
      sceneId: sc.id,
      sceneNumber: sc.sceneNumber,
      intExt: sc.intExt,
      dayNight: sc.dayNight,
      set: sc.setting,
      runningTime: sc.timecode,
      pages: sc.pages,
      eighths: sc.eighths,
      storyDay: sc.storyDay,
      scheduledDuration: '01:30',
      characters: sc.characters,
      timeOfDay: sc.timeOfDay,
      colorClass,
    };
  });
}

function mapFdxTypeToElementType(
  fdxTypeRaw: string,
  prevCharText: string | undefined
): ElementType {
  const normalized = fdxTypeRaw.trim().toLowerCase();
  if (normalized === 'scene heading') return 'SCENE_HEADING';
  if (normalized === 'action') return 'ACTION';
  if (normalized === 'character') return 'CHARACTER';
  if (normalized === 'parenthetical') return 'PARENTHETICAL';
  if (normalized === 'dialogue') {
    if (prevCharText && /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(prevCharText)) {
      return 'VOICE_OVER';
    }
    return 'DIALOGUE';
  }
  if (normalized === 'transition') return 'TRANSITION';
  if (normalized === 'shot') return 'SHOT';
  if (normalized === 'cast list') return 'CAST_LIST';
  if (normalized === 'new act') return 'NEW_ACT';
  if (normalized === 'sequence') return 'SEQUENCE';
  if (normalized === 'end of act') return 'END_OF_ACT';
  if (normalized === 'summary') return 'SUMMARY';
  if (normalized === 'outline 1') return 'OUTLINE_1';
  if (normalized === 'outline 2') return 'OUTLINE_2';
  if (normalized === 'outline 3') return 'OUTLINE_3';
  if (normalized === 'note' || normalized === 'script note') return 'NOTE';
  if (normalized === 'general') return 'GENERAL';
  return 'ACTION';
}

export function parseFinalDraftFdx(xmlText: string, fileName: string): StoryProject {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    throw new Error('Invalid Final Draft (.fdx) XML document.');
  }

  const root = doc.querySelector('FinalDraft');
  if (!root) {
    throw new Error('Missing <FinalDraft> root element in .fdx file.');
  }

  const baseName = fileName.replace(/\.fdx$/i, '').trim() || 'Imported Final Draft Script';
  let extractedTitle = baseName;
  let extractedAuthor = 'Unknown Author';

  const titlePageParagraphs = Array.from(doc.querySelectorAll('TitlePage Content Paragraph'));
  for (const p of titlePageParagraphs) {
    const pType = (p.getAttribute('Type') || '').toLowerCase();
    const pText = Array.from(p.querySelectorAll('Text'))
      .map((n) => n.textContent || '')
      .join('')
      .trim();
    if (!pText) continue;
    if (pType === 'title' && extractedTitle === baseName) {
      extractedTitle = pText;
    } else if (pType.includes('author')) {
      extractedAuthor = pText.replace(/^written\s+by\s+/i, '').trim() || extractedAuthor;
    }
  }

  // Locate main body <Content> direct child of <FinalDraft>
  const directContent = Array.from(root.children).find(
    (child) => child.tagName.toLowerCase() === 'content'
  );
  const paragraphs = directContent
    ? Array.from(directContent.children).filter((c) => c.tagName.toLowerCase() === 'paragraph')
    : Array.from(doc.querySelectorAll('FinalDraft > Content > Paragraph'));

  const nowTs = Date.now();
  const elements: ScreenplayElement[] = [];
  const scenes: Scene[] = [];

  let currentSceneNumber = 0;
  let currentSceneId = `sc-fdx-${nowTs}-0`;
  let currentSceneHeading = '';
  let currentSceneCharacters = new Set<string>();
  let currentSceneLineCount = 0;
  let cumulativeSeconds = 0;
  let lastCharElementText: string | undefined;
  let lastCharCleanName: string | undefined;

  const finalizeCurrentScene = () => {
    if (!currentSceneHeading) return;
    const eighths = Math.max(1, Math.round((Math.max(4, currentSceneLineCount) / 55) * 8));
    const duration = Math.max(15, Math.round((eighths / 8) * 60));
    const parsedMeta = parseIntExtAndDayNight(currentSceneHeading);

    scenes.push({
      id: currentSceneId,
      sceneNumber: currentSceneNumber,
      heading: currentSceneHeading,
      setting: parsedMeta.setting,
      intExt: parsedMeta.intExt,
      dayNight: parsedMeta.dayNight,
      timecode: formatTimecode(cumulativeSeconds),
      durationSec: duration,
      pages: eighthsToFraction(eighths),
      eighths,
      characters: Array.from(currentSceneCharacters),
      synopsis: `Scene ${currentSceneNumber} at ${parsedMeta.setting}`,
      notes: '',
      budget: '$10,000',
      location: parsedMeta.setting,
      act: currentSceneNumber <= 3 ? 1 : currentSceneNumber <= 7 ? 2 : 3,
      storyDay: Math.ceil(currentSceneNumber / 4),
      timeOfDay: parsedMeta.dayNight === 'NIGHT' ? '21:00' : '09:00',
    });

    cumulativeSeconds += duration;
    currentSceneCharacters = new Set<string>();
    currentSceneLineCount = 0;
  };

  paragraphs.forEach((p, idx) => {
    const fdxType = p.getAttribute('Type') || 'Action';
    const textNodes = Array.from(p.querySelectorAll('Text'));
    const rawText = (
      textNodes.length > 0
        ? textNodes.map((t) => t.textContent || '').join('')
        : p.textContent || ''
    ).replace(/\r/g, '');

    if (!rawText.trim()) return;

    const elType = mapFdxTypeToElementType(fdxType, lastCharElementText);

    // Extract basic inline formatting flags from <Text Style="...">
    const stylesJoined = textNodes
      .map((t) => t.getAttribute('Style') || '')
      .join(' ')
      .toLowerCase();
    const formatting: ElementFormatting = {};
    if (stylesJoined.includes('bold')) formatting.bold = true;
    if (stylesJoined.includes('italic')) formatting.italic = true;
    if (stylesJoined.includes('underline')) formatting.underline = true;
    if (stylesJoined.includes('strikeout') || stylesJoined.includes('strikethrough')) {
      formatting.strikethrough = true;
    }

    if (elType === 'SCENE_HEADING') {
      finalizeCurrentScene();
      currentSceneNumber += 1;
      currentSceneId = `sc-fdx-${nowTs}-${currentSceneNumber}`;
      currentSceneHeading = rawText.trim().toUpperCase();
      lastCharElementText = undefined;
      lastCharCleanName = undefined;
    } else if (currentSceneNumber === 0) {
      // Ensure pre-heading elements still bind cleanly to an initial scene
      currentSceneNumber = 1;
      currentSceneId = `sc-fdx-${nowTs}-1`;
      currentSceneHeading = 'INT. OPENING SCENE - DAY';
    }

    currentSceneLineCount += Math.max(1, Math.ceil(rawText.length / 55));

    let characterAttr: string | undefined;
    if (elType === 'CHARACTER') {
      lastCharElementText = rawText.trim();
      lastCharCleanName = rawText.trim().replace(/\s*\([^)]*\)$/, '').trim();
      characterAttr = lastCharCleanName;
      if (lastCharCleanName) currentSceneCharacters.add(lastCharCleanName);
    } else if (elType === 'DIALOGUE' || elType === 'VOICE_OVER') {
      characterAttr = lastCharCleanName;
    } else if (elType !== 'PARENTHETICAL') {
      lastCharElementText = undefined;
      lastCharCleanName = undefined;
    }

    elements.push({
      id: `el-fdx-${nowTs}-${idx + 1}`,
      type: elType,
      text: rawText.trim(),
      sceneId: currentSceneId,
      ...(characterAttr ? { character: characterAttr } : {}),
      ...(Object.keys(formatting).length > 0 ? { formatting } : {}),
    });
  });

  finalizeCurrentScene();

  if (elements.length === 0) {
    const fallbackSceneId = `sc-fdx-${nowTs}-1`;
    scenes.push({
      id: fallbackSceneId,
      sceneNumber: 1,
      heading: 'INT. UNTITLED SCENE - DAY',
      setting: 'UNTITLED SCENE',
      intExt: 'INT',
      dayNight: 'DAY',
      timecode: '00:00:00',
      durationSec: 60,
      pages: '1/8',
      eighths: 1,
      characters: [],
      synopsis: 'Imported Final Draft document.',
      notes: '',
      budget: '$0',
      location: 'UNTITLED SCENE',
      act: 1,
      storyDay: 1,
      timeOfDay: '09:00',
    });
    elements.push({
      id: `el-fdx-${nowTs}-1`,
      type: 'SCENE_HEADING',
      text: 'INT. UNTITLED SCENE - DAY',
      sceneId: fallbackSceneId,
    });
  }

  return {
    id: `proj-fdx-${nowTs}`,
    title: extractedTitle,
    author: extractedAuthor,
    lastModified: 'Opened from .fdx',
    documentCategory: 'film',
    scriptFormat: 'single_column_film',
    elements,
    scenes,
    tags: [],
    comments: [],
    strips: buildStripsFromScenes(scenes),
    characters: buildCharactersFromElements(elements, scenes),
  };
}

export function parseFountainFile(fountainText: string, fileName: string): StoryProject {
  const baseName =
    fileName.replace(/\.(fountain|txt)$/i, '').trim() || 'Imported Fountain Script';
  let extractedTitle = baseName;
  let extractedAuthor = 'Unknown Author';

  const normalized = fountainText.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let bodyStartIdx = 0;

  // Read optional Fountain key: value title page header block
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      bodyStartIdx = i + 1;
      break;
    }
    const kvMatch = trimmed.match(/^([A-Za-z ]+):\s*(.+)$/);
    if (!kvMatch) {
      break;
    }
    const key = kvMatch[1].trim().toLowerCase();
    const val = kvMatch[2].trim();
    if (key === 'title' && val) extractedTitle = val;
    else if ((key === 'author' || key === 'authors') && val) extractedAuthor = val;
    bodyStartIdx = i + 1;
  }

  const scriptBody = lines.slice(bodyStartIdx).join('\n').trim() || normalized;
  const parsed = parseFountain(scriptBody);
  const nowTs = Date.now();

  let finalElements = parsed.elements;
  let finalScenes = parsed.scenes;

  if (finalScenes.length === 0) {
    const scId = `sc-fountain-${nowTs}-1`;
    finalScenes = [
      {
        id: scId,
        sceneNumber: 1,
        heading: 'INT. SCENE ONE - DAY',
        setting: 'SCENE ONE',
        intExt: 'INT',
        dayNight: 'DAY',
        timecode: '00:00:00',
        durationSec: 60,
        pages: '1',
        eighths: 8,
        characters: [],
        synopsis: 'Imported Fountain script.',
        notes: '',
        budget: '$0',
        location: 'SCENE ONE',
        act: 1,
        storyDay: 1,
        timeOfDay: '09:00',
      },
    ];
    finalElements =
      finalElements.length > 0
        ? finalElements.map((el) => ({ ...el, sceneId: el.sceneId || scId }))
        : [
            {
              id: `el-fountain-${nowTs}-1`,
              type: 'SCENE_HEADING',
              text: 'INT. SCENE ONE - DAY',
              sceneId: scId,
            },
          ];
  }

  return {
    id: `proj-fountain-${nowTs}`,
    title: extractedTitle,
    author: extractedAuthor,
    lastModified: 'Opened from .fountain',
    documentCategory: 'film',
    scriptFormat: 'single_column_film',
    elements: finalElements,
    scenes: finalScenes,
    tags: [],
    comments: [],
    strips: buildStripsFromScenes(finalScenes),
    characters: buildCharactersFromElements(finalElements, finalScenes),
  };
}

export function parseSccrftDocument(jsonText: string, fileName: string): StoryProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid .sccrft file: could not parse JSON structure.');
  }

  const candidate =
    parsed &&
    typeof parsed === 'object' &&
    'project' in parsed &&
    (parsed as SccrftFileEnvelope).project
      ? (parsed as SccrftFileEnvelope).project
      : (parsed as StoryProject);

  if (
    !candidate ||
    typeof candidate !== 'object' ||
    typeof candidate.title !== 'string' ||
    !Array.isArray(candidate.elements)
  ) {
    throw new Error('Invalid .sccrft file: missing ScreenCraft document payload.');
  }

  const fallbackTitle = fileName.replace(/\.sccrft$/i, '').trim() || 'Opened Document';
  const scenes = Array.isArray(candidate.scenes) ? candidate.scenes : [];
  const elements = Array.isArray(candidate.elements) ? candidate.elements : [];

  return {
    ...candidate,
    id: candidate.id || `proj-sccrft-${Date.now()}`,
    title: candidate.title || fallbackTitle,
    author: candidate.author || 'Unknown Author',
    lastModified: 'Opened from .sccrft',
    elements,
    scenes,
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    comments: Array.isArray(candidate.comments) ? candidate.comments : [],
    strips: Array.isArray(candidate.strips) ? candidate.strips : buildStripsFromScenes(scenes),
    characters: Array.isArray(candidate.characters)
      ? candidate.characters
      : buildCharactersFromElements(elements, scenes),
  };
}

export function parseOpenedDocumentFile(fileName: string, content: string): StoryProject {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.sccrft')) {
    return parseSccrftDocument(content, fileName);
  }
  if (lower.endsWith('.fdx')) {
    return parseFinalDraftFdx(content, fileName);
  }
  if (lower.endsWith('.fountain') || lower.endsWith('.txt')) {
    return parseFountainFile(content, fileName);
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    return parseSccrftDocument(content, fileName);
  }
  if (trimmed.startsWith('<')) {
    return parseFinalDraftFdx(content, fileName);
  }
  return parseFountainFile(content, fileName);
}

// ==========================================
// User Saved Document Templates (.sccrft)
// ==========================================

export function loadUserTemplates(): UserDocumentTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_TEMPLATES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjectAsUserTemplate(
  project: StoryProject,
  options: {
    name: string;
    category: UserTemplateCategory;
    description?: string;
  }
): UserDocumentTemplate[] {
  const existing = loadUserTemplates();
  const clonedProject: StoryProject = JSON.parse(JSON.stringify(project));
  const templateEntry: UserDocumentTemplate = {
    id: `tpl-${Date.now()}`,
    name: options.name.trim() || `${project.title} Template`,
    category: options.category,
    description:
      options.description?.trim() ||
      `Custom ${options.category} template (${project.scenes.length} scenes, ${project.elements.length} elements)`,
    savedAt: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    templateProject: {
      ...clonedProject,
      documentCategory: options.category,
    },
  };

  const next = [templateEntry, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY_USER_TEMPLATES, JSON.stringify(next));
  } catch {
    // ignore storage quota errors gracefully
  }
  return next;
}

export function deleteUserTemplate(templateId: string): UserDocumentTemplate[] {
  const next = loadUserTemplates().filter((t) => t.id !== templateId);
  try {
    localStorage.setItem(STORAGE_KEY_USER_TEMPLATES, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function instantiateProjectFromUserTemplate(
  tpl: UserDocumentTemplate,
  options?: { title?: string; author?: string }
): StoryProject {
  const uid = Date.now();
  const cloned: StoryProject = JSON.parse(JSON.stringify(tpl.templateProject));
  const sceneIdMap = new Map<string, string>();

  const remappedScenes = (cloned.scenes || []).map((sc, idx) => {
    const nextId = `sc-tpl-${uid}-${idx + 1}`;
    sceneIdMap.set(sc.id, nextId);
    return { ...sc, id: nextId };
  });

  const remappedElements = (cloned.elements || []).map((el, idx) => ({
    ...el,
    id: `el-tpl-${uid}-${idx + 1}`,
    sceneId: el.sceneId ? sceneIdMap.get(el.sceneId) || el.sceneId : undefined,
  }));

  const remappedStrips = (cloned.strips || []).map((st, idx) => ({
    ...st,
    id: `st-tpl-${uid}-${idx + 1}`,
    sceneId: st.sceneId ? sceneIdMap.get(st.sceneId) || st.sceneId : undefined,
  }));

  const remappedTags = (cloned.tags || []).map((tag, idx) => ({
    ...tag,
    id: `tag-tpl-${uid}-${idx + 1}`,
    sceneIds: (tag.sceneIds || []).map((sid) => sceneIdMap.get(sid) || sid),
  }));

  return {
    ...cloned,
    id: `proj-tpl-${uid}`,
    title: options?.title?.trim() || cloned.title || tpl.name,
    author: options?.author?.trim() || cloned.author || 'Jeffrey (Online)',
    lastModified: 'Created from template',
    documentCategory: tpl.category,
    scenes: remappedScenes,
    elements: remappedElements,
    strips: remappedStrips,
    tags: remappedTags,
    comments: [],
    revisions: [],
  };
}
