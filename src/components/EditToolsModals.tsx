import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  Navigation,
  UserPlus,
  UserCog,
  Pencil,
  Smile,
  Check,
  Copy,
} from 'lucide-react';
import {
  Scene,
  ScreenplayElement,
  StoryCharacter,
  CharacterBio,
} from '../types/story';

// ============================================================================
// 1. Go To Modal (Scene / Page / Element)
// ============================================================================
interface GoToModalProps {
  scenes: Scene[];
  elements: ScreenplayElement[];
  onGoToScene: (sceneId: string) => void;
  onGoToElement: (elementId: string) => void;
  onClose: () => void;
}

export const GoToModal: React.FC<GoToModalProps> = ({
  scenes,
  elements,
  onGoToScene,
  onGoToElement,
  onClose,
}) => {
  const [mode, setMode] = useState<'scene' | 'page' | 'element'>('scene');
  const [queryValue, setQueryValue] = useState<string>(
    scenes[0] ? String(scenes[0].sceneNumber) : '1'
  );

  const totalPages = useMemo(() => {
    const totalEighths = scenes.reduce((acc, s) => acc + (s.eighths || 4), 0);
    return Math.max(1, Math.ceil(totalEighths / 8));
  }, [scenes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(queryValue.trim(), 10);

    if (mode === 'scene') {
      const matched =
        scenes.find((s) => s.sceneNumber === num) ||
        scenes.find((s) =>
          s.heading.toLowerCase().includes(queryValue.trim().toLowerCase())
        );
      if (matched) {
        onGoToScene(matched.id);
        onClose();
      }
      return;
    }

    if (mode === 'page') {
      const targetPage = Math.max(1, Math.min(totalPages, Number.isNaN(num) ? 1 : num));
      const targetEighth = (targetPage - 1) * 8;
      let runningEighths = 0;
      let targetScene = scenes[0];
      for (const sc of scenes) {
        if (runningEighths >= targetEighth) {
          targetScene = sc;
          break;
        }
        runningEighths += sc.eighths || 4;
        targetScene = sc;
      }
      if (targetScene) {
        onGoToScene(targetScene.id);
      }
      onClose();
      return;
    }

    if (mode === 'element') {
      const idx = Math.max(0, Math.min(elements.length - 1, (Number.isNaN(num) ? 1 : num) - 1));
      const el = elements[idx];
      if (el) {
        onGoToElement(el.id);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-md text-xs text-gray-200 overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-[#ff7700]" />
            <span className="font-bold text-sm text-gray-100">Go To</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close Go To dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-1.5 bg-[#181818] p-1 rounded border border-[#333]">
            {(['scene', 'page', 'element'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setQueryValue('1');
                }}
                className={`py-1.5 rounded font-semibold capitalize transition-colors ${
                  mode === m
                    ? 'bg-[#ff7700] text-black'
                    : 'text-gray-300 hover:bg-[#2a2a2a]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-gray-300 block">
              {mode === 'scene'
                ? 'Scene Number or Heading'
                : mode === 'page'
                ? `Page Number (1 – ${totalPages})`
                : `Element Line Index (1 – ${Math.max(1, elements.length)})`}
            </span>
            <input
              type="text"
              autoFocus
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
              className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-2 font-mono text-xs text-white"
            />
          </label>

          {mode === 'scene' && scenes.length > 0 && (
            <div className="max-h-40 overflow-y-auto bg-[#181818] border border-[#333] rounded divide-y divide-[#2a2a2a]">
              {scenes.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    onGoToScene(sc.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700]/20 flex items-center justify-between transition-colors"
                >
                  <span className="truncate font-mono text-[11px] text-gray-200">
                    <span className="text-amber-400 font-bold mr-2">#{sc.sceneNumber}</span>
                    {sc.heading}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
                    {sc.pages}p
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold rounded"
          >
            Jump
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// 2. Find & Replace Modal
// ============================================================================
interface FindReplaceModalProps {
  elements: ScreenplayElement[];
  onJumpToElement: (elementId: string) => void;
  onReplaceInElement: (elementId: string, nextText: string) => void;
  onReplaceAll: (findText: string, replaceText: string, caseSensitive: boolean, wholeWord: boolean) => number;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  elements,
  onJumpToElement,
  onReplaceInElement,
  onReplaceAll,
  onNotify,
  onClose,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCursor, setMatchCursor] = useState(0);

  const searchRegex = useMemo(() => {
    if (!findText) return null;
    const escaped = escapeRegExp(findText);
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  }, [findText, caseSensitive, wholeWord]);

  const matchingElements = useMemo(() => {
    if (!searchRegex) return [];
    return elements.filter((el) => {
      searchRegex.lastIndex = 0;
      return searchRegex.test(el.text);
    });
  }, [elements, searchRegex]);

  const activeMatchIndex =
    matchingElements.length > 0 ? matchCursor % matchingElements.length : -1;
  const activeMatch =
    activeMatchIndex >= 0 ? matchingElements[activeMatchIndex] : undefined;

  const navigateMatch = (delta: number) => {
    if (matchingElements.length === 0) return;
    const nextIdx =
      (activeMatchIndex + delta + matchingElements.length) %
      matchingElements.length;
    setMatchCursor(nextIdx);
    onJumpToElement(matchingElements[nextIdx].id);
  };

  const handleReplaceCurrent = () => {
    if (!activeMatch || !searchRegex) return;
    const singleRegex = new RegExp(
      wholeWord ? `\\b${escapeRegExp(findText)}\\b` : escapeRegExp(findText),
      caseSensitive ? '' : 'i'
    );
    const updated = activeMatch.text.replace(singleRegex, replaceText);
    if (updated !== activeMatch.text) {
      onReplaceInElement(activeMatch.id, updated);
      onJumpToElement(activeMatch.id);
      onNotify('Replaced match');
    }
  };

  const handleReplaceAllClick = () => {
    if (!findText) return;
    const count = onReplaceAll(findText, replaceText, caseSensitive, wholeWord);
    onNotify(
      count > 0
        ? `Replaced occurrences in ${count} element${count === 1 ? '' : 's'}`
        : 'No matches found to replace'
    );
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-lg text-xs text-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-[#ff7700]" />
            <span className="font-bold text-sm text-gray-100">Find &amp; Replace</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close Find & Replace dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-300">Find</label>
              <span className="text-[10px] font-mono text-amber-300">
                {findText
                  ? matchingElements.length > 0
                    ? `${activeMatchIndex + 1} of ${matchingElements.length} elements`
                    : '0 matches'
                  : 'Enter search text'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={findText}
                onChange={(e) => {
                  setFindText(e.target.value);
                  setMatchCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    navigateMatch(e.shiftKey ? -1 : 1);
                  }
                }}
                placeholder="Search dialogue, action, character, scene..."
                className="flex-1 bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => navigateMatch(-1)}
                disabled={matchingElements.length === 0}
                title="Previous Match"
                className="p-1.5 bg-[#2d2d2d] hover:bg-[#383838] disabled:opacity-40 rounded border border-[#3e3e3e]"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigateMatch(1)}
                disabled={matchingElements.length === 0}
                title="Next Match"
                className="p-1.5 bg-[#2d2d2d] hover:bg-[#383838] disabled:opacity-40 rounded border border-[#3e3e3e]"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-300 block">
              Replace With
            </label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replacement text..."
              className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="accent-[#ff7700]"
              />
              <span>Match Case</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="accent-[#ff7700]"
              />
              <span>Whole Word</span>
            </label>
          </div>

          {activeMatch && (
            <div className="bg-[#181818] border border-[#333] rounded p-2.5 space-y-1">
              <div className="text-[10px] font-mono uppercase text-amber-400">
                Preview ({activeMatch.type.replace('_', ' ')})
              </div>
              <p className="text-[11px] text-gray-200 font-courier line-clamp-2">
                {activeMatch.text}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReplaceCurrent}
              disabled={!activeMatch}
              className="px-3 py-1.5 bg-[#333] hover:bg-[#444] disabled:opacity-40 text-gray-100 rounded border border-[#484848] flex items-center gap-1"
            >
              <Replace className="w-3.5 h-3.5 text-amber-400" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={handleReplaceAllClick}
              disabled={matchingElements.length === 0}
              className="px-3.5 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-bold rounded"
            >
              Replace All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. Character Quick Modal (Rename / Add / Edit Character)
// ============================================================================
export type CharacterModalMode = 'rename' | 'add' | 'edit';

interface CharacterActionModalProps {
  mode: CharacterModalMode;
  characters: StoryCharacter[];
  characterBios: CharacterBio[];
  initialCharacterName?: string;
  onRenameCharacter: (oldName: string, newName: string) => void;
  onAddCharacter: (payload: {
    name: string;
    role: CharacterBio['roleType'];
    color: string;
    bio: string;
    insertCueInScript: boolean;
  }) => void;
  onEditCharacter: (payload: {
    originalName: string;
    name: string;
    role: CharacterBio['roleType'];
    color: string;
    bio: string;
  }) => void;
  onOpenCharactersWorkspace: () => void;
  onClose: () => void;
}

export const CharacterActionModal: React.FC<CharacterActionModalProps> = ({
  mode,
  characters,
  characterBios,
  initialCharacterName,
  onRenameCharacter,
  onAddCharacter,
  onEditCharacter,
  onOpenCharactersWorkspace,
  onClose,
}) => {
  const defaultSelected =
    (initialCharacterName &&
      characters.find(
        (c) => c.name.toUpperCase() === initialCharacterName.toUpperCase()
      )?.name) ||
    characters[0]?.name ||
    '';

  const [selectedName, setSelectedName] = useState(defaultSelected);
  const matchedChar = characters.find(
    (c) => c.name.toUpperCase() === selectedName.toUpperCase()
  );
  const matchedBio = characterBios.find(
    (b) => b.characterName.toUpperCase() === selectedName.toUpperCase()
  );

  const [nameInput, setNameInput] = useState(
    mode === 'add' ? '' : selectedName
  );
  const [roleInput, setRoleInput] = useState<CharacterBio['roleType']>(
    mode === 'add' ? 'Supporting' : matchedBio?.roleType || 'Lead'
  );
  const [colorInput, setColorInput] = useState(
    mode === 'add' ? '#f59e0b' : matchedChar?.color || '#00d2d3'
  );
  const [bioInput, setBioInput] = useState(
    mode === 'add' ? '' : matchedBio?.loglineSummary || matchedBio?.backstory || ''
  );
  const [insertCue, setInsertCue] = useState(true);

  const handleSelectTargetChange = (nextTarget: string) => {
    setSelectedName(nextTarget);
    const ch = characters.find((c) => c.name.toUpperCase() === nextTarget.toUpperCase());
    const bio = characterBios.find((b) => b.characterName.toUpperCase() === nextTarget.toUpperCase());
    setNameInput(nextTarget);
    setRoleInput(bio?.roleType || 'Supporting');
    setColorInput(ch?.color || '#00d2d3');
    setBioInput(bio?.loglineSummary || bio?.backstory || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim().toUpperCase();
    if (!trimmed) return;

    if (mode === 'rename') {
      if (selectedName && trimmed !== selectedName.toUpperCase()) {
        onRenameCharacter(selectedName, trimmed);
      }
      onClose();
      return;
    }

    if (mode === 'add') {
      onAddCharacter({
        name: trimmed,
        role: roleInput,
        color: colorInput,
        bio: bioInput.trim(),
        insertCueInScript: insertCue,
      });
      onClose();
      return;
    }

    if (mode === 'edit') {
      onEditCharacter({
        originalName: selectedName || trimmed,
        name: trimmed,
        role: roleInput,
        color: colorInput,
        bio: bioInput.trim(),
      });
      onClose();
    }
  };

  const title =
    mode === 'rename'
      ? 'Rename Character Across Script'
      : mode === 'add'
      ? 'Add Character'
      : 'Edit Character';

  const Icon = mode === 'add' ? UserPlus : mode === 'rename' ? Pencil : UserCog;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-md text-xs text-gray-200 overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-[#ff7700]" />
            <span className="font-bold text-sm text-gray-100">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close character dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {(mode === 'rename' || mode === 'edit') && (
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-gray-300 block">
                Select Character
              </span>
              <select
                value={selectedName}
                onChange={(e) => handleSelectTargetChange(e.target.value)}
                className="w-full bg-[#151515] border border-[#3e3e3e] rounded px-3 py-1.5 text-xs text-amber-300 font-semibold"
              >
                {characters.length === 0 && (
                  <option value="">No characters in project</option>
                )}
                {characters.map((ch) => (
                  <option key={ch.name} value={ch.name}>
                    {ch.name} ({ch.scenesCount} scenes, {ch.speakingLines} lines)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-gray-300 block">
              {mode === 'rename' ? 'New Character Name' : 'Character Name'}
            </span>
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. DETECTIVE MERCER"
              className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 font-mono uppercase text-xs text-white"
            />
          </label>

          {mode === 'rename' && (
            <p className="text-[11px] text-gray-400">
              Updates all Character cues, Voice-over assignments, Cast tags, Character Breakdowns, and Character Bios throughout the project.
            </p>
          )}

          {(mode === 'add' || mode === 'edit') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-gray-300 block">
                    Role / Archetype
                  </span>
                  <select
                    value={roleInput}
                    onChange={(e) =>
                      setRoleInput(e.target.value as CharacterBio['roleType'])
                    }
                    className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Lead">Lead</option>
                    <option value="Supporting">Supporting</option>
                    <option value="Antagonist">Antagonist</option>
                    <option value="Featured">Featured</option>
                    <option value="Ensemble">Ensemble</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-gray-300 block">
                    Color Tag
                  </span>
                  <div className="flex items-center gap-2 bg-[#151515] border border-[#3e3e3e] rounded px-2 py-1">
                    <input
                      type="color"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      className="w-6 h-5 bg-transparent border-0 p-0 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-gray-300">
                      {colorInput}
                    </span>
                  </div>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  Character Bio / Notes
                </span>
                <textarea
                  rows={3}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Motivation, backstory, vocal mannerisms..."
                  className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-gray-200 resize-none"
                />
              </label>
            </>
          )}

          {mode === 'add' && (
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={insertCue}
                onChange={(e) => setInsertCue(e.target.checked)}
                className="accent-[#ff7700]"
              />
              <span>Also insert a [C] Character cue into the script</span>
            </label>
          )}
        </div>

        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCharactersWorkspace();
            }}
            className="text-[11px] text-amber-400 hover:text-amber-300 underline"
          >
            Open Characters Panel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-bold rounded flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {mode === 'rename'
                  ? 'Rename'
                  : mode === 'add'
                  ? 'Add Character'
                  : 'Save Character'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// 4. Emoji & Symbols Modal
// ============================================================================
interface EmojiSymbolsModalProps {
  onInsertSymbol: (glyph: string) => void;
  onClose: () => void;
}

const SYMBOL_GROUPS: {
  id: string;
  label: string;
  items: { glyph: string; name: string }[];
}[] = [
  {
    id: 'script',
    label: 'Script & Film',
    items: [
      { glyph: '🎬', name: 'Clapperboard' },
      { glyph: '🎥', name: 'Movie Camera' },
      { glyph: '🎞️', name: 'Film Frames' },
      { glyph: '📽️', name: 'Film Projector' },
      { glyph: '🎭', name: 'Performing Arts' },
      { glyph: '🎙️', name: 'Studio Microphone' },
      { glyph: '🎧', name: 'Headphones' },
      { glyph: '🔊', name: 'Speaker High Volume' },
      { glyph: '🎵', name: 'Musical Note' },
      { glyph: '🎶', name: 'Musical Notes' },
      { glyph: '📝', name: 'Script Memo' },
      { glyph: '📌', name: 'Pushpin' },
      { glyph: '🔦', name: 'Flashlight' },
      { glyph: '💡', name: 'Idea Bulb' },
      { glyph: '⏱️', name: 'Stopwatch' },
      { glyph: '📍', name: 'Location Pin' },
    ],
  },
  {
    id: 'punctuation',
    label: 'Typography & Punctuation',
    items: [
      { glyph: '—', name: 'Em Dash' },
      { glyph: '–', name: 'En Dash' },
      { glyph: '…', name: 'Ellipsis' },
      { glyph: '“', name: 'Left Double Quote' },
      { glyph: '”', name: 'Right Double Quote' },
      { glyph: '‘', name: 'Left Single Quote' },
      { glyph: '’', name: 'Right Single Quote' },
      { glyph: '•', name: 'Bullet' },
      { glyph: '§', name: 'Section Sign' },
      { glyph: '¶', name: 'Pilcrow' },
      { glyph: '†', name: 'Dagger' },
      { glyph: '‡', name: 'Double Dagger' },
      { glyph: '©', name: 'Copyright' },
      { glyph: '®', name: 'Registered' },
      { glyph: '™', name: 'Trademark' },
      { glyph: '°', name: 'Degree' },
    ],
  },
  {
    id: 'symbols',
    label: 'Arrows & Markers',
    items: [
      { glyph: '→', name: 'Right Arrow' },
      { glyph: '←', name: 'Left Arrow' },
      { glyph: '↑', name: 'Up Arrow' },
      { glyph: '↓', name: 'Down Arrow' },
      { glyph: '↔', name: 'Left Right Arrow' },
      { glyph: '↺', name: 'Counterclockwise' },
      { glyph: '★', name: 'Black Star' },
      { glyph: '☆', name: 'White Star' },
      { glyph: '✓', name: 'Check Mark' },
      { glyph: '✗', name: 'Ballot X' },
      { glyph: '⚠', name: 'Warning Sign' },
      { glyph: '⚡', name: 'High Voltage' },
      { glyph: '♪', name: 'Eighth Note' },
      { glyph: '♫', name: 'Beamed Eighth Notes' },
      { glyph: '∞', name: 'Infinity' },
      { glyph: '±', name: 'Plus Minus' },
    ],
  },
  {
    id: 'emoji',
    label: 'Expressions & Reactions',
    items: [
      { glyph: '😀', name: 'Grinning' },
      { glyph: '😮', name: 'Surprised' },
      { glyph: '😠', name: 'Angry' },
      { glyph: '😢', name: 'Crying' },
      { glyph: '🤔', name: 'Thinking' },
      { glyph: '👀', name: 'Eyes' },
      { glyph: '👍', name: 'Thumbs Up' },
      { glyph: '👎', name: 'Thumbs Down' },
      { glyph: '👏', name: 'Clapping Hands' },
      { glyph: '🔥', name: 'Fire' },
      { glyph: '❤️', name: 'Red Heart' },
      { glyph: '💔', name: 'Broken Heart' },
      { glyph: '✅', name: 'Check Mark Button' },
      { glyph: '❌', name: 'Cross Mark' },
      { glyph: '⭐', name: 'Star' },
      { glyph: '🚨', name: 'Rotating Light' },
    ],
  },
];

export const EmojiSymbolsModal: React.FC<EmojiSymbolsModalProps> = ({
  onInsertSymbol,
  onClose,
}) => {
  const [activeGroup, setActiveGroup] = useState<string>('script');
  const [search, setSearch] = useState('');
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  const displayedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return SYMBOL_GROUPS.flatMap((g) => g.items).filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.glyph.includes(q)
      );
    }
    return SYMBOL_GROUPS.find((g) => g.id === activeGroup)?.items || [];
  }, [activeGroup, search]);

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-lg text-xs text-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smile className="w-4 h-4 text-[#ff7700]" />
            <span className="font-bold text-sm text-gray-100">
              Emoji &amp; Symbols
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Close Emoji & Symbols dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter symbols or emoji (e.g. dash, camera, note, star)..."
            className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-white"
          />

          {!search && (
            <div className="flex flex-wrap gap-1 border-b border-[#333] pb-2">
              {SYMBOL_GROUPS.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setActiveGroup(grp.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    activeGroup === grp.id
                      ? 'bg-[#ff7700] text-black'
                      : 'bg-[#2c2c2c] text-gray-300 hover:bg-[#383838]'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-1.5 max-h-56 overflow-y-auto p-1 bg-[#181818] border border-[#333] rounded">
            {displayedItems.map((item) => (
              <button
                key={`${item.name}-${item.glyph}`}
                type="button"
                title={item.name}
                onClick={() => {
                  onInsertSymbol(item.glyph);
                  setLastCopied(item.glyph);
                }}
                className="h-10 rounded bg-[#232323] hover:bg-[#ff7700]/25 border border-[#333] hover:border-[#ff7700] text-lg flex items-center justify-center transition-colors"
              >
                {item.glyph}
              </button>
            ))}
            {displayedItems.length === 0 && (
              <div className="col-span-8 text-center py-6 text-gray-500">
                No matching symbols found.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>
              Click any glyph to insert into your focused script line (and copy to clipboard).
            </span>
            {lastCopied && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                <Copy className="w-3 h-3" />
                Inserted {lastCopied}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#1e1e1e] border-t border-[#383838] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-200 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
