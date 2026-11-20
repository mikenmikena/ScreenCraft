import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Sigma,
  GitCompare,
  FileText,
  RefreshCw,
  Columns,
  Film,
  AudioWaveform,
  PlusCircle,
} from 'lucide-react';
import { ElementType, ActiveWorkspace, ScriptFormatMode } from '../types/story';

interface FormattingToolbarProps {
  activeWorkspace: ActiveWorkspace;
  currentElementType: ElementType;
  onChangeElementType: (type: ElementType) => void;
  documentTitle: string;
  isModified?: boolean;
  onRecalculate?: () => void;
  onOpenReports?: () => void;
  onAddBreak?: () => void;
  scriptFormat?: ScriptFormatMode;
  onChangeScriptFormat?: (format: ScriptFormatMode) => void;
  onOpenNLEPipeline?: () => void;
  pendingSyncCount?: number;
  onOpenRevisionImpact?: () => void;
  zoomLevel: number;
  onChangeZoom: (zoom: number) => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  activeWorkspace,
  currentElementType,
  onChangeElementType,
  documentTitle,
  isModified = true,
  onRecalculate,
  onOpenReports,
  onAddBreak,
  scriptFormat = 'single_column_film',
  onChangeScriptFormat,
  onOpenNLEPipeline,
  pendingSyncCount = 0,
  onOpenRevisionImpact,
  zoomLevel,
  onChangeZoom,
}) => {
  return (
    <div className="bg-[#2e2e2e] border-b border-[#3e3e3e] flex flex-col text-xs select-none">
      {/* Document Tab Bar */}
      <div className="flex items-center px-2 bg-[#222222] border-b border-[#383838] h-7">
        <div className="flex items-center bg-[#2e2e2e] text-gray-200 px-3 py-1 rounded-t border-t-2 border-[#ff7700] text-xs font-medium space-x-2">
          <span>{isModified ? `*${documentTitle}` : documentTitle}</span>
          <span className="text-[10px] text-gray-500 hover:text-white cursor-pointer ml-1">×</span>
        </div>
      </div>

      {/* Main Formatting & Action Ribbon */}
      <div className="flex items-center justify-between px-3 py-1.5 h-10 overflow-x-auto">
        {/* Left Side: Element Formatting & Type Selector */}
        <div className="flex items-center space-x-2">
          {/* Element Type Dropdown */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#444444] rounded px-2 py-1">
            <span className="text-[11px] text-gray-400 mr-1.5">Format:</span>
            <select
              value={currentElementType}
              onChange={(e) => onChangeElementType(e.target.value as ElementType)}
              className="bg-transparent text-xs font-semibold text-[#ff8000] focus:outline-none cursor-pointer"
            >
              <option value="SCENE_HEADING" className="bg-[#222] text-gray-200">
                Scene Heading (INT./EXT.)
              </option>
              <option value="ACTION" className="bg-[#222] text-gray-200">
                Action
              </option>
              <option value="CHARACTER" className="bg-[#222] text-gray-200">
                Character
              </option>
              <option value="DIALOGUE" className="bg-[#222] text-gray-200">
                Dialogue
              </option>
              <option value="PARENTHETICAL" className="bg-[#222] text-gray-200">
                Parenthetical
              </option>
              <option value="TRANSITION" className="bg-[#222] text-gray-200">
                Transition
              </option>
              <option value="SHOT" className="bg-[#222] text-gray-200">
                Shot (Camera Marker)
              </option>
              <option value="GENERAL" className="bg-[#222] text-gray-200">
                General
              </option>
            </select>
          </div>

          {/* Font Family & Size */}
          <div className="flex items-center space-x-1 bg-[#1e1e1e] border border-[#444444] rounded px-2 py-1 text-gray-300">
            <span className="font-mono text-xs text-amber-200">Courier Std</span>
            <span className="text-gray-500 text-[10px]">|</span>
            <span className="text-xs text-gray-300">12 pt</span>
          </div>

          <div className="h-5 w-px bg-[#444444] mx-1"></div>

          {/* Typography Controls */}
          <div className="flex items-center space-x-0.5 bg-[#242424] p-0.5 rounded border border-[#3e3e3e]">
            <button
              title="Bold"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              title="Italic"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              title="Underline"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              title="Strikethrough"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              title="Highlight Note"
              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-[#383838] rounded"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignment Controls */}
          <div className="flex items-center space-x-0.5 bg-[#242424] p-0.5 rounded border border-[#3e3e3e]">
            <button
              title="Align Left"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              title="Align Center"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              title="Align Right"
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#383838] rounded"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Side: Adobe Story Production, NLE Pipeline & Sync Ribbon */}
        <div className="flex items-center space-x-2 shrink-0">
          {activeWorkspace === 'authoring' && onChangeScriptFormat && (
            <div className="flex items-center p-0.5 bg-[#1b1b1b] border border-[#444444] rounded">
              <button
                onClick={() => onChangeScriptFormat('single_column_film')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                  scriptFormat === 'single_column_film'
                    ? 'bg-[#333333] text-amber-300 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Single-Column Feature Screenplay"
              >
                <Film className="w-3 h-3" />
                <span>Film</span>
              </button>
              <button
                onClick={() => onChangeScriptFormat('av_multi_column')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                  scriptFormat === 'av_multi_column'
                    ? 'bg-[#333333] text-cyan-300 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Multi-Column A/V Script with Embedded Storyboards"
              >
                <Columns className="w-3 h-3" />
                <span>A/V</span>
              </button>
            </div>
          )}

          {onOpenRevisionImpact && (
            <button
              onClick={onOpenRevisionImpact}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${
                pendingSyncCount > 0
                  ? 'bg-[#2e2012] hover:bg-[#3a2816] text-amber-300 border-[#ff7700]'
                  : 'bg-[#242424] hover:bg-[#353535] text-emerald-400 border-[#444444]'
              }`}
              title="Preview script revision impact on Production Schedule"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-medium tabular-nums">
                {pendingSyncCount > 0 ? `Schedule Sync (${pendingSyncCount})` : 'Schedule Synced'}
              </span>
            </button>
          )}

          {onOpenNLEPipeline && (
            <button
              onClick={onOpenNLEPipeline}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-cyan-300 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
              title="Script-to-NLE Premiere Pro XML & Speech-to-Text Take Aligner"
            >
              <AudioWaveform className="w-3.5 h-3.5" />
              <span>NLE Pipeline</span>
            </button>
          )}

          {onRecalculate && (
            <button
              onClick={onRecalculate}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-amber-400 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
              title="Recalculate 1/8th Page Counts"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span className="font-medium">Recalc</span>
            </button>
          )}

          {activeWorkspace === 'production' && onAddBreak && (
            <button
              onClick={onAddBreak}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-emerald-400 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
              title="Add Day Break / Meal Banner"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Break</span>
            </button>
          )}

          <button
            onClick={onOpenReports}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#242424] hover:bg-[#353535] text-gray-300 rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
            title="Production Reports"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reports</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-[#1e1e1e] border border-[#444444] rounded px-2 py-1 text-gray-400 text-xs">
            <span className="text-[11px]">Zoom:</span>
            <select
              value={zoomLevel}
              onChange={(e) => onChangeZoom(Number(e.target.value))}
              className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value={75} className="bg-[#222]">75%</option>
              <option value={100} className="bg-[#222]">100%</option>
              <option value={125} className="bg-[#222]">125%</option>
              <option value={150} className="bg-[#222]">150%</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
