import React, { useMemo, useState } from 'react';
import {
  X,
  HelpCircle,
  Search,
  BookOpen,
  Film,
  Columns,
  Mic,
  History,
  ShieldAlert,
  Users,
  Network,
  MapPin,
  FileSpreadsheet,
  Camera,
  AudioWaveform,
  MonitorPlay,
  Printer,
  PanelLeft,
  Keyboard,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Sliders,
  StickyNote,
} from 'lucide-react';
import { ActiveWorkspace } from '../types/story';

export type HelpSectionCategory =
  | 'all'
  | 'authoring'
  | 'review'
  | 'production'
  | 'visuals'
  | 'export'
  | 'shortcuts';

export interface HelpGuideLaunchActions {
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  onOpenContinuityCheck: () => void;
  onToggleRevisionPassMode: () => void;
  isRevisionPassMode: boolean;
  onOpenTeleprompter: () => void;
  onOpenNLEPipeline: () => void;
  onOpenExportModal: () => void;
  onOpenReports: () => void;
  onOpenCastCrew: () => void;
  onOpenCharacterConnections: () => void;
  onOpenCallSheet: () => void;
  onOpenLocationMap: () => void;
  onOpenRevisionImpact: () => void;
  onToggleFocusCenter: () => void;
  onOpenQuickNotes?: () => void;
}

interface HelpGuideModalProps {
  initialCategory?: HelpSectionCategory;
  initialToolId?: string;
  actions: HelpGuideLaunchActions;
  onClose: () => void;
}

interface ToolStep {
  title: string;
  detail: string;
  example?: string;
}

interface ToolDocEntry {
  id: string;
  category: Exclude<HelpSectionCategory, 'all' | 'shortcuts'>;
  categoryLabel: string;
  name: string;
  locationLabel: string;
  summary: string;
  icon: React.ReactNode;
  steps: ToolStep[];
  tips: string[];
  shortcuts?: { keys: string; action: string }[];
  launchLabel?: string;
  onLaunch?: (actions: HelpGuideLaunchActions) => void;
  closesModalOnLaunch?: boolean;
}

