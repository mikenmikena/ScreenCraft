import {
  ElementType,
  Scene,
  ScreenplayElement,
  StoryCharacter,
  StoryProject,
  StripboardStrip,
} from '../types/story';
import { DEFAULT_EDITOR_TYPOGRAPHY } from './screenplayFormatting';

export type SubtitleFormat = 'srt' | 'vtt';

export type SubtitleElementHint =
  | 'auto'
  | 'DIALOGUE'
  | 'VOICE_OVER'
  | 'ACTION'
  | 'SCENE_HEADING'
  | 'PARENTHETICAL';

export interface SubtitleCue {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  elementHint?: SubtitleElementHint;
  sceneNumber?: number;
}

export interface ScriptToSubtitleOptions {
  format: SubtitleFormat;
  sceneId: string | 'all';
  scope: 'spoken_only' | 'spoken_and_action';
  includeSpeakerNames: boolean;
  includeParentheticals: boolean;
  wordsPerMinute: number;
  minDurationMs: number;
  maxDurationMs: number;
  gapMs: number;
  maxCharsPerLine: number;
  maxLinesPerCue: number;
}

export interface SubtitleToScriptOptions {
  title: string;
  author: string;
  documentCategory: 'film' | 'television' | 'stage';
  defaultSceneHeading: string;
  detectSceneBreaksOnGapSec: number;
  extractSpeakerPrefixes: boolean;
  mergeConsecutiveSameSpeaker: boolean;
  treatBracketedAsAction: boolean;
}

export const DEFAULT_SCRIPT_TO_SUBTITLE_OPTIONS: ScriptToSubtitleOptions = {
  format: 'srt',
  sceneId: 'all',
  scope: 'spoken_only',
  includeSpeakerNames: true,
  includeParentheticals: false,
  wordsPerMinute: 150,
  minDurationMs: 1300,
  maxDurationMs: 6500,
  gapMs: 120,
  maxCharsPerLine: 42,
  maxLinesPerCue: 2,
};

export const DEFAULT_SUBTITLE_TO_SCRIPT_OPTIONS: SubtitleToScriptOptions = {
  title: 'Imported Subtitle Screenplay',
  author: 'Jeffrey (Online)',
  documentCategory: 'film',
  defaultSceneHeading: 'INT. MAIN LOCATION - DAY',
  detectSceneBreaksOnGapSec: 10,
  extractSpeakerPrefixes: true,
  mergeConsecutiveSameSpeaker: true,
  treatBracketedAsAction: true,
};

export function clampMs(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms);
}

export function msToSrtTime(ms: number): string {
  const safe = clampMs(ms);
  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function msToVttTime(ms: number): string {
  const safe = clampMs(ms);
  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function formatCueDuration(startMs: number, endMs: number): string {
  const diff = Math.max(0, endMs - startMs);
  return `${(diff / 1000).toFixed(1)}s`;
}

export function parseTimestampToMs(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;

  // Match HH:MM:SS.mmm or MM:SS.mmm or H:MM:SS.cc
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const sParts = parts[2].split('.');
    const s = Number(sParts[0]);
    const fracRaw = (sParts[1] || '0').replace(/[^0-9]/g, '');
    const ms = fracRaw
      ? Number(fracRaw.padEnd(3, '0').slice(0, 3))
      : 0;
    if ([h, m, s, ms].some((n) => Number.isNaN(n))) return null;
    return Math.max(0, Math.round((h * 3600 + m * 60 + s) * 1000 + ms));
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const sParts = parts[1].split('.');
    const s = Number(sParts[0]);
    const fracRaw = (sParts[1] || '0').replace(/[^0-9]/g, '');
    const ms = fracRaw
      ? Number(fracRaw.padEnd(3, '0').slice(0, 3))
      : 0;
    if ([m, s, ms].some((n) => Number.isNaN(n))) return null;
    return Math.max(0, Math.round((m * 60 + s) * 1000 + ms));
  }

  const numeric = Number(cleaned);
  if (!Number.isNaN(numeric) && numeric >= 0) {
    return Math.round(numeric * 1000);
  }
  return null;
}

function parseScriptSceneTimecodeToMs(tc?: string): number {
  if (!tc) return 0;
  const parsed = parseTimestampToMs(tc);
  return parsed ?? 0;
}

function wrapTextWords(text: string, maxCharsPerLine: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.slice(i, i + maxCharsPerLine));
        }
      }
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function wrapAndSplitSubtitleText(
  text: string,
  maxCharsPerLine: number,
  maxLinesPerCue: number
): string[] {
  const safeChars = Math.max(20, Math.min(80, maxCharsPerLine));
  const safeLines = Math.max(1, Math.min(4, maxLinesPerCue));
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const allLines: string[] = [];
  for (const para of paragraphs) {
    allLines.push(...wrapTextWords(para, safeChars));
  }
  if (allLines.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < allLines.length; i += safeLines) {
    chunks.push(allLines.slice(i, i + safeLines).join('\n'));
  }
  return chunks;
}

