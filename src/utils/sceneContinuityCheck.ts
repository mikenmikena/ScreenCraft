import {
  ContinuityOccurrenceRef,
  Scene,
  SceneContinuityAlert,
  ScreenplayElement,
  StoryProject,
} from '../types/story';

export interface ContinuityTrackedMention {
  sceneId: string;
  sceneNumber: number;
  sceneHeading: string;
  storyDay?: number;
  elementId: string;
  itemKey: string;
  itemLabel: string;
  domain: 'costume' | 'prop';
  descriptors: string[];
  conditionState: 'damaged' | 'pristine' | 'removed' | 'neutral';
  excerpt: string;
}

export interface ContinuityTrackedTarget {
  targetType: 'character' | 'location';
  targetName: string;
  accentColor?: string;
  sceneCount: number;
  items: {
    itemKey: string;
    itemLabel: string;
    domain: 'costume' | 'prop';
    mentions: ContinuityTrackedMention[];
    hasAlert: boolean;
  }[];
}

export interface SceneContinuitySummary {
  totalAlerts: number;
  totalActive: number;
  totalAcknowledged: number;
  conflictsCount: number;
  warningsCount: number;
  costumeAlerts: number;
  propAlerts: number;
  impactedSceneIds: string[];
  trackedCharacterCount: number;
  trackedLocationCount: number;
}

export interface SceneContinuityReport {
  alerts: SceneContinuityAlert[];
  activeAlerts: SceneContinuityAlert[];
  acknowledgedAlerts: SceneContinuityAlert[];
  alertsBySceneId: Record<string, SceneContinuityAlert[]>;
  alertsByElementId: Record<string, SceneContinuityAlert[]>;
  trackedCharacters: ContinuityTrackedTarget[];
  trackedLocations: ContinuityTrackedTarget[];
  summary: SceneContinuitySummary;
}

interface ItemDefinition {
  root: string;
  domain: 'costume' | 'prop';
  slot?: string;
  synonyms: string[];
}