const TOOL_DOCS: ToolDocEntry[] = [
  {
    id: 'screenplay-editor',
    category: 'authoring',
    categoryLabel: 'Authoring',
    name: 'Screenplay Editor (Film & A/V)',
    locationLabel: 'Authoring Workspace · Center Canvas',
    summary:
      'Write industry-standard 12pt Courier screenplays or switch seamlessly to a synchronized Multi-Column A/V script with embedded storyboard plates.',
    icon: <Film className="w-4 h-4 text-amber-400 shrink-0" />,
    steps: [
      {
        title: 'Format screenplay blocks automatically',
        detail:
          'Press Enter after a Scene Heading to start an Action block, or after a Character cue to begin Dialogue. Use the Format selector in the top toolbar to change any focused block manually.',
        example: 'INT. COUNCIL HALL - NIGHT  →  Enter  →  Action block',
      },
      {
        title: 'Switch between Single-Column Film and A/V Multi-Column',
        detail:
          'Use the Film / A/V switcher on the Formatting Toolbar to view the same underlying project elements either as traditional Courier pages or a 3-column Shot / Video / Audio production script.',
      },
      {
        title: 'Attach storyboard reference frames in A/V mode',
        detail:
          'Click "Attach Storyboard Image" inside any A/V row to upload reference artwork directly linked to that scene and shot cue.',
      },
    ],
    tips: [
      'Click any scene in the left Outline panel to jump straight to that slugline, or click a scene heading arrow to preview its dialogue inline without losing cursor focus.',
      'Project edits auto-save every 30 seconds to localStorage, or press Ctrl+S / Cmd+S anytime.',
    ],
    shortcuts: [
      { keys: 'Enter (empty line) / Ctrl + /', action: 'Open the [G]..[4] Elements composing shortcut menu' },
      { keys: 'Alt + G/S/A/C/P/D/V/T/H/L/N/Q/E/0..4', action: 'Switch element type directly while typing' },
      { keys: 'Ctrl + B / I / U', action: 'Toggle Bold, Italic, or Underline on active block' },
      { keys: 'Ctrl + Shift + X / H', action: 'Toggle Strikethrough or Highlight color' },
      { keys: 'Ctrl + Shift + L / C / R', action: 'Align active block Left, Center, or Right' },
      { keys: 'Tab', action: 'Cycle Dialogue → Voice-over (V.O.) → Parenthetical' },
      { keys: 'Backspace (empty line)', action: 'Delete an empty screenplay element' },
    ],
    launchLabel: 'Open Authoring Workspace',
    onLaunch: (a) => a.onSelectWorkspace('authoring'),
    closesModalOnLaunch: true,
  },
  {
    id: 'voice-over',
    category: 'authoring',
    categoryLabel: 'Authoring',
    name: 'Voice-over (V.O.) Element',
    locationLabel: 'Formatting Toolbar · Insert Menu · Tab Cycle',
    summary:
      'Separates narration and internal monologue from on-camera dialogue so Character Breakdowns, Stripboards, Fountain, and FDX exports tag spoken presence accurately.',
    icon: <Mic className="w-4 h-4 text-violet-400 shrink-0" />,
    steps: [
      {
        title: 'Create or convert a V.O. block',
        detail:
          'Press Tab while editing Dialogue, select "Voice-over (V.O.)" from the Format dropdown, or choose Insert → Voice-over (V.O.). Typing a character cue ending in (V.O.) and pressing Enter also creates a V.O. element automatically.',
      },
      {
        title: 'Assign a speaker when needed',
        detail:
          'When no Character cue sits immediately above a V.O. block, use the inline speaker selector inside the violet V.O. block to attribute it to a character or NARRATOR.',
      },
      {
        title: 'Verify downstream tagging',
        detail:
          'The Stripboard and Character Breakdown automatically distinguish V.O.-only scenes from On-Set speaking appearances and display separate V.O. cue counts.',
      },
    ],
    tips: [
      'Both Fountain (.fountain) and Final Draft (.fdx) exporters automatically append (V.O.) to the Character cue when followed by a Voice-over element.',
    ],
    launchLabel: 'Go to Script Editor',
    onLaunch: (a) => a.onSelectWorkspace('authoring'),
    closesModalOnLaunch: true,
  },
  {
    id: 'quick-notes',
    category: 'authoring',
    categoryLabel: 'Authoring',
    name: 'Quick Notes Floating Scratchpad',
    locationLabel: 'Authoring Workspace · Document Bar & Floating Launcher',
    summary:
      'Keep a local digital scratchpad and categorized scene-idea cards floating alongside your script without affecting screenplay text or exports.',
    icon: <StickyNote className="w-4 h-4 text-amber-400 shrink-0" />,
    steps: [
      {
        title: 'Open or snap the floating sidebar',
        detail:
          'Click "Quick Notes" in the Authoring document bar or the floating corner button. Use the header snap toggle to dock it to either the left or right edge of your script canvas.',
      },
      {
        title: 'Jot freeform notes or save Idea Cards',
        detail:
          'Use the Scratchpad tab for raw thoughts (auto-saved locally in your browser), or switch to Ideas to capture categorized Scene Ideas, Dialogue Alts, or Research cards linked to the active scene.',
      },
      {
        title: 'Switch Script vs. Global scope or promote to script',
        detail:
          'Toggle between Script-scoped notes and your Global cross-project scratchpad, or click "Insert to Script" on any Idea Card when you are ready to move a beat into the draft.',
      },
    ],
    tips: [
      'Notes are stored locally in browser localStorage and are excluded from PDF, Fountain, and Final Draft exports.',
    ],
    launchLabel: 'Open Quick Notes',
    onLaunch: (a) => {
      if (a.onOpenQuickNotes) a.onOpenQuickNotes();
      else a.onSelectWorkspace('authoring');
    },
    closesModalOnLaunch: true,
  },
  {
    id: 'collapsible-panels',
    category: 'authoring',
    categoryLabel: 'Authoring',
    name: 'Collapsible Sidebars & Stacked Inspector',
    locationLabel: 'Document Bar · Left & Right Panel Headers',
    summary:
      'Collapse either the Left Outline or Right Inspector into sleek icon rails—or trigger Focus Center—to maximize screen space for writing or stripboard scheduling.',
    icon: <PanelLeft className="w-4 h-4 text-cyan-400 shrink-0" />,
    steps: [
      {
        title: 'Collapse individual panels',
        detail:
          'Click the panel collapse icon in the header of "Outline & Properties" or "Scene Inspector", or click Outline / Inspector in the top document tab bar.',
      },
      {
        title: 'Maximize the center window in one click',
        detail:
          'Click "Focus Center" in the document tab bar to collapse both left and right panels simultaneously. Click "Restore Panels" to bring both back.',
      },
      {
        title: 'Use stacked Inspector tabs',
        detail:
          'The Right Inspector organizes Scene, Comments, Tags, Shots, History, and Continuity into a 2-row × 3-column grid so every section and live count stays visible without horizontal scrolling.',
      },
    ],
    tips: [
      'When collapsed, clicking any icon on the narrow vertical rail immediately expands the panel straight to that tab.',
    ],
    launchLabel: 'Toggle Focus Center Now',
    onLaunch: (a) => a.onToggleFocusCenter(),
    closesModalOnLaunch: false,
  },
  {
    id: 'revision-pass',
    category: 'review',
    categoryLabel: 'Review & QC',
    name: 'Revision Pass Mode & History',
    locationLabel: 'Authoring Sub-Ribbon · Inspector History Tab',
    summary:
      'Color-codes screenplay elements directly on the page by last edited date (Red for Today, Yellow for This Week, Grey for Older) and tracks element-level diffs.',
    icon: <History className="w-4 h-4 text-rose-400 shrink-0" />,
    steps: [
      {
        title: 'Toggle Revision Pass Mode',
        detail:
          'Click "Revision Pass: Off/On" in the strip right beneath the Formatting Toolbar. Live element counts for Today, This Week, and Older update in the legend.',
      },
      {
        title: 'Inspect and revert individual edits',
        detail:
          'Open the History tab in the Right Inspector to filter edits by scene or project, view strikethrough diffs, or click "Revert Edit" on any recorded change.',
      },
      {
        title: 'Create Hollywood color draft milestones',
        detail:
          'Use "New Draft Milestone" inside the History tab to snapshot Blue, Pink, Yellow, or Green production revision passes.',
      },
    ],
    tips: [
      'Hover over any highlighted block while Revision Pass is active to see its exact edit timestamp.',
    ],
    launchLabel: 'Toggle Revision Pass Mode',
    onLaunch: (a) => {
      a.onSelectWorkspace('authoring');
      a.onToggleRevisionPassMode();
    },
    closesModalOnLaunch: false,
  },
  {
    id: 'continuity-check',
    category: 'review',
    categoryLabel: 'Review & QC',
    name: 'Automated Scene Continuity Check',
    locationLabel: 'Formatting Toolbar · Review Menu · Inspector Continuity Tab',
    summary:
      'Continuously parses Action, Shot, and Parenthetical text across chronological scenes to catch prop and costume mismatches per character and location.',
    icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
    steps: [
      {
        title: 'Review live continuity alerts',
        detail:
          'Open the Continuity tab in the Right Inspector or click "Continuity (N)" on the Formatting Toolbar to open the full side-by-side diagnostic modal.',
        example: 'Sc. 1: "blue jacket"  vs.  Sc. 2 (same Story Day): "red jacket"',
      },
      {
        title: 'Inspect side-by-side evidence & jump to script',
        detail:
          'Each alert displays the Established scene excerpt alongside the Conflicting scene excerpt. Click "Jump to Script" or "Edit in Script" to scroll directly to the element.',
      },
      {
        title: 'Use natural transitions or dismiss intentional changes',
        detail:
          'Phrases like "changed into", "puts on a fresh", or "repaired" automatically clear false positives. Intentional differences can be dismissed and restored anytime.',
      },
    ],
    tips: [
      'Switch to the "Tracked Inventory" tab inside the Continuity modal to inspect every costume and prop the analyzer is tracking per character and location—even when conflicts equal zero.',
    ],
    launchLabel: 'Open Scene Continuity Check',
    onLaunch: (a) => a.onOpenContinuityCheck(),
    closesModalOnLaunch: true,
  },
  {
    id: 'stripboard-sync',
    category: 'production',
    categoryLabel: 'Production',
    name: 'Production Stripboard & Live Schedule Sync',
    locationLabel: 'Workspace: Production Schedule · Formatting Toolbar',
    summary:
      'Organize shooting days with color-coded scene strips, Day/Meal breaks, and preview how script edits impact page counts and scheduled cast before syncing.',
    icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />,
    steps: [
      {
        title: 'Reorder scenes & group shooting days',
        detail:
          'Switch to Production Schedule in the Workspace selector, then drag strips or insert Day Break / Meal Break banners to organize your shooting order.',
      },
      {
        title: 'Preview script-to-schedule impact',
        detail:
          'Click "Schedule Sync" on the toolbar whenever scenes are edited in Authoring to inspect added/removed cast or page-eighth deltas before committing updates to the stripboard.',
      },
      {
        title: 'Run the automated Optimization Wizard',
        detail:
          'Click "Optimization Wizard" in the Stripboard toolbar to calculate the most efficient shooting order across shared locations, lighting setups, and cast blocks—comparing turnaround minutes, company moves, and Cast Day-Out-of-Days spans before applying.',
      },
      {
        title: 'Recalculate 1/8th page counts',
        detail:
          'Use "Recalc" in the toolbar or Production menu to recompute Hollywood 1/8th page lengths and cumulative scene timecodes.',
      },
    ],
    tips: [
      'Click any scene strip to edit its Story Day, Set Name, Estimated Budget, and Scheduled Duration in the Strip Properties inspector.',
      'After applying an Optimization Wizard schedule, use "Undo Optimization" in the Stripboard toolbar anytime to restore the previous sequence.',
    ],
    launchLabel: 'Open Production Stripboard',
    onLaunch: (a) => a.onSelectWorkspace('production'),
    closesModalOnLaunch: true,
  },
  {
    id: 'cast-crew-directory',
    category: 'production',
    categoryLabel: 'Production',
    name: 'Cast & Crew Directory, Gallery & Call Sheets',
    locationLabel: 'Production Menu · Cast & Crew Sub-View',
    summary:
      'Manage cast and crew contacts, browse a circular-portrait Cast Gallery, inspect automated Character Breakdowns, and generate printable daily Call Sheets.',
    icon: <Users className="w-4 h-4 text-amber-400 shrink-0" />,
    steps: [
      {
        title: 'Switch between Roster, Gallery View & Character Breakdown',
        detail:
          'Open Production → Cast & Crew Address Book, then choose Roster for contact details, Gallery View for circular cast headshots pulled from character tags or uploads, or Character Breakdown for scene/V.O. analytics.',
      },
      {
        title: 'Generate Automated Daily Call Sheets',
        detail:
          'Switch to the Call Sheet tab (or choose Production → Automated Call Sheet Generator) and select a Shooting Day to build a PDF-ready call sheet from your stripboard and cast roster.',
      },
    ],
    tips: [
      'Upload portrait images inside Inspector → Tags on character tags and they automatically populate in Cast Gallery View.',
    ],
    launchLabel: 'Open Cast & Crew Directory',
    onLaunch: (a) => a.onOpenCastCrew(),
    closesModalOnLaunch: true,
  },
  {
    id: 'character-connections',
    category: 'production',
    categoryLabel: 'Characters & Graph',
    name: 'Node-Based Character Connections Chart',
    locationLabel: 'Characters Workspace → Node Connections · Cast & Crew → Connections',
    summary:
      'Visualize character co-appearances, dialogue exchanges, and narrative relationship dynamics on an interactive node graph with draggable connection descriptors.',
    icon: <Network className="w-4 h-4 text-cyan-400 shrink-0" />,
    steps: [
      {
        title: 'Inspect auto-detected script interaction weight',
        detail:
          'Edge thickness and labels reflect shared scenes and dialogue/V.O. turns extracted live from your screenplay.',
      },
      {
        title: 'Author narrative relationships & drag connection descriptors',
        detail:
          'Click "+ Add Relationship" or select any node/edge to define Alliance, Conflict, Hierarchy, Emotional, or Mystery links, and drag any descriptor label freely across the canvas.',
      },
      {
        title: 'Arrange & filter the canvas',
        detail:
          'Drag character nodes to organize ensembles, filter by relationship polarity, or toggle Script-Detected vs. Authored edges.',
      },
    ],
    tips: [
      'Both node and connection descriptor positions save per project so your story web stays exactly where you arranged it.',
    ],
    launchLabel: 'Open Character Connections',
    onLaunch: (a) => a.onOpenCharacterConnections(),
    closesModalOnLaunch: true,
  },
  {
    id: 'location-map',
    category: 'production',
    categoryLabel: 'Production',
    name: 'Shooting Location Map',
    locationLabel: 'Production Workspace → Location Map',
    summary:
      'Link screenplay sets and scenes to real-world shooting addresses, inspect travel clusters, and verify studio vs. on-location logistics.',
    icon: <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />,
    steps: [
      {
        title: 'Map script sets to physical locations',
        detail:
          'Select any extracted scene setting in the Location Map workspace to assign addresses, parking/basecamp notes, and coordinates.',
      },
      {
        title: 'Jump back to linked scenes',
        detail:
          'Click any linked scene badge from a location card to jump straight back to that scene in Authoring.',
      },
    ],
    tips: [
      'Keep location notes updated here so Automated Call Sheets reflect accurate unit addresses.',
    ],
    launchLabel: 'Open Location Map',
    onLaunch: (a) => a.onOpenLocationMap(),
    closesModalOnLaunch: true,
  },
  {
    id: 'storyboard-bible',
    category: 'visuals',
    categoryLabel: 'Storyboards & Overview',
    name: 'Storyboarding Suite & Production Overview',
    locationLabel: 'Storyboarding Workspace · Production Workspace',
    summary:
      'Build scene-linked camera shot lists with lenses/movements in Storyboarding, and maintain your logline, pitch docs, research notes, equipment manifest, and finances in Production.',
    icon: <Camera className="w-4 h-4 text-amber-400 shrink-0" />,
    steps: [
      {
        title: 'Create camera shots linked to scenes',
        detail:
          'Open the Shots tab in the Right Inspector to quick-add a storyboard frame for the active scene, or use the Storyboarding workspace (or embedded Storyboards tab in Production).',
      },
      {
        title: 'Centralize logline, pitch docs & research notes',
        detail:
          'Open the Production workspace to manage Logline & Overviews, Pitch Docs, Research Notes, Equipment Manifest, and Recalculate Finance tools.',
      },
    ],
    tips: [
      'Storyboard frames added here automatically appear in Multi-Column A/V Script mode.',
    ],
    launchLabel: 'Open Storyboarding Suite',
    onLaunch: (a) => a.onSelectWorkspace('storyboard'),
    closesModalOnLaunch: true,
  },
  {
    id: 'nle-pipeline',
    category: 'export',
    categoryLabel: 'Post & Export',
    name: 'NLE Pipeline, Presets & Sidecar Log',
    locationLabel: 'Formatting Toolbar → NLE Pipeline · Production Menu',
    summary:
      'Generate Premiere Pro XML, DaVinci Resolve, and Avid Media Composer metadata sidecars with saved NLE presets, simultaneous-location schedule conflict checks, and SHA-256 export history.',
    icon: <AudioWaveform className="w-4 h-4 text-cyan-400 shrink-0" />,
    steps: [
      {
        title: 'Check Pre-Flight character & schedule conflicts',
        detail:
          'Review character presence indicators cross-referenced against your stripboard to spot characters booked at two locations on the same shooting day.',
      },
      {
        title: 'Save or load NLE Presets',
        detail:
          'Configure frame rate, marker options, and target NLE (Premiere Pro, DaVinci Resolve, Avid) and save reusable presets in the Presets section.',
      },
      {
        title: 'Verify Generated Metadata Log',
        detail:
          'Every exported XML or NLE JSON sidecar records its timestamp and cryptographic file hash in the Generated Metadata Log tab for editorial version control.',
      },
    ],
    tips: [
      'Use the Speech-to-Text Take Aligner inside NLE Pipeline to match recorded dialogue transcripts back to scripted lines.',
    ],
    launchLabel: 'Open NLE Pipeline',
    onLaunch: (a) => a.onOpenNLEPipeline(),
    closesModalOnLaunch: true,
  },
  {
    id: 'teleprompter',
    category: 'export',
    categoryLabel: 'Post & Export',
    name: 'Dedicated Filming Teleprompter',
    locationLabel: 'Formatting Toolbar → Teleprompter · View / Production Menu',
    summary:
      'Launches a high-contrast white-on-black teleprompter window supporting both authored screenplay projects (filtered by scene/character) and custom pasted copy with live scroll speed and text size controls.',
    icon: <MonitorPlay className="w-4 h-4 text-[#ff7700] shrink-0" />,
    steps: [
      {
        title: 'Choose authored script or custom text',
        detail:
          'Select any project from the Script Project picker to read scenes in order, or switch to the Custom Text panel to add on-set announcements, cue cards, or narration notes.',
      },
      {
        title: 'Dial in text size, scroll speed & mirroring',
        detail:
          'Adjust font size, pixels-per-second auto-scroll speed, and horizontal/vertical mirror mode for beam-splitter glass rigs, then press Play/Pause (Spacebar).',
      },
    ],
    tips: [
      'Use the scene jump selector in the teleprompter bar to cue talent straight to any scene during takes.',
    ],
    launchLabel: 'Launch Teleprompter',
    onLaunch: (a) => a.onOpenTeleprompter(),
    closesModalOnLaunch: true,
  },
  {
    id: 'export-live-preview',
    category: 'export',
    categoryLabel: 'Post & Export',
    name: 'Export & Live Preview (PDF / FDX / Fountain)',
    locationLabel: 'File Menu → Export Options...',
    summary:
      'Verify exact Courier 12pt US Letter pagination, page counts, Title Page layout, and Final Draft (.fdx) XML paragraph tags in a Live Preview pane before exporting.',
    icon: <Printer className="w-4 h-4 text-rose-400 shrink-0" />,
    steps: [
      {
        title: 'Select your target format',
        detail:
          'Choose PDF Screenplay, Final Draft (.fdx), Fountain (.fountain), Schedule CSV, Premiere Pro XML, NLE Sidecar JSON, or the Desktop Rust/Tauri Bundle.',
      },
      {
        title: 'Inspect formatted pages & XML source',
        detail:
          'Toggle Title Page, Scene Numbers, and Page Numbers in the left pane and watch page breaks update live on the right. For .fdx, switch between Formatted Pages and FDX XML Source.',
      },
      {
        title: 'Verify page counts & commit export',
        detail:
          'Confirm total output pages, 1/8th page counts, and estimated file size in the Pre-Export Verification Summary, then click Print / Save PDF or Export.',
      },
    ],
    tips: [
      'Use Single Page view + page arrows in the Live Preview toolbar to inspect exact page breaks on long scenes.',
    ],
    launchLabel: 'Open Export & Live Preview',
    onLaunch: (a) => a.onOpenExportModal(),
    closesModalOnLaunch: true,
  },
];

