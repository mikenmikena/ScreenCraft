import {
  CastCrewMember,
  RevisionImpactReport,
  Scene,
  SceneSyncDiff,
  ScheduleConflictFlag,
  ScheduleSceneSnapshot,
  ScreenplayElement,
  ScreenplayRevision,
  StoryProject,
  StripboardStrip,
  Tag,
} from '../types/story';

const PROP_KEYWORD_REGEX =
  /\b(briefcase|metal brief|ring|jeweled ring|chime|holo-?map|holographic|datalink|datapad|communicator|headset|gun|pistol|blaster|glassware|wine glass|contract|dossier|file|keycard|beacon|helmet|case|document)\b/gi;

const extractHeadingParts = (
  heading: string,
  fallback: Scene
): {
  intExt: Scene['intExt'];
  dayNight: Scene['dayNight'];
  setting: string;
} => {
  const clean = heading.trim().toUpperCase();
  const match = clean.match(/^(INT\.\/EXT\.|INT\/EXT|I\/E|INT\.|INT|EXT\.|EXT)\s+(.+?)(?:\s+-\s+([A-Z\s/]+))?$/);
  if (!match) {
    return {
      intExt: fallback.intExt,
      dayNight: fallback.dayNight,
      setting: clean || fallback.setting,
    };
  }

  const rawIntExt = match[1].replace(/\./g, '');
  const intExt: Scene['intExt'] =
    rawIntExt.includes('INT') && rawIntExt.includes('EXT')
      ? 'INT/EXT'
      : rawIntExt.startsWith('EXT')
      ? 'EXT'
      : 'INT';

  const setting = match[2].trim();
  const rawDayNight = (match[3] || '').trim();
  let dayNight: Scene['dayNight'] = fallback.dayNight;
  if (rawDayNight.includes('NIGHT')) dayNight = 'NIGHT';
  else if (rawDayNight.includes('EVENING')) dayNight = 'EVENING';
  else if (rawDayNight.includes('DUSK')) dayNight = 'DUSK';
  else if (rawDayNight.includes('DAWN')) dayNight = 'DAWN';
  else if (rawDayNight.includes('DAY') || rawDayNight.includes('LATER')) dayNight = 'DAY';

  return { intExt, dayNight, setting };
};

export const deriveLiveSceneSnapshot = (
  scene: Scene,
  elements: ScreenplayElement[],
  tags: Tag[]
): ScheduleSceneSnapshot => {
  const sceneElements = elements.filter((el) => el.sceneId === scene.id);
  const headingEl = sceneElements.find((el) => el.type === 'SCENE_HEADING');
  const effectiveHeading = headingEl?.text.trim() || scene.heading;
  const headingParts = extractHeadingParts(effectiveHeading, scene);

  // Combine declared scene.characters + CHARACTER elements + character tags for this scene
  const charSet = new Set<string>(scene.characters.map((c) => c.trim().toUpperCase()).filter(Boolean));
  sceneElements.forEach((el) => {
    if (el.type === 'CHARACTER' && el.text.trim()) {
      const cleaned = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
      if (cleaned) charSet.add(cleaned);
    }
  });
  tags
    .filter((t) => t.category === 'character' && t.sceneIds.includes(scene.id))
    .forEach((t) => charSet.add(t.name.trim().toUpperCase()));

  // Combine prop tags + deterministic prop mentions inside ACTION/DIALOGUE elements
  const propSet = new Set<string>();
  tags
    .filter((t) => t.category === 'prop' && t.sceneIds.includes(scene.id))
    .forEach((t) => propSet.add(t.name.trim()));
  sceneElements.forEach((el) => {
    if (el.type === 'ACTION' || el.type === 'DIALOGUE') {
      const matches = el.text.match(PROP_KEYWORD_REGEX);
      if (matches) {
        matches.forEach((m) => {
          const formatted = m.replace(/\b\w/g, (l) => l.toUpperCase());
          propSet.add(formatted);
        });
      }
    }
  });

  const wardrobeSet = new Set<string>();
  tags
    .filter((t) => t.category === 'wardrobe' && t.sceneIds.includes(scene.id))
    .forEach((t) => wardrobeSet.add(t.name.trim()));

  // Compute live eighths estimate from actual screenplay elements if edited
  const lineCount = sceneElements.reduce(
    (acc, el) => acc + Math.max(1, Math.ceil(el.text.length / 50)),
    0
  );
  const computedEighths =
    sceneElements.length > 0 ? Math.max(2, Math.min(64, Math.round(lineCount / 6))) : scene.eighths;
  const effectiveEighths = Math.max(scene.eighths, computedEighths);
  const whole = Math.floor(effectiveEighths / 8);
  const rem = effectiveEighths % 8;
  const formattedPages =
    whole > 0 && rem > 0
      ? `${whole} ${rem}/8`
      : whole > 0
      ? `${whole}`
      : `${rem}/8`;

  return {
    sceneId: scene.id,
    sceneNumber: scene.sceneNumber,
    heading: effectiveHeading,
    setting: headingParts.setting,
    intExt: headingParts.intExt,
    dayNight: headingParts.dayNight,
    location: scene.location || headingParts.setting,
    pages: sceneElements.length > 0 ? formattedPages : scene.pages,
    eighths: effectiveEighths,
    storyDay: scene.storyDay,
    timeOfDay: scene.timeOfDay,
    characters: Array.from(charSet).sort(),
    props: Array.from(propSet).sort(),
    wardrobe: Array.from(wardrobeSet).sort(),
  };
};

