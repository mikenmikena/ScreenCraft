import React, { useMemo, useState } from 'react';
import { StoryProject } from '../types/story';
import {
  DOCUMENT_TEMPLATE_DEFS,
  DocumentTemplateKind,
} from '../utils/projectTemplates';
import { UserDocumentTemplate } from '../utils/sccrftFileFormat';
import {
  Film,
  Theater,
  BookOpen,
  Tv,
  Clapperboard,
  FolderInput,
  CalendarPlus,
  Clock,
  User,
  ChevronRight,
  Search,
  Upload,
  Calendar,
  Users,
  MapPin,
  FilePlus2,
  FolderOpen,
  Check,
  X,
  ArrowRight,
  HardDriveUpload,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { BrandIcon } from './BrandIcon';

export type HomeSectionTab = 'all' | 'authoring' | 'production';

interface ProjectsBrowserProps {
  projects: StoryProject[];
  currentProjectId: string;
  userTemplates?: UserDocumentTemplate[];
  onSelectProject: (id: string, workspace?: 'authoring' | 'production', subView?: 'stripboard' | 'cast_crew' | 'location_map') => void;
  onCreateFromDocumentTemplate: (
    kind: DocumentTemplateKind,
    options?: { title?: string; author?: string }
  ) => void;
  onCreateFromUserTemplate?: (
    template: UserDocumentTemplate,
    options?: { title?: string; author?: string }
  ) => void;
  onDeleteUserTemplate?: (templateId: string) => void;
  onOpenFromDevice: () => void;
  onCreateNewProduction: (options: {
    title: string;
    author: string;
    startDate: string;
    shootDays: number;
  }) => void;
  onImportProductionFromProject: (options: {
    sourceProjectId: string;
    targetProjectId: string | 'new';
    newTitle: string;
    parts: {
      strips: boolean;
      crew: boolean;
      locations: boolean;
      tags: boolean;
      storyboards: boolean;
    };
  }) => void;
  onCreateNewProductionSchedule: (options: {
    sourceProjectId: string | 'blank';
    title: string;
    startDate: string;
    daysCount: number;
    callTime: string;
    wrapTime: string;
  }) => void;
  onOpenImportScriptModal: () => void;
}

function getTemplateIcon(kind: DocumentTemplateKind) {
  switch (kind) {
    case 'film':
      return <Film className="w-5 h-5 text-[#ff8000]" />;
    case 'stage':
      return <Theater className="w-5 h-5 text-amber-300" />;
    case 'book':
      return <BookOpen className="w-5 h-5 text-emerald-400" />;
    case 'television':
      return <Tv className="w-5 h-5 text-cyan-400" />;
  }
}

function getCategoryBadgeLabel(proj: StoryProject): { label: string; colorClass: string } {
  switch (proj.documentCategory) {
    case 'stage':
      return {
        label: 'STAGE',
        colorClass: 'bg-amber-950/70 text-amber-300 border-amber-600/40',
      };
    case 'book':
      return {
        label: 'BOOK',
        colorClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/40',
      };
    case 'television':
      return {
        label: 'TELEVISION',
        colorClass: 'bg-cyan-950/70 text-cyan-300 border-cyan-600/40',
      };
    case 'production':
      return {
        label: 'PRODUCTION',
        colorClass: 'bg-violet-950/70 text-violet-300 border-violet-600/40',
      };
    case 'film':
    default:
      return {
        label: 'FILM',
        colorClass: 'bg-[#2e1e0f] text-amber-300 border-[#ff7700]/40',
      };
  }
}

export const ProjectsBrowser: React.FC<ProjectsBrowserProps> = ({
  projects,
  currentProjectId,
  userTemplates = [],
  onSelectProject,
  onCreateFromDocumentTemplate,
  onCreateFromUserTemplate,
  onDeleteUserTemplate,
  onOpenFromDevice,
  onCreateNewProduction,
  onImportProductionFromProject,
  onCreateNewProductionSchedule,
  onOpenImportScriptModal,
}) => {
  const [activeSection, setActiveSection] = useState<HomeSectionTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('Jeffrey (Online)');

  // Inline / Modal Production Template Wizards
  const [activeProdWizard, setActiveProdWizard] = useState<
    null | 'new_production' | 'import_production' | 'new_schedule'
  >(null);

  // New Production State
  const [newProdTitle, setNewProdTitle] = useState('New Production Unit');
  const [newProdStartDate, setNewProdStartDate] = useState('2026-11-24');
  const [newProdDays, setNewProdDays] = useState(3);

  // Import Production From Other Projects State
  const [importSourceId, setImportSourceId] = useState<string>(
    () => projects[0]?.id || ''
  );
  const [importTargetId, setImportTargetId] = useState<string | 'new'>('new');
  const [importNewTitle, setImportNewTitle] = useState('');
  const [importParts, setImportParts] = useState({
    strips: true,
    crew: true,
    locations: true,
    tags: true,
    storyboards: false,
  });

  // New Production Schedule State
  const [schedSourceId, setSchedSourceId] = useState<string | 'blank'>(
    () => currentProjectId || projects[0]?.id || 'blank'
  );
  const [schedTitle, setSchedTitle] = useState('');
  const [schedStartDate, setSchedStartDate] = useState('2026-11-24');
  const [schedDaysCount, setSchedDaysCount] = useState(3);
  const [schedCallTime, setSchedCallTime] = useState('07:30');
  const [schedWrapTime, setSchedWrapTime] = useState('19:00');

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        (p.documentCategory || 'film').toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const showAuthoring = activeSection === 'all' || activeSection === 'authoring';
  const showProduction = activeSection === 'all' || activeSection === 'production';

  const openWizard = (wizard: 'new_production' | 'import_production' | 'new_schedule') => {
    if (wizard === 'import_production') {
      const firstId = projects[0]?.id || '';
      setImportSourceId((prev) => prev || firstId);
      const src = projects.find((p) => p.id === (importSourceId || firstId));
      if (src && !importNewTitle) {
        setImportNewTitle(`${src.title} — Production`);
      }
    } else if (wizard === 'new_schedule') {
      const targetProj = projects.find((p) => p.id === currentProjectId) || projects[0];
      setSchedSourceId(targetProj?.id || 'blank');
      setSchedTitle(targetProj ? `${targetProj.title} — Shoot Schedule` : 'New Shooting Schedule');
    }
    setActiveProdWizard(wizard);
  };

  return (
    <div className="flex-1 bg-[#181818] text-gray-200 overflow-y-auto p-6 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Home Launch Header + Section Tabs */}
        <div className="bg-[#212121] border border-[#343434] rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <BrandIcon size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  ScreenCraft Studio
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#2e1e0f] border border-[#ff7700]/40 text-[10px] font-bold text-[#ff8c1a] uppercase tracking-wider">
                  Launch Hub
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Start a new Film, Stage, Book, or Television document, open an existing project, or launch a Production workflow.
              </p>
            </div>
          </div>

          {/* Section Switcher: All / Authoring / Production */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="flex flex-wrap items-center bg-[#151515] border border-[#383838] rounded-md p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveSection('all')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === 'all'
                    ? 'bg-[#ff7700] text-black'
                    : 'text-gray-300 hover:text-white hover:bg-[#262626]'
                }`}
              >
                All Sections
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('authoring')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === 'authoring'
                    ? 'bg-[#ff7700] text-black'
                    : 'text-gray-300 hover:text-white hover:bg-[#262626]'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Authoring</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('production')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === 'production'
                    ? 'bg-[#ff7700] text-black'
                    : 'text-gray-300 hover:text-white hover:bg-[#262626]'
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5" />
                <span>Production</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* SECTION 1: AUTHORING                                    */}
        {/* ======================================================= */}
        {showAuthoring && (
          <section
            aria-label="Authoring Section"
            className="bg-[#1e1e1e] border border-[#343434] rounded-lg p-5 sm:p-6 space-y-6"
          >
            {/* Authoring Section Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[#2f2f2f] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#ff8000]" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Authoring
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Create a new document from a script template or reopen an existing script from your library.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Optional title for new document..."
                  className="bg-[#141414] border border-[#3c3c3c] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 w-56"
                />
                <input
                  type="text"
                  value={draftAuthor}
                  onChange={(e) => setDraftAuthor(e.target.value)}
                  placeholder="Author name"
                  className="bg-[#141414] border border-[#3c3c3c] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 w-40"
                />
                <button
                  type="button"
                  onClick={onOpenImportScriptModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#272727] hover:bg-[#333333] border border-[#444] text-xs font-medium text-gray-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import Script</span>
                </button>
              </div>
            </div>

            {/* New Document Templates: Film, Stage, Book, Television */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  New Document Templates
                </h3>
                <span className="text-[11px] text-gray-500">
                  Click any template to launch in Authoring
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {DOCUMENT_TEMPLATE_DEFS.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() =>
                      onCreateFromDocumentTemplate(tpl.id, {
                        title: draftTitle.trim() || undefined,
                        author: draftAuthor.trim() || undefined,
                      })
                    }
                    className="text-left bg-[#252525] hover:bg-[#2b2620] border border-[#3b3b3b] hover:border-[#ff7700] rounded-lg p-4 transition-all group flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-9 h-9 rounded-md bg-[#181818] border border-[#383838] group-hover:border-[#ff7700]/60 flex items-center justify-center">
                          {getTemplateIcon(tpl.id)}
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#181818] border border-[#383838] text-[10px] font-mono font-bold text-gray-300">
                          {tpl.badge}
                        </span>
                      </div>

                      <div>
                        <div className="text-sm font-bold text-gray-100 group-hover:text-amber-300 transition-colors">
                          {tpl.title}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {tpl.subtitle}
                        </div>
                      </div>

                      <ul className="space-y-1 pt-1">
                        {tpl.highlights.map((h) => (
                          <li
                            key={h}
                            className="text-[11px] text-gray-400 flex items-center gap-1.5"
                          >
                            <span className="w-1 h-1 rounded-full bg-[#ff8000] shrink-0" />
                            <span className="truncate">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2.5 border-t border-[#343434] flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-mono">{tpl.fontLabel}</span>
                      <span className="text-[#ff8c1a] font-semibold flex items-center gap-1 whitespace-nowrap">
                        <span>Create</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {userTemplates.length > 0 && (
                <div className="pt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Saved Custom Templates</span>
                    </h4>
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {userTemplates.length} saved
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {userTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() =>
                          onCreateFromUserTemplate?.(tpl, {
                            title: draftTitle.trim() || undefined,
                            author: draftAuthor.trim() || undefined,
                          })
                        }
                        className="bg-[#232129] hover:bg-[#2b2633] border border-[#3d384a] hover:border-violet-400 rounded-lg p-3.5 cursor-pointer transition-all flex flex-col justify-between gap-2.5 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#18161d] border border-[#3d384a] text-violet-300">
                              {tpl.category}
                            </span>
                            {onDeleteUserTemplate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteUserTemplate(tpl.id);
                                }}
                                className="p-1 text-gray-500 hover:text-rose-400 rounded"
                                title="Delete custom template"
                                aria-label={`Delete template ${tpl.name}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="text-xs font-bold text-gray-100 group-hover:text-violet-200 truncate">
                            {tpl.name}
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-[#34303e] flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">{tpl.savedAt}</span>
                          <span className="text-violet-300 font-semibold flex items-center gap-1 whitespace-nowrap">
                            <span>Use Template</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Open Existing Document */}
            <div className="space-y-3 pt-2 border-t border-[#2d2d2d]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Open Existing Document
                  </h3>
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    ({filteredProjects.length} available)
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter documents by title, author..."
                    className="w-full bg-[#141414] border border-[#3a3a3a] focus:border-[#ff8000] focus:outline-none rounded pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear filter"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dedicated Open from Device Card */}
              <button
                type="button"
                onClick={onOpenFromDevice}
                className="w-full text-left bg-[#1a1a1a] hover:bg-[#231e18] border border-dashed border-[#444444] hover:border-[#ff7700] rounded-lg px-4 py-3 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-[#252019] border border-[#ff7700]/40 flex items-center justify-center shrink-0">
                    <HardDriveUpload className="w-4 h-4 text-[#ff8c1a]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-100 group-hover:text-amber-300 transition-colors">
                      Open from Device
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">
                      Open local ScreenCraft (.sccrft), Final Draft (.fdx), or Fountain (.fountain) files from your computer
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-amber-300 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0">
                  <span>Browse Files</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>

              {filteredProjects.length === 0 ? (
                <div className="bg-[#171717] border border-[#303030] rounded-lg p-6 text-center text-xs text-gray-400">
                  No documents match "{searchQuery}". Clear the filter or pick a template above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredProjects.map((proj) => {
                    const isCurrent = proj.id === currentProjectId;
                    const totalEighths = proj.scenes.reduce((acc, s) => acc + (s.eighths || 0), 0);
                    const cat = getCategoryBadgeLabel(proj);

                    return (
                      <div
                        key={proj.id}
                        onClick={() => onSelectProject(proj.id, 'authoring')}
                        className={`p-4 rounded-lg border transition-all cursor-pointer group ${
                          isCurrent
                            ? 'bg-[#28211a] border-[#ff7700]'
                            : 'bg-[#242424] border-[#383838] hover:border-[#555] hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-9 h-9 rounded bg-[#1a1a1a] flex items-center justify-center border border-[#3a3a3a] group-hover:border-[#ff7700] shrink-0">
                              <Film className="w-4 h-4 text-[#ff7700]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-gray-100 group-hover:text-amber-300 transition-colors truncate">
                                  {proj.title}
                                </h4>
                                <span
                                  className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${cat.colorClass}`}
                                >
                                  {cat.label}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                                <span className="flex items-center space-x-1 truncate">
                                  <User className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{proj.author}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center space-x-1 shrink-0">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>{proj.lastModified}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff7700] text-black shrink-0">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-[#333] text-center text-xs">
                          <div className="bg-[#1b1b1b] p-2 rounded border border-[#313131]">
                            <div className="text-[10px] text-gray-400">SCENES</div>
                            <div className="font-bold text-cyan-400 font-mono tabular-nums mt-0.5">
                              {proj.scenes.length}
                            </div>
                          </div>
                          <div className="bg-[#1b1b1b] p-2 rounded border border-[#313131]">
                            <div className="text-[10px] text-gray-400">PAGES</div>
                            <div className="font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                              {(totalEighths / 8).toFixed(1)}
                            </div>
                          </div>
                          <div className="bg-[#1b1b1b] p-2 rounded border border-[#313131]">
                            <div className="text-[10px] text-gray-400">ELEMENTS</div>
                            <div className="font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                              {proj.elements.length}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs">
                          <span className="text-[11px] text-gray-400">
                            Open in Authoring Editor
                          </span>
                          <span className="text-[#ff8c1a] font-semibold flex items-center gap-0.5">
                            <span>Open</span>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ======================================================= */}
        {/* SECTION 2: PRODUCTION                                   */}
        {/* ======================================================= */}
        {showProduction && (
          <section
            aria-label="Production Section"
            className="bg-[#1e1e1e] border border-[#343434] rounded-lg p-5 sm:p-6 space-y-6"
          >
            {/* Production Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2f2f2f] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Production
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Launch a new production, import stripboard/crew/locations from another project, or build a fresh shooting schedule.
                </p>
              </div>
            </div>

            {/* Production Templates: New Production, Import Production from Other Projects, New Production Schedule */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Production Templates
                </h3>
                <span className="text-[11px] text-gray-500">
                  Select a production workflow to configure and launch
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Template 1: New Production */}
                <button
                  type="button"
                  onClick={() => openWizard('new_production')}
                  className={`text-left rounded-lg border p-4 transition-all flex flex-col justify-between gap-3 group ${
                    activeProdWizard === 'new_production'
                      ? 'bg-[#2a2219] border-[#ff7700]'
                      : 'bg-[#252525] hover:bg-[#2a2520] border-[#3b3b3b] hover:border-[#ff7700]'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-md bg-[#181818] border border-[#383838] group-hover:border-[#ff7700]/60 flex items-center justify-center">
                        <Clapperboard className="w-5 h-5 text-[#ff8000]" />
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#181818] border border-[#383838] text-[10px] font-mono text-amber-300">
                        UNIT SETUP
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-100 group-hover:text-amber-300">
                        New Production
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Create a full production container with pre-configured crew roster (1st AD, DP, Line Producer), locations, and Day 1–2 breakdown.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#343434] flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Stripboard + Cast/Crew + Locations</span>
                    <span className="text-[#ff8c1a] font-semibold flex items-center gap-1 whitespace-nowrap">
                      <span>Start</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>

                {/* Template 2: Import Production from Other Projects */}
                <button
                  type="button"
                  onClick={() => openWizard('import_production')}
                  className={`text-left rounded-lg border p-4 transition-all flex flex-col justify-between gap-3 group ${
                    activeProdWizard === 'import_production'
                      ? 'bg-[#1a252b] border-cyan-400'
                      : 'bg-[#252525] hover:bg-[#1e262b] border-[#3b3b3b] hover:border-cyan-400'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-md bg-[#181818] border border-[#383838] group-hover:border-cyan-400/60 flex items-center justify-center">
                        <FolderInput className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#181818] border border-[#383838] text-[10px] font-mono text-cyan-300">
                        CROSS-PROJECT
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-100 group-hover:text-cyan-300">
                        Import Production from Other Projects
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Copy stripboard schedules, cast & crew rosters, locations, props/wardrobe tags, or shot lists from any existing project.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#343434] flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Clone or merge production data</span>
                    <span className="text-cyan-300 font-semibold flex items-center gap-1 whitespace-nowrap">
                      <span>Configure</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>

                {/* Template 3: New Production Schedule */}
                <button
                  type="button"
                  onClick={() => openWizard('new_schedule')}
                  className={`text-left rounded-lg border p-4 transition-all flex flex-col justify-between gap-3 group ${
                    activeProdWizard === 'new_schedule'
                      ? 'bg-[#192821] border-emerald-400'
                      : 'bg-[#252525] hover:bg-[#1d2722] border-[#3b3b3b] hover:border-emerald-400'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-md bg-[#181818] border border-[#383838] group-hover:border-emerald-400/60 flex items-center justify-center">
                        <CalendarPlus className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#181818] border border-[#383838] text-[10px] font-mono text-emerald-300">
                        STRIPBOARD
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-100 group-hover:text-emerald-300">
                        New Production Schedule
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Generate a multi-day shooting stripboard with Day Breaks, Meal Turnarounds, and Call/Wrap times from script scenes or scratch.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[#343434] flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Auto-distribute scenes across days</span>
                    <span className="text-emerald-300 font-semibold flex items-center gap-1 whitespace-nowrap">
                      <span>Build Schedule</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Interactive Setup Drawer for Selected Production Template */}
            {activeProdWizard === 'new_production' && (
              <div className="bg-[#171717] border border-[#ff7700]/70 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-[#ff8000]" />
                    <h4 className="text-sm font-bold text-white">Configure New Production</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveProdWizard(null)}
                    className="text-gray-400 hover:text-white p-1"
                    aria-label="Close setup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Production Title
                    </span>
                    <input
                      type="text"
                      value={newProdTitle}
                      onChange={(e) => setNewProdTitle(e.target.value)}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      First Shoot Date
                    </span>
                    <input
                      type="date"
                      value={newProdStartDate}
                      onChange={(e) => setNewProdStartDate(e.target.value)}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Initial Shoot Days
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newProdDays}
                      onChange={(e) => setNewProdDays(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-[#ff8000] focus:outline-none rounded px-3 py-1.5 text-xs text-white tabular-nums"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveProdWizard(null)}
                    className="px-3 py-1.5 rounded bg-[#252525] hover:bg-[#303030] border border-[#404040] text-xs text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNewProduction({
                        title: newProdTitle.trim() || 'New Production Unit',
                        author: draftAuthor.trim() || 'Jeffrey (Online)',
                        startDate: newProdStartDate,
                        shootDays: newProdDays,
                      });
                      setActiveProdWizard(null);
                    }}
                    className="px-4 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Create & Open Production</span>
                  </button>
                </div>
              </div>
            )}

            {activeProdWizard === 'import_production' && (
              <div className="bg-[#171717] border border-cyan-500/70 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
                  <div className="flex items-center gap-2">
                    <FolderInput className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">
                      Import Production from Other Projects
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveProdWizard(null)}
                    className="text-gray-400 hover:text-white p-1"
                    aria-label="Close import setup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Source Project
                    </span>
                    <select
                      value={importSourceId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setImportSourceId(nextId);
                        const src = projects.find((p) => p.id === nextId);
                        if (src) setImportNewTitle(`${src.title} — Production`);
                      }}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-cyan-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.strips.length} strips, {(p.crewMembers || []).length} crew)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Destination Project
                    </span>
                    <select
                      value={importTargetId}
                      onChange={(e) => setImportTargetId(e.target.value)}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-cyan-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="new">Create New Production Project</option>
                      {projects
                        .filter((p) => p.id !== importSourceId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            Merge into: {p.title}
                          </option>
                        ))}
                    </select>
                  </label>

                  {importTargetId === 'new' && (
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-300 block">
                        New Production Title
                      </span>
                      <input
                        type="text"
                        value={importNewTitle}
                        onChange={(e) => setImportNewTitle(e.target.value)}
                        placeholder="Production Unit Title"
                        className="w-full bg-[#111] border border-[#3a3a3a] focus:border-cyan-400 focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-300 block">
                    Production Data to Import
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'strips' as const, label: 'Stripboard Schedule & Day Breaks' },
                      { key: 'crew' as const, label: 'Cast & Crew Directory' },
                      { key: 'locations' as const, label: 'Shooting Locations' },
                      { key: 'tags' as const, label: 'Prop & Wardrobe Tags' },
                      { key: 'storyboards' as const, label: 'Storyboard Shot Lists' },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#212121] border border-[#383838] text-xs text-gray-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={importParts[opt.key]}
                          onChange={(e) =>
                            setImportParts((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                          }
                          className="accent-cyan-400"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveProdWizard(null)}
                    className="px-3 py-1.5 rounded bg-[#252525] hover:bg-[#303030] border border-[#404040] text-xs text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!importSourceId) return;
                      onImportProductionFromProject({
                        sourceProjectId: importSourceId,
                        targetProjectId: importTargetId,
                        newTitle: importNewTitle,
                        parts: importParts,
                      });
                      setActiveProdWizard(null);
                    }}
                    className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Import & Open Production</span>
                  </button>
                </div>
              </div>
            )}

            {activeProdWizard === 'new_schedule' && (
              <div className="bg-[#171717] border border-emerald-500/70 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Create New Production Schedule</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveProdWizard(null)}
                    className="text-gray-400 hover:text-white p-1"
                    aria-label="Close schedule builder"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Script / Scene Source
                    </span>
                    <select
                      value={schedSourceId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSchedSourceId(val);
                        if (val === 'blank') {
                          setSchedTitle('New Shooting Schedule');
                        } else {
                          const p = projects.find((pr) => pr.id === val);
                          if (p) setSchedTitle(`${p.title} — Shoot Schedule`);
                        }
                      }}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-emerald-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          Apply to: {p.title} ({p.scenes.length} scenes)
                        </option>
                      ))}
                      <option value="blank">New Blank Schedule Project</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Start Date
                    </span>
                    <input
                      type="date"
                      value={schedStartDate}
                      onChange={(e) => setSchedStartDate(e.target.value)}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-emerald-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      Shoot Days
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={schedDaysCount}
                      onChange={(e) => setSchedDaysCount(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-emerald-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white tabular-nums"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-300 block">
                        Call
                      </span>
                      <input
                        type="time"
                        value={schedCallTime}
                        onChange={(e) => setSchedCallTime(e.target.value)}
                        className="w-full bg-[#111] border border-[#3a3a3a] focus:border-emerald-400 focus:outline-none rounded px-2 py-1.5 text-xs text-white tabular-nums"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-300 block">
                        Wrap
                      </span>
                      <input
                        type="time"
                        value={schedWrapTime}
                        onChange={(e) => setSchedWrapTime(e.target.value)}
                        className="w-full bg-[#111] border border-[#3a3a3a] focus:border-emerald-400 focus:outline-none rounded px-2 py-1.5 text-xs text-white tabular-nums"
                      />
                    </label>
                  </div>
                </div>

                {schedSourceId === 'blank' && (
                  <label className="space-y-1 block max-w-md">
                    <span className="text-[11px] font-semibold text-gray-300 block">
                      New Schedule Project Title
                    </span>
                    <input
                      type="text"
                      value={schedTitle}
                      onChange={(e) => setSchedTitle(e.target.value)}
                      placeholder="New Shooting Schedule"
                      className="w-full bg-[#111] border border-[#3a3a3a] focus:border-emerald-400 focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                    />
                  </label>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveProdWizard(null)}
                    className="px-3 py-1.5 rounded bg-[#252525] hover:bg-[#303030] border border-[#404040] text-xs text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNewProductionSchedule({
                        sourceProjectId: schedSourceId,
                        title: schedTitle.trim() || 'New Shooting Schedule',
                        startDate: schedStartDate,
                        daysCount: schedDaysCount,
                        callTime: schedCallTime,
                        wrapTime: schedWrapTime,
                      });
                      setActiveProdWizard(null);
                    }}
                    className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Generate Schedule & Open Stripboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Existing Production Schedules List */}
            <div className="space-y-3 pt-2 border-t border-[#2d2d2d]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Existing Production Workspace</span>
                </h3>
                <span className="text-[11px] text-gray-500 tabular-nums">
                  {projects.length} productions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((proj) => {
                  const dayCount = proj.strips.filter((s) => s.type === 'day_break').length;
                  const sceneStripCount = proj.strips.filter((s) => s.type === 'scene').length;
                  const crewCount = (proj.crewMembers || []).length;
                  const locationCount = (proj.locations || []).length;

                  return (
                    <div
                      key={`prod-row-${proj.id}`}
                      className="p-3.5 rounded-lg bg-[#242424] border border-[#383838] hover:border-[#4e4e4e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-100 truncate">
                            {proj.title}
                          </span>
                          {proj.id === currentProjectId && (
                            <span className="px-1.5 py-0.5 rounded bg-[#2f2214] border border-[#ff7700]/60 text-[9px] font-bold text-amber-300 shrink-0">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 mt-1 tabular-nums">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-cyan-400" />
                            <span>
                              {dayCount} {dayCount === 1 ? 'Day' : 'Days'} · {sceneStripCount} Strips
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-400" />
                            <span>{crewCount} Cast/Crew</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>{locationCount} Locations</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectProject(proj.id, 'production', 'stripboard')}
                          className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#ff7700] text-gray-200 hover:text-black border border-[#3e3e3e] hover:border-[#ff7700] text-[11px] font-semibold transition-colors whitespace-nowrap"
                        >
                          Stripboard
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProject(proj.id, 'production', 'cast_crew')}
                          className="px-2.5 py-1 rounded bg-[#1a1a1a] hover:bg-[#323232] text-gray-300 hover:text-white border border-[#3e3e3e] text-[11px] font-medium transition-colors whitespace-nowrap"
                        >
                          Cast & Crew
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
