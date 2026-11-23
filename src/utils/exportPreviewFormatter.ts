import { ElementType, Scene, ScreenplayElement, StoryProject } from '../types/story';
import {
  exportScheduleCsv,
  exportToFinalDraftFdx,
  serializeToFountain,
} from './screenplayParser';
import { buildNLEMetadataDocument, exportPremiereProXML } from './nleMetadataPipeline';

export type ExportFormatType =
  | 'pdf'
  | 'fdx'
  | 'fountain'
  | 'csv'
  | 'json'
  | 'premiere_xml'
  | 'nle_json'
  | 'rust_zip';

export interface ExportPreviewOptions {
  includeTitlePage: boolean;
  includeSceneNumbers: boolean;
  includePageNumbers: boolean;
}

export interface PaginatedScriptBlock {
  id: string;
  elementId: string;
  type: ElementType;
  fdxType: string;
  text: string;
  lines: string[];
  sceneNumber?: number;
  isContinued?: boolean;
  speakerLabel?: string;
  lineCount: number;
  spaceBefore: number;
  spaceAfter: number;
}

export interface PaginatedScriptPage {
  pageNumber: number;
  blocks: PaginatedScriptBlock[];
  linesUsed: number;
  sceneNumbersOnPage: number[];
}

export interface ExportPreviewSummary {
  scriptPageCount: number;
  totalOutputPages: number;
  totalLines: number;
  sceneCount: number;
  elementCount: number;
  wordCount: number;
  estimatedMinutes: number;
  eighthsTotal: number;
  eighthsLabel: string;
  estimatedByteSize: number;
  formattedByteSize: string;
  fdxParagraphBreakdown: Record<string, number>;
}

export interface ExportPreviewResult {
  pages: PaginatedScriptPage[];
  rawSource: string;
  rawLineCount: number;
  csvRows: string[][];
  summary: ExportPreviewSummary;
}

const MAX_LINES_PER_PAGE = 54;

function wrapTextToLines(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split('\n');
  const result: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        if (word.length <= maxChars) {
          currentLine = word;
        } else {
          // Hard split overly long continuous token
          for (let i = 0; i < word.length; i += maxChars) {
            result.push(word.slice(i, i + maxChars));
          }
        }
      } else if (currentLine.length + 1 + word.length <= maxChars) {
        currentLine = `${currentLine} ${word}`;
      } else {
        result.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      result.push(currentLine);
    }
  }

  return result.length > 0 ? result : [''];
}