export const createScheduleBaseline = (project: StoryProject): ScheduleSceneSnapshot[] => {
  return project.scenes.map((sc) => deriveLiveSceneSnapshot(sc, project.elements, project.tags));
};

const findStripShootDay = (strips: StripboardStrip[], sceneId: string): string => {
  let dayCount = 1;
  let dayLabel = 'Day 1';
  for (const strip of strips) {
    if (strip.type === 'day_break') {
      dayLabel = strip.bannerDate || `Day ${dayCount}`;
      dayCount += 1;
    } else if (strip.type === 'scene' && strip.sceneId === sceneId) {
      return dayLabel;
    }
  }
  return 'Unassigned Day';
};

const evaluateCastConflicts = (
  sceneId: string,
  addedCast: string[],
  shootDayLabel: string,
  crewMembers: CastCrewMember[],
  allStrips: StripboardStrip[]
): ScheduleConflictFlag[] => {
  const flags: ScheduleConflictFlag[] = [];
  const dayScenes = new Set<string>();
  let activeDay = 'Day 1';
  let dayCounter = 1;
  allStrips.forEach((s) => {
    if (s.type === 'day_break') {
      activeDay = s.bannerDate || `Day ${dayCounter}`;
      dayCounter += 1;
    } else if (s.type === 'scene' && s.sceneId && activeDay === shootDayLabel) {
      dayScenes.add(s.sceneId);
    }
  });

  addedCast.forEach((charName) => {
    const member = crewMembers.find(
      (m) =>
        m.characterName?.trim().toUpperCase() === charName.toUpperCase() ||
        m.role.toUpperCase().includes(charName.toUpperCase())
    );

    if (!member) {
      flags.push({
        severity: 'warning',
        category: 'cast_unscheduled',
        characterOrItem: charName,
        message: `${charName} added in script has no linked actor in Cast & Crew Directory.`,
        shootDayLabel,
      });
      return;
    }

    if (member.availabilityStatus === 'On Hold' || member.availabilityStatus === 'Wrapped') {
      flags.push({
        severity: 'conflict',
        category: 'cast_unavailable',
        characterOrItem: `${charName} (${member.name})`,
        message: `${member.name} is marked "${member.availabilityStatus}" — conflicts with adding ${charName} to ${shootDayLabel}.`,
        shootDayLabel,
      });
    }

    const overlapsSameDay = Array.from(dayScenes).filter(
      (sid) => sid !== sceneId && member.linkedSceneIds.includes(sid)
    );
    if (overlapsSameDay.length > 0 && member.scheduledDays.length === 0) {
      flags.push({
        severity: 'warning',
        category: 'cast_overlap',
        characterOrItem: `${charName} (${member.name})`,
        message: `${member.name} has ${overlapsSameDay.length} other scene(s) on ${shootDayLabel} with no confirmed day hold.`,
        shootDayLabel,
      });
    }
  });

  return flags;
};

