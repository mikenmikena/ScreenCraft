export type ElementType =
  | 'SCENE_HEADING'
  | 'ACTION'
  | 'CHARACTER'
  | 'DIALOGUE'
  | 'PARENTHETICAL'
  | 'TRANSITION'
  | 'SHOT'
  | 'GENERAL';

export type TagCategory =
  | 'character'
  | 'prop'
  | 'wardrobe'
  | 'vehicle'
  | 'sfx'
  | 'vfx'
  | 'extra'
  | 'location';

export interface ScreenplayElement {
  id: string;
  type: ElementType;
  text: string;
  sceneId?: string;
  shotNumber?: string;
  shotType?: string;
  character?: string;
  dualDialogue?: boolean;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  heading: string;
  setting: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  dayNight: 'DAY' | 'NIGHT' | 'EVENING' | 'DUSK' | 'DAWN';
  timecode: string;
  durationSec: number;
  pages: string; // formatted eighths e.g. "1 3/8"
  eighths: number; // raw eighths count
  characters: string[];
  synopsis: string;
  notes: string;
  budget: string;
  location: string;
  act: number;
  storyDay: number;
  timeOfDay: string;
  shootingStartDate?: string;
  shootingEndDate?: string;
  shootingDuration?: string;
  scheduleNotes?: string;
}

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color: string;
  sceneIds: string[];
  notes?: string;
  count?: number;
  image?: string; // User-uploaded profile image (data URL or URI)
}

export interface StoryComment {
  id: string;
  sceneId: string;
  elementId?: string;
  author: string;
  createdAt: string;
  text: string;
  resolved: boolean;
  page?: number;
}

export interface StripboardStrip {
  id: string;
  type: 'scene' | 'day_break' | 'banner';
  sceneId?: string;
  sceneNumber?: number;
  intExt?: string;
  dayNight?: string;
  set?: string;
  runningTime?: string;
  pages?: string;
  eighths?: number;
  storyDay?: number;
  scheduledDuration?: string;
  characters?: string[];
  timeOfDay?: string;
  bannerTitle?: string;
  bannerDate?: string;
  bannerFrom?: string;
  bannerTo?: string;
  bannerTotalPages?: string;
  colorClass?: string;
}

export interface StoryCharacter {
  name: string;
  color: string;
  actor?: string;
  scenesCount: number;
  speakingLines: number;
  status?: string;
  image?: string;
}

export type ShotType =
  | 'Wide Shot (WS)'
  | 'Extreme Long Shot (XMS)'
  | 'Medium Shot (MS)'
  | 'Close Up (CU)'
  | 'Extreme Close Up (ECU)'
  | 'Over The Shoulder (OTS)'
  | 'Point of View (POV)'
  | 'Dutch Angle'
  | 'Aerial / Bird Eye';

export type CameraMovement =
  | 'Static / Locked Off'
  | 'Pan Left'
  | 'Pan Right'
  | 'Tilt Up'
  | 'Tilt Down'
  | 'Dolly In'
  | 'Dolly Out'
  | 'Tracking / Truck'
  | 'Crane / Jib'
  | 'Steadicam / Handheld';

export interface StoryboardFrame {
  id: string;
  sceneId: string;
  shotNumber: string;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  lens: string;
  aspectRatio: '16:9' | '2.39:1' | '4:3' | '1.85:1';
  description: string;
  dialogue?: string;
  audioNotes?: string;
  durationSec: number;
  imageUrl?: string;
  drawingData?: string;
  equipment?: string;
}

export type RevisionChangeType =
  | 'text_edit'
  | 'element_added'
  | 'element_deleted'
  | 'element_type_changed'
  | 'scene_property_changed'
  | 'draft_milestone';

export interface ScreenplayRevision {
  id: string;
  timestamp: string;
  dateFormatted: string;
  author: string;
  changeType: RevisionChangeType;
  elementType?: ElementType;
  sceneId?: string;
  sceneNumber?: number;
  sceneHeading?: string;
  elementId?: string;
  previousText?: string;
  newText?: string;
  description: string;
  draftLabel?: string;
  draftColor?: string;
}

export type CrewDepartment =
  | 'Cast / Principal'
  | 'Directing'
  | 'Camera & Lighting'
  | 'Sound'
  | 'Art & Props'
  | 'Hair, Makeup & Wardrobe'
  | 'Production Office'
  | 'VFX & Post'
  | 'Locations & Stunts';

export type PayBasis = 'Daily' | 'Weekly' | 'Hourly' | 'Flat / Project';

