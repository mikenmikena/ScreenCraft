import {
  CastCrewMember,
  CharacterBio,
  CharacterRelationshipEdge,
  CharacterRelationshipPolarity,
  Scene,
  ScreenplayElement,
  StoryCharacter,
  StoryProject,
  Tag,
} from '../types/story';

export const CANVAS_LOGICAL_WIDTH = 1040;
export const CANVAS_LOGICAL_HEIGHT = 680;
export const NODE_CARD_WIDTH = 176;
export const NODE_CARD_HEIGHT = 104;

export interface CharacterGraphNode {
  name: string; // Canonical uppercase character name
  displayName: string;
  color: string;
  actor?: string;
  portraitUrl?: string;
  roleType?: CharacterBio['roleType'];
  loglineSummary?: string;
  arcStartToEnd?: string;
  coreFlawOrTension?: string;
  sceneIds: string[];
  scenesCount: number;
  dialogueLines: number;
  voiceOverLines: number;
  actionMentions: number;
  connectionCount: number;
  x: number;
  y: number;
}

export interface ScriptInteractionSample {
  sceneId: string;
  sceneNumber: number;
  sceneHeading: string;
  kind: 'exchange' | 'co_appearance';
  fromSpeaker?: string;
  toSpeaker?: string;
  fromText?: string;
  toText?: string;
  isVoiceOver?: boolean;
}

export interface CharacterConnectionEdgeModel {
  id: string;
  pairKey: string;
  sourceCharacter: string;
  targetCharacter: string;
  label: string;
  polarity: CharacterRelationshipPolarity;
  direction: 'mutual' | 'source_to_target' | 'target_to_source';
  storyDriver: string;
  arcShift?: string;
  updatedAt?: string;
  isAuthored: boolean;
  sharedScenes: Array<{ id: string; sceneNumber: number; heading: string }>;
  dialogueExchanges: number;
  voiceOverExchanges: number;
  interactionScore: number;
  samples: ScriptInteractionSample[];
}

export interface CharacterConnectionsGraph {
  nodes: CharacterGraphNode[];
  edges: CharacterConnectionEdgeModel[];
  cohesionGaps: CharacterConnectionEdgeModel[];
  stats: {
    characterCount: number;
    totalConnections: number;
    authoredCount: number;
    scriptDerivedCount: number;
    conflictCount: number;
    allianceCount: number;
    cohesionPercent: number;
  };
}

export const POLARITY_META: Record<
  CharacterRelationshipPolarity,
  {
    label: string;
    stroke: string;
    badgeText: string;
    chipBg: string;
    description: string;
  }
> = {
  conflict: {
    label: 'Conflict / Rivalry',
    stroke: '#f43f5e',
    badgeText: 'text-rose-400',
    chipBg: 'bg-rose-950/70 border-rose-700/60 text-rose-300',
    description: 'Opposing objectives, friction, or ideological clash',
  },
  alliance: {
    label: 'Alliance / Trust',
    stroke: '#10b981',
    badgeText: 'text-emerald-400',
    chipBg: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300',
    description: 'Shared goal, tactical partnership, or mutual protection',
  },
  hierarchy: {
    label: 'Authority / Leverage',
    stroke: '#f59e0b',
    badgeText: 'text-amber-400',
    chipBg: 'bg-amber-950/70 border-amber-700/60 text-amber-300',
    description: 'Chain of command, blackmail, or power asymmetry',
  },
  emotional: {
    label: 'Emotional / Bond',
    stroke: '#ec4899',
    badgeText: 'text-pink-400',
    chipBg: 'bg-pink-950/70 border-pink-700/60 text-pink-300',
    description: 'Personal history, loyalty, romance, or family tie',
  },
  mystery: {
    label: 'Hidden Agenda',
    stroke: '#06b6d4',
    badgeText: 'text-cyan-400',
    chipBg: 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300',
    description: 'Unspoken motive, deception, or dramatic irony',
  },
  neutral: {
    label: 'Script Co-Presence',
    stroke: '#71717a',
    badgeText: 'text-zinc-300',
    chipBg: 'bg-zinc-900/80 border-zinc-700/70 text-zinc-300',
    description: 'Detected scene or dialogue overlap awaiting narrative intent',
  },
};

