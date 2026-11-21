import {
  CharacterPresenceCrossRefReport,
  CharacterScheduleSlot,
  CharacterSimultaneousLocationConflict,
  ElementType,
  NLEBlockMetadata,
  NLEDialogueEntry,
  NLEExportConfig,
  NLEExportPreset,
  NLEFrameRate,
  NLEGeneratedSidecarEntry,
  NLEMetadataDocument,
  NLESidecarFormat,
  Scene,
  ScreenplayElement,
  StoryProject,
  TranscriptAlignmentMatch,
  TranscriptSegment,
} from '../types/story';

const normalizeText = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (raw: string): string[] => {
  const norm = normalizeText(raw);
  return norm ? norm.split(' ') : [];
};

const pad2 = (n: number) => Math.floor(n).toString().padStart(2, '0');

export const secondsToSMPTE = (seconds: number, fps: NLEFrameRate): string => {
  const safeSec = Math.max(0, seconds);
  const nominalFps = Math.round(fps);
  const totalFrames = Math.round(safeSec * nominalFps);
  const frames = totalFrames % nominalFps;
  const totalSec = Math.floor(totalFrames / nominalFps);
  const secs = totalSec % 60;
  const mins = Math.floor(totalSec / 60) % 60;
  const hrs = Math.floor(totalSec / 3600);
  const sep = fps === 29.97 ? ';' : ':';
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}${sep}${pad2(frames)}`;
};

export const smpteToSeconds = (tc: string, fps: NLEFrameRate): number => {
  const parts = tc.trim().split(/[:;]/).map((p) => Number(p));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const [h, m, s, f = 0] = parts;
  const nominalFps = Math.round(fps) || 24;
  return h * 3600 + m * 60 + s + f / nominalFps;
};

const estimateElementDurationSec = (el: ScreenplayElement): number => {
  const words = el.text.trim().split(/\s+/).filter(Boolean).length;
  switch (el.type) {
    case 'SCENE_HEADING':
      return 2.0;
    case 'DIALOGUE':
      // ~2.4 words per second conversational pacing
      return Math.max(1.5, Number((words / 2.4).toFixed(2)));
    case 'VOICE_OVER':
      // ~2.25 words per second narration / internal monologue pacing
      return Math.max(1.5, Number((words / 2.25).toFixed(2)));
    case 'CHARACTER':
      return 0.4;
    case 'PARENTHETICAL':
      return 0.6;
    case 'SHOT':
      return 2.5;
    case 'TRANSITION':
      return 1.2;
    case 'ACTION':
    default:
      return Math.max(2.0, Number((words / 3.2).toFixed(2)));
  }
};

const parseCameraDirection = (
  el: ScreenplayElement,
  project: StoryProject
): NLEBlockMetadata['cameraDirection'] | undefined => {
  if (el.type === 'SHOT') {
    const matchedBoard = (project.storyboards || []).find(
      (sb) =>
        sb.sceneId === el.sceneId &&
        (sb.shotNumber === el.shotNumber ||
          el.text.toLowerCase().includes(sb.shotType.split(' ')[0].toLowerCase()))
    );
    return {
      shotNumber: el.shotNumber || matchedBoard?.shotNumber,
      shotType: el.shotType || matchedBoard?.shotType || el.text.trim(),
      cameraMovement: matchedBoard?.cameraMovement,
      lens: matchedBoard?.lens,
    };
  }

  if (el.type === 'ACTION') {
    const match = el.text.match(
      /\b(CLOSE ON|WIDE SHOT|MEDIUM SHOT|ECU|POV|DOLLY IN|DOLLY OUT|PAN TO|TILT UP|TRACKING SHOT|STEADICAM|CRANE UP)\b/i
    );
    if (match) {
      return {
        shotType: match[1].toUpperCase(),
      };
    }
  }
  return undefined;
};

const xmlEscape = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const DEFAULT_NLE_PRESETS: NLEExportPreset[] = [
  {
    id: 'preset-premiere-24',
    name: 'Premiere Pro — Feature 24fps',
    nleTarget: 'Adobe Premiere Pro',
    description: 'XMEML v4 timeline with orange scene markers, cyan dialogue cues, and STT audio takes at 00:00:00:00.',
    isBuiltIn: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      nleTarget: 'Adobe Premiere Pro',
      frameRate: 24,
      preferredFormat: 'xml',
      timecodeStart: '00:00:00:00',
      includeSceneMarkers: true,
      includeDialogueCues: true,
      includeCameraMetadata: true,
      includePropAndTagMetadata: true,
      includeAlignedTakes: true,
      includeTranscriptTokens: true,
      markerColorProfile: 'premiere',
      filenameSuffix: '_premiere',
    },
  },
  {
    id: 'preset-resolve-23976',
    name: 'DaVinci Resolve — Cinema 23.976fps',
    nleTarget: 'DaVinci Resolve',
    description: 'Cinema 23.976 NTSC timeline starting at 01:00:00:00 with camera lens/movement tags and Resolve marker colors.',
    isBuiltIn: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      nleTarget: 'DaVinci Resolve',
      frameRate: 23.976,
      preferredFormat: 'xml',
      timecodeStart: '01:00:00:00',
      includeSceneMarkers: true,
      includeDialogueCues: true,
      includeCameraMetadata: true,
      includePropAndTagMetadata: true,
      includeAlignedTakes: true,
      includeTranscriptTokens: true,
      markerColorProfile: 'resolve',
      filenameSuffix: '_resolve',
    },
  },
  {
    id: 'preset-avid-24',
    name: 'Avid Media Composer — 24fps Sidecar',
    nleTarget: 'Avid Media Composer',
    description: '01:00:00:00 hour-1 broadcast timecode JSON sidecar & locator XML optimized for Avid Media Composer bins.',
    isBuiltIn: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      nleTarget: 'Avid Media Composer',
      frameRate: 24,
      preferredFormat: 'json',
      timecodeStart: '01:00:00:00',
      includeSceneMarkers: true,
      includeDialogueCues: true,
      includeCameraMetadata: true,
      includePropAndTagMetadata: true,
      includeAlignedTakes: true,
      includeTranscriptTokens: false,
      markerColorProfile: 'avid',
      filenameSuffix: '_avid',
    },
  },
  {
    id: 'preset-premiere-2997',
    name: 'Premiere Pro — Broadcast 29.97 DF',
    nleTarget: 'Adobe Premiere Pro',
    description: 'Drop-frame 29.97fps broadcast/episodic XML & sidecar configuration.',
    isBuiltIn: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    config: {
      nleTarget: 'Adobe Premiere Pro',
      frameRate: 29.97,
      preferredFormat: 'xml',
      timecodeStart: '00:00:00:00',
      includeSceneMarkers: true,
      includeDialogueCues: true,
      includeCameraMetadata: true,
      includePropAndTagMetadata: true,
      includeAlignedTakes: true,
      includeTranscriptTokens: true,
      markerColorProfile: 'premiere',
      filenameSuffix: '_premiere_df',
    },
  },
];

export const buildNLEMetadataDocument = (
  project: StoryProject,
  frameRate: NLEFrameRate = 24,
  config?: Partial<NLEExportConfig>,
  presetName?: string
): NLEMetadataDocument => {
  const timecodeStart: '00:00:00:00' | '01:00:00:00' = config?.timecodeStart || '00:00:00:00';
  const tcOffsetSec = timecodeStart === '01:00:00:00' ? 3600 : 0;
  const includeCameraMetadata = config?.includeCameraMetadata ?? true;
  const includePropAndTagMetadata = config?.includePropAndTagMetadata ?? true;
  const includeTranscriptTokens = config?.includeTranscriptTokens ?? true;

  const sceneMap = new Map<string, Scene>();
  project.scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const nominalFps = Math.round(frameRate) || 24;
  let cursorSec = 0;
  let activeScene: Scene | undefined = project.scenes[0];
  let currentSpeaker = '';
  let currentParenthetical: string | undefined;

  const blocks: NLEBlockMetadata[] = [];
  const dialogueEntries: NLEDialogueEntry[] = [];
  const byScene: Record<string, string[]> = {};
  const bySpeaker: Record<string, string[]> = {};

  const sceneLineCounter = new Map<string, number>();
  const sceneBounds = new Map<string, { startSec: number; endSec: number; cameraDirs: string[] }>();

  project.elements.forEach((el, idx) => {
    if (el.sceneId && sceneMap.has(el.sceneId)) {
      activeScene = sceneMap.get(el.sceneId)!;
    }

    const sceneId = activeScene?.id || el.sceneId || 'scene-1';
    const sceneNumber = activeScene?.sceneNumber ?? 1;
    const slugline = activeScene?.heading || 'INT. UNKNOWN - DAY';

    const dur = estimateElementDurationSec(el);
    const startSec = Number(cursorSec.toFixed(2));
    const endSec = Number((cursorSec + dur).toFixed(2));
    cursorSec = endSec;

    const existingBound = sceneBounds.get(sceneId);
    const camDir = includeCameraMetadata ? parseCameraDirection(el, project) : undefined;
    const camLabel = camDir
      ? [camDir.shotNumber ? `#${camDir.shotNumber}` : '', camDir.shotType, camDir.cameraMovement]
          .filter(Boolean)
          .join(' · ')
      : '';

    if (!existingBound) {
      sceneBounds.set(sceneId, {
        startSec,
        endSec,
        cameraDirs: camLabel ? [camLabel] : [],
      });
    } else {
      existingBound.endSec = endSec;
      if (camLabel) existingBound.cameraDirs.push(camLabel);
    }

    if (el.type === 'CHARACTER') {
      currentSpeaker = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
      currentParenthetical = undefined;
    } else if (el.type === 'PARENTHETICAL') {
      currentParenthetical = el.text.trim();
    } else if (el.type !== 'DIALOGUE' && el.type !== 'VOICE_OVER') {
      currentSpeaker = '';
      currentParenthetical = undefined;
    }

    const sceneTagNames = includePropAndTagMetadata
      ? project.tags
          .filter((t) => t.sceneIds.includes(sceneId))
          .map((t) => `${t.category}:${t.name}`)
      : [];

    const resolvedBlockSpeaker =
      el.type === 'DIALOGUE' || el.type === 'VOICE_OVER' || el.type === 'CHARACTER'
        ? currentSpeaker || el.character
        : undefined;

    blocks.push({
      blockId: el.id,
      index: idx + 1,
      sceneId,
      sceneNumber,
      slugline,
      type: el.type,
      speaker: resolvedBlockSpeaker,
      text: el.text,
      normalizedText: normalizeText(el.text),
      cameraDirection: camDir,
      timecodeIn: secondsToSMPTE(startSec + tcOffsetSec, frameRate),
      timecodeOut: secondsToSMPTE(endSec + tcOffsetSec, frameRate),
      startFrame: Math.round(startSec * nominalFps),
      endFrame: Math.round(endSec * nominalFps),
      durationSec: dur,
      tags: sceneTagNames.slice(0, 8),
    });

    if ((el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') && el.text.trim()) {
      const nextLineNum = (sceneLineCounter.get(sceneId) || 0) + 1;
      sceneLineCounter.set(sceneId, nextLineNum);
      const speaker = (currentSpeaker || el.character || 'UNKNOWN').toUpperCase();
      const lineKey = `S${sceneNumber.toString().padStart(2, '0')}:L${nextLineNum
        .toString()
        .padStart(3, '0')}`;

      const entry: NLEDialogueEntry = {
        lineKey,
        elementId: el.id,
        sceneId,
        sceneNumber,
        sceneHeading: slugline,
        speaker,
        parenthetical: currentParenthetical,
        exactText: el.text.trim(),
        normalizedText: normalizeText(el.text),
        tokens: includeTranscriptTokens ? tokenize(el.text) : [],
        wordCount: el.text.trim().split(/\s+/).filter(Boolean).length,
        timecodeIn: secondsToSMPTE(startSec + tcOffsetSec, frameRate),
        timecodeOut: secondsToSMPTE(endSec + tcOffsetSec, frameRate),
        startSec,
        endSec,
        estimatedDurationSec: dur,
        isVoiceOver: el.type === 'VOICE_OVER',
      };

      dialogueEntries.push(entry);
      if (!byScene[sceneId]) byScene[sceneId] = [];
      byScene[sceneId].push(lineKey);
      if (!bySpeaker[speaker]) bySpeaker[speaker] = [];
      bySpeaker[speaker].push(lineKey);
    }
  });

  const scenesSummary = project.scenes.map((sc) => {
    const bounds = sceneBounds.get(sc.id) || { startSec: 0, endSec: sc.durationSec || 30, cameraDirs: [] };
    const props = includePropAndTagMetadata
      ? project.tags
          .filter((t) => t.category === 'prop' && t.sceneIds.includes(sc.id))
          .map((t) => t.name)
      : [];
    return {
      sceneId: sc.id,
      sceneNumber: sc.sceneNumber,
      slugline: sc.heading,
      intExt: sc.intExt,
      dayNight: sc.dayNight,
      setting: sc.setting,
      timecodeIn: secondsToSMPTE(bounds.startSec + tcOffsetSec, frameRate),
      timecodeOut: secondsToSMPTE(bounds.endSec + tcOffsetSec, frameRate),
      durationSec: Number((bounds.endSec - bounds.startSec).toFixed(2)),
      cast: sc.characters,
      props,
      cameraDirections: includeCameraMetadata ? bounds.cameraDirs : [],
    };
  });

  return {
    schemaVersion: 'story-nle-metadata/v1.0',
    exportedAt: new Date().toISOString(),
    nleTarget: config?.nleTarget || 'Canonical NLE Sidecar JSON',
    presetName,
    projectId: project.id,
    projectTitle: project.title,
    draftName: project.activeDraftName || 'Production Draft',
    frameRate,
    dropFrame: frameRate === 29.97,
    timecodeStart,
    totalDurationSec: Number(cursorSec.toFixed(2)),
    scenes: scenesSummary,
    blocks,
    dialogueIndex: {
      totalLines: dialogueEntries.length,
      entries: dialogueEntries,
      byScene,
      bySpeaker,
    },
  };
};

