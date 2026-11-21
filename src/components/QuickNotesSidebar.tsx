import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scene, ElementType } from '../types/story';
import {
  StickyNote,
  X,
  Pin,
  PinOff,
  Copy,
  Check,
  Trash2,
  Plus,
  Search,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  ArrowUpRight,
  Edit3,
  Link2,
} from 'lucide-react';

export type QuickNoteCategory =
  | 'Scene Idea'
  | 'Dialogue Alt'
  | 'Character Note'
  | 'Research'
  | 'To Fix';

export interface QuickNoteCard {
  id: string;
  text: string;
  category: QuickNoteCategory;
  linkedSceneId?: string;
  linkedSceneNumber?: number;
  pinned: boolean;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QuickNotesStore {
  scratchpadText: string;
  scratchpadUpdatedAt: string | null;
  cards: QuickNoteCard[];
  dockSide: 'left' | 'right';
  isWide: boolean;
}

interface QuickNotesSidebarProps {
  projectId: string;
  projectTitle: string;
  selectedScene?: Scene;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectScene?: (sceneId: string) => void;
  onPromoteToScript?: (text: string, type: ElementType) => void;
  onNotify?: (message: string) => void;
}

type NotesScope = 'project' | 'global';
type NotesTab = 'scratchpad' | 'cards';

const CATEGORY_OPTIONS: QuickNoteCategory[] = [
  'Scene Idea',
  'Dialogue Alt',
  'Character Note',
  'Research',
  'To Fix',
];

const CATEGORY_TEXT_COLORS: Record<QuickNoteCategory, string> = {
  'Scene Idea': 'text-amber-300',
  'Dialogue Alt': 'text-cyan-300',
  'Character Note': 'text-emerald-300',
  Research: 'text-violet-300',
  'To Fix': 'text-rose-300',
};

const DEFAULT_STORE: QuickNotesStore = {
  scratchpadText: '',
  scratchpadUpdatedAt: null,
  cards: [],
  dockSide: 'right',
  isWide: false,
};

const getStorageKey = (projectId: string, scope: NotesScope) =>
  scope === 'global'
    ? 'story_studio_quick_notes_v1_global'
    : `story_studio_quick_notes_v1_${projectId}`;

const loadStore = (projectId: string, scope: NotesScope): QuickNotesStore => {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId, scope));
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<QuickNotesStore>;
    return {
      scratchpadText: typeof parsed.scratchpadText === 'string' ? parsed.scratchpadText : '',
      scratchpadUpdatedAt: parsed.scratchpadUpdatedAt || null,
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      dockSide: parsed.dockSide === 'left' ? 'left' : 'right',
      isWide: Boolean(parsed.isWide),
    };
  } catch {
    return DEFAULT_STORE;
  }
};

const persistStore = (projectId: string, scope: NotesScope, data: QuickNotesStore) => {
  try {
    localStorage.setItem(getStorageKey(projectId, scope), JSON.stringify(data));
  } catch {
    // Ignore storage quota errors silently
  }
};

