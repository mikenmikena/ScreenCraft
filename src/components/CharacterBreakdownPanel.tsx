import React, { useState, useMemo } from 'react';
import {
  CastCrewMember,
  CharacterBreakdownOverride,
  Scene,
  ScreenplayElement,
  StoryCharacter,
  StoryComment,
  Tag,
} from '../types/story';
import {
  BreakdownItem,
  GeneratedCharacterBreakdown,
  generateCharacterBreakdowns,
} from '../utils/characterBreakdownGenerator';
import {
  Search,
  X,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Tag as TagIcon,
  UserCheck,
  Shirt,
  Compass,
  Sparkles,
  Film,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

interface CharacterBreakdownPanelProps {
  projectTitle: string;
  tags: Tag[];
  characters: StoryCharacter[];
  scenes: Scene[];
  elements: ScreenplayElement[];
  comments: StoryComment[];
  crewMembers: CastCrewMember[];
  overrides?: CharacterBreakdownOverride[];
  onUpdateOverride: (override: CharacterBreakdownOverride) => void;
  onResetOverride: (characterName: string) => void;
  onCreateCharacterTag?: (name: string, sceneIds: string[]) => void;
  onSelectScene: (sceneId: string) => void;
  onViewActorInRoster?: (memberId: string) => void;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const CharacterBreakdownPanel: React.FC<CharacterBreakdownPanelProps> = ({
  projectTitle,
  tags,
  characters,
  scenes,
  elements,
  comments,
  crewMembers,
  overrides = [],
  onUpdateOverride,
  onResetOverride,
  onCreateCharacterTag,
  onSelectScene,
  onViewActorInRoster,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'tagged' | 'wardrobe' | 'voice_over'>('all');
  const [selectedCharName, setSelectedCharName] = useState<string>('');
  const [copiedChar, setCopiedChar] = useState<string | null>(null);
  const [regenPulse, setRegenPulse] = useState(false);

  // Inline add inputs per section
  const [newTraitText, setNewTraitText] = useState('');
  const [newMotivationText, setNewMotivationText] = useState('');
  const [newCostumeText, setNewCostumeText] = useState('');

  const breakdowns = useMemo(
    () =>
      generateCharacterBreakdowns({
        tags,
        characters,
        scenes,
        elements,
        comments,
        crewMembers,
        overrides,
      }),
    [tags, characters, scenes, elements, comments, crewMembers, overrides]
  );

  const filteredBreakdowns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return breakdowns.filter((b) => {
      if (filterMode === 'tagged' && !b.isTaggedInScript) return false;
      if (filterMode === 'voice_over' && b.voiceOverLines === 0) return false;
      if (
        filterMode === 'wardrobe' &&
        b.costumeRequirements.length === 0 &&
        !b.linkedTags.some((t) => t.category === 'wardrobe')
      ) {
        return false;
      }
      if (!q) return true;
      return (
        b.characterName.toLowerCase().includes(q) ||
        (b.actorName && b.actorName.toLowerCase().includes(q)) ||
        b.traits.some((t) => t.text.toLowerCase().includes(q)) ||
        b.motivations.some((m) => m.text.toLowerCase().includes(q)) ||
        b.costumeRequirements.some((c) => c.text.toLowerCase().includes(q))
      );
    });
  }, [breakdowns, searchQuery, filterMode]);

  const selectedBreakdown: GeneratedCharacterBreakdown | null = useMemo(() => {
    if (selectedCharName) {
      const exact = breakdowns.find((b) => b.characterName === selectedCharName);
      if (exact) return exact;
    }
    return filteredBreakdowns[0] || breakdowns[0] || null;
  }, [selectedCharName, breakdowns, filteredBreakdowns]);

  const taggedCharacterCount = useMemo(
    () => breakdowns.filter((b) => b.isTaggedInScript).length,
    [breakdowns]
  );

  const getOverrideFor = (charName: string): CharacterBreakdownOverride => {
    return (
      overrides.find((o) => o.characterName.toUpperCase() === charName.toUpperCase()) || {
        characterName: charName.toUpperCase(),
      }
    );
  };

  const handleAddCustomItem = (
    field: 'customTraits' | 'customMotivations' | 'customCostumes',
    value: string,
    clearFn: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed || !selectedBreakdown) return;
    const current = getOverrideFor(selectedBreakdown.characterName);
    const existing = current[field] || [];
    if (!existing.includes(trimmed)) {
      onUpdateOverride({
        ...current,
        [field]: [...existing, trimmed],
      });
    }
    clearFn();
  };

  const handleRemoveItem = (
    category: 'traits' | 'motivations' | 'costumes',
    item: BreakdownItem
  ) => {
    if (!selectedBreakdown) return;
    const current = getOverrideFor(selectedBreakdown.characterName);

    if (item.isCustom) {
      const customField =
        category === 'traits'
          ? 'customTraits'
          : category === 'motivations'
          ? 'customMotivations'
          : 'customCostumes';
      onUpdateOverride({
        ...current,
        [customField]: (current[customField] || []).filter((t) => t !== item.text),
      });
    } else {
      const hiddenField =
        category === 'traits'
          ? 'hiddenTraits'
          : category === 'motivations'
          ? 'hiddenMotivations'
          : 'hiddenCostumes';
      const existing = current[hiddenField] || [];
      if (!existing.includes(item.text)) {
        onUpdateOverride({
          ...current,
          [hiddenField]: [...existing, item.text],
        });
      }
    }
  };

  const handleWardrobeNotesChange = (notes: string) => {
    if (!selectedBreakdown) return;
    const current = getOverrideFor(selectedBreakdown.characterName);
    onUpdateOverride({
      ...current,
      wardrobeNotes: notes,
    });
  };

  const handleCopyBreakdown = (b: GeneratedCharacterBreakdown) => {
    const lines = [
      `CHARACTER BREAKDOWN — ${b.characterName}`,
      `Project: ${projectTitle}`,
      `Actor: ${b.actorName || 'Unassigned'}`,
      `Lines: ${b.dialogueLines} Dialogue · ${b.voiceOverLines} Voice-over (V.O.)`,
      `Scenes: ${b.sceneNumbers.length > 0 ? b.sceneNumbers.map((n) => `Sc. ${n}`).join(', ') : 'None'}`,
      '',
      'CHARACTER TRAITS:',
      ...b.traits.map((t) => `- ${t.text} [${t.source}]`),
      '',
      'MOTIVATIONS & OBJECTIVES:',
      ...b.motivations.map((m) => `- ${m.text} [${m.source}]`),
      '',
      'COSTUME & WARDROBE REQUIREMENTS:',
      ...b.costumeRequirements.map((c) => `- ${c.text} [${c.source}]`),
      b.wardrobeNotes ? `\nWardrobe Supervisor Notes: ${b.wardrobeNotes}` : '',
    ].filter((line) => line !== undefined);

    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
    setCopiedChar(b.characterName);
    setTimeout(() => setCopiedChar(null), 2000);
  };

  const handleRegenerateAll = () => {
    if (selectedBreakdown && selectedBreakdown.hasCustomizations) {
      onResetOverride(selectedBreakdown.characterName);
    }
    setRegenPulse(true);
    setTimeout(() => setRegenPulse(false), 700);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#202020] text-xs select-none">
      {/* Left Sidebar: Character Tag & Script Roster */}
      <div className="w-[315px] flex-shrink-0 border-r border-[#363636] bg-[#1a1a1a] flex flex-col min-h-0">
        <div className="p-3 border-b border-[#303030] bg-[#212121] space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-200 text-xs">
              Script Character Tags
            </span>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {taggedCharacterCount} tagged · {breakdowns.length} total
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search characters, traits, or wardrobe..."
              className="w-full bg-[#151515] text-gray-200 pl-8 pr-7 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-0.5 p-0.5 bg-[#151515] rounded border border-[#343434]">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'tagged', label: 'Tagged' },
                { id: 'wardrobe', label: 'Wardrobe' },
                { id: 'voice_over', label: 'V.O.' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`flex-1 min-w-fit px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterMode === tab.id
                    ? 'bg-[#2c2c2c] text-[#ff8000]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Character List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#282828]">
          {filteredBreakdowns.length === 0 ? (
            <div className="p-6 text-center text-gray-400 space-y-2">
              <p className="font-medium text-gray-300">No characters found</p>
              <p className="text-[11px] text-gray-500">
                Tag characters in the script Inspector or adjust your search filter.
              </p>
            </div>
          ) : (
            filteredBreakdowns.map((item) => {
              const isSelected = selectedBreakdown?.characterName === item.characterName;
              return (
                <button
                  key={item.characterName}
                  type="button"
                  onClick={() => setSelectedCharName(item.characterName)}
                  className={`w-full text-left px-3 py-2.5 transition-colors flex items-start gap-2.5 ${
                    isSelected ? 'bg-[#2c251d]' : 'hover:bg-[#232323]'
                  }`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.characterName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded object-cover border border-[#444] shrink-0"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded flex items-center justify-center font-bold text-[11px] shrink-0 border border-[#3c3c3c] text-black"
                      style={{ backgroundColor: item.color || '#ff8000' }}
                    >
                      {getInitials(item.characterName)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-semibold truncate ${
                          isSelected ? 'text-[#ff8000]' : 'text-gray-100'
                        }`}
                      >
                        {item.characterName}
                      </span>
                      <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                        {item.sceneNumbers.length} sc
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                      {item.actorName || 'Cast unassigned'}
                      <span aria-hidden="true"> · </span>
                      <span className={item.isTaggedInScript ? 'text-emerald-400' : 'text-gray-500'}>
                        {item.isTaggedInScript ? 'Tagged' : 'Script char'}
                      </span>
                      {item.voiceOverLines > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="text-violet-300 font-mono">
                            {item.voiceOverLines} V.O.
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-500 mt-1 tabular-nums">
                      {item.traits.length} traits · {item.motivations.length} goals ·{' '}
                      {item.costumeRequirements.length} wardrobe
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Breakdown Document View */}
      <div className="flex-1 overflow-y-auto bg-[#202020]">
        {!selectedBreakdown ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
            <Sparkles className="w-10 h-10 text-gray-600" />
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-semibold text-gray-200">
                No Character Tags in Script Yet
              </h3>
              <p className="text-xs text-gray-500">
                Tag characters in the Authoring Inspector or add character elements to the screenplay to automatically generate traits, motivations, and costume requirements.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Character Sheet Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#343434]">
              <div className="flex items-center gap-4 min-w-0">
                {selectedBreakdown.image ? (
                  <img
                    src={selectedBreakdown.image}
                    alt={selectedBreakdown.characterName}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-md object-cover border border-[#444] shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-md flex items-center justify-center font-bold text-base shrink-0 border border-[#3e3e3e] text-black"
                    style={{ backgroundColor: selectedBreakdown.color || '#ff8000' }}
                  >
                    {getInitials(selectedBreakdown.characterName)}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-amber-400">
                    {selectedBreakdown.isTaggedInScript
                      ? 'Auto-Generated from Script Character Tag'
                      : 'Detected Script Character (Not Yet Tagged)'}
                  </div>
                  <h2 className="text-lg font-bold text-gray-100 tracking-tight truncate">
                    {selectedBreakdown.characterName}
                  </h2>
                  <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span>
                      Cast:{' '}
                      <span className="text-gray-200 font-medium">
                        {selectedBreakdown.actorName || 'Unassigned'}
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Scenes:{' '}
                      <span className="text-gray-200 font-mono tabular-nums">
                        {selectedBreakdown.sceneNumbers.length > 0
                          ? selectedBreakdown.sceneNumbers.map((n) => `#${n}`).join(', ')
                          : 'None'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!selectedBreakdown.isTaggedInScript && onCreateCharacterTag && (
                  <button
                    type="button"
                    onClick={() =>
                      onCreateCharacterTag(
                        selectedBreakdown.characterName,
                        selectedBreakdown.sceneIds
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    <TagIcon className="w-3.5 h-3.5" />
                    <span>Tag in Script</span>
                  </button>
                )}

                {selectedBreakdown.castMember && onViewActorInRoster && (
                  <button
                    type="button"
                    onClick={() => onViewActorInRoster(selectedBreakdown.castMember!.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#343434] text-gray-200 rounded border border-[#424242] transition-colors whitespace-nowrap shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Cast Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyBreakdown(selectedBreakdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#343434] text-gray-200 rounded border border-[#424242] transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedChar === selectedBreakdown.characterName ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Sheet</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Copy Breakdown</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#343434] text-amber-300 rounded border border-[#424242] transition-colors whitespace-nowrap shrink-0"
                  title="Refresh character traits, motivations, and wardrobe requirements from latest script tags"
                >
                  {selectedBreakdown.hasCustomizations ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset & Regenerate</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${regenPulse ? 'animate-spin' : ''}`}
                      />
                      <span>Regenerate from Tags</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4-Column Summary Metric Strip (Tabular Figures, Hairline Dividers) */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#323232] bg-[#1a1a1a] border border-[#323232] rounded">
              <div className="p-3.5">
                <div className="text-[11px] text-gray-400">Tagged Scenes</div>
                <div className="text-base font-semibold text-gray-100 mt-0.5 font-mono tabular-nums">
                  {selectedBreakdown.sceneNumbers.length}{' '}
                  {selectedBreakdown.sceneNumbers.length === 1 ? 'Scene' : 'Scenes'}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-gray-400">Scripted Lines</div>
                <div className="text-base font-semibold text-gray-100 mt-0.5 font-mono tabular-nums">
                  {selectedBreakdown.speakingLines} Lines
                </div>
                {selectedBreakdown.voiceOverLines > 0 && (
                  <div className="text-[10px] font-mono tabular-nums text-violet-300 mt-0.5">
                    {selectedBreakdown.dialogueLines} Dialogue · {selectedBreakdown.voiceOverLines} V.O.
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-gray-400">Story Days</div>
                <div className="text-base font-semibold text-amber-400 mt-0.5 font-mono tabular-nums">
                  {selectedBreakdown.storyDays.length > 0
                    ? `Days ${selectedBreakdown.storyDays.join(', ')}`
                    : 'Unscheduled'}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-gray-400">Costume Continuity Looks</div>
                <div className="text-base font-semibold text-cyan-400 mt-0.5 font-mono tabular-nums">
                  {selectedBreakdown.costumeLooks.length}{' '}
                  {selectedBreakdown.costumeLooks.length === 1 ? 'Look' : 'Looks'}
                </div>
              </div>
            </div>

            {/* 2-Column Core Breakdown: 01. Traits & 02. Motivations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* 01. Character Traits */}
              <section className="bg-[#1b1b1b] border border-[#333333] rounded flex flex-col">
                <div className="px-4 py-3 border-b border-[#2f2f2f] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-gray-100">
                      01. Character Traits
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {selectedBreakdown.traits.length} identified
                  </span>
                </div>

                <div className="p-4 flex-1 space-y-2.5">
                  {selectedBreakdown.traits.map((trait) => (
                    <div
                      key={trait.id}
                      className="group flex items-start justify-between gap-2 pb-2.5 border-b border-[#272727] last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-gray-100 leading-relaxed">{trait.text}</p>
                        <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2">
                          <span>{trait.source}</span>
                          {trait.sceneIds.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5">
                                {trait.sceneIds.map((sid) => {
                                  const sc = scenes.find((s) => s.id === sid);
                                  if (!sc) return null;
                                  return (
                                    <button
                                      key={sid}
                                      type="button"
                                      onClick={() => onSelectScene(sid)}
                                      className="text-amber-400 hover:text-amber-300 font-mono tabular-nums hover:underline"
                                    >
                                      Sc. {sc.sceneNumber}
                                    </button>
                                  );
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem('traits', trait)}
                        className="p-1 text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Dismiss trait"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddCustomItem('customTraits', newTraitText, () =>
                      setNewTraitText('')
                    );
                  }}
                  className="px-4 py-2.5 bg-[#171717] border-t border-[#2d2d2d] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newTraitText}
                    onChange={(e) => setNewTraitText(e.target.value)}
                    placeholder="Add character trait..."
                    className="flex-1 bg-[#222222] text-gray-200 px-2.5 py-1.5 rounded border border-[#383838] text-xs focus:outline-none focus:border-[#ff8000]"
                  />
                  <button
                    type="submit"
                    disabled={!newTraitText.trim()}
                    className="px-2.5 py-1.5 bg-[#2d2d2d] hover:bg-[#3a3a3a] disabled:opacity-40 text-gray-200 rounded border border-[#444] text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3 h-3 text-[#ff8000]" />
                    <span>Add</span>
                  </button>
                </form>
              </section>

              {/* 02. Motivations & Dramatic Objectives */}
              <section className="bg-[#1b1b1b] border border-[#333333] rounded flex flex-col">
                <div className="px-4 py-3 border-b border-[#2f2f2f] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-gray-100">
                      02. Motivations & Objectives
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {selectedBreakdown.motivations.length} mapped
                  </span>
                </div>

                <div className="p-4 flex-1 space-y-2.5">
                  {selectedBreakdown.motivations.map((mot) => (
                    <div
                      key={mot.id}
                      className="group flex items-start justify-between gap-2 pb-2.5 border-b border-[#272727] last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-gray-100 leading-relaxed">{mot.text}</p>
                        <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2">
                          <span>{mot.source}</span>
                          {mot.sceneIds.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5">
                                {mot.sceneIds.map((sid) => {
                                  const sc = scenes.find((s) => s.id === sid);
                                  if (!sc) return null;
                                  return (
                                    <button
                                      key={sid}
                                      type="button"
                                      onClick={() => onSelectScene(sid)}
                                      className="text-emerald-400 hover:text-emerald-300 font-mono tabular-nums hover:underline"
                                    >
                                      Sc. {sc.sceneNumber}
                                    </button>
                                  );
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem('motivations', mot)}
                        className="p-1 text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Dismiss motivation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddCustomItem('customMotivations', newMotivationText, () =>
                      setNewMotivationText('')
                    );
                  }}
                  className="px-4 py-2.5 bg-[#171717] border-t border-[#2d2d2d] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newMotivationText}
                    onChange={(e) => setNewMotivationText(e.target.value)}
                    placeholder="Add motivation or scene objective..."
                    className="flex-1 bg-[#222222] text-gray-200 px-2.5 py-1.5 rounded border border-[#383838] text-xs focus:outline-none focus:border-[#ff8000]"
                  />
                  <button
                    type="submit"
                    disabled={!newMotivationText.trim()}
                    className="px-2.5 py-1.5 bg-[#2d2d2d] hover:bg-[#3a3a3a] disabled:opacity-40 text-gray-200 rounded border border-[#444] text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3 h-3 text-[#ff8000]" />
                    <span>Add</span>
                  </button>
                </form>
              </section>
            </div>

            {/* 03. Costume & Wardrobe Requirements (Full Width) */}
            <section className="bg-[#1b1b1b] border border-[#333333] rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2f2f2f] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-gray-100">
                    03. Costume & Wardrobe Requirements
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {selectedBreakdown.costumeRequirements.length} requirements ·{' '}
                  {selectedBreakdown.costumeLooks.length} continuity{' '}
                  {selectedBreakdown.costumeLooks.length === 1 ? 'look' : 'looks'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#2d2d2d]">
                {/* Left 7 cols: Requirement checklist + custom add */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="p-4 flex-1 space-y-2.5">
                    {selectedBreakdown.costumeRequirements.map((costume) => (
                      <div
                        key={costume.id}
                        className="group flex items-start justify-between gap-2 pb-2.5 border-b border-[#272727] last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs text-gray-100 leading-relaxed">
                            {costume.text}
                          </p>
                          <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2">
                            <span>{costume.source}</span>
                            {costume.sceneIds.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1.5">
                                  {costume.sceneIds.map((sid) => {
                                    const sc = scenes.find((s) => s.id === sid);
                                    if (!sc) return null;
                                    return (
                                      <button
                                        key={sid}
                                        type="button"
                                        onClick={() => onSelectScene(sid)}
                                        className="text-cyan-400 hover:text-cyan-300 font-mono tabular-nums hover:underline"
                                      >
                                        Sc. {sc.sceneNumber}
                                      </button>
                                    );
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('costumes', costume)}
                          className="p-1 text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Dismiss costume requirement"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddCustomItem('customCostumes', newCostumeText, () =>
                        setNewCostumeText('')
                      );
                    }}
                    className="px-4 py-2.5 bg-[#171717] border-t border-[#2d2d2d] flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={newCostumeText}
                      onChange={(e) => setNewCostumeText(e.target.value)}
                      placeholder="Add costume piece, stunt double, or sizing note..."
                      className="flex-1 bg-[#222222] text-gray-200 px-2.5 py-1.5 rounded border border-[#383838] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                    <button
                      type="submit"
                      disabled={!newCostumeText.trim()}
                      className="px-2.5 py-1.5 bg-[#2d2d2d] hover:bg-[#3a3a3a] disabled:opacity-40 text-gray-200 rounded border border-[#444] text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3 h-3 text-[#ff8000]" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>

                {/* Right 5 cols: Continuity Look Breakdown + Wardrobe Notes */}
                <div className="lg:col-span-5 p-4 space-y-4 bg-[#181818]">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-300 mb-2">
                      Continuity Looks by Story Day
                    </div>
                    {selectedBreakdown.costumeLooks.length === 0 ? (
                      <p className="text-[11px] text-gray-500">
                        No scenes scheduled yet for look breakdown.
                      </p>
                    ) : (
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-[#2e2e2e] text-gray-400">
                            <th className="py-1.5 pr-2 font-medium">Day</th>
                            <th className="py-1.5 pr-2 font-medium">Setting</th>
                            <th className="py-1.5 font-medium text-right">Scenes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#242424]">
                          {selectedBreakdown.costumeLooks.map((look, idx) => (
                            <tr key={look.key}>
                              <td className="py-2 pr-2 font-mono tabular-nums text-amber-300">
                                Look {idx + 1} · D{look.storyDay}
                              </td>
                              <td className="py-2 pr-2 text-gray-300">
                                <div>
                                  {look.intExt} / {look.dayNight}
                                </div>
                                {look.wardrobeTags.length > 0 && (
                                  <div className="text-[10px] text-cyan-400 truncate max-w-[140px]">
                                    {look.wardrobeTags.join(', ')}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums">
                                {look.sceneIds.map((sid, sIdx) => (
                                  <React.Fragment key={sid}>
                                    {sIdx > 0 && <span className="text-gray-500">, </span>}
                                    <button
                                      type="button"
                                      onClick={() => onSelectScene(sid)}
                                      className="text-gray-200 hover:text-[#ff8000] hover:underline"
                                    >
                                      #{look.sceneNumbers[sIdx]}
                                    </button>
                                  </React.Fragment>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
                      Costume Supervisor & Fitting Notes
                    </label>
                    <textarea
                      rows={3}
                      value={selectedBreakdown.wardrobeNotes}
                      onChange={(e) => handleWardrobeNotesChange(e.target.value)}
                      placeholder="Measurements, aging/distressing instructions, quick-change timings..."
                      className="w-full bg-[#121212] text-gray-200 p-2.5 rounded border border-[#343434] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 04. Cross-Referenced Script Tags & Textual Evidence */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <section className="lg:col-span-5 bg-[#1b1b1b] border border-[#333333] rounded p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                    <h3 className="text-xs font-semibold text-gray-100">
                      Co-Occurring Scene Tags
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {selectedBreakdown.linkedTags.length} tags
                  </span>
                </div>

                {selectedBreakdown.linkedTags.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    No prop, wardrobe, vehicle, or VFX tags share scenes with this character yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#282828]">
                    {selectedBreakdown.linkedTags.map((tag) => {
                      const sharedScenes = tag.sceneIds
                        .map((sid) => scenes.find((s) => s.id === sid))
                        .filter((s): s is Scene => Boolean(s));
                      return (
                        <div
                          key={tag.id}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="text-gray-100 font-medium">{tag.name}</span>
                            <div className="text-[11px] text-gray-400">
                              <span className="capitalize">{tag.category}</span>
                              {sharedScenes.length > 0 && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  <span className="font-mono tabular-nums">
                                    Sc. {sharedScenes.map((s) => s.sceneNumber).join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="lg:col-span-7 bg-[#1b1b1b] border border-[#333333] rounded p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-gray-100">
                      Script Evidence Excerpts
                    </h3>
                  </div>
                  {selectedBreakdown.sceneIds[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectScene(selectedBreakdown.sceneIds[0])}
                      className="text-[11px] text-[#ff8000] hover:underline flex items-center gap-1"
                    >
                      <span>Open in Script</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {selectedBreakdown.keyExcerpts.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    No action or dialogue blocks extracted for this character yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#282828]">
                    {selectedBreakdown.keyExcerpts.map((ex, idx) => (
                      <div key={idx} className="py-2 space-y-0.5">
                        <div className="text-[10px] font-mono flex items-center gap-1.5">
                          <span
                            className={
                              ex.type.includes('VOICE_OVER')
                                ? 'px-1.5 py-0.2 rounded-xs bg-violet-950/80 border border-violet-600/50 text-violet-300 font-semibold'
                                : 'text-gray-400'
                            }
                          >
                            {ex.type}
                          </span>
                          {ex.sceneNumber && (
                            <span className="text-gray-400">· Scene {ex.sceneNumber}</span>
                          )}
                        </div>
                        <p
                          className={`text-xs leading-relaxed font-mono ${
                            ex.type.includes('VOICE_OVER') ? 'text-violet-100 italic' : 'text-gray-200'
                          }`}
                        >
                          {ex.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