const MARKER_PALETTES = {
  premiere: {
    scene: { r: 255, g: 128, b: 0 },
    dialogue: { r: 6, g: 182, b: 212 },
  },
  resolve: {
    scene: { r: 59, g: 130, b: 246 },
    dialogue: { r: 16, g: 185, b: 129 },
  },
  avid: {
    scene: { r: 234, g: 179, b: 8 },
    dialogue: { r: 168, g: 85, b: 247 },
  },
};

export const exportPremiereProXML = (
  project: StoryProject,
  frameRate: NLEFrameRate = 24,
  alignedMatches: TranscriptAlignmentMatch[] = [],
  config?: Partial<NLEExportConfig>
): string => {
  const doc = buildNLEMetadataDocument(project, frameRate, config);
  const timebase = Math.round(frameRate) || 24;
  const ntsc = frameRate === 23.976 || frameRate === 29.97 ? 'TRUE' : 'FALSE';
  const totalFrames = Math.max(timebase * 10, Math.round(doc.totalDurationSec * timebase));
  const timecodeStart = config?.timecodeStart || '00:00:00:00';
  const tcOffsetFrames = timecodeStart === '01:00:00:00' ? 3600 * timebase : 0;

  const includeSceneMarkers = config?.includeSceneMarkers ?? true;
  const includeDialogueCues = config?.includeDialogueCues ?? true;
  const includeAlignedTakes = config?.includeAlignedTakes ?? true;
  const palette = MARKER_PALETTES[config?.markerColorProfile || 'premiere'];

  const sceneMarkersXml = includeSceneMarkers
    ? doc.scenes
        .map((sc) => {
          const startFrame = Math.max(
            0,
            Math.round(smpteToSeconds(sc.timecodeIn, frameRate) * timebase) - tcOffsetFrames
          );
          const endFrame = Math.max(
            startFrame + timebase,
            Math.round(smpteToSeconds(sc.timecodeOut, frameRate) * timebase) - tcOffsetFrames
          );
          const comment = [
            `Scene ${sc.sceneNumber}`,
            `Cast: ${sc.cast.join(', ') || 'None'}`,
            sc.props.length > 0 ? `Props: ${sc.props.join(', ')}` : '',
            sc.cameraDirections.length > 0 ? `Cam: ${sc.cameraDirections.join(' | ')}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
          return `      <marker>
        <comment>${xmlEscape(comment)}</comment>
        <name>${xmlEscape(`SC ${sc.sceneNumber}: ${sc.slugline}`)}</name>
        <in>${startFrame}</in>
        <out>${endFrame}</out>
        <color>
          <alpha>0</alpha>
          <red>${palette.scene.r}</red>
          <green>${palette.scene.g}</green>
          <blue>${palette.scene.b}</blue>
        </color>
      </marker>`;
        })
        .join('\n')
    : '';

  const dialogueMarkersXml = includeDialogueCues
    ? doc.dialogueIndex.entries
        .map((entry) => {
          const startFrame = Math.round(entry.startSec * timebase);
          const endFrame = Math.max(startFrame + 12, Math.round(entry.endSec * timebase));
          const voPrefix = entry.isVoiceOver ? '[V.O.] ' : '';
          return `      <marker>
        <comment>${xmlEscape(`${voPrefix}[${entry.lineKey}] ${entry.exactText}`)}</comment>
        <name>${xmlEscape(`${entry.speaker}${entry.isVoiceOver ? ' [V.O.]' : ''} (${entry.lineKey})`)}</name>
        <in>${startFrame}</in>
        <out>${endFrame}</out>
        <color>
          <alpha>0</alpha>
          <red>${palette.dialogue.r}</red>
          <green>${palette.dialogue.g}</green>
          <blue>${palette.dialogue.b}</blue>
        </color>
      </marker>`;
        })
        .join('\n')
    : '';

  const alignedClipsXml = includeAlignedTakes
    ? alignedMatches
        .filter((m) => m.matchedEntry !== null)
        .map((m, i) => {
          const entry = m.matchedEntry!;
          const startFrame = Math.round(entry.startSec * timebase);
          const endFrame = Math.max(startFrame + timebase, Math.round(entry.endSec * timebase));
          return `          <clipitem id="aligned-take-${i + 1}">
            <name>${xmlEscape(`${m.takeLabel} -> ${entry.lineKey} (${m.confidence}%)`)}</name>
            <duration>${endFrame - startFrame}</duration>
            <rate>
              <timebase>${timebase}</timebase>
              <ntsc>${ntsc}</ntsc>
            </rate>
            <start>${startFrame}</start>
            <end>${endFrame}</end>
            <in>0</in>
            <out>${endFrame - startFrame}</out>
            <logginginfo>
              <description>${xmlEscape(`Speaker: ${entry.speaker} | Script: ${entry.exactText}`)}</description>
              <scene>${entry.sceneNumber}</scene>
              <shottake>${xmlEscape(m.takeLabel)}</shottake>
              <lognote>${xmlEscape(`STT Match ${m.confidence}% | Clip TC ${m.transcriptTimecodeIn}`)}</lognote>
            </logginginfo>
          </clipitem>`;
        })
        .join('\n')
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="seq-${xmlEscape(project.id)}">
    <name>${xmlEscape(`${project.title} - ${config?.nleTarget || 'Premiere Pro'} Metadata Sequence`)}</name>
    <duration>${totalFrames}</duration>
    <rate>
      <timebase>${timebase}</timebase>
      <ntsc>${ntsc}</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${timebase}</timebase>
        <ntsc>${ntsc}</ntsc>
      </rate>
      <string>${timecodeStart}</string>
      <frame>${tcOffsetFrames}</frame>
      <displayformat>${frameRate === 29.97 ? 'DF' : 'NDF'}</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>1920</width>
            <height>1080</height>
          </samplecharacteristics>
        </format>
        <track>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
        </track>
      </video>
      <audio>
        <track>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
${alignedClipsXml || '          <!-- No speech-to-text takes aligned yet -->'}
        </track>
      </audio>
    </media>
${sceneMarkersXml}
${dialogueMarkersXml}
  </sequence>
</xmeml>`;
};

// Levenshtein distance on normalized word arrays for accurate transcript-to-script matching
const wordEditSimilarity = (aTokens: string[], bTokens: string[]): number => {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const n = aTokens.length;
  const m = bTokens.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = aTokens[i - 1] === bTokens[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(n, m);
  return Math.max(0, 1 - dp[n][m] / maxLen);
};

export const parseTranscriptInput = (rawText: string): TranscriptSegment[] => {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. JSON array (Whisper / Premiere Pro JSON transcript)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr: Array<Record<string, unknown>> = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.segments)
        ? parsed.segments
        : [];
      if (arr.length > 0) {
        return arr.map((seg, idx) => ({
          id: `stt-seg-${idx + 1}`,
          takeLabel: String(seg.take || seg.clip || `Take ${idx + 1}`),
          clipName: seg.clip ? String(seg.clip) : undefined,
          speakerHint: seg.speaker ? String(seg.speaker).toUpperCase() : undefined,
          timecodeIn: String(seg.start || seg.timecodeIn || `00:00:${pad2(idx * 4)}:00`),
          timecodeOut: String(seg.end || seg.timecodeOut || `00:00:${pad2((idx + 1) * 4)}:00`),
          text: String(seg.text || '').trim(),
        }));
      }
    } catch {
      // fall through to line parser
    }
  }

  // 2. Line-by-line / Premiere Timecoded TXT / Take-prefixed transcript
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\d+$/.test(l) && l !== 'WEBVTT');

  const segments: TranscriptSegment[] = [];
  let pendingTcIn = '';
  let pendingTcOut = '';

  lines.forEach((line, idx) => {
    const srtMatch = line.match(
      /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (srtMatch) {
      pendingTcIn = srtMatch[1].replace(/[,.]\d{3}$/, ':00');
      pendingTcOut = srtMatch[2].replace(/[,.]\d{3}$/, ':00');
      return;
    }

    // Format: [Take 1A | 00:01:12:04] SPEAKER: text  OR  Take 1A - SPEAKER: text  OR plain text
    let working = line;
    let takeLabel = `Take ${segments.length + 1}`;
    let speakerHint: string | undefined;
    let timecodeIn = pendingTcIn || `00:00:${pad2(segments.length * 5)}:00`;
    let timecodeOut = pendingTcOut || `00:00:${pad2((segments.length + 1) * 5)}:00`;

    const bracketMatch = working.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (bracketMatch) {
      const meta = bracketMatch[1];
      working = bracketMatch[2];
      const tcMatch = meta.match(/(\d{2}:\d{2}:\d{2}(?:[:;]\d{2})?)/);
      if (tcMatch) timecodeIn = tcMatch[1];
      const takePart = meta.replace(/\d{2}:\d{2}:\d{2}(?:[:;]\d{2})?/, '').replace(/[|,]/g, '').trim();
      if (takePart) takeLabel = takePart;
    }

    const speakerMatch = working.match(/^([A-Z][A-Z0-9\s.'-]{1,28}):\s+(.*)$/);
    if (speakerMatch) {
      speakerHint = speakerMatch[1].trim().toUpperCase();
      working = speakerMatch[2].trim();
    }

    if (working) {
      segments.push({
        id: `stt-seg-${idx + 1}`,
        takeLabel,
        speakerHint,
        timecodeIn,
        timecodeOut,
        text: working,
      });
      pendingTcIn = '';
      pendingTcOut = '';
    }
  });

  return segments;
};

export const alignTranscriptToDialogue = (
  project: StoryProject,
  rawTranscript: string,
  frameRate: NLEFrameRate = 24
): TranscriptAlignmentMatch[] => {
  const doc = buildNLEMetadataDocument(project, frameRate);
  const entries = doc.dialogueIndex.entries;
  const segments = parseTranscriptInput(rawTranscript);

  return segments.map((seg) => {
    const segTokens = tokenize(seg.text);
    const segSet = new Set(segTokens);

    let bestEntry: NLEDialogueEntry | null = null;
    let bestScore = 0;
    let bestOverlap = 0;
    let bestSpeakerMatch = false;

    entries.forEach((entry) => {
      if (entry.tokens.length === 0 || segTokens.length === 0) return;
      const entrySet = new Set(entry.tokens);
      let overlap = 0;
      segSet.forEach((tok) => {
        if (entrySet.has(tok)) overlap += 1;
      });
      const unionSize = new Set([...segTokens, ...entry.tokens]).size || 1;
      const jaccard = overlap / unionSize;
      const orderSim = wordEditSimilarity(segTokens, entry.tokens);
      const speakerMatch =
        !!seg.speakerHint &&
        (entry.speaker.includes(seg.speakerHint) || seg.speakerHint.includes(entry.speaker));

      let score = jaccard * 0.55 + orderSim * 0.45;
      if (speakerMatch) score = Math.min(1, score + 0.1);
      if (seg.speakerHint && !speakerMatch) score *= 0.88;

      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
        bestOverlap = overlap;
        bestSpeakerMatch = speakerMatch;
      }
    });

    const confidence = Math.round(Math.min(100, bestScore * 100));
    const matchQuality: TranscriptAlignmentMatch['matchQuality'] =
      confidence >= 88
        ? 'exact'
        : confidence >= 55
        ? 'strong'
        : confidence >= 30
        ? 'partial'
        : 'unmatched';

    return {
      segmentId: seg.id,
      takeLabel: seg.takeLabel,
      clipName: seg.clipName,
      transcriptTimecodeIn: seg.timecodeIn,
      transcriptTimecodeOut: seg.timecodeOut,
      transcriptText: seg.text,
      matchedEntry: confidence >= 25 ? bestEntry : null,
      confidence,
      matchQuality,
      wordOverlapCount: bestOverlap,
      speakerMatch: bestSpeakerMatch,
    };
  });
};

export const getSampleTranscriptForProject = (project: StoryProject): string => {
  const doc = buildNLEMetadataDocument(project, 24);
  const sampleEntries = doc.dialogueIndex.entries.slice(0, 5);
  if (sampleEntries.length === 0) {
    return '[Take 1A | 00:00:04:00] SPEAKER: We only have one shot before the shuttle departs.';
  }

  return sampleEntries
    .map((entry, idx) => {
      const words = entry.exactText.split(/\s+/);
      // Simulate realistic on-set speech-to-text output with slight takes/ad-lib variations
      const spoken =
        idx % 2 === 1 && words.length > 5
          ? `${words.slice(0, words.length - 1).join(' ')} right now`
          : entry.exactText;
      return `[Take ${entry.sceneNumber}A-${idx + 1} | ${entry.timecodeIn}] ${entry.speaker}: ${spoken}`;
    })
    .join('\n');
};

export type DialogueQueryMatchMode = 'smart' | 'exact_phrase' | 'fuzzy';

export interface DialogueQuerySurroundingBlock {
  blockId: string;
  index: number;
  type: ElementType;
  speaker?: string;
  text: string;
  timecodeIn: string;
  isTarget: boolean;
}

export interface DialogueQueryResult {
  entry: NLEDialogueEntry;
  score: number;
  matchType: 'exact_phrase' | 'substring' | 'fuzzy' | 'id_match' | 'browse';
  blockIndex: number;
  startFrame: number;
  endFrame: number;
  sceneContext: NLEMetadataDocument['scenes'][number];
  nearestCameraCue?: string;
  surroundingBlocks: DialogueQuerySurroundingBlock[];
}

export const queryDialogueEntries = (
  doc: NLEMetadataDocument,
  options: {
    query: string;
    sceneId?: string;
    speaker?: string;
    matchMode?: DialogueQueryMatchMode;
  }
): DialogueQueryResult[] => {
  const rawQuery = options.query.trim();
  const qLower = rawQuery.toLowerCase();
  const qNorm = normalizeText(rawQuery);
  const qTokens = tokenize(rawQuery);
  const matchMode = options.matchMode || 'smart';

  const sceneSummaryMap = new Map(doc.scenes.map((s) => [s.sceneId, s]));
  const blockIndexById = new Map<string, number>();
  doc.blocks.forEach((b, i) => blockIndexById.set(b.blockId, i));

  const results: DialogueQueryResult[] = [];

  doc.dialogueIndex.entries.forEach((entry) => {
    if (options.sceneId && options.sceneId !== 'all' && entry.sceneId !== options.sceneId) {
      return;
    }
    if (options.speaker && options.speaker !== 'all' && entry.speaker !== options.speaker) {
      return;
    }

    let score = 100;
    let matchType: DialogueQueryResult['matchType'] = 'browse';

    if (rawQuery) {
      const idMatch =
        entry.lineKey.toLowerCase().includes(qLower) ||
        entry.elementId.toLowerCase().includes(qLower) ||
        entry.sceneId.toLowerCase().includes(qLower);

      const exactPhraseHit =
        entry.exactText.toLowerCase().includes(qLower) ||
        (qNorm.length > 0 && entry.normalizedText.includes(qNorm));

      const speakerOrHeadingHit =
        entry.speaker.toLowerCase().includes(qLower) ||
        entry.sceneHeading.toLowerCase().includes(qLower);

      // Token & edit similarity for fuzzy / partial STT-style searches
      let fuzzyScore = 0;
      if (qTokens.length > 0 && entry.tokens.length > 0) {
        const entrySet = new Set(entry.tokens);
        let overlap = 0;
        qTokens.forEach((tok) => {
          if (entrySet.has(tok)) overlap += 1;
        });
        const recall = overlap / qTokens.length;
        const orderSim = wordEditSimilarity(qTokens, entry.tokens);
        fuzzyScore = Math.round(Math.min(99, (recall * 0.65 + orderSim * 0.35) * 100));
      }

      if (matchMode === 'exact_phrase') {
        if (!exactPhraseHit && !idMatch) return;
        matchType = idMatch && !exactPhraseHit ? 'id_match' : 'exact_phrase';
        score = entry.normalizedText === qNorm ? 100 : 95;
      } else if (matchMode === 'fuzzy') {
        if (!exactPhraseHit && !idMatch && fuzzyScore < 28) return;
        matchType = idMatch ? 'id_match' : exactPhraseHit ? 'exact_phrase' : 'fuzzy';
        score = exactPhraseHit ? 98 : idMatch ? 94 : fuzzyScore;
      } else {
        // 'smart' mode: prioritizes exact/substring/ID hits, falls back to fuzzy token matches
        if (idMatch) {
          matchType = 'id_match';
          score = entry.lineKey.toLowerCase() === qLower ? 100 : 96;
        } else if (exactPhraseHit) {
          matchType = entry.normalizedText === qNorm ? 'exact_phrase' : 'substring';
          score = entry.normalizedText === qNorm ? 100 : 92;
        } else if (speakerOrHeadingHit) {
          matchType = 'substring';
          score = 84;
        } else if (fuzzyScore >= 35) {
          matchType = 'fuzzy';
          score = fuzzyScore;
        } else {
          return;
        }
      }
    }

    const blockIdx = blockIndexById.get(entry.elementId) ?? -1;
    const block = blockIdx >= 0 ? doc.blocks[blockIdx] : undefined;

    // Gather ±2 surrounding script elements within the same scene
    const surroundingBlocks: DialogueQuerySurroundingBlock[] = [];
    if (blockIdx >= 0) {
      const startIdx = Math.max(0, blockIdx - 2);
      const endIdx = Math.min(doc.blocks.length - 1, blockIdx + 2);
      for (let i = startIdx; i <= endIdx; i++) {
        const b = doc.blocks[i];
        if (b.sceneId !== entry.sceneId) continue;
        surroundingBlocks.push({
          blockId: b.blockId,
          index: b.index,
          type: b.type,
          speaker: b.speaker,
          text: b.text,
          timecodeIn: b.timecodeIn,
          isTarget: b.blockId === entry.elementId,
        });
      }
    }

    // Find nearest preceding camera direction in the same scene
    let nearestCameraCue: string | undefined;
    if (blockIdx >= 0) {
      for (let i = blockIdx; i >= 0; i--) {
        const b = doc.blocks[i];
        if (b.sceneId !== entry.sceneId) break;
        if (b.cameraDirection) {
          nearestCameraCue = [
            b.cameraDirection.shotNumber ? `#${b.cameraDirection.shotNumber}` : '',
            b.cameraDirection.shotType,
            b.cameraDirection.cameraMovement,
            b.cameraDirection.lens,
          ]
            .filter(Boolean)
            .join(' · ');
          break;
        }
      }
    }

    const sceneContext = sceneSummaryMap.get(entry.sceneId) || {
      sceneId: entry.sceneId,
      sceneNumber: entry.sceneNumber,
      slugline: entry.sceneHeading,
      intExt: 'INT',
      dayNight: 'DAY',
      setting: entry.sceneHeading,
      timecodeIn: entry.timecodeIn,
      timecodeOut: entry.timecodeOut,
      durationSec: entry.estimatedDurationSec,
      cast: [entry.speaker],
      props: [],
      cameraDirections: nearestCameraCue ? [nearestCameraCue] : [],
    };

    results.push({
      entry,
      score,
      matchType,
      blockIndex: blockIdx,
      startFrame: block?.startFrame ?? Math.round(entry.startSec * (Math.round(doc.frameRate) || 24)),
      endFrame: block?.endFrame ?? Math.round(entry.endSec * (Math.round(doc.frameRate) || 24)),
      sceneContext,
      nearestCameraCue,
      surroundingBlocks,
    });
  });

  if (rawQuery) {
    results.sort((a, b) => b.score - a.score || a.entry.startSec - b.entry.startSec);
  }

  return results;
};

export type NLEPreFlightCategory =
  | 'missing_scene_heading'
  | 'orphaned_dialogue'
  | 'unassigned_character_tag';

export interface NLEPreFlightWarning {
  id: string;
  severity: 'error' | 'warning';
  category: NLEPreFlightCategory;
  title: string;
  detail: string;
  sceneId?: string;
  sceneNumber?: number;
  elementId?: string;
  suggestion: string;
}

export interface NLEPreFlightReport {
  checkedAt: string;
  passed: boolean;
  totalWarnings: number;
  counts: {
    missingSceneHeadings: number;
    orphanedDialogue: number;
    unassignedCharacterTags: number;
  };
  warnings: NLEPreFlightWarning[];
}

const cleanCharacterCue = (raw: string): string =>
  raw.replace(/\(.*?\)/g, '').trim().toUpperCase();

export const runNLEPreFlightCheck = (project: StoryProject): NLEPreFlightReport => {
  const warnings: NLEPreFlightWarning[] = [];
  const sceneMap = new Map<string, Scene>();
  project.scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  // 1. Missing Scene Headings scan
  const headingElements = project.elements.filter((el) => el.type === 'SCENE_HEADING');
  const headingSceneIds = new Set(headingElements.map((el) => el.sceneId).filter(Boolean));

  if (project.scenes.length === 0 || headingElements.length === 0) {
    warnings.push({
      id: 'pf-no-headings',
      severity: 'error',
      category: 'missing_scene_heading',
      title: 'No scene headings found in script',
      detail: 'NLE timeline markers require at least one SCENE_HEADING slugline (e.g. INT. STUDIO - DAY).',
      suggestion: 'Add a Scene Heading element at the start of the script.',
    });
  }

  let seenFirstHeading = false;
  project.elements.forEach((el, idx) => {
    if (el.type === 'SCENE_HEADING') {
      seenFirstHeading = true;
      const trimmed = el.text.trim();
      const sc = el.sceneId ? sceneMap.get(el.sceneId) : undefined;
      if (!trimmed) {
        warnings.push({
          id: `pf-empty-heading-${el.id}`,
          severity: 'error',
          category: 'missing_scene_heading',
          title: `Blank scene heading at block #${idx + 1}`,
          detail: `Element ${el.id} has an empty slugline, which produces untitled Premiere markers.`,
          sceneId: el.sceneId,
          sceneNumber: sc?.sceneNumber,
          elementId: el.id,
          suggestion: 'Enter a valid INT./EXT. slugline for this scene heading.',
        });
      } else if (!/^(INT\.?|EXT\.?|INT\.?\/EXT\.?|I\/E\.?)\s+\S+/i.test(trimmed)) {
        warnings.push({
          id: `pf-malformed-heading-${el.id}`,
          severity: 'warning',
          category: 'missing_scene_heading',
          title: `Non-standard scene heading: "${trimmed.slice(0, 42)}"`,
          detail: `Sc. ${sc?.sceneNumber ?? '?'} slugline does not start with INT./EXT. prefix.`,
          sceneId: el.sceneId,
          sceneNumber: sc?.sceneNumber,
          elementId: el.id,
          suggestion: 'Prefix slugline with INT., EXT., or INT/EXT. for clean NLE scene grouping.',
        });
      }
    } else if (!seenFirstHeading && el.text.trim()) {
      warnings.push({
        id: `pf-pre-heading-${el.id}`,
        severity: 'warning',
        category: 'missing_scene_heading',
        title: `${el.type} block before first scene heading`,
        detail: `Block #${idx + 1} ("${el.text.trim().slice(0, 48)}") appears before any SCENE_HEADING.`,
        sceneId: el.sceneId,
        elementId: el.id,
        suggestion: 'Insert a SCENE_HEADING above opening action or dialogue.',
      });
    }
  });

  project.scenes.forEach((sc) => {
    if (!sc.heading.trim()) {
      warnings.push({
        id: `pf-scene-no-heading-${sc.id}`,
        severity: 'error',
        category: 'missing_scene_heading',
        title: `Scene ${sc.sceneNumber} is missing a slugline heading`,
        detail: `Scene ID ${sc.id} has an empty heading field.`,
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        suggestion: 'Restore or enter a scene heading in the script or stripboard.',
      });
    } else if (!headingSceneIds.has(sc.id)) {
      warnings.push({
        id: `pf-scene-no-heading-el-${sc.id}`,
        severity: 'warning',
        category: 'missing_scene_heading',
        title: `Scene ${sc.sceneNumber} (${sc.heading}) lacks a SCENE_HEADING block`,
        detail: `Scene metadata exists for ${sc.id}, but no SCENE_HEADING element in the script references it.`,
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        suggestion: 'Verify the scene heading element is linked to this scene.',
      });
    }
  });

  // 2. Orphaned Dialogue scan
  let activeSpeaker = '';
  let activeSpeakerSceneId: string | undefined;
  let pendingCharacterEl: ScreenplayElement | null = null;
  const speakingScenesByChar = new Map<string, Set<string>>();

  project.elements.forEach((el, idx) => {
    const sc = el.sceneId ? sceneMap.get(el.sceneId) : undefined;

    if (el.type === 'CHARACTER') {
      if (pendingCharacterEl) {
        const pendSc = pendingCharacterEl.sceneId ? sceneMap.get(pendingCharacterEl.sceneId) : undefined;
        warnings.push({
          id: `pf-dangling-char-${pendingCharacterEl.id}`,
          severity: 'warning',
          category: 'orphaned_dialogue',
          title: `Character cue "${pendingCharacterEl.text.trim() || 'UNNAMED'}" has no dialogue`,
          detail: `CHARACTER block ${pendingCharacterEl.id} is not followed by a DIALOGUE line.`,
          sceneId: pendingCharacterEl.sceneId,
          sceneNumber: pendSc?.sceneNumber,
          elementId: pendingCharacterEl.id,
          suggestion: 'Add dialogue beneath this character cue or convert it to ACTION.',
        });
      }
      const cleaned = cleanCharacterCue(el.text);
      if (!cleaned) {
        warnings.push({
          id: `pf-empty-char-${el.id}`,
          severity: 'error',
          category: 'orphaned_dialogue',
          title: `Blank CHARACTER cue at block #${idx + 1}`,
          detail: `Element ${el.id} is marked CHARACTER with no character name.`,
          sceneId: el.sceneId,
          sceneNumber: sc?.sceneNumber,
          elementId: el.id,
          suggestion: 'Assign a character name so spoken lines can be indexed for STT alignment.',
        });
      }
      activeSpeaker = cleaned;
      activeSpeakerSceneId = el.sceneId;
      pendingCharacterEl = el;
      return;
    }

    if (el.type === 'PARENTHETICAL') {
      if (!activeSpeaker && !el.character?.trim()) {
        warnings.push({
          id: `pf-orphan-paren-${el.id}`,
          severity: 'warning',
          category: 'orphaned_dialogue',
          title: `Orphaned parenthetical without character cue`,
          detail: `"${el.text.trim().slice(0, 48)}" (${el.id}) has no preceding CHARACTER element.`,
          sceneId: el.sceneId,
          sceneNumber: sc?.sceneNumber,
          elementId: el.id,
          suggestion: 'Place a CHARACTER cue above this parenthetical.',
        });
      }
      return;
    }

    if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') {
      pendingCharacterEl = null;
      const isVO = el.type === 'VOICE_OVER';
      const resolvedSpeaker =
        (activeSpeakerSceneId === el.sceneId ? activeSpeaker : '') ||
        cleanCharacterCue(el.character || '');

      if (!el.sceneId || !sceneMap.has(el.sceneId)) {
        warnings.push({
          id: `pf-orphan-dlg-scene-${el.id}`,
          severity: 'error',
          category: 'orphaned_dialogue',
          title: `${isVO ? 'Voice-over (V.O.)' : 'Dialogue'} detached from valid scene (${el.id})`,
          detail: `"${el.text.trim().slice(0, 52)}" references missing sceneId "${el.sceneId || 'none'}".`,
          sceneId: el.sceneId,
          elementId: el.id,
          suggestion: `Assign this ${isVO ? 'voice-over' : 'dialogue'} block under a valid SCENE_HEADING.`,
        });
      }

      if (!resolvedSpeaker) {
        warnings.push({
          id: `pf-orphan-dlg-speaker-${el.id}`,
          severity: 'error',
          category: 'orphaned_dialogue',
          title: `Orphaned ${isVO ? 'voice-over (V.O.)' : 'dialogue'} with no speaker (block #${idx + 1})`,
          detail: `"${el.text.trim().slice(0, 56)}" has no preceding CHARACTER cue and no speaker attribution.`,
          sceneId: el.sceneId,
          sceneNumber: sc?.sceneNumber,
          elementId: el.id,
          suggestion: isVO
            ? 'Insert a CHARACTER (V.O.) cue above or assign a V.O. speaker on this block.'
            : 'Insert a CHARACTER element directly above this dialogue line.',
        });
      } else if (el.sceneId && sceneMap.has(el.sceneId)) {
        if (!speakingScenesByChar.has(resolvedSpeaker)) {
          speakingScenesByChar.set(resolvedSpeaker, new Set());
        }
        speakingScenesByChar.get(resolvedSpeaker)!.add(el.sceneId);
      }

      if (!el.text.trim()) {
        warnings.push({
          id: `pf-empty-dlg-${el.id}`,
          severity: 'warning',
          category: 'orphaned_dialogue',
          title: `Empty ${isVO ? 'voice-over (V.O.)' : 'dialogue'} block for ${resolvedSpeaker || 'UNKNOWN'}`,
          detail: `Element ${el.id} has no spoken text and will be omitted from the Dialogue Query index.`,
          sceneId: el.sceneId,
          sceneNumber: sc?.sceneNumber,
          elementId: el.id,
          suggestion: `Add ${isVO ? 'voice-over' : 'dialogue'} text or remove the empty block.`,
        });
      }
      return;
    }

    // Any non-dialogue structural element closes active character context
    if (pendingCharacterEl) {
      const pendSc = pendingCharacterEl.sceneId ? sceneMap.get(pendingCharacterEl.sceneId) : undefined;
      warnings.push({
        id: `pf-dangling-char-${pendingCharacterEl.id}`,
        severity: 'warning',
        category: 'orphaned_dialogue',
        title: `Character cue "${pendingCharacterEl.text.trim() || 'UNNAMED'}" followed by ${el.type}`,
        detail: `No DIALOGUE block found after CHARACTER element ${pendingCharacterEl.id}.`,
        sceneId: pendingCharacterEl.sceneId,
        sceneNumber: pendSc?.sceneNumber,
        elementId: pendingCharacterEl.id,
        suggestion: 'Add dialogue beneath the character cue or remove the unused cue.',
      });
      pendingCharacterEl = null;
    }
    activeSpeaker = '';
    activeSpeakerSceneId = undefined;
  });

  if (pendingCharacterEl) {
    const tailEl: ScreenplayElement = pendingCharacterEl;
    const pendSc = tailEl.sceneId ? sceneMap.get(tailEl.sceneId) : undefined;
    warnings.push({
      id: `pf-dangling-char-end-${tailEl.id}`,
      severity: 'warning',
      category: 'orphaned_dialogue',
      title: `Trailing character cue "${tailEl.text.trim() || 'UNNAMED'}" has no dialogue`,
      detail: `Script ends right after CHARACTER element ${tailEl.id}.`,
      sceneId: tailEl.sceneId,
      sceneNumber: pendSc?.sceneNumber,
      elementId: tailEl.id,
      suggestion: 'Complete the dialogue line or remove the trailing cue.',
    });
  }

  // 3. Unassigned Character Tags scan
  const characterTags = project.tags.filter((t) => t.category === 'character');
  const tagByNormName = new Map(
    characterTags.map((t) => [cleanCharacterCue(t.name), t])
  );

  speakingScenesByChar.forEach((sceneIds, charName) => {
    const matchedTag = tagByNormName.get(charName);
    if (!matchedTag) {
      const firstSceneId = Array.from(sceneIds)[0];
      const firstSc = sceneMap.get(firstSceneId);
      warnings.push({
        id: `pf-missing-chartag-${charName}`,
        severity: 'warning',
        category: 'unassigned_character_tag',
        title: `Speaking character "${charName}" has no character tag`,
        detail: `Speaks in ${sceneIds.size} scene(s) but is missing from the project's Character Tags registry.`,
        sceneId: firstSceneId,
        sceneNumber: firstSc?.sceneNumber,
        suggestion: 'Add a Character tag in the Inspector Tagger so NLE markers carry full cast metadata.',
      });
    } else {
      const missingScenes = Array.from(sceneIds).filter((sid) => !matchedTag.sceneIds.includes(sid));
      if (missingScenes.length > 0) {
        const scNums = missingScenes
          .map((sid) => sceneMap.get(sid)?.sceneNumber)
          .filter((n): n is number => typeof n === 'number')
          .sort((a, b) => a - b);
        warnings.push({
          id: `pf-unlinked-chartag-${matchedTag.id}`,
          severity: 'warning',
          category: 'unassigned_character_tag',
          title: `Character tag "${matchedTag.name}" unassigned in speaking scene(s)`,
          detail: `Character speaks in Sc. ${scNums.join(', ') || missingScenes.length} but tag sceneIds omit those scenes.`,
          sceneId: missingScenes[0],
          sceneNumber: sceneMap.get(missingScenes[0])?.sceneNumber,
          suggestion: 'Link the character tag to all speaking scenes for accurate NLE scene cast tags.',
        });
      }
    }
  });

  characterTags.forEach((tag) => {
    const validSceneIds = tag.sceneIds.filter((sid) => sceneMap.has(sid));
    if (validSceneIds.length === 0) {
      warnings.push({
        id: `pf-unused-chartag-${tag.id}`,
        severity: 'warning',
        category: 'unassigned_character_tag',
        title: `Character tag "${tag.name}" has no assigned scenes`,
        detail: `Tag "${tag.name}" (${tag.id}) has 0 valid scene assignments.`,
        suggestion: 'Assign this character tag to at least one scene or remove unused tags.',
      });
    }
  });

  const missingSceneHeadings = warnings.filter((w) => w.category === 'missing_scene_heading').length;
  const orphanedDialogue = warnings.filter((w) => w.category === 'orphaned_dialogue').length;
  const unassignedCharacterTags = warnings.filter((w) => w.category === 'unassigned_character_tag').length;

  return {
    checkedAt: new Date().toISOString(),
    passed: warnings.length === 0,
    totalWarnings: warnings.length,
    counts: {
      missingSceneHeadings,
      orphanedDialogue,
      unassignedCharacterTags,
    },
    warnings,
  };
};

// Deterministic 64-bit FNV-1a hex digest (used synchronously for script snapshots and fallback)
const fnv1a64Hex = (input: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
};

export const computeScriptFingerprint = (project: StoryProject): string => {
  const canonical = JSON.stringify({
    title: project.title,
    draftName: project.activeDraftName,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      num: s.sceneNumber,
      h: s.heading,
      ch: s.characters,
    })),
    elements: project.elements.map((e) => ({
      id: e.id,
      t: e.type,
      s: e.sceneId,
      c: e.character,
      txt: e.text,
    })),
    tags: project.tags.map((t) => ({
      id: t.id,
      cat: t.category,
      n: t.name,
      s: t.sceneIds,
    })),
  });
  return `scr-${fnv1a64Hex(canonical)}`;
};

