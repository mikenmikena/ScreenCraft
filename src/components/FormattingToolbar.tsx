import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Sigma,
  FileText,
  RefreshCw,
  Columns,
  Film,
  AudioWaveform,
  PlusCircle,
  MonitorPlay,
  History,
  ShieldAlert,
  CheckCircle2,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  StickyNote,
  ChevronDown,
  ListTree,
  ArrowUpDown,
  SpellCheck,
  BookCheck,
  Users,
  Bookmark,
  LayoutTemplate,
} from 'lucide-react';
import {
  ElementType,
  ActiveWorkspace,
  ScriptFormatMode,
  ElementTextAlign,
  HighlightColor,
  EditorTypographySettings,
  PageLayoutOption,
} from '../types/story';
import { RevisionPassCounts } from '../utils/revisionPass';
import {
  DEFAULT_EDITOR_TYPOGRAPHY,
  EffectiveElementFormatting,
  HIGHLIGHT_COLORS,
  LINE_SPACING_OPTIONS,
  PAGE_LAYOUT_OPTIONS,
  SCREENPLAY_ELEMENTS_META,
  SCRIPT_FONT_FAMILIES,
  SCRIPT_FONT_SIZES,
  getElementMeta,
} from '../utils/screenplayFormatting';

interface FormattingToolbarProps {
  activeWorkspace: ActiveWorkspace;
  currentElementType: ElementType;
  onChangeElementType: (type: ElementType) => void;
  effectiveFormatting: EffectiveElementFormatting;
  editorTypography?: EditorTypographySettings;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
  onSetHighlight: (color: HighlightColor) => void;
  onSetAlign: (align: ElementTextAlign) => void;
  onChangeFontFamily: (fontFamily: string) => void;
  onChangeFontSize: (fontSizePt: number) => void;
  onChangeLineSpacing: (lineSpacing: number) => void;
  onChangePageLayout?: (pageLayout: PageLayoutOption) => void;
  onOpenSpellCheck?: () => void;
  onOpenGrammarCheck?: () => void;
  onOpenDraftRevisions?: () => void;
  onOpenCharacterInfo?: () => void;
  proofreadCounts?: { spelling: number; grammar: number };
  onOpenElementsPopup?: () => void;
  documentTitle: string;
  isModified?: boolean;
  onRecalculate?: () => void;
  onOpenReports?: () => void;
  onAddBreak?: () => void;
  scriptFormat?: ScriptFormatMode;
  onChangeScriptFormat?: (format: ScriptFormatMode) => void;
  onOpenNLEPipeline?: () => void;
  onOpenTeleprompter?: () => void;
  pendingSyncCount?: number;
  onOpenRevisionImpact?: () => void;
  continuityAlertCount?: number;
  onOpenContinuityCheck?: () => void;
  isRevisionPassMode?: boolean;
  onToggleRevisionPassMode?: () => void;
  revisionPassCounts?: RevisionPassCounts;
  isLeftPanelCollapsed?: boolean;
  isRightPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onToggleFocusCenter?: () => void;
  isQuickNotesOpen?: boolean;
  onToggleQuickNotes?: () => void;
  zoomLevel: number;
  onChangeZoom: (zoom: number) => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  activeWorkspace,
  currentElementType,
  onChangeElementType,
  effectiveFormatting,
  editorTypography = DEFAULT_EDITOR_TYPOGRAPHY,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrikethrough,
  onSetHighlight,
  onSetAlign,
  onChangeFontFamily,
  onChangeFontSize,
  onChangeLineSpacing,
  onChangePageLayout,
  onOpenSpellCheck,
  onOpenGrammarCheck,
  onOpenDraftRevisions,
  onOpenCharacterInfo,
  proofreadCounts,
  onOpenElementsPopup,
  documentTitle,
  isModified = true,
  onRecalculate,
  onOpenReports,
  onAddBreak,
  scriptFormat = 'single_column_film',
  onChangeScriptFormat,
  onOpenNLEPipeline,
  onOpenTeleprompter,
  pendingSyncCount = 0,
  onOpenRevisionImpact,
  continuityAlertCount = 0,
  onOpenContinuityCheck,
  isRevisionPassMode = false,
  onToggleRevisionPassMode,
  revisionPassCounts,
  isLeftPanelCollapsed = false,
  isRightPanelCollapsed = false,
  onToggleLeftPanel,
  onToggleRightPanel,
  onToggleFocusCenter,
  isQuickNotesOpen = false,
  onToggleQuickNotes,
  zoomLevel,
  onChangeZoom,
}) => {
  const isCenterMaximized = isLeftPanelCollapsed && isRightPanelCollapsed;
  const isAuthoring = activeWorkspace === 'authoring';

  const [lastHighlightColor, setLastHighlightColor] = useState<HighlightColor>('yellow');
  const [highlightMenuPos, setHighlightMenuPos] = useState<{ top: number; left: number } | null>(null);
  const highlightTriggerRef = useRef<HTMLButtonElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (effectiveFormatting.highlight !== 'none') {
      setLastHighlightColor(effectiveFormatting.highlight);
    }
  }, [effectiveFormatting.highlight]);

  useEffect(() => {
    if (!highlightMenuPos) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        highlightMenuRef.current &&
        !highlightMenuRef.current.contains(e.target as Node) &&
        highlightTriggerRef.current &&
        !highlightTriggerRef.current.contains(e.target as Node)
      ) {
        setHighlightMenuPos(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [highlightMenuPos]);

  const currentHighlightOption =
    HIGHLIGHT_COLORS.find((h) => h.id === effectiveFormatting.highlight) || HIGHLIGHT_COLORS[0];

  const activeMeta = getElementMeta(currentElementType);

  const toggleHighlightPopover = () => {
    if (highlightMenuPos) {
      setHighlightMenuPos(null);
      return;
    }
    const rect = highlightTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      setHighlightMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(window.innerWidth - 180, rect.left - 24)),
      });
    }
  };

  return (
    <div className="bg-[#2e2e2e] border-b border-[#3e3e3e] flex flex-col text-xs select-none">
      {/* Document Tab Bar + Panel Collapse Controls */}
      <div className="flex flex-wrap items-center justify-between px-2 py-0.5 bg-[#222222] border-b border-[#383838] min-h-7 gap-2">
        <div className="flex items-center bg-[#2e2e2e] text-gray-200 px-3 py-1 rounded-t border-t-2 border-[#ff7700] text-xs font-medium space-x-2 min-w-0">
          <span className="truncate">{isModified ? `*${documentTitle}` : documentTitle}</span>
          <span className="text-[10px] text-gray-500 hover:text-white cursor-pointer ml-1">×</span>
        </div>

        {(onToggleLeftPanel || onToggleRightPanel || onToggleFocusCenter) && (
          <div className="flex flex-wrap items-center gap-1 text-[11px] min-w-0">
            {onToggleLeftPanel && (
              <button
                type="button"
                onClick={onToggleLeftPanel}
                title={isLeftPanelCollapsed ? 'Show Left Outline Panel' : 'Hide Left Outline Panel'}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                  !isLeftPanelCollapsed
                    ? 'bg-[#2c2c2c] border-[#454545] text-gray-200'
                    : 'bg-[#1a1a1a] border-[#333333] text-gray-400 hover:text-gray-200'
                }`}
              >
                <PanelLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Outline</span>
              </button>
            )}
            {onToggleFocusCenter && (
              <button
                type="button"
                onClick={onToggleFocusCenter}
                title={
                  isCenterMaximized
                    ? 'Restore Left & Right Side Panels'
                    : 'Collapse Side Panels to Maximize Center Workspace'
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                  isCenterMaximized
                    ? 'bg-[#2f2214] border-[#ff7700] text-amber-300 font-semibold'
                    : 'bg-[#1a1a1a] border-[#333333] text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                {isCenterMaximized ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>Restore Panels</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>Focus Center</span>
                  </>
                )}
              </button>
            )}
            {onToggleRightPanel && (
              <button
                type="button"
                onClick={onToggleRightPanel}
                title={isRightPanelCollapsed ? 'Show Right Inspector Panel' : 'Hide Right Inspector Panel'}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                  !isRightPanelCollapsed
                    ? 'bg-[#2c2c2c] border-[#454545] text-gray-200'
                    : 'bg-[#1a1a1a] border-[#333333] text-gray-400 hover:text-gray-200'
                }`}
              >
                <PanelRight className="w-3 h-3" />
                <span className="hidden sm:inline">Inspector</span>
              </button>
            )}
            {isAuthoring && onToggleQuickNotes && (
              <button
                type="button"
                onClick={onToggleQuickNotes}
                title={
                  isQuickNotesOpen
                    ? 'Minimize Quick Notes floating scratchpad'
                    : 'Open Quick Notes floating scratchpad'
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                  isQuickNotesOpen
                    ? 'bg-[#2f2214] border-[#ff7700] text-amber-300 font-semibold'
                    : 'bg-[#1a1a1a] border-[#333333] text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <StickyNote className="w-3 h-3 text-[#ff8c1a]" />
                <span>Quick Notes</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Formatting & Action Ribbon (wraps onto a second row cleanly if exceeding pane width) */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 min-h-[40px] gap-2">
        {/* Left Side: Element Formatting, Typography, Styles, Alignment & Line Spacing */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Elements Shortcut Menu Trigger + Format Dropdown */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#444444] rounded px-1.5 py-0.5 gap-1">
            {isAuthoring && onOpenElementsPopup && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onOpenElementsPopup}
                title="Open Elements Shortcut Menu (Ctrl+/ or Enter on empty line)"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] border border-[#4a4a4a] text-[11px] font-mono text-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                <ListTree className="w-3 h-3 text-[#ff8000]" />
                <span>[{activeMeta.shortcutKey}]</span>
              </button>
            )}
            <select
              value={currentElementType}
              disabled={!isAuthoring}
              onChange={(e) => onChangeElementType(e.target.value as ElementType)}
              aria-label="Screenplay element format"
              title="Change focused element format (or press Ctrl+/ for Elements menu)"
              className="bg-transparent text-xs font-semibold text-[#ff8000] focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {SCREENPLAY_ELEMENTS_META.map((meta) => (
                <option key={meta.type} value={meta.type} className="bg-[#222] text-gray-200">
                  [{meta.shortcutKey}] {meta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Family & Size Selectors */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#444444] rounded px-1.5 py-0.5 gap-1 text-gray-200">
            <select
              value={effectiveFormatting.fontFamily || editorTypography.fontFamily}
              disabled={!isAuthoring}
              onChange={(e) => onChangeFontFamily(e.target.value)}
              aria-label="Font family"
              title="Script font style"
              className="bg-transparent text-xs text-amber-200 font-medium focus:outline-none cursor-pointer max-w-[116px] disabled:opacity-50"
            >
              {SCRIPT_FONT_FAMILIES.map((font) => (
                <option key={font.id} value={font.id} className="bg-[#222] text-gray-200">
                  {font.label}
                </option>
              ))}
            </select>
            <span className="text-gray-600 text-[10px]">|</span>
            <select
              value={effectiveFormatting.fontSizePt || editorTypography.fontSizePt}
              disabled={!isAuthoring}
              onChange={(e) => onChangeFontSize(Number(e.target.value))}
              aria-label="Font size"
              title="Script font size (pt)"
              className="bg-transparent text-xs text-gray-200 tabular-nums focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {SCRIPT_FONT_SIZES.map((pt) => (
                <option key={pt} value={pt} className="bg-[#222] text-gray-200">
                  {pt} pt
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-[#444444]" />

          {/* Text Formatting Controls: Bold, Italic, Underline, Strikethrough, Highlight */}
          <div className="flex items-center space-x-0.5 bg-[#242424] p-0.5 rounded border border-[#3e3e3e]">
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleBold}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
              aria-pressed={effectiveFormatting.bold}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.bold
                  ? 'bg-[#ff7700] text-black font-bold'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleItalic}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
              aria-pressed={effectiveFormatting.italic}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.italic
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleUnderline}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
              aria-pressed={effectiveFormatting.underline}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.underline
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleStrikethrough}
              title="Strikethrough (Ctrl+Shift+X)"
              aria-label="Strikethrough"
              aria-pressed={effectiveFormatting.strikethrough}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.strikethrough
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            {/* Highlight Toggle + Color Swatch Picker */}
            <div className="flex items-center">
              <button
                type="button"
                disabled={!isAuthoring}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  onSetHighlight(
                    effectiveFormatting.highlight === 'none' ? lastHighlightColor : 'none'
                  )
                }
                title="Highlight Element (Ctrl+Shift+H)"
                aria-label="Toggle Highlight"
                aria-pressed={effectiveFormatting.highlight !== 'none'}
                className={`p-1.5 rounded-l transition-colors flex flex-col items-center justify-center ${
                  effectiveFormatting.highlight !== 'none'
                    ? 'bg-[#3b331d] text-amber-200'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-[#383838]'
                } disabled:opacity-40`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span
                  className="w-3.5 h-0.5 rounded-full mt-0.5"
                  style={{
                    backgroundColor:
                      effectiveFormatting.highlight !== 'none'
                        ? currentHighlightOption.swatchHex
                        : HIGHLIGHT_COLORS.find((h) => h.id === lastHighlightColor)?.swatchHex ||
                          '#fde047',
                  }}
                />
              </button>
              <button
                ref={highlightTriggerRef}
                type="button"
                disabled={!isAuthoring}
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleHighlightPopover}
                title="Choose Highlight Color"
                aria-label="Choose Highlight Color"
                className="px-0.5 py-1.5 rounded-r text-gray-400 hover:text-white hover:bg-[#383838] disabled:opacity-40"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Alignment Controls: Left, Center, Right */}
          <div className="flex items-center space-x-0.5 bg-[#242424] p-0.5 rounded border border-[#3e3e3e]">
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSetAlign('left')}
              title="Align Left (Ctrl+Shift+L)"
              aria-label="Align Left"
              aria-pressed={effectiveFormatting.align === 'left'}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.align === 'left'
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSetAlign('center')}
              title="Align Center (Ctrl+Shift+C)"
              aria-label="Align Center"
              aria-pressed={effectiveFormatting.align === 'center'}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.align === 'center'
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!isAuthoring}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSetAlign('right')}
              title="Align Right (Ctrl+Shift+R)"
              aria-label="Align Right"
              aria-pressed={effectiveFormatting.align === 'right'}
              className={`p-1.5 rounded transition-colors ${
                effectiveFormatting.align === 'right'
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838]'
              } disabled:opacity-40`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Line Spacing Control */}
          <div
            className="flex items-center bg-[#1e1e1e] border border-[#444444] rounded px-1.5 py-0.5 gap-1 text-gray-300"
            title="Line Spacing"
          >
            <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
            <select
              value={effectiveFormatting.lineSpacing || editorTypography.lineSpacing}
              disabled={!isAuthoring}
              onChange={(e) => onChangeLineSpacing(Number(e.target.value))}
              aria-label="Line spacing"
              className="bg-transparent text-xs text-gray-200 tabular-nums focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {LINE_SPACING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#222] text-gray-200">
                  {opt.label}× ({opt.description})
                </option>
              ))}
            </select>
          </div>

          {/* Page Layout Control */}
          {onChangePageLayout && (
            <div
              className="flex items-center bg-[#1e1e1e] border border-[#444444] rounded px-1.5 py-0.5 gap-1 text-gray-300"
              title="Page Layout & Margin Width"
            >
              <LayoutTemplate className="w-3 h-3 text-cyan-400 shrink-0" />
              <select
                value={editorTypography.pageLayout || 'letter'}
                disabled={!isAuthoring}
                onChange={(e) => onChangePageLayout(e.target.value as PageLayoutOption)}
                aria-label="Page layout"
                className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {PAGE_LAYOUT_OPTIONS.map((layout) => (
                  <option key={layout.id} value={layout.id} className="bg-[#222] text-gray-200">
                    {layout.shortLabel}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Script Format, Sync, Continuity, NLE Pipeline & Zoom */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {isAuthoring && onChangeScriptFormat && (
            <div className="flex items-center p-0.5 bg-[#1b1b1b] border border-[#444444] rounded">
              <button
                type="button"
                onClick={() => onChangeScriptFormat('single_column_film')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                  scriptFormat === 'single_column_film'
                    ? 'bg-[#333333] text-amber-300 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Single-Column Feature Screenplay"
              >
                <Film className="w-3 h-3" />
                <span>Film</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeScriptFormat('av_multi_column')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                  scriptFormat === 'av_multi_column'
                    ? 'bg-[#333333] text-cyan-300 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Multi-Column A/V Script with Embedded Storyboards"
              >
                <Columns className="w-3 h-3" />
                <span>A/V</span>
              </button>
            </div>
          )}

          {onOpenRevisionImpact && (
            <button
              type="button"
              onClick={onOpenRevisionImpact}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${
                pendingSyncCount > 0
                  ? 'bg-[#2e2012] hover:bg-[#3a2816] text-amber-300 border-[#ff7700]'
                  : 'bg-[#242424] hover:bg-[#353535] text-emerald-400 border-[#444444]'
              }`}
              title="Preview script revision impact on Production Schedule"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-medium tabular-nums">
                {pendingSyncCount > 0 ? `Schedule Sync (${pendingSyncCount})` : 'Schedule Synced'}
              </span>
            </button>
          )}

          {onOpenContinuityCheck && (
            <button
              type="button"
              onClick={onOpenContinuityCheck}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${
                continuityAlertCount > 0
                  ? 'bg-[#2c191c] hover:bg-[#392024] text-rose-200 border-rose-500/80'
                  : 'bg-[#242424] hover:bg-[#353535] text-emerald-400 border-[#444444]'
              }`}
              title="Automated Prop & Costume Continuity Check across scenes"
            >
              {continuityAlertCount > 0 ? (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="font-medium tabular-nums">
                {continuityAlertCount > 0
                  ? `Continuity (${continuityAlertCount})`
                  : 'Continuity Clear'}
              </span>
            </button>
          )}

          {onOpenNLEPipeline && (
            <button
              type="button"
              onClick={onOpenNLEPipeline}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-cyan-300 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
              title="Script-to-NLE Premiere Pro XML & Speech-to-Text Take Aligner"
            >
              <AudioWaveform className="w-3.5 h-3.5" />
              <span>NLE Pipeline</span>
            </button>
          )}

          {onOpenTeleprompter && (
            <button
              type="button"
              onClick={onOpenTeleprompter}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#141414] hover:bg-black text-white rounded border border-[#444444] hover:border-[#ff7700] transition-colors whitespace-nowrap shrink-0"
              title="Launch Dedicated Teleprompter Window (White on Black)"
            >
              <MonitorPlay className="w-3.5 h-3.5 text-[#ff7700]" />
              <span>Teleprompter</span>
            </button>
          )}

          {onRecalculate && (
            <button
              type="button"
              onClick={onRecalculate}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-amber-400 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
              title="Recalculate 1/8th Page Counts"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span className="font-medium">Recalc</span>
            </button>
          )}

          {activeWorkspace === 'production' && onAddBreak && (
            <button
              type="button"
              onClick={onAddBreak}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-emerald-400 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
              title="Add Day Break / Meal Banner"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Break</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenReports}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-gray-300 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
            title="Production Reports"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reports</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-[#1e1e1e] border border-[#444444] rounded px-2 py-1 text-gray-400 text-xs">
            <span className="text-[11px]">Zoom:</span>
            <select
              value={zoomLevel}
              onChange={(e) => onChangeZoom(Number(e.target.value))}
              className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value={75} className="bg-[#222]">75%</option>
              <option value={100} className="bg-[#222]">100%</option>
              <option value={125} className="bg-[#222]">125%</option>
              <option value={150} className="bg-[#222]">150%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fixed-position Highlight Color Swatch Popover */}
      {highlightMenuPos && (
        <div
          ref={highlightMenuRef}
          style={{ top: highlightMenuPos.top, left: highlightMenuPos.left }}
          className="fixed z-50 w-44 bg-[#202020] border border-[#454545] rounded-md shadow-2xl p-2 space-y-1.5"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
            Highlight Color
          </div>
          <div className="grid grid-cols-1 gap-1">
            {HIGHLIGHT_COLORS.map((opt) => {
              const isSelected = effectiveFormatting.highlight === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSetHighlight(opt.id);
                    if (opt.id !== 'none') setLastHighlightColor(opt.id);
                    setHighlightMenuPos(null);
                  }}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#353535] text-white font-semibold'
                      : 'text-gray-300 hover:bg-[#2c2c2c]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-xs border border-gray-500/70 shrink-0"
                    style={{
                      backgroundColor: opt.id === 'none' ? '#1a1a1a' : opt.swatchHex,
                    }}
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Authoring QC, Proofreading, Draft Revisions, Character Info & Revision Pass Strip */}
      {isAuthoring && onToggleRevisionPassMode && (
        <div className="bg-[#252525] border-t border-[#383838] px-3 py-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleRevisionPassMode}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
                isRevisionPassMode
                  ? 'bg-[#362020] border-red-500/80 text-red-200 font-semibold'
                  : 'bg-[#1d1d1d] hover:bg-[#2c2c2c] border-[#424242] text-gray-300'
              }`}
              title="Color-code screenplay elements by last edited date"
            >
              <History className={`w-3.5 h-3.5 ${isRevisionPassMode ? 'text-red-400' : 'text-gray-400'}`} />
              <span>Revision Pass: {isRevisionPassMode ? 'On' : 'Off'}</span>
            </button>

            {onOpenSpellCheck && (
              <button
                type="button"
                onClick={onOpenSpellCheck}
                className="flex items-center gap-1 px-2 py-0.5 rounded border bg-[#1d1d1d] hover:bg-[#2c2c2c] border-[#424242] text-gray-200 transition-colors whitespace-nowrap shrink-0 tabular-nums"
                title="Open Spell Check in Scene Inspector (This Scene or Entire Project)"
              >
                <SpellCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Spell Check
                  {proofreadCounts && proofreadCounts.spelling > 0
                    ? ` (${proofreadCounts.spelling})`
                    : ''}
                </span>
              </button>
            )}

            {onOpenGrammarCheck && (
              <button
                type="button"
                onClick={onOpenGrammarCheck}
                className="flex items-center gap-1 px-2 py-0.5 rounded border bg-[#1d1d1d] hover:bg-[#2c2c2c] border-[#424242] text-gray-200 transition-colors whitespace-nowrap shrink-0 tabular-nums"
                title="Open Grammar & Style Check in Scene Inspector (This Scene or Entire Project)"
              >
                <BookCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Grammar Check
                  {proofreadCounts && proofreadCounts.grammar > 0
                    ? ` (${proofreadCounts.grammar})`
                    : ''}
                </span>
              </button>
            )}

            {onOpenDraftRevisions && (
              <button
                type="button"
                onClick={onOpenDraftRevisions}
                className="flex items-center gap-1 px-2 py-0.5 rounded border bg-[#1d1d1d] hover:bg-[#2c2c2c] border-[#424242] text-gray-200 transition-colors whitespace-nowrap shrink-0"
                title="Inspect Draft Revisions & Lock Draft Milestones"
              >
                <Bookmark className="w-3.5 h-3.5 text-violet-400" />
                <span>Draft Revisions</span>
              </button>
            )}

            {onOpenCharacterInfo && (
              <button
                type="button"
                onClick={onOpenCharacterInfo}
                className="flex items-center gap-1 px-2 py-0.5 rounded border bg-[#1d1d1d] hover:bg-[#2c2c2c] border-[#424242] text-gray-200 transition-colors whitespace-nowrap shrink-0"
                title="View Character Info, Bios & Line Counts for This Scene or Entire Project"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Character Info</span>
              </button>
            )}

            {/* Color-Coded Legend */}
            <div
              className={`hidden xl:flex items-center gap-3 pl-2 border-l border-[#383838] transition-opacity ${
                isRevisionPassMode ? 'opacity-100' : 'opacity-70'
              }`}
              aria-label="Revision Pass Color Legend"
            >
              <span className="inline-flex items-center gap-1 text-gray-200 whitespace-nowrap">
                <span className="w-2 h-2 rounded-xs bg-red-500 shrink-0" />
                <span>
                  Today
                  {revisionPassCounts !== undefined && (
                    <span className="text-red-300 font-mono tabular-nums ml-1">
                      ({revisionPassCounts.today})
                    </span>
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-gray-200 whitespace-nowrap">
                <span className="w-2 h-2 rounded-xs bg-amber-400 shrink-0" />
                <span>
                  Week
                  {revisionPassCounts !== undefined && (
                    <span className="text-amber-300 font-mono tabular-nums ml-1">
                      ({revisionPassCounts.thisWeek})
                    </span>
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-gray-300 whitespace-nowrap">
                <span className="w-2 h-2 rounded-xs bg-gray-400 shrink-0" />
                <span>
                  Older
                  {revisionPassCounts !== undefined && (
                    <span className="text-gray-400 font-mono tabular-nums ml-1">
                      ({revisionPassCounts.older})
                    </span>
                  )}
                </span>
              </span>
            </div>
          </div>

          <span className="text-[11px] text-gray-400 hidden lg:inline">
            Shortcuts: Enter on empty line or Ctrl+/ · Alt+[Key] · Ctrl+B/I/U
          </span>
        </div>
      )}
    </div>
  );
};
