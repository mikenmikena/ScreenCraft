import React, { useMemo, useState } from 'react';
import { Scene, ScreenplayElement, StoryProject } from '../types/story';
import {
  ListTree,
  Columns,
  LayoutGrid,
  Table,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  Edit3,
  Clock,
  MapPin,
  Users,
  Bookmark,
} from 'lucide-react';

interface OutlineWorkspaceProps {
  project: StoryProject;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onOpenSceneInAuthoring: (sceneId: string, elementId?: string) => void;
  onUpdateScene: (scene: Scene) => void;
  onReorderScene: (sceneId: string, direction: 'earlier' | 'later') => void;
  onAddNewScene: (actNumber?: number) => void;
}

const STRUCTURAL_ELEMENT_TYPES = new Set([
  'NEW_ACT',
  'SEQUENCE',
  'END_OF_ACT',
  'SUMMARY',
  'OUTLINE_1',
  'OUTLINE_2',
  'OUTLINE_3',
  'NOTE',
]);

export const OutlineWorkspace: React.FC<OutlineWorkspaceProps> = ({
  project,
  selectedSceneId,
  onSelectScene,
  onOpenSceneInAuthoring,
  onUpdateScene,
  onReorderScene,
  onAddNewScene,
}) => {
  const [viewMode, setViewMode] = useState<'acts' | 'cards' | 'beats'>('acts');
  const [searchQuery, setSearchQuery] = useState('');
  const [actFilter, setActFilter] = useState<number | 'all'>('all');

  const actsList = useMemo(() => {
    const acts = new Set<number>([1, 2, 3]);
    project.scenes.forEach((sc) => acts.add(sc.act || 1));
    return Array.from(acts).sort((a, b) => a - b);
  }, [project.scenes]);

  const filteredScenes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return project.scenes.filter((sc) => {
      if (actFilter !== 'all' && (sc.act || 1) !== actFilter) return false;
      if (!q) return true;
      return (
        sc.heading.toLowerCase().includes(q) ||
        sc.synopsis.toLowerCase().includes(q) ||
        sc.location.toLowerCase().includes(q) ||
        sc.notes.toLowerCase().includes(q) ||
        sc.characters.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [project.scenes, searchQuery, actFilter]);

  const structuralBeatsBySceneId = useMemo(() => {
    const map = new Map<string, ScreenplayElement[]>();
    project.elements.forEach((el) => {
      if (!STRUCTURAL_ELEMENT_TYPES.has(el.type)) return;
      const key = el.sceneId || 'unassigned';
      const arr = map.get(key) || [];
      arr.push(el);
      map.set(key, arr);
    });
    return map;
  }, [project.elements]);

  const totalEighths = useMemo(
    () => project.scenes.reduce((acc, s) => acc + (s.eighths || 0), 0),
    [project.scenes]
  );
  const totalPagesFormatted = useMemo(() => {
    const whole = Math.floor(totalEighths / 8);
    const rem = totalEighths % 8;
    return rem === 0 ? `${whole}` : `${whole} ${rem}/8`;
  }, [totalEighths]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#18181a] text-gray-200 text-xs select-none">
      {/* Outline Top Bar */}
      <div className="bg-[#232326] border-b border-[#34343a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-semibold text-gray-100">
            <ListTree className="w-4 h-4 text-[#ff8000]" />
            <span>Story Outline & Beat Board</span>
          </div>
          <span className="text-[11px] text-gray-400 tabular-nums">
            {project.scenes.length} Scenes · {totalPagesFormatted} Pages ·{' '}
            {project.elements.filter((e) => STRUCTURAL_ELEMENT_TYPES.has(e.type)).length} Outline Beats
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter scenes or beats..."
              className="bg-[#161618] border border-[#383840] rounded pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
            />
          </div>

          <select
            value={actFilter}
            onChange={(e) =>
              setActFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="bg-[#161618] border border-[#383840] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
          >
            <option value="all">All Acts</option>
            {actsList.map((act) => (
              <option key={act} value={act}>
                Act {act}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-0.5 p-0.5 bg-[#161618] border border-[#383840] rounded">
            <button
              type="button"
              onClick={() => setViewMode('acts')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'acts'
                  ? 'bg-[#2b2b30] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Act Columns</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-[#2b2b30] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Index Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('beats')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'beats'
                  ? 'bg-[#2b2b30] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Beat Table</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAddNewScene(actFilter === 'all' ? 1 : actFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'acts' ? (
        <div className="flex-1 overflow-x-auto p-5 flex gap-4 items-start">
          {actsList.map((actNum) => {
            const actScenes = filteredScenes.filter((s) => (s.act || 1) === actNum);
            return (
              <div
                key={actNum}
                className="w-88 shrink-0 bg-[#1d1d21] border border-[#32323a] rounded-lg flex flex-col max-h-full overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-[#232328] border-b border-[#32323a] flex items-center justify-between">
                  <div className="font-bold text-gray-100">Act {actNum}</div>
                  <div className="flex items-center gap-2 tabular-nums text-[11px] text-gray-400">
                    <span>{actScenes.length} scenes</span>
                    <button
                      type="button"
                      onClick={() => onAddNewScene(actNum)}
                      className="p-1 rounded bg-[#2d2d34] hover:bg-[#ff7700] hover:text-black text-gray-300 transition-colors"
                      title={`Add scene to Act ${actNum}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {actScenes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-[11px]">
                      No scenes in Act {actNum}.
                    </div>
                  ) : (
                    actScenes.map((sc) => {
                      const isSelected = sc.id === selectedSceneId;
                      const beats = structuralBeatsBySceneId.get(sc.id) || [];
                      const globalIdx = project.scenes.findIndex((item) => item.id === sc.id);

                      return (
                        <div
                          key={sc.id}
                          onClick={() => onSelectScene(sc.id)}
                          className={`bg-[#151518] border rounded-md p-3 space-y-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#ff8000] ring-1 ring-[#ff8000]/30'
                              : 'border-[#2e2e36] hover:border-[#4a4a55]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono font-bold text-amber-300 text-[11px] leading-snug">
                              #{sc.sceneNumber} · {sc.heading}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 tabular-nums shrink-0">
                              {sc.pages}p
                            </span>
                          </div>

                          <textarea
                            rows={2}
                            value={sc.synopsis}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              onUpdateScene({ ...sc, synopsis: e.target.value })
                            }
                            placeholder="Write scene beat synopsis..."
                            className="w-full bg-[#1c1c20] border border-[#2d2d34] rounded p-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                          />

                          {beats.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-[#26262c]">
                              {beats.map((b) => (
                                <div
                                  key={b.id}
                                  className="text-[10px] text-cyan-300 truncate flex items-center gap-1"
                                >
                                  <Bookmark className="w-2.5 h-2.5 shrink-0" />
                                  <span className="font-mono uppercase">{b.type}:</span>
                                  <span className="text-gray-300 truncate">{b.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-[#26262c] text-[10px] text-gray-400">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={globalIdx <= 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReorderScene(sc.id, 'earlier');
                                }}
                                className="p-1 rounded bg-[#222228] hover:bg-[#303038] disabled:opacity-30 text-gray-300"
                                title="Move scene earlier"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={globalIdx >= project.scenes.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReorderScene(sc.id, 'later');
                                }}
                                className="p-1 rounded bg-[#222228] hover:bg-[#303038] disabled:opacity-30 text-gray-300"
                                title="Move scene later"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                              <span className="ml-1 tabular-nums">Day {sc.storyDay}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSceneInAuthoring(sc.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#26262c] hover:bg-[#ff7700] hover:text-black text-gray-200 font-semibold transition-colors"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Edit Script</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredScenes.map((sc) => {
              const isSelected = sc.id === selectedSceneId;
              const globalIdx = project.scenes.findIndex((item) => item.id === sc.id);
              return (
                <div
                  key={sc.id}
                  onClick={() => onSelectScene(sc.id)}
                  className={`bg-[#1e1e22] border rounded-lg p-4 space-y-3 transition-colors ${
                    isSelected
                      ? 'border-[#ff8000] ring-1 ring-[#ff8000]/30'
                      : 'border-[#33333b] hover:border-[#4b4b56]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#2d2d34]">
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-mono tabular-nums">
                        Scene {sc.sceneNumber} · Act {sc.act} · Day {sc.storyDay} · {sc.pages} pp
                      </div>
                      <input
                        type="text"
                        value={sc.heading}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onUpdateScene({ ...sc, heading: e.target.value.toUpperCase() })
                        }
                        className="w-full bg-transparent text-xs font-bold text-amber-300 uppercase focus:outline-none focus:border-b focus:border-[#ff8000] mt-0.5 select-text"
                      />
                    </div>

                    <select
                      value={sc.act || 1}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onUpdateScene({ ...sc, act: Number(e.target.value) })
                      }
                      className="bg-[#151517] border border-[#34343c] rounded px-1.5 py-0.5 text-[10px] text-gray-200"
                    >
                      {actsList.map((a) => (
                        <option key={a} value={a}>
                          Act {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Scene Synopsis</label>
                    <textarea
                      rows={3}
                      value={sc.synopsis}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateScene({ ...sc, synopsis: e.target.value })}
                      placeholder="Summarize scene conflict and turning point..."
                      className="w-full bg-[#151517] border border-[#303038] rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Outline Notes</label>
                    <input
                      type="text"
                      value={sc.notes}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateScene({ ...sc, notes: e.target.value })}
                      placeholder="Setup/payoff notes or director intention..."
                      className="w-full bg-[#151517] border border-[#303038] rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2d2d34] text-[10px] text-gray-400">
                    <span className="truncate max-w-[160px]">
                      {sc.characters.length > 0
                        ? sc.characters.join(', ')
                        : 'No cast listed'}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={globalIdx <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderScene(sc.id, 'earlier');
                        }}
                        className="p-1 rounded bg-[#25252b] hover:bg-[#32323a] disabled:opacity-30 text-gray-300"
                        title="Move earlier"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={globalIdx >= project.scenes.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderScene(sc.id, 'later');
                        }}
                        className="p-1 rounded bg-[#25252b] hover:bg-[#32323a] disabled:opacity-30 text-gray-300"
                        title="Move later"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSceneInAuthoring(sc.id);
                        }}
                        className="px-2.5 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold"
                      >
                        Open Script
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* View 3: Beat Outline Table */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto bg-[#1e1e22] border border-[#33333b] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#17171a] border-b border-[#32323a] text-[11px] text-gray-400">
                <tr>
                  <th className="py-2.5 px-3 w-16">Sc #</th>
                  <th className="py-2.5 px-3 w-20">Act</th>
                  <th className="py-2.5 px-3">Scene Heading & Location</th>
                  <th className="py-2.5 px-3">Synopsis & Structural Beats</th>
                  <th className="py-2.5 px-3 w-44">Cast</th>
                  <th className="py-2.5 px-3 w-24 text-right">Pages</th>
                  <th className="py-2.5 px-3 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b2b32]">
                {filteredScenes.map((sc) => {
                  const beats = structuralBeatsBySceneId.get(sc.id) || [];
                  const globalIdx = project.scenes.findIndex((item) => item.id === sc.id);
                  return (
                    <tr
                      key={sc.id}
                      onClick={() => onSelectScene(sc.id)}
                      className={`hover:bg-[#25252b] transition-colors ${
                        sc.id === selectedSceneId ? 'bg-[#26231d]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 align-top font-mono font-bold text-amber-400 tabular-nums">
                        {sc.sceneNumber}
                      </td>
                      <td className="py-2.5 px-3 align-top tabular-nums text-gray-300">
                        Act {sc.act}
                        <div className="text-[10px] text-gray-500">Day {sc.storyDay}</div>
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-semibold text-gray-100">{sc.heading}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {sc.location || sc.setting}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                            <Clock className="w-3 h-3" />
                            {sc.timecode}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top space-y-1.5">
                        <input
                          type="text"
                          value={sc.synopsis}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onUpdateScene({ ...sc, synopsis: e.target.value })}
                          placeholder="Add scene beat synopsis..."
                          className="w-full bg-[#151518] border border-[#2f2f37] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] select-text"
                        />
                        {beats.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[10px] text-cyan-300">
                            {beats.map((b) => (
                              <span key={b.id}>
                                [{b.type.replace('_', ' ')}] {b.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top text-[11px] text-gray-300">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {sc.characters.join(', ') || '—'}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-gray-200">
                        {sc.pages}
                      </td>
                      <td
                        className="py-2.5 px-3 align-top text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={globalIdx <= 0}
                            onClick={() => onReorderScene(sc.id, 'earlier')}
                            className="p-1 rounded bg-[#27272e] hover:bg-[#34343e] disabled:opacity-30"
                            title="Move earlier"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={globalIdx >= project.scenes.length - 1}
                            onClick={() => onReorderScene(sc.id, 'later')}
                            className="p-1 rounded bg-[#27272e] hover:bg-[#34343e] disabled:opacity-30"
                            title="Move later"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenSceneInAuthoring(sc.id)}
                            className="px-2 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold text-[10px]"
                          >
                            Script
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
