import React, { useMemo, useState } from 'react';
import {
  CharacterBio,
  CharacterRelationshipEdge,
  PitchSection,
  ProjectBible,
  ResearchNote,
  ScriptFormatMode,
  StoryProject,
} from '../types/story';
import {
  BookOpen,
  Users,
  FileText,
  Compass,
  Columns,
  Film,
  Plus,
  Trash2,
  ArrowUpRight,
  Camera,
  Network,
} from 'lucide-react';
import { CharacterConnectionsChart } from './CharacterConnectionsChart';

interface ProjectContainerViewProps {
  project: StoryProject;
  onUpdateProjectBible: (bible: ProjectBible) => void;
  onUpdateRelationships?: (relationships: CharacterRelationshipEdge[]) => void;
  onUpdateNodePositions?: (positions: Record<string, { x: number; y: number }>) => void;
  onSwitchScriptFormat: (format: ScriptFormatMode) => void;
  onOpenAuthoring: () => void;
  onOpenStoryboard: () => void;
  onSelectScene: (sceneId: string) => void;
}

const createFallbackBible = (project: StoryProject): ProjectBible => ({
  logline: `In ${project.title}, an ensemble navigates escalating political and personal stakes across ${project.scenes.length} pivotal scenes.`,
  genre: 'Drama / Sci-Fi Ensemble',
  formatLabel:
    project.scriptFormat === 'av_multi_column' ? 'Multi-Column A/V Script' : 'Feature Screenplay',
  targetRuntime: `${Math.max(1, Math.round(project.scenes.reduce((a, s) => a + s.durationSec, 0) / 60))} min`,
  themes: ['Loyalty vs. Duty', 'Truth Under Pressure', 'Consequence'],
  pitchSummary: `Unified production bible for "${project.title}" combining screenplay drafts, character arcs, pitch decks, and research documentation.`,
  characterBios: project.characters.map((ch, idx) => ({
    id: `bio-auto-${idx + 1}`,
    characterName: ch.name,
    roleType: idx === 0 ? 'Lead' : idx === 1 ? 'Antagonist' : 'Supporting',
    loglineSummary: `${ch.name} (${ch.actor || 'Unassigned'}) appears across ${ch.scenesCount} scenes with ${ch.speakingLines} spoken cues.`,
    backstory: 'Add backstory, formative history, and off-screen relationships.',
    arcStartToEnd: 'Opening objective → Midpoint reversal → Climax resolution.',
    coreFlawOrTension: 'Internal contradiction driving scene-by-scene conflict.',
  })),
  pitchDocs: [
    {
      id: 'pitch-hook-1',
      title: '01. Hook & Core Premise',
      category: 'Hook & Premise',
      content: `What draws an audience immediately into ${project.title} and why the stakes escalate scene over scene.`,
      updatedAt: 'Today',
    },
    {
      id: 'pitch-tone-2',
      title: '02. Visual Tone & Camera Language',
      category: 'World & Tone',
      content:
        'Controlled framing, tactile practical lighting, and deliberate sound design linking the script to the editorial sequence.',
      updatedAt: 'Today',
    },
  ],
  researchNotes: [
    {
      id: 'res-1',
      title: 'Production Reference & World Rules',
      topic: 'Worldbuilding',
      summary:
        'Key terminology, set architecture guidelines, and props continuity tracked alongside the screenplay.',
      linkedSceneIds: project.scenes.slice(0, 2).map((s) => s.id),
      createdAt: 'Today',
    },
  ],
});