function estimateReadingDurationMs(
  text: string,
  wpm: number,
  minMs: number,
  maxMs: number
): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const msPerWord = 60000 / Math.max(80, Math.min(300, wpm));
  const estimated = Math.round(words * msPerWord + 450);
  return Math.max(minMs, Math.min(maxMs, estimated));
}

export function generateSubtitlesFromScript(
  project: StoryProject,
  options: ScriptToSubtitleOptions
): SubtitleCue[] {
  const sceneMap = new Map<string, Scene>();
  project.scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const targetElements =
    options.sceneId === 'all'
      ? project.elements
      : project.elements.filter((el) => el.sceneId === options.sceneId);

  const cues: SubtitleCue[] = [];
  let cursorMs = 500;
  let lastSceneId: string | undefined;
  let activeSpeaker: string | undefined;
  let activeIsVO = false;
  let pendingParenthetical = '';

  const pushSpokenOrActionCue = (
    rawText: string,
    speaker: string | undefined,
    elementHint: SubtitleElementHint,
    sceneNum?: number
  ) => {
    const chunks = wrapAndSplitSubtitleText(
      rawText,
      options.maxCharsPerLine,
      options.maxLinesPerCue
    );
    for (const chunk of chunks) {
      const durationMs = estimateReadingDurationMs(
        chunk,
        options.wordsPerMinute,
        options.minDurationMs,
        options.maxDurationMs
      );
      const startMs = cursorMs;
      const endMs = startMs + durationMs;
      cues.push({
        id: `cue-gen-${cues.length + 1}-${startMs}`,
        index: cues.length + 1,
        startMs,
        endMs,
        text: chunk,
        speaker,
        elementHint,
        sceneNumber: sceneNum,
      });
      cursorMs = endMs + Math.max(40, options.gapMs);
    }
  };

  for (let i = 0; i < targetElements.length; i++) {
    const el = targetElements[i];
    const scene = el.sceneId ? sceneMap.get(el.sceneId) : undefined;

    if (el.sceneId && el.sceneId !== lastSceneId) {
      if (lastSceneId !== undefined) {
        // Brief pause on scene transitions
        cursorMs += 650;
      } else if (options.sceneId === 'all' && scene?.timecode) {
        const sceneTcMs = parseScriptSceneTimecodeToMs(scene.timecode);
        if (sceneTcMs > cursorMs) {
          cursorMs = sceneTcMs + 400;
        }
      }
      lastSceneId = el.sceneId;
      activeSpeaker = undefined;
      activeIsVO = false;
      pendingParenthetical = '';
    }

    if (el.type === 'CHARACTER') {
      const cleanName = el.text.replace(/\s*\([^)]*\)$/, '').trim().toUpperCase();
      activeSpeaker = cleanName || el.character || 'CHARACTER';
      activeIsVO = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(el.text);
      pendingParenthetical = '';
      continue;
    }

    if (el.type === 'PARENTHETICAL') {
      if (options.includeParentheticals && el.text.trim()) {
        const cleanParen = el.text.trim();
        pendingParenthetical = cleanParen.startsWith('(')
          ? cleanParen
          : `(${cleanParen})`;
      }
      continue;
    }

    if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') {
      const rawLine = el.text.trim();
      if (!rawLine) continue;

      const resolvedSpeaker = (el.character || activeSpeaker || 'SPEAKER').toUpperCase();
      const isVO = el.type === 'VOICE_OVER' || activeIsVO;
      const speakerTag = isVO ? `${resolvedSpeaker} (V.O.)` : resolvedSpeaker;

      const bodyWithParen = pendingParenthetical
        ? `${pendingParenthetical} ${rawLine}`
        : rawLine;
      pendingParenthetical = '';

      const finalCueText = options.includeSpeakerNames
        ? `${speakerTag}: ${bodyWithParen}`
        : bodyWithParen;

      pushSpokenOrActionCue(
        finalCueText,
        resolvedSpeaker,
        isVO ? 'VOICE_OVER' : 'DIALOGUE',
        scene?.sceneNumber
      );
      continue;
    }

    if (
      options.scope === 'spoken_and_action' &&
      (el.type === 'ACTION' || el.type === 'SHOT')
    ) {
      const rawAction = el.text.trim();
      if (!rawAction) continue;
      activeSpeaker = undefined;
      activeIsVO = false;
      pendingParenthetical = '';
      const bracketed = rawAction.startsWith('[') && rawAction.endsWith(']')
        ? rawAction
        : `[${rawAction}]`;
      pushSpokenOrActionCue(bracketed, undefined, 'ACTION', scene?.sceneNumber);
      continue;
    }

    // Reset active speaker when encountering scene headings or transitions
    if (el.type === 'SCENE_HEADING' || el.type === 'TRANSITION') {
      activeSpeaker = undefined;
      activeIsVO = false;
      pendingParenthetical = '';
    }
  }

  return cues;
}