const SHORTCUT_REFERENCE: {
  keys: string;
  context: string;
  description: string;
}[] = [
  { keys: 'Enter (empty) / Ctrl + /', context: 'Screenplay Editor', description: 'Open Elements popup ([G] General, [S] Scene Heading, [A] Action, [C] Character, [P] Parenthetical, [D] Dialogue, [V] V.O., [T] Transition, [H] Shot, [L] Cast List, [N] New Act, [Q] Sequence, [E] End of Act, [0] Summary, [1-3] Outline 1-3, [4] Note)' },
  { keys: 'Alt + [Key]', context: 'Screenplay Editor', description: 'Instantly switch focused block using any Elements mnemonic key (G, S, A, C, P, D, V, T, H, L, N, Q, E, 0–4)' },
  { keys: 'Ctrl + B / I / U', context: 'Screenplay Editor', description: 'Toggle Bold, Italic, or Underline formatting on the focused screenplay element' },
  { keys: 'Ctrl + Shift + X / H', context: 'Screenplay Editor', description: 'Toggle Strikethrough or Highlight background on the focused screenplay element' },
  { keys: 'Ctrl + Shift + L / C / R', context: 'Screenplay Editor', description: 'Set Left, Center, or Right text justification on the focused element' },
  { keys: 'Enter', context: 'Non-empty Element', description: 'Create next logical screenplay element (Scene Heading → Action, Character → Dialogue/V.O.)' },
  { keys: 'Tab', context: 'Screenplay Editor', description: 'Cycle Dialogue ↔ Voice-over (V.O.) ↔ Parenthetical, or Action ↔ Character' },
  { keys: 'Backspace', context: 'Empty Script Element', description: 'Remove an empty element and return focus upward' },
  { keys: 'Ctrl + S / Cmd + S', context: 'Global', description: 'Save current project state immediately to local storage' },
  { keys: 'Esc', context: 'Outline Search / Popup', description: 'Close Elements popup or clear active scene outline search query' },
  { keys: 'Space', context: 'Teleprompter Window', description: 'Play / Pause teleprompter scrolling' },
];

