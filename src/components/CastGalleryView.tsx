import React, { useMemo, useState } from 'react';
import {
  CastCrewMember,
  Scene,
  StoryCharacter,
  Tag,
} from '../types/story';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Flag,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
  Edit3,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

interface CastGalleryViewProps {
  members: CastCrewMember[];
  characters: StoryCharacter[];
  tags: Tag[];
  scenes: Scene[];
  unmappedScriptCastCount: number;
  onImportScriptCast: () => void;
  onUpdateMember: (member: CastCrewMember) => void;
  onEditMember: (member: CastCrewMember) => void;
  onSelectMemberInRoster: (memberId: string) => void;
  onOpenCharacterBreakdown: () => void;
  onSelectScene: (sceneId: string) => void;
  onAddCastMember: () => void;
}

type PortraitFilter = 'all' | 'with_portrait' | 'missing_portrait';
type GallerySort = 'name' | 'character' | 'scenes' | 'call_time';

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const normalizeName = (val?: string) =>
  (val || '').replace(/\(.*?\)/g, '').trim().toUpperCase();

interface ResolvedPortrait {
  src?: string;
  sourceLabel: 'Imported Headshot' | 'Character Tag' | 'Script Profile' | 'Monogram';
  accentColor: string;
  matchedCharacterName?: string;
}

export const resolveCastMemberPortrait = (
  member: CastCrewMember,
  tags: Tag[],
  characters: StoryCharacter[]
): ResolvedPortrait => {
  const charTarget = normalizeName(member.characterName);
  const roleNormalized = normalizeName(member.role);

  const matchedTag = tags.find((t) => {
    if (t.category !== 'character') return false;
    const tagNorm = normalizeName(t.name);
    if (!tagNorm) return false;
    if (charTarget && tagNorm === charTarget) return true;
    if (roleNormalized && roleNormalized.includes(tagNorm)) return true;
    return false;
  });

  const matchedChar = characters.find((c) => {
    const chNorm = normalizeName(c.name);
    if (!chNorm) return false;
    if (charTarget && chNorm === charTarget) return true;
    if (roleNormalized && roleNormalized.includes(chNorm)) return true;
    return false;
  });

  const accentColor = matchedTag?.color || matchedChar?.color || '#ff8000';
  const matchedCharacterName =
    member.characterName?.trim() || matchedTag?.name || matchedChar?.name;

  if (member.avatarUrl && member.avatarUrl.trim()) {
    return {
      src: member.avatarUrl.trim(),
      sourceLabel: 'Imported Headshot',
      accentColor,
      matchedCharacterName,
    };
  }

  if (matchedTag?.image && matchedTag.image.trim()) {
    return {
      src: matchedTag.image.trim(),
      sourceLabel: 'Character Tag',
      accentColor,
      matchedCharacterName,
    };
  }

  if (matchedChar?.image && matchedChar.image.trim()) {
    return {
      src: matchedChar.image.trim(),
      sourceLabel: 'Script Profile',
      accentColor,
      matchedCharacterName,
    };
  }

  return {
    src: undefined,
    sourceLabel: 'Monogram',
    accentColor,
    matchedCharacterName,
  };
};