export const ProjectContainerView: React.FC<ProjectContainerViewProps> = ({
  project,
  onUpdateProjectBible,
  onUpdateRelationships,
  onUpdateNodePositions,
  onSwitchScriptFormat,
  onOpenAuthoring,
  onOpenStoryboard,
  onSelectScene,
}) => {
  const [section, setSection] = useState<'overview' | 'bios' | 'connections' | 'pitch' | 'research'>('overview');
  const [newTheme, setNewTheme] = useState('');
  const [researchFilter, setResearchFilter] = useState<string>('all');

  const bible: ProjectBible = useMemo(
    () => project.projectBible || createFallbackBible(project),
    [project]
  );

  const updateField = <K extends keyof ProjectBible>(key: K, value: ProjectBible[K]) => {
    onUpdateProjectBible({ ...bible, [key]: value });
  };

  const handleAddTheme = () => {
    const clean = newTheme.trim();
    if (!clean) return;
    if (!bible.themes.includes(clean)) {
      updateField('themes', [...bible.themes, clean]);
    }
    setNewTheme('');
  };

  const handleAddBio = () => {
    const nextBio: CharacterBio = {
      id: `bio-${Date.now()}`,
      characterName: 'NEW CHARACTER',
      roleType: 'Supporting',
      loglineSummary: 'One-sentence dramatic function in the story.',
      backstory: '',
      arcStartToEnd: '',
      coreFlawOrTension: '',
    };
    updateField('characterBios', [...bible.characterBios, nextBio]);
  };

  const handleUpdateBio = (id: string, patch: Partial<CharacterBio>) => {
    updateField(
      'characterBios',
      bible.characterBios.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  };

  const handleDeleteBio = (id: string) => {
    updateField(
      'characterBios',
      bible.characterBios.filter((b) => b.id !== id)
    );
  };

  const handleAddPitchSection = () => {
    const next: PitchSection = {
      id: `pitch-${Date.now()}`,
      title: `0${bible.pitchDocs.length + 1}. New Pitch Beat`,
      category: 'Story Arc',
      content: '',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    updateField('pitchDocs', [...bible.pitchDocs, next]);
  };

  const handleUpdatePitch = (id: string, patch: Partial<PitchSection>) => {
    updateField(
      'pitchDocs',
      bible.pitchDocs.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleDeletePitch = (id: string) => {
    updateField(
      'pitchDocs',
      bible.pitchDocs.filter((p) => p.id !== id)
    );
  };

  const handleAddResearch = () => {
    const next: ResearchNote = {
      id: `res-${Date.now()}`,
      title: 'New Research Note',
      topic: 'Worldbuilding',
      summary: '',
      sourceRef: '',
      linkedSceneIds: project.scenes[0] ? [project.scenes[0].id] : [],
      createdAt: new Date().toLocaleDateString(),
    };
    updateField('researchNotes', [next, ...bible.researchNotes]);
  };

  const handleUpdateResearch = (id: string, patch: Partial<ResearchNote>) => {
    updateField(
      'researchNotes',
      bible.researchNotes.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const handleDeleteResearch = (id: string) => {
    updateField(
      'researchNotes',
      bible.researchNotes.filter((r) => r.id !== id)
    );
  };

  const totalEighths = project.scenes.reduce((acc, s) => acc + s.eighths, 0);
  const storyboardCount = (project.storyboards || []).length;
  const activeFormat: ScriptFormatMode = project.scriptFormat || 'single_column_film';

  return (
    <div className="flex-1 bg-[#1e1e1e] text-gray-200 flex flex-col min-h-0 overflow-hidden text-xs select-none">
      {/* Top Toolbar */}
      <div className="bg-[#272727] border-b border-[#3a3a3a] px-5 py-2.5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-[#ff8000] shrink-0" />
            <h1 className="text-sm font-bold text-gray-100 truncate">
              {project.title} — Unified Project Container
            </h1>
          </div>

          <div className="flex items-center p-0.5 bg-[#181818] rounded border border-[#3a3a3a]">
            {(
              [
                { id: 'overview', label: 'Logline & Overview', icon: BookOpen },
                { id: 'bios', label: `Character Bios (${bible.characterBios.length})`, icon: Users },
                {
                  id: 'connections',
                  label: `Character Connections (${(project.characterRelationships || []).length})`,
                  icon: Network,
                },
                { id: 'pitch', label: `Pitch Docs (${bible.pitchDocs.length})`, icon: FileText },
                { id: 'research', label: `Research Notes (${bible.researchNotes.length})`, icon: Compass },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSection(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                    section === tab.id
                      ? 'bg-[#2e2e2e] text-[#ff8000] font-semibold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Script Mode & Quick Jump */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-[#181818] rounded border border-[#3a3a3a]">
            <button
              onClick={() => {
                onSwitchScriptFormat('single_column_film');
                onOpenAuthoring();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                activeFormat === 'single_column_film'
                  ? 'bg-[#2e2e2e] text-amber-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Open Single-Column Film Screenplay"
            >
              <Film className="w-3 h-3" />
              <span>Single-Column Script</span>
            </button>
            <button
              onClick={() => {
                onSwitchScriptFormat('av_multi_column');
                onOpenAuthoring();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                activeFormat === 'av_multi_column'
                  ? 'bg-[#2e2e2e] text-cyan-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Open Multi-Column A/V Script with Embedded Storyboards"
            >
              <Columns className="w-3 h-3" />
              <span>Multi-Column A/V Script</span>
            </button>
          </div>

          <button
            onClick={onOpenStoryboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2f2f2f] hover:bg-[#3a3a3a] border border-[#444] rounded text-gray-200 whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Storyboards ({storyboardCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="bg-[#181818] border-b border-[#303030] px-5 py-2.5 grid grid-cols-4 divide-x divide-[#2f2f2f] flex-shrink-0">
        <div className="pr-4">
          <div className="text-[11px] text-gray-400">Screenplay Scope</div>
          <div className="text-sm font-semibold text-gray-100 mt-0.5 tabular-nums">
            {project.scenes.length} Scenes · {(totalEighths / 8).toFixed(1)} Pages
          </div>
        </div>
        <div className="px-4">
          <div className="text-[11px] text-gray-400">Active Script Layout</div>
          <div className="text-sm font-semibold text-amber-400 mt-0.5">
            {activeFormat === 'av_multi_column' ? 'Multi-Column A/V' : 'Single-Column Film'}
          </div>
        </div>
        <div className="px-4">
          <div className="text-[11px] text-gray-400">Embedded Visuals</div>
          <div className="text-sm font-semibold text-cyan-400 mt-0.5 tabular-nums">
            {storyboardCount} Storyboard Frame{storyboardCount === 1 ? '' : 's'}
          </div>
        </div>
        <div className="pl-4">
          <div className="text-[11px] text-gray-400">Container Assets</div>
          <div className="text-sm font-semibold text-emerald-400 mt-0.5 tabular-nums">
            {bible.characterBios.length} Bios · {bible.pitchDocs.length} Pitch · {bible.researchNotes.length} Research
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {section === 'connections' ? (
        <CharacterConnectionsChart
          project={project}
          onUpdateRelationships={(rels) => onUpdateRelationships?.(rels)}
          onUpdateNodePositions={(pos) => onUpdateNodePositions?.(pos)}
          onSelectScene={(sceneId) => {
            onSelectScene(sceneId);
          }}
          onOpenCharacterBios={() => setSection('bios')}
        />
      ) : (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {section === 'overview' && (
            <>
              <div className="bg-[#232323] border border-[#383838] rounded p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-100">01. Logline & Project Metadata</h2>
                  <button
                    onClick={onOpenAuthoring}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    <span>Open Active Script</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Master Logline</label>
                  <textarea
                    rows={2}
                    value={bible.logline}
                    onChange={(e) => updateField('logline', e.target.value)}
                    className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2.5 text-sm text-gray-100 leading-relaxed focus:outline-none focus:border-[#ff8000] select-text"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Genre</label>
                    <input
                      type="text"
                      value={bible.genre}
                      onChange={(e) => updateField('genre', e.target.value)}
                      className="w-full bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Format Classification</label>
                    <input
                      type="text"
                      value={bible.formatLabel}
                      onChange={(e) => updateField('formatLabel', e.target.value)}
                      className="w-full bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Target Runtime</label>
                    <input
                      type="text"
                      value={bible.targetRuntime}
                      onChange={(e) => updateField('targetRuntime', e.target.value)}
                      className="w-full bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Pitch Synopsis</label>
                  <textarea
                    rows={3}
                    value={bible.pitchSummary}
                    onChange={(e) => updateField('pitchSummary', e.target.value)}
                    className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#ff8000] select-text"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">Core Themes</label>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {bible.themes.map((th) => (
                      <span
                        key={th}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] border border-[#383838] text-gray-200"
                      >
                        <span>{th}</span>
                        <button
                          onClick={() =>
                            updateField(
                              'themes',
                              bible.themes.filter((t) => t !== th)
                            )
                          }
                          className="text-gray-500 hover:text-rose-400"
                          title="Remove theme"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newTheme}
                      onChange={(e) => setNewTheme(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTheme();
                      }}
                      placeholder="Add thematic pillar..."
                      className="flex-1 bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                    />
                    <button
                      onClick={handleAddTheme}
                      className="px-3 py-1 bg-[#2e2e2e] hover:bg-[#3a3a3a] border border-[#444] rounded text-gray-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Embedded Storyboards Strip */}
              <div className="bg-[#232323] border border-[#383838] rounded p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-100">
                    02. Visual Storyboards Linked Inside Container
                  </h2>
                  <button
                    onClick={onOpenStoryboard}
                    className="text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    Manage Frames →
                  </button>
                </div>

                {storyboardCount === 0 ? (
                  <p className="text-gray-400">
                    No storyboard frames attached yet. Open the Storyboard workspace or switch to Multi-Column A/V Script mode to attach visual plates inline.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(project.storyboards || []).slice(0, 6).map((frame) => {
                      const imgSrc = frame.drawingData || frame.imageUrl;
                      return (
                        <div
                          key={frame.id}
                          onClick={() => {
                            onSelectScene(frame.sceneId);
                            onOpenAuthoring();
                          }}
                          className="bg-[#181818] border border-[#343434] hover:border-[#ff8000] rounded overflow-hidden cursor-pointer transition-colors"
                        >
                          <div className="h-28 bg-[#121212] relative flex items-center justify-center overflow-hidden">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={frame.shotType}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-500">
                                <Camera className="w-5 h-5" />
                                <span className="text-[10px]">Shot {frame.shotNumber}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5 space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="text-amber-400 font-semibold">
                                Shot {frame.shotNumber}
                              </span>
                              <span className="text-gray-400">{frame.lens}</span>
                            </div>
                            <p className="text-[11px] text-gray-300 line-clamp-2">
                              {frame.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {section === 'bios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-100">Character Biographies & Arcs</h2>
                  <p className="text-[11px] text-gray-400">
                    Central character dossier stored inside the unified project container.
                  </p>
                </div>
                <button
                  onClick={handleAddBio}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Character Bio</span>
                </button>
              </div>

              <div className="space-y-3">
                {bible.characterBios.map((bio) => (
                  <div
                    key={bio.id}
                    className="bg-[#232323] border border-[#383838] rounded p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={bio.characterName}
                          onChange={(e) =>
                            handleUpdateBio(bio.id, { characterName: e.target.value.toUpperCase() })
                          }
                          className="bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs font-bold text-amber-300 w-56 focus:outline-none focus:border-[#ff8000]"
                        />
                        <select
                          value={bio.roleType}
                          onChange={(e) =>
                            handleUpdateBio(bio.id, {
                              roleType: e.target.value as CharacterBio['roleType'],
                            })
                          }
                          className="bg-[#171717] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                        >
                          <option value="Lead">Lead</option>
                          <option value="Antagonist">Antagonist</option>
                          <option value="Supporting">Supporting</option>
                          <option value="Featured">Featured</option>
                          <option value="Ensemble">Ensemble</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleDeleteBio(bio.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 rounded"
                        title="Remove bio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Character Summary
                        </label>
                        <textarea
                          rows={2}
                          value={bio.loglineSummary}
                          onChange={(e) =>
                            handleUpdateBio(bio.id, { loglineSummary: e.target.value })
                          }
                          className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Arc (Opening → Resolution)
                        </label>
                        <textarea
                          rows={2}
                          value={bio.arcStartToEnd}
                          onChange={(e) =>
                            handleUpdateBio(bio.id, { arcStartToEnd: e.target.value })
                          }
                          className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Backstory</label>
                        <textarea
                          rows={2}
                          value={bio.backstory}
                          onChange={(e) => handleUpdateBio(bio.id, { backstory: e.target.value })}
                          className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Core Flaw / Dramatic Tension
                        </label>
                        <textarea
                          rows={2}
                          value={bio.coreFlawOrTension}
                          onChange={(e) =>
                            handleUpdateBio(bio.id, { coreFlawOrTension: e.target.value })
                          }
                          className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'pitch' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-100">Pitch Documents & Lookbook Copy</h2>
                  <p className="text-[11px] text-gray-400">
                    Structured pitch sections bundled directly alongside the screenplay.
                  </p>
                </div>
                <button
                  onClick={handleAddPitchSection}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pitch Section</span>
                </button>
              </div>

              <div className="space-y-3">
                {bible.pitchDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-[#232323] border border-[#383838] rounded p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => handleUpdatePitch(doc.id, { title: e.target.value })}
                          className="bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs font-semibold text-gray-100 flex-1 max-w-md focus:outline-none focus:border-[#ff8000]"
                        />
                        <select
                          value={doc.category}
                          onChange={(e) =>
                            handleUpdatePitch(doc.id, {
                              category: e.target.value as PitchSection['category'],
                            })
                          }
                          className="bg-[#171717] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-[#ff8000]"
                        >
                          <option value="Hook & Premise">Hook & Premise</option>
                          <option value="World & Tone">World & Tone</option>
                          <option value="Story Arc">Story Arc</option>
                          <option value="Audience & Comps">Audience & Comps</option>
                          <option value="Visual Approach">Visual Approach</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleDeletePitch(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={doc.content}
                      onChange={(e) => handleUpdatePitch(doc.id, { content: e.target.value })}
                      className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'research' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-100">Research & Reference Notes</h2>
                  <select
                    value={researchFilter}
                    onChange={(e) => setResearchFilter(e.target.value)}
                    className="bg-[#181818] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                  >
                    <option value="all">All Topics</option>
                    <option value="Worldbuilding">Worldbuilding</option>
                    <option value="Technical / Sci-Fi">Technical / Sci-Fi</option>
                    <option value="Historical / Period">Historical / Period</option>
                    <option value="Location">Location</option>
                    <option value="Character Study">Character Study</option>
                  </select>
                </div>
                <button
                  onClick={handleAddResearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Research Note</span>
                </button>
              </div>

              <div className="space-y-3">
                {bible.researchNotes
                  .filter((n) => researchFilter === 'all' || n.topic === researchFilter)
                  .map((note) => (
                    <div
                      key={note.id}
                      className="bg-[#232323] border border-[#383838] rounded p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={note.title}
                            onChange={(e) => handleUpdateResearch(note.id, { title: e.target.value })}
                            className="bg-[#171717] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs font-semibold text-gray-100 flex-1 max-w-md focus:outline-none focus:border-[#ff8000]"
                          />
                          <select
                            value={note.topic}
                            onChange={(e) =>
                              handleUpdateResearch(note.id, {
                                topic: e.target.value as ResearchNote['topic'],
                              })
                            }
                            className="bg-[#171717] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-cyan-300 focus:outline-none focus:border-[#ff8000]"
                          >
                            <option value="Worldbuilding">Worldbuilding</option>
                            <option value="Technical / Sci-Fi">Technical / Sci-Fi</option>
                            <option value="Historical / Period">Historical / Period</option>
                            <option value="Location">Location</option>
                            <option value="Character Study">Character Study</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleDeleteResearch(note.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={note.summary}
                        onChange={(e) => handleUpdateResearch(note.id, { summary: e.target.value })}
                        placeholder="Document factual references, visual sources, or technical rules..."
                        className="w-full bg-[#171717] border border-[#3a3a3a] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                      />

                      <div className="flex items-center justify-between gap-3 text-[11px] text-gray-400">
                        <input
                          type="text"
                          value={note.sourceRef || ''}
                          onChange={(e) => handleUpdateResearch(note.id, { sourceRef: e.target.value })}
                          placeholder="Source URL / citation (optional)"
                          className="bg-[#171717] border border-[#333] rounded px-2 py-1 text-[11px] text-gray-300 w-72 focus:outline-none focus:border-[#ff8000]"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {project.scenes.slice(0, 6).map((sc) => {
                            const linked = note.linkedSceneIds.includes(sc.id);
                            return (
                              <button
                                key={sc.id}
                                onClick={() => {
                                  const nextIds = linked
                                    ? note.linkedSceneIds.filter((id) => id !== sc.id)
                                    : [...note.linkedSceneIds, sc.id];
                                  handleUpdateResearch(note.id, { linkedSceneIds: nextIds });
                                }}
                                className={`px-2 py-0.5 rounded border text-[10px] font-mono transition-colors ${
                                  linked
                                    ? 'bg-[#2c251d] border-[#ff8000] text-amber-300'
                                    : 'bg-[#171717] border-[#333] text-gray-500 hover:text-gray-200'
                                }`}
                              >
                                Sc.{sc.sceneNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
