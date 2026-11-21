import {
  Scene,
  ScreenplayElement,
  ShootLocation,
  StripboardStrip,
} from '../types/story';

export type OptimizationStrategy =
  | 'balanced'
  | 'location_first'
  | 'cast_first'
  | 'day_night_split';

export interface ScheduleOptimizationOptions {
  strategy: OptimizationStrategy;
  maxPagesPerDay: number;
  companyMovePenaltyMin: number;
  lightingFlipPenaltyMin: number;
  intExtFlipPenaltyMin: number;
  sameVenueMoveMin: number;
  insertDayAndMealBreaks: boolean;
  includeUnscheduledScenes: boolean;
  pinnedSceneIds: string[];
}

export const DEFAULT_OPTIMIZATION_OPTIONS: ScheduleOptimizationOptions = {
  strategy: 'balanced',
  maxPagesPerDay: 4,
  companyMovePenaltyMin: 60,
  lightingFlipPenaltyMin: 30,
  intExtFlipPenaltyMin: 20,
  sameVenueMoveMin: 20,
  insertDayAndMealBreaks: true,
  includeUnscheduledScenes: false,
  pinnedSceneIds: [],
};

export interface NormalizedScheduleUnit {
  strip: StripboardStrip;
  scene?: Scene;
  sceneId: string;
  sceneNumber: number;
  exactSet: string;
  baseVenue: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  dayNight: string;
  lightingRegime: 'DAYLIGHT' | 'NIGHTLIGHT';
  eighths: number;
  estimatedShootMin: number;
  storyDay: number;
  characters: string[];
  voiceOverCharacters: string[];
  originalIndex: number;
  originalDayNumber: number;
}

export interface StripTransitionNote {
  kind: 'day_start' | 'same_set' | 'same_venue' | 'company_move' | 'lighting_flip';
  minutes: number;
  label: string;
}

export interface DayScheduleSummary {
  dayNumber: number;
  bannerTitle: string;
  callTime: string;
  wrapTime: string;
  sceneCount: number;
  totalEighths: number;
  totalPagesFormatted: string;
  shootMinutes: number;
  turnaroundMinutes: number;
  mealMinutes: number;
  uniqueSets: string[];
  uniqueVenues: string[];
  castCalled: string[];
  hasDayToNightFlip: boolean;
  companyMovesInDay: number;
}

export interface CharacterDoDRow {
  character: string;
  beforeDays: number[];
  afterDays: number[];
  beforeSpan: number;
  afterSpan: number;
  beforeIdleDays: number;
  afterIdleDays: number;
  workDaysCount: number;
}

export interface ScheduleMetrics {
  shootDaysCount: number;
  sceneCount: number;
  totalEighths: number;
  totalPagesFormatted: string;
  exactSetSwitches: number;
  companyMoves: number;
  sameVenueStageMoves: number;
  lightingFlips: number;
  intExtFlips: number;
  totalTurnaroundMin: number;
  totalProductionMin: number;
  castHoldDaysTotal: number;
  castIdleHoldDays: number;
  daySummaries: DayScheduleSummary[];
  characterDodMatrix: CharacterDoDRow[];
}

export interface OptimizedSceneMoveDiff {
  sceneId: string;
  sceneNumber: number;
  set: string;
  intExt: string;
  dayNight: string;
  pages: string;
  characters: string[];
  beforeDay: number;
  afterDay: number;
  beforePosition: number;
  afterPosition: number;
  moved: boolean;
  pinned: boolean;
  rationale: string;
}

export interface ScheduleOptimizationResult {
  optimizedStrips: StripboardStrip[];
  beforeMetrics: ScheduleMetrics;
  afterMetrics: ScheduleMetrics;
  deltas: {
    turnaroundMinSaved: number;
    companyMovesSaved: number;
    exactSetSwitchesSaved: number;
    lightingFlipsSaved: number;
    castHoldDaysSaved: number;
    castIdleHoldDaysSaved: number;
    shootDaysDelta: number;
  };
  sceneChanges: OptimizedSceneMoveDiff[];
  transitionsByStripId: Record<string, StripTransitionNote>;
  unscheduledSceneCount: number;
  alreadyOptimal: boolean;
}

export function formatEighthsToPages(eighths: number): string {
  const safe = Math.max(0, Math.round(eighths));
  if (safe === 0) return '0';
  const whole = Math.floor(safe / 8);
  const rem = safe % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
}

