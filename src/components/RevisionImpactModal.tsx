import React, { useState, useMemo } from 'react';
import { RevisionImpactReport, SceneSyncDiff } from '../types/story';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Package,
  Users,
  Check,
  ArrowRight,
} from 'lucide-react';

interface RevisionImpactModalProps {
  report: RevisionImpactReport;
  lastSyncedAt?: string;
  onCommitSync: (selectedSceneIds: string[]) => void;
  onClose: () => void;
}

export const RevisionImpactModal: React.FC<RevisionImpactModalProps> = ({
  report,
  lastSyncedAt,
  onCommitSync,
  onClose,
}) => {
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(() =>
    report.sceneDiffs.map((d) => d.sceneId)
  );

  const toggleScene = (sceneId: string) => {
    setSelectedSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const selectedCount = useMemo(
    () => selectedSceneIds.filter((id) => report.sceneDiffs.some((d) => d.sceneId === id)).length,
    [selectedSceneIds, report]
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none text-xs text-gray-200">
      <div className="bg-[#212121] border border-[#424242] rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#191919] border-b border-[#363636] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-[#2d2115] border border-[#ff7700]/40 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-[#ff8000]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-100 truncate">
                Revision Impact Preview — Live Script-to-Schedule Sync
              </h2>
              <p className="text-[11px] text-gray-400 truncate">
                Direct two-way sync without .fdx export/import round-trips
                {lastSyncedAt ? ` · Last synced ${lastSyncedAt}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#303030] rounded transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metrics Strip */}
        <div className="bg-[#1b1b1b] border-b border-[#333333] px-5 py-2.5 grid grid-cols-4 divide-x divide-[#323232] flex-shrink-0">
          <div className="pr-4">
            <div className="text-[11px] text-gray-400">Impacted Scenes</div>
            <div className="text-sm font-semibold text-gray-100 mt-0.5 tabular-nums">
              {report.totalImpactedScenes} Scene{report.totalImpactedScenes === 1 ? '' : 's'}
            </div>
          </div>
          <div className="px-4">
            <div className="text-[11px] text-gray-400">New Locations</div>
            <div className="text-sm font-semibold text-cyan-400 mt-0.5 tabular-nums">
              +{report.totalNewLocations} Set{report.totalNewLocations === 1 ? '' : 's'}
            </div>
          </div>
          <div className="px-4">
            <div className="text-[11px] text-gray-400">Added Props</div>
            <div className="text-sm font-semibold text-amber-400 mt-0.5 tabular-nums">
              +{report.totalAddedProps} Prop{report.totalAddedProps === 1 ? '' : 's'}
            </div>
          </div>
          <div className="pl-4">
            <div className="text-[11px] text-gray-400">Cast Conflicts Flagged</div>
            <div
              className={`text-sm font-semibold mt-0.5 tabular-nums ${
                report.totalCastConflicts > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {report.totalCastConflicts} Conflict{report.totalCastConflicts === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Diff List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!report.hasChanges ? (
            <div className="p-10 text-center bg-[#191919] border border-[#343434] rounded space-y-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-gray-100">
                Script and Schedule Are in Sync
              </div>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                No uncommitted scene headings, locations, cast additions, props, or page-count deltas were detected between the screenplay and stripboard.
              </p>
            </div>
          ) : (
            report.sceneDiffs.map((diff: SceneSyncDiff) => {
              const checked = selectedSceneIds.includes(diff.sceneId);
              return (
                <div
                  key={diff.sceneId}
                  className={`rounded border p-3.5 space-y-3 transition-colors ${
                    checked
                      ? 'bg-[#1c1c1c] border-[#484848]'
                      : 'bg-[#171717] border-[#2e2e2e] opacity-70'
                  }`}
                >
                  {/* Scene Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleScene(diff.sceneId)}
                        className="mt-0.5 accent-[#ff7700]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-amber-400">
                            Scene {diff.sceneNumber}
                          </span>
                          <span className="font-semibold text-gray-100 truncate">
                            {diff.heading}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                          {diff.status === 'added_scene' ? 'New Scene Strip' : 'Modified Script Metadata'}
                          {' · '}
                          {diff.liveSnapshot.pages} pgs
                          {diff.eighthsDelta !== 0 && (
                            <span className={diff.eighthsDelta > 0 ? ' text-amber-300' : ' text-cyan-300'}>
                              {' '}
                              ({diff.eighthsDelta > 0 ? '+' : ''}
                              {diff.eighthsDelta}/8)
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Impact Breakdown Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pl-6">
                    {/* Location Impact */}
                    <div className="bg-[#151515] border border-[#2d2d2d] rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Location / Set</span>
                      </div>
                      {diff.changedLocationFrom ? (
                        <div className="text-[11px] text-gray-300 flex items-center gap-1 flex-wrap">
                          <span className="line-through text-gray-500">
                            {diff.changedLocationFrom}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-500" />
                          <span className="text-cyan-300 font-medium">
                            {diff.liveSnapshot.setting}
                          </span>
                        </div>
                      ) : diff.addedLocations.length > 0 ? (
                        <div className="text-[11px] text-cyan-300 font-medium">
                          + New Location: {diff.addedLocations.join(', ')}
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500">No location change</div>
                      )}
                    </div>

                    {/* Props & Wardrobe Impact */}
                    <div className="bg-[#151515] border border-[#2d2d2d] rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                        <Package className="w-3.5 h-3.5" />
                        <span>Added Props & Wardrobe</span>
                      </div>
                      {diff.addedProps.length === 0 && diff.addedWardrobe.length === 0 ? (
                        <div className="text-[11px] text-gray-500">No new props detected</div>
                      ) : (
                        <div className="text-[11px] text-gray-200 space-y-0.5">
                          {diff.addedProps.length > 0 && (
                            <div className="text-amber-300">+ Props: {diff.addedProps.join(', ')}</div>
                          )}
                          {diff.addedWardrobe.length > 0 && (
                            <div className="text-emerald-300">
                              + Wardrobe: {diff.addedWardrobe.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cast Delta */}
                    <div className="bg-[#151515] border border-[#2d2d2d] rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>Cast Changes</span>
                      </div>
                      {diff.addedCast.length === 0 && diff.removedCast.length === 0 ? (
                        <div className="text-[11px] text-gray-500">Unchanged cast list</div>
                      ) : (
                        <div className="text-[11px] space-y-0.5">
                          {diff.addedCast.length > 0 && (
                            <div className="text-emerald-300">+ Added: {diff.addedCast.join(', ')}</div>
                          )}
                          {diff.removedCast.length > 0 && (
                            <div className="text-gray-400">- Removed: {diff.removedCast.join(', ')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flagged Schedule Conflicts */}
                  {diff.conflicts.length > 0 && (
                    <div className="pl-6 space-y-1.5">
                      {diff.conflicts.map((flag, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-1.5 rounded border text-[11px] flex items-center gap-2 ${
                            flag.severity === 'conflict'
                              ? 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                              : 'bg-amber-950/30 border-amber-700/40 text-amber-300'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{flag.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#191919] border-t border-[#363636] flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2a2a2a] hover:bg-[#353535] text-gray-200 rounded border border-[#404040] transition-colors whitespace-nowrap shrink-0"
          >
            {report.hasChanges ? 'Cancel / Keep Schedule Separate' : 'Close'}
          </button>

          {report.hasChanges && (
            <button
              disabled={selectedCount === 0}
              onClick={() => onCommitSync(selectedSceneIds)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Commit Sync to Schedule ({selectedCount} Scene{selectedCount === 1 ? '' : 's'})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
