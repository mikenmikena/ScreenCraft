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
} from 'recharts';
import {
  CastCrewMember,
  CrewDepartment,
  Scene,
  StripboardStrip,
} from '../types/story';
import {
  DollarSign,
  Download,
  Edit3,
  Search,
  X,
  TrendingUp,
  Layers,
  Users,
  Calendar,
} from 'lucide-react';

export interface MemberBudgetLine {
  member: CastCrewMember;
  scheduledDayCount: number;
  shiftHours: number;
  weeksCount: number;
  laborTotal: number;
  kitTotal: number;
  totalCost: number;
  dailyAmortizedLabor: number;
  dailyAmortizedTotal: number;
  rateUnitLabel: string;
}

export interface DayBudgetPoint {
  dayKey: string;
  dayLabel: string;
  dateText: string;
  activeMembers: number;
  castLabor: number;
  crewLabor: number;
  kitFees: number;
  dailySpend: number;
  cumulativeTotal: number;
}

export interface DepartmentBudgetSummary {
  department: CrewDepartment;
  headcount: number;
  personDays: number;
  laborTotal: number;
  kitTotal: number;
  totalCost: number;
  sharePct: number;
}

export interface ProductionBudgetSummary {
  lines: MemberBudgetLine[];
  dayTimeline: DayBudgetPoint[];
  departments: DepartmentBudgetSummary[];
  totalLabor: number;
  totalKit: number;
  grandTotal: number;
  castTotal: number;
  crewTotal: number;
  approvedTotal: number;
  pendingTotal: number;
  totalPersonDays: number;
  unscheduledFlatTotal: number;
  shootingDaysCount: number;
  avgDailyBurn: number;
}

const parseMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

export const calculateShiftHours = (callTime?: string, wrapTime?: string): number => {
  const callMins = parseMinutes(callTime);
  const wrapMins = parseMinutes(wrapTime);
  if (callMins === null || wrapMins === null) return 10;
  let diff = wrapMins - callMins;
  if (diff <= 0) diff += 24 * 60;
  return Math.max(1, Math.round((diff / 60) * 10) / 10);
};

const normalizeDayNum = (label: string): string | null => {
  const m = label.match(/day\s*(\d+)/i);
  return m ? `day-${m[1]}` : null;
};

export const estimateMemberBudgetLine = (member: CastCrewMember): MemberBudgetLine => {
  const scheduledDayCount = member.scheduledDays.length;
  const shiftHours = calculateShiftHours(member.callTime, member.wrapTime);
  const weeksCount = scheduledDayCount === 0 ? 0 : Math.max(1, Math.ceil(scheduledDayCount / 5));
  const dailyKit = member.kitFee || 0;
  const kitTotal = dailyKit * scheduledDayCount;

  let laborTotal = 0;
  let rateUnitLabel = 'day';

  if (member.payBasis === 'Daily') {
    laborTotal = member.payRate * scheduledDayCount;
    rateUnitLabel = 'day';
  } else if (member.payBasis === 'Hourly') {
    laborTotal = member.payRate * shiftHours * scheduledDayCount;
    rateUnitLabel = `hr (${shiftHours}h/d)`;
  } else if (member.payBasis === 'Weekly') {
    laborTotal = member.payRate * weeksCount;
    rateUnitLabel = 'wk';
  } else {
    // Flat / Project deal memo
    laborTotal = member.payRate;
    rateUnitLabel = 'flat';
  }

  const totalCost = Math.round(laborTotal + kitTotal);
  const dailyAmortizedLabor =
    scheduledDayCount > 0 ? laborTotal / scheduledDayCount : 0;
  const dailyAmortizedTotal =
    scheduledDayCount > 0 ? dailyAmortizedLabor + dailyKit : 0;

  return {
    member,
    scheduledDayCount,
    shiftHours,
    weeksCount,
    laborTotal: Math.round(laborTotal),
    kitTotal: Math.round(kitTotal),
    totalCost,
    dailyAmortizedLabor,
    dailyAmortizedTotal,
    rateUnitLabel,
  };
};

