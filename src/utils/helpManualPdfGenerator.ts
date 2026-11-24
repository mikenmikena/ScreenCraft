import { jsPDF } from 'jspdf';
import { triggerBlobDownload } from './screenplayPdfGenerator';

export interface HelpManualPdfResult {
  blob: Blob;
  filename: string;
  pageCount: number;
  byteSize: number;
}

interface ManualStep {
  title: string;
  detail: string;
  tip?: string;
}

interface ManualSection {
  id: string;
  number: string;
  chapterTitle: string;
  title: string;
  location: string;
  summary: string;
  diagramId: DiagramId;
  diagramCaption: string;
  calloutLegend: string[];
  steps: ManualStep[];
  shortcuts?: { keys: string; action: string }[];
  indexTerms: string[];
}

type DiagramId =
  | 'overview'
  | 'home_file'
  | 'authoring'
  | 'characters'
  | 'outline'
  | 'production'
  | 'storyboard'
  | 'collaboration'
  | 'teleprompter_subtitles';

const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'launch-hub-files',
    number: '1.1',
    chapterTitle: 'Chapter 1 · Getting Started & File Management',
    title: 'ScreenCraft Studio Launch Hub, Local .sccrft Files & Preferences',
    location: 'Home Icon · File Menu',
    summary:
      'Start new Film, Stage Play, Book, or Television projects from templates, open local .sccrft, .fdx, or .fountain documents from your computer, save reusable templates, and configure Preferences or Rust Desktop tools.',
    diagramId: 'home_file',
    diagramCaption:
      'Figure 1.1 — ScreenCraft Studio Launch Hub showing templates, Open from Device browser, and File menu actions.',
    calloutLegend: [
      '1. Document Templates (Film, Stage, Book, TV)',
      '2. Open from Device (.sccrft, .fdx, .fountain)',
      '3. File Menu (New, Open, Save, Save As, Template, Export, Print, Preferences, Close)',
      '4. Preferences & Dedicated >_ Rust Desktop Window',
    ],
    steps: [
      {
        title: 'Create a document from the Home Launch Hub',
        detail:
          'Click the Home icon in the top-left header to open ScreenCraft Studio. Enter an optional title and author name, then click Film Script, Stage Play, Book Manuscript, Television Script, or any custom User Template.',
      },
      {
        title: 'Open local .sccrft, Final Draft (.fdx), or Fountain (.fountain) files',
        detail:
          'Click "Open from Device" on the Home Launch Hub or choose File -> Open... (Ctrl+O). Browse your computer for .sccrft project bundles, .fdx Final Draft XML scripts, or .fountain plain-text screenplays.',
      },
      {
        title: 'Save locally as .sccrft or Save as Template',
        detail:
          'Choose File -> Save (.sccrft) (Ctrl+S) or File -> Save As... to download/update a complete .sccrft file preserving script elements, formatting, stripboard, cast/crew, storyboards, and notes. Use File -> Save as Template... to store the structure on your Home screen.',
      },
      {
        title: 'Access Preferences & >_ Rust Desktop',
        detail:
          'Open File -> Preferences... to adjust default typography, page layout, and open the dedicated >_ Rust Desktop companion configuration window.',
        tip: 'ScreenCraft also auto-saves active edits to browser storage every 30 seconds.',
      },
    ],
    indexTerms: [
      'Home Launch Hub',
      '.sccrft File Format',
      'Final Draft (.fdx) Import',
      'Fountain Import',
      'Save as Template',
      'Preferences',
      'Rust Desktop Window',
    ],
  },
  {
    id: 'authoring-editor',
    number: '2.1',
    chapterTitle: 'Chapter 2 · Authoring Workspace & Formatting Tools',
    title: 'Screenplay Editor, Formatting Ribbon, Proofreading & View Modes',
    location: 'AUTHORING Tab · Menu Bar (Edit / View)',
    summary:
      'Write formatted 12pt Courier screenplays or Multi-Column A/V scripts with inline typography controls, Quick Notes scratchpad, Scene/Comments/Tags/History/Continuity Inspector, spell/grammar checks, and distraction-free View modes.',
    diagramId: 'authoring',
    diagramCaption:
      'Figure 2.1 — Authoring Workspace with Formatting Ribbon, Center Script Sheet, Quick Notes, and Right Inspector.',
    calloutLegend: [
      '1. Formatting Ribbon (Font, Alignment, Layout, Highlight, Spell/Grammar, Revisions)',
      '2. Left Scene Outline & Navigator',
      '3. Center Script Canvas (Normal, Simple, or Page View + Inline Elements)',
      '4. Right Inspector (Scene, Comments, Tags, Shots, History, Continuity, Character Info)',
    ],
    steps: [
      {
        title: 'Write & format screenplay elements smoothly',
        detail:
          'Press Enter on a Scene Heading to start Action, or on a Character cue to start Dialogue. Press Tab to cycle Dialogue -> Voice-over (V.O.) -> Parenthetical. Press Ctrl+/ on an empty line or Alt+[Key] to switch any element type immediately.',
      },
      {
        title: 'Style text, fonts, page layout & highlights',
        detail:
          'Use the Formatting Toolbar to adjust Font family/size, Bold/Italic/Underline/Strikethrough, Left/Center/Right alignment, Highlight colors, and Page Layout (Letter, A4, Compact), or switch between Single-Column Film and Multi-Column A/V mode.',
      },
      {
        title: 'Run Spell Check, Grammar Check, Continuity & Quick Notes',
        detail:
          'Click Spell Check or Grammar Check on the Formatting Toolbar to inspect issues in the Inspector Proofread tab. Open Continuity Check to scan props/wardrobe across scenes, or toggle Quick Notes for a floating local scratchpad.',
      },
      {
        title: 'Use Edit Menu tools, Track Changes & View Modes',
        detail:
          'Open Edit for Select All, Select Scene, Cut/Copy/Paste/Delete, Undo/Redo, Go To, Find & Replace, Rename/Add/Edit Character, Track Changes (Accept/Reject/Previous/Next), and Emoji & Symbols. Open View to switch between Normal View, Simple View, and Page View.',
      },
    ],
    shortcuts: [
      { keys: 'Enter (empty) / Ctrl+/', action: 'Open Elements type selector' },
      { keys: 'Tab', action: 'Cycle Dialogue / V.O. / Parenthetical' },
      { keys: 'Ctrl+B / I / U', action: 'Bold / Italic / Underline active block' },
      { keys: 'Ctrl+F / Ctrl+G', action: 'Open Find & Replace / Go To Scene' },
    ],
    indexTerms: [
      'Authoring Workspace',
      'Formatting Toolbar',
      'Voice-over (V.O.)',
      'Multi-Column A/V Script',
      'Quick Notes Scratchpad',
      'Spell Check & Grammar Check',
      'Scene Continuity Check',
      'Track Changes',
      'View Modes (Normal / Simple / Page)',
      'Find & Replace / Go To',
    ],
  },
  {
    id: 'characters-connections',
    number: '3.1',
    chapterTitle: 'Chapter 3 · Characters & Relationship Mapping',
    title: 'Character Bios, Details & Infinite Zoomable Node Connections',
    location: 'CHARACTERS Tab',
    summary:
      'Maintain detailed character biographies, speaking analytics, and an infinite pan-and-zoom node graph showing script-detected interactions alongside custom relationships with moveable descriptor labels.',
    diagramId: 'characters',
    diagramCaption:
      'Figure 3.1 — Characters Workspace with biography editor and infinite pan/zoom relationship node graph.',
    calloutLegend: [
      '1. Character Roster & Role Filter (Lead, Supporting, Antagonist)',
      '2. Biography, Arc, Core Flaw & Cast Sync Details',
      '3. Infinite Draggable Character Nodes & Relationship Edges',
      '4. Zoom In / Zoom Out / Fit View & Moveable Connection Descriptor Labels',
    ],
    steps: [
      {
        title: 'Edit detailed character profiles & bios',
        detail:
          'Select any character in the Details & Bios view to update Role Type, Logline Summary, Backstory, Start-to-End Arc, Core Flaw/Tension, and linked scene appearances.',
      },
      {
        title: 'Explore & zoom the infinite Node Connections canvas',
        detail:
          'Switch to the Node Connections view. Scroll the mouse wheel or use the Zoom In (+) / Zoom Out (-) controls to inspect large casts, and drag empty canvas background to pan infinitely in any direction.',
      },
      {
        title: 'Drag character nodes & connection descriptors freely',
        detail:
          'Click and drag any character node anywhere in infinite space. Click "+ Add Relationship" to create Alliance, Conflict, Hierarchy, Emotional, or Mystery edges, then drag any connection descriptor pill independently so labels never overlap.',
      },
    ],
    indexTerms: [
      'Characters Workspace',
      'Character Bios & Arcs',
      'Node-Based Character Connections',
      'Infinite Canvas Pan & Zoom',
      'Moveable Connection Descriptors',
      'Rename / Add / Edit Character',
    ],
  },
  {
    id: 'outline-beatboard',
    number: '4.1',
    chapterTitle: 'Chapter 4 · Story Structure & Outline',
    title: 'Outline Workspace, Scene Cards & Structural Reordering',
    location: 'OUTLINE Tab',
    summary:
      'Review every scene as an editable beat card organized by Act, filter by location or character, update synopses/notes, reorder scenes across the script, or jump directly into Authoring.',
    diagramId: 'outline',
    diagramCaption:
      'Figure 4.1 — Outline Workspace displaying Act-grouped scene cards, runtime metrics, and reorder controls.',
    calloutLegend: [
      '1. Act Grouping & Scene Search / Filter Controls',
      '2. Scene Beat Card (Slugline, Eighths, Timecode, Cast Badges)',
      '3. Synopsis & Production Notes Editor',
      '4. Reorder Scene Earlier/Later & Jump to Authoring',
    ],
    steps: [
      {
        title: 'Inspect Act pacing and scene metadata',
        detail:
          'Open the OUTLINE tab to view all scenes grouped by Act with calculated 1/8th page counts, estimated screen duration, and speaking cast.',
      },
      {
        title: 'Edit synopses or move scenes',
        detail:
          'Update any scene synopsis directly on its card, click Move Earlier / Move Later to resequence the script and stripboard together, or click "+ Add Scene" to append a new beat.',
      },
    ],
    indexTerms: ['Outline Workspace', 'Beat Cards', 'Reorder Scenes', 'Page Eighths'],
  },
  {
    id: 'production-hub',
    number: '5.1',
    chapterTitle: 'Chapter 5 · Production Management Hub',
    title: 'Stripboard, Cast & Crew, Locations, Equipment, Budget & Call Sheets',
    location: 'PRODUCTION Tab',
    summary:
      'Centralize every production department: Stripboard shooting schedules, Cast & Crew address book, Availability Timeline, Location Map, Equipment Manifest, Production Budget, Call Sheet PDFs, Pitch Docs, Research Notes, Reports, Storyboards, Teleprompter, and Subtitles.',
    diagramId: 'production',
    diagramCaption:
      'Figure 5.1 — Production Hub showing multi-row department tabs, Stripboard shooting days, and Sync tools.',
    calloutLegend: [
      '1. Department Tabs (wraps cleanly onto multiple rows if needed)',
      '2. Quick Actions (Sync Script Cast, NLE Pipeline, Reports, Schedule Sync)',
      '3. Stripboard Scene Strips, Day Breaks & Meal Breaks',
      '4. Cast/Crew Book, Location Map, Equipment, Budget & Call Sheet PDF',
    ],
    steps: [
      {
        title: 'Build and optimize the Production Stripboard',
        detail:
          'Drag scene strips between Shoot Days, insert Day Break / Meal Break banners, or run the Optimization Wizard to minimize company moves and cast idle days. Use "Sync Script Cast" and "Schedule Sync" after script edits.',
      },
      {
        title: 'Manage Cast/Crew, Availability, Equipment & Location Map',
        detail:
          'Add contacts in Cast & Crew Book (with circular portrait gallery), review Cast/Crew conflicts on the Availability Timeline, track gear in Equipment Manifest, and assign real addresses in Location Map.',
      },
      {
        title: 'Recalculate Finance, Call Sheet PDF, Pitch Docs & Research',
        detail:
          'Adjust day rates and contingency in Budget & Finance and click Recalculate Finance. Open Call Sheet PDF to generate printable daily call sheets, or maintain Logline & Overviews, Pitch Docs, and Research Notes.',
        tip: 'Teleprompter, Storyboards, and Subtitles are also embedded directly inside Production tabs for one-stop on-set access.',
      },
    ],
    indexTerms: [
      'Production Hub',
      'Stripboard & Day Breaks',
      'Schedule Optimization Wizard',
      'Cast & Crew Address Book',
      'Availability Timeline',
      'Location Map',
      'Equipment Manifest',
      'Budget & Recalculate Finance',
      'Call Sheet PDF',
      'Logline, Pitch Docs & Research Notes',
      'Reports & NLE Pipeline',
    ],
  },
  {
    id: 'storyboarding-blocking',
    number: '6.1',
    chapterTitle: 'Chapter 6 · Visuals & Camera Blocking',
    title: 'Storyboarding Suite & Interactive Blocking Canvas',
    location: 'STORYBOARDING Tab · Production → Storyboards',
    summary:
      'Create scene-linked shot cards with camera framing, lens, and movement specs, then sketch floorplans and frame compositions on the built-in Blocking Canvas with lines, shapes, pattern fills, toggleable grids, and 1px/10px brush sizes.',
    diagramId: 'storyboard',
    diagramCaption:
      'Figure 6.1 — Storyboarding Suite with Shot Card specs and Blocking Canvas (Grid, Shapes, Pattern Fills, 1px/10px sizes).',
    calloutLegend: [
      '1. Shot List Cards (Shot #, Shot Type, Lens, Camera Movement)',
      '2. Drawing Tools (Freehand, Line, Rectangle, Circle, Arrow, Pattern Fills)',
      '3. Stroke Size Selector (including 1px fine line & 10px bold blocking)',
      '4. Grid Toggle On/Off & Blocking Canvas Viewport',
    ],
    steps: [
      {
        title: 'Create shot frames linked to scenes',
        detail:
          'Select a scene filter and click "+ Add Shot Frame". Choose Shot Type (WS, MS, CU, OTS), Lens (e.g., 35mm Cine), Camera Movement, Aspect Ratio, and shot duration.',
      },
      {
        title: 'Draw blocking diagrams with lines, shapes & pattern fills',
        detail:
          'Open the Blocking Canvas on any shot card. Pick Pen, Line, Rectangle, Circle, or Arrow tools, choose solid colors or Pattern Fills (diagonal stripes, crosshatch, dots) for walls/zones, and toggle between 1px, 3px, 6px, and 10px stroke sizes.',
      },
      {
        title: 'Toggle alignment grids & attach plates',
        detail:
          'Use the Grid On/Off button to snap spatial blocking visually, or upload/attach external reference plates directly to the shot.',
      },
    ],
    indexTerms: [
      'Storyboarding Suite',
      'Blocking Canvas',
      'Lines, Shapes & Pattern Fills',
      'Grid Toggle (On/Off)',
      '1px and 10px Brush Sizes',
    ],
  },
  {
    id: 'collaboration-redlines',
    number: '7.1',
    chapterTitle: 'Chapter 7 · Team Review & Collaboration',
    title: 'Non-Destructive Contributor Color Redlines & Review Notes',
    location: 'COLLABORATION Tab · Authoring Redline Margin Badges',
    summary:
      'Invite outside contributors with assignable color codes to propose script edits and notes non-destructively—every suggestion is outlined in the contributor’s color without altering the master document until accepted.',
    diagramId: 'collaboration',
    diagramCaption:
      'Figure 7.1 — Collaboration Workspace showing contributor color badges and non-destructive diff redlines.',
    calloutLegend: [
      '1. Contributor Roster & Assignable Color Swatches',
      '2. Non-Destructive Redline Card (Original vs. Proposed Text in Contributor Color)',
      '3. Accept, Reject, Reopen & Jump to Scene Controls',
      '4. Live Authoring Colored Border Indicators',
    ],
    steps: [
      {
        title: 'Add collaborators with unique color codes',
        detail:
          'In the COLLABORATION workspace, add team members or outside script consultants and pick a distinct highlight color for each contributor.',
      },
      {
        title: 'Submit non-destructive edits & notes',
        detail:
          'Select a scene/element, choose the active contributor, and enter proposed replacement text or a margin note. The original screenplay remains untouched while the proposal is outlined in the contributor’s color in both Collaboration and Authoring.',
      },
      {
        title: 'Accept or reject suggestions cleanly',
        detail:
          'Filter by contributor or status (Pending, Accepted, Rejected), compare original vs. suggested text, and click Accept Suggestion to apply it to the master script (recorded in Revision History) or Reject to archive it.',
      },
    ],
    indexTerms: [
      'Collaboration Workspace',
      'Non-Destructive Redlines',
      'Contributor Color Codes',
      'Accept / Reject Suggestions',
    ],
  },
  {
    id: 'teleprompter-subtitles-export',
    number: '8.1',
    chapterTitle: 'Chapter 8 · On-Set Teleprompter, Subtitles & Exporting',
    title: 'Teleprompter, Subtitles Studio (.SRT / .VTT ↔ Script) & Exports',
    location: 'TELEPROMPTER Tab · SUBTITLES Tab · File → Export',
    summary:
      'Run white-on-black filming teleprompter sessions, export timed .SRT / .VTT subtitles from your screenplay, import and edit subtitle tracks to convert directly into new Screenplay documents, and export PDFs, Final Draft .FDX, Fountain, or Print sheets.',
    diagramId: 'teleprompter_subtitles',
    diagramCaption:
      'Figure 8.1 — Dual On-Set & Post Workflow: Filming Teleprompter, Subtitles Studio (.srt/.vtt <-> Script), and Export Preview.',
    calloutLegend: [
      '1. TELEPROMPTER Tab (White-on-Black, Font Size, Scroll Speed, Mirror Mode)',
      '2. SUBTITLES Tab — Script -> .SRT / .VTT Export with WPM & Line Wrapping',
      '3. SUBTITLES Tab — Subtitle Importer/Editor -> Convert to Screenplay Document',
      '4. File -> Export / Print Preview (PDF, Final Draft .fdx, Fountain, Subtitles, CSV)',
    ],
    steps: [
      {
        title: 'Operate the Filming Teleprompter',
        detail:
          'Open TELEPROMPTER (or Production -> Teleprompter). Pick a script project (Full Script or Spoken Only, optional character filter) or paste custom copy, dial in font size, scroll speed, and beam-splitter mirroring, then press Spacebar to Play/Pause.',
      },
      {
        title: 'Export .SRT or .VTT subtitles from a script',
        detail:
          'Open the SUBTITLES tab right next to TELEPROMPTER. Under "Script -> Subtitles Export", choose your project/scene, reading speed (WPM), line wrapping, and speaker/SDH options, then click Export .SRT or Export .VTT (or send cues to the Editor).',
      },
      {
        title: 'Import/edit subtitle files and convert to a Screenplay document',
        detail:
          'Switch to "Subtitle Importer / Editor -> Screenplay", upload a .srt, .vtt, .sbv, or timed .txt file (or paste text), tweak timestamps, speakers, split/merge cues, and click "Create Screenplay Document" to launch a complete formatted script in Authoring.',
      },
      {
        title: 'Export PDF, Final Draft (.fdx), Fountain or Print',
        detail:
          'Use File -> Export or File -> Print Preview... to verify US Letter / A4 Courier pagination with Title Page, Scene Numbers, and Page Numbers before downloading a clean PDF or opening the print dialog.',
      },
    ],
    indexTerms: [
      'Teleprompter Workspace',
      'Subtitles Studio',
      'Export Subtitles (.srt / .vtt)',
      'Subtitle Importer & Cue Editor',
      'Convert Subtitles to Screenplay',
      'Export PDF & Print Preview',
      'Final Draft (.fdx) Export',
      'Fountain (.fountain) Export',
    ],
  },
];

