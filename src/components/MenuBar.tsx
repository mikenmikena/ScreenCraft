import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Download,
  Upload,
  Printer,
  FileCode,
  Save,
  RotateCcw,
  RotateCw,
  Search,
  Layout,
  PlusCircle,
  FileSpreadsheet,
  MessageSquare,
  Tag as TagIcon,
  FolderOpen,
  Camera,
  Users,
  MapPin,
  AudioWaveform,
  RefreshCw,
  BookOpen,
  MonitorPlay,
  ShieldAlert,
  HelpCircle,
  Keyboard,
  FilePlus2,
  Eye,
  XCircle,
  BookmarkPlus,
  Film,
  Theater,
  Tv,
  ChevronRight,
  ListTree,
  GitPullRequest,
  Settings,
} from 'lucide-react';
import { ActiveWorkspace, ElementType } from '../types/story';
import { DocumentTemplateKind } from '../utils/projectTemplates';
import { HelpSectionCategory } from './HelpGuideModal';

interface MenuBarProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onExport: (format: 'pdf' | 'fdx' | 'fountain' | 'json' | 'csv') => void;
  onNewDocument?: (kind?: DocumentTemplateKind) => void;
  onOpenFromDevice?: () => void;
  onSave: () => void;
  onSaveAs?: () => void;
  onSaveAsTemplate?: () => void;
  onPrintPreview?: () => void;
  onPrint?: () => void;
  onOpenPreferences?: () => void;
  onCloseDocument?: () => void;
  onOpenReports: () => void;
  onAddElement: (type: ElementType) => void;
  onRecalculate: () => void;
  onAddDayBreak?: () => void;
  onAddComment?: () => void;
  onOpenCastCrew?: () => void;
  onOpenCharacterBreakdown?: () => void;
  onOpenCallSheet?: () => void;
  onOpenLocationMap?: () => void;
  onOpenNLEPipeline?: () => void;
  onOpenRevisionImpact?: () => void;
  onOpenTeleprompter?: () => void;
  onOpenContinuityCheck?: () => void;
  continuityAlertCount?: number;
  onOpenHelpGuide?: (category?: HelpSectionCategory, toolId?: string) => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onExport,
  onNewDocument,
  onOpenFromDevice,
  onSave,
  onSaveAs,
  onSaveAsTemplate,
  onPrintPreview,
  onPrint,
  onOpenPreferences,
  onCloseDocument,
  onOpenReports,
  onAddElement,
  onRecalculate,
  onAddDayBreak,
  onAddComment,
  onOpenCastCrew,
  onOpenCharacterBreakdown,
  onOpenCallSheet,
  onOpenLocationMap,
  onOpenNLEPipeline,
  onOpenRevisionImpact,
  onOpenTeleprompter,
  onOpenContinuityCheck,
  continuityAlertCount = 0,
  onOpenHelpGuide,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fileSubmenu, setFileSubmenu] = useState<null | 'new' | 'export'>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setFileSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (name: string) => {
    setFileSubmenu(null);
    setOpenMenu(openMenu === name ? null : name);
  };

  const closeAllMenus = () => {
    setOpenMenu(null);
    setFileSubmenu(null);
  };

  return (
    <div
      ref={menuRef}
      className="bg-[#262626] border-b border-[#3b3b3b] px-3 h-8 flex items-center justify-between text-xs select-none"
    >
      {/* Left Menu Items */}
      <div className="flex items-center space-x-0.5">
        {/* File Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'file' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              {/* New (with template options) */}
              <div
                className="relative"
                onMouseEnter={() => setFileSubmenu('new')}
                onMouseLeave={() => setFileSubmenu((prev) => (prev === 'new' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={() => setFileSubmenu((prev) => (prev === 'new' ? null : 'new'))}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between transition-colors ${
                    fileSubmenu === 'new' ? 'bg-[#333333] text-white' : ''
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <FilePlus2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>New</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {fileSubmenu === 'new' && (
                  <div className="absolute left-full top-0 ml-0.5 w-56 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        onNewDocument?.('film');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <Film className="w-3.5 h-3.5 text-[#ff8000]" />
                      <span>New Film Script</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNewDocument?.('stage');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <Theater className="w-3.5 h-3.5 text-amber-300" />
                      <span>New Stage Play</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNewDocument?.('book');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>New Book Manuscript</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNewDocument?.('television');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <Tv className="w-3.5 h-3.5 text-cyan-400" />
                      <span>New Television Script</span>
                    </button>
                    <div className="h-px bg-[#333333] my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectWorkspace('projects');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <Layout className="w-3.5 h-3.5 text-gray-300" />
                      <span>From Home Templates...</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Open (.sccrft, .fdx, .fountain) */}
              <button
                type="button"
                onClick={() => {
                  onOpenFromDevice?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open...</span>
                </span>
                <span className="text-[10px] text-gray-400">Ctrl+O</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              {/* Save (.sccrft) */}
              <button
                type="button"
                onClick={() => {
                  onSave();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save (.sccrft)</span>
                </span>
                <span className="text-[10px] text-gray-400">Ctrl+S</span>
              </button>

              {/* Save As (.sccrft) */}
              <button
                type="button"
                onClick={() => {
                  onSaveAs?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Save As...</span>
              </button>

              {/* Save as Template */}
              <button
                type="button"
                onClick={() => {
                  onSaveAsTemplate?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-violet-300" />
                <span>Save as Template...</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              {/* Export Submenu (PDF, Final Draft, Fountain, Schedule CSV) */}
              <div
                className="relative"
                onMouseEnter={() => setFileSubmenu('export')}
                onMouseLeave={() => setFileSubmenu((prev) => (prev === 'export' ? null : prev))}
              >
                <button
                  type="button"
                  onClick={() => setFileSubmenu((prev) => (prev === 'export' ? null : 'export'))}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between transition-colors ${
                    fileSubmenu === 'export' ? 'bg-[#333333] text-white' : ''
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {fileSubmenu === 'export' && (
                  <div className="absolute left-full top-0 ml-0.5 w-56 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        onExport('pdf');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF (.pdf)...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onExport('fdx');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      <span>Final Draft (.fdx)...</span>
                    </button>
                    <div className="h-px bg-[#333333] my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        onExport('fountain');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Fountain (.fountain)...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onExport('csv');
                        closeAllMenus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      <span>Schedule CSV (.csv)...</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="h-px bg-[#333333] my-1"></div>

              {/* Print Preview */}
              <button
                type="button"
                onClick={() => {
                  onPrintPreview?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Print Preview...</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={() => {
                  onPrint?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <Printer className="w-3.5 h-3.5 text-gray-200" />
                  <span>Print...</span>
                </span>
                <span className="text-[10px] text-gray-400">Ctrl+P</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              {/* Preferences */}
              <button
                type="button"
                onClick={() => {
                  onOpenPreferences?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-[#ff8000]" />
                <span>Preferences...</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  onCloseDocument?.();
                  closeAllMenus();
                }}
                onMouseEnter={() => setFileSubmenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 text-gray-400" />
                <span>Close</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('edit')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'edit' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <button
                onClick={() => setOpenMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs"
              >
                <span className="flex items-center space-x-2"><RotateCcw className="w-3.5 h-3.5" /><span>Undo</span></span>
                <span className="text-[10px] text-gray-400">Ctrl+Z</span>
              </button>
              <button
                onClick={() => setOpenMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs"
              >
                <span className="flex items-center space-x-2"><RotateCw className="w-3.5 h-3.5" /><span>Redo</span></span>
                <span className="text-[10px] text-gray-400">Ctrl+Y</span>
              </button>
              <div className="h-px bg-[#333333] my-1"></div>
              <button
                onClick={() => setOpenMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs"
              >
                <span className="flex items-center space-x-2"><Search className="w-3.5 h-3.5" /><span>Find & Replace</span></span>
                <span className="text-[10px] text-gray-400">Ctrl+F</span>
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('view')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'view' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-60 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <button
                onClick={() => {
                  onSelectWorkspace('authoring');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Authoring Workspace</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('characters');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Characters &amp; Connections</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('outline');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <ListTree className="w-3.5 h-3.5 text-cyan-400" />
                <span>Outline &amp; Beat Board</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('production');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Production Workspace</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('storyboard');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Storyboarding Workspace</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('collaboration');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-violet-400" />
                <span>Collaboration &amp; Redlines</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('teleprompter');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <MonitorPlay className="w-3.5 h-3.5 text-[#ff7700]" />
                <span>Teleprompter Workspace</span>
              </button>
              {onOpenTeleprompter && (
                <div className="h-px bg-[#333333] my-1"></div>
              )}
              {onOpenTeleprompter && (
                <button
                  onClick={() => {
                    onOpenTeleprompter();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <MonitorPlay className="w-3.5 h-3.5 text-[#ff7700]" />
                  <span>Pop-out Teleprompter Window...</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Production Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('production')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'production' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            Production
          </button>
          {openMenu === 'production' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <button
                onClick={() => {
                  onRecalculate();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Recalculate 1/8th Page Counts</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('production');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                <span>Generate Production Stripboard</span>
              </button>
              {onOpenCastCrew && (
                <button
                  onClick={() => {
                    onOpenCastCrew();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cast & Crew Address Book...</span>
                </button>
              )}
              {onOpenCharacterBreakdown && (
                <button
                  onClick={() => {
                    onOpenCharacterBreakdown();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Character Breakdown...</span>
                </button>
              )}
              {onOpenCallSheet && (
                <button
                  onClick={() => {
                    onOpenCallSheet();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Automated Call Sheet Generator...</span>
                </button>
              )}
              {onOpenLocationMap && (
                <button
                  onClick={() => {
                    onOpenLocationMap();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Shooting Location Map...</span>
                </button>
              )}
              {onOpenNLEPipeline && (
                <button
                  onClick={() => {
                    onOpenNLEPipeline();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <AudioWaveform className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Script-to-NLE & Premiere XML...</span>
                </button>
              )}
              {onOpenRevisionImpact && (
                <button
                  onClick={() => {
                    onOpenRevisionImpact();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Schedule Sync & Impact Preview...</span>
                </button>
              )}
              {onOpenContinuityCheck && (
                <button
                  onClick={() => {
                    onOpenContinuityCheck();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs"
                >
                  <span className="flex items-center space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Scene Continuity Check...</span>
                  </span>
                  {continuityAlertCount > 0 && (
                    <span className="text-[10px] font-mono text-rose-300 tabular-nums">
                      ({continuityAlertCount})
                    </span>
                  )}
                </button>
              )}
              {onOpenTeleprompter && (
                <button
                  onClick={() => {
                    onOpenTeleprompter();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <MonitorPlay className="w-3.5 h-3.5 text-[#ff7700]" />
                  <span>Filming Teleprompter Window...</span>
                </button>
              )}
              <button
                onClick={() => {
                  onSelectWorkspace('storyboard');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Camera Shot Lists & Storyboards</span>
              </button>
              {onAddDayBreak && (
                <button
                  onClick={() => {
                    onAddDayBreak();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Insert Day Break Banner</span>
                </button>
              )}
              <div className="h-px bg-[#333333] my-1"></div>
              <button
                onClick={() => {
                  onOpenReports();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Cast Breakdown & Scene Reports...</span>
              </button>
            </div>
          )}
        </div>

        {/* Review Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('review')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'review' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            Review
          </button>
          {openMenu === 'review' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <button
                onClick={() => {
                  if (onAddComment) onAddComment();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                <span>Add Margin Sticky Comment</span>
              </button>
              <button
                onClick={() => setOpenMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tag Element (Character / Prop / VFX)</span>
              </button>
              {onOpenContinuityCheck && (
                <>
                  <div className="h-px bg-[#333333] my-1"></div>
                  <button
                    onClick={() => {
                      onOpenContinuityCheck();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center space-x-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Scene Continuity Check...</span>
                    </span>
                    {continuityAlertCount > 0 && (
                      <span className="text-[10px] font-mono text-rose-300 tabular-nums">
                        {continuityAlertCount}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Insert Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('insert')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'insert' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            Insert
          </button>
          {openMenu === 'insert' && (
            <div className="absolute left-0 top-full mt-1 w-64 max-h-[75vh] overflow-y-auto bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 border-b border-[#333333] uppercase tracking-wider">
                Screenplay Elements (Ctrl+/)
              </div>
              {[
                { type: 'GENERAL' as ElementType, key: 'G', label: 'General' },
                { type: 'SCENE_HEADING' as ElementType, key: 'S', label: 'Scene Heading (INT./EXT.)', bold: true },
                { type: 'ACTION' as ElementType, key: 'A', label: 'Action' },
                { type: 'CHARACTER' as ElementType, key: 'C', label: 'Character', bold: true },
                { type: 'PARENTHETICAL' as ElementType, key: 'P', label: 'Parenthetical' },
                { type: 'DIALOGUE' as ElementType, key: 'D', label: 'Dialogue' },
                { type: 'VOICE_OVER' as ElementType, key: 'V', label: 'Voice-over (V.O.)', accent: 'text-violet-300' },
                { type: 'TRANSITION' as ElementType, key: 'T', label: 'Transition (CUT TO:)' },
                { type: 'SHOT' as ElementType, key: 'H', label: 'Shot (Camera Setup)' },
                { type: 'CAST_LIST' as ElementType, key: 'L', label: 'Cast List' },
                { type: 'NEW_ACT' as ElementType, key: 'N', label: 'New Act' },
                { type: 'SEQUENCE' as ElementType, key: 'Q', label: 'Sequence' },
                { type: 'END_OF_ACT' as ElementType, key: 'E', label: 'End of Act' },
                { type: 'SUMMARY' as ElementType, key: '0', label: 'Summary' },
                { type: 'OUTLINE_1' as ElementType, key: '1', label: 'Outline 1' },
                { type: 'OUTLINE_2' as ElementType, key: '2', label: 'Outline 2' },
                { type: 'OUTLINE_3' as ElementType, key: '3', label: 'Outline 3' },
                { type: 'NOTE' as ElementType, key: '4', label: 'Note' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    onAddElement(item.type);
                    setOpenMenu(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs ${
                    item.bold ? 'font-semibold' : ''
                  } ${item.accent || ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-amber-300/90">[{item.key}]</span>
                    <span>{item.label}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Alt+{item.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help Menu (Next to Insert) */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('help')}
            className={`px-2.5 py-1 rounded text-gray-300 hover:text-white hover:bg-[#333333] transition-colors ${
              openMenu === 'help' ? 'bg-[#333333] text-white' : ''
            }`}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className="absolute left-0 top-full mt-1 w-68 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 border-b border-[#333333] uppercase tracking-wider">
                Documentation & Walkthroughs
              </div>
              <button
                onClick={() => {
                  onOpenHelpGuide?.('all');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs font-semibold"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#ff8000]" />
                <span>Interactive Tool Guide...</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              <button
                onClick={() => {
                  onOpenHelpGuide?.('authoring', 'screenplay-editor');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Screenplay Authoring & Voice-over...</span>
              </button>
              <button
                onClick={() => {
                  onOpenHelpGuide?.('review', 'continuity-check');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Continuity Check & Revision Pass...</span>
              </button>
              <button
                onClick={() => {
                  onOpenHelpGuide?.('production', 'stripboard-sync');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stripboard, Cast & Connections...</span>
              </button>
              <button
                onClick={() => {
                  onOpenHelpGuide?.('export', 'export-live-preview');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <AudioWaveform className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Preview, NLE & Teleprompter...</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              <button
                onClick={() => {
                  onOpenHelpGuide?.('shortcuts');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Keyboard className="w-3.5 h-3.5 text-amber-300" />
                <span>Keyboard Shortcuts Reference...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Menu Controls: Reports Button & Workspace Dropdown */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenReports}
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#333333] hover:bg-[#3d3d3d] text-gray-200 rounded border border-[#484848] transition-colors"
          title="Open Production Reports"
        >
          <FileText className="w-3.5 h-3.5 text-[#ff8000]" />
          <span>Reports</span>
        </button>

        {/* Workspace selector matching Adobe Story */}
        <div className="flex items-center bg-[#1d1d1d] border border-[#3e3e3e] rounded px-2 py-0.5 text-gray-300">
          <span className="text-[11px] text-gray-400 mr-1.5">Workspace:</span>
          <select
            value={activeWorkspace}
            onChange={(e) => onSelectWorkspace(e.target.value as ActiveWorkspace)}
            className="bg-transparent text-xs text-amber-400 font-medium focus:outline-none cursor-pointer"
          >
            <option value="authoring" className="bg-[#222] text-gray-200">
              Authoring
            </option>
            <option value="characters" className="bg-[#222] text-gray-200">
              Characters
            </option>
            <option value="outline" className="bg-[#222] text-gray-200">
              Outline
            </option>
            <option value="production" className="bg-[#222] text-gray-200">
              Production
            </option>
            <option value="storyboard" className="bg-[#222] text-gray-200">
              Storyboarding
            </option>
            <option value="collaboration" className="bg-[#222] text-gray-200">
              Collaboration
            </option>
            <option value="teleprompter" className="bg-[#222] text-gray-200">
              Teleprompter
            </option>
            <option value="projects" className="bg-[#222] text-gray-200">
              Home (Authoring &amp; Production)
            </option>
          </select>
        </div>
      </div>
    </div>
  );
};
