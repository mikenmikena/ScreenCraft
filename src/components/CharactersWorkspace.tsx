import React, { useMemo, useState } from 'react';
import {
  CharacterBio,
  CharacterBreakdownOverride,
  CharacterRelationshipEdge,
  ProjectBible,
  StoryCharacter,
  StoryProject,
} from '../types/story';
import { CharacterConnectionsChart } from './CharacterConnectionsChart';
import {
  Users,
  BookOpen,
  Network,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Sparkles,
  Check,
  Film,
  Tag as TagIcon,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Maximize2,
} from 'lucide-react';
import { processUploadedImageFile } from '../utils/imageUpload';

interface CharactersWorkspaceProps {
  project: StoryProject;
  initialSubView?: 'details' | 'bios' | 'connections';
  onUpdateCharacters: (characters: StoryCharacter[]) => void;
  onUpdateCharacterBreakdown: (override: CharacterBreakdownOverride) => void;
  onResetCharacterBreakdown: (characterName: string) => void;
  onUpdateProjectBible: (bible: ProjectBible) => void;
  onUpdateRelationships: (relationships: CharacterRelationshipEdge[]) => void;
  onUpdateNodePositions: (positions: Record<string, { x: number; y: number }>) => void;
  onUpdateEdgePositions: (positions: Record<string, { x: number; y: number }>) => void;
  onCreateCharacterTag: (name: string, sceneIds: string[]) => void;
  onSelectScene: (sceneId: string) => void;
}

const CHARACTER_COLORS = [
  '#f59e0b',
  '#06b6d4',
  '#10b981',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
  '#3b82f6',
  '#84cc16',
];

const ROLE_TYPES: CharacterBio['roleType'][] = [
  'Lead',
  'Supporting',
  'Antagonist',
  'Featured',
  'Ensemble',
];

const createEmptyBible = (project: StoryProject): ProjectBible => ({
  logline: project.projectBible?.logline || '',
  genre: project.projectBible?.genre || 'Feature Screenplay',
  formatLabel: project.projectBible?.formatLabel || 'Screenplay',
  targetRuntime: project.projectBible?.targetRuntime || '110 min',
  themes: project.projectBible?.themes || [],
  pitchSummary: project.projectBible?.pitchSummary || '',
  characterBios: project.projectBible?.characterBios || [],
  pitchDocs: project.projectBible?.pitchDocs || [],
  researchNotes: project.projectBible?.researchNotes || [],
});

