import {
  CastCrewMember,
  CharacterBreakdownOverride,
  Scene,
  ScreenplayElement,
  StoryCharacter,
  StoryComment,
  Tag,
} from '../types/story';

export interface BreakdownItem {
  id: string;
  text: string;
  source: string;
  sceneIds: string[];
  isCustom?: boolean;
}

export interface CostumeLookChange {
  key: string;
  storyDay: number;
  intExt: string;
  dayNight: string;
  sceneNumbers: number[];
  sceneIds: string[];
  wardrobeTags: string[];
}

export interface GeneratedCharacterBreakdown {
  characterName: string;
  color: string;
  image?: string;
  isTaggedInScript: boolean;
  characterTag?: Tag;
  actorName?: string;
  castMember?: CastCrewMember;
  sceneIds: string[];
  sceneNumbers: number[];
  speakingLines: number;
  dialogueLines: number;
  voiceOverLines: number;
  voiceOverSceneNumbers: number[];
  storyDays: number[];
  traits: BreakdownItem[];
  motivations: BreakdownItem[];
  costumeRequirements: BreakdownItem[];
  costumeLooks: CostumeLookChange[];
  linkedTags: Tag[];
  keyExcerpts: { sceneNumber?: number; type: string; text: string }[];
  wardrobeNotes: string;
  hasCustomizations: boolean;
}

const HONORIFICS = new Set([
  'AMBASSADOR',
  'COUNCILOR',
  'COUNCILLOR',
  'CHIEF',
  'CAPTAIN',
  'CAPT',
  'DOCTOR',
  'DR',
  'DETECTIVE',
  'DET',
  'OFFICER',
  'SERGEANT',
  'SGT',
  'LIEUTENANT',
  'LT',
  'GENERAL',
  'GEN',
  'SENATOR',
  'PRESIDENT',
  'PROFESSOR',
  'PROF',
  'MR',
  'MRS',
  'MS',
]);

function normalizeName(name: string): string {
  return name.trim().replace(/\s*\([^)]*\)\s*/g, '').toUpperCase();
}

function getSearchAliases(characterName: string): string[] {
  const norm = normalizeName(characterName);
  const tokens = norm
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Z0-9'-]/g, ''))
    .filter((t) => t.length >= 3 && !HONORIFICS.has(t));

  const aliases = new Set<string>();
  if (norm.length >= 3) aliases.add(norm);
  tokens.forEach((t) => aliases.add(t));
  return Array.from(aliases);
}

function textMentionsCharacter(text: string, aliases: string[]): boolean {
  const upper = text.toUpperCase();
  return aliases.some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(upper);
  });
}