export function serializeCuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, idx) => {
      const num = idx + 1;
      const start = msToSrtTime(cue.startMs);
      const end = msToSrtTime(Math.max(cue.startMs + 200, cue.endMs));
      const text = cue.text.trim();
      return `${num}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n')
    .concat(cues.length > 0 ? '\n' : '');
}

export function serializeCuesToVtt(
  cues: SubtitleCue[],
  metadata?: { title?: string; author?: string; useVoiceTags?: boolean }
): string {
  const headerLines = ['WEBVTT'];
  if (metadata?.title) {
    headerLines.push(`Kind: captions`);
    headerLines.push(`NOTE Title: ${metadata.title}${metadata.author ? ` | Author: ${metadata.author}` : ''}`);
  }
  const body = cues
    .map((cue, idx) => {
      const start = msToVttTime(cue.startMs);
      const end = msToVttTime(Math.max(cue.startMs + 200, cue.endMs));
      let text = cue.text.trim();
      if (
        metadata?.useVoiceTags &&
        cue.speaker &&
        !text.toLowerCase().startsWith('<v ')
      ) {
        const speakerPrefixRegex = new RegExp(
          `^${cue.speaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\([^)]*\\))?\\s*:\\s*`,
          'i'
        );
        const stripped = text.replace(speakerPrefixRegex, '').trim();
        text = `<v ${cue.speaker}>${stripped}`;
      }
      return `${idx + 1}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n');

  return `${headerLines.join('\n')}\n\n${body}${cues.length > 0 ? '\n' : ''}`;
}

export function triggerSubtitleDownload(
  content: string,
  fileName: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stripSubtitleMarkup(rawText: string): {
  cleanedText: string;
  extractedVoice?: string;
} {
  let extractedVoice: string | undefined;
  let text = rawText.replace(/\r\n/g, '\n');

  // Extract WebVTT <v Speaker Name> tag if present
  const voiceTagMatch = text.match(/<v(?:\.[^>\s]+)?\s+([^>]+)>/i);
  if (voiceTagMatch) {
    extractedVoice = voiceTagMatch[1].trim().toUpperCase();
  }

  // Strip HTML/VTT styling tags like <i>, <b>, <v ...>, </v>, <c.color>
  text = text
    .replace(/<\/?v[^>]*>/gi, '')
    .replace(/<\/?(?:i|b|u|em|strong|c|font|ruby|rt)[^>]*>/gi, '')
    .replace(/\{\\an\d+\}/gi, '');

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    cleanedText: lines.join('\n'),
    extractedVoice,
  };
}

