import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  CastCrewMember,
  Scene,
  StripboardStrip,
} from '../types/story';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  ArrowRight,
  SlidersHorizontal,
  ShieldAlert,
} from 'lucide-react';

export interface SceneConflict {
  id: string;
  sceneId: string;
  sceneNumber: number;
  sceneHeading: string;
  dayLabel: string;
  shootTime?: string;
  severity: 'high' | 'medium';
  category:
    | 'Availability Clash'
    | 'Call / Wrap Window Mismatch'
    | 'Shooting Day Unscheduled'
    | 'Unassigned Script Cast';
  neededCount: number;
  confirmedCount: number;
  summary: string;
  affectedMembers: {
    id: string;
    name: string;
    role: string;
    issue: string;
  }[];
}

interface CrewAvailabilityChartProps {
  members: CastCrewMember[];
  scenes: Scene[];
  strips: StripboardStrip[];
  onSelectMember: (memberId: string) => void;
  onEditMember: (member: CastCrewMember) => void;
  onSelectScene: (sceneId: string) => void;
}

const parseMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

// Normalize day keys like "Day 1 (Nov 10)" -> "day 1" for resilient matching with stripboard day breaks
const normalizeDayNum = (label: string): string | null => {
  const m = label.match(/day\s*(\d+)/i);
  return m ? `day-${m[1]}` : null;
};