export const CharactersWorkspace: React.FC<CharactersWorkspaceProps> = ({
  project,
  initialSubView = 'details',
  onUpdateCharacters,
  onUpdateCharacterBreakdown,
  onResetCharacterBreakdown,
  onUpdateProjectBible,
  onUpdateRelationships,
  onUpdateNodePositions,
  onUpdateEdgePositions,
  onCreateCharacterTag,
  onSelectScene,
}) => {
  const [subView, setSubView] = useState<'details' | 'bios' | 'connections'>(initialSubView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharName, setSelectedCharName] = useState<string>(
    () => project.characters[0]?.name || ''
  );
  const [propsDraft, setPropsDraft] = useState('');
  const [isAddingChar, setIsAddingChar] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharActor, setNewCharActor] = useState('');
  const [newCharRole, setNewCharRole] = useState<CharacterBio['roleType']>('Supporting');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharImage, setNewCharImage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOverPortrait, setIsDragOverPortrait] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; caption: string } | null>(null);

  React.useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  const bible = useMemo(() => createEmptyBible(project), [project]);

  const mergedCharacterNames = useMemo(() => {
    const set = new Set<string>();
    project.characters.forEach((c) => {
      if (c.name.trim()) set.add(c.name.trim().toUpperCase());
    });
    bible.characterBios.forEach((b) => {
      if (b.characterName.trim()) set.add(b.characterName.trim().toUpperCase());
    });
    return Array.from(set);
  }, [project.characters, bible.characterBios]);

  const characterProfiles = useMemo(() => {
    return mergedCharacterNames
      .map((upperName, idx) => {
        const charRec = project.characters.find(
          (c) => c.name.trim().toUpperCase() === upperName
        );
        const bioRec = bible.characterBios.find(
          (b) => b.characterName.trim().toUpperCase() === upperName
        );
        const breakdownRec = (project.characterBreakdowns || []).find(
          (b) => b.characterName.trim().toUpperCase() === upperName
        );

        const matchedScenes = project.scenes.filter((sc) =>
          sc.characters.some((c) => c.trim().toUpperCase() === upperName)
        );
        let dialogueCount = 0;
        let voiceOverCount = 0;
        let currentSpeaker = '';
        project.elements.forEach((el) => {
          if (el.type === 'SCENE_HEADING' || el.type === 'ACTION' || el.type === 'TRANSITION') {
            currentSpeaker = '';
          } else if (el.type === 'CHARACTER') {
            currentSpeaker = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
          } else if (el.type === 'DIALOGUE') {
            if ((el.character || currentSpeaker).trim().toUpperCase() === upperName) {
              dialogueCount++;
            }
          } else if (el.type === 'VOICE_OVER') {
            if ((el.character || currentSpeaker).trim().toUpperCase() === upperName) {
              voiceOverCount++;
            }
          }
        });

        const tagEntry = project.tags.find(
          (t) => t.category === 'character' && t.name.trim().toUpperCase() === upperName
        );

        return {
          name: upperName,
          color: charRec?.color || CHARACTER_COLORS[idx % CHARACTER_COLORS.length],
          actor: charRec?.actor || '',
          description: charRec?.description || bioRec?.loglineSummary || '',
          image: charRec?.image || tagEntry?.image || '',
          referenceImages: charRec?.referenceImages || [],
          charRec,
          bioRec,
          breakdownRec,
          matchedScenes,
          scenesCount: charRec?.scenesCount || matchedScenes.length,
          dialogueCount,
          voiceOverCount,
          isTagged: Boolean(tagEntry),
        };
      })
      .filter((item) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.actor.toLowerCase().includes(q) ||
          (item.bioRec?.roleType || '').toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      });
  }, [mergedCharacterNames, project, bible.characterBios, searchQuery]);

  const activeProfile =
    characterProfiles.find(
      (p) => p.name.toUpperCase() === selectedCharName.trim().toUpperCase()
    ) || characterProfiles[0];

  React.useEffect(() => {
    if (activeProfile) {
      setPropsDraft((activeProfile.breakdownRec?.propsCarried || []).join(', '));
    }
  }, [activeProfile?.name, activeProfile?.breakdownRec]);

  const ensureStoryCharacter = (
    nameUpper: string,
    patch: Partial<StoryCharacter>
  ) => {
    const existing = project.characters.find(
      (c) => c.name.trim().toUpperCase() === nameUpper
    );
    if (existing) {
      onUpdateCharacters(
        project.characters.map((c) =>
          c.name.trim().toUpperCase() === nameUpper ? { ...c, ...patch } : c
        )
      );
    } else {
      const matchedScenes = project.scenes.filter((s) =>
        s.characters.some((ch) => ch.trim().toUpperCase() === nameUpper)
      );
      const newChar: StoryCharacter = {
        name: nameUpper,
        color: patch.color || CHARACTER_COLORS[project.characters.length % CHARACTER_COLORS.length],
        scenesCount: matchedScenes.length,
        speakingLines: 0,
        ...patch,
      };
      onUpdateCharacters([...project.characters, newChar]);
    }
  };

  const upsertCharacterBio = (nameUpper: string, patch: Partial<CharacterBio>) => {
    const exists = bible.characterBios.some(
      (b) => b.characterName.trim().toUpperCase() === nameUpper
    );
    const nextBios: CharacterBio[] = exists
      ? bible.characterBios.map((b) =>
          b.characterName.trim().toUpperCase() === nameUpper ? { ...b, ...patch } : b
        )
      : [
          ...bible.characterBios,
          {
            id: `bio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            characterName: nameUpper,
            roleType: patch.roleType || 'Supporting',
            loglineSummary: patch.loglineSummary || '',
            backstory: patch.backstory || '',
            arcStartToEnd: patch.arcStartToEnd || '',
            coreFlawOrTension: patch.coreFlawOrTension || '',
            visualNotes: patch.visualNotes || '',
          },
        ];
    onUpdateProjectBible({ ...bible, characterBios: nextBios });
  };

  const handleRenameCharacter = (oldUpper: string, nextRaw: string) => {
    const nextUpper = nextRaw.trim().toUpperCase();
    if (!nextUpper || nextUpper === oldUpper) return;
    onUpdateCharacters(
      project.characters.map((c) =>
        c.name.trim().toUpperCase() === oldUpper ? { ...c, name: nextUpper } : c
      )
    );
    if (bible.characterBios.some((b) => b.characterName.trim().toUpperCase() === oldUpper)) {
      onUpdateProjectBible({
        ...bible,
        characterBios: bible.characterBios.map((b) =>
          b.characterName.trim().toUpperCase() === oldUpper
            ? { ...b, characterName: nextUpper }
            : b
        ),
      });
    }
    setSelectedCharName(nextUpper);
  };

  const handleUploadPrimaryPortrait = async (nameUpper: string, file: File) => {
    try {
      setUploadError(null);
      const dataUrl = await processUploadedImageFile(file, 720);
      ensureStoryCharacter(nameUpper, { image: dataUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload image.');
    }
  };

  const handleUploadReferenceImages = async (
    nameUpper: string,
    existingRefs: string[],
    files: FileList | File[]
  ) => {
    try {
      setUploadError(null);
      const fileArr = Array.from(files).slice(0, 6);
      const encoded: string[] = [];
      for (const file of fileArr) {
        if (file.type.startsWith('image/')) {
          encoded.push(await processUploadedImageFile(file, 720));
        }
      }
      if (encoded.length === 0) {
        setUploadError('Please select valid image files (PNG, JPG, WebP, GIF).');
        return;
      }
      ensureStoryCharacter(nameUpper, {
        referenceImages: [...existingRefs, ...encoded],
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload reference image.');
    }
  };

  const handleCreateNewCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    const upper = newCharName.trim().toUpperCase();
    if (!upper) return;
    ensureStoryCharacter(upper, {
      actor: newCharActor.trim() || undefined,
      description: newCharDesc.trim() || undefined,
      image: newCharImage || undefined,
      color: CHARACTER_COLORS[project.characters.length % CHARACTER_COLORS.length],
    });
    upsertCharacterBio(upper, {
      roleType: newCharRole,
      loglineSummary: newCharDesc.trim(),
    });
    setSelectedCharName(upper);
    setNewCharName('');
    setNewCharActor('');
    setNewCharDesc('');
    setNewCharImage('');
    setIsAddingChar(false);
  };

  const handleDeleteCharacter = (nameUpper: string) => {
    onUpdateCharacters(
      project.characters.filter((c) => c.name.trim().toUpperCase() !== nameUpper)
    );
    onUpdateProjectBible({
      ...bible,
      characterBios: bible.characterBios.filter(
        (b) => b.characterName.trim().toUpperCase() !== nameUpper
      ),
    });
    const remaining = characterProfiles.filter((p) => p.name !== nameUpper);
    setSelectedCharName(remaining[0]?.name || '');
  };

  const handleSyncMissingBiosFromScript = () => {
    const existingSet = new Set(
      bible.characterBios.map((b) => b.characterName.trim().toUpperCase())
    );
    const additions: CharacterBio[] = project.characters
      .filter((c) => !existingSet.has(c.name.trim().toUpperCase()))
      .map((c, idx) => ({
        id: `bio-sync-${Date.now()}-${idx}`,
        characterName: c.name.toUpperCase(),
        roleType: c.scenesCount >= 3 ? 'Lead' : 'Supporting',
        loglineSummary:
          c.description ||
          `Appears across ${c.scenesCount} script scene(s) (${c.speakingLines} spoken lines).`,
        backstory: '',
        arcStartToEnd: '',
        coreFlawOrTension: '',
        visualNotes: '',
      }));
    if (additions.length > 0) {
      onUpdateProjectBible({
        ...bible,
        characterBios: [...bible.characterBios, ...additions],
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#18181a] text-gray-200 text-xs select-none">
      {/* Top Sub-Workspace Switcher */}
      <div className="bg-[#232326] border-b border-[#34343a] px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-gray-100">
            <Users className="w-4 h-4 text-[#ff8000]" />
            <span>Characters Workspace</span>
          </div>
          <span className="text-[11px] text-gray-400 tabular-nums">
            {characterProfiles.length} Characters · {bible.characterBios.length} Detailed Bios ·{' '}
            {(project.characterRelationships || []).length} Story Links
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-wrap items-center gap-0.5 p-0.5 bg-[#161618] border border-[#383840] rounded">
            <button
              type="button"
              onClick={() => setSubView('details')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                subView === 'details'
                  ? 'bg-[#2b2b30] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Character Details & Roster</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('bios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                subView === 'bios'
                  ? 'bg-[#2b2b30] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Detailed Character Bios</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('connections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                subView === 'connections'
                  ? 'bg-[#2b2b30] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Node Connections</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingChar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Character</span>
          </button>
        </div>
      </div>

      {/* Sub-View 3: Node-Based Character Connections with Moveable Connection Descriptors */}
      {subView === 'connections' ? (
        <CharacterConnectionsChart
          project={project}
          onUpdateRelationships={onUpdateRelationships}
          onUpdateNodePositions={onUpdateNodePositions}
          onUpdateEdgePositions={onUpdateEdgePositions}
          onSelectScene={onSelectScene}
          onOpenCharacterBios={() => setSubView('bios')}
        />
      ) : subView === 'bios' ? (
        /* Sub-View 2: Detailed Character Bios */
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#18181a]">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-100">
                Detailed Character Biographies & Dramatic Arcs
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Author deep character backstories, flaws, Start-to-End arcs, and visual/wardrobe direction synced across Authoring and Production.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncMissingBiosFromScript}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#26262a] hover:bg-[#323238] border border-[#3e3e46] text-amber-300 rounded font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Import Bios from Script Cast</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddingChar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Character Bio</span>
              </button>
            </div>
          </div>

          {bible.characterBios.length === 0 ? (
            <div className="max-w-3xl mx-auto bg-[#1f1f23] border border-[#33333a] rounded-lg p-10 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-sm font-semibold text-gray-200">
                No Detailed Character Bios Authored Yet
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Import your script cast automatically or create a new character biography to track backstory, internal flaw, and dramatic arc.
              </p>
              <button
                type="button"
                onClick={handleSyncMissingBiosFromScript}
                className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded"
              >
                Populate from Script Characters
              </button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bible.characterBios.map((bio) => {
                const charRec = project.characters.find(
                  (c) => c.name.trim().toUpperCase() === bio.characterName.trim().toUpperCase()
                );
                return (
                  <div
                    key={bio.id}
                    className="bg-[#1e1e22] border border-[#33333b] rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#2e2e36]">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <label
                          className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#151517] border border-[#3a3a44] flex items-center justify-center shrink-0 cursor-pointer group"
                          title="Upload character portrait"
                        >
                          {charRec?.image ? (
                            <img
                              src={charRec.image}
                              alt={bio.characterName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span
                              className="text-xs font-bold"
                              style={{ color: charRec?.color || '#f59e0b' }}
                            >
                              {bio.characterName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                void handleUploadPrimaryPortrait(
                                  bio.characterName.trim().toUpperCase(),
                                  file
                                );
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: charRec?.color || '#f59e0b' }}
                        />
                        <input
                          type="text"
                          value={bio.characterName}
                          onChange={(e) =>
                            upsertCharacterBio(bio.characterName, {
                              characterName: e.target.value.toUpperCase(),
                            })
                          }
                          className="bg-transparent text-sm font-bold text-gray-100 uppercase focus:outline-none focus:border-b focus:border-[#ff8000] min-w-0 flex-1 select-text"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={bio.roleType}
                          onChange={(e) =>
                            upsertCharacterBio(bio.characterName, {
                              roleType: e.target.value as CharacterBio['roleType'],
                            })
                          }
                          className="bg-[#161618] border border-[#383840] rounded px-2 py-1 text-[11px] text-amber-300 focus:outline-none focus:border-[#ff8000]"
                        >
                          {ROLE_TYPES.map((rt) => (
                            <option key={rt} value={rt}>
                              {rt}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProjectBible({
                              ...bible,
                              characterBios: bible.characterBios.filter((b) => b.id !== bio.id),
                            })
                          }
                          className="p-1 text-gray-500 hover:text-rose-400 rounded"
                          title="Delete character bio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                        Character Summary / Logline
                      </label>
                      <input
                        type="text"
                        value={bio.loglineSummary}
                        onChange={(e) =>
                          upsertCharacterBio(bio.characterName, {
                            loglineSummary: e.target.value,
                          })
                        }
                        placeholder="One-sentence dramatic summary of who they are..."
                        className="w-full bg-[#151517] border border-[#303038] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                        Detailed Backstory & History
                      </label>
                      <textarea
                        rows={3}
                        value={bio.backstory}
                        onChange={(e) =>
                          upsertCharacterBio(bio.characterName, { backstory: e.target.value })
                        }
                        placeholder="Formative events, family/institutional background, secret wounds..."
                        className="w-full bg-[#151517] border border-[#303038] rounded p-2 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                          Character Arc (Start → End)
                        </label>
                        <textarea
                          rows={2}
                          value={bio.arcStartToEnd}
                          onChange={(e) =>
                            upsertCharacterBio(bio.characterName, {
                              arcStartToEnd: e.target.value,
                            })
                          }
                          placeholder="How do they transform across Acts I–III?"
                          className="w-full bg-[#151517] border border-[#303038] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                          Core Flaw / Dramatic Tension
                        </label>
                        <textarea
                          rows={2}
                          value={bio.coreFlawOrTension}
                          onChange={(e) =>
                            upsertCharacterBio(bio.characterName, {
                              coreFlawOrTension: e.target.value,
                            })
                          }
                          placeholder="Blind spot, internal contradiction, or moral pressure..."
                          className="w-full bg-[#151517] border border-[#303038] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                        Visual, Wardrobe & Physical Notes
                      </label>
                      <input
                        type="text"
                        value={bio.visualNotes || ''}
                        onChange={(e) =>
                          upsertCharacterBio(bio.characterName, { visualNotes: e.target.value })
                        }
                        placeholder="Signature silhouette, costume palette, posture, speech cadence..."
                        className="w-full bg-[#151517] border border-[#303038] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Sub-View 1: Character Details & Roster Editor */
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Roster List */}
          <aside className="w-72 bg-[#1c1c1f] border-r border-[#323238] flex flex-col min-h-0 shrink-0">
            <div className="p-3 border-b border-[#2e2e34] space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search characters or actors..."
                  className="w-full bg-[#141416] border border-[#34343c] rounded pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                />
              </div>
              <div className="text-[10px] text-gray-400 flex items-center justify-between tabular-nums">
                <span>{characterProfiles.length} listed characters</span>
                <button
                  type="button"
                  onClick={() => setSubView('connections')}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  Open Node Map →
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#28282e]">
              {characterProfiles.map((ch) => {
                const isSelected = activeProfile?.name === ch.name;
                return (
                  <button
                    key={ch.name}
                    type="button"
                    onClick={() => setSelectedCharName(ch.name)}
                    className={`w-full text-left px-3.5 py-3 transition-colors flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-[#27272d]' : 'hover:bg-[#222227]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden bg-[#151517] border flex items-center justify-center shrink-0"
                        style={{ borderColor: ch.color }}
                      >
                        {ch.image ? (
                          <img
                            src={ch.image}
                            alt={ch.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: ch.color }}
                          >
                            {ch.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold truncate ${
                              isSelected ? 'text-[#ff8000]' : 'text-gray-100'
                            }`}
                          >
                            {ch.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          {ch.bioRec?.roleType || ch.breakdownRec?.roleCategory || 'Cast'}
                          {ch.actor ? ` · ${ch.actor}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 tabular-nums shrink-0 self-center">
                      {ch.scenesCount}sc · {ch.dialogueCount}dl
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Character Details Editor */}
          <main className="flex-1 overflow-y-auto p-6 bg-[#18181a]">
            {!activeProfile ? (
              <div className="max-w-xl mx-auto py-16 text-center space-y-3">
                <Users className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm font-semibold text-gray-200">No Character Selected</p>
                <button
                  type="button"
                  onClick={() => setIsAddingChar(true)}
                  className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded"
                >
                  Add First Character
                </button>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-5">
                {/* Header & Script Presence Summary */}
                <div className="bg-[#1e1e22] border border-[#33333b] rounded-lg p-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#141416] border-2 flex items-center justify-center shrink-0 group"
                      style={{ borderColor: activeProfile.color }}
                    >
                      {activeProfile.image ? (
                        <>
                          <img
                            src={activeProfile.image}
                            alt={activeProfile.name}
                            onClick={() =>
                              setLightboxImage({
                                src: activeProfile.image,
                                caption: `${activeProfile.name} — Character Portrait`,
                              })
                            }
                            className="w-full h-full object-cover cursor-pointer"
                          />
                        </>
                      ) : (
                        <span
                          className="text-lg font-bold tracking-wider"
                          style={{ color: activeProfile.color }}
                        >
                          {activeProfile.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <label
                        className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] text-white font-medium gap-0.5"
                        title="Upload character portrait"
                      >
                        <Camera className="w-4 h-4 text-[#ff8000]" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleUploadPrimaryPortrait(activeProfile.name, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: activeProfile.color }}
                        />
                        <h2 className="text-lg font-bold text-gray-100 truncate">
                          {activeProfile.name}
                        </h2>
                      </div>
                      <div className="text-xs text-gray-400 tabular-nums">
                        {activeProfile.scenesCount} Script Scenes · {activeProfile.dialogueCount}{' '}
                        Dialogue Lines
                        {activeProfile.voiceOverCount > 0
                          ? ` · ${activeProfile.voiceOverCount} Voice-over Cues`
                          : ''}
                        {activeProfile.actor ? ` · Cast: ${activeProfile.actor}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!activeProfile.isTagged ? (
                      <button
                        type="button"
                        onClick={() =>
                          onCreateCharacterTag(
                            activeProfile.name,
                            activeProfile.matchedScenes.map((s) => s.id)
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25252a] hover:bg-[#323238] border border-[#3e3e46] text-amber-300 rounded font-medium"
                      >
                        <TagIcon className="w-3.5 h-3.5" />
                        <span>Tag in Script</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-emerald-400 text-[11px] font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>Script Tagged</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSubView('bios')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25252a] hover:bg-[#323238] border border-[#3e3e46] text-gray-200 rounded font-medium"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Full Bio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCharacter(activeProfile.name)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25252a] hover:bg-rose-950/60 border border-[#3e3e46] hover:border-rose-700 text-rose-300 rounded"
                      title="Remove character from roster"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Character Portrait & Visual Reference Images */}
                <div className="bg-[#1e1e22] border border-[#33333b] rounded-lg p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#ff8000]" />
                        <span>Character Portrait &amp; Visual Reference Images</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Upload a primary character portrait and lookbook reference images synced to Cast Gallery &amp; Casting Studio.
                      </p>
                    </div>
                    {uploadError && (
                      <span className="text-[11px] text-rose-400 font-medium">{uploadError}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-start">
                    {/* Primary Portrait Dropzone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOverPortrait(true);
                      }}
                      onDragLeave={() => setIsDragOverPortrait(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOverPortrait(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) void handleUploadPrimaryPortrait(activeProfile.name, file);
                      }}
                      className={`rounded-lg border-2 border-dashed p-3 flex flex-col items-center justify-center text-center transition-colors bg-[#151517] ${
                        isDragOverPortrait
                          ? 'border-[#ff8000] bg-[#2a1f14]'
                          : 'border-[#35353f] hover:border-[#52525f]'
                      }`}
                    >
                      {activeProfile.image ? (
                        <div className="w-full space-y-2.5">
                          <div className="relative aspect-[4/3] w-full rounded-md overflow-hidden border border-[#34343c] bg-[#101012] group">
                            <img
                              src={activeProfile.image}
                              alt={`${activeProfile.name} portrait`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxImage({
                                  src: activeProfile.image,
                                  caption: `${activeProfile.name} — Character Portrait`,
                                })
                              }
                              className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 text-gray-200 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View full image"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#26262c] hover:bg-[#32323a] border border-[#3c3c46] text-gray-200 rounded cursor-pointer font-medium text-[11px]">
                              <Upload className="w-3 h-3 text-[#ff8000]" />
                              <span>Replace</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadPrimaryPortrait(activeProfile.name, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => ensureStoryCharacter(activeProfile.name, { image: undefined })}
                              className="px-2.5 py-1.5 bg-[#26262c] hover:bg-rose-950/60 border border-[#3c3c46] hover:border-rose-700 text-rose-300 rounded text-[11px]"
                              title="Remove portrait"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full py-5 px-2 flex flex-col items-center justify-center cursor-pointer space-y-2">
                          <div className="w-11 h-11 rounded-full bg-[#222228] border border-[#3a3a44] flex items-center justify-center text-[#ff8000]">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-gray-200">
                              Upload Character Portrait
                            </p>
                            <p className="text-[10px] text-gray-500">
                              Click or drag PNG, JPG, WebP
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleUploadPrimaryPortrait(activeProfile.name, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Additional Reference / Lookbook Gallery */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-gray-300">
                          Lookbook / Wardrobe / Casting Reference Photos ({activeProfile.referenceImages.length})
                        </span>
                        <label className="flex items-center gap-1.5 px-2.5 py-1 bg-[#26262c] hover:bg-[#32323a] border border-[#3c3c46] text-amber-300 rounded cursor-pointer font-medium text-[11px]">
                          <Plus className="w-3 h-3" />
                          <span>Add Reference Images</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                void handleUploadReferenceImages(
                                  activeProfile.name,
                                  activeProfile.referenceImages,
                                  e.target.files
                                );
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      {activeProfile.referenceImages.length === 0 ? (
                        <label className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border border-dashed border-[#34343d] bg-[#151517] hover:border-[#4c4c58] cursor-pointer text-center space-y-1.5">
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-[11px] text-gray-400">
                            No wardrobe, makeup, or visual inspiration photos attached yet.
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Click to attach one or more reference images for costume &amp; casting teams.
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                void handleUploadReferenceImages(
                                  activeProfile.name,
                                  activeProfile.referenceImages,
                                  e.target.files
                                );
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {activeProfile.referenceImages.map((src, idx) => (
                            <div
                              key={`${activeProfile.name}-ref-${idx}`}
                              className="relative aspect-square rounded-md overflow-hidden border border-[#34343c] bg-[#151517] group"
                            >
                              <img
                                src={src}
                                alt={`${activeProfile.name} reference ${idx + 1}`}
                                onClick={() =>
                                  setLightboxImage({
                                    src,
                                    caption: `${activeProfile.name} — Reference #${idx + 1}`,
                                  })
                                }
                                className="w-full h-full object-cover cursor-pointer"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  ensureStoryCharacter(activeProfile.name, {
                                    referenceImages: activeProfile.referenceImages.filter(
                                      (_, i) => i !== idx
                                    ),
                                  })
                                }
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove reference image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Core Casting & Identity Form */}
                <div className="bg-[#1e1e22] border border-[#33333b] rounded-lg p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Character Identity & Casting Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Script Character Name
                      </label>
                      <input
                        type="text"
                        defaultValue={activeProfile.name}
                        key={`rename-${activeProfile.name}`}
                        onBlur={(e) => handleRenameCharacter(activeProfile.name, e.target.value)}
                        className="w-full bg-[#151517] border border-[#32323a] rounded px-3 py-1.5 text-xs font-bold uppercase text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Cast Actor / Performer
                      </label>
                      <input
                        type="text"
                        value={activeProfile.actor}
                        onChange={(e) =>
                          ensureStoryCharacter(activeProfile.name, { actor: e.target.value })
                        }
                        placeholder="Assign actor name..."
                        className="w-full bg-[#151517] border border-[#32323a] rounded px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Role Classification
                      </label>
                      <select
                        value={
                          activeProfile.bioRec?.roleType ||
                          (activeProfile.breakdownRec?.roleCategory as CharacterBio['roleType']) ||
                          'Supporting'
                        }
                        onChange={(e) => {
                          const roleVal = e.target.value as CharacterBio['roleType'];
                          upsertCharacterBio(activeProfile.name, { roleType: roleVal });
                          onUpdateCharacterBreakdown({
                            characterName: activeProfile.name,
                            ...(activeProfile.breakdownRec || {}),
                            roleCategory: roleVal,
                          });
                        }}
                        className="w-full bg-[#151517] border border-[#32323a] rounded px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      >
                        {ROLE_TYPES.map((rt) => (
                          <option key={rt} value={rt}>
                            {rt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1.5">
                      Identifier Color Swatch
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {CHARACTER_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => ensureStoryCharacter(activeProfile.name, { color: hex })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            activeProfile.color === hex
                              ? 'border-white scale-110'
                              : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: hex }}
                          title={`Select color ${hex}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Character Overview / Notes
                    </label>
                    <textarea
                      rows={2}
                      value={activeProfile.description}
                      onChange={(e) => {
                        ensureStoryCharacter(activeProfile.name, {
                          description: e.target.value,
                        });
                        upsertCharacterBio(activeProfile.name, {
                          loglineSummary: e.target.value,
                        });
                      }}
                      placeholder="Concise description, dramatic function, or casting notes..."
                      className="w-full bg-[#151517] border border-[#32323a] rounded p-2.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>
                </div>

                {/* Production Wardrobe, Props & Physical Breakdown */}
                <div className="bg-[#1e1e22] border border-[#33333b] rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Production Breakdown (Wardrobe, Props & Arc)
                    </h3>
                    {activeProfile.breakdownRec && (
                      <button
                        type="button"
                        onClick={() => onResetCharacterBreakdown(activeProfile.name)}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Reset Overrides
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Character Arc Summary
                      </label>
                      <textarea
                        rows={2}
                        value={
                          activeProfile.breakdownRec?.characterArc ??
                          activeProfile.bioRec?.arcStartToEnd ??
                          ''
                        }
                        onChange={(e) =>
                          onUpdateCharacterBreakdown({
                            characterName: activeProfile.name,
                            ...(activeProfile.breakdownRec || {}),
                            characterArc: e.target.value,
                          })
                        }
                        placeholder="Emotional shift from opening scene to resolution..."
                        className="w-full bg-[#151517] border border-[#32323a] rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Wardrobe & Continuity Notes
                      </label>
                      <textarea
                        rows={2}
                        value={
                          activeProfile.breakdownRec?.wardrobeNotes ??
                          activeProfile.bioRec?.visualNotes ??
                          ''
                        }
                        onChange={(e) =>
                          onUpdateCharacterBreakdown({
                            characterName: activeProfile.name,
                            ...(activeProfile.breakdownRec || {}),
                            wardrobeNotes: e.target.value,
                          })
                        }
                        placeholder="Costume looks, fabrics, continuity wear states..."
                        className="w-full bg-[#151517] border border-[#32323a] rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Signature Props Carried (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={propsDraft}
                        onChange={(e) => setPropsDraft(e.target.value)}
                        onBlur={() =>
                          onUpdateCharacterBreakdown({
                            characterName: activeProfile.name,
                            ...(activeProfile.breakdownRec || {}),
                            propsCarried: propsDraft
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="e.g. Brass Compass, Encrypted Slate, Flight Jacket"
                        className="w-full bg-[#151517] border border-[#32323a] rounded px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Vocal / Physical Performance Notes
                      </label>
                      <input
                        type="text"
                        value={activeProfile.breakdownRec?.vocalOrPhysicalNotes || ''}
                        onChange={(e) =>
                          onUpdateCharacterBreakdown({
                            characterName: activeProfile.name,
                            ...(activeProfile.breakdownRec || {}),
                            vocalOrPhysicalNotes: e.target.value,
                          })
                        }
                        placeholder="Dialect, pacing, stunt or physicality requirements..."
                        className="w-full bg-[#151517] border border-[#32323a] rounded px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                      />
                    </div>
                  </div>
                </div>

                {/* Linked Script Scenes */}
                {activeProfile.matchedScenes.length > 0 && (
                  <div className="bg-[#1e1e22] border border-[#33333b] rounded-lg p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      <span>Script Scene Appearances ({activeProfile.matchedScenes.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeProfile.matchedScenes.map((sc) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => onSelectScene(sc.id)}
                          className="text-left px-3 py-2 bg-[#151517] hover:bg-[#242429] border border-[#2f2f37] rounded transition-colors"
                        >
                          <div className="text-[11px] font-semibold text-amber-300 truncate">
                            Scene {sc.sceneNumber} · {sc.heading}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">
                            {sc.pages} pp · {sc.location || sc.setting}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Add Character Modal */}
      {isAddingChar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateNewCharacter}
            className="bg-[#222226] border border-[#42424a] rounded-lg shadow-2xl w-full max-w-md p-5 space-y-3.5"
          >
            <h3 className="text-sm font-bold text-gray-100">Add New Character</h3>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Character Name *
              </label>
              <input
                type="text"
                required
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="e.g. CAPTAIN VANCE"
                className="w-full bg-[#161618] border border-[#3a3a42] rounded px-3 py-1.5 text-xs uppercase text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Actor (Optional)</label>
                <input
                  type="text"
                  value={newCharActor}
                  onChange={(e) => setNewCharActor(e.target.value)}
                  placeholder="Performer name"
                  className="w-full bg-[#161618] border border-[#3a3a42] rounded px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Role Type</label>
                <select
                  value={newCharRole}
                  onChange={(e) => setNewCharRole(e.target.value as CharacterBio['roleType'])}
                  className="w-full bg-[#161618] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                >
                  {ROLE_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Character Portrait (Optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#161618] border border-[#3a3a42] flex items-center justify-center shrink-0">
                  {newCharImage ? (
                    <img
                      src={newCharImage}
                      alt="New character portrait"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a32] hover:bg-[#34343e] border border-[#3e3e48] rounded text-xs text-gray-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#ff8000]" />
                  <span>{newCharImage ? 'Change Image' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const dataUrl = await processUploadedImageFile(file, 720);
                          setNewCharImage(dataUrl);
                        } catch {
                          // ignore invalid selection
                        }
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                {newCharImage && (
                  <button
                    type="button"
                    onClick={() => setNewCharImage('')}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Summary / Bio Lead-in
              </label>
              <textarea
                rows={3}
                value={newCharDesc}
                onChange={(e) => setNewCharDesc(e.target.value)}
                placeholder="Brief summary of character goals, personality, and role in story..."
                className="w-full bg-[#161618] border border-[#3a3a42] rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#32323a]">
              <button
                type="button"
                onClick={() => {
                  setNewCharImage('');
                  setIsAddingChar(false);
                }}
                className="px-3 py-1.5 bg-[#2d2d34] hover:bg-[#383840] text-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded"
              >
                Create Character
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-6 z-50"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="max-w-3xl w-full bg-[#1b1b1f] border border-[#3a3a44] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-[#232328] border-b border-[#34343d] flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200">{lightboxImage.caption}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-[#101012] max-h-[78vh]">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.caption}
                className="max-h-[72vh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
