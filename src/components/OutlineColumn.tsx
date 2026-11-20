import React, { useState } from 'react';
import {
  List,
  Sliders,
  Users,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Columns,
  X,
  BookOpen
} from 'lucide-react';
import { Scene, StoryCharacter, ActiveWorkspace, ScreenplayElement } from '../types/story';

// Helper to safely highlight matched search terms in headings and synopses
const highlightMatch = (text: string, query: string) => {
  if (!query.trim() || !text) return text;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-[#ff7700]/30 text-amber-300 font-semibold rounded-[2px] px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

interface OutlineColumnProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onUpdateScene: (scene: Scene) => void;
  characters: StoryCharacter[];
  activeWorkspace: ActiveWorkspace;
  elements?: ScreenplayElement[];
}

interface ThumbnailProps {
  scene: Scene;
  elements?: ScreenplayElement[];
  isSelected: boolean;
  charColorMap: Map<string, string>;
}

// Visual page thumbnail representing the physical layout of the screenplay scene
const ScenePageThumbnail: React.FC<ThumbnailProps> = ({ scene, elements = [], isSelected, charColorMap }) => {
  const sceneElements = elements.filter((el) => el.sceneId === scene.id);

  // Determine top color banner based on INT/EXT and DAY/NIGHT
  const isExt = scene.intExt.includes('EXT');
  const isNight = scene.dayNight === 'NIGHT';
  const bannerColor = isExt
    ? isNight ? 'bg-[#3b82f6]' : 'bg-[#06b6d4]'
    : isNight ? 'bg-[#f97316]' : 'bg-[#eab308]';

  // Preview elements up to 8 blocks to represent the visual density and rhythm of the page
  const displayElements = sceneElements.length > 0 ? sceneElements.slice(0, 7) : null;

  return (
    <div
      title={`Scene ${scene.sceneNumber}: ${scene.heading} (${scene.pages} pgs)`}
      className={`relative w-11 h-14 bg-[#fcfaf5] rounded-[3px] border transition-all flex-shrink-0 flex flex-col overflow-hidden shadow-sm select-none ${
        isSelected
          ? 'ring-2 ring-[#ff7700] border-[#ff7700] shadow-md scale-105'
          : 'border-[#d6d0c4] hover:border-gray-400 group-hover:scale-102'
      }`}
    >
      {/* Top Scene Environment Ribbon (Cyan=Ext Day, Blue=Ext Night, Yellow=Int Day, Orange=Int Night) */}
      <div className={`h-1.5 w-full ${bannerColor} flex items-center justify-between px-1`}>
        <span className="text-[7px] font-extrabold text-black leading-none">
          {scene.intExt === 'EXT' ? 'EXT' : 'INT'}
        </span>
        <span className="text-[6px] font-mono text-black font-bold leading-none">
          {scene.dayNight === 'NIGHT' ? 'N' : 'D'}
        </span>
      </div>

      {/* Mini Page Body representing Industry Screenplay Margins */}
      <div className="flex-1 p-1 flex flex-col justify-between overflow-hidden bg-[#faf8f2]">
        <div className="space-y-[2px] w-full">
          {/* Scene Slugline Header Line */}
          <div className="w-10/12 h-[2px] bg-gray-900 rounded-full"></div>

          {/* Render lines representing the actual screenplay elements or estimated rhythm */}
          {displayElements ? (
            displayElements.map((el, idx) => {
              if (el.type === 'CHARACTER') {
                const charColor = charColorMap.get(el.text.trim().toUpperCase()) || '#ea580c';
                return (
                  <div
                    key={idx}
                    style={{ backgroundColor: charColor }}
                    className="mx-auto w-5/12 h-[1.5px] rounded-full my-[1px]"
                  />
                );
              }
              if (el.type === 'DIALOGUE') {
                return (
                  <div key={idx} className="mx-auto w-8/12 h-[1.5px] bg-gray-600 rounded-full" />
                );
              }
              if (el.type === 'PARENTHETICAL') {
                return (
                  <div key={idx} className="mx-auto w-4/12 h-[1px] bg-gray-400 rounded-full" />
                );
              }
              if (el.type === 'TRANSITION') {
                return (
                  <div key={idx} className="ml-auto w-4/12 h-[1.5px] bg-gray-800 rounded-full" />
                );
              }
              // Action description lines
              return (
                <div key={idx} className="w-full h-[1px] bg-gray-400/90 rounded-full" />
              );
            })
          ) : (
            <>
              {/* Fallback default rhythm lines based on eighths density */}
              <div className="w-full h-[1px] bg-gray-400 rounded-full"></div>
              <div className="w-11/12 h-[1px] bg-gray-400 rounded-full"></div>
              <div className="mx-auto w-5/12 h-[1.5px] bg-[#ea580c] rounded-full my-[1px]"></div>
              <div className="mx-auto w-7/12 h-[1.5px] bg-gray-600 rounded-full"></div>
              <div className="mx-auto w-6/12 h-[1.5px] bg-gray-600 rounded-full"></div>
              <div className="w-full h-[1px] bg-gray-400 rounded-full"></div>
            </>
          )}
        </div>

        {/* Footer info: Scene number & subtle page eighths indicator */}
        <div className="flex items-center justify-between text-[7px] font-mono text-gray-500 pt-[1px] border-t border-gray-200/60 leading-none">
          <span className="font-bold text-gray-800">#{scene.sceneNumber}</span>
          <span>{scene.pages.split(' ')[0]}p</span>
        </div>
      </div>

      {/* Stacked page effect for multi-page scenes (pages > 1) */}
      {scene.eighths > 8 && (
        <div className="absolute -bottom-[2px] right-0.5 w-full h-[2px] bg-gray-300 rounded-b border-b border-gray-400/80 -z-10" />
      )}
    </div>
  );
};

export const OutlineColumn: React.FC<OutlineColumnProps> = ({
  scenes,
  selectedSceneId,
  onSelectScene,
  onUpdateScene,
  characters,
  activeWorkspace,
  elements = [],
}) => {
  const [tab, setTab] = useState<'outline' | 'strip_properties' | 'cast'>(
    activeWorkspace === 'production' ? 'strip_properties' : 'outline'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'heading' | 'synopsis'>('all');
  const [expandedSceneIds, setExpandedSceneIds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    characters: true,
    extras: true,
    synopsis: true,
    notes: true,
    budget: false,
    timing: true,
    scheduleNotes: false,
  });

  const toggleSceneInlinePreview = (sceneId: string) => {
    setExpandedSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) || scenes[0];
  const selectedIndex = scenes.findIndex((s) => s.id === selectedScene?.id);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredScenes = scenes.filter((scene) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const headingText = (scene.heading || '').toLowerCase();
    const settingText = (scene.setting || '').toLowerCase();
    const synopsisText = (scene.synopsis || '').toLowerCase();
    const sceneNumStr = scene.sceneNumber.toString();

    const matchesHeading =
      headingText.includes(q) ||
      settingText.includes(q) ||
      sceneNumStr === q ||
      `#${sceneNumStr}` === q ||
      `scene ${sceneNumStr}` === q;

    const matchesSynopsis = synopsisText.includes(q);

    if (searchScope === 'heading') return matchesHeading;
    if (searchScope === 'synopsis') return matchesSynopsis;
    return (
      matchesHeading ||
      matchesSynopsis ||
      scene.characters.some((c) => c.toLowerCase().includes(q))
    );
  });

  const handlePrevScene = () => {
    if (selectedIndex > 0) {
      onSelectScene(scenes[selectedIndex - 1].id);
    }
  };

  const handleNextScene = () => {
    if (selectedIndex < scenes.length - 1) {
      onSelectScene(scenes[selectedIndex + 1].id);
    }
  };

  // Map character names to their assigned dot colors
  const charColorMap = new Map<string, string>();
  characters.forEach((c) => charColorMap.set(c.name.toUpperCase(), c.color));

  const [outlineViewStyle, setOutlineViewStyle] = useState<'thumbnails' | 'grid' | 'compact'>('thumbnails');

  return (
    <aside className="w-80 flex-shrink-0 bg-[#242424] border-r border-[#383838] flex flex-col h-full text-xs select-none">
      {/* Column Tab Headers */}
      <div className="flex border-b border-[#383838] bg-[#1c1c1c]">
        <button
          onClick={() => setTab('outline')}
          className={`flex-1 py-2 text-center font-semibold tracking-wider transition-colors border-r border-[#333] ${
            tab === 'outline'
              ? 'bg-[#242424] text-[#ff8000] border-t-2 border-t-[#ff8000]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'
          }`}
        >
          OUTLINE
        </button>
        <button
          onClick={() => setTab('strip_properties')}
          className={`flex-1 py-2 text-center font-semibold tracking-wider transition-colors border-r border-[#333] ${
            tab === 'strip_properties'
              ? 'bg-[#242424] text-[#ff8000] border-t-2 border-t-[#ff8000]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'
          }`}
        >
          STRIP PROPERTIES
        </button>
        <button
          onClick={() => setTab('cast')}
          className={`flex-1 py-2 text-center font-semibold tracking-wider transition-colors ${
            tab === 'cast'
              ? 'bg-[#242424] text-[#ff8000] border-t-2 border-t-[#ff8000]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'
          }`}
        >
          CAST
        </button>
      </div>

      {/* Mode 1: OUTLINE View */}
      {tab === 'outline' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Search & Filter Bar */}
          <div className="p-2 border-b border-[#333333] bg-[#222222] space-y-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search heading or synopsis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                className="w-full bg-[#181818] text-gray-200 pl-8 pr-7 py-1.5 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000] placeholder-gray-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  title="Clear search (Esc)"
                  className="absolute right-2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scope Filter Buttons & Match Stats */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 font-medium">Filter:</span>
                <button
                  onClick={() => setSearchScope('all')}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                    searchScope === 'all'
                      ? 'bg-[#ff7700] text-white font-semibold'
                      : 'bg-[#2a2a2a] text-gray-400 hover:text-gray-200 hover:bg-[#333]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSearchScope('heading')}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                    searchScope === 'heading'
                      ? 'bg-[#ff7700] text-white font-semibold'
                      : 'bg-[#2a2a2a] text-gray-400 hover:text-gray-200 hover:bg-[#333]'
                  }`}
                >
                  Heading
                </button>
                <button
                  onClick={() => setSearchScope('synopsis')}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                    searchScope === 'synopsis'
                      ? 'bg-[#ff7700] text-white font-semibold'
                      : 'bg-[#2a2a2a] text-gray-400 hover:text-gray-200 hover:bg-[#333]'
                  }`}
                >
                  Synopsis
                </button>
              </div>

              {searchQuery ? (
                <span className="text-amber-400 font-mono text-[10px]">
                  {filteredScenes.length} of {scenes.length}
                </span>
              ) : (
                <span className="text-gray-500 font-mono text-[10px]">
                  {scenes.length} scenes
                </span>
              )}
            </div>
          </div>

          {/* Subheader: Scene count & Thumbnail view mode toggles */}
          <div className="px-3 py-1.5 bg-[#1f1f1f] border-b border-[#333333] flex justify-between items-center text-[11px] text-gray-400">
            <span>
              {filteredScenes.length} SCENE{filteredScenes.length !== 1 ? 'S' : ''} •{' '}
              {scenes.reduce((acc, s) => acc + s.eighths, 0) / 8} PGS
            </span>
            <div className="flex items-center space-x-1 bg-[#181818] p-0.5 rounded border border-[#333]">
              <button
                onClick={() => setOutlineViewStyle('thumbnails')}
                title="Thumbnails + Details"
                className={`p-1 rounded cursor-pointer ${
                  outlineViewStyle === 'thumbnails' ? 'bg-[#383838] text-[#ff8000]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Columns className="w-3 h-3" />
              </button>
              <button
                onClick={() => setOutlineViewStyle('grid')}
                title="Page Thumbnails Grid"
                className={`p-1 rounded cursor-pointer ${
                  outlineViewStyle === 'grid' ? 'bg-[#383838] text-[#ff8000]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
              </button>
              <button
                onClick={() => setOutlineViewStyle('compact')}
                title="Compact List"
                className={`p-1 rounded cursor-pointer ${
                  outlineViewStyle === 'compact' ? 'bg-[#383838] text-[#ff8000]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Empty Search State */}
          {filteredScenes.length === 0 ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-gray-400 space-y-2.5 bg-[#1e1e1e]">
              <div className="w-10 h-10 rounded-full bg-[#282828] border border-[#3e3e3e] flex items-center justify-center text-gray-500">
                <Search className="w-5 h-5" />
              </div>
              <p className="font-semibold text-gray-200 text-xs">No matching scenes found</p>
              <p className="text-[11px] text-gray-400 max-w-[220px] leading-relaxed">
                No scenes match "{searchQuery}" in {searchScope === 'all' ? 'headings or synopses' : searchScope}.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchScope('all');
                }}
                className="mt-1 px-3 py-1 bg-[#2e2e2e] hover:bg-[#ff7700] hover:text-white text-gray-200 rounded text-xs transition-colors cursor-pointer border border-[#444]"
              >
                Clear Filter
              </button>
            </div>
          ) : outlineViewStyle === 'grid' ? (
            /* Mode 1A: Thumbnails Grid Overview */
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2.5 content-start bg-[#1e1e1e]">
              {filteredScenes.map((scene) => {
                const isSelected = scene.id === selectedScene?.id;
                return (
                  <div
                    key={scene.id}
                    onClick={() => onSelectScene(scene.id)}
                    title={`Scene ${scene.sceneNumber}: ${scene.heading}\n${scene.synopsis ? `Synopsis: ${scene.synopsis}` : ''}`}
                    className={`flex flex-col items-center p-2 rounded cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#383838] ring-2 ring-[#ff7700] text-white shadow-md'
                        : 'bg-[#252525] hover:bg-[#2d2d2d] text-gray-300'
                    }`}
                  >
                    <ScenePageThumbnail
                      scene={scene}
                      elements={elements}
                      isSelected={isSelected}
                      charColorMap={charColorMap}
                    />
                    <div className="mt-1.5 text-center w-full">
                      <div className="font-bold text-[10px] text-amber-500">#{scene.sceneNumber}</div>
                      <div className="text-[9px] truncate text-gray-300 font-medium">
                        {highlightMatch(scene.setting, searchQuery)}
                      </div>
                      <div className="text-[8px] text-gray-400 font-mono mt-0.5">{scene.pages} pgs</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode 1B & 1C: List with Color-Coded Character Squares & Inline Scrollable Scene Preview */
            <div className="flex-1 overflow-y-auto divide-y divide-[#2f2f2f]">
              {filteredScenes.map((scene) => {
                const isSelected = scene.id === selectedScene?.id;
                const isInlineExpanded = expandedSceneIds.includes(scene.id);
                const sceneScriptElements = elements.filter((el) => el.sceneId === scene.id);

                return (
                  <div
                    key={scene.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-[#322b23] ring-1 ring-inset ring-[#ff7700]/65 text-white'
                        : 'hover:bg-[#282828] text-gray-300'
                    }`}
                  >
                    {/* Scene Header Row — onMouseDown preventDefault preserves ScreenplayEditor cursor position */}
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleSceneInlinePreview(scene.id)}
                      className="p-2.5 cursor-pointer flex items-start space-x-2.5 group"
                      title="Click scene header to expand/collapse inline preview without losing cursor position"
                    >
                      {/* Visual Page Thumbnail rendered on left */}
                      {outlineViewStyle !== 'compact' && (
                        <ScenePageThumbnail
                          scene={scene}
                          elements={elements}
                          isSelected={isSelected}
                          charColorMap={charColorMap}
                        />
                      )}

                      {/* Scene Metadata & Character Squares */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center space-x-1 min-w-0">
                            <span className="text-gray-400 shrink-0">
                              {isInlineExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#ff8000]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300" />
                              )}
                            </span>
                            <span className="text-[11px] font-bold text-amber-500 flex-shrink-0 tabular-nums">
                              {scene.sceneNumber}.
                            </span>
                            <span className="font-semibold text-xs tracking-tight truncate block">
                              {highlightMatch(scene.heading, searchQuery)}
                            </span>
                          </div>

                          {/* Color-Coded Character Presence Squares next to Scene Heading */}
                          <div
                            className="flex items-center gap-1 shrink-0 pt-0.5"
                            title={
                              scene.characters.length > 0
                                ? `Characters: ${scene.characters.join(', ')}`
                                : 'No characters tagged'
                            }
                          >
                            {scene.characters.slice(0, 5).map((charName, i) => {
                              const color = charColorMap.get(charName.toUpperCase()) || '#4bcffa';
                              return (
                                <span
                                  key={i}
                                  title={charName}
                                  style={{ backgroundColor: color }}
                                  className="w-2.5 h-2.5 rounded-[2px] border border-black/50 inline-block"
                                />
                              );
                            })}
                            {scene.characters.length > 5 && (
                              <span className="text-[9px] text-gray-400 font-mono tabular-nums">
                                +{scene.characters.length - 5}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 truncate mt-0.5 font-medium pl-4">
                          {highlightMatch(scene.setting, searchQuery)}
                        </div>

                        {/* Scene Synopsis Preview */}
                        {scene.synopsis && (
                          <p className="text-[10.5px] text-gray-400 mt-1 line-clamp-2 leading-relaxed bg-[#1b1b1b]/60 px-1.5 py-0.5 rounded border border-[#303030]/60">
                            <span className="text-[9px] uppercase tracking-wider text-amber-500/80 font-semibold mr-1">
                              Synopsis:
                            </span>
                            {highlightMatch(scene.synopsis, searchQuery)}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400 pl-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-cyan-400 text-[10px] tabular-nums">
                              {scene.timecode}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#1c1c1c] text-gray-300 border border-[#333] text-[10px] tabular-nums">
                              {scene.pages} pgs
                            </span>
                          </div>

                          <span className="text-[10px] text-gray-500 tabular-nums">
                            {sceneScriptElements.length} blocks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compressed, Scrollable Inline Scene Preview (Preserves Editor Cursor Position) */}
                    {isInlineExpanded && (
                      <div
                        onMouseDown={(e) => e.preventDefault()}
                        className="mx-2.5 mb-2.5 rounded border border-[#3e3e3e] bg-[#161616] overflow-hidden"
                      >
                        <div className="px-2.5 py-1.5 bg-[#1d1d1d] border-b border-[#2e2e2e] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <BookOpen className="w-3 h-3 text-[#ff8000] shrink-0" />
                            <span className="text-[10px] font-semibold text-gray-300 truncate">
                              Inline Scene {scene.sceneNumber} Preview
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectScene(scene.id);
                            }}
                            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#ff7700] hover:text-black text-[10px] font-medium text-amber-300 border border-[#444] transition-colors whitespace-nowrap shrink-0"
                          >
                            Focus in Script
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto p-2.5 space-y-1.5 font-courier text-[11px] leading-snug bg-[#141414]">
                          {sceneScriptElements.length === 0 ? (
                            <p className="text-gray-500 italic font-sans text-[11px]">
                              No script elements linked to Scene {scene.sceneNumber} yet.
                            </p>
                          ) : (
                            sceneScriptElements.map((el) => {
                              if (el.type === 'SCENE_HEADING') {
                                return (
                                  <div
                                    key={el.id}
                                    className="font-bold text-amber-300 uppercase border-b border-[#2b2b2b] pb-1"
                                  >
                                    {el.text}
                                  </div>
                                );
                              }
                              if (el.type === 'CHARACTER') {
                                const cColor =
                                  charColorMap.get(el.text.trim().toUpperCase()) || '#fbbf24';
                                return (
                                  <div
                                    key={el.id}
                                    className="pt-1 text-center font-bold uppercase flex items-center justify-center gap-1.5"
                                    style={{ color: cColor }}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-[2px] inline-block shrink-0"
                                      style={{ backgroundColor: cColor }}
                                    />
                                    <span>{el.text}</span>
                                  </div>
                                );
                              }
                              if (el.type === 'PARENTHETICAL') {
                                return (
                                  <div key={el.id} className="text-center italic text-gray-400">
                                    {el.text}
                                  </div>
                                );
                              }
                              if (el.type === 'DIALOGUE') {
                                return (
                                  <div
                                    key={el.id}
                                    className="px-4 text-gray-100 leading-relaxed"
                                  >
                                    {el.text}
                                  </div>
                                );
                              }
                              if (el.type === 'SHOT') {
                                return (
                                  <div
                                    key={el.id}
                                    className="text-cyan-300 font-semibold uppercase text-[10px]"
                                  >
                                    [{el.shotNumber ? `SHOT ${el.shotNumber}: ` : 'CAM: '}
                                    {el.text}]
                                  </div>
                                );
                              }
                              return (
                                <div key={el.id} className="text-gray-300 leading-relaxed">
                                  {el.text}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: STRIP PROPERTIES (Authentic Adobe Story Inspector as in Screenshot 1!) */}
      {tab === 'strip_properties' && selectedScene && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#242424]">
          {/* Big Orange Scene Badge and Prev/Next */}
          <div className="bg-[#1b1b1b] p-2.5 rounded border border-[#3a3a3a] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                SCENE
              </div>
              <div className="text-3xl font-extrabold text-[#ff7700] tracking-tight">
                {selectedScene.sceneNumber}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevScene}
                disabled={selectedIndex <= 0}
                className="px-2 py-1 bg-[#2e2e2e] hover:bg-[#3d3d3d] disabled:opacity-30 disabled:cursor-not-allowed rounded text-gray-200 border border-[#444] flex items-center space-x-1 text-xs"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>PREV</span>
              </button>
              <button
                onClick={handleNextScene}
                disabled={selectedIndex >= scenes.length - 1}
                className="px-2 py-1 bg-[#2e2e2e] hover:bg-[#3d3d3d] disabled:opacity-30 disabled:cursor-not-allowed rounded text-gray-200 border border-[#444] flex items-center space-x-1 text-xs"
              >
                <span>NEXT</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Properties Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-0.5">INT / EXT</label>
              <select
                value={selectedScene.intExt}
                onChange={(e) =>
                  onUpdateScene({ ...selectedScene, intExt: e.target.value as any })
                }
                className="w-full bg-[#181818] border border-[#3d3d3d] rounded p-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
              >
                <option value="INT">INT</option>
                <option value="EXT">EXT</option>
                <option value="INT/EXT">INT/EXT</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-0.5">STUDIO/LOC</label>
              <select
                value={selectedScene.location.includes('Studio') ? 'Studio' : 'Location'}
                onChange={(e) =>
                  onUpdateScene({
                    ...selectedScene,
                    location: e.target.value === 'Studio' ? 'Studio Stage' : 'On Location',
                  })
                }
                className="w-full bg-[#181818] border border-[#3d3d3d] rounded p-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
              >
                <option value="Studio">Studio</option>
                <option value="Location">Location</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-0.5">PAGES</label>
              <input
                type="text"
                value={selectedScene.pages}
                onChange={(e) => onUpdateScene({ ...selectedScene, pages: e.target.value })}
                className="w-full bg-[#181818] border border-[#3d3d3d] rounded p-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-[#ff8000]"
              />
            </div>
          </div>

          {/* Set Name */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 block mb-0.5">SET NAME</label>
            <input
              type="text"
              value={selectedScene.setting}
              onChange={(e) => onUpdateScene({ ...selectedScene, setting: e.target.value })}
              className="w-full bg-[#181818] border border-[#3d3d3d] rounded p-1.5 text-xs text-gray-200 font-medium focus:outline-none focus:border-[#ff8000]"
            />
          </div>

          {/* Schedule Timing Rows */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-[#1c1c1c] p-1.5 rounded border border-[#333]">
              <div className="text-[9px] text-gray-400">RUN TIME</div>
              <div className="font-mono text-cyan-400 text-xs mt-0.5">{selectedScene.timecode}</div>
            </div>
            <div className="bg-[#1c1c1c] p-1.5 rounded border border-[#333]">
              <div className="text-[9px] text-gray-400">STORY DAY</div>
              <div className="font-semibold text-white text-xs mt-0.5">{selectedScene.storyDay}</div>
            </div>
            <div className="bg-[#1c1c1c] p-1.5 rounded border border-[#333]">
              <div className="text-[9px] text-gray-400">TIME OF DAY</div>
              <div className="font-mono text-amber-300 text-xs mt-0.5">{selectedScene.timeOfDay}</div>
            </div>
            <div className="bg-[#1c1c1c] p-1.5 rounded border border-[#333]">
              <div className="text-[9px] text-gray-400">DAY / NIGHT</div>
              <div className="font-semibold text-white text-xs mt-0.5">{selectedScene.dayNight}</div>
            </div>
          </div>

          {/* Collapsible Accordion Sections (Matching Adobe Story Screenshots) */}
          <div className="border border-[#383838] rounded divide-y divide-[#383838] bg-[#1e1e1e]">
            {/* CHARACTERS Section */}
            <div>
              <button
                onClick={() => toggleSection('characters')}
                className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-1.5">
                  {expandedSections.characters ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span>CHARACTERS ({selectedScene.characters.length})</span>
                </div>
              </button>
              {expandedSections.characters && (
                <div className="p-2.5 bg-[#181818] border-t border-[#333] space-y-1.5">
                  {selectedScene.characters.length === 0 ? (
                    <span className="text-gray-500 italic text-[11px]">No cast members tagged</span>
                  ) : (
                    selectedScene.characters.map((charName, i) => {
                      const color = charColorMap.get(charName.toUpperCase()) || '#4bcffa';
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1 rounded bg-[#262626] border border-[#3a3a3a]"
                        >
                          <div className="flex items-center space-x-2">
                            <span
                              style={{ backgroundColor: color }}
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                            />
                            <span className="font-medium text-xs text-gray-200">{charName}</span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono">ON SET</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* SYNOPSIS Section */}
            <div>
              <button
                onClick={() => toggleSection('synopsis')}
                className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-1.5">
                  {expandedSections.synopsis ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span>SYNOPSIS</span>
                </div>
              </button>
              {expandedSections.synopsis && (
                <div className="p-2.5 bg-[#181818] border-t border-[#333]">
                  <textarea
                    rows={2}
                    value={selectedScene.synopsis}
                    onChange={(e) =>
                      onUpdateScene({ ...selectedScene, synopsis: e.target.value })
                    }
                    className="w-full bg-[#242424] text-gray-200 p-2 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000]"
                  />
                </div>
              )}
            </div>

            {/* PRODUCTION NOTES Section */}
            <div>
              <button
                onClick={() => toggleSection('notes')}
                className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-1.5">
                  {expandedSections.notes ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span>NOTES & BUDGET</span>
                </div>
              </button>
              {expandedSections.notes && (
                <div className="p-2.5 bg-[#181818] border-t border-[#333] space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Director Notes:</label>
                    <textarea
                      rows={2}
                      value={selectedScene.notes}
                      onChange={(e) =>
                        onUpdateScene({ ...selectedScene, notes: e.target.value })
                      }
                      className="w-full bg-[#242424] text-gray-200 p-1.5 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Estimated Budget:</span>
                    <input
                      type="text"
                      value={selectedScene.budget}
                      onChange={(e) =>
                        onUpdateScene({ ...selectedScene, budget: e.target.value })
                      }
                      className="w-28 bg-[#242424] text-amber-400 font-mono px-2 py-0.5 rounded border border-[#3e3e3e] text-xs text-right focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SHOOTING TIMING Section */}
            <div>
              <button
                onClick={() => toggleSection('timing')}
                className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-gray-300 hover:text-white"
              >
                <div className="flex items-center space-x-1.5">
                  {expandedSections.timing ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span>SHOOTING DURATION</span>
                </div>
              </button>
              {expandedSections.timing && (
                <div className="p-2.5 bg-[#181818] border-t border-[#333] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Scheduled Duration:</span>
                    <input
                      type="text"
                      value={selectedScene.shootingDuration || '02:00'}
                      onChange={(e) =>
                        onUpdateScene({ ...selectedScene, shootingDuration: e.target.value })
                      }
                      className="w-20 bg-[#242424] text-cyan-300 font-mono px-2 py-0.5 rounded border border-[#3e3e3e] text-xs text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Target Date:</span>
                    <input
                      type="date"
                      value={selectedScene.shootingStartDate || '2026-11-10'}
                      onChange={(e) =>
                        onUpdateScene({ ...selectedScene, shootingStartDate: e.target.value })
                      }
                      className="w-32 bg-[#242424] text-gray-200 px-1 py-0.5 rounded border border-[#3e3e3e] text-xs text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: CAST & BREAKDOWN LIST */}
      {tab === 'cast' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-2.5 bg-[#1f1f1f] border-b border-[#333] flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-300">{characters.length} CHARACTERS</span>
            <span className="text-gray-400 text-[11px]">COLOR BADGES</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#2f2f2f]">
            {characters.map((char, idx) => (
              <div key={idx} className="p-2.5 hover:bg-[#2a2a2a] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      style={{ backgroundColor: char.color }}
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-black/50 shadow"
                    />
                    <span className="font-semibold text-xs text-gray-100">{char.name}</span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-mono bg-[#1c1c1c] px-2 py-0.5 rounded border border-[#333]">
                    {char.scenesCount} scenes
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400 pl-5">
                  <span>Actor: {char.actor || 'Pending Cast'}</span>
                  <span>{char.speakingLines} lines</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
