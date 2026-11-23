import { ElementType, Scene, ScreenplayElement } from '../types/story';

export type ProofreadIssueKind = 'spelling' | 'grammar';
export type ProofreadScope = 'scene' | 'project';

export interface ProofreadIssue {
  id: string;
  kind: ProofreadIssueKind;
  elementId: string;
  sceneId?: string;
  sceneNumber?: number;
  sceneHeading?: string;
  elementType: ElementType;
  wordOrPhrase: string;
  message: string;
  suggestion?: string;
  safeAutoFix?: boolean;
  startIndex: number;
  endIndex: number;
  excerpt: string;
}

export interface ProofreadReport {
  scope: ProofreadScope;
  totalElementsScanned: number;
  spellingCount: number;
  grammarCount: number;
  issues: ProofreadIssue[];
}

const MISSPELLING_MAP: Record<string, string> = {
  teh: 'the',
  hte: 'the',
  adn: 'and',
  nad: 'and',
  taht: 'that',
  thier: 'their',
  recieve: 'receive',
  recieved: 'received',
  seperate: 'separate',
  seperately: 'separately',
  occured: 'occurred',
  occuring: 'occurring',
  untill: 'until',
  definately: 'definitely',
  definitly: 'definitely',
  wierd: 'weird',
  freind: 'friend',
  beacuse: 'because',
  becuase: 'because',
  becasue: 'because',
  wiht: 'with',
  wtih: 'with',
  fo: 'of',
  ot: 'to',
  yuo: 'you',
  yoou: 'you',
  dont: "don't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  isnt: "isn't",
  wasnt: "wasn't",
  werent: "weren't",
  shouldnt: "shouldn't",
  couldnt: "couldn't",
  wouldnt: "wouldn't",
  ive: "I've",
  im: "I'm",
  id: "I'd",
  shes: "she's",
  hes: "he's",
  theyre: "they're",
  youre: "you're",
  theres: "there's",
  wheres: "where's",
  acheive: 'achieve',
  accomodate: 'accommodate',
  appartment: 'apartment',
  arguement: 'argument',
  begining: 'beginning',
  beleive: 'believe',
  bizzare: 'bizarre',
  buisness: 'business',
  calender: 'calendar',
  camoflage: 'camouflage',
  carefull: 'careful',
  catagory: 'category',
  cemetary: 'cemetery',
  changable: 'changeable',
  cheif: 'chief',
  colleague: 'colleague',
  collegue: 'colleague',
  comming: 'coming',
  commited: 'committed',
  comparsion: 'comparison',
  completly: 'completely',
  concious: 'conscious',
  curiousity: 'curiosity',
  decieve: 'deceive',
  desparate: 'desperate',
  develope: 'develop',
  diffrent: 'different',
  disapear: 'disappear',
  disapoint: 'disappoint',
  ecstacy: 'ecstasy',
  embarass: 'embarrass',
  enviroment: 'environment',
  exagerate: 'exaggerate',
  existance: 'existence',
  experiance: 'experience',
  familar: 'familiar',
  finaly: 'finally',
  flourescent: 'fluorescent',
  foriegn: 'foreign',
  forseeable: 'foreseeable',
  fourty: 'forty',
  foward: 'forward',
  frightning: 'frightening',
  gaurd: 'guard',
  goverment: 'government',
  grammer: 'grammar',
  guage: 'gauge',
  happend: 'happened',
  harass: 'harass',
  harrass: 'harass',
  heighth: 'height',
  heros: 'heroes',
  humerous: 'humorous',
  immediatly: 'immediately',
  incidently: 'incidentally',
  independant: 'independent',
  intresting: 'interesting',
  irresistable: 'irresistible',
  knowlege: 'knowledge',
  liason: 'liaison',
  lightening: 'lightning',
  littel: 'little',
  lonley: 'lonely',
  maintainance: 'maintenance',
  manuever: 'maneuver',
  memento: 'memento',
  millenium: 'millennium',
  miniscule: 'minuscule',
  mischevious: 'mischievous',
  mispell: 'misspell',
  neccessary: 'necessary',
  necesary: 'necessary',
  noticable: 'noticeable',
  ocasion: 'occasion',
  occassion: 'occasion',
  omision: 'omission',
  orignal: 'original',
  outragous: 'outrageous',
  parrallel: 'parallel',
  particuarly: 'particularly',
  passtime: 'pastime',
  peculiar: 'peculiar',
  percieve: 'perceive',
  persue: 'pursue',
  peice: 'piece',
  plagarize: 'plagiarize',
  playwrite: 'playwright',
  posession: 'possession',
  potatos: 'potatoes',
  preceed: 'precede',
  presance: 'presence',
  privelege: 'privilege',
  proffesional: 'professional',
  promiss: 'promise',
  protray: 'portray',
  publically: 'publicly',
  realy: 'really',
  realize: 'realize',
  recommand: 'recommend',
  reccomend: 'recommend',
  refered: 'referred',
  refering: 'referring',
  religous: 'religious',
  rember: 'remember',
  remeber: 'remember',
  repetion: 'repetition',
  resistence: 'resistance',
  responsability: 'responsibility',
  rythm: 'rhythm',
  scedule: 'schedule',
  schedual: 'schedule',
  sence: 'sense',
  sentance: 'sentence',
  shoudl: 'should',
  silhoutte: 'silhouette',
  similiar: 'similar',
  sincerly: 'sincerely',
  speach: 'speech',
  strenght: 'strength',
  studing: 'studying',
  succesful: 'successful',
  suprise: 'surprise',
  surprize: 'surprise',
  tecnique: 'technique',
  temperture: 'temperature',
  tounge: 'tongue',
  tommorow: 'tomorrow',
  tomorow: 'tomorrow',
  truley: 'truly',
  tyranny: 'tyranny',
  unfortunatly: 'unfortunately',
  usefull: 'useful',
  vaccum: 'vacuum',
  vegatable: 'vegetable',
  vehical: 'vehicle',
  visious: 'vicious',
  wether: 'whether',
  whereever: 'wherever',
  whitch: 'which',
  woudl: 'would',
  writting: 'writing',
  // Screenplay-specific terms often mistyped
  screne: 'scene',
  sceen: 'scene',
  dialouge: 'dialogue',
  dialoge: 'dialogue',
  charachter: 'character',
  charater: 'character',
  narator: 'narrator',
  silhuette: 'silhouette',
  coridoor: 'corridor',
  coridor: 'corridor',
  hallwy: 'hallway',
  flashbak: 'flashback',
  montague: 'montage',
  voiceover: 'voice-over',
};

