import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Maximize2,
  ArrowUpRight,
  Check,
  RotateCcw,
  Shirt,
  Package,
  MapPin,
  User,
} from 'lucide-react';
import { Scene, SceneContinuityAlert } from '../types/story';
import { SceneContinuityReport } from '../utils/sceneContinuityCheck';

interface SceneContinuityPanelProps {
  report: SceneContinuityReport;
  selectedScene: Scene | undefined;
  onJumpToOccurrence: (sceneId: string, elementId?: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onRestoreAlert: (alertId: string) => void;
  onOpenFullModal: () => void;
}

export const SceneContinuityPanel: React.FC<SceneContinuityPanelProps> = ({
  report,
  selectedScene,
  onJumpToOccurrence,
  onAcknowledgeAlert,
  onRestoreAlert,
  onOpenFullModal,
}) => {
  const [scope, setScope] = useState<'scene' | 'all'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const scopedAlerts: SceneContinuityAlert[] =
    scope === 'scene' && selectedScene
      ? report.activeAlerts.filter(
          (a) => a.current.sceneId === selectedScene.id || a.previous.sceneId === selectedScene.id
        )
      : report.activeAlerts;

  const sceneTrackedTargets = selectedScene
    ? [...report.trackedCharacters, ...report.trackedLocations].filter((t) =>
        t.items.some((item) => item.mentions.some((m) => m.sceneId === selectedScene.id))
      )
    : [...report.trackedCharacters, ...report.trackedLocations];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 select-none">
      {/* Summary Header */}
      <div className="bg-[#1b1b1b] border border-[#363636] rounded p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {report.summary.totalActive > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-semibold text-gray-100 truncate">
              {report.summary.totalActive > 0
                ? `${report.summary.totalActive} Active Continuity Alert${
                    report.summary.totalActive === 1 ? '' : 's'
                  }`
                : 'Continuity Clear'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenFullModal}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] text-[11px] text-amber-300 font-medium whitespace-nowrap shrink-0 transition-colors"
            title="Open Full Side-by-Side Continuity Report"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Report</span>
          </button>
        </div>

