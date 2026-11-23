import {
  CastCrewMember,
  Scene,
  ScreenplayElement,
  StoryProject,
  StripboardStrip,
} from '../types/story';

export type DocumentTemplateKind = 'film' | 'stage' | 'book' | 'television';

export interface DocumentTemplateMeta {
  id: DocumentTemplateKind;
  title: string;
  subtitle: string;
  badge: string;
  defaultTitle: string;
  fontLabel: string;
  highlights: string[];
}

export const DOCUMENT_TEMPLATE_DEFS: DocumentTemplateMeta[] = [
  {
    id: 'film',
    title: 'Film Script',
    subtitle: 'Feature / Short Screenplay',
    badge: 'FILM',
    defaultTitle: 'Untitled Feature Screenplay',
    fontLabel: 'Courier Prime · 12 pt',
    highlights: ['INT./EXT. Scene Headings', 'Character & Dialogue cues', '1/8th page breakdown'],
  },
  {
    id: 'stage',
    title: 'Stage Play',
    subtitle: 'Theatre & Live Script',
    badge: 'STAGE',
    defaultTitle: 'Untitled Stage Play',
    fontLabel: 'Courier Prime · 12 pt',
    highlights: ['Act & Scene structure', 'Cast List at rise', 'Blocking & stage directions'],
  },
  {
    id: 'book',
    title: 'Book Manuscript',
    subtitle: 'Novel & Longform Prose',
    badge: 'BOOK',
    defaultTitle: 'Untitled Book Manuscript',
    fontLabel: 'Georgia Serif · 12 pt · 1.5×',
    highlights: ['Chapter & Outline beats', 'Prose narrative flow', 'Summary & Author notes'],
  },
  {
    id: 'television',
    title: 'Television Script',
    subtitle: 'Episodic / Multi-Act Teleplay',
    badge: 'TV',
    defaultTitle: 'Untitled TV Pilot (1-Hour Drama)',
    fontLabel: 'Courier Prime · 12 pt',
    highlights: ['Teaser / Cold Open', 'Act Breaks & End of Act', 'Episodic scene numbering'],
  },
];

function buildDayBannerTitle(dayNum: number): string {
  return `START OF SHOOT DAY ${dayNum}`;
}

