import React from 'react';
import {
  EditorTypographySettings,
  ElementFormatting,
  ElementTextAlign,
  ElementType,
  HighlightColor,
  PageLayoutOption,
  ScreenplayElement,
} from '../types/story';

export interface ScreenplayElementMeta {
  type: ElementType;
  shortcutKey: string;
  label: string;
  shortLabel: string;
  fdxType: string;
  placeholder: string;
  defaultAlign: ElementTextAlign;
  defaultBold: boolean;
  defaultItalic: boolean;
  defaultUnderline: boolean;
  uppercase: boolean;
  nextOnEnter: ElementType;
  tabTarget?: ElementType;
}

export const DEFAULT_EDITOR_TYPOGRAPHY: EditorTypographySettings = {
  fontFamily: 'Courier Prime',
  fontSizePt: 12,
  lineSpacing: 1.3,
  pageLayout: 'letter',
};

export interface PageLayoutMeta {
  id: PageLayoutOption;
  label: string;
  shortLabel: string;
  dimensionsLabel: string;
  paperMaxWidthClass: string;
  paperPaddingClass: string;
}

export const PAGE_LAYOUT_OPTIONS: PageLayoutMeta[] = [
  {
    id: 'letter',
    label: 'US Letter (8.5 × 11 in)',
    shortLabel: 'Letter 8.5×11',
    dimensionsLabel: '8.5" × 11" · Standard US Film Script',
    paperMaxWidthClass: 'max-w-[850px]',
    paperPaddingClass: 'px-16 py-16',
  },
  {
    id: 'a4',
    label: 'ISO A4 (210 × 297 mm)',
    shortLabel: 'A4 Intl',
    dimensionsLabel: '210mm × 297mm · International Script',
    paperMaxWidthClass: 'max-w-[794px]',
    paperPaddingClass: 'px-14 py-16',
  },
  {
    id: 'compact',
    label: 'Compact Studio Margins',
    shortLabel: 'Compact',
    dimensionsLabel: 'Tight Margins · Rehearsal & Table Read',
    paperMaxWidthClass: 'max-w-[700px]',
    paperPaddingClass: 'px-10 py-12',
  },
];

export interface ScriptFontFamilyOption {
  id: string;
  label: string;
  cssFamily: string;
  category: 'Screenplay Mono' | 'Sans-Serif' | 'Serif';
}

export const SCRIPT_FONT_FAMILIES: ScriptFontFamilyOption[] = [
  {
    id: 'Courier Prime',
    label: 'Courier Prime',
    cssFamily: "'Courier Prime', 'Courier Std', 'Courier New', Courier, monospace",
    category: 'Screenplay Mono',
  },
  {
    id: 'Courier Std',
    label: 'Courier Std',
    cssFamily: "'Courier Std', 'Courier Prime', 'Courier New', Courier, monospace",
    category: 'Screenplay Mono',
  },
  {
    id: 'Courier New',
    label: 'Courier New',
    cssFamily: "'Courier New', Courier, monospace",
    category: 'Screenplay Mono',
  },
  {
    id: 'IBM Plex Mono',
    label: 'IBM Plex Mono',
    cssFamily: "'IBM Plex Mono', 'Courier Prime', monospace",
    category: 'Screenplay Mono',
  },
  {
    id: 'IBM Plex Sans',
    label: 'IBM Plex Sans',
    cssFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'Sans-Serif',
  },
  {
    id: 'Georgia',
    label: 'Georgia / Serif',
    cssFamily: "'Merriweather', Georgia, 'Times New Roman', serif",
    category: 'Serif',
  },
  {
    id: 'Arial',
    label: 'Arial / Helvetica',
    cssFamily: 'Arial, Helvetica, sans-serif',
    category: 'Sans-Serif',
  },
];

export const SCRIPT_FONT_SIZES: number[] = [10, 11, 12, 13, 14, 16, 18];

export interface LineSpacingOption {
  value: number;
  label: string;
  description: string;
}

export const LINE_SPACING_OPTIONS: LineSpacingOption[] = [
  { value: 1.0, label: '1.0', description: 'Single (Tight)' },
  { value: 1.15, label: '1.15', description: 'Compact' },
  { value: 1.3, label: '1.3', description: 'Screenplay Standard' },
  { value: 1.5, label: '1.5', description: '1.5× Relaxed' },
  { value: 2.0, label: '2.0', description: 'Double Spaced' },
];

