import React, { useEffect, useMemo, useState } from 'react';
import {
  Scene,
  ScreenplayElement,
  ShootLocation,
  StripboardStrip,
} from '../types/story';
import {
  DEFAULT_OPTIMIZATION_OPTIONS,
  OptimizationStrategy,
  ScheduleOptimizationOptions,
  formatMinutesToDuration,
  optimizeStripboardSchedule,
} from '../utils/scheduleOptimizer';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Coffee,
  Lock,
  MapPin,
  Moon,
  RotateCcw,
  Route,
  Sun,
  Unlock,
  Users,
  X,
} from 'lucide-react';

interface ScheduleOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  strips: StripboardStrip[];
  scenes: Scene[];
  elements: ScreenplayElement[];
  locations?: ShootLocation[];
  onApplySchedule: (optimizedStrips: StripboardStrip[], summaryLabel: string) => void;
}

type PreviewTab = 'schedule' | 'cast_dod' | 'diff';

const STRATEGY_ITEMS: Array<{
  id: OptimizationStrategy;
  label: string;
  description: string;
}> = [
  {
    id: 'balanced',
    label: 'Balanced AD',
    description: 'Jointly minimizes company moves, lighting flips, and actor hold days.',
  },
  {
    id: 'location_first',
    label: 'Location First',
    description: 'Shoots out every physical set and soundstage together before moving unit.',
  },
  {
    id: 'cast_first',
    label: 'Cast Continuity',
    description: 'Compresses principal talent spans to reduce Day-Out-of-Days idle holds.',
  },
  {
    id: 'day_night_split',
    label: 'Day / Night Split',
    description: 'Groups daylight and night exterior setups cleanly to avoid lighting resets.',
  },
];

function getStripPalette(strip: StripboardStrip): string {
  if (strip.type !== 'scene') return '';
  const intExt = (strip.intExt || 'INT').toUpperCase();
  const dayNight = (strip.dayNight || 'DAY').toUpperCase();
  if (intExt === 'EXT' && dayNight === 'DAY') return 'bg-[#22d3ee] text-black';
  if (intExt === 'EXT' && dayNight !== 'DAY') return 'bg-[#60a5fa] text-black';
  if (intExt === 'INT' && dayNight === 'DAY') return 'bg-[#fef08a] text-black';
  return 'bg-[#fb923c] text-black';
}