export const analyzeScheduleConflicts = (
  members: CastCrewMember[],
  scenes: Scene[],
  strips: StripboardStrip[]
): {
  timelineDays: {
    dayKey: string;
    dayLabel: string;
    dateText: string;
    sceneIds: string[];
    confirmed: number;
    tentative: number;
    onHold: number;
    neededForScenes: number;
    conflictsCount: number;
    memberStatuses: { member: CastCrewMember; state: 'Confirmed' | 'Tentative' | 'On Hold' | 'Wrapped' | 'Off'; hasConflict: boolean }[];
  }[];
  sceneData: {
    sceneId: string;
    label: string;
    heading: string;
    dayLabel: string;
    shootTime?: string;
    confirmed: number;
    tentative: number;
    conflictMembers: number;
    totalNeeded: number;
    hasConflict: boolean;
  }[];
  conflicts: SceneConflict[];
} => {
  // 1. Extract timeline days from stripboard day_break banners + member scheduledDays
  const dayBuckets: {
    dayKey: string;
    dayLabel: string;
    dateText: string;
    sceneIds: string[];
  }[] = [];

  let currentBucket: (typeof dayBuckets)[number] | null = null;
  let dayIdx = 1;

  strips.forEach((strip) => {
    if (strip.type === 'day_break') {
      const dateShort = strip.bannerDate
        ? strip.bannerDate.replace(/^[^,]+,\s*/, '').slice(0, 6)
        : '';
      const label = dateShort ? `Day ${dayIdx} (${dateShort})` : `Day ${dayIdx}`;
      currentBucket = {
        dayKey: `day-${dayIdx}`,
        dayLabel: label,
        dateText: strip.bannerDate || `Shooting Day ${dayIdx}`,
        sceneIds: [],
      };
      dayBuckets.push(currentBucket);
      dayIdx++;
    } else if (strip.type === 'scene' && strip.sceneId) {
      if (!currentBucket) {
        currentBucket = {
          dayKey: `day-${dayIdx}`,
          dayLabel: `Day ${dayIdx}`,
          dateText: `Shooting Day ${dayIdx}`,
          sceneIds: [],
        };
        dayBuckets.push(currentBucket);
        dayIdx++;
      }
      if (!currentBucket.sceneIds.includes(strip.sceneId)) {
        currentBucket.sceneIds.push(strip.sceneId);
      }
    }
  });

  // Add any custom days mentioned in members' scheduledDays that aren't represented yet
  members.forEach((m) => {
    m.scheduledDays.forEach((d) => {
      const norm = normalizeDayNum(d);
      const exists = dayBuckets.some(
        (b) => b.dayLabel.toLowerCase() === d.toLowerCase() || (norm && b.dayKey === norm)
      );
      if (!exists) {
        dayBuckets.push({
          dayKey: norm || d.toLowerCase(),
          dayLabel: d,
          dateText: d,
          sceneIds: [],
        });
      }
    });
  });

  if (dayBuckets.length === 0) {
    dayBuckets.push(
      { dayKey: 'day-1', dayLabel: 'Day 1', dateText: 'Shooting Day 1', sceneIds: scenes.slice(0, 3).map((s) => s.id) },
      { dayKey: 'day-2', dayLabel: 'Day 2', dateText: 'Shooting Day 2', sceneIds: scenes.slice(3).map((s) => s.id) }
    );
  }

  // Helper: check if member is scheduled on a dayBucket
  const isMemberScheduledOnDay = (m: CastCrewMember, bucket: (typeof dayBuckets)[number]) => {
    return m.scheduledDays.some((sd) => {
      if (sd.toLowerCase() === bucket.dayLabel.toLowerCase()) return true;
      const normSd = normalizeDayNum(sd);
      return Boolean(normSd && normSd === bucket.dayKey);
    });
  };

  // Map sceneId -> strip info (dayLabel, timeOfDay)
  const sceneScheduleMap = new Map<string, { dayKey: string; dayLabel: string; timeOfDay?: string }>();
  dayBuckets.forEach((bucket) => {
    bucket.sceneIds.forEach((scId) => {
      const strip = strips.find((s) => s.type === 'scene' && s.sceneId === scId);
      sceneScheduleMap.set(scId, {
        dayKey: bucket.dayKey,
        dayLabel: bucket.dayLabel,
        timeOfDay: strip?.timeOfDay,
      });
    });
  });

  // 2. Analyze every scene for multi-member conflicts
  const conflicts: SceneConflict[] = [];
  const conflictingMemberIdsByDay = new Map<string, Set<string>>();

  const markMemberDayConflict = (dayKey: string, memberId: string) => {
    if (!conflictingMemberIdsByDay.has(dayKey)) {
      conflictingMemberIdsByDay.set(dayKey, new Set());
    }
    conflictingMemberIdsByDay.get(dayKey)!.add(memberId);
  };

  const sceneData = scenes.map((scene) => {
    const linkedMembers = members.filter((m) => m.linkedSceneIds.includes(scene.id));
    const sched = sceneScheduleMap.get(scene.id);
    const dayLabel = sched?.dayLabel || (scene.shootingStartDate ? `Date ${scene.shootingStartDate}` : 'Unscheduled');
    const shootMins = parseMinutes(sched?.timeOfDay || scene.timeOfDay);

    // Check unassigned script characters for this scene
    const unassignedChars = scene.characters.filter(
      (charName) =>
        !members.some(
          (m) =>
            m.characterName &&
            m.characterName.trim().toUpperCase() === charName.trim().toUpperCase()
        )
    );

    const totalNeeded = linkedMembers.length + unassignedChars.length;
    let confirmed = 0;
    let tentative = 0;
    let conflictMembers = 0;

    const availabilityIssues: SceneConflict['affectedMembers'] = [];
    const windowIssues: SceneConflict['affectedMembers'] = [];
    const dayGapIssues: SceneConflict['affectedMembers'] = [];

    linkedMembers.forEach((m) => {
      let memberHasSceneIssue = false;

      if (m.availabilityStatus === 'Tentative') {
        tentative++;
        if (linkedMembers.length >= 2) {
          availabilityIssues.push({
            id: m.id,
            name: m.name,
            role: m.role,
            issue: `Status is Tentative (${m.paymentStatus})`,
          });
          memberHasSceneIssue = true;
        }
      } else if (m.availabilityStatus === 'On Hold' || m.availabilityStatus === 'Wrapped') {
        conflictMembers++;
        if (linkedMembers.length >= 2) {
          availabilityIssues.push({
            id: m.id,
            name: m.name,
            role: m.role,
            issue: `Marked ${m.availabilityStatus}`,
          });
          memberHasSceneIssue = true;
        }
      } else {
        // Confirmed status — check day coverage and call/wrap time overlap
        if (sched) {
          const bucket = dayBuckets.find((b) => b.dayKey === sched.dayKey);
          if (bucket && !isMemberScheduledOnDay(m, bucket)) {
            dayGapIssues.push({
              id: m.id,
              name: m.name,
              role: m.role,
              issue: `Not scheduled on ${bucket.dayLabel}`,
            });
            memberHasSceneIssue = true;
          }
        }

        // Check if scene shoot time falls outside call/wrap window (especially night shoots vs hard-out wrap)
        if (shootMins !== null) {
          const callMins = parseMinutes(m.callTime);
          const wrapMins = parseMinutes(m.wrapTime);
          if (callMins !== null && wrapMins !== null && wrapMins > callMins) {
            if (shootMins > wrapMins || shootMins < callMins) {
              windowIssues.push({
                id: m.id,
                name: m.name,
                role: m.role,
                issue: `Call/Wrap ${m.callTime}–${m.wrapTime} misses ${sched?.timeOfDay || scene.timeOfDay} shoot`,
              });
              memberHasSceneIssue = true;
            }
          }
        }

        if (memberHasSceneIssue) {
          conflictMembers++;
        } else {
          confirmed++;
        }
      }

      if (memberHasSceneIssue && sched) {
        markMemberDayConflict(sched.dayKey, m.id);
      }
    });

    // Only flag scene conflicts when multiple members are needed for the same scene
    if (totalNeeded >= 2) {
      if (availabilityIssues.length > 0) {
        conflicts.push({
          id: `conf-avail-${scene.id}`,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          sceneHeading: scene.heading,
          dayLabel,
          shootTime: sched?.timeOfDay,
          severity: availabilityIssues.some((a) => a.issue.includes('On Hold')) ? 'high' : 'medium',
          category: 'Availability Clash',
          neededCount: totalNeeded,
          confirmedCount: confirmed,
          summary: `${totalNeeded} members required for Scene ${scene.sceneNumber}, but ${availabilityIssues.length} ${
            availabilityIssues.length === 1 ? 'is' : 'are'
          } not confirmed.`,
          affectedMembers: availabilityIssues,
        });
      }

      if (windowIssues.length > 0) {
        conflicts.push({
          id: `conf-win-${scene.id}`,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          sceneHeading: scene.heading,
          dayLabel,
          shootTime: sched?.timeOfDay,
          severity: 'high',
          category: 'Call / Wrap Window Mismatch',
          neededCount: totalNeeded,
          confirmedCount: confirmed,
          summary: `Call/wrap window conflict among ${totalNeeded} members needed for Scene ${scene.sceneNumber} (${sched?.timeOfDay || scene.timeOfDay} shoot).`,
          affectedMembers: windowIssues,
        });
      }

      if (dayGapIssues.length > 0) {
        conflicts.push({
          id: `conf-day-${scene.id}`,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          sceneHeading: scene.heading,
          dayLabel,
          shootTime: sched?.timeOfDay,
          severity: 'high',
          category: 'Shooting Day Unscheduled',
          neededCount: totalNeeded,
          confirmedCount: confirmed,
          summary: `Scene ${scene.sceneNumber} is scheduled on ${dayLabel}, but ${dayGapIssues.length} assigned member(s) are off that day.`,
          affectedMembers: dayGapIssues,
        });
      }

      if (unassignedChars.length > 0 && linkedMembers.length >= 1) {
        conflictMembers += unassignedChars.length;
        conflicts.push({
          id: `conf-cast-${scene.id}`,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          sceneHeading: scene.heading,
          dayLabel,
          shootTime: sched?.timeOfDay,
          severity: 'medium',
          category: 'Unassigned Script Cast',
          neededCount: totalNeeded,
          confirmedCount: confirmed,
          summary: `Scene ${scene.sceneNumber} calls for ${totalNeeded} total roles, with ${unassignedChars.join(', ')} missing from Address Book.`,
          affectedMembers: linkedMembers.slice(0, 2).map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            issue: `Waiting on ${unassignedChars.join(', ')}`,
          })),
        });
      }
    }

    return {
      sceneId: scene.id,
      label: `Sc. ${scene.sceneNumber}`,
      heading: scene.heading,
      dayLabel,
      shootTime: sched?.timeOfDay,
      confirmed,
      tentative,
      conflictMembers,
      totalNeeded,
      hasConflict:
        availabilityIssues.length > 0 ||
        windowIssues.length > 0 ||
        dayGapIssues.length > 0 ||
        (unassignedChars.length > 0 && totalNeeded >= 2),
    };
  });

  // 3. Build timelineDays summary for Recharts timeline
  const timelineDays = dayBuckets.map((bucket) => {
    let confirmed = 0;
    let tentative = 0;
    let onHold = 0;

    const neededSet = new Set<string>();
    bucket.sceneIds.forEach((scId) => {
      members.forEach((m) => {
        if (m.linkedSceneIds.includes(scId)) {
          neededSet.add(m.id);
        }
      });
    });

    const dayConflicts = conflicts.filter((c) => c.dayLabel === bucket.dayLabel);
    const conflictIdsForDay = conflictingMemberIdsByDay.get(bucket.dayKey) || new Set<string>();

    const memberStatuses = members.map((m) => {
      const scheduled = isMemberScheduledOnDay(m, bucket);
      const hasConflict = conflictIdsForDay.has(m.id);
      if (!scheduled) {
        return { member: m, state: 'Off' as const, hasConflict };
      }
      if (m.availabilityStatus === 'Confirmed') {
        confirmed++;
      } else if (m.availabilityStatus === 'Tentative') {
        tentative++;
      } else {
        onHold++;
      }
      return { member: m, state: m.availabilityStatus, hasConflict };
    });

    return {
      dayKey: bucket.dayKey,
      dayLabel: bucket.dayLabel,
      dateText: bucket.dateText,
      sceneIds: bucket.sceneIds,
      confirmed,
      tentative,
      onHold,
      neededForScenes: neededSet.size,
      conflictsCount: dayConflicts.length,
      memberStatuses,
    };
  });

  return { timelineDays, sceneData, conflicts };
};