const CATEGORY_TABS: { id: HelpSectionCategory; label: string }[] = [
  { id: 'all', label: 'All Tools' },
  { id: 'authoring', label: 'Authoring' },
  { id: 'review', label: 'Review & QC' },
  { id: 'production', label: 'Production' },
  { id: 'visuals', label: 'Visuals & Bible' },
  { id: 'export', label: 'Post & Export' },
  { id: 'shortcuts', label: 'Shortcuts' },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  initialCategory = 'all',
  initialToolId,
  actions,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<HelpSectionCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToolId, setSelectedToolId] = useState<string>(() => {
    if (initialToolId && TOOL_DOCS.some((t) => t.id === initialToolId)) {
      return initialToolId;
    }
    if (initialCategory !== 'all' && initialCategory !== 'shortcuts') {
      const firstMatch = TOOL_DOCS.find((t) => t.category === initialCategory);
      if (firstMatch) return firstMatch.id;
    }
    return TOOL_DOCS[0].id;
  });

  const [completedStepKeys, setCompletedStepKeys] = useState<Record<string, boolean>>({});
  const [exploredToolIds, setExploredToolIds] = useState<Record<string, boolean>>(() => ({
    [initialToolId || TOOL_DOCS[0].id]: true,
  }));

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOL_DOCS.filter((tool) => {
      if (
        selectedCategory !== 'all' &&
        selectedCategory !== 'shortcuts' &&
        tool.category !== selectedCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.summary.toLowerCase().includes(q) ||
        tool.locationLabel.toLowerCase().includes(q) ||
        tool.steps.some(
          (s) =>
            s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)
        )
      );
    });
  }, [selectedCategory, searchQuery]);

  const activeTool =
    TOOL_DOCS.find((t) => t.id === selectedToolId) ||
    filteredTools[0] ||
    TOOL_DOCS[0];

  const handleSelectTool = (toolId: string) => {
    setSelectedToolId(toolId);
    setExploredToolIds((prev) => ({ ...prev, [toolId]: true }));
    if (selectedCategory === 'shortcuts') {
      setSelectedCategory('all');
    }
  };

  const toggleStepDone = (toolId: string, stepIdx: number) => {
    const key = `${toolId}:${stepIdx}`;
    setCompletedStepKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exploredCount = Object.keys(exploredToolIds).length;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#1e1e1e] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col text-xs text-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#161616] border-b border-[#333333] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <HelpCircle className="w-5 h-5 text-[#ff7700] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-100 truncate">
                Interactive Tool Guide & Documentation
              </h2>
              <p className="text-[11px] text-gray-400 tabular-nums">
                {TOOL_DOCS.length} tools documented · {exploredCount} of {TOOL_DOCS.length} viewed in this session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools, workflows, steps..."
                className="w-full bg-[#111111] border border-[#3a3a3a] rounded pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#ff8000]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
              aria-label="Close Interactive Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Strip (wraps onto a second row when exceeding pane width) */}
        <div className="px-5 py-2 bg-[#1a1a1a] border-b border-[#323232] flex flex-wrap items-center gap-1.5 shrink-0">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                if (cat.id !== 'all' && cat.id !== 'shortcuts') {
                  const first = TOOL_DOCS.find((t) => t.category === cat.id);
                  if (first) handleSelectTool(first.id);
                }
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#2c2c2c] text-amber-300 border border-[#4a4a4a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424] border border-transparent'
              }`}
            >
              {cat.id === 'shortcuts' ? (
                <span className="inline-flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </span>
              ) : (
                cat.label
              )}
            </button>
          ))}
        </div>

        {/* Main Content: Left Tool Index + Right Interactive Guide */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Index */}
          <aside className="w-72 shrink-0 bg-[#181818] border-r border-[#333333] overflow-y-auto divide-y divide-[#282828]">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-center text-gray-400 space-y-2">
                <p>No tools matched "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333] border border-[#444] text-gray-200"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredTools.map((tool) => {
                const isSelected = selectedCategory !== 'shortcuts' && activeTool.id === tool.id;
                const isViewed = Boolean(exploredToolIds[tool.id]);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleSelectTool(tool.id)}
                    className={`w-full text-left px-3.5 py-3 transition-colors flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-[#26211b] text-white'
                        : 'hover:bg-[#212121] text-gray-300'
                    }`}
                  >
                    <div className="mt-0.5">{tool.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-semibold truncate ${
                            isSelected ? 'text-amber-300' : 'text-gray-100'
                          }`}
                        >
                          {tool.name}
                        </span>
                        {isViewed && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400/80 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">
                        {tool.categoryLabel} · {tool.steps.length} steps
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          {/* Right Interactive Documentation View */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 bg-[#141414]">
            {selectedCategory === 'shortcuts' ? (
              <div className="max-w-3xl space-y-5">
                <div className="border-b border-[#2e2e2e] pb-4">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold mb-1">
                    <Keyboard className="w-4 h-4" />
                    <span>Reference</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-100">
                    Keyboard Shortcuts & Editor Controls
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Speed up screenplay formatting, element type transitions, and on-set teleprompter playback using these built-in keyboard bindings.
                  </p>
                </div>

                <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#171717] border-b border-[#303030] text-gray-400">
                        <th className="px-4 py-2.5 font-semibold">Shortcut</th>
                        <th className="px-4 py-2.5 font-semibold">Where Used</th>
                        <th className="px-4 py-2.5 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#282828]">
                      {SHORTCUT_REFERENCE.map((row) => (
                        <tr key={row.keys} className="hover:bg-[#202020]">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <kbd className="px-2 py-0.5 rounded bg-[#262626] border border-[#444] font-mono text-[11px] text-amber-300">
                              {row.keys}
                            </kbd>
                          </td>
                          <td className="px-4 py-2.5 text-cyan-300 whitespace-nowrap">
                            {row.context}
                          </td>
                          <td className="px-4 py-2.5 text-gray-300 leading-relaxed">
                            {row.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl space-y-6">
                {/* Tool Header */}
                <div className="border-b border-[#2e2e2e] pb-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="text-amber-300 font-semibold">{activeTool.categoryLabel}</span>
                      <span>·</span>
                      <span>{activeTool.locationLabel}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {activeTool.icon}
                      <h3 className="text-lg font-bold text-gray-100">
                        {activeTool.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed pt-1">
                      {activeTool.summary}
                    </p>
                  </div>

                  {activeTool.launchLabel && activeTool.onLaunch && (
                    <button
                      type="button"
                      onClick={() => {
                        activeTool.onLaunch?.(actions);
                        if (activeTool.closesModalOnLaunch) {
                          onClose();
                        }
                      }}
                      className="px-3.5 py-2 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>{activeTool.launchLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Live State Notice for Revision Pass */}
                {activeTool.id === 'revision-pass' && (
                  <div className="bg-[#1b1b1b] border border-[#363636] rounded p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-200">
                        Live Revision Pass Status: {actions.isRevisionPassMode ? 'Active' : 'Off'}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Toggle above to immediately preview edit recency highlights in the screenplay editor.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={actions.onToggleRevisionPassMode}
                      className={`px-3 py-1.5 rounded border text-xs font-medium whitespace-nowrap shrink-0 ${
                        actions.isRevisionPassMode
                          ? 'bg-[#362020] border-red-500/80 text-red-200'
                          : 'bg-[#262626] border-[#444] text-gray-200 hover:bg-[#333]'
                      }`}
                    >
                      {actions.isRevisionPassMode ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>
                )}

                {/* Interactive Walkthrough Steps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      How to Use This Tool (Interactive Walkthrough)
                    </h4>
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      Click steps to mark complete
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeTool.steps.map((step, idx) => {
                      const stepKey = `${activeTool.id}:${idx}`;
                      const isDone = Boolean(completedStepKeys[stepKey]);
                      return (
                        <div
                          key={stepKey}
                          onClick={() => toggleStepDone(activeTool.id, idx)}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-colors ${
                            isDone
                              ? 'bg-[#17211b] border-emerald-700/60'
                              : 'bg-[#1a1a1a] border-[#333333] hover:border-[#4a4a4a]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-amber-400 font-semibold tabular-nums">
                                  0{idx + 1}.
                                </span>
                                <span
                                  className={`font-semibold text-xs ${
                                    isDone ? 'text-emerald-200' : 'text-gray-100'
                                  }`}
                                >
                                  {step.title}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed">
                                {step.detail}
                              </p>
                              {step.example && (
                                <div className="mt-1.5 px-2.5 py-1.5 rounded bg-[#121212] border border-[#2c2c2c] font-mono text-[11px] text-cyan-300 select-text">
                                  {step.example}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tips & Best Practices */}
                {activeTool.tips.length > 0 && (
                  <div className="bg-[#191919] border border-[#323232] rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Workflow Tips</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-300 list-disc pl-4 leading-relaxed">
                      {activeTool.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tool-Specific Shortcuts */}
                {activeTool.shortcuts && activeTool.shortcuts.length > 0 && (
                  <div className="bg-[#191919] border border-[#323232] rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <div className="divide-y divide-[#2a2a2a]">
                      {activeTool.shortcuts.map((sc) => (
                        <div
                          key={sc.keys}
                          className="py-1.5 flex items-center justify-between gap-4"
                        >
                          <kbd className="px-2 py-0.5 rounded bg-[#242424] border border-[#404040] font-mono text-[11px] text-amber-300 whitespace-nowrap">
                            {sc.keys}
                          </kbd>
                          <span className="text-xs text-gray-300 text-right">{sc.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#161616] border-t border-[#333333] flex items-center justify-between gap-4 shrink-0 text-[11px] text-gray-400">
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-3.5 h-3.5 text-[#ff7700] shrink-0" />
            <span className="truncate">
              Access this interactive guide anytime from Help → Interactive User Guide in the top menu bar.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] text-gray-200 font-medium whitespace-nowrap shrink-0"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