export function detectSpeakerAndHintFromCueText(
  text: string,
  existingVoice?: string
): {
  speaker?: string;
  cleanBody: string;
  hint: SubtitleElementHint;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { cleanBody: '', hint: 'auto' };
  }

  // Scene Heading detection
  if (/^(INT\.|EXT\.|INT\/EXT|I\/E)[\s\.]/i.test(trimmed)) {
    return { cleanBody: trimmed.toUpperCase(), hint: 'SCENE_HEADING' };
  }

  // Bracketed SDH Action detection e.g. [Door creaks open]
  if (/^\[[^\]]+\]$/.test(trimmed)) {
    return { cleanBody: trimmed, hint: 'ACTION' };
  }

  // Parenthetical detection e.g. (whispering)
  if (/^\([^)]+\)$/.test(trimmed)) {
    return { cleanBody: trimmed, hint: 'PARENTHETICAL' };
  }

  // Check "SPEAKER (V.O.): Dialogue" or "SPEAKER: Dialogue"
  const colonMatch = trimmed.match(
    /^([A-Za-z][A-Za-z0-9\s.'-]{0,30}?)(\s*\((?:V\.?O\.?|O\.?S\.?|VOICE\s*OVER|CONT'D)\))?\s*:\s+([\s\S]+)$/
  );
  if (colonMatch) {
    const rawSpeaker = colonMatch[1].trim();
    const qualifier = colonMatch[2] || '';
    const isLikelySpeaker =
      rawSpeaker === rawSpeaker.toUpperCase() ||
      rawSpeaker.split(/\s+/).length <= 3;

    if (isLikelySpeaker && !/^(https?|note|sfx|music|sound)$/i.test(rawSpeaker)) {
      const isVO = /\((?:V\.?O\.?|VOICE\s*OVER)\)/i.test(qualifier);
      return {
        speaker: rawSpeaker.toUpperCase(),
        cleanBody: colonMatch[3].trim(),
        hint: isVO ? 'VOICE_OVER' : 'DIALOGUE',
      };
    }
  }

  // Check "[SPEAKER] Dialogue"
  const bracketSpeakerMatch = trimmed.match(
    /^\[([A-Za-z][A-Za-z0-9\s.'-]{0,28})\]\s+([\s\S]+)$/
  );
  if (bracketSpeakerMatch) {
    return {
      speaker: bracketSpeakerMatch[1].trim().toUpperCase(),
      cleanBody: bracketSpeakerMatch[2].trim(),
      hint: 'DIALOGUE',
    };
  }

  if (existingVoice) {
    return {
      speaker: existingVoice.toUpperCase(),
      cleanBody: trimmed,
      hint: 'DIALOGUE',
    };
  }

  return { cleanBody: trimmed, hint: 'auto' };
}

function finalizeParsedCue(
  index: number,
  startMs: number,
  endMs: number,
  rawLines: string[]
): SubtitleCue | null {
  const joined = rawLines.join('\n').trim();
  if (!joined) return null;
  const { cleanedText, extractedVoice } = stripSubtitleMarkup(joined);
  if (!cleanedText) return null;
  const detected = detectSpeakerAndHintFromCueText(cleanedText, extractedVoice);

  return {
    id: `cue-imp-${index}-${startMs}-${Math.random().toString(36).slice(2, 6)}`,
    index,
    startMs,
    endMs: Math.max(startMs + 250, endMs),
    text: cleanedText,
    speaker: detected.speaker,
    elementHint: detected.hint,
  };
}

export function parseSrtOrVtt(rawContent: string): SubtitleCue[] {
  const normalized = rawContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const cues: SubtitleCue[] = [];

  let i = 0;
  // Skip WEBVTT header & metadata blocks if present
  if (lines[0] && /^WEBVTT\b/i.test(lines[0].trim())) {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '') {
      i++;
    }
  }

  const arrowPattern =
    /^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)(.*)$/;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }

    // Skip WebVTT NOTE / STYLE / REGION blocks
    if (/^(NOTE|STYLE|REGION)\b/i.test(trimmed)) {
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        i++;
      }
      continue;
    }

    // Check if current line is timestamp arrow, or index followed by timestamp arrow
    let timeMatch = trimmed.match(arrowPattern);
    if (!timeMatch && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      const nextMatch = nextTrimmed.match(arrowPattern);
      if (nextMatch) {
        timeMatch = nextMatch;
        i++; // Advance to the timestamp line
      }
    }

    if (timeMatch) {
      const startMs = parseTimestampToMs(timeMatch[1]) ?? 0;
      const endMs = parseTimestampToMs(timeMatch[2]) ?? startMs + 2000;
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i]);
        i++;
      }
      const cue = finalizeParsedCue(cues.length + 1, startMs, endMs, textLines);
      if (cue) cues.push(cue);
      continue;
    }

    i++;
  }

  return cues;
}