const NODE_PALETTE = [
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#8b5cf6',
  '#f43f5e',
  '#38bdf8',
  '#a3e635',
];

export const normalizeCharacterName = (raw?: string): string =>
  (raw || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export const canonicalPairKey = (a: string, b: string): string => {
  const na = normalizeCharacterName(a);
  const nb = normalizeCharacterName(b);
  return na <= nb ? `${na}::${nb}` : `${nb}::${na}`;
};

const toTitleDisplay = (upperName: string): string =>
  upperName
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const truncateExcerpt = (text: string, max = 78): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
};

export const computeRadialNodePositions = (
  characterNames: string[],
  width: number = CANVAS_LOGICAL_WIDTH,
  height: number = CANVAS_LOGICAL_HEIGHT
): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  const count = characterNames.length;
  if (count === 0) return positions;

  const centerX = width / 2 - NODE_CARD_WIDTH / 2;
  const centerY = height / 2 - NODE_CARD_HEIGHT / 2;

  if (count === 1) {
    positions[characterNames[0]] = { x: Math.round(centerX), y: Math.round(centerY) };
    return positions;
  }

  if (count === 2) {
    positions[characterNames[0]] = { x: Math.round(centerX - 210), y: Math.round(centerY) };
    positions[characterNames[1]] = { x: Math.round(centerX + 210), y: Math.round(centerY) };
    return positions;
  }

  // If 4..8 characters, place the most prominent/first character near center-left or hub
  // and distribute remaining cleanly around an outer ellipse so labels remain readable.
  if (count >= 4 && count <= 8) {
    positions[characterNames[0]] = { x: Math.round(centerX), y: Math.round(centerY) };
    const ring = characterNames.slice(1);
    const rx = Math.min(370, width * 0.36);
    const ry = Math.min(235, height * 0.35);
    ring.forEach((name, idx) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / ring.length;
      positions[name] = {
        x: Math.round(centerX + rx * Math.cos(angle)),
        y: Math.round(centerY + ry * Math.sin(angle)),
      };
    });
    return positions;
  }

  const rx = Math.min(390, width * 0.38);
  const ry = Math.min(245, height * 0.36);
  characterNames.forEach((name, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
    positions[name] = {
      x: Math.round(centerX + rx * Math.cos(angle)),
      y: Math.round(centerY + ry * Math.sin(angle)),
    };
  });

  return positions;
};