export const CastGalleryView: React.FC<CastGalleryViewProps> = ({
  members,
  characters,
  tags,
  scenes,
  unmappedScriptCastCount,
  onImportScriptCast,
  onUpdateMember,
  onEditMember,
  onSelectMemberInRoster,
  onOpenCharacterBreakdown,
  onSelectScene,
  onAddCastMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [portraitFilter, setPortraitFilter] = useState<PortraitFilter>('all');
  const [sortBy, setSortBy] = useState<GallerySort>('name');
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const castEntries = useMemo(() => {
    return members
      .filter((m) => m.category === 'cast')
      .map((member) => {
        const resolved = resolveCastMemberPortrait(member, tags, characters);
        const effectiveSrc =
          resolved.src && !failedUrls[resolved.src] ? resolved.src : undefined;
        return {
          member,
          resolved: {
            ...resolved,
            src: effectiveSrc,
            sourceLabel: effectiveSrc ? resolved.sourceLabel : ('Monogram' as const),
          },
        };
      });
  }, [members, tags, characters, failedUrls]);

  const counts = useMemo(() => {
    const total = castEntries.length;
    const withPortrait = castEntries.filter((e) => Boolean(e.resolved.src)).length;
    return {
      total,
      withPortrait,
      missingPortrait: total - withPortrait,
    };
  }, [castEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = castEntries.filter(({ member, resolved }) => {
      if (portraitFilter === 'with_portrait' && !resolved.src) return false;
      if (portraitFilter === 'missing_portrait' && resolved.src) return false;
      if (!q) return true;
      return (
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        (resolved.matchedCharacterName || '').toLowerCase().includes(q) ||
        (member.agencyOrCompany || '').toLowerCase().includes(q) ||
        (member.unionStatus || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'character') {
        return (a.resolved.matchedCharacterName || a.member.role).localeCompare(
          b.resolved.matchedCharacterName || b.member.role
        );
      }
      if (sortBy === 'scenes') {
        return b.member.linkedSceneIds.length - a.member.linkedSceneIds.length;
      }
      if (sortBy === 'call_time') {
        return (a.member.callTime || '99:99').localeCompare(b.member.callTime || '99:99');
      }
      return a.member.name.localeCompare(b.member.name);
    });
  }, [castEntries, searchQuery, portraitFilter, sortBy]);

  const handleImportHeadshot = (member: CastCrewMember, file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateMember({
          ...member,
          avatarUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImportedHeadshot = (member: CastCrewMember) => {
    onUpdateMember({
      ...member,
      avatarUrl: undefined,
    });
  };

  const renderAvailability = (status: CastCrewMember['availabilityStatus']) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Confirmed</span>
          </span>
        );
      case 'Tentative':
        return (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Tentative</span>
          </span>
        );
      case 'On Hold':
        return (
          <span className="inline-flex items-center gap-1 text-rose-400">
            <PauseCircle className="w-3 h-3 shrink-0" />
            <span>On Hold</span>
          </span>
        );
      case 'Wrapped':
        return (
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Flag className="w-3 h-3 shrink-0" />
            <span>Wrapped</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#202020]">
      {/* Gallery Controls & Filter Bar */}
      <div className="bg-[#232323] border-b border-[#363636] px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search actor, character, union, or agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#171717] text-gray-200 pl-8 pr-7 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center p-0.5 bg-[#171717] rounded border border-[#383838]">
            <button
              onClick={() => setPortraitFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                portraitFilter === 'all'
                  ? 'bg-[#2e2e2e] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Cast ({counts.total})
            </button>
            <button
              onClick={() => setPortraitFilter('with_portrait')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                portraitFilter === 'with_portrait'
                  ? 'bg-[#2e2e2e] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Portraits ({counts.withPortrait})
            </button>
            <button
              onClick={() => setPortraitFilter('missing_portrait')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                portraitFilter === 'missing_portrait'
                  ? 'bg-[#2e2e2e] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Needs Headshot ({counts.missingPortrait})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unmappedScriptCastCount > 0 && (
            <button
              onClick={onImportScriptCast}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#292117] hover:bg-[#352a1c] text-amber-300 rounded border border-amber-700/50 text-xs transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sync Script Cast (+{unmappedScriptCastCount})</span>
            </button>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GallerySort)}
            className="bg-[#171717] text-gray-200 px-2.5 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
          >
            <option value="name">Sort: Actor Name (A–Z)</option>
            <option value="character">Sort: Character Name</option>
            <option value="scenes">Sort: Scene Count</option>
            <option value="call_time">Sort: Call Time</option>
          </select>
        </div>
      </div>

      {/* Scrollable Circular Portrait Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400 space-y-3">
            <Users className="w-10 h-10 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-200">
                {counts.total === 0
                  ? 'No cast members in the directory yet'
                  : 'No cast portraits match your filters'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                {counts.total === 0
                  ? 'Import principal cast from the screenplay or add a cast member to view their circular headshots and character tag portraits.'
                  : 'Try clearing the search query or switching the portrait filter.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {counts.total === 0 ? (
                <>
                  {unmappedScriptCastCount > 0 && (
                    <button
                      onClick={onImportScriptCast}
                      className="px-4 py-2 bg-[#2c2419] hover:bg-[#382d1f] text-amber-300 border border-amber-700/50 font-semibold rounded transition-colors"
                    >
                      Sync Script Cast (+{unmappedScriptCastCount})
                    </button>
                  )}
                  <button
                    onClick={onAddCastMember}
                    className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Cast Member</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPortraitFilter('all');
                  }}
                  className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-200 rounded border border-[#444] transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-[1440px] mx-auto">
            {filteredEntries.map(({ member, resolved }) => {
              const linkedScenes = member.linkedSceneIds
                .map((id) => scenes.find((s) => s.id === id))
                .filter((s): s is Scene => Boolean(s));

              return (
                <div
                  key={member.id}
                  className="bg-[#181818] border border-[#323232] hover:border-[#4b4b4b] rounded-lg p-5 flex flex-col items-center text-center transition-colors"
                >
                  {/* Circular Portrait Container */}
                  <div className="relative mb-4">
                    <div
                      className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-[#232323] border-2"
                      style={{ borderColor: resolved.accentColor }}
                    >
                      {resolved.src ? (
                        <img
                          src={resolved.src}
                          alt={`${member.name}${resolved.matchedCharacterName ? ` as ${resolved.matchedCharacterName}` : ''}`}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (resolved.src) {
                              setFailedUrls((prev) => ({
                                ...prev,
                                [resolved.src!]: true,
                              }));
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-2xl font-bold tracking-wide select-none"
                          style={{ color: resolved.accentColor }}
                        >
                          {getInitials(member.name)}
                        </span>
                      )}
                    </div>

                    {/* Direct Headshot Import Button */}
                    <label
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#242424] hover:bg-[#ff7700] text-gray-200 hover:text-black border border-[#444] flex items-center justify-center cursor-pointer shadow-md transition-colors"
                      title="Import headshot image"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImportHeadshot(member, file);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {member.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => handleClearImportedHeadshot(member)}
                        className="absolute top-0 right-0 w-6 h-6 rounded-full bg-[#242424] hover:bg-rose-600 text-gray-300 hover:text-white border border-[#444] flex items-center justify-center shadow transition-colors"
                        title="Remove imported headshot (falls back to character tag if available)"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Actor & Character Identity */}
                  <h3 className="text-sm font-bold text-gray-100 leading-snug">
                    {member.name}
                  </h3>
                  <p className="text-xs font-semibold text-amber-400 mt-0.5 truncate max-w-full">
                    {resolved.matchedCharacterName || member.role}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-full">
                    {member.role}
                    {member.unionStatus ? ` · ${member.unionStatus}` : ''}
                  </p>

                  {/* Clean Unboxed Metadata Row */}
                  <div className="mt-3 pt-3 border-t border-[#282828] w-full flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-gray-400 tabular-nums">
                    <span>{resolved.sourceLabel}</span>
                    <span aria-hidden="true">·</span>
                    {renderAvailability(member.availabilityStatus)}
                    <span aria-hidden="true">·</span>
                    <span>
                      {linkedScenes.length} {linkedScenes.length === 1 ? 'scene' : 'scenes'}
                    </span>
                  </div>

                  {/* Call Window & Assigned Scenes */}
                  <div className="mt-2 text-[11px] text-gray-400 font-mono tabular-nums">
                    Call {member.callTime || '07:00'}–{member.wrapTime || '19:00'}
                    {member.scheduledDays.length > 0
                      ? ` · ${member.scheduledDays[0]}${
                          member.scheduledDays.length > 1
                            ? ` +${member.scheduledDays.length - 1}`
                            : ''
                        }`
                      : ''}
                  </div>

                  {linkedScenes.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1">
                      {linkedScenes.slice(0, 5).map((sc) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => onSelectScene(sc.id)}
                          className="px-1.5 py-0.5 bg-[#222222] hover:bg-[#2f2f2f] text-gray-300 rounded border border-[#353535] text-[10px] font-mono tabular-nums transition-colors"
                          title={sc.heading}
                        >
                          Sc. {sc.sceneNumber}
                        </button>
                      ))}
                      {linkedScenes.length > 5 && (
                        <span className="text-[10px] text-gray-500 font-mono tabular-nums px-1">
                          +{linkedScenes.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="mt-auto pt-4 w-full flex items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onSelectMemberInRoster(member.id)}
                      className="flex-1 py-1.5 px-2 bg-[#232323] hover:bg-[#2d2d2d] text-gray-200 rounded border border-[#383838] font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                      <span>Roster</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCharacterBreakdown()}
                      className="flex-1 py-1.5 px-2 bg-[#232323] hover:bg-[#2d2d2d] text-amber-300 rounded border border-[#383838] font-medium transition-colors whitespace-nowrap"
                    >
                      Breakdown
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditMember(member)}
                      className="py-1.5 px-2.5 bg-[#232323] hover:bg-[#2d2d2d] text-gray-200 rounded border border-[#383838] transition-colors"
                      title="Edit Cast Member"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