const GRAMMAR_CONFUSION_PATTERNS: Array<{
  regex: RegExp;
  message: string;
  suggestion: string;
}> = [
  {
    regex: /\bshould of\b/gi,
    message: 'Non-standard verb phrase ("should of"). Use "should have".',
    suggestion: 'should have',
  },
  {
    regex: /\bcould of\b/gi,
    message: 'Non-standard verb phrase ("could of"). Use "could have".',
    suggestion: 'could have',
  },
  {
    regex: /\bwould of\b/gi,
    message: 'Non-standard verb phrase ("would of"). Use "would have".',
    suggestion: 'would have',
  },
  {
    regex: /\ba lot of of\b/gi,
    message: 'Duplicated preposition ("of of").',
    suggestion: 'a lot of',
  },
  {
    regex: /\bin to the\b/gi,
    message: 'Check spacing ("in to the" vs "into the").',
    suggestion: 'into the',
  },
  {
    regex: /\byour welcome\b/gi,
    message: 'Possessive "your" used where contraction "you\'re" is expected.',
    suggestion: "you're welcome",
  },
  {
    regex: /\bits a\b/gi,
    message: 'Check contraction ("its a" vs "it\'s a").',
    suggestion: "it's a",
  },
  {
    regex: /\bthere are a\b/gi,
    message: 'Subject-verb agreement ("there are a" -> "there is a").',
    suggestion: 'there is a',
  },
  {
    regex: /\bthere is many\b/gi,
    message: 'Subject-verb agreement ("there is many" -> "there are many").',
    suggestion: 'there are many',
  },
];

const SCREENPLAY_SAFE_TERMS = new Set<string>([
  'int',
  'ext',
  'pov',
  'cu',
  'ecu',
  'ws',
  'ms',
  'ots',
  'sfx',
  'vfx',
  'vo',
  'os',
  'oc',
  'contd',
  'prelap',
  'intercut',
  'mos',
  'chyrons',
  'chyron',
  'bg',
  'fg',
  'mg',
  'beat',
  'nle',
  'xml',
  'dcp',
  'ltc',
  'teleprompter',
  'soundscape',
  'ambience',
  'foley',
  'subbass',
]);

function buildExcerpt(text: string, start: number, end: number): string {
  const ctxStart = Math.max(0, start - 22);
  const ctxEnd = Math.min(text.length, end + 22);
  const prefix = ctxStart > 0 ? '...' : '';
  const suffix = ctxEnd < text.length ? '...' : '';
  return `${prefix}${text.slice(ctxStart, ctxEnd)}${suffix}`;
}