export interface HighlightColorOption {
  id: HighlightColor;
  label: string;
  swatchHex: string;
  paperBg: string;
  darkBg: string;
  darkText?: string;
}

export const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  {
    id: 'none',
    label: 'No Highlight',
    swatchHex: 'transparent',
    paperBg: 'transparent',
    darkBg: 'transparent',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    swatchHex: '#fde047',
    paperBg: 'rgba(254, 240, 138, 0.9)',
    darkBg: 'rgba(250, 204, 21, 0.28)',
    darkText: '#fef9c3',
  },
  {
    id: 'amber',
    label: 'Amber',
    swatchHex: '#fdba74',
    paperBg: 'rgba(254, 215, 170, 0.9)',
    darkBg: 'rgba(251, 146, 60, 0.28)',
    darkText: '#ffedd5',
  },
  {
    id: 'green',
    label: 'Green',
    swatchHex: '#86efac',
    paperBg: 'rgba(187, 247, 208, 0.9)',
    darkBg: 'rgba(74, 222, 128, 0.25)',
    darkText: '#dcfce7',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    swatchHex: '#67e8f9',
    paperBg: 'rgba(165, 243, 252, 0.9)',
    darkBg: 'rgba(34, 211, 238, 0.25)',
    darkText: '#cffafe',
  },
  {
    id: 'pink',
    label: 'Pink',
    swatchHex: '#f9a8d4',
    paperBg: 'rgba(251, 207, 232, 0.9)',
    darkBg: 'rgba(244, 114, 182, 0.26)',
    darkText: '#fce7f3',
  },
];