export function parseSbv(rawContent: string): SubtitleCue[] {
  const normalized = rawContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];
  const sbvRangeRegex =
    /^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?)\s*,\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?)$/;

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const match = lines[0].match(sbvRangeRegex);
    if (!match) continue;
    const startMs = parseTimestampToMs(match[1]) ?? 0;
    const endMs = parseTimestampToMs(match[2]) ?? startMs + 2000;
    const cue = finalizeParsedCue(cues.length + 1, startMs, endMs, lines.slice(1));
    if (cue) cues.push(cue);
  }
  return cues;
}

export function parsePlainTimedOrTranscriptLines(rawContent: string): SubtitleCue[] {
  const lines = rawContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const cues: SubtitleCue[] = [];
  let cursorMs = 500;
  const timedPrefixRegex = /^[\[(]?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)[\])]?\s*[-–—]?\s*(.+)$/;

  for (const line of lines) {
    const timed = line.match(timedPrefixRegex);
    let startMs = cursorMs;
    let body = line;
    if (timed) {
      const parsedStart = parseTimestampToMs(timed[1]);
      if (parsedStart !== null) {
        startMs = parsedStart;
        body = timed[2].trim();
      }
    }
    const dur = estimateReadingDurationMs(body, 150, 1500, 6500);
    const cue = finalizeParsedCue(cues.length + 1, startMs, startMs + dur, [body]);
    if (cue) {
      cues.push(cue);
      cursorMs = cue.endMs + 150;
    }
  }
  return cues;
}

export function parseSubtitleFile(
  fileName: string,
  rawContent: string
): { cues: SubtitleCue[]; detectedFormat: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.sbv')) {
    const sbvCues = parseSbv(rawContent);
    if (sbvCues.length > 0) return { cues: sbvCues, detectedFormat: 'SBV (YouTube)' };
  }

  if (lower.endsWith('.vtt') || /^WEBVTT\b/i.test(rawContent.trim())) {
    const vttCues = parseSrtOrVtt(rawContent);
    if (vttCues.length > 0) return { cues: vttCues, detectedFormat: 'WebVTT (.vtt)' };
  }

  if (rawContent.includes('-->')) {
    const srtCues = parseSrtOrVtt(rawContent);
    if (srtCues.length > 0) {
      return {
        cues: srtCues,
        detectedFormat: /^WEBVTT\b/i.test(rawContent.trim()) ? 'WebVTT (.vtt)' : 'SubRip (.srt)',
      };
    }
  }

  const sbvFallback = parseSbv(rawContent);
  if (sbvFallback.length > 0) {
    return { cues: sbvFallback, detectedFormat: 'SBV' };
  }

  const lineCues = parsePlainTimedOrTranscriptLines(rawContent);
  return { cues: lineCues, detectedFormat: 'Timed Transcript' };
}

function parseHeadingMetadata(heading: string): {
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

  const setting = (upper.split(/[-–—]/)[0] || upper)
    .replace(/^(INT|EXT|INT\/EXT|EXT\/INT|I\/E)[\.\s]*/i, '')
    .trim();

  return {
    intExt,
    dayNight,
    setting: setting || 'MAIN LOCATION',
  };
}

function formatSceneTimecodeFromMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;
}

function eighthsToPages(eighths: number): string {
  const safe = Math.max(1, eighths);
  const whole = Math.floor(safe / 8);
  const rem = safe % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
}

