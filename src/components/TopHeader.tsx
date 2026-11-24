import React from 'react';
import {
  Home,
  HelpCircle,
  Maximize2,
  Film,
  Calendar,
  Camera,
  Users,
  ListTree,
  GitPullRequest,
  MonitorPlay,
  Captions,
} from 'lucide-react';
import { ActiveWorkspace } from '../types/story';
import { BrandIcon } from './BrandIcon';

interface TopHeaderProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  projectTitle: string;
  onOpenTeleprompter?: () => void;
  onOpenHelp?: () => void;
  pendingCollaborationCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  projectTitle,
  onOpenHelp,
  pendingCollaborationCount = 0,
}) => {
  const navItems: {
    id: ActiveWorkspace;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'authoring', label: 'AUTHORING', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'characters', label: 'CHARACTERS', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'outline', label: 'OUTLINE', icon: <ListTree className="w-3.5 h-3.5" /> },
    { id: 'production', label: 'PRODUCTION', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'storyboard', label: 'STORYBOARDING', icon: <Camera className="w-3.5 h-3.5" /> },
    {
      id: 'collaboration',
      label: 'COLLABORATION',
      icon: <GitPullRequest className="w-3.5 h-3.5" />,
      badge: pendingCollaborationCount,
    },
    { id: 'teleprompter', label: 'TELEPROMPTER', icon: <MonitorPlay className="w-3.5 h-3.5" /> },
    { id: 'subtitles', label: 'SUBTITLES', icon: <Captions className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="bg-[#1f1f1f] border-b border-[#383838] select-none text-xs">
      <div className="flex flex-wrap items-center justify-between px-3 min-h-10 py-1 gap-x-3 gap-y-1.5">
        {/* Brand & Primary 7-Workspace Navigation */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
          {/* ScreenCraft Brand Icon & Name */}
          <div className="flex items-center space-x-2 shrink-0 pr-1">
            <BrandIcon size="sm" />
            <div className="flex items-baseline space-x-1">
              <span className="font-bold text-gray-100 tracking-wider text-sm font-sans whitespace-nowrap">
                SCREENCRAFT
              </span>
              <span className="text-[10px] font-bold text-[#ff7700] uppercase tracking-wider">
                STUDIO
              </span>
            </div>
          </div>

          {/* Home Icon */}
          <button
            onClick={() => onSelectWorkspace('projects')}
            title="Home (Authoring & Production Templates)"
            aria-label="Home"
            className={`p-1.5 rounded transition-colors shrink-0 ${
              activeWorkspace === 'projects'
                ? 'bg-[#2e1e0f] text-[#ff8000] border border-[#ff7700]/60'
                : 'text-gray-400 hover:text-white hover:bg-[#2f2f2f]'
            }`}
          >
            <Home className="w-4 h-4" />
          </button>

          {/* 7 Primary Workspaces (wraps cleanly onto a second row if tabs exceed header width) */}
          <nav className="flex flex-wrap items-center gap-x-0.5 gap-y-1 ml-1">
            {navItems.map((item) => {
              const isActive = activeWorkspace === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectWorkspace(item.id)}
                  className={`px-2.5 py-1.5 font-semibold text-[11px] tracking-wide transition-colors rounded flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-cyan-300">
                      ({item.badge})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Document Context & System Controls */}
        <div className="flex items-center space-x-2.5 text-gray-300 shrink-0">
          <span
            className="hidden xl:inline text-[11px] text-gray-400 truncate max-w-[160px]"
            title={projectTitle}
          >
            {projectTitle}
          </span>

          <div className="h-4 w-px bg-[#3e3e3e] hidden xl:block" />

          <button
            onClick={() => onOpenHelp?.()}
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
            title="ScreenCraft Interactive Help Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Help</span>
          </button>

          <div className="h-4 w-px bg-[#3e3e3e]" />

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded shrink-0"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
