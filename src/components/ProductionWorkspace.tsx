import React, { useMemo, useState } from 'react';
import {
  CastCrewMember,
  CharacterBreakdownOverride,
  CharacterRelationshipEdge,
  EquipmentItem,
  FinanceSettings,
  PitchSection,
  ProjectBible,
  ResearchNote,
  ShootLocation,
  StoryProject,
  StoryboardFrame,
  StripboardStrip,
} from '../types/story';
import { StripboardView } from './StripboardView';
import { CastCrewDirectory } from './CastCrewDirectory';
import { LocationMapView } from './LocationMapView';
import { EquipmentManifestPanel } from './EquipmentManifestPanel';
import { ProductionBudgetPanel } from './ProductionBudgetPanel';
import { StoryboardWorkspace } from './StoryboardWorkspace';
import { TeleprompterWindow } from './TeleprompterWindow';
import {
  Layers,
  Users,
  BarChart3,
  MapPin,
  Wrench,
  DollarSign,
  FileText,
  BookOpen,
  Compass,
  Camera,
  MonitorPlay,
  Sparkles,
  RefreshCw,
  AudioWaveform,
  UserPlus,
  Plus,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

export type ProductionHubTab =
  | 'stripboard'
  | 'cast_crew'
  | 'timeline'
  | 'location_map'
  | 'equipment'
  | 'budget'
  | 'call_sheet'
  | 'overview'
  | 'pitch'
  | 'research'
  | 'storyboards'
  | 'teleprompter';

interface ProductionWorkspaceProps {
  projects: StoryProject[];
  project: StoryProject;
  requestedTab?: { tab: ProductionHubTab; nonce: number } | null;
  callSheetDayNumber?: number | null;
  selectedSceneId: string | null;
  locationCount: number;
  pendingSyncCount: number;
  onSelectScene: (sceneId: string) => void;
  onJumpToAuthoringScene: (sceneId: string) => void;
  onUpdateStrips: (newStrips: StripboardStrip[]) => void;
  onAddDayBreak: () => void;
  onAddMealBreak: () => void;
  onAddCrewMember: (member: CastCrewMember) => void;
  onUpdateCrewMember: (member: CastCrewMember) => void;
  onDeleteCrewMember: (memberId: string) => void;
  onAddCrewConnection: (
    sourceId: string,
    targetId: string,
    relationship: string,
    notes: string,
    reciprocal: boolean
  ) => void;
  onRemoveCrewConnection: (sourceId: string, targetId: string) => void;
  onUpdateCharacterBreakdown: (override: CharacterBreakdownOverride) => void;
  onResetCharacterBreakdown: (characterName: string) => void;
  onCreateCharacterTag: (name: string, sceneIds: string[]) => void;
  onUpdateCharacterRelationships: (relationships: CharacterRelationshipEdge[]) => void;
  onUpdateCharacterNodePositions: (positions: Record<string, { x: number; y: number }>) => void;
  onUpdateCharacterEdgePositions: (positions: Record<string, { x: number; y: number }>) => void;
  onUpdateLocations: (locations: ShootLocation[]) => void;
  onUpdateEquipment: (items: EquipmentItem[]) => void;
  onUpdateFinanceSettings: (settings: FinanceSettings) => void;
  onRecalculateFinances: () => void;
  onUpdateProjectBible: (bible: ProjectBible) => void;
  onUpdateStoryboards: (storyboards: StoryboardFrame[]) => void;
  onImportScriptCast: () => void;
  onOpenRevisionImpact: () => void;
  onOpenNLEPipeline: () => void;
  onOpenReports: () => void;
  onNotify: (msg: string) => void;
  rightInspector?: React.ReactNode;
}

const createFallbackBible = (project: StoryProject): ProjectBible => ({
  logline: `In ${project.title}, an ensemble navigates escalating stakes across ${project.scenes.length} scenes.`,
  genre: 'Drama / Sci-Fi Ensemble',
  formatLabel:
    project.scriptFormat === 'av_multi_column' ? 'Multi-Column A/V Script' : 'Feature Screenplay',
  targetRuntime: `${Math.max(1, Math.round(project.scenes.reduce((a, s) => a + s.durationSec, 0) / 60))} min`,
  themes: ['Loyalty vs. Duty', 'Truth Under Pressure'],
  pitchSummary: `Production overview and pitch package for "${project.title}".`,
  characterBios: project.characters.map((ch, idx) => ({
    id: `bio-auto-${idx + 1}`,
    characterName: ch.name,
    roleType: idx === 0 ? 'Lead' : 'Supporting',
    loglineSummary: `${ch.name} appears in ${ch.scenesCount} scene(s).`,
    backstory: '',
    arcStartToEnd: '',
    coreFlawOrTension: '',
  })),
  pitchDocs: [
    {
      id: 'pitch-hook-1',
      title: '01. Hook & Core Premise',
      category: 'Hook & Premise',
      content: `What hooks the audience into ${project.title}.`,
      updatedAt: 'Today',
    },
  ],
  researchNotes: [],
});

export const ProductionWorkspace: React.FC<ProductionWorkspaceProps> = ({
  projects,
  project,
  requestedTab,
  callSheetDayNumber,
  selectedSceneId,
  locationCount,
  pendingSyncCount,
  onSelectScene,
  onJumpToAuthoringScene,
  onUpdateStrips,
  onAddDayBreak,
  onAddMealBreak,
  onAddCrewMember,
  onUpdateCrewMember,
  onDeleteCrewMember,
  onAddCrewConnection,
  onRemoveCrewConnection,
  onUpdateCharacterBreakdown,
  onResetCharacterBreakdown,
  onCreateCharacterTag,
  onUpdateCharacterRelationships,
  onUpdateCharacterNodePositions,
  onUpdateCharacterEdgePositions,
  onUpdateLocations,
  onUpdateEquipment,
  onUpdateFinanceSettings,
  onRecalculateFinances,
  onUpdateProjectBible,
  onUpdateStoryboards,
  onImportScriptCast,
  onOpenRevisionImpact,
  onOpenNLEPipeline,
  onOpenReports,
  onNotify,
  rightInspector,
}) => {
  const [activeTab, setActiveTab] = useState<ProductionHubTab>('stripboard');
  const [callSheetDay, setCallSheetDay] = useState<number | null>(callSheetDayNumber ?? null);
  const [addMemberNonce, setAddMemberNonce] = useState<number>(0);
  const [newTheme, setNewTheme] = useState('');
  const [researchFilter, setResearchFilter] = useState('all');

  React.useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab.tab);
    }
  }, [requestedTab]);

  React.useEffect(() => {
    if (callSheetDayNumber !== undefined) {
      setCallSheetDay(callSheetDayNumber);
    }
  }, [callSheetDayNumber]);

  const members = project.crewMembers || [];
  const equipment = project.equipmentManifest || [];
  const bible = useMemo(
    () => project.projectBible || createFallbackBible(project),
    [project]
  );

  const unmappedScriptCastCount = useMemo(() => {
    const existingCharNames = new Set(
      members
        .filter((m) => m.characterName)
        .map((m) => m.characterName!.trim().toUpperCase())
    );
    return project.characters.filter(
      (c) => !existingCharNames.has(c.name.trim().toUpperCase())
    ).length;
  }, [project.characters, members]);

  const updateBibleField = <K extends keyof ProjectBible>(key: K, value: ProjectBible[K]) => {
    onUpdateProjectBible({ ...bible, [key]: value });
  };

  const handleAddTheme = () => {
    const clean = newTheme.trim();
    if (!clean) return;
    if (!bible.themes.includes(clean)) {
      updateBibleField('themes', [...bible.themes, clean]);
    }
    setNewTheme('');
  };

  const handleAddPitch = () => {
    const next: PitchSection = {
      id: `pitch-${Date.now()}`,
      title: `0${bible.pitchDocs.length + 1}. New Pitch Beat`,
      category: 'Story Arc',
      content: '',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    updateBibleField('pitchDocs', [...bible.pitchDocs, next]);
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
    updateBibleField('researchNotes', [next, ...bible.researchNotes]);
  };

  const tabItems: {
    id: ProductionHubTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    { id: 'stripboard', label: 'Stripboard & Schedule', icon: <Layers className="w-3.5 h-3.5" /> },
    {
      id: 'cast_crew',
      label: 'Cast & Crew Book',
      icon: <Users className="w-3.5 h-3.5" />,
      count: members.length,
    },
    { id: 'timeline', label: 'Availability Timeline', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    {
      id: 'location_map',
      label: 'Location Map',
      icon: <MapPin className="w-3.5 h-3.5" />,
      count: locationCount,
    },
    {
      id: 'equipment',
      label: 'Equipment Manifest',
      icon: <Wrench className="w-3.5 h-3.5" />,
      count: equipment.length,
    },
    { id: 'budget', label: 'Budget & Finance', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'call_sheet', label: 'Call Sheet PDF', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'overview', label: 'Logline & Overviews', icon: <BookOpen className="w-3.5 h-3.5" /> },
    {
      id: 'pitch',
      label: 'Pitch Docs',
      icon: <FileText className="w-3.5 h-3.5" />,
      count: bible.pitchDocs.length,
    },
    {
      id: 'research',
      label: 'Research Notes',
      icon: <Compass className="w-3.5 h-3.5" />,
      count: bible.researchNotes.length,
    },
    {
      id: 'storyboards',
      label: 'Storyboards',
      icon: <Camera className="w-3.5 h-3.5" />,
      count: (project.storyboards || []).length,
    },
    { id: 'teleprompter', label: 'Teleprompter', icon: <MonitorPlay className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1c1c1c] text-xs text-gray-200 overflow-hidden">
      {/* Row 1: Unified Production Action Bar */}
      <div className="bg-[#252525] border-b border-[#383838] px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-100 whitespace-nowrap">Production Hub</span>
          <span className="text-gray-600">·</span>
          <span className="text-[11px] text-gray-400 truncate max-w-[220px]">
            {project.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <button
            type="button"
            onClick={onImportScriptCast}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#383838] border border-[#444] text-amber-300 font-medium whitespace-nowrap"
            title="Sync script characters into Cast & Crew Address Book"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Sync Script Cast{unmappedScriptCastCount > 0 ? ` (+${unmappedScriptCastCount})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenRevisionImpact}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium whitespace-nowrap ${
              pendingSyncCount > 0
                ? 'bg-[#2e2010] border-amber-500/70 text-amber-300'
                : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#444] text-gray-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Schedule Sync{pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={onRecalculateFinances}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#383838] border border-[#444] text-emerald-300 font-medium whitespace-nowrap"
            title="Recalculate page eighths, running time, cast/crew payroll, equipment rentals, and net budget"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Recalculate Finance</span>
          </button>

          <button
            type="button"
            onClick={onOpenNLEPipeline}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#383838] border border-[#444] text-cyan-300 font-medium whitespace-nowrap"
          >
            <AudioWaveform className="w-3.5 h-3.5" />
            <span>NLE Pipeline</span>
          </button>

          <button
            type="button"
            onClick={onOpenReports}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#383838] border border-[#444] text-gray-200 font-medium whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-[#ff8000]" />
            <span>Reports</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cast_crew');
              setAddMemberNonce((n) => n + 1);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Cast / Crew</span>
          </button>
        </div>
      </div>

      {/* Row 2: Unified Production Tool Tabs (wraps cleanly onto subsequent rows if exceeding pane width) */}
      <div className="bg-[#1b1b1b] border-b border-[#333333] px-3 py-1.5 flex flex-wrap items-center gap-1 shrink-0">
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#2c2c2c] text-[#ff8000] border border-[#444]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#232323] border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] font-mono tabular-nums text-gray-400">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Production Sub-Workspace */}
      <div className="flex-1 flex min-w-0 min-h-0 overflow-hidden">
        {activeTab === 'stripboard' && (
          <>
            <StripboardView
              strips={project.strips}
              scenes={project.scenes}
              elements={project.elements}
              locations={project.locations}
              selectedSceneId={selectedSceneId}
              onSelectScene={onSelectScene}
              onUpdateStrips={onUpdateStrips}
              onAddDayBreak={onAddDayBreak}
              onAddMealBreak={onAddMealBreak}
              crewCount={members.length}
              locationCount={locationCount}
              pendingSyncCount={pendingSyncCount}
              onOpenRevisionImpact={onOpenRevisionImpact}
              onNotify={onNotify}
              onSwitchSubView={(view) => {
                if (view === 'cast_crew') setActiveTab('cast_crew');
                else if (view === 'location_map') setActiveTab('location_map');
                else setActiveTab('stripboard');
              }}
              onOpenCallSheet={(dayNum) => {
                setCallSheetDay(dayNum ?? null);
                setActiveTab('call_sheet');
              }}
            />
            {rightInspector}
          </>
        )}

        {(activeTab === 'cast_crew' || activeTab === 'timeline' || activeTab === 'call_sheet') && (
          <CastCrewDirectory
            embeddedMode={true}
            externalAddMemberNonce={activeTab === 'cast_crew' ? addMemberNonce : 0}
            project={project}
            projectTitle={project.title}
            projectAuthor={project.author}
            draftName={project.activeDraftName}
            members={members}
            scenes={project.scenes}
            strips={project.strips}
            characters={project.characters}
            tags={project.tags}
            elements={project.elements}
            comments={project.comments}
            characterBreakdowns={project.characterBreakdowns}
            initialDirectoryView={
              activeTab === 'timeline'
                ? 'timeline'
                : activeTab === 'call_sheet'
                ? 'call_sheet'
                : 'roster'
            }
            initialCallSheetDay={callSheetDay}
            onAddMember={onAddCrewMember}
            onUpdateMember={onUpdateCrewMember}
            onDeleteMember={onDeleteCrewMember}
            onAddConnection={onAddCrewConnection}
            onRemoveConnection={onRemoveCrewConnection}
            onUpdateCharacterBreakdown={onUpdateCharacterBreakdown}
            onResetCharacterBreakdown={onResetCharacterBreakdown}
            onCreateCharacterTag={onCreateCharacterTag}
            onUpdateCharacterRelationships={onUpdateCharacterRelationships}
            onUpdateCharacterNodePositions={onUpdateCharacterNodePositions}
            onUpdateCharacterEdgePositions={onUpdateCharacterEdgePositions}
            equipmentManifest={equipment}
            financeSettings={project.financeSettings}
            onUpdateFinanceSettings={onUpdateFinanceSettings}
            onRecalculateFinances={onRecalculateFinances}
            locationCount={locationCount}
            onSwitchSubView={(view) => {
              if (view === 'stripboard') setActiveTab('stripboard');
              else if (view === 'location_map') setActiveTab('location_map');
              else setActiveTab('cast_crew');
            }}
            onSelectScene={onJumpToAuthoringScene}
            onImportScriptCast={onImportScriptCast}
          />
        )}

        {activeTab === 'location_map' && (
          <LocationMapView
            projectTitle={project.title}
            scenes={project.scenes}
            savedLocations={project.locations || []}
            crewCount={members.length}
            onUpdateLocations={onUpdateLocations}
            onSwitchSubView={(view) => {
              if (view === 'stripboard') setActiveTab('stripboard');
              else if (view === 'cast_crew') setActiveTab('cast_crew');
              else setActiveTab('location_map');
            }}
            onSelectScene={onJumpToAuthoringScene}
          />
        )}

        {activeTab === 'equipment' && (
          <EquipmentManifestPanel
            project={project}
            equipment={equipment}
            onUpdateEquipment={onUpdateEquipment}
            onSelectScene={onJumpToAuthoringScene}
            onNotify={onNotify}
          />
        )}

        {activeTab === 'budget' && (
          <ProductionBudgetPanel
            members={members}
            scenes={project.scenes}
            strips={project.strips}
            equipmentManifest={equipment}
            financeSettings={project.financeSettings}
            onUpdateFinanceSettings={onUpdateFinanceSettings}
            onRecalculateFinances={onRecalculateFinances}
            onOpenEquipmentManifest={() => setActiveTab('equipment')}
            onEditMember={() => setActiveTab('cast_crew')}
            onSelectMember={() => setActiveTab('cast_crew')}
            onAddMember={() => {
              setActiveTab('cast_crew');
              setAddMemberNonce((n) => n + 1);
            }}
          />
        )}

        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#171717]">
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-[#222222] border border-[#363636] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-100">Logline &amp; Project Overview</h2>
                  <button
                    type="button"
                    onClick={() => onJumpToAuthoringScene(project.scenes[0]?.id || '')}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                  >
                    <span>Open Script</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-400">Master Logline</span>
                  <textarea
                    rows={2}
                    value={bible.logline}
                    onChange={(e) => updateBibleField('logline', e.target.value)}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded p-2.5 text-sm text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <span className="text-[11px] text-gray-400">Genre</span>
                    <input
                      type="text"
                      value={bible.genre}
                      onChange={(e) => updateBibleField('genre', e.target.value)}
                      className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-gray-400">Format Classification</span>
                    <input
                      type="text"
                      value={bible.formatLabel}
                      onChange={(e) => updateBibleField('formatLabel', e.target.value)}
                      className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-gray-400">Target Runtime</span>
                    <input
                      type="text"
                      value={bible.targetRuntime}
                      onChange={(e) => updateBibleField('targetRuntime', e.target.value)}
                      className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-400">Executive Summary &amp; Overview</span>
                  <textarea
                    rows={4}
                    value={bible.pitchSummary}
                    onChange={(e) => updateBibleField('pitchSummary', e.target.value)}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded p-2.5 text-xs text-gray-200 leading-relaxed focus:outline-none focus:border-[#ff8000]"
                  />
                </label>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] text-gray-400 block">Core Themes</span>
                  <div className="flex flex-wrap gap-2">
                    {bible.themes.map((th) => (
                      <span
                        key={th}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] border border-[#3b3b3b] text-gray-200"
                      >
                        <span>{th}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateBibleField(
                              'themes',
                              bible.themes.filter((t) => t !== th)
                            )
                          }
                          className="text-gray-500 hover:text-rose-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="text"
                      value={newTheme}
                      onChange={(e) => setNewTheme(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTheme();
                        }
                      }}
                      placeholder="Add theme..."
                      className="flex-1 bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                    <button
                      type="button"
                      onClick={handleAddTheme}
                      className="px-3 py-1.5 rounded bg-[#2d2d2d] hover:bg-[#3a3a3a] text-amber-300 font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pitch' && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#171717]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-100">Pitch Documents &amp; Lookbook</h2>
                  <p className="text-[11px] text-gray-400">
                    Structured pitch sections bundled directly inside this production package.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPitch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pitch Section</span>
                </button>
              </div>

              <div className="space-y-3">
                {bible.pitchDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-[#222222] border border-[#363636] rounded p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) =>
                            updateBibleField(
                              'pitchDocs',
                              bible.pitchDocs.map((d) =>
                                d.id === doc.id ? { ...d, title: e.target.value } : d
                              )
                            )
                          }
                          className="bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1 font-semibold text-gray-100 flex-1 max-w-md focus:outline-none focus:border-[#ff8000]"
                        />
                        <select
                          value={doc.category}
                          onChange={(e) =>
                            updateBibleField(
                              'pitchDocs',
                              bible.pitchDocs.map((d) =>
                                d.id === doc.id
                                  ? { ...d, category: e.target.value as PitchSection['category'] }
                                  : d
                              )
                            )
                          }
                          className="bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1 text-amber-300 focus:outline-none focus:border-[#ff8000]"
                        >
                          <option value="Hook & Premise">Hook &amp; Premise</option>
                          <option value="World & Tone">World &amp; Tone</option>
                          <option value="Story Arc">Story Arc</option>
                          <option value="Audience & Comps">Audience &amp; Comps</option>
                          <option value="Visual Approach">Visual Approach</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateBibleField(
                            'pitchDocs',
                            bible.pitchDocs.filter((d) => d.id !== doc.id)
                          )
                        }
                        className="p-1.5 text-gray-400 hover:text-rose-400 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={doc.content}
                      onChange={(e) =>
                        updateBibleField(
                          'pitchDocs',
                          bible.pitchDocs.map((d) =>
                            d.id === doc.id ? { ...d, content: e.target.value } : d
                          )
                        )
                      }
                      className="w-full bg-[#151515] border border-[#3a3a3a] rounded p-2.5 text-gray-200 leading-relaxed focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'research' && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#171717]">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-100">Research &amp; Reference Notes</h2>
                  <select
                    value={researchFilter}
                    onChange={(e) => setResearchFilter(e.target.value)}
                    className="bg-[#181818] border border-[#3a3a3a] rounded px-2.5 py-1 text-gray-200 focus:outline-none focus:border-[#ff8000]"
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
                  type="button"
                  onClick={handleAddResearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold"
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
                      className="bg-[#222222] border border-[#363636] rounded p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={note.title}
                            onChange={(e) =>
                              updateBibleField(
                                'researchNotes',
                                bible.researchNotes.map((r) =>
                                  r.id === note.id ? { ...r, title: e.target.value } : r
                                )
                              )
                            }
                            className="bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1 font-semibold text-gray-100 flex-1 max-w-md focus:outline-none focus:border-[#ff8000]"
                          />
                          <select
                            value={note.topic}
                            onChange={(e) =>
                              updateBibleField(
                                'researchNotes',
                                bible.researchNotes.map((r) =>
                                  r.id === note.id
                                    ? { ...r, topic: e.target.value as ResearchNote['topic'] }
                                    : r
                                )
                              )
                            }
                            className="bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1 text-cyan-300 focus:outline-none focus:border-[#ff8000]"
                          >
                            <option value="Worldbuilding">Worldbuilding</option>
                            <option value="Technical / Sci-Fi">Technical / Sci-Fi</option>
                            <option value="Historical / Period">Historical / Period</option>
                            <option value="Location">Location</option>
                            <option value="Character Study">Character Study</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateBibleField(
                              'researchNotes',
                              bible.researchNotes.filter((r) => r.id !== note.id)
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={note.summary}
                        onChange={(e) =>
                          updateBibleField(
                            'researchNotes',
                            bible.researchNotes.map((r) =>
                              r.id === note.id ? { ...r, summary: e.target.value } : r
                            )
                          )
                        }
                        placeholder="Document technical notes, historical sources, or visual references..."
                        className="w-full bg-[#151515] border border-[#3a3a3a] rounded p-2 text-gray-200 focus:outline-none focus:border-[#ff8000]"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <input
                          type="text"
                          value={note.sourceRef || ''}
                          onChange={(e) =>
                            updateBibleField(
                              'researchNotes',
                              bible.researchNotes.map((r) =>
                                r.id === note.id ? { ...r, sourceRef: e.target.value } : r
                              )
                            )
                          }
                          placeholder="Source URL / citation (optional)"
                          className="bg-[#151515] border border-[#333] rounded px-2 py-1 text-gray-300 w-72 focus:outline-none focus:border-[#ff8000]"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {project.scenes.slice(0, 8).map((sc) => {
                            const linked = note.linkedSceneIds.includes(sc.id);
                            return (
                              <button
                                key={sc.id}
                                type="button"
                                onClick={() => {
                                  const nextIds = linked
                                    ? note.linkedSceneIds.filter((id) => id !== sc.id)
                                    : [...note.linkedSceneIds, sc.id];
                                  updateBibleField(
                                    'researchNotes',
                                    bible.researchNotes.map((r) =>
                                      r.id === note.id ? { ...r, linkedSceneIds: nextIds } : r
                                    )
                                  );
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
          </div>
        )}

        {activeTab === 'storyboards' && (
          <StoryboardWorkspace
            project={project}
            scenes={project.scenes}
            storyboards={project.storyboards || []}
            onUpdateStoryboards={onUpdateStoryboards}
            onSelectScene={onJumpToAuthoringScene}
          />
        )}

        {activeTab === 'teleprompter' && (
          <TeleprompterWindow
            projects={projects}
            initialProjectId={project.id}
            embedded={true}
          />
        )}
      </div>
    </div>
  );
};