// Ordered to match the Elements composing shortcut menu screenshot
export const SCREENPLAY_ELEMENTS_META: ScreenplayElementMeta[] = [
  {
    type: 'GENERAL',
    shortcutKey: 'G',
    label: 'General',
    shortLabel: 'General',
    fdxType: 'General',
    placeholder: 'General text...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'GENERAL',
  },
  {
    type: 'SCENE_HEADING',
    shortcutKey: 'S',
    label: 'Scene Heading',
    shortLabel: 'Scene Heading',
    fdxType: 'Scene Heading',
    placeholder: 'INT./EXT. LOCATION - DAY/NIGHT',
    defaultAlign: 'left',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: true,
    nextOnEnter: 'ACTION',
    tabTarget: 'ACTION',
  },
  {
    type: 'ACTION',
    shortcutKey: 'A',
    label: 'Action',
    shortLabel: 'Action',
    fdxType: 'Action',
    placeholder: 'Describe scene action, movement, and visuals...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'ACTION',
    tabTarget: 'CHARACTER',
  },
  {
    type: 'CHARACTER',
    shortcutKey: 'C',
    label: 'Character',
    shortLabel: 'Character',
    fdxType: 'Character',
    placeholder: 'CHARACTER NAME',
    defaultAlign: 'center',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: true,
    nextOnEnter: 'DIALOGUE',
    tabTarget: 'DIALOGUE',
  },
  {
    type: 'PARENTHETICAL',
    shortcutKey: 'P',
    label: 'Parenthetical',
    shortLabel: 'Parenthetical',
    fdxType: 'Parenthetical',
    placeholder: '(beat / direction)',
    defaultAlign: 'center',
    defaultBold: false,
    defaultItalic: true,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'DIALOGUE',
    tabTarget: 'DIALOGUE',
  },
  {
    type: 'DIALOGUE',
    shortcutKey: 'D',
    label: 'Dialogue',
    shortLabel: 'Dialogue',
    fdxType: 'Dialogue',
    placeholder: 'Character dialogue...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'CHARACTER',
    tabTarget: 'VOICE_OVER',
  },
  {
    type: 'VOICE_OVER',
    shortcutKey: 'V',
    label: 'Voice-over (V.O.)',
    shortLabel: 'Voice-over',
    fdxType: 'Dialogue',
    placeholder: 'Voice-over narration or internal monologue...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: true,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'CHARACTER',
    tabTarget: 'PARENTHETICAL',
  },
  {
    type: 'TRANSITION',
    shortcutKey: 'T',
    label: 'Transition',
    shortLabel: 'Transition',
    fdxType: 'Transition',
    placeholder: 'CUT TO:',
    defaultAlign: 'right',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: true,
    nextOnEnter: 'SCENE_HEADING',
  },
  {
    type: 'SHOT',
    shortcutKey: 'H',
    label: 'Shot',
    shortLabel: 'Shot',
    fdxType: 'Shot',
    placeholder: 'ANGLE ON / CLOSE UP - SUBJECT',
    defaultAlign: 'left',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: true,
    nextOnEnter: 'ACTION',
  },
  {
    type: 'CAST_LIST',
    shortcutKey: 'L',
    label: 'Cast List',
    shortLabel: 'Cast List',
    fdxType: 'Cast List',
    placeholder: 'CAST PRESENT: CHARACTER ONE, CHARACTER TWO...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: true,
    nextOnEnter: 'ACTION',
  },
  {
    type: 'NEW_ACT',
    shortcutKey: 'N',
    label: 'New Act',
    shortLabel: 'New Act',
    fdxType: 'New Act',
    placeholder: 'ACT ONE',
    defaultAlign: 'center',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: true,
    uppercase: true,
    nextOnEnter: 'SCENE_HEADING',
  },
  {
    type: 'SEQUENCE',
    shortcutKey: 'Q',
    label: 'Sequence',
    shortLabel: 'Sequence',
    fdxType: 'General',
    placeholder: 'SEQUENCE I — SEQUENCE TITLE',
    defaultAlign: 'left',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: true,
    nextOnEnter: 'SCENE_HEADING',
  },
  {
    type: 'END_OF_ACT',
    shortcutKey: 'E',
    label: 'End of Act',
    shortLabel: 'End of Act',
    fdxType: 'End of Act',
    placeholder: 'END OF ACT ONE',
    defaultAlign: 'center',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: true,
    uppercase: true,
    nextOnEnter: 'NEW_ACT',
  },
  {
    type: 'SUMMARY',
    shortcutKey: '0',
    label: 'Summary',
    shortLabel: 'Summary',
    fdxType: 'General',
    placeholder: 'Scene or act summary beat...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: true,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'SCENE_HEADING',
  },
  {
    type: 'OUTLINE_1',
    shortcutKey: '1',
    label: 'Outline 1',
    shortLabel: 'Outline 1',
    fdxType: 'Outline 1',
    placeholder: 'I. Major Act / Sequence Beat...',
    defaultAlign: 'left',
    defaultBold: true,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'OUTLINE_2',
  },
  {
    type: 'OUTLINE_2',
    shortcutKey: '2',
    label: 'Outline 2',
    shortLabel: 'Outline 2',
    fdxType: 'Outline 2',
    placeholder: '  A. Scene Turning Point...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: false,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'OUTLINE_3',
  },
  {
    type: 'OUTLINE_3',
    shortcutKey: '3',
    label: 'Outline 3',
    shortLabel: 'Outline 3',
    fdxType: 'Outline 3',
    placeholder: '    1. Beat Detail...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: true,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'ACTION',
  },
  {
    type: 'NOTE',
    shortcutKey: '4',
    label: 'Note',
    shortLabel: 'Note',
    fdxType: 'Note',
    placeholder: 'Script note / beat reminder...',
    defaultAlign: 'left',
    defaultBold: false,
    defaultItalic: true,
    defaultUnderline: false,
    uppercase: false,
    nextOnEnter: 'ACTION',
  },
];

export const ELEMENT_META_BY_TYPE: Record<ElementType, ScreenplayElementMeta> =
  SCREENPLAY_ELEMENTS_META.reduce(
    (acc, meta) => {
      acc[meta.type] = meta;
      return acc;
    },
    {} as Record<ElementType, ScreenplayElementMeta>
  );

export const SHORTCUT_KEY_TO_ELEMENT_TYPE: Record<string, ElementType> =
  SCREENPLAY_ELEMENTS_META.reduce(
    (acc, meta) => {
      acc[meta.shortcutKey.toUpperCase()] = meta.type;
      return acc;
    },
    {} as Record<string, ElementType>
  );