export const calculateProductionBudget = (
  members: CastCrewMember[],
  strips: StripboardStrip[]
): ProductionBudgetSummary => {
  const lines = members.map(estimateMemberBudgetLine);

  // Build ordered shooting days from stripboard day_break banners + any custom scheduledDays
  const dayBuckets: { dayKey: string; dayLabel: string; dateText: string }[] = [];
  let dayIdx = 1;

  strips.forEach((s) => {
    if (s.type === 'day_break') {
      const dateShort = s.bannerDate
        ? s.bannerDate.replace(/^[^,]+,\s*/, '').slice(0, 6)
        : '';
      const label = dateShort ? `Day ${dayIdx} (${dateShort})` : `Day ${dayIdx}`;
      dayBuckets.push({
        dayKey: `day-${dayIdx}`,
        dayLabel: label,
        dateText: s.bannerDate || `Shooting Day ${dayIdx}`,
      });
      dayIdx++;
    }
  });

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
        });
      }
    });
  });

  if (dayBuckets.length === 0) {
    dayBuckets.push({ dayKey: 'day-1', dayLabel: 'Day 1', dateText: 'Shooting Day 1' });
  }

  const isScheduledOnBucket = (m: CastCrewMember, bucket: { dayKey: string; dayLabel: string }) => {
    return m.scheduledDays.some((sd) => {
      if (sd.toLowerCase() === bucket.dayLabel.toLowerCase()) return true;
      const normSd = normalizeDayNum(sd);
      return Boolean(normSd && normSd === bucket.dayKey);
    });
  };

  let unscheduledFlatTotal = 0;
  lines.forEach((line) => {
    if (line.scheduledDayCount === 0 && line.totalCost > 0) {
      unscheduledFlatTotal += line.totalCost;
    }
  });

  let runningCumulative = unscheduledFlatTotal;
  const dayTimeline: DayBudgetPoint[] = dayBuckets.map((bucket) => {
    let castLabor = 0;
    let crewLabor = 0;
    let kitFees = 0;
    let activeMembers = 0;

    lines.forEach((line) => {
      if (isScheduledOnBucket(line.member, bucket)) {
        activeMembers++;
        if (line.member.category === 'cast') {
          castLabor += line.dailyAmortizedLabor;
        } else {
          crewLabor += line.dailyAmortizedLabor;
        }
        kitFees += line.member.kitFee || 0;
      }
    });

    const castLaborRounded = Math.round(castLabor);
    const crewLaborRounded = Math.round(crewLabor);
    const kitFeesRounded = Math.round(kitFees);
    const dailySpend = castLaborRounded + crewLaborRounded + kitFeesRounded;
    runningCumulative += dailySpend;

    return {
      dayKey: bucket.dayKey,
      dayLabel: bucket.dayLabel,
      dateText: bucket.dateText,
      activeMembers,
      castLabor: castLaborRounded,
      crewLabor: crewLaborRounded,
      kitFees: kitFeesRounded,
      dailySpend,
      cumulativeTotal: runningCumulative,
    };
  });

  let totalLabor = 0;
  let totalKit = 0;
  let grandTotal = 0;
  let castTotal = 0;
  let crewTotal = 0;
  let approvedTotal = 0;
  let pendingTotal = 0;
  let totalPersonDays = 0;

  const deptMap = new Map<
    CrewDepartment,
    { headcount: number; personDays: number; laborTotal: number; kitTotal: number; totalCost: number }
  >();

  lines.forEach((line) => {
    totalLabor += line.laborTotal;
    totalKit += line.kitTotal;
    grandTotal += line.totalCost;
    totalPersonDays += line.scheduledDayCount;

    if (line.member.category === 'cast') {
      castTotal += line.totalCost;
    } else {
      crewTotal += line.totalCost;
    }

    if (line.member.paymentStatus === 'Approved') {
      approvedTotal += line.totalCost;
    } else {
      pendingTotal += line.totalCost;
    }

    const existing = deptMap.get(line.member.department) || {
      headcount: 0,
      personDays: 0,
      laborTotal: 0,
      kitTotal: 0,
      totalCost: 0,
    };
    existing.headcount += 1;
    existing.personDays += line.scheduledDayCount;
    existing.laborTotal += line.laborTotal;
    existing.kitTotal += line.kitTotal;
    existing.totalCost += line.totalCost;
    deptMap.set(line.member.department, existing);
  });

  const departments: DepartmentBudgetSummary[] = Array.from(deptMap.entries())
    .map(([department, stats]) => ({
      department,
      ...stats,
      sharePct: grandTotal > 0 ? Math.round((stats.totalCost / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const shootingDaysCount = dayBuckets.length;
  const avgDailyBurn = shootingDaysCount > 0 ? Math.round(grandTotal / shootingDaysCount) : 0;

  return {
    lines,
    dayTimeline,
    departments,
    totalLabor,
    totalKit,
    grandTotal,
    castTotal,
    crewTotal,
    approvedTotal,
    pendingTotal,
    totalPersonDays,
    unscheduledFlatTotal,
    shootingDaysCount,
    avgDailyBurn,
  };
};

interface ProductionBudgetPanelProps {
  members: CastCrewMember[];
  scenes: Scene[];
  strips: StripboardStrip[];
  onEditMember: (member: CastCrewMember) => void;
  onSelectMember: (memberId: string) => void;
  onAddMember: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseSceneBudgetSum = (scenes: Scene[]): number => {
  return scenes.reduce((sum, sc) => {
    const numeric = Number(String(sc.budget || '').replace(/[^0-9.]/g, ''));
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
};

export const ProductionBudgetPanel: React.FC<ProductionBudgetPanelProps> = ({
  members,
  scenes,
  strips,
  onEditMember,
  onSelectMember,
  onAddMember,
}) => {
  const [chartView, setChartView] = useState<'running' | 'departments'>('running');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cast' | 'crew'>('all');
  const [dealFilter, setDealFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost_desc' | 'name' | 'department' | 'days_desc'>('cost_desc');
  const [contingencyPct, setContingencyPct] = useState<number>(10);

  const sceneBudgetBaseline = useMemo(() => parseSceneBudgetSum(scenes), [scenes]);
  const [budgetCapInput, setBudgetCapInput] = useState<string>('');

  const effectiveMembers = useMemo(() => {
    return members.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (dealFilter === 'approved' && m.paymentStatus !== 'Approved') return false;
      if (dealFilter === 'pending' && m.paymentStatus === 'Approved') return false;
      return true;
    });
  }, [members, categoryFilter, dealFilter]);

  const budget = useMemo(
    () => calculateProductionBudget(effectiveMembers, strips),
    [effectiveMembers, strips]
  );

  const visibleLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = budget.lines.filter((line) => {
      if (!q) return true;
      return (
        line.member.name.toLowerCase().includes(q) ||
        line.member.role.toLowerCase().includes(q) ||
        line.member.department.toLowerCase().includes(q) ||
        line.member.payBasis.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'cost_desc') return b.totalCost - a.totalCost;
      if (sortBy === 'name') return a.member.name.localeCompare(b.member.name);
      if (sortBy === 'department') return a.member.department.localeCompare(b.member.department);
      return b.scheduledDayCount - a.scheduledDayCount;
    });
  }, [budget.lines, searchQuery, sortBy]);

  const contingencyAmount = Math.round((budget.grandTotal * contingencyPct) / 100);
  const totalWithContingency = budget.grandTotal + contingencyAmount;

  const parsedBudgetCap = useMemo(() => {
    const val = Number(budgetCapInput.replace(/[^0-9.]/g, ''));
    return Number.isFinite(val) && val > 0 ? val : null;
  }, [budgetCapInput]);

  const capVariance = parsedBudgetCap !== null ? parsedBudgetCap - totalWithContingency : null;

  const castPct =
    budget.grandTotal > 0 ? Math.round((budget.castTotal / budget.grandTotal) * 100) : 0;
  const crewPct = budget.grandTotal > 0 ? 100 - castPct : 0;

  const handleExportCsv = () => {
    const headers = [
      'Name',
      'Category',
      'Department',
      'Role',
      'Deal Status',
      'Pay Rate (USD)',
      'Pay Basis',
      'Kit Fee / Day (USD)',
      'Scheduled Days Count',
      'Scheduled Days',
      'Labor Subtotal (USD)',
      'Kit Subtotal (USD)',
      'Estimated Line Total (USD)',
    ];

    const escapeCsv = (val: string | number) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = visibleLines.map((line) => [
      line.member.name,
      line.member.category === 'cast' ? 'Cast' : 'Crew',
      line.member.department,
      line.member.role,
      line.member.paymentStatus,
      line.member.payRate,
      line.member.payBasis,
      line.member.kitFee || 0,
      line.scheduledDayCount,
      line.member.scheduledDays.join('; '),
      line.laborTotal,
      line.kitTotal,
      line.totalCost,
    ]);

    rows.push([
      'TOTAL RUNNING ESTIMATE',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      budget.totalPersonDays,
      '',
      budget.totalLabor,
      budget.totalKit,
      budget.grandTotal,
    ]);

    if (contingencyPct > 0) {
      rows.push([
        `CONTINGENCY (${contingencyPct}%)`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        contingencyAmount,
      ]);
      rows.push([
        'ESTIMATED TOTAL INCL. CONTINGENCY',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalWithContingency,
      ]);
    }

    const csvContent = [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'production_cast_crew_budget.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (members.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-400 space-y-3">
        <DollarSign className="w-10 h-10 text-gray-600" />
        <div>
          <p className="text-sm font-semibold text-gray-200">No Cast or Crew Pay Rates Logged</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            Add cast and crew members with their daily, weekly, hourly, or flat rates and scheduled shooting days to generate a running production budget estimate.
          </p>
        </div>
        <button
          onClick={onAddMember}
          className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors"
        >
          Add First Cast / Crew
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#1b1b1b] p-4 space-y-5 text-xs">
      {/* Top Budget Controls & Parameters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#222222] border border-[#353535] rounded p-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center p-0.5 bg-[#161616] rounded border border-[#383838]">
            <button
              onClick={() => setChartView('running')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                chartView === 'running'
                  ? 'bg-[#2f2f2f] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Running Cost by Shooting Day
            </button>
            <button
              onClick={() => setChartView('departments')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                chartView === 'departments'
                  ? 'bg-[#2f2f2f] text-[#ff8000]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Department Breakdown ({budget.departments.length})
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
                {cat === 'all' ? 'All Unit' : cat === 'cast' ? 'Cast' : 'Crew'}
              </button>
            ))}
          </div>

          <select
            value={dealFilter}
            onChange={(e) => setDealFilter(e.target.value as typeof dealFilter)}
            className="bg-[#161616] text-gray-200 px-2.5 py-1 rounded border border-[#383838] text-[11px] focus:outline-none focus:border-[#ff8000]"
          >
            <option value="all">All Deal Statuses</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending / On Hold</option>
          </select>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 whitespace-nowrap">Contingency:</span>
            <div className="flex items-center p-0.5 bg-[#161616] rounded border border-[#383838]">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setContingencyPct(pct)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                    contingencyPct === pct
                      ? 'bg-[#2f2f2f] text-amber-400 font-semibold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="budget-cap-input" className="text-[11px] text-gray-400 whitespace-nowrap">
              Labor Cap:
            </label>
            <input
              id="budget-cap-input"
              type="text"
              placeholder={sceneBudgetBaseline > 0 ? `e.g. ${sceneBudgetBaseline}` : 'Optional ($)'}
              value={budgetCapInput}
              onChange={(e) => setBudgetCapInput(e.target.value)}
              className="w-28 bg-[#161616] text-gray-100 font-mono tabular-nums px-2 py-1 rounded border border-[#383838] text-[11px] focus:outline-none focus:border-[#ff8000]"
            />
            {sceneBudgetBaseline > 0 && budgetCapInput !== String(sceneBudgetBaseline) && (
              <button
                onClick={() => setBudgetCapInput(String(sceneBudgetBaseline))}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline whitespace-nowrap shrink-0"
                title="Set cap to sum of scene budgets"
              >
                Use Scene Cap ({formatCurrency(sceneBudgetBaseline)})
              </button>
            )}
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2a2a2a] hover:bg-[#353535] text-gray-200 rounded border border-[#444] text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Budget Top-Sheet KPI Strip (Clean hairline-divided columns, tabular figures) */}
      <div className="bg-[#222222] border border-[#353535] rounded px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-[#323232]">
        <div className="lg:pr-4">
          <div className="text-[11px] text-gray-400">Running Scheduled Payroll</div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-0.5">
            {formatCurrency(budget.grandTotal)}
          </div>
          <div className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5">
            {formatCurrency(budget.totalLabor)} labor · {formatCurrency(budget.totalKit)} kit ({budget.totalPersonDays} person-days)
          </div>
        </div>

        <div className="lg:px-4">
          <div className="text-[11px] text-gray-400">Cast vs. Crew Allocation</div>
          <div className="flex items-baseline gap-2 mt-0.5 font-mono tabular-nums">
            <span className="text-base font-semibold text-gray-100">
              {formatCurrency(budget.castTotal)}
            </span>
            <span className="text-gray-500">/</span>
            <span className="text-base font-semibold text-cyan-300">
              {formatCurrency(budget.crewTotal)}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 tabular-nums mt-0.5">
            {castPct}% Cast · {crewPct}% Crew · Avg {formatCurrency(budget.avgDailyBurn)}/shoot day
          </div>
        </div>

        <div className="lg:px-4">
          <div className="text-[11px] text-gray-400">Approval Exposure</div>
          <div className="flex items-baseline gap-2 mt-0.5 font-mono tabular-nums">
            <span className="text-base font-semibold text-emerald-400">
              {formatCurrency(budget.approvedTotal)}
            </span>
            <span className="text-[11px] font-sans text-gray-400">approved</span>
          </div>
          <div className="text-[11px] mt-0.5 font-mono tabular-nums">
            {budget.pendingTotal > 0 ? (
              <span className="text-amber-400">
                {formatCurrency(budget.pendingTotal)} pending deal memo / hold
              </span>
            ) : (
              <span className="text-gray-400 font-sans">100% of unit deals approved</span>
            )}
          </div>
        </div>

        <div className="lg:pl-4">
          <div className="text-[11px] text-gray-400">
            Total Est. ({contingencyPct}% Contingency)
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-gray-100 mt-0.5">
            {formatCurrency(totalWithContingency)}
          </div>
          <div className="text-[11px] mt-0.5 font-mono tabular-nums">
            {capVariance !== null ? (
              <span className={capVariance >= 0 ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                {capVariance >= 0
                  ? `${formatCurrency(capVariance)} under cap`
                  : `${formatCurrency(Math.abs(capVariance))} over cap`}
              </span>
            ) : (
              <span className="text-gray-400">
                +{formatCurrency(contingencyAmount)} contingency reserve
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts + Department Breakdown Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Primary Recharts Budget Trajectory / Department Chart */}
        <div className="xl:col-span-8 bg-[#222222] border border-[#353535] rounded p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#ff8000]" />
                <span>
                  {chartView === 'running'
                    ? 'Running Production Cost Estimate Across Shooting Days'
                    : 'Estimated Labor & Kit Spend by Department'}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {chartView === 'running'
                  ? 'Daily scheduled cast, crew, and kit spend stacked against the cumulative running production cost.'
                  : 'Total scheduled labor and daily kit fees aggregated per production department.'}
              </p>
            </div>
            {budget.unscheduledFlatTotal > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-amber-300 shrink-0">
                +{formatCurrency(budget.unscheduledFlatTotal)} flat deals w/ 0 shoot days
              </span>
            )}
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'running' ? (
                <ComposedChart
                  data={budget.dayTimeline}
                  margin={{ top: 10, right: 20, left: 6, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="daily"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                  />
                  <YAxis
                    yAxisId="cum"
                    orientation="right"
                    stroke="#ff8000"
                    tick={{ fill: '#fbbf24', fontSize: 11 }}
                    tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161616',
                      borderColor: '#444444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#f3f4f6',
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      formatCurrency(Number(value) || 0),
                      String(name),
                    ]}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as DayBudgetPoint | undefined;
                      return row
                        ? `${label} · ${row.activeMembers} scheduled unit members`
                        : String(label);
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="daily"
                    dataKey="castLabor"
                    name="Cast Labor (Day)"
                    stackId="spend"
                    fill="#f59e0b"
                    barSize={40}
                  />
                  <Bar
                    yAxisId="daily"
                    dataKey="crewLabor"
                    name="Crew Labor (Day)"
                    stackId="spend"
                    fill="#38bdf8"
                    barSize={40}
                  />
                  <Bar
                    yAxisId="daily"
                    dataKey="kitFees"
                    name="Kit / Gear Fees"
                    stackId="spend"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                  <Line
                    yAxisId="cum"
                    type="monotone"
                    dataKey="cumulativeTotal"
                    name="Running Production Total"
                    stroke="#ff8000"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#ff8000', strokeWidth: 1.5, stroke: '#161616' }}
                  />
                </ComposedChart>
              ) : (
                <BarChart
                  data={budget.departments}
                  margin={{ top: 10, right: 20, left: 6, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                  <XAxis
                    dataKey="department"
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161616',
                      borderColor: '#444444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#f3f4f6',
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      formatCurrency(Number(value) || 0),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar
                    dataKey="laborTotal"
                    name="Labor Cost"
                    stackId="dept"
                    fill="#ff8000"
                    barSize={34}
                  />
                  <Bar
                    dataKey="kitTotal"
                    name="Kit / Gear Fees"
                    stackId="dept"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={34}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Summary Breakdown Panel */}
        <div className="xl:col-span-4 bg-[#222222] border border-[#353535] rounded flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#1d1d1d] border-b border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="font-semibold text-gray-100 text-xs">
                Department Cost Summary
              </h4>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-gray-400">
              {budget.departments.length} Depts
            </span>
          </div>

          <div className="divide-y divide-[#2d2d2d] overflow-y-auto max-h-[325px]">
            {budget.departments.map((dept) => (
              <div key={dept.department} className="px-4 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-100 truncate">
                      {dept.department}
                    </div>
                    <div className="text-[11px] text-gray-400 tabular-nums">
                      {dept.headcount} {dept.headcount === 1 ? 'member' : 'members'} · {dept.personDays} shoot-days
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="font-semibold text-amber-300">
                      {formatCurrency(dept.totalCost)}
                    </div>
                    <div className="text-[10px] text-gray-400">{dept.sharePct}%</div>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-[#151515] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff7700] rounded-full"
                    style={{ width: `${Math.min(100, Math.max(2, dept.sharePct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line-Item Cost Ledger Table */}
      <div className="bg-[#222222] border border-[#353535] rounded flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1d1d1d] border-b border-[#333333] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h4 className="font-semibold text-gray-100 text-xs">
              Cast & Crew Rate Line Items ({visibleLines.length})
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-gray-500" />
              <input
                type="text"
                placeholder="Filter line items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#151515] text-gray-200 pl-8 pr-7 py-1 rounded border border-[#3a3a3a] text-[11px] focus:outline-none focus:border-[#ff8000]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#151515] text-gray-200 px-2.5 py-1 rounded border border-[#3a3a3a] text-[11px] focus:outline-none focus:border-[#ff8000]"
            >
              <option value="cost_desc">Sort: Line Total (High–Low)</option>
              <option value="name">Sort: Name (A–Z)</option>
              <option value="department">Sort: Department</option>
              <option value="days_desc">Sort: Scheduled Days</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead className="bg-[#191919] border-b border-[#333333] text-[11px] text-gray-400">
              <tr>
                <th className="py-2.5 px-3">Member & Work Role</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Deal Status</th>
                <th className="py-2.5 px-3 text-right">Individual Pay Rate</th>
                <th className="py-2.5 px-3 text-right">Kit / Day</th>
                <th className="py-2.5 px-3">Scheduled Shooting Days</th>
                <th className="py-2.5 px-3 text-right">Labor Subtotal</th>
                <th className="py-2.5 px-3 text-right">Kit Subtotal</th>
                <th className="py-2.5 px-3 text-right">Est. Line Total</th>
                <th className="py-2.5 px-3 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2d2d]">
              {visibleLines.map((line) => {
                const { member } = line;
                const sharePct =
                  budget.grandTotal > 0
                    ? Math.round((line.totalCost / budget.grandTotal) * 1000) / 10
                    : 0;
                return (
                  <tr
                    key={member.id}
                    onClick={() => onSelectMember(member.id)}
                    className="hover:bg-[#282828] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-semibold text-gray-100">{member.name}</div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[200px]">
                        {member.role}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top text-gray-300">
                      <div>{member.department}</div>
                      <div className="text-[10px] text-gray-500">
                        {member.category === 'cast' ? 'Cast' : 'Crew'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <span
                        className={`text-[11px] font-medium ${
                          member.paymentStatus === 'Approved'
                            ? 'text-emerald-400'
                            : member.paymentStatus === 'Pending Deal Memo'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {member.paymentStatus}
                      </span>
                      <div className="text-[10px] text-gray-500">{member.availabilityStatus}</div>
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-gray-200 whitespace-nowrap">
                      {formatCurrency(member.payRate)}
                      <span className="text-[10px] font-sans text-gray-400">
                        /{line.rateUnitLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-gray-300 whitespace-nowrap">
                      {member.kitFee ? formatCurrency(member.kitFee) : '$0'}
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums text-gray-200">
                        <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>
                          {line.scheduledDayCount}{' '}
                          {line.scheduledDayCount === 1 ? 'day' : 'days'}
                        </span>
                        {member.payBasis === 'Weekly' && line.weeksCount > 0 && (
                          <span className="text-[10px] font-sans text-gray-400">
                            ({line.weeksCount} wk)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[180px] mt-0.5">
                        {member.scheduledDays.length > 0
                          ? member.scheduledDays.join(' · ')
                          : 'Unscheduled'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-gray-200 whitespace-nowrap">
                      {formatCurrency(line.laborTotal)}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-gray-300 whitespace-nowrap">
                      {formatCurrency(line.kitTotal)}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-amber-400">
                        {formatCurrency(line.totalCost)}
                      </div>
                      <div className="text-[10px] text-gray-400">{sharePct}%</div>
                    </td>
                    <td
                      className="py-2.5 px-3 align-top text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onEditMember(member)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2c2c2c] hover:bg-[#383838] text-gray-200 border border-[#444] text-[10px] font-medium transition-colors whitespace-nowrap"
                        title="Edit pay rate or scheduled shooting days"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        <span>Rate / Days</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#181818] border-t-2 border-[#3a3a3a] font-mono tabular-nums text-xs">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 font-sans font-semibold text-gray-200">
                  Running Production Cost Estimate (Scheduled Days)
                </td>
                <td className="py-2.5 px-3 text-gray-200 font-semibold">
                  {budget.totalPersonDays} person-days
                </td>
                <td className="py-2.5 px-3 text-right text-gray-200 font-semibold">
                  {formatCurrency(budget.totalLabor)}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-300 font-semibold">
                  {formatCurrency(budget.totalKit)}
                </td>
                <td className="py-2.5 px-3 text-right text-amber-400 font-bold text-sm">
                  {formatCurrency(budget.grandTotal)}
                </td>
                <td className="py-2.5 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
