import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScreenplayElement,
  Scene,
  ElementType,
  StoryComment,
  StoryCharacter,
  Tag,
  ScriptFormatMode,
  StoryboardFrame,
  ScreenplayRevision,
  SceneContinuityAlert,
  ElementFormatting,
  EditorTypographySettings,
  CollaboratorProfile,
  CollaboratorSuggestion,
} from '../types/story';
import {
  buildLatestRevisionTimestampMap,
  getElementRevisionInfo,
  RevisionTier,
} from '../utils/revisionPass';
import {
  DEFAULT_EDITOR_TYPOGRAPHY,
  PAGE_LAYOUT_OPTIONS,
  SCREENPLAY_ELEMENTS_META,
  SHORTCUT_KEY_TO_ELEMENT_TYPE,
  buildElementTextStyle,
  estimateTextareaRows,
  getElementMeta,
  getEffectiveElementFormatting,
  resolveFlexJustifyClass,
} from '../utils/screenplayFormatting';
import {
  MessageSquare,
  Camera,
  Film,
  Columns,
  Image as ImageIcon,
  Plus,
  Mic,
  History,
  ShieldAlert,
  GitPullRequest,
} from 'lucide-react';

interface ScreenplayEditorProps {
  elements: ScreenplayElement[];
  scenes: Scene[];
  comments: StoryComment[];
  tags: Tag[];
  characters?: StoryCharacter[];
  storyboards?: StoryboardFrame[];
  revisions?: ScreenplayRevision[];
  isRevisionPassMode?: boolean;
  continuityAlertsByElementId?: Record<string, SceneContinuityAlert[]>;
  collaborators?: CollaboratorProfile[];
  collaboratorSuggestions?: CollaboratorSuggestion[];
  onInspectSuggestion?: (suggestionId: string) => void;
  focusedElementId?: string | null;
  selectedElementIds?: string[];
  onClearElementSelection?: () => void;
  authoringViewMode?: 'normal' | 'simple' | 'page';
  onInspectContinuityElement?: (elementId: string) => void;
  scriptFormat?: ScriptFormatMode;
  onChangeScriptFormat?: (format: ScriptFormatMode) => void;
  editorTypography?: EditorTypographySettings;
  elementsPopupTriggerNonce?: number;
  onAddStoryboardImageForScene?: (sceneId: string, imageUrl: string, description: string) => void;
  onUpdateElement: (id: string, text: string) => void;
  onUpdateElementType: (id: string, type: ElementType) => void;
  onUpdateElementFormatting: (id: string, patch: Partial<ElementFormatting>) => void;
  onUpdateElementCharacter?: (id: string, character: string) => void;
  onAddElementAfter: (afterId: string, type: ElementType, text?: string) => void;
  onDeleteElement: (id: string) => void;
  onSelectScene: (sceneId: string) => void;
  onFocusElement?: (element: ScreenplayElement) => void;
  onOpenComment: (commentId: string) => void;
  onAddCommentForElement: (elementId: string) => void;
  zoomLevel: number;
}

interface AVCueRow {
  rowId: string;
  sceneId: string;
  sceneNumber: number;
  sceneHeading: string;
  shotLabel: string;
  visualElements: ScreenplayElement[];
  audioElements: ScreenplayElement[];
  storyboardFrame?: StoryboardFrame;
}

interface ElementsPopupState {
  elementId: string;
  highlightedIndex: number;
  top: number;
  left: number;
}

const getPaperRevisionClasses = (tier: RevisionTier) => {
  switch (tier) {
    case 'today':
      return {
        wrapper: 'bg-red-100/85 ring-1 ring-red-400/85 rounded px-2 -mx-2',
        text: 'text-red-900',
        label: 'text-red-700',
      };
    case 'this_week':
      return {
        wrapper: 'bg-amber-100/85 ring-1 ring-amber-400/85 rounded px-2 -mx-2',
        text: 'text-amber-900',
        label: 'text-amber-800',
      };
    case 'older':
    default:
      return {
        wrapper: 'bg-stone-200/65 ring-1 ring-stone-300/90 rounded px-2 -mx-2',
        text: 'text-gray-500',
        label: 'text-gray-500',
      };
  }
};

const getAVRevisionClasses = (tier: RevisionTier) => {
  switch (tier) {
    case 'today':
      return 'bg-red-950/45 border-red-500/80 text-red-100';
    case 'this_week':
      return 'bg-amber-950/40 border-amber-400/80 text-amber-100';
    case 'older':
    default:
      return 'bg-neutral-800/65 border-neutral-600/70 text-gray-400';
  }
};

