import React from 'react';
import { Home, Mail, Settings, HelpCircle, LogOut, Maximize2, Film, Calendar, Terminal, Camera, BookOpen } from 'lucide-react';
import { ActiveWorkspace } from '../types/story';
import { BrandIcon } from './BrandIcon';

interface TopHeaderProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  projectTitle: string;
  unreadCount?: number;
  userName?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  projectTitle,
  unreadCount = 19,
  userName = 'Jeffrey (Online)',
}) => {
  return (
    <header className="bg-[#1f1f1f] border-b border-[#383838] select-none text-xs">
      <div className="flex items-center justify-between px-3 h-10">
        {/* Brand & Left Navigation */}
        <div className="flex items-center space-x-3">
          {/* ScreenCraft Brand Icon & Name */}
          <div className="flex items-center space-x-2">
            <BrandIcon size="sm" />
            <div className="flex items-baseline space-x-1.5">
              <span className="font-bold text-gray-100 tracking-wider text-sm font-sans whitespace-nowrap">
                SCREENCRAFT
              </span>
              <span className="text-[10px] font-bold text-[#ff7700] uppercase tracking-wider px-1 bg-[#2e1d0c] rounded border border-[#ff7700]/30">
                STUDIO
              </span>
            </div>
          </div>

          {/* Home Icon */}
          <button
            onClick={() => onSelectWorkspace('projects')}
            title="Projects Home"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Primary View Switcher Tabs */}
          <nav className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => onSelectWorkspace('projects')}
              className={`px-2.5 py-1.5 font-semibold text-xs tracking-wide transition-colors rounded-t whitespace-nowrap shrink-0 ${
                activeWorkspace === 'projects'
                  ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`}
            >
              PROJECTS
            </button>
            <button
              onClick={() => onSelectWorkspace('authoring')}
              className={`px-2.5 py-1.5 font-semibold text-xs tracking-wide transition-colors rounded-t flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                activeWorkspace === 'authoring'
                  ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>AUTHORING</span>
            </button>
            <button
              onClick={() => onSelectWorkspace('project_bible')}
              className={`px-2.5 py-1.5 font-semibold text-xs tracking-wide transition-colors rounded-t flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                activeWorkspace === 'project_bible'
                  ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>PROJECT BIBLE</span>
            </button>
            <button
              onClick={() => onSelectWorkspace('production')}
              className={`px-2.5 py-1.5 font-semibold text-xs tracking-wide transition-colors rounded-t flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                activeWorkspace === 'production'
                  ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>PRODUCTION SCHEDULE</span>
            </button>
            <button
              onClick={() => onSelectWorkspace('storyboard')}
              className={`px-2.5 py-1.5 font-semibold text-xs tracking-wide transition-colors rounded-t flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                activeWorkspace === 'storyboard'
                  ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>STORYBOARD</span>
            </button>
            <button
              onClick={() => onSelectWorkspace('rust_engine')}
              className={`px-2.5 py-1.5 font-semibold text-xs tracking-wide transition-colors rounded-t flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                activeWorkspace === 'rust_engine'
                  ? 'text-[#ff8000] border-b-2 border-[#ff8000] bg-[#292929]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#ff8000]" />
              <span>RUST DESKTOP</span>
            </button>
          </nav>
        </div>

        {/* User, Notifications & System Controls */}
        <div className="flex items-center space-x-3 text-gray-300">
          {/* User Online Status */}
          <div className="flex items-center space-x-1.5 text-xs text-gray-300 bg-[#292929] px-2.5 py-1 rounded border border-[#3a3a3a]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hi, {userName}</span>
          </div>

          {/* Inbox / Notification */}
          <div className="flex items-center space-x-1 text-xs text-amber-400 cursor-pointer hover:text-amber-300 bg-[#2e2617] px-2 py-1 rounded border border-amber-600/30">
            <Mail className="w-3.5 h-3.5" />
            <span>({unreadCount})</span>
          </div>

          <div className="h-4 w-px bg-[#3e3e3e]"></div>

          <button
            onClick={() => onSelectWorkspace('rust_engine')}
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            title="Desktop Preferences"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preferences</span>
          </button>

          <button
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            title="ScreenCraft Help"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Help</span>
          </button>

          <button
            className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>

          <div className="h-4 w-px bg-[#3e3e3e]"></div>

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