export function mapElementToFdxType(type: ElementType): string {
  switch (type) {
    case 'SCENE_HEADING':
      return 'Scene Heading';
    case 'CHARACTER':
      return 'Character';
    case 'DIALOGUE':
    case 'VOICE_OVER':
      return 'Dialogue';
    case 'PARENTHETICAL':
      return 'Parenthetical';
    case 'TRANSITION':
      return 'Transition';
    case 'SHOT':
      return 'Shot';
    case 'CAST_LIST':
      return 'Cast List';
    case 'NEW_ACT':
      return 'New Act';
    case 'END_OF_ACT':
      return 'End of Act';
    case 'OUTLINE_1':
      return 'Outline 1';
    case 'OUTLINE_2':
      return 'Outline 2';
    case 'OUTLINE_3':
      return 'Outline 3';
    case 'NOTE':
      return 'Note';
    case 'GENERAL':
    case 'SEQUENCE':
    case 'SUMMARY':
      return 'General';
    case 'ACTION':
    default:
      return 'Action';
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatEighthsLabel(eighths: number): string {
  if (eighths <= 0) return '0/8';
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
}

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export function paginateScreenplayForExport(
  project: StoryProject,
  options: ExportPreviewOptions
): {
  pages: PaginatedScriptPage[];
  totalLines: number;
  fdxParagraphBreakdown: Record<string, number>;
} {
  const sceneMap = new Map<string, Scene>();
  project.scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const rawBlocks: PaginatedScriptBlock[] = [];
  const fdxParagraphBreakdown: Record<string, number> = {};

  const trackFdxType = (fdxType: string) => {
    fdxParagraphBreakdown[fdxType] = (fdxParagraphBreakdown[fdxType] || 0) + 1;
  };

  for (let i = 0; i < project.elements.length; i++) {
    const el: ScreenplayElement = project.elements[i];
    const scene = el.sceneId ? sceneMap.get(el.sceneId) : undefined;
    const prevEl = i > 0 ? project.elements[i - 1] : undefined;
    const nextEl = i + 1 < project.elements.length ? project.elements[i + 1] : undefined;
    const nextAfterParen =
      nextEl?.type === 'PARENTHETICAL' ? project.elements[i + 2] : undefined;

    if (
      el.type === 'VOICE_OVER' &&
      prevEl?.type !== 'CHARACTER' &&
      prevEl?.type !== 'PARENTHETICAL'
    ) {
      const synthCharText = `${(el.character || 'NARRATOR').toUpperCase()} (V.O.)`;
      const charLines = wrapTextToLines(synthCharText, 38);
      trackFdxType('Character');
      rawBlocks.push({
        id: `${el.id}-synth-char`,
        elementId: el.id,
        type: 'CHARACTER',
        fdxType: 'Character',
        text: synthCharText,
        lines: charLines,
        sceneNumber: scene?.sceneNumber,
        lineCount: charLines.length,
        spaceBefore: 1,
        spaceAfter: 0,
      });
    }

    let displayText = el.text || '';
    if (el.type === 'CHARACTER') {
      const followedByVO =
        nextEl?.type === 'VOICE_OVER' || nextAfterParen?.type === 'VOICE_OVER';
      const alreadyHasVO = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(displayText);
      if (followedByVO && !alreadyHasVO) {
        displayText = `${displayText.trim()} (V.O.)`;
      } else {
        displayText = displayText.toUpperCase();
      }
    } else if (
      el.type === 'SCENE_HEADING' ||
      el.type === 'TRANSITION' ||
      el.type === 'SHOT' ||
      el.type === 'NEW_ACT' ||
      el.type === 'END_OF_ACT' ||
      el.type === 'SEQUENCE' ||
      el.type === 'CAST_LIST'
    ) {
      displayText = displayText.toUpperCase();
    }

    let maxChars = 60;
    let spaceBefore = 0;
    let spaceAfter = 1;

    switch (el.type) {
      case 'SCENE_HEADING':
        maxChars = options.includeSceneNumbers ? 52 : 60;
        spaceBefore = 2;
        spaceAfter = 1;
        break;
      case 'NEW_ACT':
      case 'END_OF_ACT':
        maxChars = 48;
        spaceBefore = 2;
        spaceAfter = 2;
        break;
      case 'SEQUENCE':
        maxChars = 56;
        spaceBefore = 2;
        spaceAfter = 1;
        break;
      case 'ACTION':
      case 'GENERAL':
      case 'CAST_LIST':
      case 'SUMMARY':
      case 'OUTLINE_1':
      case 'OUTLINE_2':
      case 'OUTLINE_3':
      case 'NOTE':
        maxChars = 60;
        spaceBefore = el.type === 'OUTLINE_1' ? 1 : 0;
        spaceAfter = 1;
        break;
      case 'CHARACTER':
        maxChars = 38;
        spaceBefore = 1;
        spaceAfter = 0;
        break;
      case 'PARENTHETICAL':
        maxChars = 24;
        spaceBefore = 0;
        spaceAfter = 0;
        if (displayText && !displayText.startsWith('(')) {
          displayText = `(${displayText})`;
        }
        break;
      case 'DIALOGUE':
      case 'VOICE_OVER':
        maxChars = 35;
        spaceBefore = 0;
        spaceAfter = nextEl?.type === 'PARENTHETICAL' ? 0 : 1;
        break;
      case 'TRANSITION':
        maxChars = 24;
        spaceBefore = 1;
        spaceAfter = 1;
        break;
      case 'SHOT':
        maxChars = 58;
        spaceBefore = 1;
        spaceAfter = 1;
        break;
    }

    const lines = wrapTextToLines(displayText, maxChars);
    const fdxType = mapElementToFdxType(el.type);
    trackFdxType(fdxType);

    rawBlocks.push({
      id: el.id,
      elementId: el.id,
      type: el.type,
      fdxType,
      text: displayText,
      lines,
      sceneNumber: el.type === 'SCENE_HEADING' ? scene?.sceneNumber : undefined,
      lineCount: lines.length,
      spaceBefore,
      spaceAfter,
    });
  }

  // Paginate blocks while avoiding orphaned Scene Headings or Character cues
  const pages: PaginatedScriptPage[] = [];
  let currentBlocks: PaginatedScriptBlock[] = [];
  let currentLinesUsed = 0;
  let totalLines = 0;

  const flushPage = () => {
    const sceneNums = Array.from(
      new Set(
        currentBlocks
          .map((b) => b.sceneNumber)
          .filter((n): n is number => typeof n === 'number')
      )
    );
    pages.push({
      pageNumber: pages.length + 1,
      blocks: currentBlocks,
      linesUsed: currentLinesUsed,
      sceneNumbersOnPage: sceneNums,
    });
    currentBlocks = [];
    currentLinesUsed = 0;
  };

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];
    const effectiveSpaceBefore = currentBlocks.length === 0 ? 0 : block.spaceBefore;
    const neededLines = effectiveSpaceBefore + block.lineCount;

    // Lookahead orphan protection for Scene Headings and Character cues
    let orphanReservedLines = 0;
    if (block.type === 'CHARACTER' && i + 1 < rawBlocks.length) {
      const nextBlock = rawBlocks[i + 1];
      orphanReservedLines = Math.min(2, nextBlock.lineCount);
    } else if (block.type === 'SCENE_HEADING' && i + 1 < rawBlocks.length) {
      orphanReservedLines = 2;
    }

    if (
      currentBlocks.length > 0 &&
      currentLinesUsed + neededLines + orphanReservedLines > MAX_LINES_PER_PAGE
    ) {
      flushPage();
    }

    const activeSpaceBefore = currentBlocks.length === 0 ? 0 : block.spaceBefore;
    const placedBlock: PaginatedScriptBlock = {
      ...block,
      spaceBefore: activeSpaceBefore,
    };

    currentBlocks.push(placedBlock);
    const added = activeSpaceBefore + block.lineCount + block.spaceAfter;
    currentLinesUsed = Math.min(MAX_LINES_PER_PAGE, currentLinesUsed + added);
    totalLines += activeSpaceBefore + block.lineCount;
  }

  if (currentBlocks.length > 0 || pages.length === 0) {
    flushPage();
  }

  return { pages, totalLines, fdxParagraphBreakdown };
}