export const buildCharacterConnectionsGraph = (
  project: StoryProject,
  sceneFilterId: string = 'all'
): CharacterConnectionsGraph => {
  const scenes: Scene[] = project.scenes || [];
  const filteredScenes =
    sceneFilterId && sceneFilterId !== 'all'
      ? scenes.filter((s) => s.id === sceneFilterId)
      : scenes;
  const filteredSceneIdSet = new Set(filteredScenes.map((s) => s.id));
  const sceneById = new Map<string, Scene>();
  scenes.forEach((s) => sceneById.set(s.id, s));

  const tags: Tag[] = project.tags || [];
  const crewMembers: CastCrewMember[] = project.crewMembers || [];
  const storyChars: StoryCharacter[] = project.characters || [];
  const bios: CharacterBio[] = project.projectBible?.characterBios || [];
  const authoredEdges: CharacterRelationshipEdge[] = project.characterRelationships || [];

  // 1. Discover all canonical character names
  const nameSet = new Set<string>();
  storyChars.forEach((c) => {
    const n = normalizeCharacterName(c.name);
    if (n) nameSet.add(n);
  });
  scenes.forEach((s) => {
    (s.characters || []).forEach((c) => {
      const n = normalizeCharacterName(c);
      if (n) nameSet.add(n);
    });
  });
  (project.elements || []).forEach((el) => {
    if (el.type === 'CHARACTER') {
      const n = normalizeCharacterName(el.text);
      if (n) nameSet.add(n);
    } else if ((el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') && el.character) {
      const n = normalizeCharacterName(el.character);
      if (n) nameSet.add(n);
    }
  });
  bios.forEach((b) => {
    const n = normalizeCharacterName(b.characterName);
    if (n) nameSet.add(n);
  });
  tags
    .filter((t) => t.category === 'character')
    .forEach((t) => {
      const n = normalizeCharacterName(t.name);
      if (n) nameSet.add(n);
    });
  authoredEdges.forEach((edge) => {
    const s = normalizeCharacterName(edge.sourceCharacter);
    const t = normalizeCharacterName(edge.targetCharacter);
    if (s) nameSet.add(s);
    if (t) nameSet.add(t);
  });

  const allCharacterNames = Array.from(nameSet);

  // Per-character accumulators (respecting sceneFilterId for interaction metrics)
  const charSceneSets = new Map<string, Set<string>>();
  const charDialogueCounts = new Map<string, number>();
  const charVoiceOverCounts = new Map<string, number>();
  const charActionMentions = new Map<string, number>();

  allCharacterNames.forEach((name) => {
    charSceneSets.set(name, new Set<string>());
    charDialogueCounts.set(name, 0);
    charVoiceOverCounts.set(name, 0);
    charActionMentions.set(name, 0);
  });

  // Seed scene participation from Scene.characters
  filteredScenes.forEach((sc) => {
    (sc.characters || []).forEach((raw) => {
      const n = normalizeCharacterName(raw);
      if (n && charSceneSets.has(n)) {
        charSceneSets.get(n)!.add(sc.id);
      }
    });
  });

  // 2. Scan ScreenplayElements per scene for exact speaking turns & co-presence
  interface TurnItem {
    speaker: string;
    type: ScreenplayElement['type'];
    text: string;
  }

  interface PairInteractionAccumulator {
    a: string;
    b: string;
    sharedSceneIds: Set<string>;
    dialogueExchanges: number;
    voiceOverExchanges: number;
    samples: ScriptInteractionSample[];
  }

  const pairAccumulators = new Map<string, PairInteractionAccumulator>();
  const ensurePair = (charA: string, charB: string): PairInteractionAccumulator => {
    const key = canonicalPairKey(charA, charB);
    const existing = pairAccumulators.get(key);
    if (existing) return existing;
    const [first, second] = charA <= charB ? [charA, charB] : [charB, charA];
    const created: PairInteractionAccumulator = {
      a: first,
      b: second,
      sharedSceneIds: new Set<string>(),
      dialogueExchanges: 0,
      voiceOverExchanges: 0,
      samples: [],
    };
    pairAccumulators.set(key, created);
    return created;
  };

  // Group elements by sceneId (preserving script order)
  const elementsByScene = new Map<string, ScreenplayElement[]>();
  let fallbackSceneId = scenes[0]?.id || 'scene-1';
  (project.elements || []).forEach((el) => {
    const sid = el.sceneId || fallbackSceneId;
    fallbackSceneId = sid;
    if (!filteredSceneIdSet.has(sid)) return;
    const list = elementsByScene.get(sid) || [];
    list.push(el);
    elementsByScene.set(sid, list);
  });

  filteredScenes.forEach((scene) => {
    const sceneEls = elementsByScene.get(scene.id) || [];
    const sceneParticipants = new Set<string>();
    (scene.characters || []).forEach((c) => {
      const n = normalizeCharacterName(c);
      if (n) sceneParticipants.add(n);
    });

    const turns: TurnItem[] = [];
    let currentSpeaker: string | undefined;

    sceneEls.forEach((el) => {
      if (el.type === 'CHARACTER') {
        const speaker = normalizeCharacterName(el.text);
        if (speaker) {
          currentSpeaker = speaker;
          sceneParticipants.add(speaker);
          charSceneSets.get(speaker)?.add(scene.id);
        }
      } else if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') {
        const speaker = normalizeCharacterName(el.character) || currentSpeaker;
        if (speaker) {
          currentSpeaker = speaker;
          sceneParticipants.add(speaker);
          charSceneSets.get(speaker)?.add(scene.id);
          if (el.type === 'VOICE_OVER') {
            charVoiceOverCounts.set(speaker, (charVoiceOverCounts.get(speaker) || 0) + 1);
          } else {
            charDialogueCounts.set(speaker, (charDialogueCounts.get(speaker) || 0) + 1);
          }
          if (el.text.trim()) {
            turns.push({ speaker, type: el.type, text: el.text });
          }
        }
      } else if (el.type === 'ACTION') {
        currentSpeaker = undefined;
        const upperAction = el.text.toUpperCase();
        allCharacterNames.forEach((charName) => {
          const lastWord = charName.split(' ').pop() || charName;
          if (
            upperAction.includes(charName) ||
            (lastWord.length >= 4 && new RegExp(`\\b${lastWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(upperAction))
          ) {
            charActionMentions.set(charName, (charActionMentions.get(charName) || 0) + 1);
            charSceneSets.get(charName)?.add(scene.id);
            sceneParticipants.add(charName);
          }
        });
      } else if (el.type === 'SCENE_HEADING' || el.type === 'TRANSITION' || el.type === 'SHOT') {
        currentSpeaker = undefined;
      }
    });

    // Record co-appearance for every pair in this scene
    const participantList = Array.from(sceneParticipants).sort();
    for (let i = 0; i < participantList.length; i++) {
      for (let j = i + 1; j < participantList.length; j++) {
        const pair = ensurePair(participantList[i], participantList[j]);
        pair.sharedSceneIds.add(scene.id);
      }
    }

    // Record consecutive dialogue/VO exchanges between two distinct characters
    let sceneRecordedExchanges = new Set<string>();
    for (let i = 1; i < turns.length; i++) {
      const prev = turns[i - 1];
      const curr = turns[i];
      if (prev.speaker === curr.speaker) continue;
      const pair = ensurePair(prev.speaker, curr.speaker);
      pair.sharedSceneIds.add(scene.id);
      pair.dialogueExchanges += 1;
      const isVO = prev.type === 'VOICE_OVER' || curr.type === 'VOICE_OVER';
      if (isVO) pair.voiceOverExchanges += 1;

      if (!sceneRecordedExchanges.has(pair.a + '::' + pair.b) || pair.samples.length < 4) {
        pair.samples.push({
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          sceneHeading: scene.heading,
          kind: 'exchange',
          fromSpeaker: prev.speaker,
          toSpeaker: curr.speaker,
          fromText: truncateExcerpt(prev.text),
          toText: truncateExcerpt(curr.text),
          isVoiceOver: isVO,
        });
        sceneRecordedExchanges.add(pair.a + '::' + pair.b);
      }
    }

    // Add co-appearance evidence when two characters share a scene without direct back-and-forth turns
    for (let i = 0; i < participantList.length; i++) {
      for (let j = i + 1; j < participantList.length; j++) {
        const pair = ensurePair(participantList[i], participantList[j]);
        const hasSceneExchange = pair.samples.some(
          (sm) => sm.sceneId === scene.id && sm.kind === 'exchange'
        );
        if (!hasSceneExchange && pair.samples.length < 4) {
          pair.samples.push({
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            sceneHeading: scene.heading,
            kind: 'co_appearance',
          });
        }
      }
    }
  });

  // 3. Build Edges: Start with Authored Relationships, then append un-authored script pairs
  const edges: CharacterConnectionEdgeModel[] = [];
  const authoredPairKeys = new Set<string>();

  const buildSharedScenesList = (sceneIdSet?: Set<string>) =>
    Array.from(sceneIdSet || [])
      .map((sid) => sceneById.get(sid))
      .filter((s): s is Scene => Boolean(s))
      .sort((a, b) => a.sceneNumber - b.sceneNumber)
      .map((s) => ({ id: s.id, sceneNumber: s.sceneNumber, heading: s.heading }));

  authoredEdges.forEach((rawEdge) => {
    const source = normalizeCharacterName(rawEdge.sourceCharacter);
    const target = normalizeCharacterName(rawEdge.targetCharacter);
    if (!source || !target || source === target) return;

    const pKey = canonicalPairKey(source, target);
    authoredPairKeys.add(pKey);
    const acc = pairAccumulators.get(pKey);
    const sharedScenes = buildSharedScenesList(acc?.sharedSceneIds);
    const dialogueExchanges = acc?.dialogueExchanges || 0;
    const voiceOverExchanges = acc?.voiceOverExchanges || 0;
    const interactionScore =
      sharedScenes.length * 3 + dialogueExchanges * 2 + (rawEdge.storyDriver.trim() ? 4 : 0);

    // If a scene filter is active, keep authored edge if both characters appear in filtered scenes OR if at least one appears
    if (sceneFilterId !== 'all') {
      const sCount = charSceneSets.get(source)?.size || 0;
      const tCount = charSceneSets.get(target)?.size || 0;
      if (sCount === 0 && tCount === 0) return;
    }

    edges.push({
      id: rawEdge.id,
      pairKey: pKey,
      sourceCharacter: source,
      targetCharacter: target,
      label: rawEdge.label.trim() || 'Connected Dynamic',
      polarity: rawEdge.polarity,
      direction: rawEdge.direction,
      storyDriver: rawEdge.storyDriver,
      arcShift: rawEdge.arcShift,
      updatedAt: rawEdge.updatedAt,
      isAuthored: true,
      sharedScenes,
      dialogueExchanges,
      voiceOverExchanges,
      interactionScore,
      samples: acc?.samples || [],
    });
  });

  // Add script-discovered interactions for pairs without an authored relationship
  pairAccumulators.forEach((acc, pKey) => {
    if (authoredPairKeys.has(pKey)) return;
    const sharedScenes = buildSharedScenesList(acc.sharedSceneIds);
    if (sharedScenes.length === 0 && acc.dialogueExchanges === 0) return;

    const label =
      acc.dialogueExchanges > 0
        ? `${acc.dialogueExchanges} Spoken Exchange${acc.dialogueExchanges === 1 ? '' : 's'}`
        : `${sharedScenes.length} Shared Scene${sharedScenes.length === 1 ? '' : 's'}`;

    edges.push({
      id: `derived-${pKey}`,
      pairKey: pKey,
      sourceCharacter: acc.a,
      targetCharacter: acc.b,
      label,
      polarity: 'neutral',
      direction: 'mutual',
      storyDriver: '',
      isAuthored: false,
      sharedScenes,
      dialogueExchanges: acc.dialogueExchanges,
      voiceOverExchanges: acc.voiceOverExchanges,
      interactionScore: sharedScenes.length * 3 + acc.dialogueExchanges * 2,
      samples: acc.samples,
    });
  });

  // Sort edges: authored + highest script interaction first
  edges.sort((a, b) => {
    if (a.isAuthored !== b.isAuthored) return a.isAuthored ? -1 : 1;
    return b.interactionScore - a.interactionScore;
  });

  // 4. Filter visible character nodes if sceneFilterId is active
  const visibleNames =
    sceneFilterId === 'all'
      ? allCharacterNames
      : allCharacterNames.filter((name) => {
          const inScene = (charSceneSets.get(name)?.size || 0) > 0;
          const inEdge = edges.some(
            (e) => e.sourceCharacter === name || e.targetCharacter === name
          );
          return inScene || inEdge;
        });

  // Compute node degree & prominence to order default radial layout cleanly
  const degreeMap = new Map<string, number>();
  visibleNames.forEach((n) => degreeMap.set(n, 0));
  edges.forEach((e) => {
    degreeMap.set(e.sourceCharacter, (degreeMap.get(e.sourceCharacter) || 0) + 1);
    degreeMap.set(e.targetCharacter, (degreeMap.get(e.targetCharacter) || 0) + 1);
  });

  const sortedForLayout = [...visibleNames].sort((a, b) => {
    const degDiff = (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0);
    if (degDiff !== 0) return degDiff;
    const scDiff = (charSceneSets.get(b)?.size || 0) - (charSceneSets.get(a)?.size || 0);
    if (scDiff !== 0) return scDiff;
    return a.localeCompare(b);
  });

  const defaultPositions = computeRadialNodePositions(sortedForLayout);
  const savedPositions = project.characterNodePositions || {};

  const nodes: CharacterGraphNode[] = sortedForLayout.map((name, idx) => {
    const matchedTag = tags.find(
      (t) => t.category === 'character' && normalizeCharacterName(t.name) === name
    );
    const matchedStoryChar = storyChars.find((c) => normalizeCharacterName(c.name) === name);
    const matchedBio = bios.find((b) => normalizeCharacterName(b.characterName) === name);
    const matchedCast = crewMembers.find(
      (m) =>
        m.category === 'cast' &&
        (normalizeCharacterName(m.characterName) === name ||
          normalizeCharacterName(m.role).includes(name))
    );

    const portraitUrl =
      matchedCast?.avatarUrl?.trim() ||
      matchedTag?.image?.trim() ||
      matchedStoryChar?.image?.trim() ||
      undefined;

    const color =
      matchedTag?.color ||
      matchedStoryChar?.color ||
      NODE_PALETTE[idx % NODE_PALETTE.length];

    const sceneIds = Array.from(charSceneSets.get(name) || []);
    const savedPos = savedPositions[name];
    const fallbackPos = defaultPositions[name] || { x: 120 + idx * 40, y: 120 + idx * 30 };

    return {
      name,
      displayName: toTitleDisplay(name),
      color,
      actor: matchedCast?.name || matchedStoryChar?.actor,
      portraitUrl,
      roleType: matchedBio?.roleType,
      loglineSummary: matchedBio?.loglineSummary,
      arcStartToEnd: matchedBio?.arcStartToEnd,
      coreFlawOrTension: matchedBio?.coreFlawOrTension,
      sceneIds,
      scenesCount: sceneIds.length,
      dialogueLines: charDialogueCounts.get(name) || 0,
      voiceOverLines: charVoiceOverCounts.get(name) || 0,
      actionMentions: charActionMentions.get(name) || 0,
      connectionCount: degreeMap.get(name) || 0,
      x: savedPos ? savedPos.x : fallbackPos.x,
      y: savedPos ? savedPos.y : fallbackPos.y,
    };
  });

  const cohesionGaps = edges
    .filter((e) => !e.isAuthored || !e.storyDriver.trim())
    .sort((a, b) => b.interactionScore - a.interactionScore);

  const authoredCount = edges.filter((e) => e.isAuthored).length;
  const scriptDerivedCount = edges.filter((e) => !e.isAuthored).length;
  const conflictCount = edges.filter((e) => e.polarity === 'conflict').length;
  const allianceCount = edges.filter((e) => e.polarity === 'alliance').length;
  const documentedCount = edges.filter((e) => e.isAuthored && e.storyDriver.trim().length > 0).length;
  const cohesionPercent =
    edges.length === 0 ? 100 : Math.round((documentedCount / edges.length) * 100);

  return {
    nodes,
    edges,
    cohesionGaps,
    stats: {
      characterCount: nodes.length,
      totalConnections: edges.length,
      authoredCount,
      scriptDerivedCount,
      conflictCount,
      allianceCount,
      cohesionPercent,
    },
  };
};