export const CrewAvailabilityChart: React.FC<CrewAvailabilityChartProps> = ({
  members,
  scenes,
  strips,
  onSelectMember,
  onEditMember,
  onSelectScene,
}) => {
  const [chartMode, setChartMode] = useState<'timeline' | 'scenes'>('timeline');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cast' | 'crew'>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  const filteredMembers = useMemo(() => {
    if (categoryFilter === 'all') return members;
    return members.filter((m) => m.category === categoryFilter);
  }, [members, categoryFilter]);

  const { timelineDays, sceneData, conflicts } = useMemo(
    () => analyzeScheduleConflicts(filteredMembers, scenes, strips),
    [filteredMembers, scenes, strips]
  );

  const visibleConflicts = useMemo(() => {
    if (selectedDayFilter === 'all') return conflicts;
    return conflicts.filter((c) => c.dayLabel === selectedDayFilter);
  }, [conflicts, selectedDayFilter]);

  if (members.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <Users className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-sm font-semibold text-gray-200">No Cast or Crew Scheduled</p>
        <p className="text-xs text-gray-500 mt-1 max-w-md">
          Add cast and crew members in the Address Book to visualize availability across shooting days and detect scene-level scheduling conflicts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#1b1b1b] p-4 space-y-5 text-xs">
      {/* Top Controls & Conflict Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#222222] border border-[#353535] rounded p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center p-0.5 bg-[#161616] rounded border border-[#383838]">
            <button
              onClick={() => setChartMode('timeline')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                chartMode === 'timeline'
                  ? 'bg-[#2f2f2f] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Project Timeline (By Shooting Day)
            </button>
            <button
              onClick={() => setChartMode('scenes')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                chartMode === 'scenes'
                  ? 'bg-[#2f2f2f] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Scene Demand & Conflicts ({scenes.length} Scenes)
            </button>
          </div>

          <div className="flex items-center p-0.5 bg-[#161616] rounded border border-[#383838]">
            {(['all', 'cast', 'crew'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[#2f2f2f] text-gray-100'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {cat === 'all' ? 'All Unit' : cat === 'cast' ? 'Cast Only' : 'Crew Only'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs tabular-nums">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{timelineDays.length} Shooting Days</span>
          </div>
          <span className="text-gray-600">|</span>
          {conflicts.length > 0 ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{conflicts.length} Multi-Member Scene Conflict{conflicts.length === 1 ? '' : 's'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Scene Conflicts</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Recharts Visualization Card */}
      <div className="bg-[#222222] border border-[#353535] rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-100">
              {chartMode === 'timeline'
                ? 'Cast & Crew Availability Across Project Timeline'
                : 'Scene Coverage Readiness & Multi-Member Conflicts'}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {chartMode === 'timeline'
                ? 'Stacked availability status per shooting day compared against total members required for that day’s scenes.'
                : 'Number of required members per scene grouped by Confirmed, Tentative, or Conflict (window clash, hold, or unscheduled day).'}
            </p>
          </div>
        </div>

        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'timeline' ? (
              <ComposedChart
                data={timelineDays}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis
                  dataKey="dayLabel"
                  stroke="#9ca3af"
                  tick={{ fill: '#d1d5db', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  label={{
                    value: 'Members',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9ca3af',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161616',
                    borderColor: '#444444',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#f3f4f6',
                  }}
                  formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
                  labelFormatter={(label) => `Timeline: ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                <Bar
                  dataKey="confirmed"
                  name="Confirmed Available"
                  stackId="avail"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  barSize={42}
                />
                <Bar
                  dataKey="tentative"
                  name="Tentative"
                  stackId="avail"
                  fill="#f59e0b"
                  barSize={42}
                />
                <Bar
                  dataKey="onHold"
                  name="On Hold / Unavailable"
                  stackId="avail"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={42}
                />
                <Line
                  type="monotone"
                  dataKey="neededForScenes"
                  name="Required for Day's Scenes"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38bdf8', strokeWidth: 1.5, stroke: '#161616' }}
                />
                <Line
                  type="monotone"
                  dataKey="conflictsCount"
                  name="Flagged Scene Conflicts"
                  stroke="#fb7185"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: '#fb7185' }}
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={sceneData}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis
                  dataKey="label"
                  stroke="#9ca3af"
                  tick={{ fill: '#d1d5db', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  label={{
                    value: 'Needed Members',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9ca3af',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161616',
                    borderColor: '#444444',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#f3f4f6',
                  }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${label}: ${row.heading} (${row.dayLabel})` : String(label);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="confirmed"
                  name="Confirmed & Ready"
                  stackId="scene"
                  fill="#10b981"
                  barSize={32}
                />
                <Bar
                  dataKey="tentative"
                  name="Tentative"
                  stackId="scene"
                  fill="#f59e0b"
                  barSize={32}
                />
                <Bar
                  dataKey="conflictMembers"
                  name="Conflict / Window Clash / Missing"
                  stackId="scene"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                >
                  {sceneData.map((entry) => (
                    <Cell
                      key={entry.sceneId}
                      fill={entry.hasConflict ? '#ef4444' : '#7f1d1d'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Split: Flagged Multi-Member Scene Conflicts + Member Availability Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Flagged Scene Conflicts Panel */}
        <div className="xl:col-span-5 bg-[#222222] border border-[#353535] rounded flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#1d1d1d] border-b border-[#333333] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h4 className="font-semibold text-gray-100 text-xs">
                Flagged Scene Conflicts ({visibleConflicts.length})
              </h4>
            </div>
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="bg-[#151515] text-gray-200 px-2 py-1 rounded border border-[#3a3a3a] text-[11px] focus:outline-none focus:border-[#ff8000]"
            >
              <option value="all">All Days</option>
              {timelineDays.map((d) => (
                <option key={d.dayKey} value={d.dayLabel}>
                  {d.dayLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-[#2e2e2e] max-h-[340px] overflow-y-auto">
            {visibleConflicts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 space-y-1.5">
                <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-400" />
                <p className="font-medium text-gray-200">No multi-member scene conflicts</p>
                <p className="text-[11px] text-gray-500">
                  All assigned cast and crew are confirmed and aligned with call windows.
                </p>
              </div>
            ) : (
              visibleConflicts.map((conf) => (
                <div key={conf.id} className="p-3.5 space-y-2 hover:bg-[#272727] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-semibold">
                        <span
                          className={
                            conf.severity === 'high' ? 'text-rose-400' : 'text-amber-400'
                          }
                        >
                          {conf.category}
                        </span>
                        <span aria-hidden="true" className="text-gray-600">·</span>
                        <span className="text-gray-300 font-mono tabular-nums">
                          {conf.dayLabel}
                          {conf.shootTime ? ` @ ${conf.shootTime}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectScene(conf.sceneId)}
                        className="text-left text-xs font-semibold text-gray-100 hover:text-[#ff8000] mt-0.5 truncate block max-w-full"
                      >
                        Scene {conf.sceneNumber} — {conf.sceneHeading}
                      </button>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-gray-400 whitespace-nowrap shrink-0">
                      {conf.confirmedCount}/{conf.neededCount} ready
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    {conf.summary}
                  </p>

                  <div className="space-y-1 pt-1">
                    {conf.affectedMembers.map((am) => {
                      const fullMember = members.find((m) => m.id === am.id);
                      return (
                        <div
                          key={am.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#191919] rounded border border-[#323232] text-[11px]"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-200">{am.name}</span>
                            <span className="text-gray-500"> · {am.issue}</span>
                          </div>
                          {fullMember && (
                            <button
                              onClick={() => onEditMember(fullMember)}
                              className="text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap shrink-0 flex items-center gap-1"
                            >
                              <span>Resolve</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Member × Shooting Day Availability Matrix */}
        <div className="xl:col-span-7 bg-[#222222] border border-[#353535] rounded flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#1d1d1d] border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <h4 className="font-semibold text-gray-100 text-xs">
                Unit Availability Matrix Across Timeline
              </h4>
            </div>
            <span className="text-[11px] text-gray-400">
              Click a member to open profile
            </span>
          </div>

          <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#191919] border-b border-[#333333] text-[11px] text-gray-400">
                <tr>
                  <th className="py-2 px-3">Cast / Crew Member</th>
                  <th className="py-2 px-3">Call Window</th>
                  {timelineDays.map((day) => (
                    <th key={day.dayKey} className="py-2 px-3 text-center whitespace-nowrap">
                      {day.dayLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d]">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => onSelectMember(member.id)}
                    className="hover:bg-[#292929] cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3">
                      <div className="font-semibold text-gray-100">{member.name}</div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[190px]">
                        {member.role}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-[11px] text-gray-300 whitespace-nowrap">
                      {member.callTime || '07:00'}–{member.wrapTime || '19:00'}
                    </td>
                    {timelineDays.map((day) => {
                      const statusEntry = day.memberStatuses.find(
                        (ms) => ms.member.id === member.id
                      );
                      const state = statusEntry?.state || 'Off';
                      const hasConflict = statusEntry?.hasConflict || false;

                      return (
                        <td key={day.dayKey} className="py-2 px-3 text-center whitespace-nowrap">
                          {state === 'Off' ? (
                            <span className="text-[11px] text-gray-500">Off</span>
                          ) : (
                            <span
                              className={`inline-flex items-center justify-center gap-1 text-[11px] font-medium ${
                                hasConflict
                                  ? 'text-rose-400 font-semibold'
                                  : state === 'Confirmed'
                                  ? 'text-emerald-400'
                                  : state === 'Tentative'
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                              title={
                                hasConflict
                                  ? 'Conflict detected on a scene scheduled this day'
                                  : `${state} on ${day.dayLabel}`
                              }
                            >
                              {hasConflict && <AlertTriangle className="w-3 h-3 shrink-0" />}
                              <span>{state}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