export function buildExportPreview(
  project: StoryProject,
  format: ExportFormatType,
  options: ExportPreviewOptions
): ExportPreviewResult {
  const { pages, totalLines, fdxParagraphBreakdown } = paginateScreenplayForExport(
    project,
    options
  );

  const wordCount = project.elements.reduce((acc, el) => {
    const words = el.text.trim().split(/\s+/).filter(Boolean);
    return acc + words.length;
  }, 0);

  const eighthsTotal = project.scenes.reduce((acc, s) => acc + (s.eighths || 0), 0);
  const scriptPageCount = pages.length;
  const totalOutputPages =
    (format === 'pdf' || format === 'fdx') && options.includeTitlePage
      ? scriptPageCount + 1
      : scriptPageCount;

  let rawSource = '';
  let csvRows: string[][] = [];

  if (format === 'fdx') {
    rawSource = exportToFinalDraftFdx(project, {
      includeSceneNumbers: options.includeSceneNumbers,
      includeTitlePage: options.includeTitlePage,
    });
  } else if (format === 'fountain') {
    rawSource = serializeToFountain(project);
  } else if (format === 'csv') {
    rawSource = exportScheduleCsv(project);
    csvRows = rawSource
      .trim()
      .split('\n')
      .map((line) => parseCsvRow(line));
  } else if (format === 'premiere_xml') {
    rawSource = exportPremiereProXML(project, 24);
  } else if (format === 'nle_json') {
    rawSource = JSON.stringify(buildNLEMetadataDocument(project, 24), null, 2);
  } else if (format === 'json') {
    rawSource = JSON.stringify(project, null, 2);
  } else if (format === 'rust_zip') {
    rawSource = [
      `# ScreenCraft Desktop Bundle Manifest`,
      `# Project: ${project.title}`,
      `# Author: ${project.author}`,
      ``,
      `Cargo.toml`,
      `src-tauri/tauri.conf.json`,
      `src-tauri/src/main.rs`,
      `assets/project.story.json (${project.elements.length} screenplay elements, ${project.scenes.length} scenes)`,
      `assets/script.fountain`,
      `.github/workflows/release.yml`,
    ].join('\n');
  } else {
    // PDF preview uses paginated pages directly, plus plain text fallback byte count
    rawSource = serializeToFountain(project);
  }

  const estimatedByteSize =
    format === 'pdf'
      ? Math.max(18_400, totalOutputPages * 12_800 + rawSource.length * 2)
      : new Blob([rawSource]).size;

  const rawLineCount = rawSource ? rawSource.split('\n').length : 0;

  return {
    pages,
    rawSource,
    rawLineCount,
    csvRows,
    summary: {
      scriptPageCount,
      totalOutputPages,
      totalLines,
      sceneCount: project.scenes.length,
      elementCount: project.elements.length,
      wordCount,
      estimatedMinutes: Math.max(1, scriptPageCount),
      eighthsTotal,
      eighthsLabel: formatEighthsLabel(eighthsTotal),
      estimatedByteSize,
      formattedByteSize: formatBytes(estimatedByteSize),
      fdxParagraphBreakdown,
    },
  };
}