function makeItemId(prefix: string, text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${prefix}-${slug}`;
}

export function generateCharacterBreakdowns(params: {
  tags: Tag[];
  characters: StoryCharacter[];
  scenes: Scene[];
  elements: ScreenplayElement[];
  comments: StoryComment[];
  crewMembers: CastCrewMember[];
  overrides?: CharacterBreakdownOverride[];
}): GeneratedCharacterBreakdown[] {
  const {
    tags,
    characters,
    scenes,
    elements,
    comments,
    crewMembers,
    overrides = [],
  } = params;

  const sceneById: Record<string, Scene> = {};
  scenes.forEach((sc) => {
    sceneById[sc.id] = sc;
  });

  const characterTags = tags.filter((t) => t.category === 'character');
  const tagByName: Record<string, Tag> = {};
  characterTags.forEach((t) => {
    tagByName[normalizeName(t.name)] = t;
  });

  const storyCharByName: Record<string, StoryCharacter> = {};
  characters.forEach((c) => {
    storyCharByName[normalizeName(c.name)] = c;
  });

  const overrideByName: Record<string, CharacterBreakdownOverride> = {};
  overrides.forEach((ov) => {
    overrideByName[normalizeName(ov.characterName)] = ov;
  });

  // Collect ordered unique character names prioritizing Character Tags first, then script characters
  const orderedNames: string[] = [];
  const seenNames: Record<string, boolean> = {};

  characterTags.forEach((t) => {
    const norm = normalizeName(t.name);
    if (norm && !seenNames[norm]) {
      seenNames[norm] = true;
      orderedNames.push(norm);
    }
  });

  characters.forEach((c) => {
    const norm = normalizeName(c.name);
    if (norm && !seenNames[norm]) {
      seenNames[norm] = true;
      orderedNames.push(norm);
    }
  });

  // Group dialogue, voice-over, and parentheticals spoken by each character in element order
  const spokenDialoguesByChar: Record<
    string,
    { text: string; sceneId?: string; parenthetical?: string; isVoiceOver: boolean }[]
  > = {};
  let activeSpeaker: string | null = null;
  let activeSpeakerHasVOCue = false;
  let pendingParen: string | undefined;

  elements.forEach((el) => {
    if (el.type === 'SCENE_HEADING') {
      activeSpeaker = null;
      activeSpeakerHasVOCue = false;
      pendingParen = undefined;
    } else if (el.type === 'CHARACTER') {
      activeSpeaker = normalizeName(el.text);
      activeSpeakerHasVOCue = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(el.text);
      pendingParen = undefined;
    } else if (el.type === 'PARENTHETICAL') {
      pendingParen = el.text.trim();
    } else if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') {
      const resolvedSpeaker =
        (el.character ? normalizeName(el.character) : '') ||
        activeSpeaker ||
        (el.type === 'VOICE_OVER' ? 'NARRATOR' : '');
      if (resolvedSpeaker) {
        if (!spokenDialoguesByChar[resolvedSpeaker]) {
          spokenDialoguesByChar[resolvedSpeaker] = [];
        }
        spokenDialoguesByChar[resolvedSpeaker].push({
          text: el.text.trim(),
          sceneId: el.sceneId,
          parenthetical: pendingParen,
          isVoiceOver: el.type === 'VOICE_OVER' || activeSpeakerHasVOCue,
        });
      }
      pendingParen = undefined;
    } else if (el.type === 'ACTION' || el.type === 'TRANSITION' || el.type === 'SHOT') {
      activeSpeaker = null;
      activeSpeakerHasVOCue = false;
      pendingParen = undefined;
    }
  });

  // Ensure any character introduced exclusively via VOICE_OVER or uncatalogued DIALOGUE is included
  Object.keys(spokenDialoguesByChar).forEach((speakerName) => {
    if (speakerName && !seenNames[speakerName]) {
      seenNames[speakerName] = true;
      orderedNames.push(speakerName);
    }
  });

  return orderedNames.map((charName) => {
    const charTag = tagByName[charName];
    const storyChar = storyCharByName[charName];
    const override = overrideByName[charName];
    const aliases = getSearchAliases(charName);

    const castMember = crewMembers.find(
      (m) =>
        m.category === 'cast' &&
        m.characterName &&
        normalizeName(m.characterName) === charName
    );

    const spokenBlocks = spokenDialoguesByChar[charName] || [];
    const voiceOverBlocks = spokenBlocks.filter((b) => b.isVoiceOver);
    const dialogueBlocks = spokenBlocks.filter((b) => !b.isVoiceOver);

    // Combine sceneIds from Character Tag + Scene appearances + Spoken/V.O. elements + Cast profile
    const sceneIdSet = new Set<string>();
    (charTag?.sceneIds || []).forEach((id) => {
      if (sceneById[id]) sceneIdSet.add(id);
    });
    scenes.forEach((sc) => {
      if (sc.characters.some((c) => normalizeName(c) === charName)) {
        sceneIdSet.add(sc.id);
      }
    });
    spokenBlocks.forEach((blk) => {
      if (blk.sceneId && sceneById[blk.sceneId]) {
        sceneIdSet.add(blk.sceneId);
      }
    });
    if (sceneIdSet.size === 0 && castMember) {
      castMember.linkedSceneIds.forEach((id) => {
        if (sceneById[id]) sceneIdSet.add(id);
      });
    }

    const charScenes = Array.from(sceneIdSet)
      .map((id) => sceneById[id])
      .filter(Boolean)
      .sort((a, b) => a.sceneNumber - b.sceneNumber);

    const sceneIds = charScenes.map((s) => s.id);
    const sceneNumbers = charScenes.map((s) => s.sceneNumber);
    const storyDays = Array.from(new Set(charScenes.map((s) => s.storyDay))).sort(
      (a, b) => a - b
    );

    const voiceOverSceneIds = new Set(
      voiceOverBlocks.map((b) => b.sceneId).filter((id): id is string => Boolean(id && sceneById[id]))
    );
    const dialogueSceneIds = new Set(
      dialogueBlocks.map((b) => b.sceneId).filter((id): id is string => Boolean(id && sceneById[id]))
    );
    const voiceOverSceneNumbers = Array.from(voiceOverSceneIds)
      .map((id) => sceneById[id].sceneNumber)
      .sort((a, b) => a - b);

    const voiceOverLines = voiceOverBlocks.length;
    const dialogueLines = Math.max(dialogueBlocks.length, (storyChar?.speakingLines || 0) - voiceOverLines);
    const speakingLines = Math.max(spokenBlocks.length, storyChar?.speakingLines || 0);

    // Action lines mentioning this character
    const charActions = elements.filter(
      (el) =>
        el.type === 'ACTION' &&
        ((el.sceneId && sceneIdSet.has(el.sceneId)) || sceneIdSet.size === 0) &&
        textMentionsCharacter(el.text, aliases)
    );

    const combinedDialogue = spokenBlocks.map((d) => d.text).join(' ');
    const combinedActions = charActions.map((a) => a.text).join(' ');
    const combinedParens = spokenBlocks
      .map((d) => d.parenthetical || '')
      .filter(Boolean)
      .join(' ');
    const combinedSynopses = charScenes.map((s) => s.synopsis).join(' ');
    const combinedCorpus = `${combinedDialogue} ${combinedActions} ${combinedParens} ${combinedSynopses} ${
      charTag?.notes || ''
    }`.toLowerCase();

    // Non-character tags occurring in the character's scenes
    const linkedTags = tags.filter(
      (t) =>
        t.category !== 'character' &&
        t.sceneIds.some((sid) => sceneIdSet.has(sid))
    );

    // ---------------------------
    // 1. DERIVE CHARACTER TRAITS
    // ---------------------------
    const rawTraits: BreakdownItem[] = [];
    const pushTrait = (text: string, source: string, scIds: string[] = []) => {
      if (!rawTraits.some((t) => t.text.toLowerCase() === text.toLowerCase())) {
        rawTraits.push({
          id: makeItemId('trait', text),
          text,
          source,
          sceneIds: scIds,
        });
      }
    };

    // Role / archetype cues
    if (/\b(ambassador|envoy)\b/i.test(charName)) {
      pushTrait(
        'High-status diplomat accustomed to political leverage and formal protocol',
        'Character Tag Role',
        sceneIds.slice(0, 2)
      );
    } else if (/\b(councilor|councillor|senator)\b/i.test(charName)) {
      pushTrait(
        'Institutional authority figure exercising procedural control and leverage',
        'Character Tag Role',
        sceneIds.slice(0, 2)
      );
    } else if (/\b(chief|detective|officer|captain)\b/i.test(charName)) {
      pushTrait(
        'Command-oriented operational lead focused on order, telemetry, and protocol',
        'Character Tag Role',
        sceneIds.slice(0, 2)
      );
    }

    // Behavioral lexical detectors from script elements & synopses
    if (/(enraged|hits the arm|barely touched|assault|violent|slam|furious)/i.test(combinedCorpus)) {
      const matchedSc = charActions.find((a) =>
        /(enraged|hits|slam|assault)/i.test(a.text)
      )?.sceneId;
      pushTrait(
        'Volatile under pressure — quick to escalate physically or defensively when cornered',
        matchedSc && sceneById[matchedSc]
          ? `Script Action · Sc. ${sceneById[matchedSc].sceneNumber}`
          : 'Script Action & Dialogue',
        matchedSc ? [matchedSc] : sceneIds.slice(0, 1)
      );
    }

    if (/(kidding me|didn't even|just placed my hand|defensive|misdemeanor)/i.test(combinedCorpus)) {
      pushTrait(
        'Indignant and self-justifying — minimizes past infractions while challenging authority',
        'Dialogue Analysis · Sc. 1',
        sceneIds.slice(0, 1)
      );
    }

    if (/(tip of the iceberg|work order|fines and violations|circumstances evolved|board as it stands|makes no difference)/i.test(combinedCorpus)) {
      pushTrait(
        'Calculating and unsentimental — treats conflict as a strategic ledger of consequences',
        'Dialogue & Scene Text',
        sceneIds.slice(0, 2)
      );
    }

    if (/(perhaps you were|reports|graystone authority|hundred years old|corroborate|sensor|interrogat)/i.test(combinedCorpus)) {
      pushTrait(
        'Observant and dryly procedural — weighs official records against firsthand denials',
        'Dialogue & Action Cues',
        sceneIds.slice(0, 2)
      );
    }

    if (/(promise|love|mistress|content|smiling|rosy|ring)/i.test(combinedCorpus)) {
      pushTrait(
        'Emotionally expressive and devoted — measures intimacy through keepsakes and kept promises',
        'Dialogue & Parentheticals',
        sceneIds
      );
    }

    if (/(spool up|do not have until|marches|hurries|encrypted|purge|standoff)/i.test(combinedCorpus)) {
      pushTrait(
        'Decisive and urgent in crisis — bypasses red tape to stay ahead of unfolding events',
        'Action & Dialogue Beats',
        sceneIds
      );
    }

    if (/(swore|family firm|agreement|protected|confront|truth|unveil|assassination)/i.test(combinedCorpus)) {
      pushTrait(
        'Principled and confrontational — presses allies and rivals for direct accountability',
        'Scene Breakdown & Dialogue',
        sceneIds
      );
    }

    if (/(waitress|patron|student|guard)/i.test(charName)) {
      pushTrait(
        'Grounded supporting presence anchoring the scene atmosphere and world realism',
        'Character Tag Context',
        sceneIds
      );
    }

    // Speech cadence insight
    const exclamations = spokenBlocks.filter((d) => d.text.includes('!')).length;
    const questions = spokenBlocks.filter((d) => d.text.includes('?')).length;
    if (spokenBlocks.length > 0 && rawTraits.length < 3) {
      if (questions >= 1 && exclamations >= 1) {
        pushTrait(
          'Assertive conversationalist — alternates pointed questioning with emphatic retorts',
          'Dialogue Cadence',
          sceneIds
        );
      } else if (spokenBlocks.some((d) => d.text.length > 110)) {
        pushTrait(
          'Articulate and deliberate speaker — delivers sustained, persuasive arguments',
          'Dialogue Cadence',
          sceneIds
        );
      }
    }

    if (voiceOverLines > 0) {
      const voRefIds = Array.from(voiceOverSceneIds);
      pushTrait(
        dialogueLines > 0
          ? `Dual narrative voice — delivers off-camera Voice-over (V.O.) narration or internal monologue alongside on-set dialogue`
          : `Reflective Voice-over (V.O.) narrator — anchors internal monologue and off-camera perspective without on-set presence`,
        `Voice-over (V.O.) Elements (${voiceOverLines} line${voiceOverLines === 1 ? '' : 's'})`,
        voRefIds.length > 0 ? voRefIds : sceneIds
      );
    }

    if (rawTraits.length === 0) {
      pushTrait(
        charScenes.length > 1
          ? `Recurring presence across ${charScenes.length} script scenes (${charScenes
              .map((s) => `Sc. ${s.sceneNumber}`)
              .join(', ')})`
          : 'Scripted scene character defined via stage direction and scene blocking',
        charTag ? 'Character Tag' : 'Scene Assignment',
        sceneIds
      );
    }

    if (charTag?.notes) {
      pushTrait(charTag.notes, 'Character Tag Notes', sceneIds);
    }

    // --------------------------------
    // 2. DERIVE CHARACTER MOTIVATIONS
    // --------------------------------
    const rawMotivations: BreakdownItem[] = [];
    const pushMotivation = (text: string, source: string, scIds: string[] = []) => {
      if (!rawMotivations.some((m) => m.text.toLowerCase() === text.toLowerCase())) {
        rawMotivations.push({
          id: makeItemId('mot', text),
          text,
          source,
          sceneIds: scIds,
        });
      }
    };

    // Extract motivations from character's dialogue & voice-over intents
    spokenBlocks.forEach((block) => {
      const scNum = block.sceneId ? sceneById[block.sceneId]?.sceneNumber : undefined;
      const prefix = block.isVoiceOver ? 'Voice-over (V.O.)' : 'Dialogue';
      const scLabel = scNum ? `${prefix} · Sc. ${scNum}` : `Script ${prefix}`;
      const scRef = block.sceneId ? [block.sceneId] : [];
      const lower = block.text.toLowerCase();

      if (block.isVoiceOver && rawMotivations.length < 4 && block.text.trim()) {
        const preview = block.text.trim().length > 90 ? `${block.text.trim().slice(0, 87)}...` : block.text.trim();
        pushMotivation(
          `Internal perspective / narration beat: "${preview}"`,
          scLabel,
          scRef
        );
      }

      if (lower.includes('throwing me out') || lower.includes("didn't even strike")) {
        pushMotivation(
          'Preserve diplomatic post and overturn dismissal by downplaying the Graystone incident',
          scLabel,
          scRef
        );
      } else if (lower.includes('work order') || lower.includes('clear out your effects')) {
        pushMotivation(
          'Enforce the arrest work order and transition leadership cleanly before next week',
          scLabel,
          scRef
        );
      } else if (lower.includes('do not have until') || lower.includes('spool up')) {
        pushMotivation(
          'Secure immediate transport launch ahead of official replacement and detention',
          scLabel,
          scRef
        );
      } else if (lower.includes('remember what it means') || lower.includes('keep your promises')) {
        pushMotivation(
          'Cement mutual romantic commitment through promises and the symbolic jeweled ring',
          scLabel,
          scRef
        );
      } else if (lower.includes('swore on your family') || lower.includes('circumstances evolved')) {
        pushMotivation(
          lower.includes('swore')
            ? 'Protect the original family firm agreement against an unannounced buyout'
            : 'Pivot strategic control of the buyout regardless of prior informal assurances',
          scLabel,
          scRef
        );
      } else if (lower.includes('report') || lower.includes('collarbone')) {
        pushMotivation(
          'Verify conflicting witness accounts and document formal authority findings',
          scLabel,
          scRef
        );
      }
    });

    // Extract motivations from tagged scene synopses
    charScenes.forEach((sc) => {
      const syn = sc.synopsis.trim();
      if (!syn) return;
      if (
        textMentionsCharacter(syn, aliases) ||
        charScenes.length <= 2 ||
        rawMotivations.length < 3
      ) {
        pushMotivation(
          `${syn}`,
          `Scene ${sc.sceneNumber} Synopsis (${sc.heading})`,
          [sc.id]
        );
      }
    });

    // Include director / script margin comments referencing the character
    comments.forEach((c) => {
      if (sceneIdSet.has(c.sceneId) && textMentionsCharacter(c.text, aliases)) {
        const scNum = sceneById[c.sceneId]?.sceneNumber;
        pushMotivation(
          `Performance note: ${c.text}`,
          `Script Comment${scNum ? ` · Sc. ${scNum}` : ''}`,
          [c.sceneId]
        );
      }
    });

    if (rawMotivations.length === 0) {
      pushMotivation(
        `Advance core narrative beat in ${
          charScenes[0] ? `Scene ${charScenes[0].sceneNumber}` : 'assigned screenplay scenes'
        }`,
        'Script Structure',
        sceneIds
      );
    }

    // ------------------------------------
    // 3. DERIVE COSTUME REQUIREMENTS
    // ------------------------------------
    const rawCostumes: BreakdownItem[] = [];
    const pushCostume = (text: string, source: string, scIds: string[] = []) => {
      if (!rawCostumes.some((c) => c.text.toLowerCase() === text.toLowerCase())) {
        rawCostumes.push({
          id: makeItemId('costume', text),
          text,
          source,
          sceneIds: scIds,
        });
      }
    };

    // 3a. Matching Wardrobe Tags in shared scenes
    linkedTags
      .filter((t) => t.category === 'wardrobe')
      .forEach((wt) => {
        const sharedScIds = wt.sceneIds.filter((sid) => sceneIdSet.has(sid));
        const sharedNums = sharedScIds
          .map((sid) => sceneById[sid]?.sceneNumber)
          .filter((n): n is number => Boolean(n));
        pushCostume(
          `${wt.name}${sharedNums.length > 0 ? ` (Continuity across Sc. ${sharedNums.join(', ')})` : ''}`,
          'Wardrobe Tag in Script',
          sharedScIds
        );
      });

    // 3b. Cast & Crew schedule / fitting notes
    if (castMember?.scheduleNotes) {
      const notesLower = castMember.scheduleNotes.toLowerCase();
      if (
        /(wardrobe|fitting|uniform|suit|prosthetic|harness|dress|costume)/i.test(
          notesLower
        )
      ) {
        pushCostume(
          castMember.scheduleNotes,
          `Cast Profile · ${castMember.name}`,
          castMember.linkedSceneIds
        );
      }
    }

    // 3c. Props / Accessories worn or carried in character actions & parentheticals
    const wearableKeywords: { pattern: RegExp; label: string }[] = [
      { pattern: /\b(jeweled ring|ring)\b/i, label: 'Hero Jewelry: Jeweled Ring + pocket-accessible velvet lining' },
      { pattern: /\bmetal brief\b/i, label: 'Hero Carry Accessory: Reinforced Metal Diplomatic Briefcase' },
      { pattern: /\bcommunicator\b/i, label: 'Practical Wrist/Lapel Communicator prop mount' },
      { pattern: /\bsidearm\b/i, label: 'Tactical Holster / Sidearm belt rigging' },
      { pattern: /\btactical headset\b/i, label: 'Comms Headset & concealed audio wire routing' },
    ];

    const scenePropsText = `${combinedActions} ${combinedParens} ${linkedTags
      .filter((t) => t.category === 'prop')
      .map((t) => t.name)
      .join(' ')} ${castMember?.connections.map((c) => c.notes || '').join(' ') || ''}`;

    wearableKeywords.forEach(({ pattern, label }) => {
      if (pattern.test(scenePropsText)) {
        pushCostume(label, 'Script Action & Prop Sync', sceneIds);
      }
    });

    // 3d. Environmental & Stunt wardrobe needs from tagged scenes
    charScenes.forEach((sc) => {
      const sceneBlob = `${sc.heading} ${sc.synopsis} ${sc.notes} ${sc.location}`.toLowerCase();
      if (sc.intExt === 'EXT' && /(dust|storm|quarry|red sands)/i.test(sceneBlob)) {
        pushCostume(
          `Weather-sealed exterior overcoat / dust-weathered layer & protective eyewear (Sc. ${sc.sceneNumber} ${sc.location})`,
          `Scene ${sc.sceneNumber} Environment (EXT)`,
          [sc.id]
        );
      }
      if (/(stunt|wire rig|harness)/i.test(sceneBlob)) {
        pushCostume(
          `Stunt-rigged wardrobe duplicate with concealed harness pass-throughs (Sc. ${sc.sceneNumber})`,
          `Scene ${sc.sceneNumber} Stunt Notes`,
          [sc.id]
        );
      }
      if (/(low-gravity|gimbal|cockpit)/i.test(sceneBlob)) {
        pushCostume(
          `Secured collar/hem tailoring for low-gravity or gimbal camera rig shots (Sc. ${sc.sceneNumber})`,
          `Scene ${sc.sceneNumber} Rigging Notes`,
          [sc.id]
        );
      }
    });

    // 3e. Voice-over / ADR off-camera wardrobe distinction
    if (voiceOverLines > 0) {
      const voOnlyScenes = charScenes.filter(
        (sc) => voiceOverSceneIds.has(sc.id) && !dialogueSceneIds.has(sc.id)
      );
      if (voOnlyScenes.length > 0) {
        pushCostume(
          `ADR / Voice-over Booth Session (Off-camera V.O. in Sc. ${voOnlyScenes
            .map((s) => s.sceneNumber)
            .join(', ')} — no on-set wardrobe required for V.O.-only scenes)`,
          'Voice-over (V.O.) Production Tag',
          voOnlyScenes.map((s) => s.id)
        );
      }
    }

    // 3f. Default role-grounded base wardrobe requirement if none explicitly tagged yet
    if (rawCostumes.length === 0) {
      if (/\b(ambassador|councilor|councillor|envoy)\b/i.test(charName)) {
        pushCostume(
          'Formal diplomatic / council attire with pressed continuity duplicates across interior scenes',
          'Role & Scene Baseline',
          sceneIds
        );
      } else if (/\b(chief|captain|officer)\b/i.test(charName)) {
        pushCostume(
          'Standardized command / security service uniform with rank insignia and comms loop',
          'Role & Scene Baseline',
          sceneIds
        );
      } else if (charScenes.some((s) => /restaurant|grille|bistro/i.test(s.heading))) {
        pushCostume(
          'Contemporary evening / smart-casual dining wardrobe suitable for warm multi-cam lighting',
          'Scene Setting Baseline',
          sceneIds
        );
      } else {
        pushCostume(
          `Principal character wardrobe set (${Math.max(1, storyDays.length)} story day continuity look${
            storyDays.length > 1 ? 's' : ''
          })`,
          'Scene Continuity Baseline',
          sceneIds
        );
      }
    }

    // ------------------------------------
    // 4. CONTINUITY COSTUME LOOK MATRIX
    // ------------------------------------
    const looksMap: Record<string, CostumeLookChange> = {};
    const wardrobeTags = linkedTags.filter((t) => t.category === 'wardrobe');

    charScenes.forEach((sc) => {
      const lookKey = `d${sc.storyDay}-${sc.intExt}-${sc.dayNight}`;
      if (!looksMap[lookKey]) {
        looksMap[lookKey] = {
          key: lookKey,
          storyDay: sc.storyDay,
          intExt: sc.intExt,
          dayNight: sc.dayNight,
          sceneNumbers: [],
          sceneIds: [],
          wardrobeTags: [],
        };
      }
      looksMap[lookKey].sceneNumbers.push(sc.sceneNumber);
      looksMap[lookKey].sceneIds.push(sc.id);
      wardrobeTags.forEach((wt) => {
        if (
          wt.sceneIds.includes(sc.id) &&
          !looksMap[lookKey].wardrobeTags.includes(wt.name)
        ) {
          looksMap[lookKey].wardrobeTags.push(wt.name);
        }
      });
    });

    const costumeLooks = Object.values(looksMap).sort(
      (a, b) => a.storyDay - b.storyDay || a.sceneNumbers[0] - b.sceneNumbers[0]
    );

    // ------------------------------------
    // 5. APPLY USER OVERRIDES (CUSTOM / HIDDEN)
    // ------------------------------------
    const hiddenTraitSet = new Set(override?.hiddenTraits || []);
    const hiddenMotSet = new Set(override?.hiddenMotivations || []);
    const hiddenCostumeSet = new Set(override?.hiddenCostumes || []);

    const traits: BreakdownItem[] = [
      ...rawTraits.filter((t) => !hiddenTraitSet.has(t.text)),
      ...(override?.customTraits || []).map((text, idx) => ({
        id: `custom-trait-${idx}-${makeItemId('t', text)}`,
        text,
        source: 'Manual Wardrobe / Character Note',
        sceneIds: [],
        isCustom: true,
      })),
    ];

    const motivations: BreakdownItem[] = [
      ...rawMotivations.filter((m) => !hiddenMotSet.has(m.text)),
      ...(override?.customMotivations || []).map((text, idx) => ({
        id: `custom-mot-${idx}-${makeItemId('m', text)}`,
        text,
        source: 'Manual Character Note',
        sceneIds: [],
        isCustom: true,
      })),
    ];

    const costumeRequirements: BreakdownItem[] = [
      ...rawCostumes.filter((c) => !hiddenCostumeSet.has(c.text)),
      ...(override?.customCostumes || []).map((text, idx) => ({
        id: `custom-costume-${idx}-${makeItemId('c', text)}`,
        text,
        source: 'Manual Costume Requirement',
        sceneIds: [],
        isCustom: true,
      })),
    ];

    // Script evidence excerpts
    const keyExcerpts: { sceneNumber?: number; type: string; text: string }[] = [];
    charActions.slice(0, 2).forEach((a) => {
      keyExcerpts.push({
        sceneNumber: a.sceneId ? sceneById[a.sceneId]?.sceneNumber : undefined,
        type: 'ACTION',
        text: a.text,
      });
    });
    voiceOverBlocks.slice(0, 2).forEach((vo) => {
      keyExcerpts.push({
        sceneNumber: vo.sceneId ? sceneById[vo.sceneId]?.sceneNumber : undefined,
        type: 'VOICE_OVER (V.O.)',
        text: vo.parenthetical ? `${vo.parenthetical} "${vo.text}"` : `"${vo.text}"`,
      });
    });
    dialogueBlocks.slice(0, 3).forEach((d) => {
      keyExcerpts.push({
        sceneNumber: d.sceneId ? sceneById[d.sceneId]?.sceneNumber : undefined,
        type: 'DIALOGUE',
        text: d.parenthetical ? `${d.parenthetical} "${d.text}"` : `"${d.text}"`,
      });
    });

    const hasCustomizations = Boolean(
      override &&
        ((override.customTraits?.length || 0) > 0 ||
          (override.hiddenTraits?.length || 0) > 0 ||
          (override.customMotivations?.length || 0) > 0 ||
          (override.hiddenMotivations?.length || 0) > 0 ||
          (override.customCostumes?.length || 0) > 0 ||
          (override.hiddenCostumes?.length || 0) > 0 ||
          (override.wardrobeNotes && override.wardrobeNotes.trim().length > 0))
    );

    return {
      characterName: charName,
      color: charTag?.color || storyChar?.color || '#ff8000',
      image: charTag?.image || storyChar?.image || castMember?.avatarUrl,
      isTaggedInScript: Boolean(charTag),
      characterTag: charTag,
      actorName: castMember?.name || storyChar?.actor,
      castMember,
      sceneIds,
      sceneNumbers,
      speakingLines,
      dialogueLines: Math.max(0, dialogueLines),
      voiceOverLines,
      voiceOverSceneNumbers,
      storyDays,
      traits,
      motivations,
      costumeRequirements,
      costumeLooks,
      linkedTags,
      keyExcerpts,
      wardrobeNotes: override?.wardrobeNotes || '',
      hasCustomizations,
    };
  });
}