export const ScheduleOptimizerModal: React.FC<ScheduleOptimizerModalProps> = ({
  isOpen,
  onClose,
  strips,
  scenes,
  elements,
  locations = [],
  onApplySchedule,
}) => {
  const [options, setOptions] = useState<ScheduleOptimizationOptions>(
    DEFAULT_OPTIMIZATION_OPTIONS
  );
  const [activeTab, setActiveTab] = useState<PreviewTab>('schedule');
  const [showPinDrawer, setShowPinDrawer] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const result = useMemo(
    () =>
      optimizeStripboardSchedule(
        strips,
        scenes,
        elements,
        options,
        locations
      ),
    [strips, scenes, elements, options, locations]
  );

  const sceneStripsForPinning = useMemo(
    () => strips.filter((s) => s.type === 'scene'),
    [strips]
  );

  if (!isOpen) return null;

  const togglePinScene = (sceneId: string) => {
    setOptions((prev) => {
      const exists = prev.pinnedSceneIds.includes(sceneId);
      return {
        ...prev,
        pinnedSceneIds: exists
          ? prev.pinnedSceneIds.filter((id) => id !== sceneId)
          : [...prev.pinnedSceneIds, sceneId],
      };
    });
  };

  const handleResetDefaults = () => {
    setOptions(DEFAULT_OPTIMIZATION_OPTIONS);
  };

  const handleApply = () => {
    const { deltas, afterMetrics } = result;
    const savedParts: string[] = [];
    if (deltas.turnaroundMinSaved > 0) {
      savedParts.push(`-${formatMinutesToDuration(deltas.turnaroundMinSaved)} turnaround`);
    }
    if (deltas.companyMovesSaved > 0) {
      savedParts.push(
        `-${deltas.companyMovesSaved} company move${deltas.companyMovesSaved === 1 ? '' : 's'}`
      );
    }
    if (deltas.castIdleHoldDaysSaved > 0) {
      savedParts.push(`-${deltas.castIdleHoldDaysSaved} idle hold day(s)`);
    }
    const label =
      savedParts.length > 0
        ? `Optimized schedule across ${afterMetrics.shootDaysCount} day(s) (${savedParts.join(', ')})`
        : `Schedule updated (${afterMetrics.shootDaysCount} shoot day(s), ${afterMetrics.sceneCount} scenes)`;

    onApplySchedule(result.optimizedStrips, label);
    onClose();
  };

  const { beforeMetrics, afterMetrics, deltas } = result;
  const hasEnoughScenes = afterMetrics.sceneCount >= 2;
  const maxDaysInDod = Math.max(
    beforeMetrics.shootDaysCount,
    afterMetrics.shootDaysCount,
    1
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="optimizer-wizard-title"
    >
      <div
        className="w-full max-w-6xl h-[88vh] bg-[#1b1b1b] border border-[#3a3a3a] rounded-lg shadow-2xl flex flex-col overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#232323] border-b border-[#363636] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-[#2d241b] border border-[#ff7700]/40 flex items-center justify-center shrink-0">
              <Route className="w-4 h-4 text-[#ff8c1a]" />
            </div>
            <div className="min-w-0">
              <h2
                id="optimizer-wizard-title"
                className="text-sm font-semibold text-white truncate"
              >
                Schedule Optimization Wizard
              </h2>
              <p className="text-xs text-gray-400 truncate">
                Clusters shared locations, lighting setups, and cast blocks to minimize turnaround times
                {result.unscheduledSceneCount > 0 && !options.includeUnscheduledScenes
                  ? ` · ${result.unscheduledSceneCount} unscheduled script scene(s) available`
                  : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333333] rounded transition-colors shrink-0"
            title="Close Optimization Wizard"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body: Left Config Rail + Right Comparison Viewport */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Left Configuration Rail */}
          <aside className="w-full lg:w-80 bg-[#171717] border-b lg:border-b-0 lg:border-r border-[#333333] p-4 overflow-y-auto shrink-0 space-y-5">
            {/* Priority Strategy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300">
                  Optimization Priority
                </span>
                <button
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {STRATEGY_ITEMS.map((item) => {
                  const active = options.strategy === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        setOptions((prev) => ({ ...prev, strategy: item.id }))
                      }
                      className={`text-left px-3 py-2 rounded border transition-colors ${
                        active
                          ? 'bg-[#2a2219] border-[#ff7700] text-white'
                          : 'bg-[#1f1f1f] border-[#2f2f2f] text-gray-300 hover:border-[#444444]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold whitespace-nowrap">
                          {item.label}
                        </span>
                        {active && (
                          <span className="text-[10px] font-mono text-[#ff8c1a] whitespace-nowrap">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day Budget & Turnaround Parameters */}
            <div className="pt-3 border-t border-[#2a2a2a] space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-gray-300">
                    Target Max Pages / Day
                  </span>
                  <span className="font-mono tabular-nums text-[#ff8c1a] font-semibold">
                    {options.maxPagesPerDay} pgs
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 p-1 bg-[#202020] rounded border border-[#303030]">
                  {[2, 3, 4, 5, 6].map((pgs) => (
                    <button
                      key={pgs}
                      onClick={() =>
                        setOptions((prev) => ({ ...prev, maxPagesPerDay: pgs }))
                      }
                      className={`py-1 rounded text-xs font-mono tabular-nums transition-colors ${
                        options.maxPagesPerDay === pgs
                          ? 'bg-[#343434] text-white font-semibold'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {pgs}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Company Move Time
                  </label>
                  <select
                    value={options.companyMovePenaltyMin}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        companyMovePenaltyMin: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-[#222222] border border-[#383838] rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-gray-200 focus:outline-none focus:border-[#ff7700]"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Lighting Flip Setup
                  </label>
                  <select
                    value={options.lightingFlipPenaltyMin}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        lightingFlipPenaltyMin: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-[#222222] border border-[#383838] rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-gray-200 focus:outline-none focus:border-[#ff7700]"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Schedule Structure Toggles */}
            <div className="pt-3 border-t border-[#2a2a2a] space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.insertDayAndMealBreaks}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      insertDayAndMealBreaks: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded border-[#444] bg-[#222] accent-[#ff7700]"
                />
                <span className="text-xs text-gray-300 leading-snug">
                  Auto-insert Shoot Day breaks, call times, and Meal/Move banners
                </span>
              </label>

              <label
                className={`flex items-start gap-2.5 select-none ${
                  result.unscheduledSceneCount === 0 && !options.includeUnscheduledScenes
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={
                    result.unscheduledSceneCount === 0 && !options.includeUnscheduledScenes
                  }
                  checked={options.includeUnscheduledScenes}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      includeUnscheduledScenes: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded border-[#444] bg-[#222] accent-[#ff7700]"
                />
                <span className="text-xs text-gray-300 leading-snug">
                  Pull unscheduled script scenes into run ({result.unscheduledSceneCount} available)
                </span>
              </label>
            </div>

            {/* Pin Specific Scenes */}
            <div className="pt-3 border-t border-[#2a2a2a]">
              <button
                onClick={() => setShowPinDrawer((p) => !p)}
                className="w-full flex items-center justify-between text-xs font-medium text-gray-300 hover:text-white py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    Pin Scenes in Current Slot ({options.pinnedSceneIds.length})
                  </span>
                </span>
                <span className="text-[11px] text-gray-400">
                  {showPinDrawer ? 'Hide' : 'Configure'}
                </span>
              </button>

              {showPinDrawer && (
                <div className="mt-2 max-h-44 overflow-y-auto border border-[#2f2f2f] rounded bg-[#141414] divide-y divide-[#242424]">
                  {sceneStripsForPinning.length === 0 ? (
                    <div className="p-3 text-[11px] text-gray-500">
                      No strips currently on board.
                    </div>
                  ) : (
                    sceneStripsForPinning.map((st) => {
                      const sid = st.sceneId || st.id;
                      const isPinned = options.pinnedSceneIds.includes(sid);
                      return (
                        <button
                          key={st.id}
                          onClick={() => togglePinScene(sid)}
                          className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-left hover:bg-[#1f1f1f] transition-colors"
                        >
                          <span className="text-[11px] text-gray-300 truncate">
                            <span className="font-mono text-gray-400 mr-1.5">
                              #{st.sceneNumber || '?'}
                            </span>
                            {st.set || 'SET'}
                          </span>
                          {isPinned ? (
                            <Lock className="w-3 h-3 text-[#ff8c1a] shrink-0" />
                          ) : (
                            <Unlock className="w-3 h-3 text-gray-500 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Right Preview & Analysis Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1e1e1e]">
            {/* 4-Column Verified Impact Comparison Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#323232] bg-[#191919] divide-y md:divide-y-0 md:divide-x divide-[#2d2d2d] shrink-0">
              {/* Metric 1: Turnaround Time */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Set Turnaround</span>
                  </span>
                  {deltas.turnaroundMinSaved > 0 && (
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                      -{formatMinutesToDuration(deltas.turnaroundMinSaved)}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xs text-gray-500 line-through">
                    {formatMinutesToDuration(beforeMetrics.totalTurnaroundMin)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-base font-bold text-white">
                    {formatMinutesToDuration(afterMetrics.totalTurnaroundMin)}
                  </span>
                </div>
              </div>

              {/* Metric 2: Company & Set Moves */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    <span>Company Moves</span>
                  </span>
                  {deltas.companyMovesSaved > 0 && (
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                      -{deltas.companyMovesSaved} saved
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xs text-gray-500 line-through">
                    {beforeMetrics.companyMoves}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-base font-bold text-white">
                    {afterMetrics.companyMoves}
                  </span>
                  <span className="text-[11px] text-gray-400 ml-1">
                    · {afterMetrics.exactSetSwitches} set shifts
                  </span>
                </div>
              </div>

              {/* Metric 3: Cast Hold Span */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span>Cast Hold Span</span>
                  </span>
                  {deltas.castHoldDaysSaved > 0 && (
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                      -{deltas.castHoldDaysSaved}d span
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xs text-gray-500 line-through">
                    {beforeMetrics.castHoldDaysTotal}d
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-base font-bold text-white">
                    {afterMetrics.castHoldDaysTotal}d
                  </span>
                  <span className="text-[11px] text-gray-400 ml-1">
                    · {afterMetrics.castIdleHoldDays} idle hold
                  </span>
                </div>
              </div>

              {/* Metric 4: Shoot Days & Pages */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Shoot Days</span>
                  </span>
                  <span className="font-mono tabular-nums text-gray-300">
                    {afterMetrics.totalPagesFormatted} pgs
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xs text-gray-500">
                    {beforeMetrics.shootDaysCount}d
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-base font-bold text-white">
                    {afterMetrics.shootDaysCount}d
                  </span>
                  <span className="text-[11px] text-gray-400 ml-1">
                    · {afterMetrics.lightingFlips} D/N flips
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Tab Controls + Optimal State Callout */}
            <div className="px-4 py-2.5 bg-[#212121] border-b border-[#323232] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-1 p-0.5 bg-[#151515] rounded border border-[#323232] min-w-0">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'schedule'
                      ? 'bg-[#2c2c2c] text-[#ff8c1a]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Optimized Stripboard ({afterMetrics.sceneCount})
                </button>
                <button
                  onClick={() => setActiveTab('cast_dod')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'cast_dod'
                      ? 'bg-[#2c2c2c] text-[#ff8c1a]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Cast Day-Out-of-Days ({afterMetrics.characterDodMatrix.length})
                </button>
                <button
                  onClick={() => setActiveTab('diff')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'diff'
                      ? 'bg-[#2c2c2c] text-[#ff8c1a]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Order Diff & Rationale ({result.sceneChanges.filter((c) => c.moved).length} moved)
                </button>
              </div>

              <div className="text-xs text-gray-400 font-mono tabular-nums">
                {result.alreadyOptimal ? (
                  <span className="text-emerald-400">
                    Current stripboard already matches optimal sequence
                  </span>
                ) : (
                  <span>
                    Total Day Span: {formatMinutesToDuration(beforeMetrics.totalProductionMin)} →{' '}
                    <span className="text-white font-semibold">
                      {formatMinutesToDuration(afterMetrics.totalProductionMin)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Viewport Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {!hasEnoughScenes ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                  <Route className="w-8 h-8 text-gray-500 mb-3" />
                  <h3 className="text-sm font-semibold text-white">
                    At least 2 scene strips are needed to optimize
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Add more scenes in the Screenplay Editor or pull unscheduled script scenes into the Stripboard run to calculate location and cast clustering.
                  </p>
                  {result.unscheduledSceneCount > 0 && !options.includeUnscheduledScenes && (
                    <button
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          includeUnscheduledScenes: true,
                        }))
                      }
                      className="mt-4 px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black text-xs font-semibold rounded transition-colors whitespace-nowrap"
                    >
                      Include {result.unscheduledSceneCount} Unscheduled Script Scene(s)
                    </button>
                  )}
                </div>
              ) : activeTab === 'schedule' ? (
                <div className="space-y-1.5">
                  {result.optimizedStrips.map((strip) => {
                    if (strip.type === 'day_break') {
                      return (
                        <div
                          key={strip.id}
                          className="mt-3 first:mt-0 bg-[#2b2b2b] border border-[#3d3d3d] px-3.5 py-2 rounded-t flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-amber-400 tracking-wide">
                              {strip.bannerTitle}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {strip.bannerDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-gray-300">
                            <span>{strip.bannerTotalPages}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Call {strip.bannerFrom} – Wrap {strip.bannerTo}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (strip.type === 'banner') {
                      return (
                        <div
                          key={strip.id}
                          className="bg-[#383530] border border-[#4c4841] px-3.5 py-1.5 flex items-center justify-between text-xs text-amber-200"
                        >
                          <div className="flex items-center gap-2">
                            <Coffee className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono tabular-nums text-[11px] text-amber-300">
                              {strip.bannerFrom} – {strip.bannerTo}
                            </span>
                            <span className="font-medium">
                              {strip.bannerTitle}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums text-[11px] text-gray-300">
                            {strip.scheduledDuration}
                          </span>
                        </div>
                      );
                    }

                    const transition = result.transitionsByStripId[strip.id];
                    const palette = getStripPalette(strip);
                    const voSet = new Set(
                      (strip.voiceOverCharacters || []).map((c) => c.toUpperCase())
                    );
                    const allCast = Array.from(
                      new Set([
                        ...(strip.characters || []).map((c) => c.toUpperCase()),
                        ...Array.from(voSet),
                      ])
                    ).filter(Boolean);

                    return (
                      <div key={strip.id} className="space-y-1">
                        {transition && transition.kind !== 'day_start' && (
                          <div className="px-3 py-0.5 flex items-center justify-between text-[11px] text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-gray-500" />
                              <span
                                className={
                                  transition.kind === 'same_set'
                                    ? 'text-emerald-400'
                                    : transition.kind === 'same_venue'
                                    ? 'text-cyan-300'
                                    : transition.kind === 'lighting_flip'
                                    ? 'text-amber-300'
                                    : 'text-orange-300'
                                }
                              >
                                {transition.label}
                              </span>
                            </span>
                            <span className="font-mono tabular-nums text-gray-500">
                              +{transition.minutes}m turnaround
                            </span>
                          </div>
                        )}

                        <div
                          className={`grid grid-cols-12 items-center px-3 py-2 rounded text-xs font-semibold ${palette}`}
                        >
                          <div className="col-span-1 font-mono tabular-nums">
                            #{strip.sceneNumber || '?'}
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5 whitespace-nowrap">
                            <span>{strip.intExt || 'INT'}</span>
                            <span aria-hidden="true">/</span>
                            {strip.dayNight === 'NIGHT' ? (
                              <Moon className="w-3 h-3 inline" />
                            ) : (
                              <Sun className="w-3 h-3 inline text-amber-800" />
                            )}
                            <span>{strip.dayNight || 'DAY'}</span>
                          </div>
                          <div className="col-span-4 truncate pr-2 font-bold">
                            {strip.set || 'MAIN SET'}
                          </div>
                          <div className="col-span-1 font-mono tabular-nums">
                            {strip.pages || '1'}
                          </div>
                          <div className="col-span-3 truncate pr-2 font-normal text-[11px]">
                            {allCast.length === 0 ? (
                              <span className="opacity-70">NO CAST</span>
                            ) : (
                              allCast
                                .map((c) => (voSet.has(c) ? `${c} (V.O.)` : c))
                                .join(' · ')
                            )}
                          </div>
                          <div className="col-span-1 text-right font-mono tabular-nums text-[11px]">
                            {strip.timeOfDay || '08:30'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : activeTab === 'cast_dod' ? (
                <div className="border border-[#323232] rounded overflow-x-auto bg-[#171717]">
                  {afterMetrics.characterDodMatrix.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400">
                      No speaking cast or V.O. characters tagged on these strips yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#222222] border-b border-[#333333] text-[11px] text-gray-400">
                          <th className="py-2.5 px-3 font-semibold">Character</th>
                          <th className="py-2.5 px-3 font-semibold text-right font-mono tabular-nums">
                            Work Days
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right font-mono tabular-nums">
                            Before Span
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right font-mono tabular-nums">
                            After Span
                          </th>
                          {Array.from({ length: maxDaysInDod }, (_, i) => i + 1).map(
                            (dayNum) => (
                              <th
                                key={dayNum}
                                className="py-2.5 px-2 text-center font-mono tabular-nums font-semibold"
                              >
                                D{dayNum}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#282828]">
                        {afterMetrics.characterDodMatrix.map((row) => {
                          const spanDelta = row.beforeSpan - row.afterSpan;
                          const minAfter =
                            row.afterDays.length > 0 ? row.afterDays[0] : 0;
                          const maxAfter =
                            row.afterDays.length > 0
                              ? row.afterDays[row.afterDays.length - 1]
                              : 0;
                          return (
                            <tr key={row.character} className="hover:bg-[#1e1e1e]">
                              <td className="py-2 px-3 font-medium text-gray-200 whitespace-nowrap">
                                {row.character}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-gray-300">
                                {row.workDaysCount}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-gray-400">
                                {row.beforeSpan}d
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                <span className="text-white font-semibold">
                                  {row.afterSpan}d
                                </span>
                                {spanDelta > 0 && (
                                  <span className="ml-1.5 text-emerald-400 text-[11px]">
                                    (-{spanDelta}d)
                                  </span>
                                )}
                              </td>
                              {Array.from(
                                { length: maxDaysInDod },
                                (_, i) => i + 1
                              ).map((dayNum) => {
                                const isWork = row.afterDays.includes(dayNum);
                                const isHold =
                                  !isWork &&
                                  minAfter > 0 &&
                                  dayNum > minAfter &&
                                  dayNum < maxAfter;
                                return (
                                  <td
                                    key={dayNum}
                                    className={`py-2 px-2 text-center font-mono text-[11px] font-semibold ${
                                      isWork
                                        ? 'text-emerald-300 bg-emerald-950/40'
                                        : isHold
                                        ? 'text-amber-300 bg-amber-950/30'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {isWork ? 'W' : isHold ? 'H' : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="border border-[#323232] rounded overflow-x-auto bg-[#171717]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#222222] border-b border-[#333333] text-[11px] text-gray-400">
                        <th className="py-2.5 px-3 font-semibold">Scene</th>
                        <th className="py-2.5 px-3 font-semibold">Set / Location</th>
                        <th className="py-2.5 px-3 font-semibold font-mono tabular-nums">
                          Before
                        </th>
                        <th className="py-2.5 px-3 font-semibold font-mono tabular-nums">
                          Optimized
                        </th>
                        <th className="py-2.5 px-3 font-semibold">
                          Scheduling Rationale
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#282828]">
                      {result.sceneChanges.map((item) => (
                        <tr key={item.sceneId} className="hover:bg-[#1e1e1e]">
                          <td className="py-2 px-3 font-mono tabular-nums text-white whitespace-nowrap">
                            #{item.sceneNumber} · {item.pages}p
                          </td>
                          <td className="py-2 px-3 text-gray-200">
                            <div className="font-medium truncate max-w-[230px]">
                              {item.set}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {item.intExt} / {item.dayNight}
                              {item.characters.length > 0
                                ? ` · ${item.characters.slice(0, 3).join(', ')}`
                                : ''}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-gray-400 whitespace-nowrap">
                            Day {item.beforeDay} · #{item.beforePosition}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                            <span
                              className={
                                item.moved
                                  ? 'text-[#ff8c1a] font-semibold'
                                  : 'text-gray-300'
                              }
                            >
                              Day {item.afterDay} · #{item.afterPosition}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-300 text-[11px]">
                            {item.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#222222] border-t border-[#363636] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-gray-400">
            Applying updates Stripboard sequence, Day Breaks, and Call Times. Original screenplay scene numbers remain unchanged.
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-200 text-xs font-medium rounded border border-[#444444] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!hasEnoughScenes}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                hasEnoughScenes
                  ? 'bg-[#ff7700] hover:bg-[#ff8c1a] text-black'
                  : 'bg-[#333333] text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Optimized Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