export function formatMinutesToDuration(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatMinutesToClock(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hrs = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function parseDurationToMinutes(durationStr?: string, fallbackEighths = 4): number {
  if (durationStr) {
    const match = durationStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hrs = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const total = hrs * 60 + mins;
      if (total > 0) return total;
    }
  }
  return Math.max(45, Math.round(fallbackEighths * 15));
}

export function parseEighthsFromStrip(strip: StripboardStrip, scene?: Scene): number {
  if (typeof strip.eighths === 'number' && strip.eighths > 0) {
    return strip.eighths;
  }
  if (strip.pages) {
    const clean = strip.pages.trim();
    const mixed = clean.match(/^(\d+)\s+(\d+)\/8$/);
    if (mixed) return parseInt(mixed[1], 10) * 8 + parseInt(mixed[2], 10);
    const frac = clean.match(/^(\d+)\/8$/);
    if (frac) return parseInt(frac[1], 10);
    const whole = clean.match(/^(\d+)$/);
    if (whole) return parseInt(whole[1], 10) * 8;
  }
  if (scene?.eighths && scene.eighths > 0) return scene.eighths;
  return 4;
}

const GENERIC_SET_WORDS = new Set([
  'THE',
  'OF',
  'AT',
  'IN',
  'ON',
  'A',
  'AN',
  'INT',
  'EXT',
  'ROOM',
  'AREA',
  'HALL',
  'HALLWAY',
  'CORRIDOR',
  'BRIDGE',
  'QUARTERS',
  'OFFICE',
  'DECK',
  'ENTRANCE',
  'LOBBY',
  'EXTERIOR',
  'INTERIOR',
  'CHAMBER',
  'CABIN',
  'BAY',
  'SECTOR',
  'WING',
  'FLOOR',
  'MAIN',
]);

export function normalizeSetName(raw?: string): string {
  return (raw || 'MAIN SET')
    .toUpperCase()
    .replace(/[^A-Z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractBaseVenue(
  setRaw: string,
  sceneLocation?: string,
  savedLocations: ShootLocation[] = []
): string {
  const normLoc = (sceneLocation || '').toUpperCase().trim();
  if (normLoc) {
    // Prefer physical stage/venue before hyphen, e.g. "Soundstage 2 - Shuttle Cockpit" -> "SOUNDSTAGE 2"
    const dashParts = normLoc.split(/\s+[-–—/]\s+/);
    const candidate = dashParts[0].trim();
    if (candidate && candidate !== 'VFX DEPT') {
      // Check savedLocations address/name clustering
      const savedMatch = savedLocations.find(
        (loc) =>
          loc.name.toUpperCase() === candidate ||
          normLoc.includes(loc.name.toUpperCase())
      );
      if (savedMatch) {
        return (savedMatch.address || savedMatch.name).toUpperCase().trim();
      }
      return candidate;
    }
  }

  const normSet = normalizeSetName(setRaw);
  const words = normSet.split(' ').filter(Boolean);
  if (words.length >= 3) {
    // Strip trailing room/sub-area noun like BRIDGE, PASSENGER AREA, QUARTERS
    const coreWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i >= 2 && GENERIC_SET_WORDS.has(words[i])) {
        break;
      }
      coreWords.push(words[i]);
      if (coreWords.length >= 3) break;
    }
    if (coreWords.length >= 2) {
      return coreWords.join(' ');
    }
  }
  return normSet;
}

function getLightingRegime(dayNight?: string): 'DAYLIGHT' | 'NIGHTLIGHT' {
  const dn = (dayNight || 'DAY').toUpperCase();
  if (dn.includes('NIGHT') || dn.includes('EVENING')) {
    return 'NIGHTLIGHT';
  }
  return 'DAYLIGHT';
}

function getLiveVOByScene(elements: ScreenplayElement[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  let activeChar = '';
  let activeCharIsVO = false;
  let activeSceneId = '';

  elements.forEach((el) => {
    if (el.sceneId && el.sceneId !== activeSceneId) {
      activeSceneId = el.sceneId;
      activeChar = '';
      activeCharIsVO = false;
    }
    const sid = el.sceneId || activeSceneId;
    if (!sid) return;

    if (el.type === 'CHARACTER' && el.text.trim()) {
      activeChar = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
      activeCharIsVO = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(el.text);
      if (activeChar && activeCharIsVO) {
        if (!map.has(sid)) map.set(sid, new Set());
        map.get(sid)!.add(activeChar);
      }
    } else if (el.type === 'VOICE_OVER') {
      const speaker =
        (el.character ? el.character.replace(/\(.*?\)/g, '').trim().toUpperCase() : '') ||
        activeChar ||
        'NARRATOR';
      if (speaker) {
        if (!map.has(sid)) map.set(sid, new Set());
        map.get(sid)!.add(speaker);
      }
    } else if (el.type === 'DIALOGUE' && activeCharIsVO) {
      const speaker =
        (el.character ? el.character.replace(/\(.*?\)/g, '').trim().toUpperCase() : '') ||
        activeChar;
      if (speaker) {
        if (!map.has(sid)) map.set(sid, new Set());
        map.get(sid)!.add(speaker);
      }
    } else if (el.type !== 'PARENTHETICAL') {
      activeChar = '';
      activeCharIsVO = false;
    }
  });

  return map;
}

function getStripColorClass(intExt: string, dayNight: string): string {
  const ie = intExt.toUpperCase();
  const dn = dayNight.toUpperCase();
  if (ie === 'EXT' && dn === 'DAY') return 'day-ext';
  if (ie === 'EXT') return 'night-ext';
  if (ie === 'INT' && dn === 'DAY') return 'day-int';
  return 'night-int';
}

function buildNormalizedUnits(
  strips: StripboardStrip[],
  scenes: Scene[],
  elements: ScreenplayElement[],
  includeUnscheduledScenes: boolean,
  savedLocations: ShootLocation[]
): { units: NormalizedScheduleUnit[]; unscheduledSceneCount: number } {
  const sceneMap = new Map<string, Scene>();
  scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const voMap = getLiveVOByScene(elements);
  const units: NormalizedScheduleUnit[] = [];
  const scheduledSceneIds = new Set<string>();

  let currentDay = 1;
  let hasSeenScene = false;
  let sceneSeqIdx = 0;

  strips.forEach((strip) => {
    if (strip.type === 'day_break') {
      if (hasSeenScene) currentDay++;
      return;
    }
    if (strip.type !== 'scene') return;

    hasSeenScene = true;
    const scene = strip.sceneId ? sceneMap.get(strip.sceneId) : undefined;
    const sid = strip.sceneId || strip.id;
    scheduledSceneIds.add(sid);

    const exactSet = normalizeSetName(strip.set || scene?.setting || 'MAIN SET');
    const baseVenue = extractBaseVenue(exactSet, scene?.location, savedLocations);
    const intExt = ((strip.intExt || scene?.intExt || 'INT').toUpperCase() as
      | 'INT'
      | 'EXT'
      | 'INT/EXT');
    const dayNight = (strip.dayNight || scene?.dayNight || 'DAY').toUpperCase();
    const eighths = parseEighthsFromStrip(strip, scene);

    const voChars = new Set<string>([
      ...(strip.voiceOverCharacters || []).map((c) => c.trim().toUpperCase()),
      ...(voMap.get(sid) ? Array.from(voMap.get(sid)!) : []),
    ]);

    const charSet = new Set<string>([
      ...(strip.characters || []).map((c) => c.trim().toUpperCase()),
      ...(scene?.characters || []).map((c) => c.trim().toUpperCase()),
      ...Array.from(voChars),
    ]);

    units.push({
      strip,
      scene,
      sceneId: sid,
      sceneNumber: strip.sceneNumber ?? scene?.sceneNumber ?? sceneSeqIdx + 1,
      exactSet,
      baseVenue,
      intExt,
      dayNight,
      lightingRegime: getLightingRegime(dayNight),
      eighths,
      estimatedShootMin: parseDurationToMinutes(
        strip.scheduledDuration || scene?.shootingDuration,
        eighths
      ),
      storyDay: strip.storyDay ?? scene?.storyDay ?? 1,
      characters: Array.from(charSet).filter(Boolean).sort(),
      voiceOverCharacters: Array.from(voChars).filter(Boolean).sort(),
      originalIndex: sceneSeqIdx++,
      originalDayNumber: currentDay,
    });
  });

  const unscheduledScenes = scenes.filter((sc) => !scheduledSceneIds.has(sc.id));

  if (includeUnscheduledScenes) {
    unscheduledScenes.forEach((sc) => {
      const exactSet = normalizeSetName(sc.setting || sc.heading);
      const baseVenue = extractBaseVenue(exactSet, sc.location, savedLocations);
      const voChars = Array.from(voMap.get(sc.id) || []);
      const charSet = Array.from(
        new Set<string>([
          ...sc.characters.map((c) => c.trim().toUpperCase()),
          ...voChars,
        ])
      )
        .filter(Boolean)
        .sort();

      const syntheticStrip: StripboardStrip = {
        id: `strip-opt-${sc.id}`,
        type: 'scene',
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        intExt: sc.intExt,
        dayNight: sc.dayNight,
        set: exactSet,
        runningTime: sc.timecode || '00:01:00',
        pages: sc.pages || formatEighthsToPages(sc.eighths),
        eighths: sc.eighths,
        storyDay: sc.storyDay,
        scheduledDuration: sc.shootingDuration || formatMinutesToClock(Math.max(45, sc.eighths * 15)),
        characters: charSet,
        voiceOverCharacters: voChars,
        timeOfDay: sc.timeOfDay || '09:00',
        colorClass: getStripColorClass(sc.intExt, sc.dayNight),
      };

      units.push({
        strip: syntheticStrip,
        scene: sc,
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        exactSet,
        baseVenue,
        intExt: sc.intExt,
        dayNight: sc.dayNight,
        lightingRegime: getLightingRegime(sc.dayNight),
        eighths: sc.eighths || 4,
        estimatedShootMin: parseDurationToMinutes(sc.shootingDuration, sc.eighths || 4),
        storyDay: sc.storyDay || 1,
        characters: charSet,
        voiceOverCharacters: voChars,
        originalIndex: sceneSeqIdx++,
        originalDayNumber: currentDay + 1,
      });
    });
  }

  return { units, unscheduledSceneCount: unscheduledScenes.length };
}

function getTransitionDetail(
  prev: NormalizedScheduleUnit | null,
  curr: NormalizedScheduleUnit,
  options: ScheduleOptimizationOptions
): StripTransitionNote {
  if (!prev) {
    return {
      kind: 'day_start',
      minutes: 0,
      label: 'First company setup of Shoot Day',
    };
  }

  const sameSet = prev.exactSet === curr.exactSet;
  const sameVenue = prev.baseVenue === curr.baseVenue;
  const lightingChanged = prev.lightingRegime !== curr.lightingRegime;
  const intExtChanged =
    prev.intExt !== curr.intExt && prev.intExt !== 'INT/EXT' && curr.intExt !== 'INT/EXT';

  if (sameSet) {
    let mins = 10;
    const notes: string[] = [];
    if (lightingChanged) {
      mins += options.lightingFlipPenaltyMin;
      notes.push(`${prev.dayNight} -> ${curr.dayNight} lighting flip`);
    }
    if (intExtChanged) {
      mins += options.intExtFlipPenaltyMin;
      notes.push(`${prev.intExt} -> ${curr.intExt} switch`);
    }
    if (notes.length > 0) {
      return {
        kind: 'lighting_flip',
        minutes: mins,
        label: `Same set (${notes.join(', ')}) · ${mins}m turnaround`,
      };
    }
    return {
      kind: 'same_set',
      minutes: 10,
      label: 'Same set & lighting · 10m camera reset',
    };
  }

  if (sameVenue) {
    let mins = options.sameVenueMoveMin;
    if (lightingChanged) mins += Math.round(options.lightingFlipPenaltyMin * 0.7);
    if (intExtChanged) mins += Math.round(options.intExtFlipPenaltyMin * 0.5);
    return {
      kind: 'same_venue',
      minutes: mins,
      label: `Same stage/complex (${curr.baseVenue}) · ${mins}m stage move`,
    };
  }

  let mins = options.companyMovePenaltyMin;
  if (lightingChanged) mins += Math.round(options.lightingFlipPenaltyMin * 0.5);
  return {
    kind: 'company_move',
    minutes: mins,
    label: `Company move to ${curr.baseVenue} · ${mins}m turnaround`,
  };
}

interface StrategyWeights {
  exactSetSwitch: number;
  companyMove: number;
  sameVenueMove: number;
  lightingFlip: number;
  intExtFlip: number;
  castAffinity: number;
  castSpanWeight: number;
  storyDayWeight: number;
}

function getStrategyWeights(options: ScheduleOptimizationOptions): StrategyWeights {
  switch (options.strategy) {
    case 'location_first':
      return {
        exactSetSwitch: 85,
        companyMove: options.companyMovePenaltyMin * 3.2,
        sameVenueMove: options.sameVenueMoveMin * 1.4,
        lightingFlip: options.lightingFlipPenaltyMin * 1.1,
        intExtFlip: options.intExtFlipPenaltyMin * 1.1,
        castAffinity: 18,
        castSpanWeight: 22,
        storyDayWeight: 4,
      };
    case 'cast_first':
      return {
        exactSetSwitch: 45,
        companyMove: options.companyMovePenaltyMin * 1.3,
        sameVenueMove: options.sameVenueMoveMin * 0.8,
        lightingFlip: options.lightingFlipPenaltyMin * 0.9,
        intExtFlip: options.intExtFlipPenaltyMin * 0.8,
        castAffinity: 58,
        castSpanWeight: 95,
        storyDayWeight: 3,
      };
    case 'day_night_split':
      return {
        exactSetSwitch: 65,
        companyMove: options.companyMovePenaltyMin * 2.0,
        sameVenueMove: options.sameVenueMoveMin * 1.1,
        lightingFlip: options.lightingFlipPenaltyMin * 3.5,
        intExtFlip: options.intExtFlipPenaltyMin * 2.0,
        castAffinity: 24,
        castSpanWeight: 34,
        storyDayWeight: 4,
      };
    case 'balanced':
    default:
      return {
        exactSetSwitch: 65,
        companyMove: options.companyMovePenaltyMin * 2.2,
        sameVenueMove: options.sameVenueMoveMin * 1.1,
        lightingFlip: options.lightingFlipPenaltyMin * 1.5,
        intExtFlip: options.intExtFlipPenaltyMin * 1.2,
        castAffinity: 36,
        castSpanWeight: 52,
        storyDayWeight: 5,
      };
  }
}

function computePairCost(
  a: NormalizedScheduleUnit,
  b: NormalizedScheduleUnit,
  weights: StrategyWeights
): number {
  let cost = 0;

  if (a.exactSet !== b.exactSet) {
    cost += weights.exactSetSwitch;
    if (a.baseVenue === b.baseVenue) {
      cost += weights.sameVenueMove;
    } else {
      cost += weights.companyMove;
    }
  }

  if (a.lightingRegime !== b.lightingRegime) {
    cost += weights.lightingFlip;
  }

  if (
    a.intExt !== b.intExt &&
    a.intExt !== 'INT/EXT' &&
    b.intExt !== 'INT/EXT'
  ) {
    cost += weights.intExtFlip;
  }

  if (a.storyDay !== b.storyDay) {
    cost += weights.storyDayWeight;
  }

  // Character overlap bonus
  if (a.characters.length > 0 && b.characters.length > 0) {
    const bSet = new Set(b.characters);
    let shared = 0;
    a.characters.forEach((c) => {
      if (bSet.has(c)) shared++;
    });
    const unionSize = a.characters.length + b.characters.length - shared;
    const jaccard = unionSize > 0 ? shared / unionSize : 0;
    cost -= weights.castAffinity * (shared * 0.5 + jaccard * 1.5);
  } else if (a.characters.length === 0 && b.characters.length === 0) {
    // Group unit/VFX establishers nicely
    cost -= weights.castAffinity * 0.35;
  }

  // Gentle preference for keeping original script order on exact ties
  cost += Math.abs(a.sceneNumber - b.sceneNumber) * 0.05;

  return cost;
}

function evaluateSequenceScore(
  sequence: NormalizedScheduleUnit[],
  weights: StrategyWeights
): number {
  let total = 0;
  for (let i = 1; i < sequence.length; i++) {
    total += computePairCost(sequence[i - 1], sequence[i], weights);
  }

  // Character span / hold compactness across the full shooting sequence
  const charPositions = new Map<string, { first: number; last: number; count: number }>();
  sequence.forEach((unit, idx) => {
    unit.characters.forEach((char) => {
      const existing = charPositions.get(char);
      if (!existing) {
        charPositions.set(char, { first: idx, last: idx, count: 1 });
      } else {
        existing.last = idx;
        existing.count += 1;
      }
    });
  });

  charPositions.forEach(({ first, last, count }) => {
    const gaps = last - first + 1 - count;
    total += gaps * (weights.castSpanWeight / Math.max(2, sequence.length * 0.45));
  });

  return total;
}

function solveOptimalSequence(
  units: NormalizedScheduleUnit[],
  options: ScheduleOptimizationOptions
): NormalizedScheduleUnit[] {
  if (units.length <= 1) return [...units];

  const weights = getStrategyWeights(options);
  const pinnedSet = new Set(options.pinnedSceneIds);
  const pinnedPositions = new Map<number, NormalizedScheduleUnit>();
  const freeUnits: NormalizedScheduleUnit[] = [];

  units.forEach((u, idx) => {
    if (pinnedSet.has(u.sceneId)) {
      pinnedPositions.set(idx, u);
    } else {
      freeUnits.push(u);
    }
  });

  if (freeUnits.length <= 1) return [...units];

  const mergeWithPinned = (freeOrder: NormalizedScheduleUnit[]): NormalizedScheduleUnit[] => {
    if (pinnedPositions.size === 0) return freeOrder;
    const result: NormalizedScheduleUnit[] = new Array(units.length);
    let freeCursor = 0;
    for (let i = 0; i < units.length; i++) {
      const pinned = pinnedPositions.get(i);
      if (pinned) {
        result[i] = pinned;
      } else {
        result[i] = freeOrder[freeCursor++];
      }
    }
    return result;
  };

  // Candidate seeds on freeUnits
  const candidates: NormalizedScheduleUnit[][] = [];

  // Seed 1: Original order
  candidates.push([...freeUnits]);

  // Seed 2: Clustered by Venue -> Exact Set -> Lighting -> Int/Ext
  const venueCounts = new Map<string, number>();
  freeUnits.forEach((u) => {
    venueCounts.set(u.baseVenue, (venueCounts.get(u.baseVenue) || 0) + 1);
  });
  candidates.push(
    [...freeUnits].sort((a, b) => {
      if (options.strategy === 'day_night_split' && a.lightingRegime !== b.lightingRegime) {
        return a.lightingRegime === 'DAYLIGHT' ? -1 : 1;
      }
      const vcDiff = (venueCounts.get(b.baseVenue) || 0) - (venueCounts.get(a.baseVenue) || 0);
      if (vcDiff !== 0) return vcDiff;
      if (a.baseVenue !== b.baseVenue) return a.baseVenue.localeCompare(b.baseVenue);
      if (a.exactSet !== b.exactSet) return a.exactSet.localeCompare(b.exactSet);
      if (a.lightingRegime !== b.lightingRegime) {
        return a.lightingRegime === 'DAYLIGHT' ? -1 : 1;
      }
      return a.sceneNumber - b.sceneNumber;
    })
  );

  // Seed 3..K: Nearest-Neighbor starts from up to 16 evenly spaced starting units
  const step = Math.max(1, Math.floor(freeUnits.length / 16));
  for (let sIdx = 0; sIdx < freeUnits.length; sIdx += step) {
    const remaining = new Set(freeUnits.map((_, i) => i));
    const seq: NormalizedScheduleUnit[] = [freeUnits[sIdx]];
    remaining.delete(sIdx);

    while (remaining.size > 0) {
      const last = seq[seq.length - 1];
      let bestIdx = -1;
      let bestCost = Infinity;
      remaining.forEach((idx) => {
        const c = computePairCost(last, freeUnits[idx], weights);
        if (c < bestCost) {
          bestCost = c;
          bestIdx = idx;
        }
      });
      if (bestIdx === -1) break;
      seq.push(freeUnits[bestIdx]);
      remaining.delete(bestIdx);
    }
    candidates.push(seq);
  }

  let bestFreeOrder = candidates[0];
  let bestScore = evaluateSequenceScore(mergeWithPinned(bestFreeOrder), weights);

  candidates.forEach((cand) => {
    const score = evaluateSequenceScore(mergeWithPinned(cand), weights);
    if (score < bestScore) {
      bestScore = score;
      bestFreeOrder = cand;
    }
  });

  // Local search refinement: 2-opt reversals + single-unit relocate moves
  let current = [...bestFreeOrder];
  let currentScore = bestScore;
  const maxPasses = 40;

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;

    // 2-opt segment reversals
    for (let i = 0; i < current.length - 1; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const trial = [
          ...current.slice(0, i),
          ...current.slice(i, j + 1).reverse(),
          ...current.slice(j + 1),
        ];
        const trialScore = evaluateSequenceScore(mergeWithPinned(trial), weights);
        if (trialScore + 1e-6 < currentScore) {
          current = trial;
          currentScore = trialScore;
          improved = true;
        }
      }
    }

    // Relocate single scene into better slot (e.g., pulling matching location/cast together)
    for (let i = 0; i < current.length; i++) {
      for (let j = 0; j < current.length; j++) {
        if (i === j || i + 1 === j) continue;
        const trial = [...current];
        const [item] = trial.splice(i, 1);
        const insertAt = j > i ? j - 1 : j;
        trial.splice(insertAt, 0, item);
        const trialScore = evaluateSequenceScore(mergeWithPinned(trial), weights);
        if (trialScore + 1e-6 < currentScore) {
          current = trial;
          currentScore = trialScore;
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return mergeWithPinned(current);
}

function packIntoShootDaysAndStrips(
  orderedUnits: NormalizedScheduleUnit[],
  existingDayBreaks: StripboardStrip[],
  options: ScheduleOptimizationOptions
): {
  strips: StripboardStrip[];
  transitionsByStripId: Record<string, StripTransitionNote>;
} {
  if (orderedUnits.length === 0) {
    return { strips: [], transitionsByStripId: {} };
  }

  const maxEighths = Math.max(8, Math.round(options.maxPagesPerDay * 8));
  const maxDayMinutes = 11.5 * 60; // Standard 11.5h shooting window before overtime
  const transitionsByStripId: Record<string, StripTransitionNote> = {};

  // Group into Shoot Days
  const dayBuckets: NormalizedScheduleUnit[][] = [];
  let currentBucket: NormalizedScheduleUnit[] = [];
  let currentEighths = 0;
  let currentMinutes = 0;

  orderedUnits.forEach((unit, idx) => {
    if (currentBucket.length === 0) {
      currentBucket.push(unit);
      currentEighths = unit.eighths;
      currentMinutes = unit.estimatedShootMin;
      return;
    }

    const prev = currentBucket[currentBucket.length - 1];
    const transition = getTransitionDetail(prev, unit, options);
    const projectedEighths = currentEighths + unit.eighths;
    const projectedMinutes = currentMinutes + transition.minutes + unit.estimatedShootMin;

    const sameExactSet = prev.exactSet === unit.exactSet;
    const isMajorBreak =
      transition.kind === 'company_move' || transition.kind === 'lighting_flip';

    // Allow finishing an identical set cleanly if within a small 2/8 page grace margin
    const exceedsPages =
      sameExactSet
        ? projectedEighths > maxEighths + 2
        : projectedEighths > maxEighths;
    const exceedsHours = projectedMinutes > maxDayMinutes;
    const breakAtNaturalMove =
      currentEighths >= Math.round(maxEighths * 0.72) &&
      isMajorBreak &&
      idx < orderedUnits.length;

    if (options.insertDayAndMealBreaks && (exceedsPages || exceedsHours || breakAtNaturalMove)) {
      dayBuckets.push(currentBucket);
      currentBucket = [unit];
      currentEighths = unit.eighths;
      currentMinutes = unit.estimatedShootMin;
    } else {
      currentBucket.push(unit);
      currentEighths = projectedEighths;
      currentMinutes = projectedMinutes;
    }
  });

  if (currentBucket.length > 0) {
    dayBuckets.push(currentBucket);
  }

  // Build final StripboardStrip[] with Day Breaks, Meal/Move Banners, and updated Call Times
  const resultStrips: StripboardStrip[] = [];
  const baseStartDate = new Date(2026, 10, 10); // Nov 10, 2026 default production start

  dayBuckets.forEach((bucket, dayIdx) => {
    const dayNum = dayIdx + 1;
    const dayTotalEighths = bucket.reduce((sum, u) => sum + u.eighths, 0);
    const nightEighths = bucket
      .filter((u) => u.lightingRegime === 'NIGHTLIGHT')
      .reduce((sum, u) => sum + u.eighths, 0);

    // Night-dominant shoot days start at 17:30; standard days at 08:30
    const callMin = nightEighths > dayTotalEighths * 0.55 ? 17 * 60 + 30 : 8 * 60 + 30;
    let clockMin = callMin;

    // Decide where (if anywhere) to place a mid-day Meal / Move banner
    let mealAfterLocalIdx = -1;
    const rawWorkMinutes = bucket.reduce((sum, u) => sum + u.estimatedShootMin, 0);
    if (options.insertDayAndMealBreaks && bucket.length >= 2 && rawWorkMinutes >= 240) {
      let bestScore = -1;
      let runningMin = 0;
      for (let i = 0; i < bucket.length - 1; i++) {
        runningMin += bucket[i].estimatedShootMin;
        const trans = getTransitionDetail(bucket[i], bucket[i + 1], options);
        // Prefer placing meal break near mid-day AND aligning with any location/company move
        const balanceScore = 100 - Math.abs(runningMin - rawWorkMinutes / 2);
        const moveBonus = trans.kind === 'company_move' ? 120 : trans.kind === 'same_venue' ? 45 : 0;
        const score = balanceScore + moveBonus;
        if (score > bestScore) {
          bestScore = score;
          mealAfterLocalIdx = i;
        }
      }
    }

    // Reserve Day Break header index so we can populate exact FROM / TO times after computing day
    const existingBreak = existingDayBreaks[dayIdx];
    const dDate = new Date(baseStartDate.getTime() + dayIdx * 86400000);
    const formattedDate = dDate.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const dayBreakInsertIdx = resultStrips.length;
    if (options.insertDayAndMealBreaks) {
      resultStrips.push({
        id: existingBreak?.id || `db-opt-${dayNum}-${Date.now()}`,
        type: 'day_break',
        bannerTitle: `START OF DAY ${dayNum}`,
        bannerDate: existingBreak?.bannerDate || formattedDate,
        bannerTotalPages: `${formatEighthsToPages(dayTotalEighths)} PAGES`,
        bannerFrom: formatMinutesToClock(callMin),
        bannerTo: formatMinutesToClock(callMin + 600),
      });
    }

    bucket.forEach((unit, localIdx) => {
      const prevInDay = localIdx > 0 ? bucket[localIdx - 1] : null;
      const transition = getTransitionDetail(prevInDay, unit, options);
      transitionsByStripId[unit.strip.id] = transition;

      if (localIdx > 0) {
        clockMin += transition.minutes;
      }

      const sceneCallTime = formatMinutesToClock(clockMin);
      const updatedStrip: StripboardStrip = {
        ...unit.strip,
        timeOfDay: sceneCallTime,
        colorClass: getStripColorClass(unit.intExt, unit.dayNight),
      };
      resultStrips.push(updatedStrip);

      clockMin += unit.estimatedShootMin;

      if (localIdx === mealAfterLocalIdx) {
        const nextUnit = bucket[localIdx + 1];
        const nextTrans = getTransitionDetail(unit, nextUnit, options);
        const mealDuration = nextTrans.kind === 'company_move' ? 60 : 45;
        const mealFrom = formatMinutesToClock(clockMin);
        const mealTo = formatMinutesToClock(clockMin + mealDuration);
        resultStrips.push({
          id: `banner-opt-${dayNum}-${localIdx}-${Date.now()}`,
          type: 'banner',
          bannerTitle:
            nextTrans.kind === 'company_move'
              ? `Meal Break & Company Move to ${nextUnit.baseVenue}`
              : nextTrans.kind === 'same_venue'
              ? `Meal Break & Stage Reset (${nextUnit.exactSet})`
              : 'Mid-Day Meal & Camera Reset',
          bannerFrom: mealFrom,
          bannerTo: mealTo,
          scheduledDuration: formatMinutesToClock(mealDuration),
        });
        clockMin += mealDuration;
      }
    });

    if (options.insertDayAndMealBreaks) {
      resultStrips[dayBreakInsertIdx] = {
        ...resultStrips[dayBreakInsertIdx],
        bannerTo: formatMinutesToClock(clockMin),
      };
    }
  });

  return { strips: resultStrips, transitionsByStripId };
}

export function computeScheduleMetrics(
  strips: StripboardStrip[],
  scenes: Scene[],
  elements: ScreenplayElement[],
  options: ScheduleOptimizationOptions,
  savedLocations: ShootLocation[] = []
): ScheduleMetrics {
  const { units } = buildNormalizedUnits(
    strips,
    scenes,
    elements,
    false,
    savedLocations
  );

  // Split units by actual day_break positions inside `strips`
  const dayBuckets: NormalizedScheduleUnit[][] = [];
  const mealMinByDay: number[] = [];
  const callTimeByDay: string[] = [];
  const wrapTimeByDay: string[] = [];
  const bannerTitleByDay: string[] = [];

  const unitByStripId = new Map<string, NormalizedScheduleUnit>();
  units.forEach((u) => unitByStripId.set(u.strip.id, u));

  let activeBucket: NormalizedScheduleUnit[] = [];
  let activeMealMin = 0;
  let activeCall = '08:30';
  let activeWrap = '19:00';
  let activeTitle = 'START OF DAY 1';

  strips.forEach((strip) => {
    if (strip.type === 'day_break') {
      if (activeBucket.length > 0) {
        dayBuckets.push(activeBucket);
        mealMinByDay.push(activeMealMin);
        callTimeByDay.push(activeCall);
        wrapTimeByDay.push(activeWrap);
        bannerTitleByDay.push(activeTitle);
        activeBucket = [];
        activeMealMin = 0;
      }
      activeTitle = strip.bannerTitle || `START OF DAY ${dayBuckets.length + 1}`;
      activeCall = strip.bannerFrom || '08:30';
      activeWrap = strip.bannerTo || '19:00';
    } else if (strip.type === 'banner') {
      activeMealMin += parseDurationToMinutes(strip.scheduledDuration, 4);
    } else if (strip.type === 'scene') {
      const u = unitByStripId.get(strip.id);
      if (u) activeBucket.push(u);
    }
  });

  if (activeBucket.length > 0 || dayBuckets.length === 0) {
    if (activeBucket.length > 0) {
      dayBuckets.push(activeBucket);
      mealMinByDay.push(activeMealMin);
      callTimeByDay.push(activeCall);
      wrapTimeByDay.push(activeWrap);
      bannerTitleByDay.push(activeTitle);
    }
  }

  let exactSetSwitches = 0;
  let companyMoves = 0;
  let sameVenueStageMoves = 0;
  let lightingFlips = 0;
  let intExtFlips = 0;
  let totalTurnaroundMin = 0;
  let totalProductionMin = 0;
  let totalEighths = 0;

  const charDayMap = new Map<string, Set<number>>();
  const daySummaries: DayScheduleSummary[] = [];

  dayBuckets.forEach((bucket, dayIdx) => {
    const dayNum = dayIdx + 1;
    let dayEighths = 0;
    let dayShootMin = 0;
    let dayTurnaroundMin = 0;
    let dayCompanyMoves = 0;
    let dayHasFlip = false;
    const sets = new Set<string>();
    const venues = new Set<string>();
    const cast = new Set<string>();

    bucket.forEach((unit, idx) => {
      dayEighths += unit.eighths;
      totalEighths += unit.eighths;
      dayShootMin += unit.estimatedShootMin;
      sets.add(unit.exactSet);
      venues.add(unit.baseVenue);
      unit.characters.forEach((c) => {
        cast.add(c);
        if (!charDayMap.has(c)) charDayMap.set(c, new Set());
        charDayMap.get(c)!.add(dayNum);
      });

      if (idx > 0) {
        const prev = bucket[idx - 1];
        const trans = getTransitionDetail(prev, unit, options);
        dayTurnaroundMin += trans.minutes;
        totalTurnaroundMin += trans.minutes;

        if (prev.exactSet !== unit.exactSet) {
          exactSetSwitches++;
          if (prev.baseVenue === unit.baseVenue) {
            sameVenueStageMoves++;
          } else {
            companyMoves++;
            dayCompanyMoves++;
          }
        }
        if (prev.lightingRegime !== unit.lightingRegime) {
          lightingFlips++;
          dayHasFlip = true;
        }
        if (
          prev.intExt !== unit.intExt &&
          prev.intExt !== 'INT/EXT' &&
          unit.intExt !== 'INT/EXT'
        ) {
          intExtFlips++;
        }
      }
    });

    const mealMin = mealMinByDay[dayIdx] || 0;
    totalProductionMin += dayShootMin + dayTurnaroundMin + mealMin;

    daySummaries.push({
      dayNumber: dayNum,
      bannerTitle: bannerTitleByDay[dayIdx] || `START OF DAY ${dayNum}`,
      callTime: callTimeByDay[dayIdx] || '08:30',
      wrapTime: wrapTimeByDay[dayIdx] || '19:00',
      sceneCount: bucket.length,
      totalEighths: dayEighths,
      totalPagesFormatted: formatEighthsToPages(dayEighths),
      shootMinutes: dayShootMin,
      turnaroundMinutes: dayTurnaroundMin,
      mealMinutes: mealMin,
      uniqueSets: Array.from(sets),
      uniqueVenues: Array.from(venues),
      castCalled: Array.from(cast).sort(),
      hasDayToNightFlip: dayHasFlip,
      companyMovesInDay: dayCompanyMoves,
    });
  });

  let castHoldDaysTotal = 0;
  let castIdleHoldDays = 0;
  const characterDodMatrix: CharacterDoDRow[] = [];

  Array.from(charDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([character, daySet]) => {
      const days = Array.from(daySet).sort((a, b) => a - b);
      const span = days.length > 0 ? days[days.length - 1] - days[0] + 1 : 0;
      const idle = Math.max(0, span - days.length);
      castHoldDaysTotal += span;
      castIdleHoldDays += idle;
      characterDodMatrix.push({
        character,
        beforeDays: days,
        afterDays: days,
        beforeSpan: span,
        afterSpan: span,
        beforeIdleDays: idle,
        afterIdleDays: idle,
        workDaysCount: days.length,
      });
    });

  return {
    shootDaysCount: dayBuckets.length,
    sceneCount: units.length,
    totalEighths,
    totalPagesFormatted: formatEighthsToPages(totalEighths),
    exactSetSwitches,
    companyMoves,
    sameVenueStageMoves,
    lightingFlips,
    intExtFlips,
    totalTurnaroundMin,
    totalProductionMin,
    castHoldDaysTotal,
    castIdleHoldDays,
    daySummaries,
    characterDodMatrix,
  };
}

export function optimizeStripboardSchedule(
  strips: StripboardStrip[],
  scenes: Scene[],
  elements: ScreenplayElement[],
  options: ScheduleOptimizationOptions,
  savedLocations: ShootLocation[] = []
): ScheduleOptimizationResult {
  const { units, unscheduledSceneCount } = buildNormalizedUnits(
    strips,
    scenes,
    elements,
    options.includeUnscheduledScenes,
    savedLocations
  );

  // Baseline uses current strips (or includes unscheduled appended at end if comparing equal scope)
  const baselineStripsForMetrics = options.includeUnscheduledScenes
    ? [
        ...strips,
        ...units
          .filter((u) => !strips.some((s) => s.type === 'scene' && s.id === u.strip.id))
          .map((u) => u.strip),
      ]
    : strips;

  const beforeMetrics = computeScheduleMetrics(
    baselineStripsForMetrics,
    scenes,
    elements,
    options,
    savedLocations
  );

  if (units.length <= 1) {
    return {
      optimizedStrips: [...strips],
      beforeMetrics,
      afterMetrics: beforeMetrics,
      deltas: {
        turnaroundMinSaved: 0,
        companyMovesSaved: 0,
        exactSetSwitchesSaved: 0,
        lightingFlipsSaved: 0,
        castHoldDaysSaved: 0,
        castIdleHoldDaysSaved: 0,
        shootDaysDelta: 0,
      },
      sceneChanges: [],
      transitionsByStripId: {},
      unscheduledSceneCount,
      alreadyOptimal: true,
    };
  }

  const orderedUnits = solveOptimalSequence(units, options);
  const existingDayBreaks = strips.filter((s) => s.type === 'day_break');

  const { strips: packedStrips, transitionsByStripId } = packIntoShootDaysAndStrips(
    orderedUnits,
    existingDayBreaks,
    options
  );

  const afterMetrics = computeScheduleMetrics(
    packedStrips,
    scenes,
    elements,
    options,
    savedLocations
  );

  // Merge Before & After Character DoD matrix cleanly
  const beforeDodMap = new Map<string, CharacterDoDRow>();
  beforeMetrics.characterDodMatrix.forEach((row) => beforeDodMap.set(row.character, row));
  afterMetrics.characterDodMatrix = afterMetrics.characterDodMatrix.map((afterRow) => {
    const prev = beforeDodMap.get(afterRow.character);
    return {
      ...afterRow,
      beforeDays: prev?.beforeDays || [],
      beforeSpan: prev?.beforeSpan || 0,
      beforeIdleDays: prev?.beforeIdleDays || 0,
    };
  });

  // Compute Day assignments before and after for diff breakdown
  const beforeDayBySceneId = new Map<string, { day: number; pos: number }>();
  const afterDayBySceneId = new Map<string, { day: number; pos: number }>();

  let d = 1;
  let pos = 0;
  let seen = false;
  baselineStripsForMetrics.forEach((s) => {
    if (s.type === 'day_break') {
      if (seen) d++;
    } else if (s.type === 'scene') {
      seen = true;
      pos++;
      beforeDayBySceneId.set(s.sceneId || s.id, { day: d, pos });
    }
  });

  d = 1;
  pos = 0;
  seen = false;
  packedStrips.forEach((s) => {
    if (s.type === 'day_break') {
      if (seen) d++;
    } else if (s.type === 'scene') {
      seen = true;
      pos++;
      afterDayBySceneId.set(s.sceneId || s.id, { day: d, pos });
    }
  });

  const pinnedSet = new Set(options.pinnedSceneIds);
  const sceneChanges: OptimizedSceneMoveDiff[] = orderedUnits.map((unit, idx) => {
    const beforeLoc = beforeDayBySceneId.get(unit.sceneId) || {
      day: unit.originalDayNumber,
      pos: unit.originalIndex + 1,
    };
    const afterLoc = afterDayBySceneId.get(unit.sceneId) || {
      day: 1,
      pos: idx + 1,
    };
    const trans = transitionsByStripId[unit.strip.id];
    const nextUnit = idx < orderedUnits.length - 1 ? orderedUnits[idx + 1] : null;
    const prevUnit = idx > 0 ? orderedUnits[idx - 1] : null;

    let rationale = 'Maintained in optimal shooting sequence';
    if (pinnedSet.has(unit.sceneId)) {
      rationale = 'Pinned by user to original schedule slot';
    } else if (prevUnit && prevUnit.exactSet === unit.exactSet) {
      rationale = `Grouped consecutively at ${unit.exactSet} (0m set move)`;
    } else if (prevUnit && prevUnit.baseVenue === unit.baseVenue) {
      rationale = `Clustered at ${unit.baseVenue} stage/complex`;
    } else if (
      nextUnit &&
      nextUnit.exactSet === unit.exactSet
    ) {
      rationale = `Anchors ${unit.exactSet} shooting block`;
    } else if (prevUnit) {
      const prevChars = new Set(prevUnit.characters);
      const shared = unit.characters.filter((c) => prevChars.has(c));
      if (shared.length > 0) {
        rationale = `Follows shared cast (${shared.slice(0, 2).join(', ')}) to compress hold days`;
      } else if (trans?.label) {
        rationale = trans.label;
      }
    }

    return {
      sceneId: unit.sceneId,
      sceneNumber: unit.sceneNumber,
      set: unit.exactSet,
      intExt: unit.intExt,
      dayNight: unit.dayNight,
      pages: formatEighthsToPages(unit.eighths),
      characters: unit.characters,
      beforeDay: beforeLoc.day,
      afterDay: afterLoc.day,
      beforePosition: beforeLoc.pos,
      afterPosition: afterLoc.pos,
      moved: beforeLoc.pos !== afterLoc.pos || beforeLoc.day !== afterLoc.day,
      pinned: pinnedSet.has(unit.sceneId),
      rationale,
    };
  });

  const turnaroundMinSaved =
    beforeMetrics.totalTurnaroundMin - afterMetrics.totalTurnaroundMin;
  const companyMovesSaved = beforeMetrics.companyMoves - afterMetrics.companyMoves;
  const exactSetSwitchesSaved =
    beforeMetrics.exactSetSwitches - afterMetrics.exactSetSwitches;
  const lightingFlipsSaved = beforeMetrics.lightingFlips - afterMetrics.lightingFlips;
  const castHoldDaysSaved =
    beforeMetrics.castHoldDaysTotal - afterMetrics.castHoldDaysTotal;
  const castIdleHoldDaysSaved =
    beforeMetrics.castIdleHoldDays - afterMetrics.castIdleHoldDays;
  const shootDaysDelta =
    afterMetrics.shootDaysCount - beforeMetrics.shootDaysCount;

  const anyMoved = sceneChanges.some((c) => c.moved);
  const alreadyOptimal =
    !anyMoved &&
    turnaroundMinSaved <= 0 &&
    companyMovesSaved <= 0 &&
    castHoldDaysSaved <= 0 &&
    !options.includeUnscheduledScenes;

  return {
    optimizedStrips: packedStrips,
    beforeMetrics,
    afterMetrics,
    deltas: {
      turnaroundMinSaved,
      companyMovesSaved,
      exactSetSwitchesSaved,
      lightingFlipsSaved,
      castHoldDaysSaved,
      castIdleHoldDaysSaved,
      shootDaysDelta,
    },
    sceneChanges,
    transitionsByStripId,
    unscheduledSceneCount,
    alreadyOptimal,
  };
}