const KEYBOARD_SHORTCUTS: { keys: string; context: string; action: string }[] = [
  { keys: 'Enter (empty) / Ctrl+/', context: 'Authoring', action: 'Open [G]..[4] Elements popup' },
  { keys: 'Alt + G/S/A/C/P/D/V/T/H/0-4', context: 'Authoring', action: 'Switch focused element type immediately' },
  { keys: 'Tab', context: 'Authoring', action: 'Cycle Dialogue -> V.O. -> Parenthetical' },
  { keys: 'Ctrl + B / I / U', context: 'Authoring', action: 'Toggle Bold, Italic, or Underline' },
  { keys: 'Ctrl + Shift + L / C / R', context: 'Authoring', action: 'Align Left / Center / Right' },
  { keys: 'Ctrl + S / Ctrl + O / Ctrl + P', context: 'Global', action: 'Save (.sccrft) / Open from Device / Print' },
  { keys: 'Ctrl + Z / Ctrl + Y', context: 'Edit Menu', action: 'Undo / Redo screenplay changes' },
  { keys: 'Ctrl + F / Ctrl + G', context: 'Edit Menu', action: 'Find & Replace / Go To Scene or Line' },
  { keys: 'Spacebar', context: 'Teleprompter', action: 'Play / Pause scrolling prompt' },
];