function resolveShortcutKeyFromEvent(e: React.KeyboardEvent): string | null {
  const upperKey = e.key.toUpperCase();
  if (SHORTCUT_KEY_TO_ELEMENT_TYPE[upperKey]) return upperKey;
  if (e.code.startsWith('Key')) {
    const letter = e.code.slice(3).toUpperCase();
    if (SHORTCUT_KEY_TO_ELEMENT_TYPE[letter]) return letter;
  }
  if (e.code.startsWith('Digit')) {
    const digit = e.code.slice(5);
    if (SHORTCUT_KEY_TO_ELEMENT_TYPE[digit]) return digit;
  }
  return null;
}

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  elements,
  scenes,
  comments,
  characters = [],
  storyboards = [],
  revisions = [],
  isRevisionPassMode = false,
  continuityAlertsByElementId = {},
  collaborators = [],
  collaboratorSuggestions = [],
  onInspectSuggestion,
  focusedElementId = null,
  selectedElementIds = [],
  onClearElementSelection,
  authoringViewMode = 'normal',
  onInspectContinuityElement,
  scriptFormat = 'single_column_film',
  onChangeScriptFormat,
  editorTypography = DEFAULT_EDITOR_TYPOGRAPHY,
  elementsPopupTriggerNonce = 0,
  onAddStoryboardImageForScene,
  onUpdateElement,
  onUpdateElementType,
  onUpdateElementFormatting,
  onUpdateElementCharacter,
  onAddElementAfter,
  onDeleteElement,
  onSelectScene,
  onFocusElement,
  onOpenComment,
  onAddCommentForElement,
  zoomLevel,
}) => {
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [elementsPopup, setElementsPopup] = useState<ElementsPopupState | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  const selectedElementIdSet = useMemo(
    () => new Set(selectedElementIds),
    [selectedElementIds]
  );

  const pageLayoutMeta =
    PAGE_LAYOUT_OPTIONS.find((opt) => opt.id === (editorTypography.pageLayout || 'letter')) ||
    PAGE_LAYOUT_OPTIONS[0];

  const collaboratorById = useMemo(() => {
    const map = new Map<string, CollaboratorProfile>();
    collaborators.forEach((c) => map.set(c.id, c));
    return map;
  }, [collaborators]);

  const pendingSuggestionsByElement = useMemo(() => {
    const map = new Map<string, CollaboratorSuggestion[]>();
    collaboratorSuggestions
      .filter((s) => s.status === 'pending' && s.elementId)
      .forEach((s) => {
        const list = map.get(s.elementId!) || [];
        list.push(s);
        map.set(s.elementId!, list);
      });
    return map;
  }, [collaboratorSuggestions]);

  const elementDomRefs = useRef<Map<string, HTMLElement>>(new Map());
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const popupContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusedElementId) return;
    setActiveElementId(focusedElementId);
    const node = elementDomRefs.current.get(focusedElementId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    requestAnimationFrame(() => {
      const inputNode = inputRefs.current.get(focusedElementId);
      if (inputNode && document.activeElement !== inputNode) {
        inputNode.focus();
      }
    });
  }, [focusedElementId]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const targetId = pendingFocusId;
    requestAnimationFrame(() => {
      const inputNode = inputRefs.current.get(targetId);
      if (inputNode) {
        inputNode.focus();
        const len = inputNode.value.length;
        try {
          inputNode.setSelectionRange(len, len);
        } catch {
          // ignore selection range errors on unsupported input states
        }
      }
      setPendingFocusId(null);
    });
  }, [pendingFocusId, elements]);

  const openElementsPopupForElement = (
    elementId: string,
    preferredType?: ElementType
  ) => {
    const wrapper = elementDomRefs.current.get(elementId);
    const rect = wrapper?.getBoundingClientRect();
    const popupWidth = 248;
    const popupEstimatedHeight = 420;

    let top = rect ? rect.bottom + 4 : 180;
    let left = rect ? rect.left + 20 : 260;

    if (top + popupEstimatedHeight > window.innerHeight - 16) {
      top = Math.max(12, rect ? rect.top - popupEstimatedHeight - 4 : 80);
    }
    if (left + popupWidth > window.innerWidth - 16) {
      left = Math.max(12, window.innerWidth - popupWidth - 20);
    }

    const currentEl = elements.find((el) => el.id === elementId);
    const targetType = preferredType || currentEl?.type || 'SCENE_HEADING';
    const matchedIdx = SCREENPLAY_ELEMENTS_META.findIndex((m) => m.type === targetType);

    setElementsPopup({
      elementId,
      highlightedIndex: matchedIdx >= 0 ? matchedIdx : 1,
      top,
      left,
    });
  };

  useEffect(() => {
    if (!elementsPopupTriggerNonce) return;
    const targetId =
      (activeElementId && elements.some((el) => el.id === activeElementId) && activeElementId) ||
      (focusedElementId && elements.some((el) => el.id === focusedElementId) && focusedElementId) ||
      elements[elements.length - 1]?.id;
    if (targetId) {
      openElementsPopupForElement(targetId);
    }
  }, [elementsPopupTriggerNonce]);

  useEffect(() => {
    if (!elementsPopup) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        popupContainerRef.current &&
        !popupContainerRef.current.contains(e.target as Node)
      ) {
        setElementsPopup(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [elementsPopup]);

  const revisionTimestampMap = useMemo(
    () => buildLatestRevisionTimestampMap(revisions),
    [revisions]
  );

  const sceneMap = useMemo(() => {
    const map = new Map<string, Scene>();
    scenes.forEach((s) => map.set(s.id, s));
    return map;
  }, [scenes]);

  const commentMap = useMemo(() => {
    const map = new Map<string, StoryComment[]>();
    comments.forEach((c) => {
      if (c.elementId) {
        const existing = map.get(c.elementId) || [];
        existing.push(c);
        map.set(c.elementId, existing);
      }
    });
    return map;
  }, [comments]);

  // Build synchronized Multi-Column A/V rows from live ScreenplayElement[] + StoryboardFrame[]
  const avRows: AVCueRow[] = useMemo(() => {
    const rows: AVCueRow[] = [];
    let currentScene: Scene | undefined = scenes[0];
    let currentRow: AVCueRow | null = null;
    let cueCounter = 1;

    const pushRowIfReady = () => {
      if (
        currentRow &&
        (currentRow.visualElements.length > 0 || currentRow.audioElements.length > 0)
      ) {
        rows.push(currentRow);
      }
    };

    elements.forEach((el) => {
      if (el.sceneId && sceneMap.has(el.sceneId)) {
        currentScene = sceneMap.get(el.sceneId)!;
      }
      const scId = currentScene?.id || el.sceneId || 'scene-1';
      const scNum = currentScene?.sceneNumber ?? 1;
      const scHeading = currentScene?.heading || 'SCENE';

      if (
        el.type === 'SCENE_HEADING' ||
        el.type === 'SHOT' ||
        el.type === 'NEW_ACT' ||
        el.type === 'END_OF_ACT' ||
        !currentRow
      ) {
        pushRowIfReady();
        const sceneBoards = storyboards.filter((sb) => sb.sceneId === scId);
        const matchedBoard =
          el.type === 'SHOT'
            ? sceneBoards.find((sb) => sb.shotNumber === el.shotNumber) || sceneBoards[0]
            : sceneBoards[0];

        currentRow = {
          rowId: `av-row-${el.id}`,
          sceneId: scId,
          sceneNumber: scNum,
          sceneHeading: scHeading,
          shotLabel:
            el.type === 'SHOT'
              ? `SHOT ${el.shotNumber || cueCounter}`
              : el.type === 'SCENE_HEADING'
              ? `SC ${scNum}`
              : el.type === 'NEW_ACT' || el.type === 'END_OF_ACT'
              ? 'ACT'
              : `CUE ${cueCounter}`,
          visualElements: [el],
          audioElements: [],
          storyboardFrame: matchedBoard,
        };
        cueCounter += 1;
        return;
      }

      if (
        el.type === 'CHARACTER' ||
        el.type === 'PARENTHETICAL' ||
        el.type === 'DIALOGUE' ||
        el.type === 'VOICE_OVER'
      ) {
        currentRow.audioElements.push(el);
      } else {
        if (currentRow.audioElements.length > 0) {
          pushRowIfReady();
          const sceneBoards = storyboards.filter((sb) => sb.sceneId === scId);
          currentRow = {
            rowId: `av-row-${el.id}`,
            sceneId: scId,
            sceneNumber: scNum,
            sceneHeading: scHeading,
            shotLabel: `CUE ${cueCounter}`,
            visualElements: [el],
            audioElements: [],
            storyboardFrame: sceneBoards[cueCounter % Math.max(1, sceneBoards.length)],
          };
          cueCounter += 1;
        } else {
          currentRow.visualElements.push(el);
        }
      }
    });

    pushRowIfReady();
    return rows;
  }, [elements, scenes, sceneMap, storyboards]);

  const handleUploadFrameImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    sceneId: string,
    shotLabel: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !onAddStoryboardImageForScene) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onAddStoryboardImageForScene(
          sceneId,
          reader.result,
          `${shotLabel} visual reference attached in A/V Script`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const applyElementTypeSelection = (elementId: string, nextType: ElementType) => {
    const target = elements.find((el) => el.id === elementId);
    const meta = getElementMeta(nextType);
    if (target && meta.uppercase && target.text) {
      onUpdateElement(elementId, target.text.toUpperCase());
    }
    onUpdateElementType(elementId, nextType);
    setElementsPopup(null);
    setPendingFocusId(elementId);
  };

  const handleFormattingShortcut = (
    e: React.KeyboardEvent,
    element: ScreenplayElement
  ): boolean => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.altKey) return false;
    const key = e.key.toLowerCase();
    const eff = getEffectiveElementFormatting(element, editorTypography);

    if (!e.shiftKey && key === 'b') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { bold: !eff.bold });
      return true;
    }
    if (!e.shiftKey && key === 'i') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { italic: !eff.italic });
      return true;
    }
    if (!e.shiftKey && key === 'u') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { underline: !eff.underline });
      return true;
    }
    if (e.shiftKey && key === 'x') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { strikethrough: !eff.strikethrough });
      return true;
    }
    if (e.shiftKey && key === 'h') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, {
        highlight: eff.highlight === 'none' ? 'yellow' : 'none',
      });
      return true;
    }
    if (e.shiftKey && key === 'l') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { align: 'left' });
      return true;
    }
    if (e.shiftKey && key === 'c') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { align: 'center' });
      return true;
    }
    if (e.shiftKey && key === 'r') {
      e.preventDefault();
      onUpdateElementFormatting(element.id, { align: 'right' });
      return true;
    }
    if (!e.shiftKey && (e.key === '/' || e.key === ';')) {
      e.preventDefault();
      openElementsPopupForElement(element.id);
      return true;
    }
    return false;
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    element: ScreenplayElement,
    index: number
  ) => {
    // 1. If the Elements popup is open for this element, handle navigation & single-key selection
    if (elementsPopup && elementsPopup.elementId === element.id) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setElementsPopup(null);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setElementsPopup((prev) =>
          prev
            ? {
                ...prev,
                highlightedIndex: (prev.highlightedIndex + 1) % SCREENPLAY_ELEMENTS_META.length,
              }
            : null
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setElementsPopup((prev) =>
          prev
            ? {
                ...prev,
                highlightedIndex:
                  (prev.highlightedIndex - 1 + SCREENPLAY_ELEMENTS_META.length) %
                  SCREENPLAY_ELEMENTS_META.length,
              }
            : null
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = SCREENPLAY_ELEMENTS_META[elementsPopup.highlightedIndex];
        if (chosen) {
          applyElementTypeSelection(element.id, chosen.type);
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const matchedKey = resolveShortcutKeyFromEvent(e);
        if (matchedKey && SHORTCUT_KEY_TO_ELEMENT_TYPE[matchedKey]) {
          e.preventDefault();
          applyElementTypeSelection(element.id, SHORTCUT_KEY_TO_ELEMENT_TYPE[matchedKey]);
          return;
        }
        if (e.key.length === 1) {
          // User started typing regular text instead of a mnemonic -> dismiss popup and allow typing
          setElementsPopup(null);
        }
      }
    }

    // 2. Formatting & Elements popup modifier shortcuts (Ctrl/Cmd + B/I/U/Shift+X/H/L/C/R, Ctrl+/)
    if (handleFormattingShortcut(e, element)) {
      return;
    }

    // 3. Direct Alt + [Key] element switching (matching [G], [S], [A], [C], ..., [4])
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const matchedKey = resolveShortcutKeyFromEvent(e);
      if (matchedKey && SHORTCUT_KEY_TO_ELEMENT_TYPE[matchedKey]) {
        e.preventDefault();
        applyElementTypeSelection(element.id, SHORTCUT_KEY_TO_ELEMENT_TYPE[matchedKey]);
        return;
      }
    }

    // 4. Typing "/" on an empty line opens the Elements composing popup
    if (
      e.key === '/' &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      element.text === ''
    ) {
      e.preventDefault();
      openElementsPopupForElement(element.id);
      return;
    }

    // 5. Enter key: on empty line -> open Elements popup; on non-empty line -> insert logical next element
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow explicit multi-line break within textarea
        return;
      }
      e.preventDefault();

      if (!element.text.trim()) {
        const defaultSuggested: ElementType =
          element.type === 'DIALOGUE' || element.type === 'VOICE_OVER'
            ? 'ACTION'
            : element.type;
        openElementsPopupForElement(element.id, defaultSuggested);
        return;
      }

      if (element.type === 'CHARACTER') {
        const isVOCue = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(element.text);
        onAddElementAfter(element.id, isVOCue ? 'VOICE_OVER' : 'DIALOGUE');
      } else if (element.type === 'PARENTHETICAL') {
        const prevEl = index > 0 ? elements[index - 1] : undefined;
        const isVOCue =
          prevEl?.type === 'CHARACTER' && /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(prevEl.text);
        onAddElementAfter(element.id, isVOCue ? 'VOICE_OVER' : 'DIALOGUE');
      } else {
        const nextType = getElementMeta(element.type).nextOnEnter;
        onAddElementAfter(element.id, nextType);
      }
      return;
    }

    // 6. Tab key cycles common script beat types cleanly
    if (e.key === 'Tab') {
      e.preventDefault();
      const targetTab = getElementMeta(element.type).tabTarget;
      if (targetTab) {
        applyElementTypeSelection(element.id, targetTab);
      }
      return;
    }

    // 7. Backspace on empty line removes element and focuses previous element
    if (e.key === 'Backspace' && element.text === '' && elements.length > 1) {
      e.preventDefault();
      setElementsPopup(null);
      const prevEl = index > 0 ? elements[index - 1] : elements[index + 1];
      if (prevEl) {
        setPendingFocusId(prevEl.id);
      }
      onDeleteElement(element.id);
    }
  };

  const resolvePrecedingSpeaker = (index: number): string | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      const prev = elements[i];
      if (prev.type === 'CHARACTER') {
        return prev.text.replace(/\(.*?\)/g, '').trim().toUpperCase() || undefined;
      }
      if (
        prev.type === 'SCENE_HEADING' ||
        prev.type === 'ACTION' ||
        prev.type === 'TRANSITION' ||
        prev.type === 'SHOT' ||
        prev.type === 'NEW_ACT' ||
        prev.type === 'END_OF_ACT'
      ) {
        break;
      }
    }
    return undefined;
  };

  const registerInputRef = (
    id: string,
    node: HTMLInputElement | HTMLTextAreaElement | null
  ) => {
    if (node) inputRefs.current.set(id, node);
    else inputRefs.current.delete(id);
  };

  return (
    <main className="flex-1 bg-[#1a1a1a] overflow-y-auto flex justify-center p-6 sm:p-10 relative">
      {/* Zoom container */}
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        className={`w-full transition-transform duration-150 ${
          scriptFormat === 'av_multi_column'
            ? 'max-w-[1060px]'
            : pageLayoutMeta.paperMaxWidthClass
        }`}
      >
        {scriptFormat === 'av_multi_column' ? (
          /* Mode B: Multi-Column A/V Script with Embedded Storyboard Plates */
          <div className="bg-[#1f1f1f] text-gray-200 rounded shadow-2xl border border-[#3a3a3a] overflow-hidden min-h-[900px]">
            <div className="px-6 py-4 bg-[#181818] border-b border-[#343434] flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-[#ff8000] tracking-wide">
                  MULTI-COLUMN A/V PRODUCTION SCRIPT
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Synchronized Video/Storyboard Plates & Audio Dialogue Columns sharing the unified project container.
                </p>
              </div>
              {onChangeScriptFormat && (
                <button
                  onClick={() => onChangeScriptFormat('single_column_film')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#343434] text-gray-200 rounded border border-[#444] text-xs whitespace-nowrap shrink-0"
                >
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch to Single-Column Film</span>
                </button>
              )}
            </div>

            {/* Table Column Header */}
            <div className="grid grid-cols-12 bg-[#151515] border-b border-[#343434] text-[11px] font-semibold text-gray-400 tracking-wide px-4 py-2.5">
              <div className="col-span-2">SHOT / CUE</div>
              <div className="col-span-5">VIDEO · CAMERA & EMBEDDED STORYBOARD</div>
              <div className="col-span-5">AUDIO · DIALOGUE & SFX</div>
            </div>

            <div className="divide-y divide-[#303030]">
              {avRows.map((row) => {
                const boardImg =
                  row.storyboardFrame?.drawingData || row.storyboardFrame?.imageUrl;
                return (
                  <div
                    key={row.rowId}
                    onClick={() => onSelectScene(row.sceneId)}
                    className="grid grid-cols-12 gap-4 px-4 py-3.5 hover:bg-[#242424] transition-colors items-start"
                  >
                    {/* Col 1: Shot / Scene Cue */}
                    <div className="col-span-2 space-y-1">
                      <div className="font-mono font-bold text-amber-400 text-xs tabular-nums">
                        {row.shotLabel}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Scene {row.sceneNumber}
                      </div>
                      {row.storyboardFrame && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {row.storyboardFrame.lens} · {row.storyboardFrame.durationSec}s
                        </div>
                      )}
                    </div>

                    {/* Col 2: Video Action + Embedded Storyboard Image */}
                    <div className="col-span-5 space-y-2.5 pr-2">
                      {boardImg ? (
                        <div className="relative rounded border border-[#3a3a3a] overflow-hidden bg-[#141414]">
                          <img
                            src={boardImg}
                            alt={row.storyboardFrame?.shotType || row.shotLabel}
                            referrerPolicy="no-referrer"
                            className="w-full h-32 object-cover"
                          />
                          <div className="px-2 py-1 bg-[#161616] border-t border-[#2e2e2e] flex items-center justify-between text-[10px] text-gray-300">
                            <span className="truncate font-mono">
                              {row.storyboardFrame?.shotType} · {row.storyboardFrame?.cameraMovement}
                            </span>
                          </div>
                        </div>
                      ) : (
                        onAddStoryboardImageForScene && (
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#181818] hover:bg-[#2c2c2c] border border-dashed border-[#444] rounded text-[11px] text-gray-400 hover:text-amber-300 cursor-pointer transition-colors">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Attach Storyboard Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleUploadFrameImage(e, row.sceneId, row.shotLabel)
                              }
                              className="hidden"
                            />
                          </label>
                        )
                      )}

                      <div className="space-y-1.5">
                        {row.visualElements.map((el) => {
                          const revInfo = isRevisionPassMode
                            ? getElementRevisionInfo(el, revisionTimestampMap)
                            : null;
                          const elContinuityAlerts = continuityAlertsByElementId[el.id] || [];
                          const eff = getEffectiveElementFormatting(el, editorTypography);
                          const inlineStyle = buildElementTextStyle(eff, 'dark');
                          const meta = getElementMeta(el.type);
                          const elIndex = elements.findIndex((item) => item.id === el.id);

                          return (
                            <div
                              key={el.id}
                              ref={(node) => {
                                if (node) elementDomRefs.current.set(el.id, node);
                                else elementDomRefs.current.delete(el.id);
                              }}
                              className="space-y-0.5"
                            >
                              {revInfo && (
                                <div className="flex items-center justify-between text-[10px] font-mono text-gray-300 px-1">
                                  <span>{revInfo.label}</span>
                                  <span className="text-gray-400">{revInfo.shortDateLabel}</span>
                                </div>
                              )}
                              {elContinuityAlerts.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInspectContinuityElement?.(el.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/75 border border-rose-500/70 text-[10px] font-sans text-rose-200 hover:bg-rose-900/75 whitespace-nowrap"
                                  title={elContinuityAlerts[0].explanation}
                                >
                                  <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span>
                                    Continuity ({elContinuityAlerts.length}): {elContinuityAlerts[0].itemName}
                                  </span>
                                </button>
                              )}
                              <textarea
                                ref={(node) => registerInputRef(el.id, node)}
                                rows={estimateTextareaRows(el.text, 40, eff.fontSizePt)}
                                value={el.text}
                                placeholder={meta.placeholder}
                                style={{
                                  ...inlineStyle,
                                  fontSize: `${Math.max(10, Math.round(eff.fontSizePt * 0.9))}pt`,
                                }}
                                onChange={(e) =>
                                  onUpdateElement(
                                    el.id,
                                    meta.uppercase ? e.target.value.toUpperCase() : e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, el, elIndex)}
                                onFocus={() => {
                                  setActiveElementId(el.id);
                                  onFocusElement?.(el);
                                  onSelectScene(row.sceneId);
                                }}
                                title={
                                  revInfo
                                    ? `Last edited: ${revInfo.label} (${revInfo.shortDateLabel})`
                                    : undefined
                                }
                                className={`w-full border rounded p-2 resize-none focus:outline-none focus:border-[#ff8000] ${
                                  revInfo
                                    ? getAVRevisionClasses(revInfo.tier)
                                    : el.type === 'SCENE_HEADING'
                                    ? 'bg-[#171717] text-amber-300 border-[#3f3528]'
                                    : el.type === 'SHOT'
                                    ? 'bg-[#171717] text-cyan-300 border-[#283c44]'
                                    : 'bg-[#171717] text-gray-200 border-[#333333]'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Col 3: Audio / Dialogue / SFX */}
                    <div className="col-span-5 space-y-1.5">
                      {row.audioElements.length === 0 ? (
                        <div className="flex items-center justify-between bg-[#171717] border border-[#2c2c2c] rounded p-2 text-[11px] text-gray-500">
                          <span>Visual / ambient sequence (no spoken cue)</span>
                          {row.visualElements[0] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddElementAfter(
                                  row.visualElements[row.visualElements.length - 1].id,
                                  'CHARACTER',
                                  'SPEAKER'
                                );
                              }}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 whitespace-nowrap shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Audio</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        row.audioElements.map((el) => {
                          const revInfo = isRevisionPassMode
                            ? getElementRevisionInfo(el, revisionTimestampMap)
                            : null;
                          const avRevBox = revInfo ? getAVRevisionClasses(revInfo.tier) : '';
                          const eff = getEffectiveElementFormatting(el, editorTypography);
                          const inlineStyle = buildElementTextStyle(eff, 'dark');
                          const meta = getElementMeta(el.type);
                          const elIndex = elements.findIndex((item) => item.id === el.id);

                          return (
                            <div
                              key={el.id}
                              ref={(node) => {
                                if (node) elementDomRefs.current.set(el.id, node);
                                else elementDomRefs.current.delete(el.id);
                              }}
                              title={
                                revInfo
                                  ? `Last edited: ${revInfo.label} (${revInfo.shortDateLabel})`
                                  : undefined
                              }
                            >
                              {el.type === 'CHARACTER' ? (
                                <input
                                  ref={(node) => registerInputRef(el.id, node)}
                                  type="text"
                                  value={el.text}
                                  placeholder={meta.placeholder}
                                  style={{
                                    ...inlineStyle,
                                    fontSize: `${Math.max(10, Math.round(eff.fontSizePt * 0.9))}pt`,
                                  }}
                                  onChange={(e) =>
                                    onUpdateElement(el.id, e.target.value.toUpperCase())
                                  }
                                  onKeyDown={(e) => handleKeyDown(e, el, elIndex)}
                                  onFocus={() => {
                                    setActiveElementId(el.id);
                                    onFocusElement?.(el);
                                  }}
                                  className={`w-full uppercase px-1.5 py-0.5 focus:outline-none rounded border ${
                                    revInfo
                                      ? avRevBox
                                      : 'bg-transparent border-transparent text-amber-300 focus:bg-[#171717]'
                                  }`}
                                />
                              ) : el.type === 'PARENTHETICAL' ? (
                                <input
                                  ref={(node) => registerInputRef(el.id, node)}
                                  type="text"
                                  value={el.text}
                                  placeholder={meta.placeholder}
                                  style={{
                                    ...inlineStyle,
                                    fontSize: `${Math.max(9, Math.round(eff.fontSizePt * 0.85))}pt`,
                                  }}
                                  onChange={(e) => onUpdateElement(el.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, el, elIndex)}
                                  onFocus={() => {
                                    setActiveElementId(el.id);
                                    onFocusElement?.(el);
                                  }}
                                  className={`w-full px-1.5 py-0.5 focus:outline-none rounded border ${
                                    revInfo
                                      ? avRevBox
                                      : 'bg-transparent border-transparent text-gray-400 focus:bg-[#171717]'
                                  }`}
                                />
                              ) : el.type === 'VOICE_OVER' ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2 px-1">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-violet-950/70 border border-violet-600/50 text-violet-300 font-mono text-[10px] font-semibold">
                                      <Mic className="w-2.5 h-2.5" />
                                      <span>VOICE-OVER (V.O.)</span>
                                    </span>
                                    {el.character && (
                                      <span className="text-[10px] font-mono text-violet-300/90">
                                        {el.character}
                                      </span>
                                    )}
                                  </div>
                                  <textarea
                                    ref={(node) => registerInputRef(el.id, node)}
                                    rows={estimateTextareaRows(el.text, 40, eff.fontSizePt)}
                                    value={el.text}
                                    placeholder={meta.placeholder}
                                    style={{
                                      ...inlineStyle,
                                      fontSize: `${Math.max(10, Math.round(eff.fontSizePt * 0.9))}pt`,
                                    }}
                                    onChange={(e) => onUpdateElement(el.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, el, elIndex)}
                                    onFocus={() => {
                                      setActiveElementId(el.id);
                                      onFocusElement?.(el);
                                    }}
                                    className={`w-full border rounded p-2 resize-none focus:outline-none focus:border-violet-400 ${
                                      revInfo
                                        ? avRevBox
                                        : 'bg-[#191624] border-violet-700/50 text-violet-100'
                                    }`}
                                  />
                                </div>
                              ) : (
                                <textarea
                                  ref={(node) => registerInputRef(el.id, node)}
                                  rows={estimateTextareaRows(el.text, 40, eff.fontSizePt)}
                                  value={el.text}
                                  placeholder={meta.placeholder}
                                  style={{
                                    ...inlineStyle,
                                    fontSize: `${Math.max(10, Math.round(eff.fontSizePt * 0.9))}pt`,
                                  }}
                                  onChange={(e) => onUpdateElement(el.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, el, elIndex)}
                                  onFocus={() => {
                                    setActiveElementId(el.id);
                                    onFocusElement?.(el);
                                  }}
                                  className={`w-full border rounded p-2 resize-none focus:outline-none focus:border-[#ff8000] ${
                                    revInfo
                                      ? avRevBox
                                      : 'bg-[#171717] border-[#333333] text-gray-100'
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : authoringViewMode === 'simple' ? (
          /* Mode C: Simple View (Distraction-Free Minimal Script Flow) */
          <div className="bg-[#1b1b1b] text-gray-100 rounded border border-[#2f2f2f] px-8 py-6 min-h-[820px] relative">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#2e2e2e] font-sans text-[11px] text-gray-400">
              <span className="uppercase tracking-wider font-semibold text-gray-300">
                Simple View · Distraction-Free Draft ({elements.length} elements)
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                Press Ctrl+/ or Enter on empty line for Elements
              </span>
            </div>
            <div className="space-y-2.5">
              {elements.map((element, idx) => {
                const eff = getEffectiveElementFormatting(element, editorTypography);
                const inlineStyle = buildElementTextStyle(eff, 'dark');
                const meta = getElementMeta(element.type);
                const isSelected = selectedElementIdSet.has(element.id);
                const isActive = activeElementId === element.id;
                const isScene = element.type === 'SCENE_HEADING';
                const isChar = element.type === 'CHARACTER';
                const isDial = element.type === 'DIALOGUE' || element.type === 'VOICE_OVER';

                return (
                  <div
                    key={element.id}
                    ref={(node) => {
                      if (node) elementDomRefs.current.set(element.id, node);
                      else elementDomRefs.current.delete(element.id);
                    }}
                    className={`relative rounded px-2 py-0.5 transition-colors ${
                      isSelected
                        ? 'ring-2 ring-sky-400/80 bg-sky-500/10'
                        : isActive
                        ? 'bg-white/[0.04]'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-7 pt-1 text-[10px] font-mono text-gray-500 shrink-0 select-none">
                        [{meta.shortcutKey}]
                      </span>
                      <textarea
                        ref={(node) => registerInputRef(element.id, node)}
                        rows={estimateTextareaRows(element.text, 64, eff.fontSizePt)}
                        value={element.text}
                        placeholder={meta.placeholder}
                        style={inlineStyle}
                        onChange={(e) =>
                          onUpdateElement(
                            element.id,
                            meta.uppercase ? e.target.value.toUpperCase() : e.target.value
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, element, idx)}
                        onFocus={() => {
                          if (selectedElementIds.length > 0) onClearElementSelection?.();
                          setActiveElementId(element.id);
                          onFocusElement?.(element);
                        }}
                        className={`w-full bg-transparent resize-none focus:outline-none ${
                          isScene
                            ? 'text-amber-300 font-bold tracking-wider uppercase pt-2 border-b border-[#333] pb-1'
                            : isChar
                            ? 'text-cyan-300 font-semibold uppercase text-center pt-1'
                            : isDial
                            ? 'text-gray-100 max-w-xl mx-auto block'
                            : 'text-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Mode A (Normal View) & Paginated (Page View) */
          (() => {
            const renderElementBlock = (element: ScreenplayElement, idx: number) => {
                const elementComments = commentMap.get(element.id) || [];
                const scene = element.sceneId ? sceneMap.get(element.sceneId) : undefined;
                const isActive = activeElementId === element.id;
                const isSelected = selectedElementIdSet.has(element.id);
                const isVoiceOver = element.type === 'VOICE_OVER';
                const inferredSpeaker = isVoiceOver
                  ? element.character || resolvePrecedingSpeaker(idx) || 'NARRATOR'
                  : undefined;

                const revInfo = isRevisionPassMode
                  ? getElementRevisionInfo(element, revisionTimestampMap)
                  : null;
                const paperRev = revInfo ? getPaperRevisionClasses(revInfo.tier) : null;
                const elContinuityAlerts = continuityAlertsByElementId[element.id] || [];
                const elSuggestions = pendingSuggestionsByElement.get(element.id) || [];
                const firstSugCollaborator =
                  elSuggestions.length > 0
                    ? collaboratorById.get(elSuggestions[0].collaboratorId)
                    : undefined;

                const meta = getElementMeta(element.type);
                const eff = getEffectiveElementFormatting(element, editorTypography);
                const textStyle = buildElementTextStyle(eff, 'paper');
                const justifyClass = resolveFlexJustifyClass(eff.align);
                const hasHighlight = eff.highlight !== 'none';
                const highlightPadClass = hasHighlight ? 'px-1.5 py-0.5 rounded-sm' : '';

                const commonInputHandlers = {
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    handleKeyDown(e, element, idx),
                  onFocus: () => {
                    if (selectedElementIds.length > 0) onClearElementSelection?.();
                    setActiveElementId(element.id);
                    onFocusElement?.(element);
                  },
                };

                return (
                  <div
                    key={element.id}
                    ref={(node) => {
                      if (node) elementDomRefs.current.set(element.id, node);
                      else elementDomRefs.current.delete(element.id);
                    }}
                    onMouseEnter={() => setHoveredElementId(element.id)}
                    onMouseLeave={() => setHoveredElementId(null)}
                    style={
                      !paperRev && elContinuityAlerts.length === 0 && firstSugCollaborator
                        ? {
                            outline: `2px solid ${firstSugCollaborator.color}`,
                            outlineOffset: '3px',
                            backgroundColor: `${firstSugCollaborator.color}12`,
                          }
                        : undefined
                    }
                    title={
                      revInfo
                        ? `Revision Pass: ${revInfo.label} (${revInfo.shortDateLabel})`
                        : elContinuityAlerts.length > 0
                        ? elContinuityAlerts[0].explanation
                        : firstSugCollaborator
                        ? `Non-destructive suggestion by ${firstSugCollaborator.name}: ${elSuggestions[0].proposedText}`
                        : undefined
                    }
                    className={`relative group transition-colors ${
                      isSelected
                        ? 'ring-2 ring-sky-500 bg-sky-100/70 rounded px-2 -mx-2'
                        : paperRev
                        ? paperRev.wrapper
                        : elContinuityAlerts.length > 0
                        ? 'bg-rose-50/70 ring-1 ring-rose-300/90 rounded px-2 -mx-2'
                        : firstSugCollaborator
                        ? 'rounded px-2 -mx-2'
                        : isActive
                        ? 'bg-amber-50/40 rounded'
                        : ''
                    }`}
                  >
                    {revInfo && paperRev && (
                      <div
                        className={`pointer-events-none flex justify-end pt-0.5 font-sans text-[10px] font-semibold tracking-tight tabular-nums ${paperRev.label}`}
                      >
                        <span>
                          {revInfo.label} · {revInfo.shortDateLabel}
                        </span>
                      </div>
                    )}
                    {elSuggestions.length > 0 && firstSugCollaborator && (
                      <div className="flex justify-end pt-1 font-sans">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectSuggestion?.(elSuggestions[0].id);
                          }}
                          style={{
                            borderColor: firstSugCollaborator.color,
                            color: firstSugCollaborator.color,
                            backgroundColor: '#ffffff',
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap shadow-xs hover:opacity-90 transition-opacity"
                          title={`Non-destructive ${elSuggestions[0].kind.replace('_', ' ')} from ${firstSugCollaborator.name}: "${elSuggestions[0].proposedText}"`}
                        >
                          <GitPullRequest className="w-3 h-3 shrink-0" />
                          <span>
                            {firstSugCollaborator.name}: {elSuggestions.length}{' '}
                            {elSuggestions.length === 1 ? 'Suggestion' : 'Suggestions'}
                          </span>
                        </button>
                      </div>
                    )}
                    {elContinuityAlerts.length > 0 && (
                      <div className="flex justify-end pt-1 font-sans">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectContinuityElement?.(element.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 border border-rose-300 text-[10px] font-semibold text-rose-900 whitespace-nowrap transition-colors"
                          title={elContinuityAlerts.map((a) => a.explanation).join(' | ')}
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-700 shrink-0" />
                          <span>
                            Continuity {elContinuityAlerts[0].severity === 'conflict' ? 'Conflict' : 'Warning'} · {elContinuityAlerts[0].itemName}
                            {elContinuityAlerts.length > 1 ? ` (+${elContinuityAlerts.length - 1})` : ''}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Left Gutter Badges & Quick Elements Popup Trigger */}
                    {element.type === 'SHOT' && (
                      <div className="absolute -left-14 top-1 flex items-center space-x-1 text-gray-700 font-mono text-[11px] select-none font-bold">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>{element.shotNumber || '1'}.</span>
                      </div>
                    )}
                    {isVoiceOver && (
                      <div
                        title="Voice-over (V.O.) narration or internal monologue"
                        className="absolute -left-14 top-1 flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-violet-100 border border-violet-300 text-violet-800 font-mono text-[10px] font-bold select-none"
                      >
                        <Mic className="w-2.5 h-2.5" />
                        <span>V.O.</span>
                      </div>
                    )}

                    {/* Active/Hovered Element Shortcut Badge [Key] (Click to open Elements menu) */}
                    {(isActive || hoveredElementId === element.id) && (
                      <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center space-x-1 select-none z-10">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                            openElementsPopupForElement(element.id);
                          }}
                          title={`${meta.label} [${meta.shortcutKey}] — Click or press Ctrl+/ to switch element`}
                          className={`px-1 py-0.5 rounded text-[10px] font-mono font-bold border shadow-xs transition-colors ${
                            isActive
                              ? 'bg-[#e6f6ff] border-[#5cc2ff] text-sky-900'
                              : 'bg-stone-100 hover:bg-amber-100 border-stone-300 text-stone-700'
                          }`}
                        >
                          [{meta.shortcutKey}]
                        </button>
                        {hoveredElementId === element.id && (
                          <button
                            type="button"
                            onClick={() => onAddCommentForElement(element.id)}
                            title="Add Review Note / Comment"
                            className="p-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 shadow border border-amber-300"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Element Body by Type */}
                    {element.type === 'SCENE_HEADING' ? (
                      <div
                        onClick={() => scene && onSelectScene(scene.id)}
                        className="flex items-baseline justify-between pt-6 pb-2 border-b border-gray-300/70 cursor-pointer"
                      >
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                            if (scene) onSelectScene(scene.id);
                          }}
                          className={`tracking-wider uppercase w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                        <span className="font-mono text-blue-600 font-medium text-xs ml-4 flex-shrink-0 select-none tabular-nums">
                          {scene ? scene.timecode : '00:00:00'}
                        </span>
                      </div>
                    ) : element.type === 'CHARACTER' ? (
                      <div className={`flex ${justifyClass} pt-3 pb-0.5`}>
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          {...commonInputHandlers}
                          className={`uppercase w-80 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : element.type === 'PARENTHETICAL' ? (
                      <div className={`flex ${justifyClass} py-0.5`}>
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          {...commonInputHandlers}
                          className={`w-80 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-gray-800'
                          }`}
                        />
                      </div>
                    ) : isVoiceOver ? (
                      <div className={`flex flex-col ${
                        eff.align === 'left'
                          ? 'items-start'
                          : eff.align === 'right'
                          ? 'items-end'
                          : 'items-center'
                      } py-1`}>
                        <div className="w-[420px] max-w-full border-l-2 border-violet-500/80 pl-3 py-0.5 bg-violet-50/40 rounded-r">
                          <div className="flex items-center justify-between gap-2 mb-0.5 font-sans">
                            <span className="text-[10px] font-mono font-bold tracking-wide text-violet-800 uppercase">
                              {inferredSpeaker} (V.O.)
                            </span>
                            {(isActive || !resolvePrecedingSpeaker(idx)) && onUpdateElementCharacter && (
                              <select
                                value={element.character || resolvePrecedingSpeaker(idx) || ''}
                                onChange={(e) => onUpdateElementCharacter(element.id, e.target.value)}
                                title="Assign Voice-over (V.O.) speaker for Character Breakdown & Stripboard"
                                className="text-[10px] font-sans bg-white/90 text-violet-900 border border-violet-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-violet-600 cursor-pointer"
                              >
                                <option value="">Auto ({resolvePrecedingSpeaker(idx) || 'NARRATOR'})</option>
                                {characters.map((c) => (
                                  <option key={c.name} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                                <option value="NARRATOR">NARRATOR</option>
                              </select>
                            )}
                          </div>
                          <textarea
                            ref={(node) => registerInputRef(element.id, node)}
                            rows={estimateTextareaRows(element.text, 38, eff.fontSizePt)}
                            value={element.text}
                            placeholder={meta.placeholder}
                            style={textStyle}
                            onChange={(e) => onUpdateElement(element.id, e.target.value)}
                            {...commonInputHandlers}
                            className={`w-full bg-transparent resize-none border-b border-transparent focus:border-violet-500 focus:outline-none ${highlightPadClass} ${
                              paperRev ? paperRev.text : 'text-gray-900'
                            }`}
                          />
                        </div>
                      </div>
                    ) : element.type === 'DIALOGUE' ? (
                      <div className={`flex ${justifyClass} py-0.5`}>
                        <textarea
                          ref={(node) => registerInputRef(element.id, node)}
                          rows={estimateTextareaRows(element.text, 38, eff.fontSizePt)}
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          {...commonInputHandlers}
                          className={`${
                            eff.align === 'left' ? 'w-full max-w-[480px]' : 'w-[420px] max-w-full'
                          } bg-transparent resize-none border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : element.type === 'TRANSITION' ? (
                      <div className={`flex ${justifyClass} py-2`}>
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          {...commonInputHandlers}
                          className={`uppercase w-72 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : element.type === 'SHOT' ? (
                      <div className="flex items-center pl-6 py-1 border-b border-gray-300/60">
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          {...commonInputHandlers}
                          className={`tracking-wide uppercase w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-gray-800'
                          }`}
                        />
                      </div>
                    ) : element.type === 'NEW_ACT' || element.type === 'END_OF_ACT' ? (
                      <div className={`flex ${justifyClass} py-4 border-y border-stone-300/70 my-2`}>
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          {...commonInputHandlers}
                          className={`tracking-widest uppercase w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : element.type === 'SEQUENCE' ? (
                      <div className="pt-4 pb-1 border-b border-stone-300/80">
                        <input
                          ref={(node) => registerInputRef(element.id, node)}
                          type="text"
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          {...commonInputHandlers}
                          className={`tracking-wider uppercase w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-stone-900'
                          }`}
                        />
                      </div>
                    ) : element.type === 'CAST_LIST' ? (
                      <div className="py-1.5 px-3 bg-stone-100/70 border border-stone-300/80 rounded">
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-stone-500 mb-0.5">
                          Cast List
                        </div>
                        <textarea
                          ref={(node) => registerInputRef(element.id, node)}
                          rows={estimateTextareaRows(element.text, 58, eff.fontSizePt)}
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) =>
                            onUpdateElement(element.id, e.target.value.toUpperCase())
                          }
                          {...commonInputHandlers}
                          className={`uppercase w-full bg-transparent resize-none border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-stone-900'
                          }`}
                        />
                      </div>
                    ) : element.type === 'SUMMARY' ? (
                      <div className="py-1.5 pl-4 border-l-2 border-amber-500/70 bg-amber-50/30 rounded-r">
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-amber-800/80 mb-0.5">
                          Summary
                        </div>
                        <textarea
                          ref={(node) => registerInputRef(element.id, node)}
                          rows={estimateTextareaRows(element.text, 58, eff.fontSizePt)}
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          {...commonInputHandlers}
                          className={`w-full bg-transparent resize-none border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-stone-800'
                          }`}
                        />
                      </div>
                    ) : element.type === 'OUTLINE_1' ||
                      element.type === 'OUTLINE_2' ||
                      element.type === 'OUTLINE_3' ? (
                      <div
                        className={`py-1 ${
                          element.type === 'OUTLINE_1'
                            ? 'pl-0 border-b border-stone-300/60 pt-2'
                            : element.type === 'OUTLINE_2'
                            ? 'pl-6'
                            : 'pl-12'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-stone-400 pt-1 shrink-0 select-none">
                            {element.type === 'OUTLINE_1'
                              ? 'O1'
                              : element.type === 'OUTLINE_2'
                              ? 'O2'
                              : 'O3'}
                          </span>
                          <textarea
                            ref={(node) => registerInputRef(element.id, node)}
                            rows={estimateTextareaRows(element.text, 56, eff.fontSizePt)}
                            value={element.text}
                            placeholder={meta.placeholder}
                            style={textStyle}
                            onChange={(e) => onUpdateElement(element.id, e.target.value)}
                            {...commonInputHandlers}
                            className={`w-full bg-transparent resize-none border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                              paperRev ? paperRev.text : 'text-stone-900'
                            }`}
                          />
                        </div>
                      </div>
                    ) : element.type === 'NOTE' ? (
                      <div className="py-1.5 px-3 bg-sky-50/75 border border-sky-300/80 rounded">
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-sky-800 mb-0.5">
                          Script Note
                        </div>
                        <textarea
                          ref={(node) => registerInputRef(element.id, node)}
                          rows={estimateTextareaRows(element.text, 58, eff.fontSizePt)}
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          {...commonInputHandlers}
                          className={`w-full bg-transparent resize-none border-b border-transparent focus:border-sky-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-sky-950'
                          }`}
                        />
                      </div>
                    ) : (
                      /* ACTION / GENERAL */
                      <div className="py-1">
                        <textarea
                          ref={(node) => registerInputRef(element.id, node)}
                          rows={estimateTextareaRows(element.text, 62, eff.fontSizePt)}
                          value={element.text}
                          placeholder={meta.placeholder}
                          style={textStyle}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          {...commonInputHandlers}
                          className={`w-full bg-transparent resize-none border-b border-transparent focus:border-amber-500 focus:outline-none ${highlightPadClass} ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    )}

                    {/* Yellow Sticky Notes on Right Margin */}
                    {elementComments.length > 0 && (
                      <div className="absolute -right-32 top-0 flex flex-col space-y-1 z-10 w-44">
                        {elementComments.map((comm) => (
                          <div
                            key={comm.id}
                            onClick={() => onOpenComment(comm.id)}
                            className="bg-[#fef08a] hover:bg-[#fde047] text-gray-900 p-2 rounded shadow-lg border border-amber-400 cursor-pointer text-[11px] font-sans transition-transform hover:scale-105"
                          >
                            <div className="flex items-center justify-between font-bold text-[10px] text-amber-900 border-b border-amber-300/80 pb-0.5 mb-1">
                              <span>{comm.author}</span>
                              <span className="text-[9px] text-gray-600">{comm.createdAt}</span>
                            </div>
                            <p className="line-clamp-2 italic leading-tight text-gray-800">
                              "{comm.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
            };

            const quickInsertBar = (
              <div className="mt-12 pt-6 border-t border-gray-300 flex flex-wrap items-center justify-center gap-2 font-sans select-none">
                <span className="text-xs text-gray-500">Insert element:</span>
                <button
                  onClick={() =>
                    onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'SCENE_HEADING')
                  }
                  className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
                >
                  + [S] Scene Heading
                </button>
                <button
                  onClick={() =>
                    onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'ACTION')
                  }
                  className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
                >
                  + [A] Action
                </button>
                <button
                  onClick={() =>
                    onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'CHARACTER')
                  }
                  className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
                >
                  + [C] Character
                </button>
                <button
                  onClick={() =>
                    onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'DIALOGUE')
                  }
                  className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
                >
                  + [D] Dialogue
                </button>
                <button
                  onClick={() =>
                    onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'VOICE_OVER')
                  }
                  className="px-2.5 py-1 bg-violet-100 hover:bg-violet-200 text-violet-900 rounded text-xs font-semibold border border-violet-300 transition-colors"
                >
                  + [V] Voice-over
                </button>
                <button
                  onClick={() => {
                    const lastId = elements[elements.length - 1]?.id;
                    if (lastId) openElementsPopupForElement(lastId);
                  }}
                  className="px-2.5 py-1 bg-[#e6f6ff] hover:bg-[#cdeeff] text-sky-900 rounded text-xs font-semibold border border-[#5cc2ff] transition-colors"
                >
                  All Elements (Ctrl+/)
                </button>
              </div>
            );

            if (authoringViewMode === 'page') {
              // Chunk elements into discrete screenplay pages (~44 weighted lines per page)
              const pages: { pageNumber: number; items: { element: ScreenplayElement; idx: number }[] }[] = [];
              let currentItems: { element: ScreenplayElement; idx: number }[] = [];
              let currentLines = 0;
              const MAX_LINES_PER_PAGE = 44;

              elements.forEach((el, idx) => {
                const eff = getEffectiveElementFormatting(el, editorTypography);
                const widthCols = el.type === 'DIALOGUE' || el.type === 'VOICE_OVER' ? 38 : 60;
                const elLines =
                  estimateTextareaRows(el.text, widthCols, eff.fontSizePt) +
                  (el.type === 'SCENE_HEADING' ? 3 : el.type === 'CHARACTER' ? 2 : 1);
                if (currentItems.length > 0 && currentLines + elLines > MAX_LINES_PER_PAGE) {
                  pages.push({ pageNumber: pages.length + 1, items: currentItems });
                  currentItems = [];
                  currentLines = 0;
                }
                currentItems.push({ element: el, idx });
                currentLines += elLines;
              });
              if (currentItems.length > 0 || pages.length === 0) {
                pages.push({ pageNumber: pages.length + 1, items: currentItems });
              }

              return (
                <div className="space-y-8 pb-12">
                  {pages.map((pg, pageIdx) => (
                    <div
                      key={`script-page-${pg.pageNumber}`}
                      className={`bg-[#fbf9f4] text-black ${pageLayoutMeta.paperPaddingClass} rounded shadow-2xl min-h-[1056px] relative border border-[#dcd4c0] flex flex-col justify-between`}
                    >
                      <div>
                        {/* Physical Page Number Header */}
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-300/50 font-sans">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                            {pageIdx === 0
                              ? `PAGE VIEW • ${pageLayoutMeta.shortLabel.toUpperCase()}`
                              : `PAGE ${pg.pageNumber} OF ${pages.length}`}
                          </span>
                          <span className="font-courier text-xs font-bold text-gray-600 tabular-nums">
                            {pg.pageNumber}.
                          </span>
                        </div>

                        <div className="space-y-3">
                          {pg.items.map(({ element, idx }) => renderElementBlock(element, idx))}
                        </div>
                      </div>

                      {pageIdx === pages.length - 1 ? (
                        quickInsertBar
                      ) : (
                        <div className="pt-8 text-right font-courier text-[11px] text-gray-400 select-none">
                          (CONTINUED)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div
                className={`bg-[#fbf9f4] text-black ${pageLayoutMeta.paperPaddingClass} rounded shadow-2xl min-h-[1150px] relative border border-[#e4ded0]`}
              >
                {/* Header Strip */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-300/60 mb-8 font-sans gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold tabular-nums">
                      SCREENCRAFT SCREENPLAY MASTER • {editorTypography.fontFamily.toUpperCase()} ·{' '}
                      {editorTypography.fontSizePt} PT · {editorTypography.lineSpacing}× ·{' '}
                      {pageLayoutMeta.shortLabel.toUpperCase()}
                    </span>
                    {isRevisionPassMode && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 whitespace-nowrap">
                        <History className="w-3 h-3" />
                        <span>Revision Pass Active</span>
                      </span>
                    )}
                  </div>
                  {onChangeScriptFormat && (
                    <button
                      onClick={() => onChangeScriptFormat('av_multi_column')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ece7db] hover:bg-[#e2dac8] text-gray-800 text-[11px] font-semibold border border-gray-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Columns className="w-3 h-3 text-amber-700" />
                      <span>A/V Multi-Column View</span>
                    </button>
                  )}
                </div>

                {/* Script Elements Flow */}
                <div className="space-y-3">
                  {elements.map((element, idx) => renderElementBlock(element, idx))}
                </div>

                {quickInsertBar}
              </div>
            );
          })()
        )}
      </div>

      {/* Floating "Elements" Shortcut Menu matching Reference Screenshot */}
      {elementsPopup && (
        <div
          ref={popupContainerRef}
          tabIndex={-1}
          role="listbox"
          aria-label="Elements composing shortcut menu"
          style={{ top: elementsPopup.top, left: elementsPopup.left }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setPendingFocusId(elementsPopup.elementId);
              setElementsPopup(null);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setElementsPopup((prev) =>
                prev
                  ? {
                      ...prev,
                      highlightedIndex:
                        (prev.highlightedIndex + 1) % SCREENPLAY_ELEMENTS_META.length,
                    }
                  : null
              );
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setElementsPopup((prev) =>
                prev
                  ? {
                      ...prev,
                      highlightedIndex:
                        (prev.highlightedIndex - 1 + SCREENPLAY_ELEMENTS_META.length) %
                        SCREENPLAY_ELEMENTS_META.length,
                    }
                  : null
              );
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const chosen = SCREENPLAY_ELEMENTS_META[elementsPopup.highlightedIndex];
              if (chosen) {
                applyElementTypeSelection(elementsPopup.elementId, chosen.type);
              }
            } else {
              const matchedKey = resolveShortcutKeyFromEvent(e);
              if (matchedKey && SHORTCUT_KEY_TO_ELEMENT_TYPE[matchedKey]) {
                e.preventDefault();
                applyElementTypeSelection(
                  elementsPopup.elementId,
                  SHORTCUT_KEY_TO_ELEMENT_TYPE[matchedKey]
                );
              }
            }
          }}
          className="fixed z-50 w-[248px] bg-white border border-neutral-300 rounded-md shadow-2xl overflow-hidden text-black select-none"
        >
          {/* Header Bar */}
          <div className="bg-[#f3f4f6] border-b border-neutral-200 px-3 py-1.5 flex items-center justify-between text-[12px] font-sans text-neutral-500">
            <span className="font-medium">Elements</span>
            <span className="text-[10px] text-neutral-400 font-mono">Key / ↑↓ / Enter</span>
          </div>

          {/* Monospace Mnemonic List */}
          <div className="py-1 max-h-[400px] overflow-y-auto font-mono text-[13px] leading-snug">
            {SCREENPLAY_ELEMENTS_META.map((meta, idx) => {
              const isHighlighted = idx === elementsPopup.highlightedIndex;
              return (
                <button
                  key={meta.type}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() =>
                    setElementsPopup((prev) =>
                      prev ? { ...prev, highlightedIndex: idx } : null
                    )
                  }
                  onClick={() =>
                    applyElementTypeSelection(elementsPopup.elementId, meta.type)
                  }
                  className={`w-full text-left px-2.5 py-0.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-[#67cbff] text-black'
                      : 'bg-white text-black hover:bg-[#e5f5ff]'
                  }`}
                >
                  <span>
                    <span className="inline-block w-9">[{meta.shortcutKey}]</span>
                    <span>{meta.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
};