const ITEM_DEFINITIONS: ItemDefinition[] = [
  // Costume: Outerwear
  { root: 'jacket', domain: 'costume', slot: 'outerwear', synonyms: ['jacket', 'leather jacket', 'bomber jacket', 'denim jacket', 'windbreaker'] },
  { root: 'coat', domain: 'costume', slot: 'outerwear', synonyms: ['coat', 'overcoat', 'trench coat', 'trenchcoat', 'raincoat', 'greatcoat', 'parka', 'pea coat'] },
  { root: 'blazer', domain: 'costume', slot: 'outerwear', synonyms: ['blazer', 'sport coat', 'suit jacket'] },
  { root: 'tunic', domain: 'costume', slot: 'outerwear', synonyms: ['tunic', 'vestment', 'tabard'] },
  { root: 'robe', domain: 'costume', slot: 'outerwear', synonyms: ['robe', 'cloak', 'cape', 'mantle'] },
  { root: 'hoodie', domain: 'costume', slot: 'outerwear', synonyms: ['hoodie', 'pullover', 'sweatshirt'] },
  { root: 'cardigan', domain: 'costume', slot: 'outerwear', synonyms: ['cardigan'] },
  // Costume: Tops
  { root: 'shirt', domain: 'costume', slot: 'top', synonyms: ['shirt', 'dress shirt', 'button-down', 't-shirt', 'tee', 'polo'] },
  { root: 'blouse', domain: 'costume', slot: 'top', synonyms: ['blouse'] },
  { root: 'sweater', domain: 'costume', slot: 'top', synonyms: ['sweater', 'turtleneck', 'knit'] },
  { root: 'vest', domain: 'costume', slot: 'top', synonyms: ['vest', 'waistcoat'] },
  // Costume: Full outfit
  { root: 'suit', domain: 'costume', slot: 'full_outfit', synonyms: ['suit', 'tuxedo', 'tux', 'flight suit', 'spacesuit', 'hazmat suit'] },
  { root: 'dress', domain: 'costume', slot: 'full_outfit', synonyms: ['dress', 'gown', 'evening gown'] },
  { root: 'uniform', domain: 'costume', slot: 'full_outfit', synonyms: ['uniform', 'jumpsuit', 'coveralls'] },
  // Costume: Bottoms
  { root: 'trousers', domain: 'costume', slot: 'bottom', synonyms: ['trousers', 'pants', 'slacks', 'chinos'] },
  { root: 'jeans', domain: 'costume', slot: 'bottom', synonyms: ['jeans', 'denims'] },
  { root: 'skirt', domain: 'costume', slot: 'bottom', synonyms: ['skirt'] },
  // Costume: Headwear, Eyewear, Footwear, Accessories
  { root: 'hat', domain: 'costume', slot: 'headwear', synonyms: ['hat', 'fedora', 'cap', 'baseball cap', 'beanie', 'beret'] },
  { root: 'helmet', domain: 'costume', slot: 'headwear', synonyms: ['helmet', 'visor'] },
  { root: 'glasses', domain: 'costume', slot: 'eyewear', synonyms: ['glasses', 'eyeglasses', 'spectacles'] },
  { root: 'sunglasses', domain: 'costume', slot: 'eyewear', synonyms: ['sunglasses', 'shades'] },
  { root: 'goggles', domain: 'costume', slot: 'eyewear', synonyms: ['goggles'] },
  { root: 'boots', domain: 'costume', slot: 'footwear', synonyms: ['boots', 'combat boots', 'work boots'] },
  { root: 'shoes', domain: 'costume', slot: 'footwear', synonyms: ['shoes', 'sneakers', 'heels', 'loafers', 'oxfords'] },
  { root: 'gloves', domain: 'costume', slot: 'gloves', synonyms: ['gloves', 'glove'] },
  { root: 'tie', domain: 'costume', slot: 'neckwear', synonyms: ['tie', 'necktie', 'bowtie', 'bow tie'] },
  { root: 'scarf', domain: 'costume', slot: 'neckwear', synonyms: ['scarf', 'shawl'] },
  { root: 'watch', domain: 'costume', slot: 'wristwear', synonyms: ['watch', 'wristwatch', 'chronograph', 'timepiece'] },
  { root: 'ring', domain: 'costume', slot: 'ring', synonyms: ['ring', 'signet ring', 'wedding band'] },
  { root: 'necklace', domain: 'costume', slot: 'necklace', synonyms: ['necklace', 'pendant', 'locket', 'medallion', 'amulet'] },
  { root: 'mask', domain: 'costume', slot: 'facewear', synonyms: ['mask', 'respirator'] },
  { root: 'badge', domain: 'costume', slot: 'badge', synonyms: ['badge', 'insignia', 'pin', 'brooch', 'lanyard'] },

  // Props
  { root: 'briefcase', domain: 'prop', synonyms: ['briefcase', 'brief', 'attache', 'satchel', 'messenger bag'] },
  { root: 'bag', domain: 'prop', synonyms: ['bag', 'backpack', 'knapsack', 'duffel', 'duffel bag', 'suitcase', 'handbag', 'purse', 'tote'] },
  { root: 'communicator', domain: 'prop', synonyms: ['communicator', 'commlink', 'comm unit', 'communication device', 'walkie-talkie', 'walkie', 'transceiver', 'radio'] },
  { root: 'datapad', domain: 'prop', synonyms: ['datapad', 'tablet', 'clipboard', 'dossier', 'folder', 'ledger', 'notebook', 'journal', 'binder'] },
  { root: 'phone', domain: 'prop', synonyms: ['phone', 'smartphone', 'cellphone', 'cell phone', 'mobile phone', 'handset'] },
  { root: 'laptop', domain: 'prop', synonyms: ['laptop', 'computer', 'terminal', 'workstation', 'console', 'monitor'] },
  { root: 'desk', domain: 'prop', synonyms: ['desk', 'workbench', 'podium', 'lectern', 'counter'] },
  { root: 'table', domain: 'prop', synonyms: ['table', 'conference table', 'coffee table', 'dining table'] },
  { root: 'chair', domain: 'prop', synonyms: ['chair', 'armchair', 'recliner', 'stool', 'throne', 'couch', 'sofa'] },
  { root: 'lamp', domain: 'prop', synonyms: ['lamp', 'desk lamp', 'lantern', 'flashlight', 'torch', 'chandelier'] },
  { root: 'mug', domain: 'prop', synonyms: ['mug', 'coffee mug', 'teacup', 'cup', 'tumbler', 'thermos', 'flask'] },
  { root: 'bottle', domain: 'prop', synonyms: ['bottle', 'wine bottle', 'decanter', 'carafe', 'vial', 'chalice', 'goblet'] },
  { root: 'keycard', domain: 'prop', synonyms: ['keycard', 'key card', 'access card', 'key', 'keys', 'keychain'] },
  { root: 'sidearm', domain: 'prop', synonyms: ['sidearm', 'pistol', 'handgun', 'revolver', 'gun', 'rifle', 'blaster', 'weapon'] },
  { root: 'blade', domain: 'prop', synonyms: ['knife', 'dagger', 'blade', 'scalpel', 'sword'] },
  { root: 'case', domain: 'prop', synonyms: ['pelican case', 'gun case', 'instrument case', 'wooden box', 'lockbox', 'crate', 'chest', 'casket'] },
  { root: 'envelope', domain: 'prop', synonyms: ['envelope', 'letter', 'parcel', 'package', 'manila folder'] },
  { root: 'camera', domain: 'prop', synonyms: ['camera', 'camcorder', 'binoculars', 'telescope'] },
  { root: 'cane', domain: 'prop', synonyms: ['cane', 'walking stick', 'crutch', 'umbrella'] },
  { root: 'mirror', domain: 'prop', synonyms: ['mirror', 'vanity mirror'] },
  { root: 'painting', domain: 'prop', synonyms: ['painting', 'portrait', 'canvas', 'photograph', 'photo', 'frame'] },
  { root: 'clock', domain: 'prop', synonyms: ['clock', 'wall clock', 'grandfather clock', 'hourglass'] },
  { root: 'vase', domain: 'prop', synonyms: ['vase', 'urn', 'planter', 'pottery'] },
  { root: 'vehicle', domain: 'prop', synonyms: ['sedan', 'coupe', 'suv', 'truck', 'van', 'pickup', 'jeep', 'motorcycle', 'shuttle', 'cruiser', 'car'] },
];

const COLOR_WORDS = new Set([
  'red', 'crimson', 'scarlet', 'burgundy', 'maroon', 'ruby',
  'blue', 'navy', 'cobalt', 'cyan', 'azure', 'indigo', 'teal', 'turquoise',
  'green', 'emerald', 'olive', 'jade', 'forest', 'lime', 'sage',
  'yellow', 'gold', 'golden', 'amber', 'mustard', 'ochre',
  'orange', 'rust', 'coral', 'peach', 'copper',
  'purple', 'violet', 'plum', 'lavender',
  'pink', 'rose', 'magenta',
  'black', 'ebony', 'charcoal', 'jet', 'obsidian',
  'white', 'ivory', 'cream', 'pearl', 'chalk',
  'silver', 'grey', 'gray', 'slate', 'pewter', 'chrome',
  'brown', 'tan', 'khaki', 'beige', 'taupe', 'mahogany', 'chestnut', 'bronze', 'brass',
]);

// Group near-synonyms so e.g. gray/grey or gold/golden don't false-trigger against each other
const COLOR_FAMILY: Record<string, string> = {
  grey: 'gray',
  gray: 'gray',
  crimson: 'red',
  scarlet: 'red',
  ruby: 'red',
  red: 'red',
  navy: 'blue',
  cobalt: 'blue',
  azure: 'blue',
  blue: 'blue',
  emerald: 'green',
  olive: 'green',
  jade: 'green',
  green: 'green',
  gold: 'gold',
  golden: 'gold',
  amber: 'amber',
  yellow: 'yellow',
  black: 'black',
  ebony: 'black',
  obsidian: 'black',
  white: 'white',
  ivory: 'white',
  cream: 'white',
  silver: 'silver',
  chrome: 'silver',
  brown: 'brown',
  mahogany: 'brown',
  chestnut: 'brown',
  tan: 'tan',
  khaki: 'tan',
  beige: 'tan',
  purple: 'purple',
  violet: 'purple',
};