export const computeRevisionImpact = (project: StoryProject): RevisionImpactReport => {
  const baselineMap = new Map<string, ScheduleSceneSnapshot>();
  const baselineList = project.scheduleBaseline || [];
  baselineList.forEach((snap) => baselineMap.set(snap.sceneId, snap));

  const stripByScene = new Map<string, StripboardStrip>();
  project.strips.forEach((s) => {
    if (s.type === 'scene' && s.sceneId) stripByScene.set(s.sceneId, s);
  });

  const knownLocations = new Set<string>(
    project.strips
      .filter((s) => s.type === 'scene' && s.set)
      .map((s) => s.set!.trim().toUpperCase())
  );

  const diffs: SceneSyncDiff[] = [];

  project.scenes.forEach((scene) => {
    const live = deriveLiveSceneSnapshot(scene, project.elements, project.tags);
    const prev = baselineMap.get(scene.id);
    const existingStrip = stripByScene.get(scene.id);

    // Compare against explicit baseline if present, otherwise against live stripboard state
    const refSetting = (prev?.setting || existingStrip?.set || scene.setting).trim().toUpperCase();
    const refCharacters = (
      prev?.characters ||
      existingStrip?.characters ||
      scene.characters
    ).map((c) => c.trim().toUpperCase());
    const refProps = prev?.props || live.props;
    const refWardrobe = prev?.wardrobe || live.wardrobe;
    const refIntExt = (prev?.intExt || existingStrip?.intExt || scene.intExt).toUpperCase();
    const refDayNight = (prev?.dayNight || existingStrip?.dayNight || scene.dayNight).toUpperCase();
    const refEighths = prev?.eighths ?? existingStrip?.eighths ?? scene.eighths;

    const isNewScene = !existingStrip;
    const locationChanged =
      live.setting.trim().toUpperCase() !== refSetting && live.setting.trim() !== '';
    const addedLocations =
      isNewScene || (locationChanged && !knownLocations.has(live.setting.trim().toUpperCase()))
        ? [live.setting]
        : [];

    const prevCharSet = new Set(refCharacters);
    const liveCharSet = new Set(live.characters);
    const addedCast = live.characters.filter((c) => !prevCharSet.has(c));
    const removedCast = refCharacters.filter((c) => !liveCharSet.has(c));

    const prevPropSet = new Set(refProps.map((p) => p.toLowerCase()));
    const livePropSet = new Set(live.props.map((p) => p.toLowerCase()));
    const addedProps = live.props.filter((p) => !prevPropSet.has(p.toLowerCase()));
    const removedProps = refProps.filter((p) => !livePropSet.has(p.toLowerCase()));

    const prevWardSet = new Set(refWardrobe.map((w) => w.toLowerCase()));
    const addedWardrobe = live.wardrobe.filter((w) => !prevWardSet.has(w.toLowerCase()));

    const envChanged = live.intExt !== refIntExt || live.dayNight !== refDayNight;
    const eighthsDelta = live.eighths - refEighths;

    const shootDayLabel = findStripShootDay(project.strips, scene.id);
    const conflicts = evaluateCastConflicts(
      scene.id,
      addedCast,
      shootDayLabel,
      project.crewMembers || [],
      project.strips
    );

    if (addedLocations.length > 0) {
      conflicts.push({
        severity: 'warning',
        category: 'new_location',
        characterOrItem: live.setting,
        message: `New set/location "${live.setting}" requires company move & scout check.`,
        shootDayLabel,
      });
    }
    if (addedProps.length > 0) {
      conflicts.push({
        severity: 'warning',
        category: 'added_prop',
        characterOrItem: addedProps.join(', '),
        message: `${addedProps.length} new prop requirement(s) flagged for Art Dept: ${addedProps.join(', ')}.`,
        shootDayLabel,
      });
    }

    const hasSceneDelta =
      isNewScene ||
      locationChanged ||
      envChanged ||
      addedCast.length > 0 ||
      removedCast.length > 0 ||
      addedProps.length > 0 ||
      removedProps.length > 0 ||
      addedWardrobe.length > 0 ||
      eighthsDelta !== 0;

    if (hasSceneDelta) {
      diffs.push({
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        heading: live.heading,
        status: isNewScene ? 'added_scene' : 'modified',
        liveSnapshot: live,
        previousSnapshot: prev,
        addedLocations,
        changedLocationFrom: locationChanged ? refSetting : undefined,
        addedProps,
        removedProps,
        addedWardrobe,
        addedCast,
        removedCast,
        eighthsDelta,
        conflicts,
      });
    }
  });

  return {
    hasChanges: diffs.length > 0,
    totalImpactedScenes: diffs.length,
    totalAddedProps: diffs.reduce((acc, d) => acc + d.addedProps.length, 0),
    totalNewLocations: diffs.reduce((acc, d) => acc + d.addedLocations.length, 0),
    totalCastConflicts: diffs.reduce(
      (acc, d) => acc + d.conflicts.filter((c) => c.severity === 'conflict').length,
      0
    ),
    totalCastAdditions: diffs.reduce((acc, d) => acc + d.addedCast.length, 0),
    sceneDiffs: diffs,
    generatedAt: new Date().toISOString(),
  };
};