// --- Canvas Visual Illustration Generator ---
function drawCalloutBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  num: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#ff7700';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num, x, y + 0.5);
  ctx.restore();
}

function drawRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMockWindowChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  activeTab: string
) {
  // App header bar
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(0, 0, w, 46);
  ctx.fillStyle = '#383838';
  ctx.fillRect(0, 45, w, 1);

  // Brand
  drawRoundedPanel(ctx, 14, 10, 24, 24, 5, '#ff7700');
  ctx.fillStyle = '#f3f4f6';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SCREENCRAFT', 46, 26);
  ctx.fillStyle = '#ff7700';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('STUDIO', 142, 26);

  const tabs = [
    'AUTHORING',
    'CHARACTERS',
    'OUTLINE',
    'PRODUCTION',
    'STORYBOARDING',
    'COLLABORATION',
    'TELEPROMPTER',
    'SUBTITLES',
  ];
  let tx = 212;
  ctx.font = 'bold 10px sans-serif';
  for (const tab of tabs) {
    const tw = ctx.measureText(tab).width + 16;
    const isAct = tab === activeTab;
    if (isAct) {
      drawRoundedPanel(ctx, tx, 10, tw, 26, 4, '#2d2d2d', '#ff7700');
      ctx.fillStyle = '#ff8c1a';
    } else {
      ctx.fillStyle = '#9ca3af';
    }
    ctx.fillText(tab, tx + 8, 26);
    tx += tw + 4;
  }
}