const MATERIAL_WORDS = new Set([
  'leather', 'suede', 'metal', 'metallic', 'steel', 'iron', 'titanium', 'aluminum', 'alloy',
  'wood', 'wooden', 'oak', 'pine', 'walnut', 'bamboo',
  'glass', 'crystal', 'plastic', 'acrylic', 'vinyl', 'rubber',
  'silk', 'cotton', 'wool', 'denim', 'velvet', 'linen', 'tweed', 'satin', 'canvas', 'nylon', 'kevlar',
  'stone', 'marble', 'granite', 'concrete', 'porcelain', 'ceramic', 'paper', 'parchment', 'cardboard',
]);

const STYLE_WORDS = new Set([
  'striped', 'plaid', 'checkered', 'pinstripe', 'floral', 'camouflage', 'camo',
  'tactical', 'formal', 'casual', 'vintage', 'tailored', 'sleeveless', 'hooded',
  'buttoned', 'unbuttoned', 'digital', 'analog', 'antique', 'modern', 'heavy',
]);

const DAMAGED_WORDS = new Set([
  'torn', 'ripped', 'shredded', 'frayed', 'tattered',
  'bloody', 'bloodied', 'bloodstained', 'blood-stained', 'stained', 'muddy', 'dirty', 'soiled', 'greasy',
  'wet', 'soaked', 'drenched', 'damp',
  'burnt', 'burned', 'charred', 'scorched', 'singed',
  'scratched', 'cracked', 'shattered', 'broken', 'smashed', 'crushed', 'bent', 'dented', 'rusted', 'snapped',
  'wrinkled', 'disheveled', 'rumpled',
]);

const DESTROYED_WORDS = new Set([
  'shattered', 'broken', 'smashed', 'crushed', 'destroyed', 'snapped', 'melted', 'incinerated',
]);

const PRISTINE_WORDS = new Set([
  'clean', 'pristine', 'spotless', 'crisp', 'immaculate', 'fresh', 'dry',
  'intact', 'unbroken', 'undamaged', 'unscratched', 'polished', 'neat', 'tidy', 'unharmed',
]);

const COSTUME_CHANGE_RE =
  /\b(changes?\s+into|changed\s+into|changing\s+into|puts?\s+on\s+a\s+(?:fresh|clean|new)|slips?\s+into|dressed\s+in\s+a\s+(?:fresh|new)|fresh\s+change|new\s+outfit|changed\s+clothes|swaps?\s+(?:into|out\s+of))\b/i;

const REPAIR_CLEAN_RE =
  /\b(repaired|fixed|mended|patched|replaced|brand\s+new|bought\s+a\s+new|hands?\s+(?:him|her|them)\s+a\s+new|washes?|washed|dried|cleaned|dry-cleaned|laundered)\b/i;

const REMOVED_LEFT_RE =
  /\b(without\s+(?:his|her|their|the|a|an)|no\s+longer\s+(?:wears?|wearing|carries?|carrying|holds?|holding)|takes?\s+off|took\s+off|removes?|removed|drops?|dropped|leaves?\s+(?:it|his|her|their|the)?\s*behind|left\s+behind|abandons?|abandoned|loses?|lost|throws?\s+away|tossed\s+aside)\b/i;

const HONORIFIC_PREFIXES = new Set([
  'AMBASSADOR', 'COUNCILOR', 'COUNCILLOR', 'DOCTOR', 'DR', 'CAPTAIN', 'CAPT',
  'OFFICER', 'AGENT', 'LIEUTENANT', 'LT', 'GENERAL', 'GEN', 'PROFESSOR', 'PROF',
  'SERGEANT', 'SGT', 'DETECTIVE', 'DET', 'COMMANDER', 'CMDR', 'PRESIDENT',
  'DIRECTOR', 'SENATOR', 'CHANCELLOR', 'INSPECTOR', 'CHIEF', 'MR', 'MRS', 'MS',
]);

const STOPWORDS_BETWEEN = new Set([
  'a', 'an', 'the', 'his', 'her', 'their', 'its', 'my', 'your', 'some', 'same',
  'old', 'small', 'large', 'big', 'tiny', 'long', 'short', 'thick', 'thin', 'pair', 'of',
  'and', 'with', 'in', 'on', 'wearing', 'wears', 'carrying', 'carries', 'holding', 'holds',
]);