        <div className="text-[11px] text-gray-400 tabular-nums flex items-center flex-wrap gap-x-2 gap-y-0.5">
          <span>{report.summary.conflictsCount} Conflicts</span>
          <span>·</span>
          <span>{report.summary.warningsCount} Warnings</span>
          <span>·</span>
          <span>{report.summary.trackedCharacterCount} Characters</span>
          <span>·</span>
          <span>{report.summary.trackedLocationCount} Locations</span>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2c2c2c]">
          <div className="flex items-center bg-[#141414] border border-[#343434] rounded p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setScope('scene')}
              disabled={!selectedScene}
              className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors ${
                scope === 'scene' && selectedScene
                  ? 'bg-[#2c2c2c] text-amber-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 disabled:opacity-40'
              }`}
            >
              {selectedScene ? `Sc. ${selectedScene.sceneNumber}` : 'This Scene'}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors ${
                scope === 'all' || !selectedScene
                  ? 'bg-[#2c2c2c] text-amber-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Scenes
            </button>
          </div>

          {report.acknowledgedAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAcknowledged((v) => !v)}
              className="text-[11px] text-gray-400 hover:text-gray-200 whitespace-nowrap shrink-0 tabular-nums"
            >
              {showAcknowledged
                ? 'Hide Dismissed'
                : `Dismissed (${report.acknowledgedAlerts.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 px-0.5">
          Detected Conflicts & Warnings
        </div>

        {scopedAlerts.length === 0 ? (
          <div className="bg-[#1c1c1c] border border-[#323232] rounded p-3 text-[11px] text-gray-400 leading-relaxed">
            {scope === 'scene' && selectedScene
              ? `No prop or costume conflicts detected involving Scene ${selectedScene.sceneNumber}. Edit element descriptions to test live continuity tracking.`
              : 'No conflicting prop or costume descriptions found across scenes. Live analyzer monitors every action, parenthetical, and shot element as you type.'}
          </div>
        ) : (
          scopedAlerts.map((alert) => {
            const isConflict = alert.severity === 'conflict';
            return (
              <div
                key={alert.id}
                className="bg-[#1b1b1b] border border-[#383838] rounded p-2.5 space-y-2"
              >
                {/* Header: Severity + Domain */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isConflict ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${
                        isConflict ? 'text-rose-300' : 'text-amber-300'
                      }`}
                    >
                      {isConflict ? 'Conflict' : 'Warning'}
                    </span>
                    <span className="text-gray-500">·</span>
                    <span className="text-[10px] text-gray-300 flex items-center gap-1 truncate">
                      {alert.domain === 'costume' ? (
                        <Shirt className="w-3 h-3 text-cyan-400 shrink-0" />
                      ) : (
                        <Package className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{alert.itemName}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#252525] hover:bg-[#323232] border border-[#3c3c3c] text-[10px] text-gray-300 whitespace-nowrap shrink-0"
                    title="Dismiss / Acknowledge continuity alert"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Dismiss</span>
                  </button>
                </div>

                {/* Title & Explanation */}
                <div>
                  <div className="text-xs font-semibold text-gray-100 leading-snug">
                    {alert.title}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    {alert.explanation}
                  </p>
                </div>

                {/* Previous vs Current Evidence */}
                <div className="space-y-1.5 pt-1 border-t border-[#2c2c2c] text-[11px]">
                  <div className="bg-[#151515] border border-[#2d2d2d] rounded p-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 mb-0.5 tabular-nums">
                      <span className="font-semibold text-gray-300">
                        Previous · Sc. {alert.previous.sceneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onJumpToOccurrence(alert.previous.sceneId, alert.previous.elementId)
                        }
                        className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
                      >
                        <span>Jump</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-gray-300 italic line-clamp-2">
                      "{alert.previous.excerpt}"
                    </div>
                  </div>

                  <div className="bg-[#191516] border border-rose-900/50 rounded p-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 mb-0.5 tabular-nums">
                      <span className="font-semibold text-rose-300">
                        Conflicting · Sc. {alert.current.sceneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onJumpToOccurrence(alert.current.sceneId, alert.current.elementId)
                        }
                        className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-gray-200 italic line-clamp-2">
                      "{alert.current.excerpt}"
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dismissed Alerts */}
      {showAcknowledged && report.acknowledgedAlerts.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[#343434]">
          <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">
            Dismissed Alerts
          </div>
          {report.acknowledgedAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-[#181818] border border-[#2f2f2f] rounded p-2 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-gray-300 truncate">{alert.title}</div>
                <div className="text-[10px] text-gray-500 tabular-nums">
                  Sc. {alert.previous.sceneNumber} vs Sc. {alert.current.sceneNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRestoreAlert(alert.id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#252525] hover:bg-[#323232] border border-[#3b3b3b] text-[10px] text-gray-300 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Restore</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live Tracked Props & Costumes */}
      <div className="space-y-1.5 pt-2 border-t border-[#343434]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400">
            Tracked Costumes & Props
          </span>
          <span className="text-[10px] text-gray-500 tabular-nums">
            {sceneTrackedTargets.length} targets
          </span>
        </div>

        {sceneTrackedTargets.length === 0 ? (
          <div className="text-[11px] text-gray-500 bg-[#1a1a1a] border border-[#2e2e2e] rounded p-2.5">
            No wardrobe or prop cues detected in this scope yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {sceneTrackedTargets.slice(0, 8).map((target) => (
              <div
                key={`${target.targetType}:${target.targetName}`}
                className="bg-[#1a1a1a] border border-[#303030] rounded p-2 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {target.targetType === 'character' ? (
                      <User className="w-3 h-3 text-cyan-400 shrink-0" />
                    ) : (
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold text-gray-200 truncate">
                      {target.targetName}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                    {target.sceneCount} sc
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 space-y-0.5 pl-4">
                  {target.items.slice(0, 4).map((item) => {
                    const lastMention = item.mentions[item.mentions.length - 1];
                    const descLabel =
                      lastMention.descriptors.length > 0
                        ? ` (${lastMention.descriptors.join(', ')})`
                        : '';
                    const scenesLabel = Array.from(
                      new Set(item.mentions.map((m) => `Sc.${m.sceneNumber}`))
                    ).join(', ');
                    return (
                      <div
                        key={`${item.domain}:${item.itemKey}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span
                          className={`truncate ${
                            item.hasAlert ? 'text-rose-300 font-medium' : 'text-gray-300'
                          }`}
                        >
                          {item.itemLabel}
                          {descLabel}
                        </span>
                        <span className="text-gray-500 font-mono tabular-nums shrink-0">
                          {scenesLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