function renderDiagramImage(diagramId: DiagramId): string {
  const width = 1040;
  const height = 470;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Base dark studio frame
  ctx.fillStyle = '#151515';
  ctx.fillRect(0, 0, width, height);

  if (diagramId === 'overview') {
    drawMockWindowChrome(ctx, width, 'AUTHORING');
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ScreenCraft Studio — End-to-End Production Architecture', 36, 86);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      'One unified .sccrft project synchronizes your script, characters, stripboard, storyboards, redlines, teleprompter & subtitles.',
      36,
      108
    );

    const nodes = [
      { title: '1. Launch Hub', sub: '.sccrft / .fdx / .fountain\nTemplates & Preferences', x: 36, y: 140, color: '#ff7700' },
      { title: '2. Authoring', sub: 'Film & A/V Editor\nProofread & Continuity', x: 286, y: 140, color: '#f59e0b' },
      { title: '3. Characters & Outline', sub: 'Bios, Infinite Node Web\nAct Beat Cards', x: 536, y: 140, color: '#06b6d4' },
      { title: '4. Production Hub', sub: 'Stripboard, Cast, Map\nBudget & Call Sheet PDF', x: 786, y: 140, color: '#10b981' },
      { title: '5. Storyboarding', sub: 'Shot Lists & Blocking\nGrid, Shapes, 1px/10px', x: 140, y: 292, color: '#8b5cf6' },
      { title: '6. Collaboration', sub: 'Color-Coded Redlines\nNon-Destructive Review', x: 390, y: 292, color: '#ec4899' },
      { title: '7. Teleprompter & Subtitles', sub: 'White-on-Black Prompt\n.SRT/.VTT <-> Script', x: 640, y: 292, color: '#38bdf8' },
    ];

    // Connectors
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(nodes[i].x + 216, nodes[i].y + 52);
      ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y + 52);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(890, 245);
    ctx.lineTo(890, 268);
    ctx.lineTo(248, 268);
    ctx.lineTo(248, 292);
    ctx.stroke();
    for (let i = 4; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(nodes[i].x + 216, nodes[i].y + 52);
      ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y + 52);
      ctx.stroke();
    }

    nodes.forEach((n) => {
      drawRoundedPanel(ctx, n.x, n.y, 216, 104, 8, '#212121', n.color);
      ctx.fillStyle = n.color;
      ctx.fillRect(n.x, n.y, 216, 6);
      ctx.fillStyle = '#f9fafb';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(n.title, n.x + 14, n.y + 32);
      ctx.fillStyle = '#d1d5db';
      ctx.font = '11px sans-serif';
      n.sub.split('\n').forEach((line, idx) => {
        ctx.fillText(line, n.x + 14, n.y + 56 + idx * 18);
      });
    });

    drawRoundedPanel(ctx, 36, 418, width - 72, 34, 6, '#1f2937', '#374151');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(
      'EXPORT PIPELINE:   PDF Screenplay  •  Print Preview  •  Final Draft (.fdx)  •  Fountain  •  Subtitles (.srt / .vtt)  •  Premiere XML / NLE JSON',
      54,
      439
    );
  } else if (diagramId === 'home_file') {
    drawMockWindowChrome(ctx, width, '');
    // File dropdown menu overlay
    drawRoundedPanel(ctx, 20, 56, 220, 270, 6, '#232323', '#4b5563');
    const fileItems = [
      'New > (Film / Stage / Book / TV)',
      'Open... (.sccrft, .fdx, .fountain)',
      'Save (.sccrft)        Ctrl+S',
      'Save As...',
      'Save as Template...',
      'Export > (PDF, FDX, SRT, VTT)',
      'Print Preview...',
      'Print...              Ctrl+P',
      'Preferences... (>_ Rust Desktop)',
      'Close',
    ];
    fileItems.forEach((item, idx) => {
      const iy = 72 + idx * 24;
      if (idx === 2 || idx === 8) {
        ctx.fillStyle = '#2e2215';
        ctx.fillRect(24, iy - 13, 212, 20);
      }
      ctx.fillStyle = idx === 8 ? '#fbbf24' : '#e5e7eb';
      ctx.font = '11px sans-serif';
      ctx.fillText(item, 34, iy);
    });

    // Launch Hub Main area
    drawRoundedPanel(ctx, 260, 64, 750, 74, 8, '#202020', '#383838');
    ctx.fillStyle = '#f9fafb';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ScreenCraft Studio', 284, 96);
    drawRoundedPanel(ctx, 464, 79, 86, 20, 4, '#3a220c', '#ff7700');
    ctx.fillStyle = '#ff9838';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('LAUNCH HUB', 475, 93);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.fillText('Start a Film, Stage, Book, or Television script, or open a local document.', 284, 120);

    // Template Cards
    const tpls = [
      { title: 'Film Script', tag: 'FILM', color: '#ff7700' },
      { title: 'Stage Play', tag: 'STAGE', color: '#fbbf24' },
      { title: 'Book Manuscript', tag: 'BOOK', color: '#10b981' },
      { title: 'Television Script', tag: 'TV', color: '#06b6d4' },
    ];
    tpls.forEach((t, idx) => {
      const cx = 260 + idx * 190;
      drawRoundedPanel(ctx, cx, 156, 178, 124, 8, '#1e1e1e', '#383838');
      drawRoundedPanel(ctx, cx + 124, 168, 42, 18, 4, '#141414', t.color);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(t.tag, cx + 132, 180);
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(t.title, cx + 14, 204);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText('Courier Prime 12pt', cx + 14, 230);
      ctx.fillStyle = '#ff8c1a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Create ->', cx + 14, 262);
    });

    // Open from Device bar
    drawRoundedPanel(ctx, 260, 298, 750, 56, 8, '#1b1b1b', '#ff7700');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Open from Device', 284, 322);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.fillText('Browse .sccrft, Final Draft (.fdx), or Fountain (.fountain) files from your computer', 284, 340);
    drawRoundedPanel(ctx, 880, 311, 110, 28, 5, '#ff7700');
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Browse Files >', 895, 329);

    // Preferences & Rust Desktop Callout
    drawRoundedPanel(ctx, 260, 370, 750, 74, 8, '#1d2228', '#334155');
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('>_ Rust Desktop & Preferences Modal', 284, 396);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText('Accessible via File -> Preferences... to configure Typography, Page Size, and Native Rust/Tauri Engine settings.', 284, 418);

    drawCalloutBadge(ctx, 430, 156, '1');
    drawCalloutBadge(ctx, 265, 300, '2');
    drawCalloutBadge(ctx, 232, 74, '3');
    drawCalloutBadge(ctx, 232, 268, '4');
  } else if (diagramId === 'authoring') {
    drawMockWindowChrome(ctx, width, 'AUTHORING');
    // Formatting ribbon
    drawRoundedPanel(ctx, 14, 52, width - 28, 34, 5, '#252525', '#3c3c3c');
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '11px sans-serif';
    ctx.fillText('Element: [Scene Heading v]   B  I  U  S  [Highlight]  [Align]   Font: Courier 12pt   [Spell] [Grammar] [Quick Notes] [Revision Pass]', 26, 73);

    // Left Outline
    drawRoundedPanel(ctx, 14, 94, 196, 360, 6, '#1c1c1c', '#333333');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('OUTLINE & SCENES', 26, 114);
    ['1. INT. LAB - NIGHT', '2. EXT. ROOFTOP - DAY', '3. INT. VAULT - NIGHT'].forEach((sc, i) => {
      drawRoundedPanel(ctx, 22, 126 + i * 44, 180, 36, 4, i === 0 ? '#2e2215' : '#232323', i === 0 ? '#ff7700' : '#333');
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '10px sans-serif';
      ctx.fillText(sc, 30, 148 + i * 44);
    });

    // Center Script Sheet
    drawRoundedPanel(ctx, 222, 94, 552, 360, 6, '#faf8f2', '#d4d0c5');
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('1   INT. OBSERVATORY CONTROL ROOM - NIGHT        1', 250, 134);
    ctx.font = '12px monospace';
    ctx.fillText('Rain hammers the glass dome. ELENA studies the console.', 250, 166);
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ELENA (V.O.)', 440, 206);
    ctx.font = 'italic 12px monospace';
    ctx.fillText('If the relay drops before midnight, we lose', 330, 228);
    ctx.fillText('the only signal from Sector Four.', 330, 246);
    drawRoundedPanel(ctx, 594, 270, 166, 140, 6, '#262626', '#ff7700');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('QUICK NOTES SCRATCHPAD', 606, 290);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '10px sans-serif';
    ctx.fillText('Check prop continuity:', 606, 312);
    ctx.fillText('blue jacket in Sc.1', 606, 328);
    ctx.fillText('[Promote to Script ->]', 606, 392);

    // Right Inspector
    drawRoundedPanel(ctx, 786, 94, 240, 360, 6, '#1c1c1c', '#333333');
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('SCENE INSPECTOR', 800, 114);
    const inspTabs = ['Scene', 'Comments', 'Tags', 'Shots', 'History', 'Continuity', 'Proofread', 'Chars'];
    inspTabs.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      drawRoundedPanel(ctx, 798 + col * 108, 126 + row * 28, 102, 22, 4, i === 6 ? '#2e2215' : '#252525', i === 6 ? '#ff7700' : '#3a3a3a');
      ctx.fillStyle = i === 6 ? '#fbbf24' : '#d1d5db';
      ctx.font = '10px sans-serif';
      ctx.fillText(t, 808 + col * 108, 141 + row * 28);
    });
    drawRoundedPanel(ctx, 798, 250, 216, 184, 5, '#161616', '#333');
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Spell & Grammar Check', 810, 272);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.fillText('• Continuity Alerts: 0 active', 810, 298);
    ctx.fillText('• Draft Milestone: Blue Pass', 810, 320);
    ctx.fillText('• Track Changes: Ready', 810, 342);

    drawCalloutBadge(ctx, 320, 56, '1');
    drawCalloutBadge(ctx, 180, 104, '2');
    drawCalloutBadge(ctx, 480, 104, '3');
    drawCalloutBadge(ctx, 810, 104, '4');
  } else if (diagramId === 'characters') {
    drawMockWindowChrome(ctx, width, 'CHARACTERS');
    // Left roster & bio panel
    drawRoundedPanel(ctx, 18, 58, 300, 396, 8, '#1e1e1e', '#383838');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CHARACTER DETAILS & BIOS', 34, 82);
    ['ELENA VANCE (Lead)', 'MARCUS CHEN (Supporting)', 'DIRECTOR KANE (Antagonist)'].forEach((c, i) => {
      drawRoundedPanel(ctx, 32, 98 + i * 44, 272, 36, 5, i === 0 ? '#2d2116' : '#242424', i === 0 ? '#ff7700' : '#3a3a3a');
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(c, 44, 120 + i * 44);
    });
    drawRoundedPanel(ctx, 32, 242, 272, 196, 5, '#141414', '#333333');
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Biography & Character Arc', 44, 264);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.fillText('Backstory: Lead telemetry engineer...', 44, 286);
    ctx.fillText('Arc: Skeptic -> Whistleblower', 44, 306);
    ctx.fillText('Core Tension: Loyalty vs. Duty', 44, 326);

    // Right infinite zoomable node graph
    drawRoundedPanel(ctx, 332, 58, 690, 396, 8, '#121212', '#383838');
    // Subtle dot grid
    ctx.fillStyle = '#262626';
    for (let gx = 352; gx < 1010; gx += 28) {
      for (let gy = 78; gy < 440; gy += 28) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('INFINITE NODE CONNECTIONS CANVAS (Pan & Zoom)', 350, 82);
    drawRoundedPanel(ctx, 818, 68, 190, 26, 5, '#1f1f1f', '#444');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('[-]  100%  [+]  [Fit View]', 830, 85);

    // Edges
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(475, 190);
    ctx.lineTo(800, 190);
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(475, 200);
    ctx.lineTo(640, 355);
    ctx.stroke();

    // Moveable connection descriptor pills
    drawRoundedPanel(ctx, 565, 166, 150, 26, 12, '#064e3b', '#10b981');
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Alliance: Research Partners', 575, 183);

    drawRoundedPanel(ctx, 470, 282, 134, 24, 12, '#450a0a', '#ef4444');
    ctx.fillStyle = '#fecaca';
    ctx.fillText('Conflict: Cover-up', 485, 298);

    // Character nodes
    [
      { name: 'ELENA', x: 390, y: 155, border: '#06b6d4' },
      { name: 'MARCUS', x: 800, y: 155, border: '#ff7700' },
      { name: 'KANE', x: 600, y: 345, border: '#ef4444' },
    ].forEach((node) => {
      drawRoundedPanel(ctx, node.x, node.y, 130, 62, 8, '#222222', node.border);
      ctx.fillStyle = '#f9fafb';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(node.name, node.x + 16, node.y + 28);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText('Drag infinitely', node.x + 16, node.y + 46);
    });

    drawCalloutBadge(ctx, 295, 76, '1');
    drawCalloutBadge(ctx, 295, 252, '2');
    drawCalloutBadge(ctx, 405, 155, '3');
    drawCalloutBadge(ctx, 725, 175, '4');
  } else if (diagramId === 'outline') {
    drawMockWindowChrome(ctx, width, 'OUTLINE');
    drawRoundedPanel(ctx, 20, 60, width - 40, 44, 6, '#1f1f1f', '#363636');
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('OUTLINE & BEAT BOARD', 36, 86);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.fillText('Filter: All Acts  |  [+ Add New Scene]  |  Click any card to jump directly to Authoring', 240, 86);

    const cards = [
      { act: 'ACT I', sc: 'SC 1 · INT. OBSERVATORY - NIGHT', syn: 'Elena detects anomaly in outer sector relay.', meta: '1 4/8 pgs · 01:30' },
      { act: 'ACT I', sc: 'SC 2 · EXT. ROOFTOP HELIPAD - DAY', syn: 'Marcus arrives with encrypted flight drive.', meta: '6/8 pgs · 00:45' },
      { act: 'ACT II', sc: 'SC 3 · INT. ARCHIVE VAULT - NIGHT', syn: 'Kane locks down main server corridor.', meta: '2 1/8 pgs · 02:10' },
    ];
    cards.forEach((c, idx) => {
      const cx = 20 + idx * 336;
      drawRoundedPanel(ctx, cx, 122, 320, 316, 8, '#1d1d1d', idx === 0 ? '#ff7700' : '#383838');
      drawRoundedPanel(ctx, cx + 16, 138, 64, 22, 4, '#2a2a2a', '#444');
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(c.act, cx + 30, 153);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(c.sc, cx + 16, 186);
      ctx.fillStyle = '#d1d5db';
      ctx.font = '11px sans-serif';
      ctx.fillText(c.syn, cx + 16, 222);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px monospace';
      ctx.fillText(c.meta, cx + 16, 260);
      drawRoundedPanel(ctx, cx + 16, 384, 134, 30, 5, '#262626', '#444');
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '10px sans-serif';
      ctx.fillText('<- Move Earlier / Later ->', cx + 22, 403);
      drawRoundedPanel(ctx, cx + 164, 384, 140, 30, 5, '#ff7700');
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('Open in Authoring ->', cx + 178, 403);
    });

    drawCalloutBadge(ctx, 220, 82, '1');
    drawCalloutBadge(ctx, 326, 136, '2');
    drawCalloutBadge(ctx, 290, 225, '3');
    drawCalloutBadge(ctx, 290, 398, '4');
  } else if (diagramId === 'production') {
    drawMockWindowChrome(ctx, width, 'PRODUCTION');
    // Wrapped 2-row production hub tabs
    drawRoundedPanel(ctx, 16, 54, width - 32, 62, 6, '#202020', '#383838');
    const row1 = ['Stripboard & Schedule', 'Cast & Crew Book', 'Availability Timeline', 'Location Map', 'Equipment Manifest', 'Budget & Finance'];
    const row2 = ['Call Sheet PDF', 'Logline & Overviews', 'Pitch Docs', 'Research Notes', 'Storyboards', 'Teleprompter', 'Subtitles'];
    ctx.font = 'bold 10px sans-serif';
    row1.forEach((t, i) => {
      const rx = 28 + i * 164;
      drawRoundedPanel(ctx, rx, 62, 154, 22, 4, i === 0 ? '#ff7700' : '#2a2a2a');
      ctx.fillStyle = i === 0 ? '#111' : '#d1d5db';
      ctx.fillText(t, rx + 10, 77);
    });
    row2.forEach((t, i) => {
      const rx = 28 + i * 140;
      drawRoundedPanel(ctx, rx, 88, 132, 22, 4, '#262626');
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(t, rx + 10, 103);
    });

    // Action Bar
    drawRoundedPanel(ctx, 16, 124, width - 32, 34, 5, '#1b1b1b', '#333');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Actions:  [Sync Script Cast]   [Optimization Wizard]   [Schedule Sync]   [NLE Pipeline]   [Recalc Finance]   [Reports]', 30, 145);

    // Stripboard rows
    drawRoundedPanel(ctx, 16, 168, width - 32, 282, 6, '#171717', '#353535');
    const strips = [
      { text: 'DAY BREAK — SHOOT DAY 1 · Basecamp: Stage B · Call 07:00', bg: '#1e293b', fg: '#38bdf8' },
      { text: 'Sc. 1  |  INT  |  OBSERVATORY CONTROL ROOM  |  NIGHT  |  1 4/8 pgs  |  Cast: ELENA, MARCUS', bg: '#262626', fg: '#f3f4f6' },
      { text: 'MEAL BREAK — Lunch 45m', bg: '#27272a', fg: '#fbbf24' },
      { text: 'Sc. 2  |  EXT  |  ROOFTOP HELIPAD  |  DAY  |  6/8 pgs  |  Cast: MARCUS', bg: '#2e2b18', fg: '#fef08a' },
    ];
    strips.forEach((st, i) => {
      drawRoundedPanel(ctx, 30, 184 + i * 44, width - 60, 34, 4, st.bg, '#444');
      ctx.fillStyle = st.fg;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(st.text, 44, 205 + i * 44);
    });

    drawRoundedPanel(ctx, 30, 370, width - 60, 62, 6, '#1c1c1c', '#3b3b3b');
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Integrated Department Suites:', 44, 392);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px sans-serif';
    ctx.fillText('Cast & Crew Contacts  •  Availability Timeline  •  Location Map Pins  •  Equipment Manifest  •  Finance Recalc  •  Call Sheet PDF', 44, 414);

    drawCalloutBadge(ctx, 28, 72, '1');
    drawCalloutBadge(ctx, 510, 141, '2');
    drawCalloutBadge(ctx, 970, 200, '3');
    drawCalloutBadge(ctx, 970, 398, '4');
  } else if (diagramId === 'storyboard') {
    drawMockWindowChrome(ctx, width, 'STORYBOARDING');
    // Left Shot list
    drawRoundedPanel(ctx, 18, 58, 300, 394, 8, '#1e1e1e', '#383838');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SCENE SHOT LIST', 34, 82);
    ['Shot 1A · Wide Master (24mm)', 'Shot 1B · Medium Close-Up (50mm)', 'Shot 1C · Dolly Push-In (35mm)'].forEach((s, i) => {
      drawRoundedPanel(ctx, 30, 100 + i * 54, 276, 44, 5, i === 0 ? '#2d2116' : '#252525', i === 0 ? '#ff7700' : '#3a3a3a');
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(s, 42, 126 + i * 54);
    });

    // Right Blocking Canvas
    drawRoundedPanel(ctx, 334, 58, 688, 394, 8, '#1a1a1a', '#383838');
    // Blocking toolbar
    drawRoundedPanel(ctx, 348, 72, 660, 38, 5, '#242424', '#404040');
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Tools: [Pen] [Line] [Rect] [Circle]   Fill: [Solid / Pattern Fill]   Size: [1px] [3px] [10px]   [Grid: ON]', 360, 95);

    // Canvas with grid
    drawRoundedPanel(ctx, 348, 122, 660, 314, 6, '#101418', '#4b5563');
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    for (let x = 368; x < 1000; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 122);
      ctx.lineTo(x, 436);
      ctx.stroke();
    }
    for (let y = 142; y < 436; y += 24) {
      ctx.beginPath();
      ctx.moveTo(348, y);
      ctx.lineTo(1008, y);
      ctx.stroke();
    }
    // Pattern-filled rectangle (set piece)
    drawRoundedPanel(ctx, 430, 180, 190, 90, 4, '#1e3a5f', '#38bdf8');
    ctx.strokeStyle = '#38bdf8';
    for (let sx = 440; sx < 610; sx += 14) {
      ctx.beginPath();
      ctx.moveTo(sx, 180);
      ctx.lineTo(sx - 20, 270);
      ctx.stroke();
    }
    // 10px blocking line
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(670, 320);
    ctx.lineTo(840, 210);
    ctx.stroke();
    // Circle talent marker
    ctx.beginPath();
    ctx.arc(670, 320, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();

    drawCalloutBadge(ctx, 290, 122, '1');
    drawCalloutBadge(ctx, 495, 72, '2');
    drawCalloutBadge(ctx, 795, 72, '3');
    drawCalloutBadge(ctx, 940, 122, '4');
  } else if (diagramId === 'collaboration') {
    drawMockWindowChrome(ctx, width, 'COLLABORATION');
    // Left Contributors Roster
    drawRoundedPanel(ctx, 18, 58, 296, 394, 8, '#1e1e1e', '#383838');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CONTRIBUTORS & COLOR CODES', 34, 82);
    const contribs = [
      { name: 'Maya Lin (Script Doctor)', color: '#06b6d4' },
      { name: 'Devon Brooks (Line Producer)', color: '#ec4899' },
      { name: 'Sora Takahashi (Showrunner)', color: '#10b981' },
    ];
    contribs.forEach((c, i) => {
      drawRoundedPanel(ctx, 32, 100 + i * 54, 268, 44, 6, '#252525', c.color);
      ctx.fillStyle = c.color;
      ctx.fillRect(32, 100 + i * 54, 8, 44);
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(c.name, 50, 126 + i * 54);
    });

    // Right Non-Destructive Redline Feed
    drawRoundedPanel(ctx, 330, 58, 692, 394, 8, '#181818', '#383838');
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('NON-DESTRUCTIVE CONTRIBUTOR REDLINES', 350, 82);

    drawRoundedPanel(ctx, 350, 102, 652, 148, 8, '#1f1f1f', '#06b6d4');
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('MAYA LIN (Cyan) · Scene 1 · Dialogue Suggestion', 368, 126);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    ctx.fillText('Original (Preserved):  We lose the only signal from Sector Four.', 368, 152);
    ctx.fillStyle = '#a5f3fc';
    ctx.fillText('Proposed (Outlined):   We lose the last uplink before solar blackout.', 368, 174);
    drawRoundedPanel(ctx, 368, 198, 126, 28, 5, '#059669');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Accept Suggestion', 384, 216);
    drawRoundedPanel(ctx, 506, 198, 116, 28, 5, '#374151');
    ctx.fillText('Reject / Archive', 524, 216);

    drawRoundedPanel(ctx, 350, 268, 652, 160, 8, '#1f1f1f', '#ec4899');
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('DEVON BROOKS (Pink) · Production Budget Note (Non-Destructive)', 368, 294);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '11px sans-serif';
    ctx.fillText('Suggest moving Exterior Rooftop setup to Stage B green screen to save one crane day.', 368, 322);

    drawCalloutBadge(ctx, 296, 120, '1');
    drawCalloutBadge(ctx, 985, 116, '2');
    drawCalloutBadge(ctx, 430, 212, '3');
    drawCalloutBadge(ctx, 985, 284, '4');
  } else if (diagramId === 'teleprompter_subtitles') {
    drawMockWindowChrome(ctx, width, 'SUBTITLES');
    // Left: Teleprompter preview
    drawRoundedPanel(ctx, 18, 58, 320, 394, 8, '#050505', '#444444');
    ctx.fillStyle = '#ff7700';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('TELEPROMPTER WINDOW (Black/White)', 34, 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('ELENA', 142, 155);
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('If we do not recalibrate', 58, 200);
    ctx.fillText('within ninety seconds,', 58, 228);
    ctx.fillText('the link drops.', 58, 256);
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(34, 214);
    ctx.lineTo(320, 214);
    ctx.stroke();
    drawRoundedPanel(ctx, 34, 394, 288, 38, 5, '#1c1c1c', '#3a3a3a');
    ctx.fillStyle = '#d1d5db';
    ctx.font = '10px sans-serif';
    ctx.fillText('[Play/Pause Space]  Speed: 28  Size: 48px  [Mirror]', 46, 417);

    // Right: Subtitles Studio (Export + Editor -> Screenplay)
    drawRoundedPanel(ctx, 354, 58, 668, 394, 8, '#1b1b1b', '#383838');
    drawRoundedPanel(ctx, 370, 72, 300, 28, 5, '#ff7700');
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Script -> Subtitles Export (.SRT / .VTT)', 386, 90);
    drawRoundedPanel(ctx, 678, 72, 326, 28, 5, '#292929', '#4b5563');
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText('Subtitle Importer / Editor -> Screenplay', 694, 90);

    // Cue editor rows
    const cues = [
      '#1  00:00:01,200 --> 00:00:04,500  |  [SCENE HEADING]  INT. OBSERVATORY - NIGHT',
      '#2  00:00:08,600 --> 00:00:12,100  |  [ELENA · DIALOGUE]  The array locked onto the beacon.',
      '#3  00:00:20,100 --> 00:00:24,200  |  [DISPATCH · V.O.]  Confirm atmospheric seal.',
    ];
    cues.forEach((cue, i) => {
      drawRoundedPanel(ctx, 370, 118 + i * 54, 634, 44, 5, '#222222', '#3a3a3a');
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px monospace';
      ctx.fillText(cue, 384, 144 + i * 54);
    });

    // Bottom conversion & export buttons
    drawRoundedPanel(ctx, 370, 298, 634, 136, 6, '#141414', '#333333');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Screenplay Conversion & Export Actions', 388, 324);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px sans-serif';
    ctx.fillText('• Auto-detect Speaker Prefixes (NAME:) & Scene Gaps   • Shift Timestamps (+/-s)   • Split/Merge Cues', 388, 350);
    drawRoundedPanel(ctx, 388, 374, 210, 34, 5, '#ff7700');
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Create Screenplay Document', 410, 395);
    drawRoundedPanel(ctx, 612, 374, 140, 34, 5, '#252525', '#4b5563');
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Export .SRT / .VTT', 632, 395);
    drawRoundedPanel(ctx, 766, 374, 160, 34, 5, '#252525', '#4b5563');
    ctx.fillStyle = '#fda4af';
    ctx.fillText('Export PDF / .FDX', 790, 395);

    drawCalloutBadge(ctx, 318, 76, '1');
    drawCalloutBadge(ctx, 376, 74, '2');
    drawCalloutBadge(ctx, 684, 74, '3');
    drawCalloutBadge(ctx, 845, 374, '4');
  }

  return canvas.toDataURL('image/png');
}

// --- PDF Layout Helpers ---
const PAGE_W = 8.5;
const PAGE_H = 11.0;
const MARGIN_L = 0.72;
const MARGIN_R = 0.72;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

function drawHeaderFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  runningTitle: string
) {
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.01);
  doc.line(MARGIN_L, 0.56, PAGE_W - MARGIN_R, 0.56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 130);
  doc.text('SCREENCRAFT STUDIO · USER MANUAL', MARGIN_L, 0.45);
  doc.setFont('helvetica', 'normal');
  doc.text(runningTitle, PAGE_W - MARGIN_R, 0.45, { align: 'right' });

  doc.line(MARGIN_L, PAGE_H - 0.58, PAGE_W - MARGIN_R, PAGE_H - 0.58);
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 120);
  doc.text(
    'Illustrated Reference Guide & Step-by-Step Documentation',
    MARGIN_L,
    PAGE_H - 0.4
  );
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Page ${pageNumber} of ${totalPages}`,
    PAGE_W - MARGIN_R,
    PAGE_H - 0.4,
    { align: 'right' }
  );
}

export function generateHelpManualPdf(): HelpManualPdfResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  // Track exact pages for TOC & Index back-filling
  const sectionStartPages = new Map<string, number>();
  const indexTermPages = new Map<string, number[]>();
  let shortcutsPage = 1;

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  doc.setFillColor(24, 24, 27);
  doc.rect(0, 0, PAGE_W, 3.05, 'F');

  doc.setFillColor(255, 119, 0);
  doc.rect(0, 3.05, PAGE_W, 0.08, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 145, 45);
  doc.text('SCREENCRAFT STUDIO', MARGIN_L, 0.92);

  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text('Complete User Manual &', MARGIN_L, 1.48);
  doc.text('Illustrated How-To Guide', MARGIN_L, 1.88);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(209, 213, 219);
  const coverDesc = doc.splitTextToSize(
    'Comprehensive step-by-step instructions, annotated workspace diagrams, keyboard shortcuts, and searchable index for screenwriting, character node graphs, production stripboards, storyboarding, collaboration redlines, teleprompter, and subtitles.',
    CONTENT_W
  ) as string[];
  doc.text(coverDesc, MARGIN_L, 2.28);

  // Embedded Architecture Overview Diagram on Cover
  const overviewImg = renderDiagramImage('overview');
  const imgW = CONTENT_W;
  const imgH = imgW * (470 / 1040);
  doc.setDrawColor(210, 214, 220);
  doc.setLineWidth(0.015);
  doc.roundedRect(MARGIN_L - 0.04, 3.38, imgW + 0.08, imgH + 0.08, 0.08, 0.08, 'S');
  if (overviewImg) {
    doc.addImage(overviewImg, 'PNG', MARGIN_L, 3.42, imgW, imgH);
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(95, 100, 110);
  doc.text(
    'Figure 0.1 — End-to-End ScreenCraft Studio Workspace & Export Pipeline',
    MARGIN_L,
    3.42 + imgH + 0.24
  );

  // Cover Highlights Grid
  const highlightsY = 3.42 + imgH + 0.56;
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(225, 228, 234);
  doc.roundedRect(MARGIN_L, highlightsY, CONTENT_W, 2.45, 0.08, 0.08, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 30, 35);
  doc.text('WHAT THIS GUIDE COVERS', MARGIN_L + 0.22, highlightsY + 0.32);

  const cols = [
    [
      '• Launch Hub, .sccrft, .fdx & .fountain files',
      '• Authoring Editor, A/V Mode & Quick Notes',
      '• Spell/Grammar Check, Continuity & Track Changes',
      '• Characters Bios & Infinite Node Connections',
    ],
    [
      '• Outline Beat Board & Scene Reordering',
      '• Production Stripboard, Cast, Map & Call Sheets',
      '• Storyboard Blocking Canvas (Grid, Shapes, 1px/10px)',
      '• Collaboration Redlines, Teleprompter & Subtitles',
    ],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(65, 70, 80);
  cols[0].forEach((line, i) => {
    doc.text(line, MARGIN_L + 0.22, highlightsY + 0.65 + i * 0.32);
  });
  cols[1].forEach((line, i) => {
    doc.text(line, MARGIN_L + CONTENT_W / 2 + 0.1, highlightsY + 0.65 + i * 0.32);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 125, 135);
  doc.text(
    `Generated ${new Date().toLocaleDateString()} · ScreenCraft Studio Documentation`,
    MARGIN_L,
    PAGE_H - 0.55
  );

  // =========================================================================
  // PAGE 2: RESERVED FOR TABLE OF CONTENTS (FILLED AFTER RENDERING SECTIONS)
  // =========================================================================
  doc.addPage('letter', 'portrait');
  const tocPageNumber = doc.getNumberOfPages();

  // =========================================================================
  // CHAPTER PAGES (ONE SECTION PER SPREAD / DYNAMIC FLOW)
  // =========================================================================
  const pageHeaderLabels = new Map<number, string>();
  pageHeaderLabels.set(tocPageNumber, 'Table of Contents');

  for (const section of MANUAL_SECTIONS) {
    doc.addPage('letter', 'portrait');
    const startPage = doc.getNumberOfPages();
    sectionStartPages.set(section.id, startPage);
    pageHeaderLabels.set(startPage, section.chapterTitle);

    let y = 0.85;

    // Chapter Eyebrow
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(215, 95, 0);
    doc.text(section.chapterTitle.toUpperCase(), MARGIN_L, y);
    y += 0.24;

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(20, 22, 28);
    const titleLines = doc.splitTextToSize(
      `${section.number}  ${section.title}`,
      CONTENT_W
    ) as string[];
    doc.text(titleLines, MARGIN_L, y);
    y += titleLines.length * 0.25 + 0.04;

    // Location badge line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(`Where to find it: ${section.location}`, MARGIN_L, y);
    y += 0.2;

    // Summary paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 60, 70);
    const summaryLines = doc.splitTextToSize(section.summary, CONTENT_W) as string[];
    doc.text(summaryLines, MARGIN_L, y);
    y += summaryLines.length * 0.17 + 0.14;

    // Illustrated Diagram Image
    const diagramImg = renderDiagramImage(section.diagramId);
    const dW = CONTENT_W;
    const dH = dW * (470 / 1040);
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.012);
    doc.roundedRect(MARGIN_L - 0.02, y - 0.02, dW + 0.04, dH + 0.04, 0.05, 0.05, 'S');
    if (diagramImg) {
      doc.addImage(diagramImg, 'PNG', MARGIN_L, y, dW, dH);
    }
    y += dH + 0.18;

    // Caption
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 105, 115);
    doc.text(section.diagramCaption, MARGIN_L, y);
    y += 0.2;

    // Numbered Callout Legend Box (2x2 grid)
    doc.setFillColor(248, 249, 251);
    doc.setDrawColor(226, 230, 236);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, 0.56, 0.05, 0.05, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 44, 52);
    section.calloutLegend.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const lx = MARGIN_L + 0.14 + col * (CONTENT_W / 2);
      const ly = y + 0.21 + row * 0.21;
      doc.text(item, lx, ly);
    });
    y += 0.76;

    // Detailed Step-by-Step How-To Heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(25, 28, 34);
    doc.text('Step-by-Step How-To Instructions', MARGIN_L, y);
    y += 0.22;

    // Record index terms on start page
    section.indexTerms.forEach((term) => {
      const prev = indexTermPages.get(term) || [];
      if (!prev.includes(startPage)) prev.push(startPage);
      indexTermPages.set(term, prev);
    });

    // Render Steps with automatic pagination
    section.steps.forEach((step, idx) => {
      const stepLines = doc.splitTextToSize(step.detail, CONTENT_W - 0.42) as string[];
      const tipLines = step.tip
        ? (doc.splitTextToSize(`Tip: ${step.tip}`, CONTENT_W - 0.52) as string[])
        : [];
      const neededHeight =
        0.26 +
        stepLines.length * 0.165 +
        (tipLines.length > 0 ? tipLines.length * 0.15 + 0.12 : 0) +
        0.16;

      if (y + neededHeight > PAGE_H - 0.78) {
        doc.addPage('letter', 'portrait');
        const contPage = doc.getNumberOfPages();
        pageHeaderLabels.set(contPage, `${section.chapterTitle} (cont.)`);
        y = 0.85;
      }

      // Step badge
      doc.setFillColor(255, 119, 0);
      doc.roundedRect(MARGIN_L, y - 0.13, 0.26, 0.2, 0.04, 0.04, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(idx + 1), MARGIN_L + 0.13, y + 0.005, { align: 'center' });

      // Step title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(22, 24, 30);
      doc.text(step.title, MARGIN_L + 0.36, y);
      y += 0.19;

      // Step detail
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(55, 60, 70);
      doc.text(stepLines, MARGIN_L + 0.36, y);
      y += stepLines.length * 0.165 + 0.04;

      if (tipLines.length > 0) {
        doc.setFillColor(255, 248, 235);
        doc.setDrawColor(245, 200, 130);
        const boxH = tipLines.length * 0.155 + 0.12;
        doc.roundedRect(MARGIN_L + 0.36, y - 0.04, CONTENT_W - 0.42, boxH, 0.04, 0.04, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.8);
        doc.setTextColor(135, 72, 10);
        doc.text(tipLines, MARGIN_L + 0.46, y + 0.11);
        y += boxH + 0.08;
      } else {
        y += 0.06;
      }
    });

    // Optional section keyboard shortcuts table
    if (section.shortcuts && section.shortcuts.length > 0) {
      const boxH = 0.4 + section.shortcuts.length * 0.22;
      if (y + boxH > PAGE_H - 0.78) {
        doc.addPage('letter', 'portrait');
        pageHeaderLabels.set(doc.getNumberOfPages(), `${section.chapterTitle} (Shortcuts)`);
        y = 0.85;
      }
      doc.setFillColor(244, 246, 249);
      doc.setDrawColor(218, 222, 230);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, boxH, 0.06, 0.06, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 35, 45);
      doc.text('Quick Keyboard Shortcuts', MARGIN_L + 0.16, y + 0.24);
      let sy = y + 0.46;
      section.shortcuts.forEach((sc) => {
        doc.setFont('courier', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(195, 85, 0);
        doc.text(sc.keys, MARGIN_L + 0.16, sy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(55, 60, 70);
        doc.text(sc.action, MARGIN_L + 2.3, sy);
        sy += 0.21;
      });
    }
  }

  // =========================================================================
  // APPENDIX A: COMPLETE KEYBOARD SHORTCUTS REFERENCE
  // =========================================================================
  doc.addPage('letter', 'portrait');
  shortcutsPage = doc.getNumberOfPages();
  pageHeaderLabels.set(shortcutsPage, 'Appendix A · Keyboard Shortcuts');

  let ay = 0.88;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(215, 95, 0);
  doc.text('APPENDIX A', MARGIN_L, ay);
  ay += 0.24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(20, 22, 28);
  doc.text('Complete Keyboard Shortcuts Reference', MARGIN_L, ay);
  ay += 0.34;

  // Table header
  doc.setFillColor(30, 32, 38);
  doc.rect(MARGIN_L, ay, CONTENT_W, 0.28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('SHORTCUT', MARGIN_L + 0.12, ay + 0.19);
  doc.text('CONTEXT', MARGIN_L + 2.45, ay + 0.19);
  doc.text('ACTION', MARGIN_L + 3.55, ay + 0.19);
  ay += 0.34;

  KEYBOARD_SHORTCUTS.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 251);
      doc.rect(MARGIN_L, ay - 0.16, CONTENT_W, 0.28, 'F');
    }
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(195, 85, 0);
    doc.text(row.keys, MARGIN_L + 0.12, ay + 0.02);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(35, 95, 130);
    doc.text(row.context, MARGIN_L + 2.45, ay + 0.02);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(50, 55, 65);
    doc.text(row.action, MARGIN_L + 3.55, ay + 0.02);
    ay += 0.28;
  });

  // =========================================================================
  // APPENDIX B: ALPHABETICAL FEATURE INDEX
  // =========================================================================
  doc.addPage('letter', 'portrait');
  const indexPage = doc.getNumberOfPages();
  pageHeaderLabels.set(indexPage, 'Appendix B · Alphabetical Index');

  let iy = 0.88;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(215, 95, 0);
  doc.text('APPENDIX B', MARGIN_L, iy);
  iy += 0.24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(20, 22, 28);
  doc.text('Alphabetical Feature & Workflow Index', MARGIN_L, iy);
  iy += 0.26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(80, 85, 95);
  doc.text(
    'Click any index entry below to jump directly to its illustrated walkthrough page.',
    MARGIN_L,
    iy
  );
  iy += 0.3;

  const sortedTerms = Array.from(indexTermPages.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  sortedTerms.push(['Keyboard Shortcuts Reference', [shortcutsPage]]);

  const colW = CONTENT_W / 2 - 0.18;
  const rowsPerCol = Math.ceil(sortedTerms.length / 2);

  sortedTerms.forEach(([term, pages], idx) => {
    const col = idx < rowsPerCol ? 0 : 1;
    const row = idx < rowsPerCol ? idx : idx - rowsPerCol;
    const tx = MARGIN_L + col * (colW + 0.36);
    const ty = iy + row * 0.235;
    const targetPage = pages[0];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(35, 40, 48);
    doc.text(term, tx, ty);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(205, 90, 0);
    doc.text(`p. ${targetPage}`, tx + colW, ty, { align: 'right' });

    // Dotted leader line
    const termW = doc.getTextWidth(term);
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.006);
    if (tx + termW + 0.12 < tx + colW - 0.42) {
      doc.line(tx + termW + 0.08, ty + 0.02, tx + colW - 0.42, ty + 0.02);
    }

    // Interactive PDF link jump
    doc.link(tx, ty - 0.14, colW, 0.2, { pageNumber: targetPage });
  });

  // =========================================================================
  // BACK-FILL PAGE 2: TABLE OF CONTENTS (WITH EXACT PAGE NUMBERS & LINKS)
  // =========================================================================
  doc.setPage(tocPageNumber);
  let ty = 0.92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(215, 95, 0);
  doc.text('INDEX & TABLE OF CONTENTS', MARGIN_L, ty);
  ty += 0.28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 22, 28);
  doc.text('How to Use ScreenCraft Studio', MARGIN_L, ty);
  ty += 0.28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(80, 85, 95);
  doc.text(
    'Click any chapter or appendix row below to jump straight to that section in the PDF.',
    MARGIN_L,
    ty
  );
  ty += 0.36;

  MANUAL_SECTIONS.forEach((sec) => {
    const pNum = sectionStartPages.get(sec.id) || 3;

    doc.setFillColor(248, 249, 252);
    doc.setDrawColor(225, 229, 236);
    doc.roundedRect(MARGIN_L, ty - 0.16, CONTENT_W, 0.64, 0.05, 0.05, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(210, 90, 0);
    doc.text(sec.chapterTitle.toUpperCase(), MARGIN_L + 0.16, ty + 0.01);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 24, 30);
    doc.text(`${sec.number}  ${sec.title}`, MARGIN_L + 0.16, ty + 0.21);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(95, 100, 112);
    doc.text(`Location: ${sec.location}`, MARGIN_L + 0.16, ty + 0.39);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(210, 90, 0);
    doc.text(`Page ${pNum}`, PAGE_W - MARGIN_R - 0.16, ty + 0.21, { align: 'right' });

    // Clickable link
    doc.link(MARGIN_L, ty - 0.16, CONTENT_W, 0.64, { pageNumber: pNum });

    ty += 0.74;
  });

  // Appendix entries in TOC
  const appendices = [
    { label: 'Appendix A · Complete Keyboard Shortcuts Reference', page: shortcutsPage },
    { label: 'Appendix B · Alphabetical Feature & Workflow Index', page: indexPage },
  ];
  appendices.forEach((app) => {
    doc.setFillColor(241, 244, 248);
    doc.setDrawColor(215, 220, 228);
    doc.roundedRect(MARGIN_L, ty - 0.16, CONTENT_W, 0.42, 0.05, 0.05, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 34, 42);
    doc.text(app.label, MARGIN_L + 0.16, ty + 0.1);
    doc.setTextColor(210, 90, 0);
    doc.text(`Page ${app.page}`, PAGE_W - MARGIN_R - 0.16, ty + 0.1, { align: 'right' });
    doc.link(MARGIN_L, ty - 0.16, CONTENT_W, 0.42, { pageNumber: app.page });
    ty += 0.52;
  });

  // =========================================================================
  // APPLY RUNNING HEADER & FOOTER TO ALL PAGES AFTER COVER
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawHeaderFooter(doc, p, totalPages, pageHeaderLabels.get(p) || 'User Manual');
  }

  const blob = doc.output('blob');
  const filename = 'ScreenCraft_Studio_User_Manual.pdf';
  return {
    blob,
    filename,
    pageCount: totalPages,
    byteSize: blob.size,
  };
}

export function downloadHelpManualPdf(): HelpManualPdfResult {
  const result = generateHelpManualPdf();
  triggerBlobDownload(result.blob, result.filename);
  return result;
}