const formatTimeStamp = (iso?: string | null): string => {
  if (!iso) return 'Not yet edited';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const QuickNotesSidebar: React.FC<QuickNotesSidebarProps> = ({
  projectId,
  projectTitle,
  selectedScene,
  isOpen,
  onToggleOpen,
  onSelectScene,
  onPromoteToScript,
  onNotify,
}) => {
  const [scope, setScope] = useState<NotesScope>('project');
  const [activeTab, setActiveTab] = useState<NotesTab>('scratchpad');
  const [store, setStore] = useState<QuickNotesStore>(() => loadStore(projectId, 'project'));

  // Card composer state
  const [draftText, setDraftText] = useState('');
  const [draftCategory, setDraftCategory] = useState<QuickNoteCategory>('Scene Idea');
  const [linkCurrentScene, setLinkCurrentScene] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<QuickNoteCategory | 'All'>('All');

  // Card inline editing & UI feedback
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClearScratchpad, setConfirmClearScratchpad] = useState(false);

  const scratchpadRef = useRef<HTMLTextAreaElement | null>(null);

  // Reload store whenever project or scope switches
  useEffect(() => {
    setStore(loadStore(projectId, scope));
    setEditingCardId(null);
    setConfirmClearScratchpad(false);
  }, [projectId, scope]);

  const updateStore = (updater: (prev: QuickNotesStore) => QuickNotesStore) => {
    setStore((prev) => {
      const next = updater(prev);
      persistStore(projectId, scope, next);
      return next;
    });
  };

  const handleScratchpadChange = (text: string) => {
    const now = new Date().toISOString();
    setConfirmClearScratchpad(false);
    updateStore((prev) => ({
      ...prev,
      scratchpadText: text,
      scratchpadUpdatedAt: now,
    }));
  };

  const handleAddCard = () => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const newCard: QuickNoteCard = {
      id: `qn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      category: draftCategory,
      linkedSceneId:
        scope === 'project' && linkCurrentScene && selectedScene
          ? selectedScene.id
          : undefined,
      linkedSceneNumber:
        scope === 'project' && linkCurrentScene && selectedScene
          ? selectedScene.sceneNumber
          : undefined,
      pinned: false,
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    updateStore((prev) => ({
      ...prev,
      cards: [newCard, ...prev.cards],
    }));
    setDraftText('');
    if (onNotify) onNotify('Saved note to Quick Notes');
  };

  const handleTogglePin = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    }));
  };

  const handleToggleDone = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    }));
  };

  const handleDeleteCard = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
    }));
  };

  const handleSaveCardEdit = (id: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    updateStore((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === id ? { ...c, text: trimmed, updatedAt: now } : c
      ),
    }));
    setEditingCardId(null);
    setEditingText('');
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1500);
      if (onNotify) onNotify('Copied note to clipboard');
    } catch {
      if (onNotify) onNotify('Clipboard copy unavailable');
    }
  };

  const handleConvertScratchpadToCard = () => {
    const trimmed = store.scratchpadText.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const newCard: QuickNoteCard = {
      id: `qn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      category: 'Scene Idea',
      linkedSceneId: scope === 'project' && selectedScene ? selectedScene.id : undefined,
      linkedSceneNumber:
        scope === 'project' && selectedScene ? selectedScene.sceneNumber : undefined,
      pinned: false,
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    updateStore((prev) => ({
      ...prev,
      cards: [newCard, ...prev.cards],
    }));
    setActiveTab('cards');
    if (onNotify) onNotify('Saved scratchpad snapshot as an Idea Card');
  };

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...store.cards]
      .filter((c) => {
        if (filterCategory !== 'All' && c.category !== filterCategory) return false;
        if (!q) return true;
        return (
          c.text.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.linkedSceneNumber ? `scene ${c.linkedSceneNumber}`.includes(q) : false)
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [store.cards, filterCategory, searchQuery]);

  const wordCount = useMemo(() => {
    const trimmed = store.scratchpadText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [store.scratchpadText]);

  const activeCardCount = store.cards.filter((c) => !c.done).length;

  // Compact floating launcher when minimized
  if (!isOpen) {
    return (
      <div
        className={`absolute bottom-4 ${
          store.dockSide === 'left' ? 'left-4' : 'right-4'
        } z-30`}
      >
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-100 border border-[#444444] hover:border-[#ff7700] rounded-lg shadow-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          title="Open Quick Notes floating scratchpad"
        >
          <StickyNote className="w-3.5 h-3.5 text-[#ff8c1a] shrink-0" />
          <span>Quick Notes</span>
          {(activeCardCount > 0 || wordCount > 0) && (
            <span className="text-[11px] font-mono tabular-nums text-gray-400">
              · {activeCardCount > 0 ? `${activeCardCount} ideas` : `${wordCount}w`}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Quick Notes Scratchpad"
      className={`absolute top-3 bottom-3 ${
        store.dockSide === 'left' ? 'left-3' : 'right-3'
      } ${
        store.isWide ? 'w-[380px]' : 'w-[315px]'
      } max-w-[calc(100%-1.5rem)] z-30 bg-[#191919] border border-[#3d3d3d] rounded-lg shadow-2xl flex flex-col overflow-hidden text-xs text-gray-200 select-text`}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#222222] border-b border-[#343434] flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <StickyNote className="w-4 h-4 text-[#ff8c1a] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              Quick Notes
            </div>
            <div className="text-[10px] text-gray-400 truncate font-mono tabular-nums">
              {scope === 'project' ? projectTitle : 'Global Scratchpad'} · Local Save
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() =>
              updateStore((prev) => ({
                ...prev,
                dockSide: prev.dockSide === 'right' ? 'left' : 'right',
              }))
            }
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#323232] rounded transition-colors"
            title={
              store.dockSide === 'right'
                ? 'Snap floating sidebar to left edge'
                : 'Snap floating sidebar to right edge'
            }
          >
            {store.dockSide === 'right' ? (
              <PanelLeft className="w-3.5 h-3.5" />
            ) : (
              <PanelRight className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              updateStore((prev) => ({ ...prev, isWide: !prev.isWide }))
            }
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#323232] rounded transition-colors"
            title={store.isWide ? 'Narrow sidebar width' : 'Widen sidebar'}
          >
            {store.isWide ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#323232] rounded transition-colors"
            title="Minimize Quick Notes"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode & Scope Controls */}
      <div className="px-3 py-2 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center p-0.5 bg-[#121212] rounded border border-[#2f2f2f]">
          <button
            type="button"
            onClick={() => setActiveTab('scratchpad')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'scratchpad'
                ? 'bg-[#2a2a2a] text-[#ff8c1a]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Scratchpad
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums ${
              activeTab === 'cards'
                ? 'bg-[#2a2a2a] text-[#ff8c1a]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Ideas ({activeCardCount})
          </button>
        </div>

        <div className="flex items-center p-0.5 bg-[#121212] rounded border border-[#2f2f2f]">
          <button
            type="button"
            onClick={() => setScope('project')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
              scope === 'project'
                ? 'bg-[#2a2a2a] text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Notes scoped to this screenplay project"
          >
            Script
          </button>
          <button
            type="button"
            onClick={() => setScope('global')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 ${
              scope === 'global'
                ? 'bg-[#2a2a2a] text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Shared scratchpad across all projects"
          >
            Global
          </button>
        </div>
      </div>

      {/* Body */}
      {activeTab === 'scratchpad' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            ref={scratchpadRef}
            value={store.scratchpadText}
            onChange={(e) => handleScratchpadChange(e.target.value)}
            placeholder={
              scope === 'project'
                ? 'Jot non-script thoughts, alternate beats, dialogue riffs, or scene ideas here. Stored locally in your browser—never included in screenplay exports...'
                : 'Global writer scratchpad across all projects. Saved automatically in your browser...'
            }
            className="flex-1 w-full bg-[#151515] text-gray-100 placeholder-gray-500 p-3.5 text-[13px] leading-relaxed resize-none focus:outline-none font-sans"
          />

          {/* Scratchpad Action Footer */}
          <div className="px-3 py-2 bg-[#1e1e1e] border-t border-[#2f2f2f] flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
            <div className="text-[11px] text-gray-400 font-mono tabular-nums">
              <span>{wordCount}w</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>{formatTimeStamp(store.scratchpadUpdatedAt)}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleConvertScratchpadToCard}
                disabled={!store.scratchpadText.trim()}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#272727] hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 border border-[#3d3d3d] text-[11px] transition-colors whitespace-nowrap shrink-0"
                title="Save current scratchpad text as a structured Idea Card"
              >
                <Plus className="w-3 h-3" />
                <span>Save as Idea</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(store.scratchpadText, 'scratchpad')}
                disabled={!store.scratchpadText.trim()}
                className="p-1.5 rounded bg-[#272727] hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 border border-[#3d3d3d] transition-colors"
                title="Copy scratchpad text"
              >
                {copiedId === 'scratchpad' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {store.scratchpadText.trim() && (
                confirmClearScratchpad ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleScratchpadChange('');
                      setConfirmClearScratchpad(false);
                    }}
                    className="px-2 py-1 rounded bg-rose-900/70 hover:bg-rose-800 text-rose-100 border border-rose-500/60 text-[11px] font-medium whitespace-nowrap shrink-0"
                    title="Confirm clearing scratchpad text"
                  >
                    Confirm Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearScratchpad(true)}
                    className="p-1.5 rounded bg-[#272727] hover:bg-[#333333] text-gray-400 hover:text-rose-300 border border-[#3d3d3d] transition-colors"
                    title="Clear scratchpad"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Idea Card Composer */}
          <div className="p-3 bg-[#181818] border-b border-[#2e2e2e] space-y-2 shrink-0">
            <textarea
              rows={2}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCard();
                }
              }}
              placeholder="Capture a scene idea, beat shift, or alt line (Ctrl/Cmd+Enter)..."
              className="w-full bg-[#111111] border border-[#363636] focus:border-[#ff7700] rounded p-2 text-xs text-gray-100 placeholder-gray-500 resize-none focus:outline-none"
            />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <select
                  value={draftCategory}
                  onChange={(e) =>
                    setDraftCategory(e.target.value as QuickNoteCategory)
                  }
                  className="bg-[#222222] border border-[#383838] rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#ff7700]"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {scope === 'project' && selectedScene && (
                  <button
                    type="button"
                    onClick={() => setLinkCurrentScene((v) => !v)}
                    className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums ${
                      linkCurrentScene
                        ? 'bg-[#2a2219] border-[#ff7700]/70 text-amber-200'
                        : 'bg-[#222222] border-[#383838] text-gray-400 hover:text-gray-200'
                    }`}
                    title="Attach note to currently active scene"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>Sc.{selectedScene.sceneNumber}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddCard}
                disabled={!draftText.trim()}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded text-[11px] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Add Idea</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="px-3 py-2 bg-[#1a1a1a] border-b border-[#2c2c2c] flex items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3 h-3 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter ideas..."
                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ff7700] rounded pl-6 pr-2 py-1 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as QuickNoteCategory | 'All')
              }
              className="bg-[#222222] border border-[#333333] rounded px-1.5 py-1 text-[11px] text-gray-300 focus:outline-none"
            >
              <option value="All">All</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCards.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-xs">
                {store.cards.length === 0
                  ? 'No idea cards saved yet. Capture a scene idea above.'
                  : 'No ideas match your current filter.'}
              </div>
            ) : (
              filteredCards.map((card) => {
                const isEditing = editingCardId === card.id;
                return (
                  <div
                    key={card.id}
                    className={`rounded border p-2.5 transition-colors ${
                      card.done
                        ? 'bg-[#151515] border-[#262626] opacity-65'
                        : card.pinned
                        ? 'bg-[#221f1a] border-[#ff7700]/45'
                        : 'bg-[#202020] border-[#333333]'
                    }`}
                  >
                    {/* Metadata line (unboxed, clean typographic separators) */}
                    <div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span
                          className={`font-semibold ${
                            CATEGORY_TEXT_COLORS[card.category]
                          }`}
                        >
                          {card.category}
                        </span>
                        {card.linkedSceneNumber && (
                          <>
                            <span className="text-gray-600" aria-hidden="true">
                              ·
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (card.linkedSceneId && onSelectScene) {
                                  onSelectScene(card.linkedSceneId);
                                }
                              }}
                              className="text-gray-300 hover:text-[#ff8c1a] font-mono tabular-nums underline decoration-gray-600 hover:decoration-[#ff8c1a]"
                              title={`Jump to Scene ${card.linkedSceneNumber}`}
                            >
                              Sc.{card.linkedSceneNumber}
                            </button>
                          </>
                        )}
                        <span className="text-gray-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-gray-500 font-mono tabular-nums">
                          {formatTimeStamp(card.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(card.id)}
                          className={`p-1 rounded hover:bg-[#2d2d2d] ${
                            card.pinned ? 'text-[#ff8c1a]' : 'text-gray-500 hover:text-gray-200'
                          }`}
                          title={card.pinned ? 'Unpin idea' : 'Pin idea to top'}
                        >
                          {card.pinned ? (
                            <PinOff className="w-3 h-3" />
                          ) : (
                            <Pin className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDone(card.id)}
                          className={`p-1 rounded hover:bg-[#2d2d2d] ${
                            card.done ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-300'
                          }`}
                          title={card.done ? 'Mark active' : 'Mark used / resolved'}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCardId(card.id);
                            setEditingText(card.text);
                          }}
                          className="p-1 rounded hover:bg-[#2d2d2d] text-gray-500 hover:text-gray-200"
                          title="Edit note"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1 rounded hover:bg-[#2d2d2d] text-gray-500 hover:text-rose-400"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-1.5">
                        <textarea
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-[#121212] border border-[#ff7700] rounded p-2 text-xs text-gray-100 resize-none focus:outline-none"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCardId(null)}
                            className="px-2 py-0.5 text-[11px] bg-[#2a2a2a] text-gray-300 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCardEdit(card.id)}
                            className="px-2 py-0.5 text-[11px] bg-[#ff7700] text-black font-semibold rounded"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                            card.done ? 'line-through text-gray-500' : 'text-gray-200'
                          }`}
                        >
                          {card.text}
                        </p>
                        <div className="mt-2 pt-1.5 border-t border-[#2b2b2b] flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(card.text, card.id)}
                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 whitespace-nowrap"
                          >
                            {copiedId === card.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          {onPromoteToScript && (
                            <button
                              type="button"
                              onClick={() =>
                                onPromoteToScript(
                                  card.text,
                                  card.category === 'Dialogue Alt' ? 'DIALOGUE' : 'ACTION'
                                )
                              }
                              className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 whitespace-nowrap"
                              title="Insert this note into the active screenplay after the focused element"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Insert to Script</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