function buildMultiDayStripsFromScenes(
  scenes: Scene[],
  daysCount: number,
  startDateIso: string,
  callTime: string,
  wrapTime: string
): StripboardStrip[] {
  const strips: StripboardStrip[] = [];
  const safeDays = Math.max(1, Math.min(30, daysCount));
  const baseDate = new Date(`${startDateIso}T09:00:00`);

  const formatDayLabel = (offsetDays: number) => {
    if (Number.isNaN(baseDate.getTime())) return `Day ${offsetDays + 1}`;
    const d = new Date(baseDate.getTime() + offsetDays * 86400000);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (scenes.length === 0) {
    for (let d = 1; d <= safeDays; d++) {
      strips.push({
        id: `b-sched-${Date.now()}-${d}`,
        type: 'day_break',
        bannerTitle: buildDayBannerTitle(d),
        bannerDate: formatDayLabel(d - 1),
        bannerTotalPages: '0 PAGES',
        bannerFrom: callTime,
        bannerTo: wrapTime,
      });
    }
    return strips;
  }

  const perDay = Math.max(1, Math.ceil(scenes.length / safeDays));
  let sceneIdx = 0;

  for (let d = 1; d <= safeDays; d++) {
    const dayScenes =
      d === safeDays
        ? scenes.slice(sceneIdx)
        : scenes.slice(sceneIdx, sceneIdx + perDay);
    sceneIdx += dayScenes.length;

    const totalEighths = dayScenes.reduce((acc, s) => acc + (s.eighths || 8), 0);
    const whole = Math.floor(totalEighths / 8);
    const rem = totalEighths % 8;
    const pagesLabel =
      totalEighths === 0
        ? '0 PAGES'
        : rem === 0
        ? `${whole} PAGE${whole === 1 ? '' : 'S'}`
        : `${whole > 0 ? `${whole} ` : ''}${rem}/8 PAGES`;

    strips.push({
      id: `b-sched-${Date.now()}-${d}`,
      type: 'day_break',
      bannerTitle: buildDayBannerTitle(d),
      bannerDate: formatDayLabel(d - 1),
      bannerTotalPages: pagesLabel,
      bannerFrom: callTime,
      bannerTo: wrapTime,
    });

    dayScenes.forEach((sc, idxInDay) => {
      const isNight = sc.dayNight === 'NIGHT' || sc.dayNight === 'DUSK';
      const isExt = sc.intExt === 'EXT';
      const colorClass = isNight
        ? isExt
          ? 'night-ext'
          : 'night-int'
        : isExt
        ? 'day-ext'
        : 'day-int';

      strips.push({
        id: `st-sched-${Date.now()}-${d}-${sc.id}`,
        type: 'scene',
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        intExt: sc.intExt,
        dayNight: sc.dayNight,
        set: sc.setting || sc.location,
        runningTime: sc.timecode,
        pages: sc.pages,
        eighths: sc.eighths,
        storyDay: d,
        scheduledDuration: '01:30',
        characters: sc.characters,
        timeOfDay: idxInDay === 0 ? callTime : sc.timeOfDay || '11:00',
        colorClass,
      });
    });

    if (dayScenes.length > 0 && d < safeDays) {
      strips.push({
        id: `meal-sched-${Date.now()}-${d}`,
        type: 'banner',
        bannerTitle: `LUNCH / TURNAROUND — DAY ${d}`,
        bannerFrom: '13:00',
        bannerTo: '13:45',
      });
    }
  }

  return strips;
}

export function createProjectFromDocumentTemplate(
  kind: DocumentTemplateKind,
  options?: { title?: string; author?: string }
): StoryProject {
  const uid = Date.now();
  const author = options?.author?.trim() || 'Jeffrey (Online)';

  if (kind === 'stage') {
    const title = options?.title?.trim() || 'Untitled Stage Play';
    const sc1 = `sc-stage-${uid}-1`;
    const sc2 = `sc-stage-${uid}-2`;
    const elements: ScreenplayElement[] = [
      { id: `el-${uid}-1`, type: 'NEW_ACT', text: 'ACT ONE', sceneId: sc1 },
      {
        id: `el-${uid}-2`,
        type: 'CAST_LIST',
        text: 'AT RISE: CLARA (30s, sharp, restless) and MARCUS (40s, archivist).',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-3`,
        type: 'SCENE_HEADING',
        text: 'SCENE 1: INT. PARLOR THEATRE STAGE - EVENING',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-4`,
        type: 'ACTION',
        text: '(Lights up on an empty wooden desk center stage. CLARA stands beside a brass reading lamp, coat still on.)',
        sceneId: sc1,
      },
      { id: `el-${uid}-5`, type: 'CHARACTER', text: 'CLARA', sceneId: sc1 },
      {
        id: `el-${uid}-6`,
        type: 'PARENTHETICAL',
        text: '(to the empty chairs)',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-7`,
        type: 'DIALOGUE',
        text: 'You swore the curtain would never rise on an unfinished second act.',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-8`,
        type: 'ACTION',
        text: '(MARCUS enters upstage left carrying a leather binder.)',
        sceneId: sc1,
      },
      { id: `el-${uid}-9`, type: 'CHARACTER', text: 'MARCUS', sceneId: sc1 },
      {
        id: `el-${uid}-10`,
        type: 'DIALOGUE',
        text: 'Then let us begin with the scene everyone tried to cut.',
        sceneId: sc1,
      },
      { id: `el-${uid}-11`, type: 'END_OF_ACT', text: 'END OF SCENE ONE', sceneId: sc2 },
    ];

    const scenes: Scene[] = [
      {
        id: sc1,
        sceneNumber: 1,
        heading: 'SCENE 1: INT. PARLOR THEATRE STAGE - EVENING',
        setting: 'PARLOR THEATRE STAGE',
        intExt: 'INT',
        dayNight: 'EVENING',
        timecode: '00:00:00',
        durationSec: 120,
        pages: '2',
        eighths: 16,
        characters: ['CLARA', 'MARCUS'],
        synopsis: 'Act One opening confrontation center stage.',
        notes: 'Keep center-stage wash warm.',
        budget: '$4,500',
        location: 'Main Proscenium Stage',
        act: 1,
        storyDay: 1,
        timeOfDay: '19:30',
      },
    ];

    return {
      id: `stage-${uid}`,
      title,
      author,
      lastModified: 'Just now',
      documentCategory: 'stage',
      editorTypography: { fontFamily: 'Courier Prime', fontSizePt: 12, lineSpacing: 1.3 },
      scenes,
      elements,
      tags: [],
      comments: [],
      strips: buildMultiDayStripsFromScenes(scenes, 1, '2026-11-23', '10:00', '18:00'),
      characters: [
        { name: 'CLARA', color: '#f59e0b', scenesCount: 1, speakingLines: 1 },
        { name: 'MARCUS', color: '#38bdf8', scenesCount: 1, speakingLines: 1 },
      ],
      storyboards: [],
    };
  }

  if (kind === 'book') {
    const title = options?.title?.trim() || 'Untitled Book Manuscript';
    const sc1 = `sc-book-${uid}-1`;
    const sc2 = `sc-book-${uid}-2`;
    const elements: ScreenplayElement[] = [
      {
        id: `el-${uid}-1`,
        type: 'OUTLINE_1',
        text: 'PART ONE — THE FIRST WINTER',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-2`,
        type: 'SCENE_HEADING',
        text: 'CHAPTER 1: THE GLASS OBSERVATORY',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-3`,
        type: 'SUMMARY',
        text: 'Chapter Goal: Introduce Elena arriving at the coastal observatory and finding the unmailed manuscript.',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-4`,
        type: 'GENERAL',
        text: 'By the time the harbor bells struck four, fog had swallowed every mast along the quay. Elena set her satchel beside the brass barometer and listened to the wind rattling the skylight glass.',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-5`,
        type: 'GENERAL',
        text: 'On the desk lay three bound notebooks—each dated a decade after the lighthouse had officially been decommissioned.',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-6`,
        type: 'NOTE',
        text: 'Author Note: Expand sensory details on the sea-salt air and the ink smudging on page three.',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-7`,
        type: 'OUTLINE_2',
        text: 'Chapter 2 Beat: Trace the initials inside the front cover back to the town archives.',
        sceneId: sc2,
      },
    ];

    const scenes: Scene[] = [
      {
        id: sc1,
        sceneNumber: 1,
        heading: 'CHAPTER 1: THE GLASS OBSERVATORY',
        setting: 'COASTAL OBSERVATORY',
        intExt: 'INT',
        dayNight: 'DUSK',
        timecode: '00:00:00',
        durationSec: 180,
        pages: '3',
        eighths: 24,
        characters: ['ELENA'],
        synopsis: 'Chapter 1 — Arrival at the observatory.',
        notes: 'Third-person close POV.',
        budget: 'N/A',
        location: 'Coastal Observatory',
        act: 1,
        storyDay: 1,
        timeOfDay: '16:00',
      },
    ];

    return {
      id: `book-${uid}`,
      title,
      author,
      lastModified: 'Just now',
      documentCategory: 'book',
      editorTypography: { fontFamily: 'Georgia', fontSizePt: 12, lineSpacing: 1.5 },
      scenes,
      elements,
      tags: [],
      comments: [],
      strips: [],
      characters: [{ name: 'ELENA', color: '#a78bfa', scenesCount: 1, speakingLines: 0 }],
      storyboards: [],
    };
  }

  if (kind === 'television') {
    const title = options?.title?.trim() || 'Untitled TV Pilot (1-Hour Drama)';
    const sc1 = `sc-tv-${uid}-1`;
    const sc2 = `sc-tv-${uid}-2`;
    const elements: ScreenplayElement[] = [
      { id: `el-${uid}-1`, type: 'NEW_ACT', text: 'TEASER / COLD OPEN', sceneId: sc1 },
      {
        id: `el-${uid}-2`,
        type: 'SCENE_HEADING',
        text: 'INT. BROADCAST CONTROL ROOM - NIGHT',
        sceneId: sc1,
      },
      {
        id: `el-${uid}-3`,
        type: 'ACTION',
        text: 'Forty monitors glow in stacked rows. A red ON-AIR tally light flickers overhead.',
        sceneId: sc1,
      },
      { id: `el-${uid}-4`, type: 'CHARACTER', text: 'PRODUCER NORA', sceneId: sc1 },
      {
        id: `el-${uid}-5`,
        type: 'DIALOGUE',
        text: 'Hold cameras one and three. Do not cut away until he finishes the sentence.',
        sceneId: sc1,
      },
      { id: `el-${uid}-6`, type: 'END_OF_ACT', text: 'END OF TEASER', sceneId: sc1 },
      { id: `el-${uid}-7`, type: 'NEW_ACT', text: 'ACT ONE', sceneId: sc2 },
      {
        id: `el-${uid}-8`,
        type: 'SCENE_HEADING',
        text: 'EXT. STUDIO LOT - NEXT MORNING',
        sceneId: sc2,
      },
      {
        id: `el-${uid}-9`,
        type: 'ACTION',
        text: 'Morning coffee carts weave past grip trucks and soundstage doors.',
        sceneId: sc2,
      },
    ];

    const scenes: Scene[] = [
      {
        id: sc1,
        sceneNumber: 1,
        heading: 'INT. BROADCAST CONTROL ROOM - NIGHT',
        setting: 'BROADCAST CONTROL ROOM',
        intExt: 'INT',
        dayNight: 'NIGHT',
        timecode: '00:00:00',
        durationSec: 75,
        pages: '1 2/8',
        eighths: 10,
        characters: ['PRODUCER NORA'],
        synopsis: 'Cold open teaser inside live broadcast booth.',
        notes: '',
        budget: '$18,000',
        location: 'Stage 4 Control Room',
        act: 1,
        storyDay: 1,
        timeOfDay: '22:00',
      },
      {
        id: sc2,
        sceneNumber: 2,
        heading: 'EXT. STUDIO LOT - NEXT MORNING',
        setting: 'STUDIO LOT',
        intExt: 'EXT',
        dayNight: 'DAY',
        timecode: '00:01:15',
        durationSec: 60,
        pages: '1',
        eighths: 8,
        characters: ['PRODUCER NORA'],
        synopsis: 'Act One aftermath on the studio backlot.',
        notes: '',
        budget: '$12,000',
        location: 'Backlot Avenue',
        act: 1,
        storyDay: 2,
        timeOfDay: '08:00',
      },
    ];

    return {
      id: `tv-${uid}`,
      title,
      author,
      lastModified: 'Just now',
      documentCategory: 'television',
      editorTypography: { fontFamily: 'Courier Prime', fontSizePt: 12, lineSpacing: 1.3 },
      scenes,
      elements,
      tags: [],
      comments: [],
      strips: buildMultiDayStripsFromScenes(scenes, 1, '2026-11-23', '08:00', '19:00'),
      characters: [{ name: 'PRODUCER NORA', color: '#22d3ee', scenesCount: 2, speakingLines: 1 }],
      storyboards: [],
    };
  }

  // Default: 'film'
  const title = options?.title?.trim() || 'Untitled Feature Screenplay';
  const sc1 = `sc-film-${uid}-1`;
  const elements: ScreenplayElement[] = [
    {
      id: `el-${uid}-1`,
      type: 'SCENE_HEADING',
      text: 'INT. PRODUCTION OFFICE - DAY',
      sceneId: sc1,
    },
    {
      id: `el-${uid}-2`,
      type: 'ACTION',
      text: 'Bright morning light cuts across the desk. A clean Courier page waits for the opening image.',
      sceneId: sc1,
    },
    { id: `el-${uid}-3`, type: 'CHARACTER', text: 'WRITER', sceneId: sc1 },
    {
      id: `el-${uid}-4`,
      type: 'DIALOGUE',
      text: 'Fade in. Every scene starts with an action and a voice.',
      sceneId: sc1,
    },
    { id: `el-${uid}-5`, type: 'TRANSITION', text: 'CUT TO:', sceneId: sc1 },
  ];

  const scenes: Scene[] = [
    {
      id: sc1,
      sceneNumber: 1,
      heading: 'INT. PRODUCTION OFFICE - DAY',
      setting: 'PRODUCTION OFFICE',
      intExt: 'INT',
      dayNight: 'DAY',
      timecode: '00:00:00',
      durationSec: 60,
      pages: '1',
      eighths: 8,
      characters: ['WRITER'],
      synopsis: 'Opening scene.',
      notes: '',
      budget: '$5,000',
      location: 'Main Studio',
      act: 1,
      storyDay: 1,
      timeOfDay: '09:00',
    },
  ];

  return {
    id: `film-${uid}`,
    title,
    author,
    lastModified: 'Just now',
    documentCategory: 'film',
    editorTypography: { fontFamily: 'Courier Prime', fontSizePt: 12, lineSpacing: 1.3 },
    scenes,
    elements,
    tags: [],
    comments: [],
    strips: buildMultiDayStripsFromScenes(scenes, 1, '2026-11-23', '09:00', '18:00'),
    characters: [{ name: 'WRITER', color: '#ff9f43', scenesCount: 1, speakingLines: 1 }],
    storyboards: [],
  };
}

export function createNewProductionProject(options?: {
  title?: string;
  author?: string;
  startDate?: string;
  shootDays?: number;
}): StoryProject {
  const uid = Date.now();
  const title = options?.title?.trim() || 'New Production Unit';
  const author = options?.author?.trim() || 'Jeffrey (Online)';
  const startDate = options?.startDate || '2026-11-24';
  const shootDays = options?.shootDays || 2;

  const sc1 = `sc-prod-${uid}-1`;
  const sc2 = `sc-prod-${uid}-2`;

  const scenes: Scene[] = [
    {
      id: sc1,
      sceneNumber: 1,
      heading: 'INT. SOUNDSTAGE A - MAIN SET - DAY',
      setting: 'SOUNDSTAGE A - MAIN SET',
      intExt: 'INT',
      dayNight: 'DAY',
      timecode: '00:00:00',
      durationSec: 90,
      pages: '1 4/8',
      eighths: 12,
      characters: ['LEAD A', 'LEAD B'],
      synopsis: 'Unit A soundstage dialogue setup.',
      notes: 'Requires pre-light morning call.',
      budget: '$22,000',
      location: 'Soundstage A',
      act: 1,
      storyDay: 1,
      timeOfDay: '08:00',
    },
    {
      id: sc2,
      sceneNumber: 2,
      heading: 'EXT. BACKLOT COURTYARD - NIGHT',
      setting: 'BACKLOT COURTYARD',
      intExt: 'EXT',
      dayNight: 'NIGHT',
      timecode: '00:01:30',
      durationSec: 60,
      pages: '1',
      eighths: 8,
      characters: ['LEAD A'],
      synopsis: 'Exterior night lighting sequence.',
      notes: 'Rain towers & wet-down requested.',
      budget: '$16,500',
      location: 'Backlot Courtyard',
      act: 1,
      storyDay: 1,
      timeOfDay: '20:30',
    },
  ];

  const elements: ScreenplayElement[] = [
    { id: `el-p-${uid}-1`, type: 'SCENE_HEADING', text: scenes[0].heading, sceneId: sc1 },
    {
      id: `el-p-${uid}-2`,
      type: 'ACTION',
      text: 'Production breakdown placeholder for Soundstage A.',
      sceneId: sc1,
    },
    { id: `el-p-${uid}-3`, type: 'SCENE_HEADING', text: scenes[1].heading, sceneId: sc2 },
    {
      id: `el-p-${uid}-4`,
      type: 'ACTION',
      text: 'Night exterior blocking and stunt clearance.',
      sceneId: sc2,
    },
  ];

  const defaultCrew: CastCrewMember[] = [
    {
      id: `crew-${uid}-1`,
      name: '1st Assistant Director',
      category: 'crew',
      department: 'Directing',
      role: '1st AD / Schedule Lead',
      email: '1stad@screencraft.studio',
      phone: '555-0101',
      payRate: 850,
      payBasis: 'Daily',
      paymentStatus: 'Approved',
      callTime: '06:30',
      wrapTime: '19:00',
      scheduledDays: ['Day 1', 'Day 2'],
      linkedSceneIds: [sc1, sc2],
      availabilityStatus: 'Confirmed',
      connections: [],
    },
    {
      id: `crew-${uid}-2`,
      name: 'Director of Photography',
      category: 'crew',
      department: 'Camera & Lighting',
      role: 'DP / Camera Lead',
      email: 'dp@screencraft.studio',
      phone: '555-0102',
      payRate: 1100,
      payBasis: 'Daily',
      paymentStatus: 'Approved',
      callTime: '07:00',
      wrapTime: '19:00',
      scheduledDays: ['Day 1', 'Day 2'],
      linkedSceneIds: [sc1, sc2],
      availabilityStatus: 'Confirmed',
      connections: [],
    },
    {
      id: `crew-${uid}-3`,
      name: 'Line Producer',
      category: 'crew',
      department: 'Production Office',
      role: 'Line Producer / Budget',
      email: 'lp@screencraft.studio',
      phone: '555-0103',
      payRate: 950,
      payBasis: 'Daily',
      paymentStatus: 'Approved',
      callTime: '07:30',
      wrapTime: '18:30',
      scheduledDays: ['Day 1', 'Day 2'],
      linkedSceneIds: [sc1, sc2],
      availabilityStatus: 'Confirmed',
      connections: [],
    },
  ];

  return {
    id: `prod-${uid}`,
    title,
    author,
    lastModified: 'Just now',
    documentCategory: 'production',
    editorTypography: { fontFamily: 'Courier Prime', fontSizePt: 12, lineSpacing: 1.3 },
    scenes,
    elements,
    tags: [],
    comments: [],
    strips: buildMultiDayStripsFromScenes(scenes, shootDays, startDate, '07:30', '19:00'),
    characters: [
      { name: 'LEAD A', color: '#ff9f43', scenesCount: 2, speakingLines: 0 },
      { name: 'LEAD B', color: '#38bdf8', scenesCount: 1, speakingLines: 0 },
    ],
    crewMembers: defaultCrew,
    locations: [
      {
        id: `loc-${uid}-1`,
        name: 'Soundstage A',
        address: 'Stage Lot 1, Burbank',
        lat: null,
        lng: null,
        notes: 'Primary interior unit.',
        photos: [],
      },
      {
        id: `loc-${uid}-2`,
        name: 'Backlot Courtyard',
        address: 'Exterior Plaza West',
        lat: null,
        lng: null,
        notes: 'Night unit exterior.',
        photos: [],
      },
    ],
    storyboards: [],
  };
}

export function generateNewProductionScheduleStrips(
  scenes: Scene[],
  options: { startDate: string; daysCount: number; callTime: string; wrapTime: string }
): StripboardStrip[] {
  return buildMultiDayStripsFromScenes(
    scenes,
    options.daysCount,
    options.startDate,
    options.callTime,
    options.wrapTime
  );
}

export function cloneProductionAssetsFromProject(
  source: StoryProject,
  target: StoryProject | null,
  parts: {
    strips: boolean;
    crew: boolean;
    locations: boolean;
    tags: boolean;
    storyboards: boolean;
  },
  newProjectTitle?: string
): { project: StoryProject; isNew: boolean } {
  const uid = Date.now();

  if (!target) {
    // Create a brand new Production project seeded from source project's scenes + selected production assets
    const clonedScenes = source.scenes.map((s) => ({ ...s }));
    const clonedElements = source.elements.map((e) => ({ ...e }));
    const newProj: StoryProject = {
      id: `prod-import-${uid}`,
      title: newProjectTitle?.trim() || `${source.title} — Production Unit`,
      author: source.author,
      lastModified: 'Imported today',
      documentCategory: 'production',
      editorTypography: source.editorTypography,
      scenes: clonedScenes,
      elements: clonedElements,
      characters: source.characters.map((c) => ({ ...c })),
      comments: [],
      strips: parts.strips
        ? source.strips.map((st, idx) => ({ ...st, id: `imp-st-${uid}-${idx}` }))
        : buildMultiDayStripsFromScenes(clonedScenes, 2, '2026-11-24', '08:00', '18:30'),
      crewMembers: parts.crew
        ? (source.crewMembers || []).map((m, idx) => ({
            ...m,
            id: `imp-crew-${uid}-${idx}`,
          }))
        : [],
      locations: parts.locations
        ? (source.locations || []).map((l, idx) => ({
            ...l,
            id: `imp-loc-${uid}-${idx}`,
          }))
        : [],
      tags: parts.tags
        ? source.tags.map((t, idx) => ({ ...t, id: `imp-tag-${uid}-${idx}` }))
        : [],
      storyboards: parts.storyboards
        ? (source.storyboards || []).map((sb, idx) => ({
            ...sb,
            id: `imp-sb-${uid}-${idx}`,
          }))
        : [],
    };
    return { project: newProj, isNew: true };
  }

  // Merge selected production assets into the existing target project
  const updated: StoryProject = {
    ...target,
    lastModified: 'Production updated just now',
    ...(parts.strips
      ? {
          strips: source.strips.map((st, idx) => ({
            ...st,
            id: `imp-st-${uid}-${idx}`,
          })),
        }
      : {}),
    ...(parts.crew
      ? {
          crewMembers: [
            ...(target.crewMembers || []),
            ...(source.crewMembers || []).filter(
              (sm) =>
                !(target.crewMembers || []).some(
                  (tm) => tm.name.toLowerCase() === sm.name.toLowerCase()
                )
            ),
          ],
        }
      : {}),
    ...(parts.locations
      ? {
          locations: [
            ...(target.locations || []),
            ...(source.locations || []).filter(
              (sl) =>
                !(target.locations || []).some(
                  (tl) => tl.name.toLowerCase() === sl.name.toLowerCase()
                )
            ),
          ],
        }
      : {}),
    ...(parts.tags
      ? {
          tags: [
            ...target.tags,
            ...source.tags.filter(
              (st) => !target.tags.some((tt) => tt.name.toLowerCase() === st.name.toLowerCase())
            ),
          ],
        }
      : {}),
    ...(parts.storyboards
      ? {
          storyboards: [
            ...(target.storyboards || []),
            ...(source.storyboards || []).map((sb, idx) => ({
              ...sb,
              id: `imp-sb-${uid}-${idx}`,
            })),
          ],
        }
      : {}),
  };

  return { project: updated, isNew: false };
}
