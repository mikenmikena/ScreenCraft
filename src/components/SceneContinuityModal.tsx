import React, { useMemo, useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Shirt,
  Package,
  Search,
  ArrowUpRight,
  Check,
  RotateCcw,
  User,
  MapPin,
} from 'lucide-react';
import { SceneContinuityAlert } from '../types/story';
import { ContinuityTrackedTarget, SceneContinuityReport } from '../utils/sceneContinuityCheck';

interface SceneContinuityModalProps {
  projectTitle: string;
  report: SceneContinuityReport;
  onJumpToOccurrence: (sceneId: string, elementId?: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onRestoreAlert: (alertId: string) => void;
  onClose: () => void;
}

type ModalTab = 'all' | 'costumes' | 'props' | 'inventory' | 'acknowledged';

export const SceneContinuityModal: React.FC<SceneContinuityModalProps> = ({
  projectTitle,
  report,
  onJumpToOccurrence,
  onAcknowledgeAlert,
  onRestoreAlert,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = useMemo(() => {
    let source: SceneContinuityAlert[] =
      activeTab === 'acknowledged' ? report.acknowledgedAlerts : report.activeAlerts;

    if (activeTab === 'costumes') {
      source = source.filter((a) => a.domain === 'costume');
    } else if (activeTab === 'props') {
      source = source.filter((a) => a.domain === 'prop');
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.targetName.toLowerCase().includes(q) ||
        a.itemName.toLowerCase().includes(q) ||
        a.explanation.toLowerCase().includes(q) ||
        a.previous.excerpt.toLowerCase().includes(q) ||
        a.current.excerpt.toLowerCase().includes(q)
    );
  }, [activeTab, report.activeAlerts, report.acknowledgedAlerts, searchQuery]);

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filterList = (list: ContinuityTrackedTarget[]) =>
      !q
        ? list
        : list.filter(
            (t) =>
              t.targetName.toLowerCase().includes(q) ||
              t.items.some(
                (i) =>
                  i.itemLabel.toLowerCase().includes(q) ||
                  i.mentions.some((m) => m.descriptors.some((d) => d.includes(q)))
              )
          );
    return {
      characters: filterList(report.trackedCharacters),
      locations: filterList(report.trackedLocations),
    };
  }, [report.trackedCharacters, report.trackedLocations, searchQuery]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1e1e1e] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden text-xs text-gray-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#161616] border-b border-[#333333] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {report.summary.totalActive > 0 ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-100 truncate">
                  Automated Scene Continuity Check
                </h2>
                <span className="text-gray-500">·</span>
                <span className="text-xs text-amber-300 font-medium truncate">
                  {projectTitle}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
                {report.summary.conflictsCount} Conflicts · {report.summary.warningsCount} Warnings ·{' '}
                {report.summary.trackedCharacterCount} Tracked Characters ·{' '}
                {report.summary.trackedLocationCount} Tracked Locations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#2c2c2c] transition-colors shrink-0"
            aria-label="Close Scene Continuity Check"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="px-5 py-2.5 bg-[#1a1a1a] border-b border-[#323232] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums ${
                activeTab === 'all'
                  ? 'bg-[#2c2c2c] text-amber-300 border border-[#4a4a4a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424] border border-transparent'
              }`}
            >
              All Active ({report.summary.totalActive})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('costumes')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums inline-flex items-center gap-1.5 ${
                activeTab === 'costumes'
                  ? 'bg-[#2c2c2c] text-cyan-300 border border-[#4a4a4a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424] border border-transparent'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Character Costumes ({report.summary.costumeAlerts})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('props')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums inline-flex items-center gap-1.5 ${
                activeTab === 'props'
                  ? 'bg-[#2c2c2c] text-amber-300 border border-[#4a4a4a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424] border border-transparent'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Props & Locations ({report.summary.propAlerts})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums ${
                activeTab === 'inventory'
                  ? 'bg-[#2c2c2c] text-emerald-300 border border-[#4a4a4a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424] border border-transparent'
              }`}
            >
              Tracked Inventory (
              {report.summary.trackedCharacterCount + report.summary.trackedLocationCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('acknowledged')}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums ${
                activeTab === 'acknowledged'
                  ? 'bg-[#2c2c2c] text-gray-200 border border-[#4a4a4a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424] border border-transparent'
              }`}
            >
              Dismissed ({report.summary.totalAcknowledged})
            </button>
          </div>

          <div className="relative w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter character, location, prop..."
              className="w-full bg-[#131313] border border-[#3a3a3a] rounded pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#ff8000]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'inventory' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Characters Inventory */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-200 border-b border-[#333] pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Character Wardrobe & Personal Props</span>
                  </span>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {filteredInventory.characters.length}
                  </span>
                </div>

                {filteredInventory.characters.length === 0 ? (
                  <div className="bg-[#181818] border border-[#303030] rounded p-3 text-gray-400">
                    No character wardrobe or personal prop descriptors matched.
                  </div>
                ) : (
                  filteredInventory.characters.map((target) => (
                    <div
                      key={`inv-char-${target.targetName}`}
                      className="bg-[#181818] border border-[#333333] rounded p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-100">{target.targetName}</span>
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          {target.sceneCount} scene{target.sceneCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-[#282828]">
                        {target.items.map((item) => (
                          <div key={`${item.domain}:${item.itemKey}`} className="py-1.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-medium flex items-center gap-1.5 ${
                                  item.hasAlert ? 'text-rose-300' : 'text-gray-200'
                                }`}
                              >
                                {item.domain === 'costume' ? (
                                  <Shirt className="w-3 h-3 text-cyan-400" />
                                ) : (
                                  <Package className="w-3 h-3 text-amber-400" />
                                )}
                                <span>{item.itemLabel}</span>
                              </span>
                              <span className="text-[10px] text-gray-500 uppercase">
                                {item.domain}
                              </span>
                            </div>
                            <div className="space-y-1 pl-4">
                              {item.mentions.map((m, idx) => (
                                <div
                                  key={`${m.elementId}-${idx}`}
                                  className="flex items-center justify-between gap-2 text-[11px] text-gray-400"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onJumpToOccurrence(m.sceneId, m.elementId);
                                      onClose();
                                    }}
                                    className="text-left hover:text-amber-300 truncate"
                                  >
                                    <span className="font-mono text-gray-300 tabular-nums mr-1.5">
                                      Sc. {m.sceneNumber}:
                                    </span>
                                    <span>
                                      {m.descriptors.length > 0
                                        ? m.descriptors.join(', ')
                                        : 'mentioned'}
                                    </span>
                                    <span className="text-gray-500 ml-1.5">— "{m.excerpt}"</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Locations Inventory */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-200 border-b border-[#333] pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Location Set Dressing & Hero Props</span>
                  </span>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {filteredInventory.locations.length}
                  </span>
                </div>

                {filteredInventory.locations.length === 0 ? (
                  <div className="bg-[#181818] border border-[#303030] rounded p-3 text-gray-400">
                    No location prop descriptors matched.
                  </div>
                ) : (
                  filteredInventory.locations.map((target) => (
                    <div
                      key={`inv-loc-${target.targetName}`}
                      className="bg-[#181818] border border-[#333333] rounded p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">{target.targetName}</span>
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          {target.sceneCount} scene{target.sceneCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-[#282828]">
                        {target.items.map((item) => (
                          <div key={`${item.domain}:${item.itemKey}`} className="py-1.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-medium flex items-center gap-1.5 ${
                                  item.hasAlert ? 'text-rose-300' : 'text-gray-200'
                                }`}
                              >
                                <Package className="w-3 h-3 text-amber-400" />
                                <span>{item.itemLabel}</span>
                              </span>
                            </div>
                            <div className="space-y-1 pl-4">
                              {item.mentions.map((m, idx) => (
                                <div
                                  key={`${m.elementId}-${idx}`}
                                  className="flex items-center justify-between gap-2 text-[11px] text-gray-400"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onJumpToOccurrence(m.sceneId, m.elementId);
                                      onClose();
                                    }}
                                    className="text-left hover:text-amber-300 truncate"
                                  >
                                    <span className="font-mono text-gray-300 tabular-nums mr-1.5">
                                      Sc. {m.sceneNumber}:
                                    </span>
                                    <span>
                                      {m.descriptors.length > 0
                                        ? m.descriptors.join(', ')
                                        : 'mentioned'}
                                    </span>
                                    <span className="text-gray-500 ml-1.5">— "{m.excerpt}"</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-[#181818] border border-[#323232] rounded-lg p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-gray-100">
                {activeTab === 'acknowledged'
                  ? 'No dismissed continuity alerts'
                  : 'No conflicting prop or costume descriptions detected'}
              </div>
              <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
                {activeTab === 'acknowledged'
                  ? 'Alerts you dismiss during review appear here and can be restored anytime.'
                  : 'All tracked character costumes and location props are consistent across chronological scenes. Switch to the Tracked Inventory tab to inspect extracted props and wardrobe items.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isConflict = alert.severity === 'conflict';
                const isDismissed = activeTab === 'acknowledged';
                return (
                  <div
                    key={alert.id}
                    className="bg-[#181818] border border-[#363636] rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 text-[11px]">
                          <span
                            className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider ${
                              isConflict ? 'text-rose-300' : 'text-amber-300'
                            }`}
                          >
                            {isConflict ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            <span>{isConflict ? 'Conflict' : 'Warning'}</span>
                          </span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-300 inline-flex items-center gap-1">
                            {alert.targetType === 'character' ? (
                              <User className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <MapPin className="w-3 h-3 text-amber-400" />
                            )}
                            <span>{alert.targetName}</span>
                          </span>
                          <span className="text-gray-600">·</span>
                          <span className="text-gray-300 inline-flex items-center gap-1">
                            {alert.domain === 'costume' ? (
                              <Shirt className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Package className="w-3 h-3 text-amber-400" />
                            )}
                            <span>{alert.itemName}</span>
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-100">{alert.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">{alert.explanation}</p>
                      </div>

                      {isDismissed ? (
                        <button
                          type="button"
                          onClick={() => onRestoreAlert(alert.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#444] text-xs text-gray-200 whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Restore Alert</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#444] text-xs text-gray-200 whitespace-nowrap shrink-0"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Previous Occurrence */}
                      <div className="bg-[#141414] border border-[#2f2f2f] rounded p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-cyan-300 tabular-nums">
                            Established · Scene {alert.previous.sceneNumber}
                            {typeof alert.previous.storyDay === 'number'
                              ? ` · Story Day ${alert.previous.storyDay}`
                              : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onJumpToOccurrence(alert.previous.sceneId, alert.previous.elementId);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 whitespace-nowrap shrink-0"
                          >
                            <span>Jump to Script</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-gray-400 truncate">
                          {alert.previous.sceneHeading}
                        </div>
                        <p className="text-xs text-gray-200 italic leading-relaxed select-text">
                          "{alert.previous.excerpt}"
                        </p>
                        <div className="text-[11px] text-gray-400">
                          Matched: <span className="text-cyan-300 font-medium">{alert.previous.matchedPhrase}</span>
                        </div>
                      </div>

                      {/* Conflicting Current Occurrence */}
                      <div className="bg-[#1c1415] border border-rose-900/60 rounded p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-rose-300 tabular-nums">
                            Conflicting · Scene {alert.current.sceneNumber}
                            {typeof alert.current.storyDay === 'number'
                              ? ` · Story Day ${alert.current.storyDay}`
                              : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onJumpToOccurrence(alert.current.sceneId, alert.current.elementId);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0"
                          >
                            <span>Edit in Script</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-gray-400 truncate">
                          {alert.current.sceneHeading}
                        </div>
                        <p className="text-xs text-gray-100 italic leading-relaxed select-text">
                          "{alert.current.excerpt}"
                        </p>
                        <div className="text-[11px] text-gray-400">
                          Matched: <span className="text-rose-300 font-medium">{alert.current.matchedPhrase}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#161616] border-t border-[#333333] flex items-center justify-between text-[11px] text-gray-400">
          <span>
            Updates live as you edit scenes. Explicit wardrobe-change or repair phrasing (e.g., "changed into", "repaired") automatically clears false positives.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#2a2a2a] hover:bg-[#363636] border border-[#444] text-gray-200 font-medium whitespace-nowrap shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
