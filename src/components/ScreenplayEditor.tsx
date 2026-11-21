import React, { useMemo, useState } from 'react';
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
} from '../types/story';
import {
  buildLatestRevisionTimestampMap,
  getElementRevisionInfo,
  RevisionTier,
} from '../utils/revisionPass';
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
  focusedElementId?: string | null;
  onInspectContinuityElement?: (elementId: string) => void;
  scriptFormat?: ScriptFormatMode;
  onChangeScriptFormat?: (format: ScriptFormatMode) => void;
  onAddStoryboardImageForScene?: (sceneId: string, imageUrl: string, description: string) => void;
  onUpdateElement: (id: string, text: string) => void;
  onUpdateElementType: (id: string, type: ElementType) => void;
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

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  elements,
  scenes,
  comments,
  characters = [],
  storyboards = [],
  revisions = [],
  isRevisionPassMode = false,
  continuityAlertsByElementId = {},
  focusedElementId = null,
  onInspectContinuityElement,
  scriptFormat = 'single_column_film',
  onChangeScriptFormat,
  onAddStoryboardImageForScene,
  onUpdateElement,
  onUpdateElementType,
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
  const elementDomRefs = React.useRef<Map<string, HTMLElement>>(new Map());

  React.useEffect(() => {
    if (!focusedElementId) return;
    setActiveElementId(focusedElementId);
    const node = elementDomRefs.current.get(focusedElementId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedElementId]);

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

      if (el.type === 'SCENE_HEADING' || el.type === 'SHOT' || !currentRow) {
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
        // Start a fresh visual+audio beat if current row already has audio dialogue
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

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    element: ScreenplayElement,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (element.type === 'CHARACTER') {
        const isVOCue = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(element.text);
        onAddElementAfter(element.id, isVOCue ? 'VOICE_OVER' : 'DIALOGUE');
      } else if (element.type === 'DIALOGUE') {
        if (!element.text.trim()) {
          onUpdateElementType(element.id, 'ACTION');
        } else {
          onAddElementAfter(element.id, 'CHARACTER');
        }
      } else if (element.type === 'VOICE_OVER') {
        if (!element.text.trim()) {
          onUpdateElementType(element.id, 'ACTION');
        } else {
          onAddElementAfter(element.id, 'CHARACTER');
        }
      } else if (element.type === 'PARENTHETICAL') {
        const prevEl = index > 0 ? elements[index - 1] : undefined;
        const isVOCue = prevEl?.type === 'CHARACTER' && /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(prevEl.text);
        onAddElementAfter(element.id, isVOCue ? 'VOICE_OVER' : 'DIALOGUE');
      } else if (element.type === 'SCENE_HEADING') {
        onAddElementAfter(element.id, 'ACTION');
      } else {
        onAddElementAfter(element.id, 'ACTION');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (element.type === 'DIALOGUE') {
        onUpdateElementType(element.id, 'VOICE_OVER');
      } else if (element.type === 'VOICE_OVER') {
        onUpdateElementType(element.id, 'PARENTHETICAL');
      } else if (element.type === 'PARENTHETICAL') {
        onUpdateElementType(element.id, 'DIALOGUE');
      } else if (element.type === 'ACTION') {
        onUpdateElementType(element.id, 'CHARACTER');
      } else if (element.type === 'CHARACTER') {
        onUpdateElementType(element.id, 'DIALOGUE');
      }
    } else if (e.key === 'Backspace' && element.text === '' && elements.length > 1) {
      e.preventDefault();
      onDeleteElement(element.id);
    }
  };

  const resolvePrecedingSpeaker = (index: number): string | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      const prev = elements[i];
      if (prev.type === 'CHARACTER') {
        return prev.text.replace(/\(.*?\)/g, '').trim().toUpperCase() || undefined;
      }
      if (prev.type === 'SCENE_HEADING' || prev.type === 'ACTION' || prev.type === 'TRANSITION' || prev.type === 'SHOT') {
        break;
      }
    }
    return undefined;
  };

  return (
    <main className="flex-1 bg-[#1a1a1a] overflow-y-auto flex justify-center p-6 sm:p-10 relative">
      {/* Zoom container */}
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        className={`w-full transition-transform duration-150 ${
          scriptFormat === 'av_multi_column' ? 'max-w-[1060px]' : 'max-w-[850px]'
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
                                rows={Math.max(1, Math.ceil(el.text.length / 42))}
                                value={el.text}
                                onChange={(e) =>
                                  onUpdateElement(
                                    el.id,
                                    el.type === 'SCENE_HEADING' || el.type === 'SHOT'
                                      ? e.target.value.toUpperCase()
                                      : e.target.value
                                  )
                                }
                                onFocus={() => {
                                  setActiveElementId(el.id);
                                  onSelectScene(row.sceneId);
                                }}
                                title={
                                  revInfo
                                    ? `Last edited: ${revInfo.label} (${revInfo.shortDateLabel})`
                                    : undefined
                                }
                                className={`w-full border rounded p-2 text-xs leading-relaxed resize-none focus:outline-none focus:border-[#ff8000] ${
                                  revInfo
                                    ? `${getAVRevisionClasses(revInfo.tier)} ${
                                        el.type === 'SCENE_HEADING' || el.type === 'SHOT'
                                          ? 'font-bold'
                                          : ''
                                      }`
                                    : el.type === 'SCENE_HEADING'
                                    ? 'bg-[#171717] font-bold text-amber-300 border-[#3f3528]'
                                    : el.type === 'SHOT'
                                    ? 'bg-[#171717] font-semibold text-cyan-300 border-[#283c44]'
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
                          return (
                            <div
                              key={el.id}
                              title={
                                revInfo
                                  ? `Last edited: ${revInfo.label} (${revInfo.shortDateLabel})`
                                  : undefined
                              }
                            >
                              {el.type === 'CHARACTER' ? (
                                <input
                                  type="text"
                                  value={el.text}
                                  onChange={(e) =>
                                    onUpdateElement(el.id, e.target.value.toUpperCase())
                                  }
                                  onFocus={() => {
                                    setActiveElementId(el.id);
                                    onFocusElement?.(el);
                                  }}
                                  className={`w-full font-bold uppercase text-xs px-1.5 py-0.5 focus:outline-none rounded border ${
                                    revInfo
                                      ? avRevBox
                                      : 'bg-transparent border-transparent text-amber-300 focus:bg-[#171717]'
                                  }`}
                                />
                              ) : el.type === 'PARENTHETICAL' ? (
                                <input
                                  type="text"
                                  value={el.text}
                                  onChange={(e) => onUpdateElement(el.id, e.target.value)}
                                  onFocus={() => {
                                    setActiveElementId(el.id);
                                    onFocusElement?.(el);
                                  }}
                                  className={`w-full italic text-[11px] px-1.5 py-0.5 focus:outline-none rounded border ${
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
                                    rows={Math.max(1, Math.ceil(el.text.length / 42))}
                                    value={el.text}
                                    placeholder="Enter voice-over narration or internal monologue..."
                                    onChange={(e) => onUpdateElement(el.id, e.target.value)}
                                    onFocus={() => {
                                      setActiveElementId(el.id);
                                      onFocusElement?.(el);
                                    }}
                                    className={`w-full border rounded p-2 text-xs italic leading-relaxed resize-none focus:outline-none focus:border-violet-400 ${
                                      revInfo
                                        ? avRevBox
                                        : 'bg-[#191624] border-violet-700/50 text-violet-100'
                                    }`}
                                  />
                                </div>
                              ) : (
                                <textarea
                                  rows={Math.max(1, Math.ceil(el.text.length / 42))}
                                  value={el.text}
                                  onChange={(e) => onUpdateElement(el.id, e.target.value)}
                                  onFocus={() => {
                                    setActiveElementId(el.id);
                                    onFocusElement?.(el);
                                  }}
                                  className={`w-full border rounded p-2 text-xs leading-relaxed resize-none focus:outline-none focus:border-[#ff8000] ${
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
        ) : (
          /* Mode A: Screenplay Paper (Single-Column 12pt Courier) */
          <div className="bg-[#fbf9f4] text-black font-courier text-[13px] leading-[1.3] px-16 py-16 rounded shadow-2xl min-h-[1150px] relative border border-[#e4ded0]">
            {/* Header Strip */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-300/60 mb-8 font-sans gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                  SCREENCRAFT SCREENPLAY MASTER • INDUSTRY STANDARD 12PT COURIER
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
              {elements.map((element, idx) => {
                const elementComments = commentMap.get(element.id) || [];
                const scene = element.sceneId ? sceneMap.get(element.sceneId) : undefined;
                const isSceneHeading = element.type === 'SCENE_HEADING';
                const isCharacter = element.type === 'CHARACTER';
                const isDialogue = element.type === 'DIALOGUE';
                const isVoiceOver = element.type === 'VOICE_OVER';
                const isParenthetical = element.type === 'PARENTHETICAL';
                const isTransition = element.type === 'TRANSITION';
                const isShot = element.type === 'SHOT';
                const isActive = activeElementId === element.id;
                const inferredSpeaker = isVoiceOver
                  ? element.character || resolvePrecedingSpeaker(idx) || 'NARRATOR'
                  : undefined;

                const revInfo = isRevisionPassMode
                  ? getElementRevisionInfo(element, revisionTimestampMap)
                  : null;
                const paperRev = revInfo ? getPaperRevisionClasses(revInfo.tier) : null;
                const elContinuityAlerts = continuityAlertsByElementId[element.id] || [];

                return (
                  <div
                    key={element.id}
                    ref={(node) => {
                      if (node) elementDomRefs.current.set(element.id, node);
                      else elementDomRefs.current.delete(element.id);
                    }}
                    onMouseEnter={() => setHoveredElementId(element.id)}
                    onMouseLeave={() => setHoveredElementId(null)}
                    title={
                      revInfo
                        ? `Revision Pass: ${revInfo.label} (${revInfo.shortDateLabel})`
                        : elContinuityAlerts.length > 0
                        ? elContinuityAlerts[0].explanation
                        : undefined
                    }
                    className={`relative group transition-colors ${
                      paperRev
                        ? paperRev.wrapper
                        : elContinuityAlerts.length > 0
                        ? 'bg-rose-50/70 ring-1 ring-rose-300/90 rounded px-2 -mx-2'
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

                    {/* Left Gutter Action Controls & Shot / V.O. Markers */}
                    {isShot && (
                      <div className="absolute -left-14 top-0 flex items-center space-x-1 text-gray-700 font-mono text-[11px] select-none font-bold">
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

                    {/* Scene Heading: INT./EXT. with Blue Timecode on right margin */}
                    {isSceneHeading ? (
                      <div
                        onClick={() => scene && onSelectScene(scene.id)}
                        className="flex items-baseline justify-between pt-6 pb-2 border-b border-gray-300/70 cursor-pointer"
                      >
                        <input
                          type="text"
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value.toUpperCase())}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                            if (scene) onSelectScene(scene.id);
                          }}
                          className={`font-bold tracking-wider uppercase w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                        <span className="font-mono text-blue-600 font-medium text-xs ml-4 flex-shrink-0 select-none tabular-nums">
                          {scene ? scene.timecode : '00:00:00'}
                        </span>
                      </div>
                    ) : isCharacter ? (
                      <div className="flex justify-center pt-3 pb-0.5">
                        <input
                          type="text"
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value.toUpperCase())}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                          }}
                          className={`font-bold uppercase text-center w-80 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : isParenthetical ? (
                      <div className="flex justify-center py-0.5">
                        <input
                          type="text"
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                          }}
                          className={`italic text-center w-80 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-gray-800'
                          }`}
                        />
                      </div>
                    ) : isVoiceOver ? (
                      <div className="flex flex-col items-center py-1">
                        <div className="w-[420px] border-l-2 border-violet-500/80 pl-3 py-0.5 bg-violet-50/40 rounded-r">
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
                            rows={Math.max(1, Math.ceil(element.text.length / 38))}
                            value={element.text}
                            placeholder="Voice-over narration or internal monologue..."
                            onChange={(e) => onUpdateElement(element.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, element, idx)}
                            onFocus={() => {
                              setActiveElementId(element.id);
                              onFocusElement?.(element);
                            }}
                            className={`italic text-left w-full bg-transparent resize-none leading-relaxed border-b border-transparent focus:border-violet-500 focus:outline-none ${
                              paperRev ? paperRev.text : 'text-gray-900'
                            }`}
                          />
                        </div>
                      </div>
                    ) : isDialogue ? (
                      <div className="flex justify-center py-0.5">
                        <textarea
                          rows={Math.max(1, Math.ceil(element.text.length / 38))}
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                          }}
                          className={`text-left w-[420px] bg-transparent resize-none leading-relaxed border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : isTransition ? (
                      <div className="flex justify-end py-2">
                        <input
                          type="text"
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value.toUpperCase())}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                          }}
                          className={`font-bold uppercase text-right w-64 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    ) : isShot ? (
                      <div className="flex items-center pl-6 py-1 border-b border-gray-300/60">
                        <input
                          type="text"
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value.toUpperCase())}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                          }}
                          className={`font-bold tracking-wide uppercase w-full bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-gray-800'
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="py-1">
                        <textarea
                          rows={Math.max(1, Math.ceil(element.text.length / 65))}
                          value={element.text}
                          onChange={(e) => onUpdateElement(element.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, element, idx)}
                          onFocus={() => {
                            setActiveElementId(element.id);
                            onFocusElement?.(element);
                          }}
                          className={`text-left w-full bg-transparent resize-none leading-relaxed border-b border-transparent focus:border-amber-500 focus:outline-none ${
                            paperRev ? paperRev.text : 'text-black'
                          }`}
                        />
                      </div>
                    )}

                    {/* Floating Action Hint / Add Comment button on hover */}
                    {hoveredElementId === element.id && (
                      <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center space-x-1 select-none">
                        <button
                          onClick={() => onAddCommentForElement(element.id)}
                          title="Add Review Note / Comment"
                          className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 shadow border border-amber-300"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
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
              })}
            </div>

            {/* Quick Insert Element Button at Bottom of Page */}
            <div className="mt-12 pt-6 border-t border-gray-300 flex flex-wrap items-center justify-center gap-2 font-sans select-none">
              <span className="text-xs text-gray-500">Insert element:</span>
              <button
                onClick={() => onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'SCENE_HEADING')}
                className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
              >
                + Scene Heading
              </button>
              <button
                onClick={() => onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'ACTION')}
                className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
              >
                + Action
              </button>
              <button
                onClick={() => onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'CHARACTER')}
                className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
              >
                + Character
              </button>
              <button
                onClick={() => onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'DIALOGUE')}
                className="px-2.5 py-1 bg-[#eae6dc] hover:bg-amber-100 text-gray-800 rounded text-xs font-semibold border border-gray-300 transition-colors"
              >
                + Dialogue
              </button>
              <button
                onClick={() => onAddElementAfter(elements[elements.length - 1]?.id || 'root', 'VOICE_OVER')}
                className="px-2.5 py-1 bg-violet-100 hover:bg-violet-200 text-violet-900 rounded text-xs font-semibold border border-violet-300 transition-colors"
              >
                + Voice-over (V.O.)
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