function normalizeLocationKey(scene: Scene): string {
  const raw = (scene.setting || scene.heading || scene.location || '').trim();
  if (!raw) return 'UNKNOWN LOCATION';

  let cleaned = raw.toUpperCase();
  cleaned = cleaned.replace(/^(?:INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s+/i, '');
  cleaned = cleaned.replace(
    /\s*(?:-+|—)\s*(?:DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|MIDNIGHT|NOON|CONTINUOUS|LATER|MOMENTS\s+LATER|SAME\s+TIME|SAME|FLASHBACK).*$/i,
    ''
  );
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || raw.toUpperCase();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CharacterAliasEntry {
  canonical: string;
  color?: string;
  patterns: RegExp[];
}

function buildCharacterAliases(project: StoryProject): CharacterAliasEntry[] {
  const canonicalMap = new Map<string, string | undefined>();

  project.characters.forEach((c) => {
    const clean = c.name.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
    if (clean) canonicalMap.set(clean, c.color);
  });

  project.tags
    .filter((t) => t.category === 'character')
    .forEach((t) => {
      const clean = t.name.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
      if (clean && !canonicalMap.has(clean)) canonicalMap.set(clean, t.color);
    });

  project.elements
    .filter((el) => el.type === 'CHARACTER')
    .forEach((el) => {
      const clean = (el.character || el.text).replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
      if (clean && !canonicalMap.has(clean)) canonicalMap.set(clean, undefined);
    });

  project.scenes.forEach((sc) => {
    sc.characters.forEach((ch) => {
      const clean = ch.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
      if (clean && !canonicalMap.has(clean)) canonicalMap.set(clean, undefined);
    });
  });

  const rawNames = Array.from(canonicalMap.keys());
  const tokenCounts = new Map<string, number>();

  rawNames.forEach((name) => {
    const tokens = name.split(/\s+/).filter((w) => w.length >= 3 && !HONORIFIC_PREFIXES.has(w));
    tokens.forEach((tok) => {
      tokenCounts.set(tok, (tokenCounts.get(tok) || 0) + 1);
    });
  });

  const entries: CharacterAliasEntry[] = [];
  rawNames.forEach((canonical) => {
    const words = canonical.split(/\s+/);
    const strippedWords = words.filter((w) => !HONORIFIC_PREFIXES.has(w));
    const aliasStrings = new Set<string>([canonical]);
    if (strippedWords.length > 0) {
      aliasStrings.add(strippedWords.join(' '));
    }
    strippedWords.forEach((w) => {
      if (w.length >= 3 && tokenCounts.get(w) === 1) {
        aliasStrings.add(w);
      }
    });

    const sortedAliases = Array.from(aliasStrings).sort((a, b) => b.length - a.length);
    const patterns = sortedAliases.map(
      (alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i')
    );

    entries.push({
      canonical,
      color: canonicalMap.get(canonical),
      patterns,
    });
  });

  return entries;
}

function splitIntoClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?;\n])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function findMentionedCharactersInClause(
  clause: string,
  aliases: CharacterAliasEntry[]
): { canonical: string; index: number }[] {
  const found: { canonical: string; index: number }[] = [];
  for (const entry of aliases) {
    let bestIdx = Number.POSITIVE_INFINITY;
    for (const pat of entry.patterns) {
      const m = pat.exec(clause);
      if (m && m.index < bestIdx) {
        bestIdx = m.index;
      }
    }
    if (bestIdx < Number.POSITIVE_INFINITY) {
      found.push({ canonical: entry.canonical, index: bestIdx });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

const PRONOUN_CUE_RE = /\b(he|she|they|his|her|their|him|them|himself|herself|themselves)\b/i;

interface ExtractedItemHit {
  itemKey: string;
  itemLabel: string;
  domain: 'costume' | 'prop';
  slot?: string;
  matchedPhrase: string;
  colors: string[];
  materials: string[];
  styles: string[];
  damaged: string[];
  destroyed: string[];
  pristine: string[];
  removed: boolean;
  hasCostumeChangeCue: boolean;
  hasRepairOrCleanCue: boolean;
  matchIndex: number;
}

function buildDynamicItemCatalog(project: StoryProject): ItemDefinition[] {
  const catalog = [...ITEM_DEFINITIONS];
  const knownTerms = new Set(
    catalog.flatMap((d) => [d.root, ...d.synonyms]).map((s) => s.toLowerCase())
  );

  project.tags.forEach((tag) => {
    if (tag.category !== 'prop' && tag.category !== 'wardrobe') return;
    const raw = tag.name.trim().toLowerCase();
    if (!raw || raw.length < 3) return;
    const words = raw.split(/\s+/);
    const tailWord = words[words.length - 1];
    // Strip leading color/material adjectives from tag name to get root noun
    const cleanRootWords = words.filter(
      (w) => !COLOR_WORDS.has(w) && !MATERIAL_WORDS.has(w) && !DAMAGED_WORDS.has(w) && !PRISTINE_WORDS.has(w)
    );
    const rootNoun = (cleanRootWords.join(' ') || tailWord).trim();
    if (!rootNoun || knownTerms.has(rootNoun)) return;
    knownTerms.add(rootNoun);
    catalog.push({
      root: rootNoun,
      domain: tag.category === 'wardrobe' ? 'costume' : 'prop',
      synonyms: [rootNoun],
    });
  });

  return catalog;
}

function extractItemsFromClause(
  clause: string,
  catalog: ItemDefinition[]
): ExtractedItemHit[] {
  const hits: ExtractedItemHit[] = [];
  const lowerClause = clause.toLowerCase();
  const hasCostumeChangeCue = COSTUME_CHANGE_RE.test(clause);
  const hasRepairOrCleanCue = REPAIR_CLEAN_RE.test(clause);

  // Build ordered list of (synonym, def) longest-first to avoid partial matches like "coat" inside "raincoat"
  const synonymPairs: { term: string; def: ItemDefinition }[] = [];
  catalog.forEach((def) => {
    def.synonyms.forEach((syn) => {
      synonymPairs.push({ term: syn.toLowerCase(), def });
    });
  });
  synonymPairs.sort((a, b) => b.term.length - a.term.length);

  const occupiedRanges: [number, number][] = [];
  const seenRootsInClause = new Set<string>();

  for (const { term, def } of synonymPairs) {
    if (seenRootsInClause.has(def.root)) continue;
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lowerClause)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = occupiedRanges.some(([rs, re]) => start < re && end > rs);
      if (overlaps) continue;

      occupiedRanges.push([start, end]);
      seenRootsInClause.add(def.root);

      // Extract immediate pre-modifier window (up to 5 tokens before noun) and short post-modifier ("in red", "that is torn")
      const preText = clause.slice(Math.max(0, start - 56), start);
      const preTokens = preText
        .toLowerCase()
        .replace(/[^a-z0-9-\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      // Walk backwards from the noun collecting modifiers, stopping on verbs/punctuation boundaries unless allowed filler
      const modifierTokens: string[] = [];
      const rawPrefixTokens: string[] = [];
      let nonModifierStreak = 0;
      for (let i = preTokens.length - 1; i >= 0 && modifierTokens.length < 6; i--) {
        const tok = preTokens[i];
        const isDescriptor =
          COLOR_WORDS.has(tok) ||
          MATERIAL_WORDS.has(tok) ||
          STYLE_WORDS.has(tok) ||
          DAMAGED_WORDS.has(tok) ||
          PRISTINE_WORDS.has(tok);
        if (isDescriptor) {
          modifierTokens.unshift(tok);
          rawPrefixTokens.unshift(tok);
          nonModifierStreak = 0;
        } else if (STOPWORDS_BETWEEN.has(tok) && nonModifierStreak < 2) {
          rawPrefixTokens.unshift(tok);
          nonModifierStreak += 1;
        } else {
          break;
        }
      }

      // Check short trailing clause e.g. "jacket, torn and bloody" or "desk made of glass"
      const postSlice = clause.slice(end, Math.min(clause.length, end + 42));
      const postFirstSegment = postSlice.split(/[.!?;]/)[0] || '';
      const postTokens =
        /^\s*(?:,|that\s+is|which\s+is|is|was|looks?|appears?|made\s+of|covered\s+in|stained\s+with)\b/i.test(
          postFirstSegment
        )
          ? postFirstSegment
              .toLowerCase()
              .replace(/[^a-z0-9-\s]/g, ' ')
              .split(/\s+/)
              .filter(Boolean)
          : [];

      const allDescriptorTokens = [...modifierTokens, ...postTokens];

      const colors: string[] = [];
      const materials: string[] = [];
      const styles: string[] = [];
      const damaged: string[] = [];
      const destroyed: string[] = [];
      const pristine: string[] = [];

      allDescriptorTokens.forEach((tok) => {
        if (COLOR_WORDS.has(tok) && !colors.includes(tok)) colors.push(tok);
        if (MATERIAL_WORDS.has(tok) && !materials.includes(tok)) materials.push(tok);
        if (STYLE_WORDS.has(tok) && !styles.includes(tok)) styles.push(tok);
        if (DAMAGED_WORDS.has(tok) && !damaged.includes(tok)) damaged.push(tok);
        if (DESTROYED_WORDS.has(tok) && !destroyed.includes(tok)) destroyed.push(tok);
        if (PRISTINE_WORDS.has(tok) && !pristine.includes(tok)) pristine.push(tok);
      });

      const localWindow = `${preText} ${match[0]} ${postFirstSegment}`;
      const removed =
        REMOVED_LEFT_RE.test(localWindow) &&
        !(/\b(without\s+a\s+scratch|without\s+blemish)\b/i.test(localWindow));

      const phraseParts = [...modifierTokens, match[0]];
      const matchedPhrase = phraseParts.join(' ').trim();

      hits.push({
        itemKey: def.root,
        itemLabel: def.root.charAt(0).toUpperCase() + def.root.slice(1),
        domain: def.domain,
        slot: def.slot,
        matchedPhrase,
        colors,
        materials,
        styles,
        damaged,
        destroyed,
        pristine,
        removed,
        hasCostumeChangeCue,
        hasRepairOrCleanCue,
        matchIndex: start,
      });
      break;
    }
  }

  return hits;
}

interface InternalOccurrence {
  targetType: 'character' | 'location';
  targetName: string;
  itemKey: string;
  itemLabel: string;
  domain: 'costume' | 'prop';
  slot?: string;
  scene: Scene;
  element: ScreenplayElement;
  excerpt: string;
  hit: ExtractedItemHit;
}

function getAllDescriptors(hit: ExtractedItemHit): string[] {
  const list = [
    ...hit.colors,
    ...hit.materials,
    ...hit.styles,
    ...hit.damaged,
    ...hit.pristine,
  ];
  if (hit.removed && !list.includes('removed/missing')) {
    list.push('removed/missing');
  }
  return Array.from(new Set(list));
}

function toOccurrenceRef(occ: InternalOccurrence): ContinuityOccurrenceRef {
  return {
    sceneId: occ.scene.id,
    sceneNumber: occ.scene.sceneNumber,
    sceneHeading: occ.scene.heading,
    storyDay: occ.scene.storyDay,
    elementId: occ.element.id,
    elementType: occ.element.type,
    excerpt: occ.excerpt,
    matchedPhrase: occ.hit.matchedPhrase,
    descriptors: getAllDescriptors(occ.hit),
  };
}

function isSameContinuityWindow(prevScene: Scene, currScene: Scene): boolean {
  if (
    typeof prevScene.storyDay === 'number' &&
    typeof currScene.storyDay === 'number'
  ) {
    return prevScene.storyDay === currScene.storyDay;
  }
  return true;
}

function normalizeColor(c: string): string {
  return COLOR_FAMILY[c.toLowerCase()] || c.toLowerCase();
}

function findAttributeConflict(
  prevVals: string[],
  currVals: string[],
  normalizer: (v: string) => string = (v) => v.toLowerCase()
): { prev: string; curr: string } | null {
  if (prevVals.length === 0 || currVals.length === 0) return null;
  const prevNorm = new Set(prevVals.map(normalizer));
  const currNorm = new Set(currVals.map(normalizer));

  for (const pn of prevNorm) {
    if (currNorm.has(pn)) {
      return null; // At least one matching descriptor -> compatible
    }
  }
  return { prev: prevVals[0], curr: currVals[0] };
}

function formatExcerpt(text: string, maxLen = 140): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trim()}…`;
}

function getConditionState(hit: ExtractedItemHit): 'damaged' | 'pristine' | 'removed' | 'neutral' {
  if (hit.destroyed.length > 0 || hit.removed) return 'removed';
  if (hit.damaged.length > 0) return 'damaged';
  if (hit.pristine.length > 0) return 'pristine';
  return 'neutral';
}

export function analyzeSceneContinuity(project: StoryProject): SceneContinuityReport {
  const sceneMap = new Map<string, Scene>();
  const orderedScenes = [...project.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
  orderedScenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const aliases = buildCharacterAliases(project);
  const catalog = buildDynamicItemCatalog(project);
  const acknowledgedSet = new Set(project.acknowledgedContinuityIds || []);

  // Build ordered elements with resolved scene
  let fallbackScene: Scene | undefined = orderedScenes[0];
  let activeSpeaker: string | undefined;
  let lastCharacterInScene: string | undefined;

  const occurrences: InternalOccurrence[] = [];

  for (const el of project.elements) {
    const resolvedScene: Scene | undefined =
      (el.sceneId ? sceneMap.get(el.sceneId) : undefined) || fallbackScene;
    if (!resolvedScene) continue;
    fallbackScene = resolvedScene;

    if (el.type === 'SCENE_HEADING') {
      activeSpeaker = undefined;
      lastCharacterInScene =
        resolvedScene.characters.length === 1
          ? resolvedScene.characters[0].replace(/\s*\([^)]*\)/g, '').trim().toUpperCase()
          : undefined;
    } else if (el.type === 'CHARACTER') {
      const clean = (el.character || el.text).replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
      activeSpeaker = clean || undefined;
      if (clean) lastCharacterInScene = clean;
    } else if (el.type === 'TRANSITION') {
      activeSpeaker = undefined;
    }

    // Only scan physical description elements & parentheticals/shots (avoid dialogue figurative false positives)
    const isScannable =
      el.type === 'ACTION' ||
      el.type === 'PARENTHETICAL' ||
      el.type === 'SHOT' ||
      el.type === 'SCENE_HEADING';

    if (!isScannable || !el.text.trim()) continue;

    const locationKey = normalizeLocationKey(resolvedScene);
    const clauses = splitIntoClauses(el.text);
    let lastClauseCharacter: string | undefined =
      el.type === 'PARENTHETICAL' ? activeSpeaker : lastCharacterInScene;

    for (const clause of clauses) {
      const hits = extractItemsFromClause(clause, catalog);
      if (hits.length === 0) {
        // Still update lastClauseCharacter if a character is named in a setup sentence
        const namedOnly = findMentionedCharactersInClause(clause, aliases);
        if (namedOnly.length === 1) {
          lastClauseCharacter = namedOnly[0].canonical;
          lastCharacterInScene = namedOnly[0].canonical;
        } else if (namedOnly.length > 1) {
          lastClauseCharacter = namedOnly[namedOnly.length - 1].canonical;
          lastCharacterInScene = lastClauseCharacter;
        }
        continue;
      }

      const mentionedChars = findMentionedCharactersInClause(clause, aliases);
      if (mentionedChars.length > 0) {
        lastCharacterInScene = mentionedChars[mentionedChars.length - 1].canonical;
      }

      for (const hit of hits) {
        let attributedCharacter: string | undefined;

        if (el.type === 'PARENTHETICAL' && activeSpeaker) {
          attributedCharacter = activeSpeaker;
        } else if (mentionedChars.length === 1) {
          attributedCharacter = mentionedChars[0].canonical;
        } else if (mentionedChars.length > 1) {
          // Pick closest preceding character in the clause, or nearest overall
          const preceding = mentionedChars.filter((m) => m.index <= hit.matchIndex);
          attributedCharacter =
            preceding.length > 0
              ? preceding[preceding.length - 1].canonical
              : mentionedChars[0].canonical;
        } else if (
          PRONOUN_CUE_RE.test(clause) &&
          lastClauseCharacter
        ) {
          attributedCharacter = lastClauseCharacter;
        } else if (resolvedScene.characters.length === 1 && hit.domain === 'costume') {
          attributedCharacter = resolvedScene.characters[0]
            .replace(/\s*\([^)]*\)/g, '')
            .trim()
            .toUpperCase();
        }

        if (hit.domain === 'costume' && attributedCharacter) {
          occurrences.push({
            targetType: 'character',
            targetName: attributedCharacter,
            itemKey: hit.itemKey,
            itemLabel: hit.itemLabel,
            domain: 'costume',
            slot: hit.slot,
            scene: resolvedScene,
            element: el,
            excerpt: formatExcerpt(clause),
            hit,
          });
        } else if (hit.domain === 'prop') {
          if (attributedCharacter) {
            occurrences.push({
              targetType: 'character',
              targetName: attributedCharacter,
              itemKey: hit.itemKey,
              itemLabel: hit.itemLabel,
              domain: 'prop',
              scene: resolvedScene,
              element: el,
              excerpt: formatExcerpt(clause),
              hit,
            });
          } else {
            occurrences.push({
              targetType: 'location',
              targetName: locationKey,
              itemKey: hit.itemKey,
              itemLabel: hit.itemLabel,
              domain: 'prop',
              scene: resolvedScene,
              element: el,
              excerpt: formatExcerpt(clause),
              hit,
            });
          }
        }
      }

      if (mentionedChars.length > 0) {
        lastClauseCharacter = mentionedChars[mentionedChars.length - 1].canonical;
      }
    }
  }

  // Sort occurrences strictly by sceneNumber then element order in project.elements
  const elementOrder = new Map<string, number>();
  project.elements.forEach((el, idx) => elementOrder.set(el.id, idx));

  occurrences.sort((a, b) => {
    if (a.scene.sceneNumber !== b.scene.sceneNumber) {
      return a.scene.sceneNumber - b.scene.sceneNumber;
    }
    return (elementOrder.get(a.element.id) || 0) - (elementOrder.get(b.element.id) || 0);
  });

  // Evaluate continuity conflicts
  const alerts: SceneContinuityAlert[] = [];
  const emittedAlertKeys = new Set<string>();

  const latestByTargetItem = new Map<string, InternalOccurrence>();
  const latestByCharSlot = new Map<string, InternalOccurrence>();

  for (const curr of occurrences) {
    const itemBucketKey = `${curr.targetType}:${curr.targetName}:${curr.itemKey}`;
    const prevSameItem = latestByTargetItem.get(itemBucketKey);

    if (prevSameItem && prevSameItem.element.id !== curr.element.id) {
      const sameDay = isSameContinuityWindow(prevSameItem.scene, curr.scene);
      const bypassChange =
        curr.hit.hasCostumeChangeCue ||
        curr.hit.hasRepairOrCleanCue ||
        (curr.domain === 'costume' && !sameDay);

      // 1. Color / Material / Style attribute contradiction
      const colorDiff = findAttributeConflict(prevSameItem.hit.colors, curr.hit.colors, normalizeColor);
      const matDiff = findAttributeConflict(prevSameItem.hit.materials, curr.hit.materials);
      const styleDiff = findAttributeConflict(prevSameItem.hit.styles, curr.hit.styles);

      if ((colorDiff || matDiff || styleDiff) && !bypassChange) {
        const diffPair = colorDiff || matDiff || styleDiff!;
        const diffKind = colorDiff ? 'color' : matDiff ? 'material' : 'style';
        const alertId = `cont:${curr.targetType}:${curr.targetName}:${curr.itemKey}:${prevSameItem.element.id}:${curr.element.id}:${diffKind}`;

        if (!emittedAlertKeys.has(alertId)) {
          emittedAlertKeys.add(alertId);
          alerts.push({
            id: alertId,
            severity: 'conflict',
            category: curr.domain === 'costume' ? 'costume_mismatch' : 'prop_mismatch',
            domain: curr.domain,
            targetType: curr.targetType,
            targetName: curr.targetName,
            itemName: curr.itemLabel,
            title: `${curr.targetName} — ${curr.itemLabel} ${diffKind} mismatch`,
            explanation:
              curr.targetType === 'character'
                ? `${curr.targetName}'s ${curr.itemKey} is described as "${diffPair.curr}" in Scene ${curr.scene.sceneNumber}, conflicting with "${diffPair.prev}" established in Scene ${prevSameItem.scene.sceneNumber} (${sameDay ? `Story Day ${curr.scene.storyDay ?? 1}` : 'earlier'}).`
                : `Location "${curr.targetName}" features a "${diffPair.curr}" ${curr.itemKey} in Scene ${curr.scene.sceneNumber}, conflicting with "${diffPair.prev}" in Scene ${prevSameItem.scene.sceneNumber}.`,
            previous: toOccurrenceRef(prevSameItem),
            current: toOccurrenceRef(curr),
          });
        }
      }

      // 2. Condition Regression (damaged/soiled/wet -> pristine/clean/dry without repair/change)
      if (
        prevSameItem.hit.damaged.length > 0 &&
        curr.hit.pristine.length > 0 &&
        !curr.hit.hasCostumeChangeCue &&
        !curr.hit.hasRepairOrCleanCue &&
        (curr.targetType === 'location' || sameDay)
      ) {
        const alertId = `cont:${curr.targetType}:${curr.targetName}:${curr.itemKey}:${prevSameItem.element.id}:${curr.element.id}:condition`;
        if (!emittedAlertKeys.has(alertId)) {
          emittedAlertKeys.add(alertId);
          alerts.push({
            id: alertId,
            severity: 'conflict',
            category: 'costume_condition',
            domain: curr.domain,
            targetType: curr.targetType,
            targetName: curr.targetName,
            itemName: curr.itemLabel,
            title: `${curr.targetName} — ${curr.itemLabel} condition reset`,
            explanation: `The ${curr.itemKey} was "${prevSameItem.hit.damaged.join(', ')}" in Scene ${prevSameItem.scene.sceneNumber}, but appears "${curr.hit.pristine.join(', ')}" in Scene ${curr.scene.sceneNumber} with no cleaning, repair, or wardrobe-change cue.`,
            previous: toOccurrenceRef(prevSameItem),
            current: toOccurrenceRef(curr),
          });
        }
      }

      // 3. Destroyed / Removed / Lost prop or accessory reappearing intact
      const prevDestroyedOrRemoved =
        prevSameItem.hit.destroyed.length > 0 || prevSameItem.hit.removed;
      const currActiveOrIntact =
        !curr.hit.removed &&
        curr.hit.destroyed.length === 0 &&
        !curr.hit.hasRepairOrCleanCue &&
        !curr.hit.hasCostumeChangeCue;

      if (
        prevDestroyedOrRemoved &&
        currActiveOrIntact &&
        (curr.targetType === 'location' || sameDay)
      ) {
        const reason =
          prevSameItem.hit.destroyed.length > 0
            ? prevSameItem.hit.destroyed.join(', ')
            : 'removed / left behind';
        const alertId = `cont:${curr.targetType}:${curr.targetName}:${curr.itemKey}:${prevSameItem.element.id}:${curr.element.id}:state`;
        if (!emittedAlertKeys.has(alertId)) {
          emittedAlertKeys.add(alertId);
          alerts.push({
            id: alertId,
            severity: prevSameItem.hit.destroyed.length > 0 ? 'conflict' : 'warning',
            category: 'prop_state',
            domain: curr.domain,
            targetType: curr.targetType,
            targetName: curr.targetName,
            itemName: curr.itemLabel,
            title: `${curr.targetName} — ${curr.itemLabel} reappears after being ${reason}`,
            explanation: `${curr.itemLabel} was ${reason} in Scene ${prevSameItem.scene.sceneNumber}, but appears active again in Scene ${curr.scene.sceneNumber} without replacement or repair noted.`,
            previous: toOccurrenceRef(prevSameItem),
            current: toOccurrenceRef(curr),
          });
        }
      }
    }

    // 4. Wardrobe slot swap on same character & same Story Day (e.g., tunic vs leather jacket)
    if (curr.targetType === 'character' && curr.domain === 'costume' && curr.slot) {
      const slotKey = `${curr.targetName}:${curr.slot}`;
      const prevSlotOcc = latestByCharSlot.get(slotKey);
      if (
        prevSlotOcc &&
        prevSlotOcc.element.id !== curr.element.id &&
        prevSlotOcc.itemKey !== curr.itemKey &&
        isSameContinuityWindow(prevSlotOcc.scene, curr.scene) &&
        !curr.hit.hasCostumeChangeCue &&
        !curr.hit.removed &&
        !prevSlotOcc.hit.removed
      ) {
        const alertId = `cont:slot:${curr.targetName}:${curr.slot}:${prevSlotOcc.element.id}:${curr.element.id}`;
        if (!emittedAlertKeys.has(alertId)) {
          emittedAlertKeys.add(alertId);
          alerts.push({
            id: alertId,
            severity: 'warning',
            category: 'wardrobe_slot_change',
            domain: 'costume',
            targetType: 'character',
            targetName: curr.targetName,
            itemName: `${prevSlotOcc.itemLabel} vs ${curr.itemLabel}`,
            title: `${curr.targetName} — ${curr.slot} wardrobe swap (${prevSlotOcc.itemLabel} -> ${curr.itemLabel})`,
            explanation: `${curr.targetName} wears "${prevSlotOcc.hit.matchedPhrase}" in Scene ${prevSlotOcc.scene.sceneNumber} and "${curr.hit.matchedPhrase}" in Scene ${curr.scene.sceneNumber} on the same Story Day with no wardrobe-change cue.`,
            previous: toOccurrenceRef(prevSlotOcc),
            current: toOccurrenceRef(curr),
          });
        }
      }
      latestByCharSlot.set(slotKey, curr);
    }

    latestByTargetItem.set(itemBucketKey, curr);
  }

  const activeAlerts = alerts.filter((a) => !acknowledgedSet.has(a.id));
  const acknowledgedAlerts = alerts.filter((a) => acknowledgedSet.has(a.id));

  const alertsBySceneId: Record<string, SceneContinuityAlert[]> = {};
  const alertsByElementId: Record<string, SceneContinuityAlert[]> = {};

  activeAlerts.forEach((alert) => {
    if (!alertsBySceneId[alert.current.sceneId]) alertsBySceneId[alert.current.sceneId] = [];
    alertsBySceneId[alert.current.sceneId].push(alert);

    if (!alertsByElementId[alert.current.elementId]) alertsByElementId[alert.current.elementId] = [];
    alertsByElementId[alert.current.elementId].push(alert);
  });

  // Build Tracked Inventory summary for Characters & Locations
  const charColorLookup = new Map<string, string>();
  aliases.forEach((a) => {
    if (a.color) charColorLookup.set(a.canonical, a.color);
  });

  const activeAlertTargetItems = new Set(
    activeAlerts.map((a) => `${a.targetType}:${a.targetName}:${a.itemName.toLowerCase()}`)
  );

  const targetBuckets = new Map<string, ContinuityTrackedTarget>();

  occurrences.forEach((occ) => {
    const bucketId = `${occ.targetType}:${occ.targetName}`;
    let target = targetBuckets.get(bucketId);
    if (!target) {
      target = {
        targetType: occ.targetType,
        targetName: occ.targetName,
        accentColor: occ.targetType === 'character' ? charColorLookup.get(occ.targetName) : undefined,
        sceneCount: 0,
        items: [],
      };
      targetBuckets.set(bucketId, target);
    }

    let itemEntry = target.items.find((i) => i.itemKey === occ.itemKey && i.domain === occ.domain);
    if (!itemEntry) {
      itemEntry = {
        itemKey: occ.itemKey,
        itemLabel: occ.itemLabel,
        domain: occ.domain,
        mentions: [],
        hasAlert:
          activeAlertTargetItems.has(`${occ.targetType}:${occ.targetName}:${occ.itemKey}`) ||
          activeAlerts.some(
            (a) =>
              a.targetType === occ.targetType &&
              a.targetName === occ.targetName &&
              (a.previous.elementId === occ.element.id || a.current.elementId === occ.element.id)
          ),
      };
      target.items.push(itemEntry);
    }

    itemEntry.mentions.push({
      sceneId: occ.scene.id,
      sceneNumber: occ.scene.sceneNumber,
      sceneHeading: occ.scene.heading,
      storyDay: occ.scene.storyDay,
      elementId: occ.element.id,
      itemKey: occ.itemKey,
      itemLabel: occ.itemLabel,
      domain: occ.domain,
      descriptors: getAllDescriptors(occ.hit),
      conditionState: getConditionState(occ.hit),
      excerpt: occ.excerpt,
    });
  });

  targetBuckets.forEach((target) => {
    const uniqueScenes = new Set<string>();
    target.items.forEach((item) => {
      item.mentions.forEach((m) => uniqueScenes.add(m.sceneId));
    });
    target.sceneCount = uniqueScenes.size;
  });

  const trackedCharacters = Array.from(targetBuckets.values())
    .filter((t) => t.targetType === 'character')
    .sort((a, b) => a.targetName.localeCompare(b.targetName));

  const trackedLocations = Array.from(targetBuckets.values())
    .filter((t) => t.targetType === 'location')
    .sort((a, b) => a.targetName.localeCompare(b.targetName));

  const impactedSceneIds = Array.from(new Set(activeAlerts.map((a) => a.current.sceneId)));

  return {
    alerts,
    activeAlerts,
    acknowledgedAlerts,
    alertsBySceneId,
    alertsByElementId,
    trackedCharacters,
    trackedLocations,
    summary: {
      totalAlerts: alerts.length,
      totalActive: activeAlerts.length,
      totalAcknowledged: acknowledgedAlerts.length,
      conflictsCount: activeAlerts.filter((a) => a.severity === 'conflict').length,
      warningsCount: activeAlerts.filter((a) => a.severity === 'warning').length,
      costumeAlerts: activeAlerts.filter((a) => a.domain === 'costume').length,
      propAlerts: activeAlerts.filter((a) => a.domain === 'prop').length,
      impactedSceneIds,
      trackedCharacterCount: trackedCharacters.length,
      trackedLocationCount: trackedLocations.length,
    },
  };
}