export const computeFileContentHash = async (content: string): Promise<string> => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const bytes = new TextEncoder().encode(content);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return hex;
    }
  } catch {
    // Fallback below if WebCrypto digest is unavailable
  }
  return `fnv-${fnv1a64Hex(content)}${fnv1a64Hex(content.split('').reverse().join(''))}`;
};

export const createGeneratedSidecarEntry = async (params: {
  project: StoryProject;
  content: string;
  filename: string;
  format: NLESidecarFormat;
  formatLabel: string;
  frameRate: NLEFrameRate;
  sceneCount: number;
  dialogueLineCount: number;
  alignedTakeCount: number;
  preFlightWarningsCount: number;
}): Promise<NLEGeneratedSidecarEntry> => {
  const fileHash = await computeFileContentHash(params.content);
  const byteSize =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(params.content).length
      : params.content.length;

  return {
    id: `nle-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    filename: params.filename,
    format: params.format,
    formatLabel: params.formatLabel,
    fileHash,
    shortHash: fileHash.slice(0, 12),
    generatedAt: new Date().toISOString(),
    frameRate: params.frameRate,
    byteSize,
    sceneCount: params.sceneCount,
    dialogueLineCount: params.dialogueLineCount,
    alignedTakeCount: params.alignedTakeCount,
    preFlightWarningsCount: params.preFlightWarningsCount,
    draftName: params.project.activeDraftName || 'Production Draft',
    scriptSnapshotHash: computeScriptFingerprint(params.project),
  };
};

const parseClockMinutes = (raw?: string): number | null => {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const mins = Number(match[2]);
  const meridiem = match[3];
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
};

const parseDurationMinutes = (raw?: string): number => {
  if (!raw) return 90;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 90;
  const hrs = Number(match[1]);
  const mins = Number(match[2]);
  if (Number.isNaN(hrs) || Number.isNaN(mins)) return 90;
  return Math.max(15, hrs * 60 + mins);
};

const formatMinutesAsClock = (totalMins: number): string => {
  const norm = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const normalizeLocationKey = (loc: string): string =>
  loc
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const analyzeCharacterPresenceAndScheduleConflicts = (
  project: StoryProject
): CharacterPresenceCrossRefReport => {
  const characterColors: Record<string, string> = {};
  const fallbackPalette = ['#ff8000', '#06b6d4', '#10b981', '#a855f7', '#eab308', '#ec4899'];
  project.characters.forEach((c) => {
    characterColors[c.name.trim().toUpperCase()] = c.color;
  });
  project.tags
    .filter((t) => t.category === 'character')
    .forEach((t, idx) => {
      const key = t.name.trim().toUpperCase();
      if (!characterColors[key]) {
        characterColors[key] = t.color || fallbackPalette[idx % fallbackPalette.length];
      }
    });

  const canonicalChars = new Set<string>(Object.keys(characterColors));
  const resolveCanonicalCharacter = (raw: string): string => {
    const cleaned = cleanCharacterCue(raw);
    if (!cleaned) return '';
    if (canonicalChars.has(cleaned)) return cleaned;
    const matches = Array.from(canonicalChars).filter((canon) => {
      const tokens = canon.split(/\s+/);
      return tokens.includes(cleaned) || canon.endsWith(` ${cleaned}`) || canon.startsWith(`${cleaned} `);
    });
    return matches.length === 1 ? matches[0] : cleaned;
  };

  const sceneMap = new Map<string, Scene>();
  project.scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  // Derive live characters per scene (scenes + stripboard + script elements + character tags)
  const charsBySceneId = new Map<string, Set<string>>();
  project.scenes.forEach((sc) => {
    const s = new Set<string>(sc.characters.map((c) => resolveCanonicalCharacter(c)).filter(Boolean));
    charsBySceneId.set(sc.id, s);
  });
  project.elements.forEach((el) => {
    if (!el.sceneId) return;
    if (!charsBySceneId.has(el.sceneId)) charsBySceneId.set(el.sceneId, new Set());
    if (el.type === 'CHARACTER' && el.text.trim()) {
      const cleaned = resolveCanonicalCharacter(el.text);
      if (cleaned) charsBySceneId.get(el.sceneId)!.add(cleaned);
    } else if ((el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') && el.character?.trim()) {
      const cleaned = resolveCanonicalCharacter(el.character);
      if (cleaned) charsBySceneId.get(el.sceneId)!.add(cleaned);
    }
  });
  project.tags
    .filter((t) => t.category === 'character')
    .forEach((t) => {
      const cleaned = resolveCanonicalCharacter(t.name);
      if (!cleaned) return;
      t.sceneIds.forEach((sid) => {
        if (!charsBySceneId.has(sid)) charsBySceneId.set(sid, new Set());
        charsBySceneId.get(sid)!.add(cleaned);
      });
    });

  // Partition stripboard strips into shooting days
  const sceneSlotsBySceneId: Record<string, CharacterScheduleSlot> = {};
  const appearancesByDayAndChar = new Map<string, CharacterScheduleSlot[]>();

  let currentDayIndex = 1;
  let currentDayLabel = 'Day 1';
  let sawAnySceneInCurrentDay = false;

  project.strips.forEach((strip) => {
    if (strip.type === 'day_break') {
      if (sawAnySceneInCurrentDay) {
        currentDayIndex += 1;
      }
      currentDayLabel = strip.bannerDate
        ? `Day ${currentDayIndex} (${strip.bannerDate})`
        : strip.bannerTitle || `Day ${currentDayIndex}`;
      sawAnySceneInCurrentDay = false;
      return;
    }

    if (strip.type !== 'scene' || !strip.sceneId) return;
    sawAnySceneInCurrentDay = true;

    const sc = sceneMap.get(strip.sceneId);
    const location = (sc?.location || strip.set || sc?.setting || 'UNKNOWN LOCATION').trim();
    const rawTime = strip.timeOfDay || sc?.timeOfDay || '';
    const startMin = parseClockMinutes(rawTime);
    const durMin = parseDurationMinutes(strip.scheduledDuration || sc?.shootingDuration);
    const endMin = startMin !== null ? startMin + durMin : null;
    const timeWindowLabel =
      startMin !== null && endMin !== null
        ? `${formatMinutesAsClock(startMin)}–${formatMinutesAsClock(endMin)}`
        : rawTime || (sc?.dayNight ? `${sc.dayNight} call` : 'Same Shooting Day');

    const slot: CharacterScheduleSlot = {
      sceneId: strip.sceneId,
      sceneNumber: strip.sceneNumber ?? sc?.sceneNumber ?? 0,
      sceneHeading: sc?.heading || strip.set || 'UNKNOWN SCENE',
      location,
      shootDayIndex: currentDayIndex,
      shootDayLabel: currentDayLabel,
      timeOfDay: rawTime,
      startMin,
      endMin,
      timeWindowLabel,
    };

    sceneSlotsBySceneId[strip.sceneId] = slot;

    const sceneChars = new Set<string>(charsBySceneId.get(strip.sceneId) || []);
    (strip.characters || []).forEach((c) => {
      const cleaned = resolveCanonicalCharacter(c);
      if (cleaned) sceneChars.add(cleaned);
    });

    sceneChars.forEach((charName) => {
      if (!characterColors[charName]) {
        const idx = Object.keys(characterColors).length;
        characterColors[charName] = fallbackPalette[idx % fallbackPalette.length];
      }
      const bucketKey = `${currentDayIndex}::${charName}`;
      if (!appearancesByDayAndChar.has(bucketKey)) {
        appearancesByDayAndChar.set(bucketKey, []);
      }
      appearancesByDayAndChar.get(bucketKey)!.push(slot);
    });
  });

  // Evaluate simultaneous two-location conflicts within the same shooting day
  const conflicts: CharacterSimultaneousLocationConflict[] = [];
  const conflictsBySceneId: Record<string, CharacterSimultaneousLocationConflict[]> = {};
  const conflictsByCharacter: Record<string, CharacterSimultaneousLocationConflict[]> = {};

  appearancesByDayAndChar.forEach((slots, bucketKey) => {
    if (slots.length < 2) return;
    const charName = bucketKey.split('::')[1];
    const color = characterColors[charName] || '#f43f5e';

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        if (a.sceneId === b.sceneId) continue;

        const locA = normalizeLocationKey(a.location);
        const locB = normalizeLocationKey(b.location);
        if (!locA || !locB || locA === locB) continue;

        let isSimultaneous = false;
        let overlapReason = '';

        if (a.startMin !== null && a.endMin !== null && b.startMin !== null && b.endMin !== null) {
          if (a.startMin < b.endMin && b.startMin < a.endMin) {
            isSimultaneous = true;
            const overlapStart = Math.max(a.startMin, b.startMin);
            const overlapEnd = Math.min(a.endMin, b.endMin);
            overlapReason = `Overlapping shoot window (${formatMinutesAsClock(
              overlapStart
            )}–${formatMinutesAsClock(overlapEnd)}) across "${a.location}" (Sc. ${
              a.sceneNumber
            }) and "${b.location}" (Sc. ${b.sceneNumber}) on ${a.shootDayLabel}.`;
          }
        } else if (a.timeOfDay && b.timeOfDay && a.timeOfDay.trim() === b.timeOfDay.trim()) {
          isSimultaneous = true;
          overlapReason = `Identical call time (${a.timeOfDay}) at "${a.location}" (Sc. ${a.sceneNumber}) and "${b.location}" (Sc. ${b.sceneNumber}) on ${a.shootDayLabel}.`;
        } else {
          // If explicit times aren't staggered, check if shooting dates overlap or remain unseparated
          const scA = sceneMap.get(a.sceneId);
          const scB = sceneMap.get(b.sceneId);
          if (
            scA?.shootingStartDate &&
            scB?.shootingStartDate &&
            scA.shootingStartDate === scB.shootingStartDate
          ) {
            isSimultaneous = true;
            overlapReason = `Same shooting date (${scA.shootingStartDate}) at "${a.location}" (Sc. ${a.sceneNumber}) and "${b.location}" (Sc. ${b.sceneNumber}) with no staggered call time.`;
          }
        }

        if (isSimultaneous) {
          const conflict: CharacterSimultaneousLocationConflict = {
            id: `char-loc-conflict-${a.shootDayIndex}-${charName}-${a.sceneNumber}-${b.sceneNumber}`,
            characterName: charName,
            color,
            shootDayIndex: a.shootDayIndex,
            shootDayLabel: a.shootDayLabel,
            slotA: a,
            slotB: b,
            reason: overlapReason,
          };
          conflicts.push(conflict);

          if (!conflictsBySceneId[a.sceneId]) conflictsBySceneId[a.sceneId] = [];
          conflictsBySceneId[a.sceneId].push(conflict);
          if (!conflictsBySceneId[b.sceneId]) conflictsBySceneId[b.sceneId] = [];
          conflictsBySceneId[b.sceneId].push(conflict);

          if (!conflictsByCharacter[charName]) conflictsByCharacter[charName] = [];
          conflictsByCharacter[charName].push(conflict);
        }
      }
    }
  });

  return {
    conflicts,
    conflictsBySceneId,
    conflictsByCharacter,
    sceneSlotsBySceneId,
    characterColors,
  };
};