export function buildScreenplayDataFromCues(
  cues: SubtitleCue[],
  options: SubtitleToScriptOptions,
  startingSceneNumber: number = 1
): {
  scenes: Scene[];
  elements: ScreenplayElement[];
  characters: StoryCharacter[];
  strips: StripboardStrip[];
} {
  const sortedCues = [...cues]
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.startMs - b.startMs);

  const now = Date.now();
  const elements: ScreenplayElement[] = [];
  const scenes: Scene[] = [];

  let currentSceneId = '';
  let currentSceneHeading = '';
  let currentSceneChars = new Set<string>();
  let currentSceneStartMs = 0;
  let currentSceneEndMs = 0;
  let currentSceneElementLines = 0;

  let prevCueEndMs: number | null = null;
  let lastSpeakerKey: string | null = null;
  let lastElementWasDialogue = false;

  const finalizeCurrentScene = () => {
    if (!currentSceneId) return;
    const eighths = Math.max(1, Math.round((currentSceneElementLines / 55) * 8));
    const spanSec = Math.max(
      15,
      Math.round((currentSceneEndMs - currentSceneStartMs) / 1000) ||
        Math.round((eighths / 8) * 60)
    );
    const meta = parseHeadingMetadata(currentSceneHeading);
    const sceneNumber = startingSceneNumber + scenes.length;
    scenes.push({
      id: currentSceneId,
      sceneNumber,
      heading: currentSceneHeading,
      setting: meta.setting,
      intExt: meta.intExt,
      dayNight: meta.dayNight,
      timecode: formatSceneTimecodeFromMs(currentSceneStartMs),
      durationSec: spanSec,
      pages: eighthsToPages(eighths),
      eighths,
      characters: Array.from(currentSceneChars),
      synopsis: `Converted from subtitle cues (${formatSceneTimecodeFromMs(
        currentSceneStartMs
      )} - ${formatSceneTimecodeFromMs(currentSceneEndMs)})`,
      notes: '',
      budget: '$8,500',
      location: meta.setting,
      act: sceneNumber <= 3 ? 1 : sceneNumber <= 7 ? 2 : 3,
      storyDay: Math.ceil(sceneNumber / 4),
      timeOfDay: meta.dayNight === 'NIGHT' ? '21:00' : '09:00',
    });
  };

  const startNewScene = (headingText: string, startMs: number) => {
    finalizeCurrentScene();
    const idx = scenes.length + 1;
    currentSceneId = `scene-sub-${now}-${idx}`;
    currentSceneHeading = headingText.toUpperCase();
    currentSceneChars = new Set<string>();
    currentSceneStartMs = startMs;
    currentSceneEndMs = startMs;
    currentSceneElementLines = 2;
    lastSpeakerKey = null;
    lastElementWasDialogue = false;

    elements.push({
      id: `el-sub-${now}-${elements.length + 1}`,
      type: 'SCENE_HEADING',
      text: currentSceneHeading,
      sceneId: currentSceneId,
      lastEditedAt: new Date().toISOString(),
    });
  };

  const baseHeading =
    options.defaultSceneHeading.trim().toUpperCase() || 'INT. MAIN LOCATION - DAY';
  const gapThresholdMs =
    options.detectSceneBreaksOnGapSec > 0
      ? options.detectSceneBreaksOnGapSec * 1000
      : Number.POSITIVE_INFINITY;

  for (let i = 0; i < sortedCues.length; i++) {
    const cue = sortedCues[i];
    const rawText = cue.text.replace(/\r\n/g, '\n').trim();
    if (!rawText) continue;

    const autoDetected = detectSpeakerAndHintFromCueText(rawText, cue.speaker);
    const effectiveHint: SubtitleElementHint =
      cue.elementHint && cue.elementHint !== 'auto'
        ? cue.elementHint
        : autoDetected.hint;

    const isExplicitHeading =
      effectiveHint === 'SCENE_HEADING' ||
      /^(INT\.|EXT\.|INT\/EXT|I\/E)[\s\.]/i.test(rawText);

    if (isExplicitHeading) {
      startNewScene(rawText, cue.startMs);
      prevCueEndMs = cue.endMs;
      currentSceneEndMs = Math.max(currentSceneEndMs, cue.endMs);
      continue;
    }

    // Start first scene or split on large gap
    if (!currentSceneId) {
      startNewScene(baseHeading, cue.startMs);
    } else if (
      prevCueEndMs !== null &&
      cue.startMs - prevCueEndMs >= gapThresholdMs
    ) {
      const nextSceneSeq = startingSceneNumber + scenes.length + 1;
      const derivedHeading =
        baseHeading.includes('CONTINUOUS')
          ? `${baseHeading} (PART ${nextSceneSeq})`
          : `${baseHeading.replace(/\s*-\s*(DAY|NIGHT|CONTINUOUS|LATER)$/i, '')} - LATER`;
      startNewScene(derivedHeading, cue.startMs);
    }

    currentSceneEndMs = Math.max(currentSceneEndMs, cue.endMs);

    // Bracketed action check
    const isBracketed = /^\[[\s\S]+\]$/.test(rawText);
    if (
      effectiveHint === 'ACTION' ||
      (options.treatBracketedAsAction && isBracketed && !cue.speaker)
    ) {
      const actionText = rawText.replace(/^\[/, '').replace(/\]$/, '').trim();
      if (actionText) {
        elements.push({
          id: `el-sub-${now}-${elements.length + 1}`,
          type: 'ACTION',
          text: actionText,
          sceneId: currentSceneId,
          lastEditedAt: new Date().toISOString(),
        });
        currentSceneElementLines += Math.max(1, Math.ceil(actionText.length / 55)) + 1;
        lastSpeakerKey = null;
        lastElementWasDialogue = false;
      }
      prevCueEndMs = cue.endMs;
      continue;
    }

    // Parenthetical check
    if (effectiveHint === 'PARENTHETICAL') {
      const paren = rawText.startsWith('(') ? rawText : `(${rawText})`;
      elements.push({
        id: `el-sub-${now}-${elements.length + 1}`,
        type: 'PARENTHETICAL',
        text: paren,
        sceneId: currentSceneId,
        lastEditedAt: new Date().toISOString(),
      });
      currentSceneElementLines += 1;
      lastElementWasDialogue = false;
      prevCueEndMs = cue.endMs;
      continue;
    }

    // Dialogue or Voice-Over
    const isVO = effectiveHint === 'VOICE_OVER';
    const dialogueElementType: ElementType = isVO ? 'VOICE_OVER' : 'DIALOGUE';

    let resolvedSpeaker = (cue.speaker || '').trim().toUpperCase();
    let dialogueBody = rawText.replace(/\n+/g, ' ').trim();

    if (options.extractSpeakerPrefixes) {
      if (!resolvedSpeaker && autoDetected.speaker) {
        resolvedSpeaker = autoDetected.speaker;
      }
      if (autoDetected.speaker && autoDetected.cleanBody) {
        dialogueBody = autoDetected.cleanBody.replace(/\n+/g, ' ').trim();
      } else if (resolvedSpeaker) {
        const prefixRegex = new RegExp(
          `^(?:${resolvedSpeaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\([^)]*\\))?\\s*:\\s*|\\[${resolvedSpeaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s+)`,
          'i'
        );
        dialogueBody = dialogueBody.replace(prefixRegex, '').trim();
      }
    }

    if (!resolvedSpeaker) {
      resolvedSpeaker = 'SPEAKER';
    }

    currentSceneChars.add(resolvedSpeaker);
    const speakerCueText = isVO ? `${resolvedSpeaker} (V.O.)` : resolvedSpeaker;
    const canMergeWithPrev =
      options.mergeConsecutiveSameSpeaker &&
      lastElementWasDialogue &&
      lastSpeakerKey === speakerCueText &&
      prevCueEndMs !== null &&
      cue.startMs - prevCueEndMs <= 2500 &&
      elements.length > 0 &&
      (elements[elements.length - 1].type === 'DIALOGUE' ||
        elements[elements.length - 1].type === 'VOICE_OVER');

    if (canMergeWithPrev) {
      const prevDialogue = elements[elements.length - 1];
      prevDialogue.text = `${prevDialogue.text} ${dialogueBody}`.trim();
      currentSceneElementLines += Math.max(1, Math.ceil(dialogueBody.length / 35));
    } else {
      elements.push({
        id: `el-sub-${now}-${elements.length + 1}`,
        type: 'CHARACTER',
        text: speakerCueText,
        character: resolvedSpeaker,
        sceneId: currentSceneId,
        lastEditedAt: new Date().toISOString(),
      });
      elements.push({
        id: `el-sub-${now}-${elements.length + 2}`,
        type: dialogueElementType,
        text: dialogueBody,
        character: resolvedSpeaker,
        sceneId: currentSceneId,
        lastEditedAt: new Date().toISOString(),
      });
      currentSceneElementLines += 2 + Math.max(1, Math.ceil(dialogueBody.length / 35));
    }

    lastSpeakerKey = speakerCueText;
    lastElementWasDialogue = true;
    prevCueEndMs = cue.endMs;
  }

  finalizeCurrentScene();

  // Guarantee at least one valid scene & element
  if (scenes.length === 0) {
    const fallbackSceneId = `scene-sub-${now}-1`;
    const meta = parseHeadingMetadata(baseHeading);
    scenes.push({
      id: fallbackSceneId,
      sceneNumber: startingSceneNumber,
      heading: baseHeading,
      setting: meta.setting,
      intExt: meta.intExt,
      dayNight: meta.dayNight,
      timecode: '00:00:00',
      durationSec: 30,
      pages: '1/8',
      eighths: 1,
      characters: [],
      synopsis: 'Converted from subtitle file',
      notes: '',
      budget: '$5,000',
      location: meta.setting,
      act: 1,
      storyDay: 1,
      timeOfDay: '09:00',
    });
    elements.push({
      id: `el-sub-${now}-1`,
      type: 'SCENE_HEADING',
      text: baseHeading,
      sceneId: fallbackSceneId,
    });
  }

  const palette = ['#00d2d3', '#ff6b6b', '#feca57', '#54a0ff', '#1dd1a1', '#ff9ff3'];
  const charNames = Array.from(
    new Set(
      elements
        .filter((e) => e.type === 'CHARACTER')
        .map((e) => (e.character || e.text.replace(/\s*\([^)]*\)$/, '')).trim())
        .filter(Boolean)
    )
  );

  const characters: StoryCharacter[] = charNames.map((name, idx) => ({
    name,
    color: palette[idx % palette.length],
    scenesCount: scenes.filter((s) => s.characters.includes(name)).length,
    speakingLines: elements.filter(
      (e) =>
        e.type === 'CHARACTER' &&
        (e.character || e.text.replace(/\s*\([^)]*\)$/, '')).trim() === name
    ).length,
  }));

  const strips: StripboardStrip[] = scenes.map((sc) => {
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

  return { scenes, elements, characters, strips };
}

export function convertSubtitlesToStoryProject(
  cues: SubtitleCue[],
  options: SubtitleToScriptOptions
): StoryProject {
  const { scenes, elements, characters, strips } = buildScreenplayDataFromCues(
    cues,
    options,
    1
  );

  return {
    id: `sub-import-${Date.now()}`,
    title: options.title.trim() || 'Imported Subtitle Screenplay',
    author: options.author.trim() || 'Jeffrey (Online)',
    lastModified: 'Converted from subtitles',
    documentCategory: options.documentCategory,
    scriptFormat: 'single_column_film',
    editorTypography: { ...DEFAULT_EDITOR_TYPOGRAPHY },
    scenes,
    elements,
    tags: [],
    comments: [],
    strips,
    characters,
  };
}

export const SAMPLE_SUBTITLE_TEXT = `1
00:00:01,200 --> 00:00:04,500
INT. OBSERVATORY CONTROL ROOM - NIGHT

2
00:00:05,000 --> 00:00:08,200
[Rain batters against the reinforced glass dome.]

3
00:00:08,600 --> 00:00:12,100
ELENA: The telemetry array just locked onto the outer beacon.

4
00:00:12,400 --> 00:00:15,800
ELENA: If we don't recalibrate within ninety seconds, the link drops.

5
00:00:16,300 --> 00:00:19,500
MARCUS: Hold the gain steady. I'm routing power through backup cells.

6
00:00:20,100 --> 00:00:24,200
DISPATCH (V.O.): Control, confirm atmospheric seal before initiating uplink.

7
00:00:36,500 --> 00:00:40,400
MARCUS: Beacon stabilized. We're recording live signal now.`;