export type AvailabilityStatus = 'Confirmed' | 'Tentative' | 'On Hold' | 'Wrapped';

export type PaymentStatus = 'Approved' | 'Pending Deal Memo' | 'On Hold';

export interface CrewConnection {
  memberId: string;
  relationship: string;
  notes?: string;
}

export interface CastCrewMember {
  id: string;
  name: string;
  category: 'cast' | 'crew';
  department: CrewDepartment;
  role: string;
  characterName?: string;
  unionStatus?: string;
  avatarUrl?: string;
  // Contact Information
  email: string;
  phone: string;
  location?: string;
  agencyOrCompany?: string;
  emergencyContact?: string;
  preferredContact?: 'Phone' | 'Email' | 'SMS' | 'Radio Ch.';
  // Compensation / Pay
  payRate: number;
  payBasis: PayBasis;
  currency?: string;
  kitFee?: number;
  paymentStatus: PaymentStatus;
  // Schedules
  callTime?: string;
  wrapTime?: string;
  scheduledDays: string[];
  linkedSceneIds: string[];
  availabilityStatus: AvailabilityStatus;
  scheduleNotes?: string;
  // Connections to other cast & crew
  connections: CrewConnection[];
}

export interface ShootLocationPhoto {
  id: string;
  url: string;
  caption?: string;
  addedAt: string;
}

export interface ShootLocation {
  id: string;
  name: string;
  address?: string;
  lat: number | null;
  lng: number | null;
  placeId?: string;
  notes?: string;
  photos: ShootLocationPhoto[];
}

export interface CharacterBreakdownOverride {
  characterName: string;
  customTraits?: string[];
  hiddenTraits?: string[];
  customMotivations?: string[];
  hiddenMotivations?: string[];
  customCostumes?: string[];
  hiddenCostumes?: string[];
  wardrobeNotes?: string;
}

// ==========================================
// 1. Script-to-NLE Metadata Pipeline Types
// ==========================================

export type NLEFrameRate = 23.976 | 24 | 25 | 29.97 | 30;

export interface NLEDialogueEntry {
  lineKey: string;
  elementId: string;
  sceneId: string;
  sceneNumber: number;
  sceneHeading: string;
  speaker: string;
  parenthetical?: string;
  exactText: string;
  normalizedText: string;
  tokens: string[];
  wordCount: number;
  timecodeIn: string;
  timecodeOut: string;
  startSec: number;
  endSec: number;
  estimatedDurationSec: number;
}

export interface NLEBlockMetadata {
  blockId: string;
  index: number;
  sceneId: string;
  sceneNumber: number;
  slugline: string;
  type: ElementType;
  speaker?: string;
  text: string;
  normalizedText: string;
  cameraDirection?: {
    shotNumber?: string;
    shotType?: string;
    cameraMovement?: string;
    lens?: string;
  };
  timecodeIn: string;
  timecodeOut: string;
  startFrame: number;
  endFrame: number;
  durationSec: number;
  tags: string[];
}

export interface NLEMetadataDocument {
  schemaVersion: string;
  exportedAt: string;
  nleTarget: 'Adobe Premiere Pro (XMEML v4)' | 'Canonical NLE Sidecar JSON';
  projectId: string;
  projectTitle: string;
  draftName: string;
  frameRate: NLEFrameRate;
  dropFrame: boolean;
  totalDurationSec: number;
  scenes: Array<{
    sceneId: string;
    sceneNumber: number;
    slugline: string;
    intExt: string;
    dayNight: string;
    setting: string;
    timecodeIn: string;
    timecodeOut: string;
    durationSec: number;
    cast: string[];
    props: string[];
    cameraDirections: string[];
  }>;
  blocks: NLEBlockMetadata[];
  dialogueIndex: {
    totalLines: number;
    entries: NLEDialogueEntry[];
    byScene: Record<string, string[]>;
    bySpeaker: Record<string, string[]>;
  };
}

export interface TranscriptSegment {
  id: string;
  takeLabel: string;
  clipName?: string;
  speakerHint?: string;
  timecodeIn: string;
  timecodeOut: string;
  text: string;
}

export interface TranscriptAlignmentMatch {
  segmentId: string;
  takeLabel: string;
  clipName?: string;
  transcriptTimecodeIn: string;
  transcriptTimecodeOut: string;
  transcriptText: string;
  matchedEntry: NLEDialogueEntry | null;
  confidence: number;
  matchQuality: 'exact' | 'strong' | 'partial' | 'unmatched';
  wordOverlapCount: number;
  speakerMatch: boolean;
}