function matchCase(source: string, target: string): string {
  if (source === source.toUpperCase() && source.length > 1) {
    return target.toUpperCase();
  }
  if (source[0] && source[0] === source[0].toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

export function analyzeScriptProofreading(
  elements: ScreenplayElement[],
  scenes: Scene[],
  scope: ProofreadScope,
  activeSceneId: string | null,
  customDictionary: string[] = []
): ProofreadReport {
  const dictSet = new Set(customDictionary.map((w) => w.trim().toLowerCase()).filter(Boolean));
  const sceneMap = new Map<string, Scene>(scenes.map((s) => [s.id, s]));

  const targetElements =
    scope === 'scene' && activeSceneId
      ? elements.filter((el) => el.sceneId === activeSceneId)
      : elements;

  const issues: ProofreadIssue[] = [];

  for (const el of targetElements) {
    const text = el.text || '';
    if (!text.trim()) continue;
    const scene = el.sceneId ? sceneMap.get(el.sceneId) : undefined;

    // 1. Spelling checks (curated typos + repeated letters + missing vowels in lowercase words)
    const wordRegex = /\b[A-Za-z][A-Za-z']*\b/g;
    let wordMatch: RegExpExecArray | null;
    while ((wordMatch = wordRegex.exec(text)) !== null) {
      const rawWord = wordMatch[0];
      const lower = rawWord.toLowerCase();
      const start = wordMatch.index;
      const end = start + rawWord.length;

      if (dictSet.has(lower) || SCREENPLAY_SAFE_TERMS.has(lower)) continue;

      const mapped = MISSPELLING_MAP[lower];
      if (mapped && mapped !== lower) {
        const replacement = matchCase(rawWord, mapped);
        issues.push({
          id: `spell-${el.id}-${start}`,
          kind: 'spelling',
          elementId: el.id,
          sceneId: el.sceneId,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementType: el.type,
          wordOrPhrase: rawWord,
          message: `Possible misspelling "${rawWord}".`,
          suggestion: replacement,
          safeAutoFix: true,
          startIndex: start,
          endIndex: end,
          excerpt: buildExcerpt(text, start, end),
        });
        continue;
      }

      // Detect triple repeated letters (e.g., "loook", "runnning") except stylistic dialogue onomatopoeia if all-caps
      if (
        /(.)\1\1/.test(lower) &&
        rawWord !== rawWord.toUpperCase() &&
        !['hmm', 'shhh', 'zzz', 'brrr', 'psst'].includes(lower)
      ) {
        const collapsed = rawWord.replace(/(.)\1{2,}/g, '$1$1');
        issues.push({
          id: `spell-rep-${el.id}-${start}`,
          kind: 'spelling',
          elementId: el.id,
          sceneId: el.sceneId,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementType: el.type,
          wordOrPhrase: rawWord,
          message: `Triple repeated character in "${rawWord}".`,
          suggestion: collapsed,
          safeAutoFix: false,
          startIndex: start,
          endIndex: end,
          excerpt: buildExcerpt(text, start, end),
        });
      }
    }

    // 2. Grammar & screenplay formatting checks
    // 2a. Repeated adjacent words (e.g. "the the")
    const dupRegex = /\b([A-Za-z]+)\s+\1\b/gi;
    let dupMatch: RegExpExecArray | null;
    while ((dupMatch = dupRegex.exec(text)) !== null) {
      const start = dupMatch.index;
      const end = start + dupMatch[0].length;
      issues.push({
        id: `gram-dup-${el.id}-${start}`,
        kind: 'grammar',
        elementId: el.id,
        sceneId: el.sceneId,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementType: el.type,
        wordOrPhrase: dupMatch[0],
        message: `Repeated word "${dupMatch[1]}".`,
        suggestion: dupMatch[1],
        safeAutoFix: true,
        startIndex: start,
        endIndex: end,
        excerpt: buildExcerpt(text, start, end),
      });
    }

    // 2b. Double spaces inside sentence
    const dblSpaceRegex = / {2,}/g;
    let spaceMatch: RegExpExecArray | null;
    while ((spaceMatch = dblSpaceRegex.exec(text)) !== null) {
      // Ignore leading indentation if any
      if (spaceMatch.index === 0) continue;
      const start = spaceMatch.index;
      const end = start + spaceMatch[0].length;
      issues.push({
        id: `gram-space-${el.id}-${start}`,
        kind: 'grammar',
        elementId: el.id,
        sceneId: el.sceneId,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementType: el.type,
        wordOrPhrase: spaceMatch[0],
        message: 'Extra consecutive spaces.',
        suggestion: ' ',
        safeAutoFix: true,
        startIndex: start,
        endIndex: end,
        excerpt: buildExcerpt(text, start, end),
      });
    }

    // 2c. Common grammar confusion patterns
    for (const pattern of GRAMMAR_CONFUSION_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let gMatch: RegExpExecArray | null;
      while ((gMatch = pattern.regex.exec(text)) !== null) {
        const start = gMatch.index;
        const end = start + gMatch[0].length;
        issues.push({
          id: `gram-pat-${el.id}-${start}-${pattern.suggestion}`,
          kind: 'grammar',
          elementId: el.id,
          sceneId: el.sceneId,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementType: el.type,
          wordOrPhrase: gMatch[0],
          message: pattern.message,
          suggestion: matchCase(gMatch[0], pattern.suggestion),
          safeAutoFix: false,
          startIndex: start,
          endIndex: end,
          excerpt: buildExcerpt(text, start, end),
        });
      }
    }

    // 2d. Sentence capitalization check for Action, Dialogue, Voice-over, Summary
    if (
      (el.type === 'ACTION' ||
        el.type === 'DIALOGUE' ||
        el.type === 'VOICE_OVER' ||
        el.type === 'SUMMARY') &&
      /^[a-z]/.test(text.trim())
    ) {
      const firstIdx = text.search(/[a-z]/);
      if (firstIdx >= 0) {
        issues.push({
          id: `gram-cap-${el.id}`,
          kind: 'grammar',
          elementId: el.id,
          sceneId: el.sceneId,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementType: el.type,
          wordOrPhrase: text.slice(firstIdx, firstIdx + 12),
          message: 'Block starts with a lowercase letter.',
          suggestion: text.charAt(firstIdx).toUpperCase(),
          safeAutoFix: false,
          startIndex: firstIdx,
          endIndex: firstIdx + 1,
          excerpt: buildExcerpt(text, firstIdx, Math.min(text.length, firstIdx + 18)),
        });
      }
    }

    // 2e. Missing terminal punctuation on Action / Dialogue / Voice-over (> 2 words)
    if (
      (el.type === 'ACTION' || el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') &&
      text.trim().split(/\s+/).length >= 3 &&
      !/[.!?\-"')\]…:]$/.test(text.trim())
    ) {
      const trimmedEnd = text.trimEnd().length;
      issues.push({
        id: `gram-punct-${el.id}`,
        kind: 'grammar',
        elementId: el.id,
        sceneId: el.sceneId,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementType: el.type,
        wordOrPhrase: text.slice(Math.max(0, trimmedEnd - 12), trimmedEnd),
        message: 'Sentence appears to be missing terminal punctuation.',
        suggestion: `${text.slice(Math.max(0, trimmedEnd - 12), trimmedEnd)}.`,
        safeAutoFix: false,
        startIndex: Math.max(0, trimmedEnd - 12),
        endIndex: trimmedEnd,
        excerpt: buildExcerpt(text, Math.max(0, trimmedEnd - 18), trimmedEnd),
      });
    }

    // 2f. Unbalanced parentheses in Dialogue or Parenthetical
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push({
        id: `gram-paren-${el.id}`,
        kind: 'grammar',
        elementId: el.id,
        sceneId: el.sceneId,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementType: el.type,
        wordOrPhrase: text.slice(0, 24),
        message: 'Unbalanced parentheses detected.',
        startIndex: 0,
        endIndex: Math.min(text.length, 24),
        excerpt: buildExcerpt(text, 0, Math.min(text.length, 32)),
      });
    }

    // 2g. Scene Heading / Character formatting convention
    if (el.type === 'SCENE_HEADING' && !/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E)/i.test(text.trim())) {
      issues.push({
        id: `gram-slug-${el.id}`,
        kind: 'grammar',
        elementId: el.id,
        sceneId: el.sceneId,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementType: el.type,
        wordOrPhrase: text.slice(0, 20),
        message: 'Scene heading should begin with INT., EXT., or INT./EXT.',
        startIndex: 0,
        endIndex: Math.min(text.length, 12),
        excerpt: buildExcerpt(text, 0, Math.min(text.length, 28)),
      });
    }

    if (el.type === 'CHARACTER' && /[a-z]/.test(text.replace(/\(.*?\)/g, ''))) {
      const cleanedUpper = text.toUpperCase();
      issues.push({
        id: `gram-charcase-${el.id}`,
        kind: 'grammar',
        elementId: el.id,
        sceneId: el.sceneId,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementType: el.type,
        wordOrPhrase: text,
        message: 'Character cues are conventionally uppercase.',
        suggestion: cleanedUpper,
        safeAutoFix: false,
        startIndex: 0,
        endIndex: text.length,
        excerpt: text,
      });
    }
  }

  const spellingCount = issues.filter((i) => i.kind === 'spelling').length;
  const grammarCount = issues.filter((i) => i.kind === 'grammar').length;

  return {
    scope,
    totalElementsScanned: targetElements.length,
    spellingCount,
    grammarCount,
    issues,
  };
}

export function applyProofreadFixToText(
  originalText: string,
  issue: ProofreadIssue
): string {
  if (!issue.suggestion) return originalText;
  if (
    issue.startIndex >= 0 &&
    issue.endIndex <= originalText.length &&
    issue.endIndex > issue.startIndex
  ) {
    return (
      originalText.slice(0, issue.startIndex) +
      issue.suggestion +
      originalText.slice(issue.endIndex)
    );
  }
  return originalText;
}
