import React from 'react';
import { StoryProject } from '../types/story';
import { Film, Clock, User, Calendar, Plus, ChevronRight, Download } from 'lucide-react';
import { BrandIcon } from './BrandIcon';

interface ProjectsBrowserProps {
  projects: StoryProject[];
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateNewProject: () => void;
  onExportRust: (project: StoryProject) => void;
}

export const ProjectsBrowser: React.FC<ProjectsBrowserProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onCreateNewProject,
  onExportRust,
}) => {
  return (
    <div className="flex-1 bg-[#1a1a1a] text-gray-200 overflow-y-auto p-8 select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner */}
        <div className="flex items-center justify-between border-b border-[#333] pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
              <BrandIcon size="sm" />
              <span>ScreenCraft Projects Library</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Select an authoring project, create a new screenplay, or review production schedules.
            </p>
          </div>

          <button
            onClick={onCreateNewProject}
            className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-bold rounded shadow flex items-center space-x-2 text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Screenplay</span>
          </button>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const isCurrent = proj.id === currentProjectId;
            const totalEighths = proj.scenes.reduce((acc, s) => acc + s.eighths, 0);

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`p-4 rounded-lg border transition-all cursor-pointer relative group ${
                  isCurrent
                    ? 'bg-[#29221b] border-[#ff7700] shadow-lg'
                    : 'bg-[#242424] border-[#383838] hover:border-[#555] hover:bg-[#2a2a2a]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded bg-[#1e1e1e] flex items-center justify-center border border-[#3e3e3e] group-hover:border-[#ff7700]">
                      <Film className="w-4 h-4 text-[#ff7700]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-gray-100 group-hover:text-amber-400 transition-colors">
                        {proj.title}
                      </h2>
                      <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{proj.author}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{proj.lastModified}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff7700] text-black">
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#333] text-center text-xs">
                  <div className="bg-[#1c1c1c] p-2 rounded border border-[#333]">
                    <div className="text-[10px] text-gray-400">SCENES</div>
                    <div className="font-bold text-cyan-400 font-mono mt-0.5">
                      {proj.scenes.length}
                    </div>
                  </div>
                  <div className="bg-[#1c1c1c] p-2 rounded border border-[#333]">
                    <div className="text-[10px] text-gray-400">PAGES</div>
                    <div className="font-bold text-amber-400 font-mono mt-0.5">
                      {(totalEighths / 8).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-[#1c1c1c] p-2 rounded border border-[#333]">
                    <div className="text-[10px] text-gray-400">CAST TAGS</div>
                    <div className="font-bold text-emerald-400 font-mono mt-0.5">
                      {proj.characters.length}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-[11px] text-gray-400">
                    {proj.strips.length} Scheduled Strips
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportRust(proj);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                      title="Download Rust/Tauri installer bundle"
                    >
                      <Download className="w-3 h-3" />
                      <span>Rust Desktop</span>
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