const getStripColorClass = (intExt: string, dayNight: string) => {
  const ie = intExt.toUpperCase();
  const dn = dayNight.toUpperCase();
  if (ie.includes('EXT') && dn === 'DAY') return 'day-ext';
  if (ie.includes('EXT')) return 'night-ext';
  if (dn === 'DAY') return 'day-int';
  return 'night-int';
};

export const commitScriptToScheduleSync = (
  project: StoryProject,
  selectedSceneIds: string[]
): StoryProject => {
  const selectedSet = new Set(selectedSceneIds);
  const report = computeRevisionImpact(project);
  const diffMap = new Map<string, SceneSyncDiff>();
  report.sceneDiffs.forEach((d) => {
    if (selectedSet.has(d.sceneId)) diffMap.set(d.sceneId, d);
  });

  // Update scenes with synced live metadata
  const updatedScenes = project.scenes.map((sc) => {
    const diff = diffMap.get(sc.id);
    if (!diff) return sc;
    const snap = diff.liveSnapshot;
    return {
      ...sc,
      heading: snap.heading,
      setting: snap.setting,
      intExt: snap.intExt,
      dayNight: snap.dayNight,
      pages: snap.pages,
      eighths: snap.eighths,
      characters: snap.characters,
    };
  });

  // Update existing strips & append newly added scenes
  const existingStripSceneIds = new Set<string>();
  const updatedStrips = project.strips.map((strip) => {
    if (strip.type !== 'scene' || !strip.sceneId) return strip;
    existingStripSceneIds.add(strip.sceneId);
    const diff = diffMap.get(strip.sceneId);
    if (!diff) return strip;
    const snap = diff.liveSnapshot;
    return {
      ...strip,
      intExt: snap.intExt,
      dayNight: snap.dayNight,
      set: snap.setting,
      pages: snap.pages,
      eighths: snap.eighths,
      characters: snap.characters,
      colorClass: getStripColorClass(snap.intExt, snap.dayNight),
    };
  });

  report.sceneDiffs.forEach((diff) => {
    if (selectedSet.has(diff.sceneId) && !existingStripSceneIds.has(diff.sceneId)) {
      const snap = diff.liveSnapshot;
      updatedStrips.push({
        id: `strip-sync-${Date.now()}-${snap.sceneNumber}`,
        type: 'scene',
        sceneId: snap.sceneId,
        sceneNumber: snap.sceneNumber,
        intExt: snap.intExt,
        dayNight: snap.dayNight,
        set: snap.setting,
        runningTime: '00:01:00',
        pages: snap.pages,
        eighths: snap.eighths,
        storyDay: snap.storyDay,
        scheduledDuration: '01:30',
        characters: snap.characters,
        timeOfDay: snap.timeOfDay,
        colorClass: getStripColorClass(snap.intExt, snap.dayNight),
      });
    }
  });

  // Update baseline for committed scenes
  const nextBaseline = updatedScenes.map((sc) =>
    deriveLiveSceneSnapshot(sc, project.elements, project.tags)
  );

  const syncRev: ScreenplayRevision = {
    id: `rev-sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    author: project.author || 'Production Sync',
    changeType: 'scene_property_changed',
    description: `Committed Script -> Schedule sync (${selectedSet.size} scene${
      selectedSet.size === 1 ? '' : 's'
    })`,
    draftLabel: project.activeDraftName,
    draftColor: project.activeDraftColor,
  };

  return {
    ...project,
    scenes: updatedScenes,
    strips: updatedStrips,
    scheduleBaseline: nextBaseline,
    lastScheduleSyncAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    revisions: [syncRev, ...(project.revisions || [])],
  };
};

// Two-Way Sync: Stripboard edits -> Live Scene & Script Heading Elements
export const syncStripboardToScript = (
  project: StoryProject,
  updatedStrips: StripboardStrip[]
): StoryProject => {
  const stripMap = new Map<string, StripboardStrip>();
  updatedStrips.forEach((s) => {
    if (s.type === 'scene' && s.sceneId) stripMap.set(s.sceneId, s);
  });

  const updatedHeadingByScene = new Map<string, string>();
  const updatedScenes = project.scenes.map((sc) => {
    const strip = stripMap.get(sc.id);
    if (!strip) return sc;

    const nextIntExt = ((strip.intExt || sc.intExt).toUpperCase() as Scene['intExt']);
    const nextDayNight = ((strip.dayNight || sc.dayNight).toUpperCase() as Scene['dayNight']);
    const nextSetting = (strip.set || sc.setting).toUpperCase();
    const nextHeading = `${nextIntExt}. ${nextSetting} - ${nextDayNight}`;
    const nextCharacters = strip.characters || sc.characters;
    const nextStoryDay = strip.storyDay ?? sc.storyDay;
    const nextTimeOfDay = strip.timeOfDay || sc.timeOfDay;

    if (
      nextHeading !== sc.heading ||
      nextIntExt !== sc.intExt ||
      nextDayNight !== sc.dayNight ||
      nextSetting !== sc.setting
    ) {
      updatedHeadingByScene.set(sc.id, nextHeading);
    }

    return {
      ...sc,
      intExt: nextIntExt,
      dayNight: nextDayNight,
      setting: nextSetting,
      heading: nextHeading,
      characters: nextCharacters,
      storyDay: nextStoryDay,
      timeOfDay: nextTimeOfDay,
    };
  });

  const updatedElements = project.elements.map((el) => {
    if (el.type === 'SCENE_HEADING' && el.sceneId && updatedHeadingByScene.has(el.sceneId)) {
      return { ...el, text: updatedHeadingByScene.get(el.sceneId)! };
    }
    return el;
  });

  const nextBaseline = updatedScenes.map((sc) =>
    deriveLiveSceneSnapshot(sc, updatedElements, project.tags)
  );

  return {
    ...project,
    strips: updatedStrips,
    scenes: updatedScenes,
    elements: updatedElements,
    scheduleBaseline: nextBaseline,
    lastScheduleSyncAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};