export type NLESidecarFormat =
  | 'premiere_xml'
  | 'nle_json'
  | 'aligned_premiere_xml'
  | 'dialogue_query_json';

export interface NLEGeneratedSidecarEntry {
  id: string;
  filename: string;
  format: NLESidecarFormat;
  formatLabel: string;
  fileHash: string;
  shortHash: string;
  generatedAt: string;
  frameRate: NLEFrameRate;
  byteSize: number;
  sceneCount: number;
  dialogueLineCount: number;
  alignedTakeCount: number;
  preFlightWarningsCount: number;
  draftName?: string;
  scriptSnapshotHash: string;
}

// ==========================================
// 2. Live Script-to-Schedule Sync Types
// ==========================================

export interface ScheduleSceneSnapshot {
  sceneId: string;
  sceneNumber: number;
  heading: string;
  setting: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  dayNight: 'DAY' | 'NIGHT' | 'EVENING' | 'DUSK' | 'DAWN';
  location: string;
  pages: string;
  eighths: number;
  storyDay: number;
  timeOfDay: string;
  characters: string[];
  props: string[];
  wardrobe: string[];
}

export interface ScheduleConflictFlag {
  severity: 'conflict' | 'warning';
  category: 'cast_unavailable' | 'cast_overlap' | 'cast_unscheduled' | 'new_location' | 'added_prop';
  characterOrItem: string;
  message: string;
  shootDayLabel?: string;
}

export interface SceneSyncDiff {
  sceneId: string;
  sceneNumber: number;
  heading: string;
  status: 'added_scene' | 'modified' | 'removed_from_script';
  liveSnapshot: ScheduleSceneSnapshot;
  previousSnapshot?: ScheduleSceneSnapshot;
  addedLocations: string[];
  changedLocationFrom?: string;
  addedProps: string[];
  removedProps: string[];
  addedWardrobe: string[];
  addedCast: string[];
  removedCast: string[];
  eighthsDelta: number;
  conflicts: ScheduleConflictFlag[];
}

export interface RevisionImpactReport {
  hasChanges: boolean;
  totalImpactedScenes: number;
  totalAddedProps: number;
  totalNewLocations: number;
  totalCastConflicts: number;
  totalCastAdditions: number;
  sceneDiffs: SceneSyncDiff[];
  generatedAt: string;
}

// ==========================================
// 3. Unified Project Container Types
// ==========================================

export type ScriptFormatMode = 'single_column_film' | 'av_multi_column';

export interface CharacterBio {
  id: string;
  characterName: string;
  roleType: 'Lead' | 'Supporting' | 'Antagonist' | 'Featured' | 'Ensemble';
  loglineSummary: string;
  backstory: string;
  arcStartToEnd: string;
  coreFlawOrTension: string;
  visualNotes?: string;
}

export interface PitchSection {
  id: string;
  title: string;
  category: 'Hook & Premise' | 'World & Tone' | 'Story Arc' | 'Audience & Comps' | 'Visual Approach';
  content: string;
  updatedAt: string;
}

export interface ResearchNote {
  id: string;
  title: string;
  topic: 'Worldbuilding' | 'Technical / Sci-Fi' | 'Historical / Period' | 'Location' | 'Character Study';
  summary: string;
  sourceRef?: string;
  linkedSceneIds: string[];
  createdAt: string;
}

export interface ProjectBible {
  logline: string;
  genre: string;
  formatLabel: string;
  targetRuntime: string;
  themes: string[];
  pitchSummary: string;
  characterBios: CharacterBio[];
  pitchDocs: PitchSection[];
  researchNotes: ResearchNote[];
}

export interface StoryProject {
  id: string;
  title: string;
  author: string;
  lastModified: string;
  elements: ScreenplayElement[];
  scenes: Scene[];
  tags: Tag[];
  comments: StoryComment[];
  strips: StripboardStrip[];
  characters: StoryCharacter[];
  storyboards?: StoryboardFrame[];
  revisions?: ScreenplayRevision[];
  activeDraftColor?: string;
  activeDraftName?: string;
  crewMembers?: CastCrewMember[];
  locations?: ShootLocation[];
  characterBreakdowns?: CharacterBreakdownOverride[];
  scriptFormat?: ScriptFormatMode;
  projectBible?: ProjectBible;
  scheduleBaseline?: ScheduleSceneSnapshot[];
  lastScheduleSyncAt?: string;
  generatedMetadataLog?: NLEGeneratedSidecarEntry[];
}

export type ActiveWorkspace =
  | 'authoring'
  | 'production'
  | 'storyboard'
  | 'project_bible'
  | 'rust_engine'
  | 'projects';

