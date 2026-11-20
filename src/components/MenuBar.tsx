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
  ChevronDown,
  Check,
  FolderOpen,
  Camera,
  Users,
  MapPin,
  AudioWaveform,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { ActiveWorkspace, ElementType, StoryProject } from '../types/story';

interface MenuBarProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onExport: (format: 'pdf' | 'fdx' | 'fountain' | 'json' | 'csv' | 'rust_zip') => void;
  onImport: () => void;
  onSave: () => void;
  onOpenReports: () => void;
  onAddElement: (type: ElementType) => void;
  onRecalculate: () => void;
  onOpenSample: (sampleId: string) => void;
  onAddDayBreak?: () => void;
  onAddComment?: () => void;
  onOpenCastCrew?: () => void;
  onOpenCharacterBreakdown?: () => void;
  onOpenCallSheet?: () => void;
  onOpenLocationMap?: () => void;
  onOpenNLEPipeline?: () => void;
  onOpenRevisionImpact?: () => void;
  currentProject: StoryProject;
  sampleProjects: StoryProject[];
}

export const MenuBar: React.FC<MenuBarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onExport,
  onImport,
  onSave,
  onOpenReports,
  onAddElement,
  onRecalculate,
  onOpenSample,
  onAddDayBreak,
  onAddComment,
  onOpenCastCrew,
  onOpenCharacterBreakdown,
  onOpenCallSheet,
  onOpenLocationMap,
  onOpenNLEPipeline,
  onOpenRevisionImpact,
  currentProject,
  sampleProjects,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
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
            <div className="absolute left-0 top-full mt-1 w-60 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 border-b border-[#333333] uppercase tracking-wider">
                Open Sample Project
              </div>
              {sampleProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onOpenSample(p.id);
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center justify-between text-xs transition-colors"
                >
                  <span className="truncate">{p.title}</span>
                  {currentProject.id === p.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}

              <div className="h-px bg-[#333333] my-1"></div>

              <button
                onClick={() => {
                  onSave();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Project</span>
                <span className="ml-auto text-[10px] text-gray-400">Ctrl+S</span>
              </button>

              <button
                onClick={() => {
                  onImport();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Fountain / Script...</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 border-b border-[#333333] uppercase tracking-wider">
                Export Options
              </div>
              <button
                onClick={() => {
                  onExport('pdf');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span>Export as PDF Screenplay...</span>
              </button>
              <button
                onClick={() => {
                  onExport('fdx');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Export as Final Draft (.fdx)...</span>
              </button>
              <button
                onClick={() => {
                  onExport('fountain');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export as Fountain Text (.fountain)...</span>
              </button>
              <button
                onClick={() => {
                  onExport('csv');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Schedule as CSV...</span>
              </button>

              <div className="h-px bg-[#333333] my-1"></div>

              <button
                onClick={() => {
                  onExport('rust_zip');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 bg-[#2d1f14] hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-amber-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="font-semibold">Export Rust Desktop Installer Package (.zip)</span>
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
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <button
                onClick={() => {
                  onSelectWorkspace('authoring');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Script Authoring View</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('production');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Production Stripboard View</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('project_bible');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Unified Project Bible & Pitch Hub</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('storyboard');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Storyboard & Animatic View</span>
              </button>
              <button
                onClick={() => {
                  onSelectWorkspace('rust_engine');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white flex items-center space-x-2 text-xs"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Rust Native Architecture & Hub</span>
              </button>
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
            <div className="absolute left-0 top-full mt-1 w-52 bg-[#222222] border border-[#444444] rounded shadow-2xl py-1 z-50 text-gray-200">
              <button
                onClick={() => {
                  onAddElement('SCENE_HEADING');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs font-semibold"
              >
                Scene Heading (INT./EXT.)
              </button>
              <button
                onClick={() => {
                  onAddElement('ACTION');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs"
              >
                Action
              </button>
              <button
                onClick={() => {
                  onAddElement('CHARACTER');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs font-semibold"
              >
                Character
              </button>
              <button
                onClick={() => {
                  onAddElement('DIALOGUE');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs"
              >
                Dialogue
              </button>
              <button
                onClick={() => {
                  onAddElement('PARENTHETICAL');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs"
              >
                Parenthetical
              </button>
              <button
                onClick={() => {
                  onAddElement('TRANSITION');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs"
              >
                Transition (CUT TO:)
              </button>
              <button
                onClick={() => {
                  onAddElement('SHOT');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#ff7700] hover:text-white text-xs"
              >
                Shot (Camera Setup)
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
            <option value="production" className="bg-[#222] text-gray-200">
              Production Schedule
            </option>
            <option value="storyboard" className="bg-[#222] text-gray-200">
              Storyboard & Animatic
            </option>
            <option value="rust_engine" className="bg-[#222] text-gray-200">
              Rust Desktop Hub
            </option>
            <option value="projects" className="bg-[#222] text-gray-200">
              Projects Browser
            </option>
          </select>
        </div>
      </div>
    </div>
  );
};