export function getElementMeta(type: ElementType): ScreenplayElementMeta {
  return ELEMENT_META_BY_TYPE[type] || ELEMENT_META_BY_TYPE.ACTION;
}

export function resolveFontFamilyCss(fontFamilyId?: string): string {
  const match = SCRIPT_FONT_FAMILIES.find(
    (f) => f.id === fontFamilyId || f.label === fontFamilyId
  );
  return match ? match.cssFamily : SCRIPT_FONT_FAMILIES[0].cssFamily;
}

export interface EffectiveElementFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  highlight: HighlightColor;
  align: ElementTextAlign;
  fontFamily: string;
  fontSizePt: number;
  lineSpacing: number;
}

export function getEffectiveElementFormatting(
  element: Pick<ScreenplayElement, 'type' | 'formatting'> | undefined,
  projectTypography?: EditorTypographySettings
): EffectiveElementFormatting {
  const baseTypo = projectTypography || DEFAULT_EDITOR_TYPOGRAPHY;
  const meta = element ? getElementMeta(element.type) : ELEMENT_META_BY_TYPE.ACTION;
  const fmt: ElementFormatting = element?.formatting || {};

  return {
    bold: fmt.bold !== undefined ? fmt.bold : meta.defaultBold,
    italic: fmt.italic !== undefined ? fmt.italic : meta.defaultItalic,
    underline: fmt.underline !== undefined ? fmt.underline : meta.defaultUnderline,
    strikethrough: fmt.strikethrough ?? false,
    highlight: fmt.highlight ?? 'none',
    align: fmt.align ?? meta.defaultAlign,
    fontFamily: fmt.fontFamily || baseTypo.fontFamily || DEFAULT_EDITOR_TYPOGRAPHY.fontFamily,
    fontSizePt: fmt.fontSizePt || baseTypo.fontSizePt || DEFAULT_EDITOR_TYPOGRAPHY.fontSizePt,
    lineSpacing: fmt.lineSpacing || baseTypo.lineSpacing || DEFAULT_EDITOR_TYPOGRAPHY.lineSpacing,
  };
}

export function buildElementTextStyle(
  effective: EffectiveElementFormatting,
  surface: 'paper' | 'dark' = 'paper'
): React.CSSProperties {
  const textDecorations: string[] = [];
  if (effective.underline) textDecorations.push('underline');
  if (effective.strikethrough) textDecorations.push('line-through');

  const highlightOpt =
    HIGHLIGHT_COLORS.find((h) => h.id === effective.highlight) || HIGHLIGHT_COLORS[0];

  const bgColor =
    effective.highlight !== 'none'
      ? surface === 'paper'
        ? highlightOpt.paperBg
        : highlightOpt.darkBg
      : undefined;

  return {
    fontFamily: resolveFontFamilyCss(effective.fontFamily),
    fontSize: `${effective.fontSizePt}pt`,
    lineHeight: effective.lineSpacing,
    fontWeight: effective.bold ? 700 : 400,
    fontStyle: effective.italic ? 'italic' : 'normal',
    textDecorationLine: textDecorations.length > 0 ? textDecorations.join(' ') : 'none',
    textAlign: effective.align,
    ...(bgColor ? { backgroundColor: bgColor } : {}),
    ...(surface === 'dark' && effective.highlight !== 'none' && highlightOpt.darkText
      ? { color: highlightOpt.darkText }
      : {}),
  };
}

export function resolveFlexJustifyClass(align: ElementTextAlign): string {
  if (align === 'center') return 'justify-center';
  if (align === 'right') return 'justify-end';
  return 'justify-start';
}

export function estimateTextareaRows(
  text: string,
  charsPerLine: number,
  fontSizePt: number = 12
): number {
  const scaleFactor = 12 / Math.max(10, fontSizePt);
  const adjustedChars = Math.max(18, Math.floor(charsPerLine * scaleFactor));
  const logicalLines = (text || '').split('\n');
  let totalRows = 0;
  for (const line of logicalLines) {
    totalRows += Math.max(1, Math.ceil(Math.max(1, line.length) / adjustedChars));
  }
  return Math.max(1, totalRows);
}
