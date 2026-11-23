import React, { useState, useEffect } from 'react';
import {
  ActiveWorkspace,
  ElementType,
  StoryProject,
  Scene,
  ScreenplayElement,
  StoryComment,
  Tag,
  TagCategory,
  StripboardStrip,
  StoryboardFrame,
  ScreenplayRevision,
  CastCrewMember,
  ShootLocation,
  CharacterBreakdownOverride,
  ScriptFormatMode,
  ProjectBible,
  NLEGeneratedSidecarEntry,
  CharacterRelationshipEdge,
  ElementFormatting,
  EditorTypographySettings,
  CollaboratorProfile,
  CollaboratorSuggestion,
  EquipmentItem,
  FinanceSettings,
  StoryCharacter,
} from './types/story';
import {
  DEFAULT_EDITOR_TYPOGRAPHY,
  getEffectiveElementFormatting,
} from './utils/screenplayFormatting';
import {
  DocumentTemplateKind,
  cloneProductionAssetsFromProject,
  createNewProductionProject,
  createProjectFromDocumentTemplate,
  generateNewProductionScheduleStrips,
} from './utils/projectTemplates';
import { SAMPLE_PROJECTS } from './data/sampleScripts';
import { TopHeader } from './components/TopHeader';
import { MenuBar, AuthoringViewMode } from './components/MenuBar';
import { FormattingToolbar } from './components/FormattingToolbar';
import { OutlineColumn } from './components/OutlineColumn';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { InspectorColumn, InspectorTabId } from './components/InspectorColumn';
import { StoryboardWorkspace } from './components/StoryboardWorkspace';
import { ProjectContainerView } from './components/ProjectContainerView';
import { CharactersWorkspace } from './components/CharactersWorkspace';
import { OutlineWorkspace } from './components/OutlineWorkspace';
import { ProductionWorkspace, ProductionHubTab } from './components/ProductionWorkspace';
import { CollaborationWorkspace } from './components/CollaborationWorkspace';
import { PreferencesModal } from './components/PreferencesModal';
import {
  GoToModal,
  FindReplaceModal,
  CharacterActionModal,
  CharacterModalMode,
  EmojiSymbolsModal,
} from './components/EditToolsModals';
import { ProjectsBrowser } from './components/ProjectsBrowser';
import { ExportModal } from './components/ExportModal';
import { ReportsModal } from './components/ReportsModal';
import { NLEMetadataModal } from './components/NLEMetadataModal';
import { RevisionImpactModal } from './components/RevisionImpactModal';
import { TeleprompterWindow } from './components/TeleprompterWindow';
import { SceneContinuityModal } from './components/SceneContinuityModal';
import { HelpGuideModal, HelpSectionCategory } from './components/HelpGuideModal';
import { QuickNotesSidebar } from './components/QuickNotesSidebar';
import { parseFountain } from './utils/screenplayParser';
import { analyzeScriptProofreading } from './utils/scriptProofreading';
import { generateRustDesktopZip } from './utils/rustDesktopGenerator';
import {
  computeRevisionImpact,
  commitScriptToScheduleSync,
  syncStripboardToScript,
} from './utils/liveScheduleSync';
import { computeRevisionPassCounts } from './utils/revisionPass';
import { analyzeSceneContinuity } from './utils/sceneContinuityCheck';
import {
  UserDocumentTemplate,
  UserTemplateCategory,
  deleteUserTemplate,
  getSanitizedSccrftFileName,
  hasBoundSccrftHandle,
  instantiateProjectFromUserTemplate,
  loadUserTemplates,
  normalizeSccrftFileName,
  parseOpenedDocumentFile,
  saveProjectAsUserTemplate,
  saveSccrftLocally,
} from './utils/sccrftFileFormat';
import { ExportFormatType } from './utils/exportPreviewFormatter';
import { printScreenplayDocument } from './utils/printHelper';
import { Upload, X, Clock, Save, CheckCircle, Download, BookmarkPlus } from 'lucide-react';

const STORAGE_KEY_PROJECTS = 'adobe_story_projects_v1';
const STORAGE_KEY_CURRENT_ID = 'adobe_story_current_project_id';
const STORAGE_KEY_LAST_SAVED = 'adobe_story_last_saved_at';

export default function App() {
  const [projects, setProjects] = useState<StoryProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure legacy saved projects inherit sample crewMembers / characterRelationships if absent
          return parsed.map((proj: StoryProject) => {
            const sampleMatch = SAMPLE_PROJECTS.find((sp) => sp.id === proj.id);
            if (
              Array.isArray(proj.crewMembers) &&
              (proj.characterRelationships !== undefined || !sampleMatch?.characterRelationships)
            ) {
              return proj;
            }
            return {
              ...proj,
              crewMembers: Array.isArray(proj.crewMembers)
                ? proj.crewMembers
                : sampleMatch?.crewMembers || [],
              ...(proj.characterRelationships === undefined && sampleMatch?.characterRelationships
                ? { characterRelationships: sampleMatch.characterRelationships }
                : {}),
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load projects from localStorage:', e);
    }
    return SAMPLE_PROJECTS;
  });

  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_CURRENT_ID);
      if (savedId) return savedId;
    } catch (e) {
      // fallback
    }
    return 'cos-intro';
  });

  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    try {
      const savedTime = localStorage.getItem(STORAGE_KEY_LAST_SAVED);
      if (savedTime) return savedTime;
    } catch (e) {
      // fallback
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('projects');
  const [callSheetDayNumber, setCallSheetDayNumber] = useState<number | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [currentElementType, setCurrentElementType] = useState<ElementType>('SCENE_HEADING');
  const [elementsPopupTriggerNonce, setElementsPopupTriggerNonce] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Modals & Popups
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [initialExportFormat, setInitialExportFormat] = useState<ExportFormatType>('pdf');
  const [autoPrintOnExport, setAutoPrintOnExport] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [saveAsFileName, setSaveAsFileName] = useState('');
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateCategoryInput, setTemplateCategoryInput] = useState<UserTemplateCategory>('film');
  const [templateDescInput, setTemplateDescInput] = useState('');
  const [userTemplates, setUserTemplates] = useState<UserDocumentTemplate[]>(() =>
    loadUserTemplates()
  );
  const [isNLEPipelineOpen, setIsNLEPipelineOpen] = useState(false);
  const [isRevisionImpactOpen, setIsRevisionImpactOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isContinuityModalOpen, setIsContinuityModalOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const [helpInitialCategory, setHelpInitialCategory] = useState<HelpSectionCategory>('all');
  const [helpInitialToolId, setHelpInitialToolId] = useState<string | undefined>(undefined);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [inspectorRequestedTab, setInspectorRequestedTab] = useState<{
    tab: InspectorTabId;
    subMode?: 'spelling' | 'grammar';
    nonce: number;
  } | null>(null);
  const [charactersInitialSubView, setCharactersInitialSubView] = useState<
    'details' | 'bios' | 'connections'
  >('details');
  const [productionRequestedTab, setProductionRequestedTab] = useState<{
    tab: ProductionHubTab;
    nonce: number;
  } | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [isRevisionPassMode, setIsRevisionPassMode] = useState(false);
  const [authoringViewMode, setAuthoringViewMode] = useState<AuthoringViewMode>('normal');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [isTrackChangesEnabled, setIsTrackChangesEnabled] = useState(false);
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [characterModalMode, setCharacterModalMode] = useState<CharacterModalMode | null>(null);
  const [isEmojiSymbolsOpen, setIsEmojiSymbolsOpen] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [importText, setImportText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const deviceFileInputRef = React.useRef<HTMLInputElement>(null);
  const elementClipboardRef = React.useRef<ScreenplayElement[]>([]);
  const textClipboardRef = React.useRef<string>('');
  const lastTextCursorRef = React.useRef<{
    elementId: string;
    start: number;
    end: number;
  } | null>(null);
  const undoStacksRef = React.useRef<
    Map<
      string,
      Array<{
        elements: ScreenplayElement[];
        scenes: Scene[];
        characters: StoryCharacter[];
        tags: Tag[];
      }>
    >
  >(new Map());
  const redoStacksRef = React.useRef<
    Map<
      string,
      Array<{
        elements: ScreenplayElement[];
        scenes: Scene[];
        characters: StoryCharacter[];
        tags: Tag[];
      }>
    >
  >(new Map());

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setGmpQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Ref to always hold latest state for the 30-second recurring interval
  const stateRef = React.useRef({ projects, currentProjectId });
  stateRef.current = { projects, currentProjectId };

  // Screenplay Element Revision Tracking Refs
  const initialElementTextsRef = React.useRef<Map<string, string>>(new Map());
  const debounceRevisionTimerRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0];

  const activeTargetElement = React.useMemo(() => {
    if (focusedElementId) {
      const found = currentProject.elements.find((el) => el.id === focusedElementId);
      if (found) return found;
    }
    return currentProject.elements[0];
  }, [currentProject.elements, focusedElementId]);

  const projectTypography = currentProject.editorTypography || DEFAULT_EDITOR_TYPOGRAPHY;

  const effectiveFormatting = React.useMemo(
    () => getEffectiveElementFormatting(activeTargetElement, projectTypography),
    [activeTargetElement, projectTypography]
  );

  const revisionImpactReport = React.useMemo(
    () => computeRevisionImpact(currentProject),
    [currentProject]
  );

  const revisionPassCounts = React.useMemo(
    () => computeRevisionPassCounts(currentProject.elements, currentProject.revisions || []),
    [currentProject.elements, currentProject.revisions]
  );

  const continuityReport = React.useMemo(
    () => analyzeSceneContinuity(currentProject),
    [currentProject]
  );

  const proofreadReport = React.useMemo(
    () =>
      analyzeScriptProofreading(
        currentProject.elements,
        currentProject.scenes,
        'project',
        selectedSceneId,
        currentProject.customDictionary || []
      ),
    [
      currentProject.elements,
      currentProject.scenes,
      selectedSceneId,
      currentProject.customDictionary,
    ]
  );

  const pendingCollaborationCount = React.useMemo(
    () =>
      (currentProject.collaboratorSuggestions || []).filter(
        (s) => s.status === 'pending'
      ).length,
    [currentProject.collaboratorSuggestions]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist project state to localStorage and record 'Last saved at' timestamp
  const saveProjectState = React.useCallback((isAutoSave: boolean = false) => {
    setIsSaving(true);
    try {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const { projects: curProjects, currentProjectId: curId } = stateRef.current;

      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(curProjects));
      localStorage.setItem(STORAGE_KEY_CURRENT_ID, curId);
      localStorage.setItem(STORAGE_KEY_LAST_SAVED, formattedTime);

      setLastSavedTime(formattedTime);

      if (!isAutoSave) {
        showToast(`Document saved at ${formattedTime}`);
      }
    } catch (err) {
      console.error('Error saving project to localStorage:', err);
    } finally {
      setTimeout(() => setIsSaving(false), 600);
    }
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveProjectState(true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [saveProjectState]);

  // Track last focused screenplay input cursor selection so Edit menu actions act on exact position
  useEffect(() => {
    const captureSelection = () => {
      const active = document.activeElement;
      if (
        (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) &&
        focusedElementId
      ) {
        const start = active.selectionStart ?? active.value.length;
        const end = active.selectionEnd ?? active.value.length;
        lastTextCursorRef.current = { elementId: focusedElementId, start, end };
      }
    };
    document.addEventListener('selectionchange', captureSelection);
    document.addEventListener('keyup', captureSelection);
    document.addEventListener('mouseup', captureSelection);
    return () => {
      document.removeEventListener('selectionchange', captureSelection);
      document.removeEventListener('keyup', captureSelection);
      document.removeEventListener('mouseup', captureSelection);
    };
  }, [focusedElementId]);

  // Global Ctrl+S / Ctrl+O / Ctrl+P / Ctrl+F / Ctrl+G shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        saveProjectState(false);
        const curProj =
          stateRef.current.projects.find((p) => p.id === stateRef.current.currentProjectId) ||
          stateRef.current.projects[0];
        if (curProj && hasBoundSccrftHandle(curProj.id)) {
          void saveSccrftLocally(curProj, { saveAs: false }).then((res) => {
            if (res.status === 'saved') {
              showToast(`Saved ${res.fileName}`);
            }
          });
        }
      } else if (key === 'o') {
        e.preventDefault();
        if (deviceFileInputRef.current) {
          deviceFileInputRef.current.value = '';
          deviceFileInputRef.current.click();
        }
      } else if (key === 'p') {
        e.preventDefault();
        const curProj =
          stateRef.current.projects.find((p) => p.id === stateRef.current.currentProjectId) ||
          stateRef.current.projects[0];
        if (curProj) {
          const res = printScreenplayDocument(
            curProj,
            { includeTitlePage: true, includeSceneNumbers: true, includePageNumbers: true },
            true
          );
          if (res.printed) {
            showToast('Print dialog opened for screenplay');
          } else {
            showToast(
              `Print blocked by preview frame — downloaded ${
                res.fallbackPdfFilename || 'screenplay.pdf'
              }`
            );
          }
        }
      } else if (key === 'f' && !e.shiftKey) {
        e.preventDefault();
        setIsFindOpen(true);
      } else if (key === 'g' && !e.shiftKey) {
        e.preventDefault();
        setIsGoToOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProjectState]);

  useEffect(() => {
    if (currentProject.scenes.length > 0 && !selectedSceneId) {
      setSelectedSceneId(currentProject.scenes[0].id);
    }
  }, [currentProject, selectedSceneId]);

  const updateCurrentProject = (updater: (prev: StoryProject) => StoryProject) => {
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === currentProjectId ? updater(p) : p))
    );
  };

  const pushUndoSnapshot = (proj: StoryProject) => {
    const stack = undoStacksRef.current.get(proj.id) || [];
    const nextStack = [
      ...stack.slice(-39),
      {
        elements: proj.elements.map((el) => ({ ...el })),
        scenes: proj.scenes.map((sc) => ({ ...sc })),
        characters: proj.characters.map((ch) => ({ ...ch })),
        tags: proj.tags.map((t) => ({ ...t })),
      },
    ];
    undoStacksRef.current.set(proj.id, nextStack);
    redoStacksRef.current.set(proj.id, []);
    setHistoryTick((t) => t + 1);
  };

  const canUndo = (undoStacksRef.current.get(currentProject.id)?.length || 0) > 0;
  const canRedo = (redoStacksRef.current.get(currentProject.id)?.length || 0) > 0;
  void historyTick;

  const handleUndo = () => {
    const undoStack = undoStacksRef.current.get(currentProject.id) || [];
    if (undoStack.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    undoStacksRef.current.set(currentProject.id, undoStack.slice(0, -1));

    const redoStack = redoStacksRef.current.get(currentProject.id) || [];
    redoStacksRef.current.set(currentProject.id, [
      ...redoStack,
      {
        elements: currentProject.elements.map((el) => ({ ...el })),
        scenes: currentProject.scenes.map((sc) => ({ ...sc })),
        characters: currentProject.characters.map((ch) => ({ ...ch })),
        tags: currentProject.tags.map((t) => ({ ...t })),
      },
    ]);

    updateCurrentProject((proj) => ({
      ...proj,
      elements: previous.elements,
      scenes: previous.scenes,
      characters: previous.characters,
      tags: previous.tags,
      lastModified: 'Just now',
    }));
    setHistoryTick((t) => t + 1);
    showToast('Undid last change');
  };

  const handleRedo = () => {
    const redoStack = redoStacksRef.current.get(currentProject.id) || [];
    if (redoStack.length === 0) {
      showToast('Nothing to redo');
      return;
    }
    const next = redoStack[redoStack.length - 1];
    redoStacksRef.current.set(currentProject.id, redoStack.slice(0, -1));

    const undoStack = undoStacksRef.current.get(currentProject.id) || [];
    undoStacksRef.current.set(currentProject.id, [
      ...undoStack,
      {
        elements: currentProject.elements.map((el) => ({ ...el })),
        scenes: currentProject.scenes.map((sc) => ({ ...sc })),
        characters: currentProject.characters.map((ch) => ({ ...ch })),
        tags: currentProject.tags.map((t) => ({ ...t })),
      },
    ]);

    updateCurrentProject((proj) => ({
      ...proj,
      elements: next.elements,
      scenes: next.scenes,
      characters: next.characters,
      tags: next.tags,
      lastModified: 'Just now',
    }));
    setHistoryTick((t) => t + 1);
    showToast('Redid change');
  };

  // Screenplay Element Operations & Revision Tracking
  const handleUpdateElement = (id: string, text: string) => {
    // 1. If we haven't stored original text for this edit session, cache it & push Undo
    if (!initialElementTextsRef.current.has(id)) {
      const existingEl = currentProject.elements.find((el) => el.id === id);
      initialElementTextsRef.current.set(id, existingEl ? existingEl.text : '');
      pushUndoSnapshot(currentProject);
    }

    // 2. Immediately update element text & lastEditedAt in state for zero keystroke latency
    const editedIso = new Date().toISOString();
    const origForTrack = initialElementTextsRef.current.get(id) ?? '';
    updateCurrentProject((proj) => {
      const updatedElements = proj.elements.map((el) =>
        el.id === id ? { ...el, text, lastEditedAt: editedIso } : el
      );

      if (!isTrackChangesEnabled) {
        return { ...proj, elements: updatedElements };
      }

      // Maintain non-destructive tracked change proposal when Track Changes is ON
      const trackerCollabId = 'track-changes-author';
      const existingCollabs = proj.collaborators || [];
      const hasTracker = existingCollabs.some((c) => c.id === trackerCollabId);
      const nextCollabs = hasTracker
        ? existingCollabs
        : [
            ...existingCollabs,
            {
              id: trackerCollabId,
              name: proj.author || 'Author (Tracked)',
              role: 'Writer · Tracked Revision',
              color: '#8b5cf6',
              isExternal: false,
              addedAt: new Date().toLocaleDateString(),
            },
          ];

      const existingSuggestions = proj.collaboratorSuggestions || [];
      const activeIdx = existingSuggestions.findIndex(
        (s) =>
          s.status === 'pending' &&
          s.elementId === id &&
          s.collaboratorId === trackerCollabId
      );
      const targetEl = proj.elements.find((el) => el.id === id);
      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      let nextSuggestions: CollaboratorSuggestion[];
      if (activeIdx >= 0) {
        nextSuggestions = existingSuggestions.map((s, idx) =>
          idx === activeIdx ? { ...s, proposedText: text, createdAt: nowTime } : s
        );
      } else {
        const newSug: CollaboratorSuggestion = {
          id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          collaboratorId: trackerCollabId,
          sceneId: targetEl?.sceneId,
          elementId: id,
          kind: 'edit_text',
          proposedElementType: targetEl?.type,
          originalTextSnapshot: origForTrack,
          proposedText: text,
          rationale: 'Tracked text edit',
          status: 'pending',
          createdAt: nowTime,
        };
        nextSuggestions = [newSug, ...existingSuggestions];
      }

      return {
        ...proj,
        elements: updatedElements,
        collaborators: nextCollabs,
        collaboratorSuggestions: nextSuggestions,
      };
    });

    // 3. Reset existing debounce timer for this element
    const existingTimer = debounceRevisionTimerRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 4. Set debounce timer to log clean revision entry once user pauses typing
    const timer = setTimeout(() => {
      const originalText = initialElementTextsRef.current.get(id);
      if (
        originalText !== undefined &&
        originalText !== text &&
        (originalText.trim() !== '' || text.trim() !== '')
      ) {
        const el = currentProject.elements.find((e) => e.id === id);
        const scene = currentProject.scenes.find((s) => s.id === el?.sceneId) || currentProject.scenes[0];
        const preview = text.length > 32 ? text.slice(0, 32) + '...' : text;
        const typeLabel = el?.type ? el.type.toLowerCase().replace('_', ' ') : 'element';

        const newRevision: ScreenplayRevision = {
          id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: currentProject.author || 'Jeffrey (Online)',
          changeType: 'text_edit',
          elementType: el?.type || 'ACTION',
          sceneId: el?.sceneId || scene?.id,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementId: id,
          previousText: originalText,
          newText: text,
          description: `Edited ${typeLabel}: "${preview || '(empty)'}"`,
          draftLabel: currentProject.activeDraftName,
          draftColor: currentProject.activeDraftColor,
        };

        updateCurrentProject((proj) => ({
          ...proj,
          revisions: [newRevision, ...(proj.revisions || [])],
        }));

        initialElementTextsRef.current.set(id, text);
      }
    }, 1200);

    debounceRevisionTimerRef.current.set(id, timer);
  };

  const findPrecedingCharacterName = (
    elementsList: ScreenplayElement[],
    atIndex: number
  ): string | undefined => {
    for (let i = atIndex; i >= 0; i--) {
      const candidate = elementsList[i];
      if (candidate.type === 'CHARACTER' && candidate.text.trim()) {
        return candidate.text.replace(/\(.*?\)/g, '').trim().toUpperCase() || undefined;
      }
      if ((candidate.type === 'DIALOGUE' || candidate.type === 'VOICE_OVER') && candidate.character) {
        return candidate.character.replace(/\(.*?\)/g, '').trim().toUpperCase() || undefined;
      }
      if (
        candidate.type === 'SCENE_HEADING' ||
        candidate.type === 'ACTION' ||
        candidate.type === 'TRANSITION' ||
        candidate.type === 'SHOT'
      ) {
        break;
      }
    }
    return undefined;
  };

  const handleUpdateElementCharacter = (id: string, character: string) => {
    const cleaned = character.replace(/\(.*?\)/g, '').trim().toUpperCase();
    const editedIso = new Date().toISOString();
    updateCurrentProject((proj) => ({
      ...proj,
      elements: proj.elements.map((el) =>
        el.id === id ? { ...el, character: cleaned || undefined, lastEditedAt: editedIso } : el
      ),
    }));
  };

  const handleUpdateElementFormatting = (id: string, patch: Partial<ElementFormatting>) => {
    const editedIso = new Date().toISOString();
    updateCurrentProject((proj) => ({
      ...proj,
      elements: proj.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              lastEditedAt: editedIso,
              formatting: { ...(el.formatting || {}), ...patch },
            }
          : el
      ),
    }));
  };

  const handleUpdateProjectTypography = (patch: Partial<EditorTypographySettings>) => {
    const elementTypographyKeys: Array<'fontFamily' | 'fontSizePt' | 'lineSpacing'> = [
      'fontFamily',
      'fontSizePt',
      'lineSpacing',
    ];
    const keysToClear = elementTypographyKeys.filter((k) => patch[k] !== undefined);
    updateCurrentProject((proj) => ({
      ...proj,
      editorTypography: {
        ...(proj.editorTypography || DEFAULT_EDITOR_TYPOGRAPHY),
        ...patch,
      },
      elements: proj.elements.map((el) => {
        if (!el.formatting) return el;
        const cleaned = { ...el.formatting };
        let changed = false;
        keysToClear.forEach((k) => {
          if (cleaned[k] !== undefined) {
            delete cleaned[k];
            changed = true;
          }
        });
        return changed ? { ...el, formatting: cleaned } : el;
      }),
    }));
  };

  const handleUpdateElementType = (id: string, type: ElementType) => {
    setCurrentElementType(type);
    const editedIso = new Date().toISOString();
    updateCurrentProject((proj) => {
      const targetIndex = proj.elements.findIndex((el) => el.id === id);
      const target = targetIndex >= 0 ? proj.elements[targetIndex] : undefined;
      const scene = proj.scenes.find((s) => s.id === target?.sceneId) || proj.scenes[0];
      const inheritedCharacter =
        (type === 'VOICE_OVER' || type === 'DIALOGUE') && target && !target.character
          ? findPrecedingCharacterName(proj.elements, targetIndex - 1)
          : target?.character;

      const updatedElements = proj.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              type,
              lastEditedAt: editedIso,
              ...(inheritedCharacter ? { character: inheritedCharacter } : {}),
            }
          : el
      );

      let updatedRevisions = proj.revisions || [];
      if (target && target.type !== type) {
        const rev: ScreenplayRevision = {
          id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: proj.author || 'Jeffrey (Online)',
          changeType: 'element_type_changed',
          elementType: type,
          sceneId: target.sceneId || scene?.id,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementId: id,
          previousText: `Element type was ${target.type}`,
          newText: `Element type changed to ${type}`,
          description: `Changed element type from ${target.type} to ${type}`,
          draftLabel: proj.activeDraftName,
          draftColor: proj.activeDraftColor,
        };
        updatedRevisions = [rev, ...updatedRevisions];
      }

      return { ...proj, elements: updatedElements, revisions: updatedRevisions };
    });
  };

  const handleAddElementAfter = (afterId: string, type: ElementType, text: string = '') => {
    setCurrentElementType(type);
    const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setFocusedElementId(newId);

    updateCurrentProject((proj) => {
      const index = proj.elements.findIndex((el) => el.id === afterId);
      const anchorEl = index >= 0 ? proj.elements[index] : proj.elements[proj.elements.length - 1];
      const inheritedSceneId = anchorEl?.sceneId || selectedSceneId || proj.scenes[0]?.id;
      const inheritedChar =
        type === 'VOICE_OVER' || type === 'DIALOGUE'
          ? findPrecedingCharacterName(
              proj.elements,
              index >= 0 ? index : proj.elements.length - 1
            )
          : undefined;

      const newElement: ScreenplayElement = {
        id: newId,
        type,
        text,
        sceneId: inheritedSceneId,
        lastEditedAt: new Date().toISOString(),
        ...(inheritedChar ? { character: inheritedChar } : {}),
      };

      const newElements = [...proj.elements];
      if (index >= 0) {
        newElements.splice(index + 1, 0, newElement);
      } else {
        newElements.push(newElement);
      }

      const scene = proj.scenes.find((s) => s.id === inheritedSceneId) || proj.scenes[0];
      const rev: ScreenplayRevision = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        author: proj.author || 'Jeffrey (Online)',
        changeType: 'element_added',
        elementType: type,
        sceneId: scene?.id,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementId: newElement.id,
        newText: text || `[New ${type.toLowerCase()} element]`,
        description: `Added new ${type.toLowerCase().replace('_', ' ')} element`,
        draftLabel: proj.activeDraftName,
        draftColor: proj.activeDraftColor,
      };

      return {
        ...proj,
        elements: newElements,
        revisions: [rev, ...(proj.revisions || [])],
      };
    });
  };

  const handleDeleteElement = (id: string) => {
    updateCurrentProject((proj) => {
      const target = proj.elements.find((el) => el.id === id);
      const scene = proj.scenes.find((s) => s.id === target?.sceneId) || proj.scenes[0];
      const newElements = proj.elements.filter((el) => el.id !== id);

      let updatedRevisions = proj.revisions || [];
      if (target) {
        const rev: ScreenplayRevision = {
          id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: proj.author || 'Jeffrey (Online)',
          changeType: 'element_deleted',
          elementType: target.type,
          sceneId: target.sceneId || scene?.id,
          sceneNumber: scene?.sceneNumber,
          sceneHeading: scene?.heading,
          elementId: target.id,
          previousText: target.text,
          description: `Deleted ${target.type.toLowerCase().replace('_', ' ')} element`,
          draftLabel: proj.activeDraftName,
          draftColor: proj.activeDraftColor,
        };
        updatedRevisions = [rev, ...updatedRevisions];
      }

      return {
        ...proj,
        elements: newElements,
        revisions: updatedRevisions,
      };
    });
  };

  // Scene Operations with Revision Recording
  const handleUpdateScene = (updatedScene: Scene) => {
    updateCurrentProject((proj) => {
      const oldScene = proj.scenes.find((s) => s.id === updatedScene.id);
      const updatedScenes = proj.scenes.map((s) =>
        s.id === updatedScene.id ? updatedScene : s
      );

      let updatedRevisions = proj.revisions || [];
      if (oldScene && (oldScene.heading !== updatedScene.heading || oldScene.synopsis !== updatedScene.synopsis)) {
        const rev: ScreenplayRevision = {
          id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: proj.author || 'Jeffrey (Online)',
          changeType: 'scene_property_changed',
          sceneId: updatedScene.id,
          sceneNumber: updatedScene.sceneNumber,
          sceneHeading: updatedScene.heading,
          previousText: oldScene.heading !== updatedScene.heading ? oldScene.heading : oldScene.synopsis,
          newText: oldScene.heading !== updatedScene.heading ? updatedScene.heading : updatedScene.synopsis,
          description: `Updated Scene ${updatedScene.sceneNumber} ${oldScene.heading !== updatedScene.heading ? 'heading' : 'synopsis'}`,
          draftLabel: proj.activeDraftName,
          draftColor: proj.activeDraftColor,
        };
        updatedRevisions = [rev, ...updatedRevisions];
      }

      return { ...proj, scenes: updatedScenes, revisions: updatedRevisions };
    });
  };

  // Revert / Restore Revision
  const handleRevertRevision = (revision: ScreenplayRevision) => {
    updateCurrentProject((proj) => {
      let updatedElements = [...proj.elements];

      if (revision.changeType === 'element_added' && revision.elementId) {
        // Revert addition by removing the added element
        updatedElements = updatedElements.filter((el) => el.id !== revision.elementId);
        showToast('Reverted addition: element removed');
      } else if (revision.changeType === 'element_deleted' && revision.elementId && revision.previousText !== undefined) {
        // Revert deletion by restoring the element
        const restoredElement: ScreenplayElement = {
          id: revision.elementId,
          type: revision.elementType || 'ACTION',
          text: revision.previousText,
          sceneId: revision.sceneId,
        };
        updatedElements.push(restoredElement);
        showToast('Restored deleted element');
      } else if (revision.elementId && revision.previousText !== undefined) {
        // Revert text change
        const revertedIso = new Date().toISOString();
        const exists = updatedElements.some((el) => el.id === revision.elementId);
        if (exists) {
          updatedElements = updatedElements.map((el) =>
            el.id === revision.elementId
              ? {
                  ...el,
                  text: revision.previousText!,
                  type: revision.elementType || el.type,
                  lastEditedAt: revertedIso,
                }
              : el
          );
        } else {
          updatedElements.push({
            id: revision.elementId,
            type: revision.elementType || 'ACTION',
            text: revision.previousText,
            sceneId: revision.sceneId,
            lastEditedAt: revertedIso,
          });
        }
        showToast(`Reverted edit: original text restored`);
      }

      // Record an audit log for the reversion
      const auditRev: ScreenplayRevision = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        dateFormatted: 'Just now',
        author: proj.author || 'Jeffrey (Online)',
        changeType: 'text_edit',
        elementType: revision.elementType,
        sceneId: revision.sceneId,
        sceneNumber: revision.sceneNumber,
        sceneHeading: revision.sceneHeading,
        elementId: revision.elementId,
        previousText: revision.newText,
        newText: revision.previousText,
        description: `Restored text from revision (${revision.dateFormatted})`,
        draftLabel: proj.activeDraftName,
        draftColor: proj.activeDraftColor,
      };

      return {
        ...proj,
        elements: updatedElements,
        revisions: [auditRev, ...(proj.revisions || [])],
      };
    });
  };

  // Create Production Draft Milestone
  const handleCreateDraftMilestone = (draftName: string, draftColor: string) => {
    updateCurrentProject((proj) => {
      const milestoneRev: ScreenplayRevision = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        dateFormatted: 'Just now',
        author: proj.author || 'Jeffrey (Online)',
        changeType: 'draft_milestone',
        description: `Locked Production Draft: ${draftName}`,
        draftLabel: draftName,
        draftColor: draftColor,
      };

      return {
        ...proj,
        activeDraftName: draftName,
        activeDraftColor: draftColor,
        revisions: [milestoneRev, ...(proj.revisions || [])],
      };
    });
    showToast(`Production Draft locked: ${draftName}`);
  };

  // Comments Operations
  const handleAddComment = (text: string, elementId?: string) => {
    const newComment: StoryComment = {
      id: `c-${Date.now()}`,
      sceneId: selectedSceneId || (currentProject.scenes[0]?.id ?? 'scene-1'),
      elementId: elementId || currentProject.elements[0]?.id,
      author: 'Jeffrey (Online)',
      createdAt: 'Just now',
      text,
      resolved: false,
      page: 1,
    };

    updateCurrentProject((proj) => ({
      ...proj,
      comments: [newComment, ...proj.comments],
    }));
    showToast('Comment added to script margin');
  };

  const handleResolveComment = (commentId: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      comments: proj.comments.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      ),
    }));
  };

  const handleDeleteComment = (commentId: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      comments: proj.comments.filter((c) => c.id !== commentId),
    }));
  };

  // Tags Operations
  const handleAddTag = (name: string, category: TagCategory, color: string, image?: string) => {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: name.toUpperCase(),
      category,
      color,
      sceneIds: selectedSceneId ? [selectedSceneId] : [],
      count: 1,
      image,
    };

    updateCurrentProject((proj) => ({
      ...proj,
      tags: [...proj.tags, newTag],
    }));
    showToast(`Tagged element "${name.toUpperCase()}"`);
  };

  const handleUpdateTagImage = (tagId: string, image?: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      tags: proj.tags.map((t) => (t.id === tagId ? { ...t, image } : t)),
    }));
    showToast(image ? 'Character profile photo updated' : 'Profile photo removed');
  };

  // Stripboard Operations (Two-Way Live Sync: Strip edits write back to Scenes & Headings)
  const handleUpdateStrips = (newStrips: StripboardStrip[]) => {
    updateCurrentProject((proj) => syncStripboardToScript(proj, newStrips));
  };

  const handleCommitScheduleSync = (selectedSceneIds: string[]) => {
    updateCurrentProject((proj) => commitScriptToScheduleSync(proj, selectedSceneIds));
    setIsRevisionImpactOpen(false);
    showToast(`Synced ${selectedSceneIds.length} script scene(s) into Production Schedule`);
  };

  const handleChangeScriptFormat = (format: ScriptFormatMode) => {
    updateCurrentProject((proj) => ({
      ...proj,
      scriptFormat: format,
    }));
    showToast(
      format === 'av_multi_column'
        ? 'Switched to Multi-Column A/V Script mode'
        : 'Switched to Single-Column Film Script mode'
    );
  };

  const handleUpdateProjectBible = (bible: ProjectBible) => {
    updateCurrentProject((proj) => ({
      ...proj,
      projectBible: bible,
    }));
  };

  const handleUpdateCharacterRelationships = (
    characterRelationships: CharacterRelationshipEdge[]
  ) => {
    updateCurrentProject((proj) => ({
      ...proj,
      characterRelationships,
    }));
  };

  const handleUpdateCharacterNodePositions = (
    characterNodePositions: Record<string, { x: number; y: number }>
  ) => {
    updateCurrentProject((proj) => ({
      ...proj,
      characterNodePositions,
    }));
  };

  const handleUpdateCharacterEdgePositions = (
    characterEdgePositions: Record<string, { x: number; y: number }>
  ) => {
    updateCurrentProject((proj) => ({
      ...proj,
      characterEdgePositions,
    }));
  };

  const handleUpdateCharacters = (characters: StoryCharacter[]) => {
    updateCurrentProject((proj) => ({
      ...proj,
      characters,
    }));
  };

  const handleApplyElementTextFix = (
    elementId: string,
    newText: string,
    description: string
  ) => {
    const editedIso = new Date().toISOString();
    updateCurrentProject((proj) => {
      const target = proj.elements.find((el) => el.id === elementId);
      const scene = proj.scenes.find((s) => s.id === target?.sceneId) || proj.scenes[0];
      const updatedElements = proj.elements.map((el) =>
        el.id === elementId ? { ...el, text: newText, lastEditedAt: editedIso } : el
      );
      const rev: ScreenplayRevision = {
        id: `rev-fix-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: editedIso,
        dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        author: proj.author || 'Jeffrey (Online)',
        changeType: 'text_edit',
        elementType: target?.type || 'ACTION',
        sceneId: target?.sceneId || scene?.id,
        sceneNumber: scene?.sceneNumber,
        sceneHeading: scene?.heading,
        elementId,
        previousText: target?.text || '',
        newText,
        description,
        draftLabel: proj.activeDraftName,
        draftColor: proj.activeDraftColor,
      };
      return {
        ...proj,
        elements: updatedElements,
        revisions: [rev, ...(proj.revisions || [])],
      };
    });
    showToast(description);
  };

  const handleAddToDictionary = (word: string) => {
    const clean = word.trim();
    if (!clean) return;
    updateCurrentProject((proj) => {
      const existing = new Set(proj.customDictionary || []);
      existing.add(clean);
      return {
        ...proj,
        customDictionary: Array.from(existing),
      };
    });
    showToast(`Added "${clean}" to project dictionary`);
  };

  const handleJumpToElement = (sceneId: string | undefined, elementId: string) => {
    if (sceneId) setSelectedSceneId(sceneId);
    setFocusedElementId(elementId);
    const matched = currentProject.elements.find((el) => el.id === elementId);
    if (matched) setCurrentElementType(matched.type);
    setActiveWorkspace('authoring');
  };

  const handleReorderScene = (sceneId: string, direction: 'earlier' | 'later') => {
    updateCurrentProject((proj) => {
      const idx = proj.scenes.findIndex((s) => s.id === sceneId);
      if (idx < 0) return proj;
      const targetIdx = direction === 'earlier' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= proj.scenes.length) return proj;

      const reordered = [...proj.scenes];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(targetIdx, 0, moved);

      const renumbered = reordered.map((sc, i) => ({
        ...sc,
        sceneNumber: i + 1,
      }));

      // Reorder elements grouped by scene order while preserving unassigned elements first
      const ungrouped = proj.elements.filter((el) => !el.sceneId);
      const groupedElements = renumbered.flatMap((sc) =>
        proj.elements.filter((el) => el.sceneId === sc.id)
      );

      const stripBySceneId = new Map(
        proj.strips.filter((st) => st.sceneId).map((st) => [st.sceneId!, st])
      );
      const updatedStrips = proj.strips.map((st) => {
        if (!st.sceneId) return st;
        const matchedScene = renumbered.find((s) => s.id === st.sceneId);
        return matchedScene
          ? { ...st, sceneNumber: matchedScene.sceneNumber }
          : st;
      });
      void stripBySceneId;

      return {
        ...proj,
        scenes: renumbered,
        elements: [...ungrouped, ...groupedElements],
        strips: updatedStrips,
      };
    });
    showToast(`Moved scene ${direction}`);
  };

  const handleAddNewScene = () => {
    const nextNum = currentProject.scenes.length + 1;
    const newSceneId = `scene-${Date.now()}`;
    const newHeadingText = `INT. NEW LOCATION ${nextNum} - DAY`;
    const newScene: Scene = {
      id: newSceneId,
      sceneNumber: nextNum,
      heading: newHeadingText,
      setting: `NEW LOCATION ${nextNum}`,
      location: 'Stage A / Set',
      intExt: 'INT',
      dayNight: 'DAY',
      timecode: '00:00:00',
      pages: '2/8',
      eighths: 2,
      durationSec: 20,
      storyDay: 1,
      timeOfDay: '09:00',
      synopsis: 'Describe the dramatic objective and beat of this scene.',
      notes: '',
      budget: '$0',
      act: currentProject.scenes[currentProject.scenes.length - 1]?.act || 1,
      characters: [],
      status: 'Outline',
    };
    const headingEl: ScreenplayElement = {
      id: `el-sc-${Date.now()}-1`,
      type: 'SCENE_HEADING',
      text: newHeadingText,
      sceneId: newSceneId,
      lastEditedAt: new Date().toISOString(),
    };
    const actionEl: ScreenplayElement = {
      id: `el-sc-${Date.now()}-2`,
      type: 'ACTION',
      text: 'Action begins here.',
      sceneId: newSceneId,
      lastEditedAt: new Date().toISOString(),
    };
    const newStrip: StripboardStrip = {
      id: `strip-${newSceneId}`,
      type: 'scene',
      sceneId: newSceneId,
      sceneNumber: nextNum,
      intExt: 'INT',
      dayNight: 'DAY',
      set: `NEW LOCATION ${nextNum}`,
      runningTime: '00:00:00',
      pages: '2/8',
      eighths: 2,
      storyDay: 1,
      scheduledDuration: '00:30',
      characters: [],
      timeOfDay: '09:00',
    };

    updateCurrentProject((proj) => ({
      ...proj,
      scenes: [...proj.scenes, newScene],
      elements: [...proj.elements, headingEl, actionEl],
      strips: [...proj.strips, newStrip],
    }));
    setSelectedSceneId(newSceneId);
    setFocusedElementId(actionEl.id);
    showToast(`Added Scene ${nextNum}`);
  };

  const handleUpdateEquipmentManifest = (equipmentManifest: EquipmentItem[]) => {
    updateCurrentProject((proj) => ({
      ...proj,
      equipmentManifest,
    }));
  };

  const handleUpdateFinanceSettings = (financeSettings: FinanceSettings) => {
    updateCurrentProject((proj) => ({
      ...proj,
      financeSettings,
    }));
  };

  const handleRecalculateFinances = () => {
    handleRecalculate();
    const nowIso = new Date().toISOString();
    updateCurrentProject((proj) => ({
      ...proj,
      financeSettings: {
        contingencyPercent: proj.financeSettings?.contingencyPercent ?? 10,
        fringePercent: proj.financeSettings?.fringePercent ?? 18,
        taxCreditPercent: proj.financeSettings?.taxCreditPercent ?? 0,
        overheadFlat: proj.financeSettings?.overheadFlat ?? 0,
        targetCap: proj.financeSettings?.targetCap,
        lastRecalculatedAt: nowIso,
      },
    }));
    showToast('Recalculated production finances, eighths, payroll & equipment totals');
  };

  const handleUpdateCollaborators = (collaborators: CollaboratorProfile[]) => {
    updateCurrentProject((proj) => ({
      ...proj,
      collaborators,
    }));
  };

  const handleAddCollaboratorSuggestion = (
    payload: Omit<CollaboratorSuggestion, 'id' | 'createdAt' | 'status'>
  ) => {
    const newSuggestion: CollaboratorSuggestion = {
      ...payload,
      id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
    };
    updateCurrentProject((proj) => ({
      ...proj,
      collaboratorSuggestions: [newSuggestion, ...(proj.collaboratorSuggestions || [])],
    }));
    setSelectedSuggestionId(newSuggestion.id);
    showToast('Added non-destructive color-outlined proposal');
  };

  const handleAcceptCollaboratorSuggestion = (suggestionId: string) => {
    const target = (currentProject.collaboratorSuggestions || []).find(
      (s) => s.id === suggestionId
    );
    if (!target) return;

    const editedIso = new Date().toISOString();
    updateCurrentProject((proj) => {
      let nextElements = [...proj.elements];
      if (target.kind === 'edit_text' && target.elementId) {
        nextElements = nextElements.map((el) =>
          el.id === target.elementId
            ? { ...el, text: target.proposedText, lastEditedAt: editedIso }
            : el
        );
      } else if (target.kind === 'insert_after') {
        const idx = target.elementId
          ? nextElements.findIndex((el) => el.id === target.elementId)
          : nextElements.length - 1;
        const inserted: ScreenplayElement = {
          id: `el-collab-${Date.now()}`,
          type: target.proposedElementType || 'ACTION',
          text: target.proposedText,
          sceneId: target.sceneId || nextElements[Math.max(0, idx)]?.sceneId,
          lastEditedAt: editedIso,
        };
        nextElements.splice(idx >= 0 ? idx + 1 : nextElements.length, 0, inserted);
      } else if (target.kind === 'delete_element' && target.elementId) {
        nextElements = nextElements.filter((el) => el.id !== target.elementId);
      }

      const collab = (proj.collaborators || []).find((c) => c.id === target.collaboratorId);
      const rev: ScreenplayRevision = {
        id: `rev-collab-${Date.now()}`,
        timestamp: editedIso,
        dateFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        author: collab ? `${collab.name} (Accepted)` : 'Collaborator',
        changeType:
          target.kind === 'insert_after'
            ? 'element_added'
            : target.kind === 'delete_element'
            ? 'element_deleted'
            : 'text_edit',
        elementType: target.proposedElementType,
        sceneId: target.sceneId,
        elementId: target.elementId,
        previousText: target.originalTextSnapshot,
        newText: target.proposedText,
        description: `Accepted collaboration proposal (${target.kind.replace('_', ' ')})`,
        draftLabel: proj.activeDraftName,
        draftColor: proj.activeDraftColor,
      };

      return {
        ...proj,
        elements: nextElements,
        revisions: target.kind === 'note' ? proj.revisions || [] : [rev, ...(proj.revisions || [])],
        collaboratorSuggestions: (proj.collaboratorSuggestions || []).map((s) =>
          s.id === suggestionId ? { ...s, status: 'accepted' } : s
        ),
      };
    });
    showToast(
      target.kind === 'note'
        ? 'Collaborator note marked resolved'
        : 'Accepted & applied collaborator suggestion to master script'
    );
  };

  const handleRejectCollaboratorSuggestion = (suggestionId: string) => {
    const target = (currentProject.collaboratorSuggestions || []).find(
      (s) => s.id === suggestionId
    );
    updateCurrentProject((proj) => {
      let nextElements = proj.elements;
      if (
        target &&
        target.collaboratorId === 'track-changes-author' &&
        target.kind === 'edit_text' &&
        target.elementId &&
        target.originalTextSnapshot !== undefined
      ) {
        nextElements = proj.elements.map((el) =>
          el.id === target.elementId
            ? { ...el, text: target.originalTextSnapshot! }
            : el
        );
      }
      return {
        ...proj,
        elements: nextElements,
        collaboratorSuggestions: (proj.collaboratorSuggestions || []).map((s) =>
          s.id === suggestionId ? { ...s, status: 'rejected' } : s
        ),
      };
    });
    showToast(
      target?.collaboratorId === 'track-changes-author'
        ? 'Tracked change rejected — original text restored'
        : 'Proposal dismissed — master script unchanged'
    );
  };

  const pendingTrackChanges = React.useMemo(
    () => (currentProject.collaboratorSuggestions || []).filter((s) => s.status === 'pending'),
    [currentProject.collaboratorSuggestions]
  );

  const handleToggleTrackChanges = () => {
    const next = !isTrackChangesEnabled;
    setIsTrackChangesEnabled(next);
    if (next) {
      setIsRevisionPassMode(true);
      showToast('Track Changes enabled — edits will be tracked for Accept/Reject');
    } else {
      showToast('Track Changes paused');
    }
  };

  const getActivePendingChange = () => {
    if (pendingTrackChanges.length === 0) return undefined;
    return (
      pendingTrackChanges.find((s) => s.id === selectedSuggestionId) ||
      pendingTrackChanges.find((s) => s.elementId === focusedElementId) ||
      pendingTrackChanges[0]
    );
  };

  const handleAcceptActiveChange = () => {
    const active = getActivePendingChange();
    if (!active) {
      showToast('No pending tracked changes to accept');
      return;
    }
    const remaining = pendingTrackChanges.filter((s) => s.id !== active.id);
    handleAcceptCollaboratorSuggestion(active.id);
    setSelectedSuggestionId(remaining[0]?.id || null);
  };

  const handleRejectActiveChange = () => {
    const active = getActivePendingChange();
    if (!active) {
      showToast('No pending tracked changes to reject');
      return;
    }
    const remaining = pendingTrackChanges.filter((s) => s.id !== active.id);
    handleRejectCollaboratorSuggestion(active.id);
    setSelectedSuggestionId(remaining[0]?.id || null);
  };

  const handleNavigateChange = (direction: -1 | 1) => {
    if (pendingTrackChanges.length === 0) {
      showToast('No pending tracked changes in this document');
      return;
    }
    const currentIdx = pendingTrackChanges.findIndex((s) => s.id === selectedSuggestionId);
    const nextIdx =
      currentIdx < 0
        ? direction > 0
          ? 0
          : pendingTrackChanges.length - 1
        : (currentIdx + direction + pendingTrackChanges.length) %
          pendingTrackChanges.length;

    const target = pendingTrackChanges[nextIdx];
    setSelectedSuggestionId(target.id);
    if (target.sceneId) setSelectedSceneId(target.sceneId);
    if (target.elementId) setFocusedElementId(target.elementId);
    setActiveWorkspace('authoring');
    showToast(
      `Change ${nextIdx + 1} of ${pendingTrackChanges.length}: ${target.kind.replace('_', ' ')}`
    );
  };

  const handleSelectAllElements = () => {
    if (currentProject.elements.length === 0) return;
    setActiveWorkspace('authoring');
    setSelectedElementIds(currentProject.elements.map((el) => el.id));
    showToast(`Selected all ${currentProject.elements.length} screenplay elements`);
  };

  const handleSelectSceneElements = () => {
    const targetSceneId =
      selectedSceneId ||
      currentProject.elements.find((e) => e.id === focusedElementId)?.sceneId ||
      currentProject.scenes[0]?.id;
    if (!targetSceneId) return;
    const matched = currentProject.elements.filter((el) => el.sceneId === targetSceneId);
    if (matched.length === 0) {
      showToast('No elements found in active scene');
      return;
    }
    setActiveWorkspace('authoring');
    setSelectedSceneId(targetSceneId);
    setSelectedElementIds(matched.map((el) => el.id));
    setFocusedElementId(matched[0].id);
    const sceneObj = currentProject.scenes.find((s) => s.id === targetSceneId);
    showToast(
      `Selected ${matched.length} element${matched.length === 1 ? '' : 's'} in Scene ${
        sceneObj?.sceneNumber || ''
      }`
    );
  };

  const getTargetedElementsForClipboard = (): ScreenplayElement[] => {
    if (selectedElementIds.length > 0) {
      const idSet = new Set(selectedElementIds);
      return currentProject.elements.filter((el) => idSet.has(el.id));
    }
    if (focusedElementId) {
      const el = currentProject.elements.find((item) => item.id === focusedElementId);
      return el ? [el] : [];
    }
    return currentProject.elements[0] ? [currentProject.elements[0]] : [];
  };

  const handleCopySelection = () => {
    const cursor = lastTextCursorRef.current;
    if (cursor && cursor.end > cursor.start && selectedElementIds.length === 0) {
      const el = currentProject.elements.find((item) => item.id === cursor.elementId);
      if (el) {
        const slice = el.text.slice(cursor.start, cursor.end);
        textClipboardRef.current = slice;
        elementClipboardRef.current = [];
        void navigator.clipboard?.writeText(slice).catch(() => {});
        showToast('Copied selected text');
        return;
      }
    }

    const targets = getTargetedElementsForClipboard();
    if (targets.length === 0) return;
    elementClipboardRef.current = targets.map((el) => ({ ...el }));
    const plain = targets.map((el) => el.text).join('\n\n');
    textClipboardRef.current = plain;
    void navigator.clipboard?.writeText(plain).catch(() => {});
    showToast(`Copied ${targets.length} element${targets.length === 1 ? '' : 's'}`);
  };

  const handleDeleteSelection = () => {
    const cursor = lastTextCursorRef.current;
    if (cursor && cursor.end > cursor.start && selectedElementIds.length === 0) {
      const el = currentProject.elements.find((item) => item.id === cursor.elementId);
      if (el) {
        pushUndoSnapshot(currentProject);
        const nextText = el.text.slice(0, cursor.start) + el.text.slice(cursor.end);
        handleUpdateElement(el.id, nextText);
        lastTextCursorRef.current = { ...cursor, end: cursor.start };
        showToast('Deleted selected text');
        return;
      }
    }

    const targets = getTargetedElementsForClipboard();
    if (targets.length === 0) return;
    if (currentProject.elements.length <= targets.length) {
      pushUndoSnapshot(currentProject);
      const fallbackEl: ScreenplayElement = {
        ...currentProject.elements[0],
        text: '',
      };
      updateCurrentProject((proj) => ({ ...proj, elements: [fallbackEl] }));
      setSelectedElementIds([]);
      setFocusedElementId(fallbackEl.id);
      showToast('Cleared script content');
      return;
    }

    pushUndoSnapshot(currentProject);
    const deleteIds = new Set(targets.map((t) => t.id));
    const remaining = currentProject.elements.filter((el) => !deleteIds.has(el.id));
    updateCurrentProject((proj) => ({
      ...proj,
      elements: remaining,
      lastModified: 'Just now',
    }));
    setSelectedElementIds([]);
    setFocusedElementId(remaining[0]?.id || null);
    showToast(`Deleted ${targets.length} element${targets.length === 1 ? '' : 's'}`);
  };

  const handleCutSelection = () => {
    handleCopySelection();
    handleDeleteSelection();
  };

  const handlePasteSelection = async () => {
    let clipboardText = textClipboardRef.current;
    try {
      if (navigator.clipboard?.readText) {
        const read = await navigator.clipboard.readText();
        if (read) clipboardText = read;
      }
    } catch {
      // Fallback to internal clipboard ref when browser blocks async clipboard read
    }

    if (
      elementClipboardRef.current.length > 0 &&
      (!clipboardText || clipboardText === textClipboardRef.current)
    ) {
      pushUndoSnapshot(currentProject);
      const anchorId =
        focusedElementId ||
        currentProject.elements[currentProject.elements.length - 1]?.id;
      const anchorIdx = currentProject.elements.findIndex((el) => el.id === anchorId);
      const insertAt = anchorIdx >= 0 ? anchorIdx + 1 : currentProject.elements.length;
      const inheritedScene =
        currentProject.elements[Math.max(0, anchorIdx)]?.sceneId ||
        selectedSceneId ||
        currentProject.scenes[0]?.id;

      const clones = elementClipboardRef.current.map((src, i) => ({
        ...src,
        id: `el-paste-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        sceneId: src.sceneId || inheritedScene,
        lastEditedAt: new Date().toISOString(),
      }));

      updateCurrentProject((proj) => {
        const nextElements = [...proj.elements];
        nextElements.splice(insertAt, 0, ...clones);
        return { ...proj, elements: nextElements, lastModified: 'Just now' };
      });
      setSelectedElementIds(clones.map((c) => c.id));
      setFocusedElementId(clones[clones.length - 1]?.id || null);
      showToast(`Pasted ${clones.length} element${clones.length === 1 ? '' : 's'}`);
      return;
    }

    if (!clipboardText) {
      showToast('Clipboard is empty');
      return;
    }

    const targetId =
      lastTextCursorRef.current?.elementId ||
      focusedElementId ||
      currentProject.elements[0]?.id;
    const targetEl = currentProject.elements.find((el) => el.id === targetId);
    if (!targetEl) return;

    pushUndoSnapshot(currentProject);
    const start =
      lastTextCursorRef.current?.elementId === targetId
        ? lastTextCursorRef.current.start
        : targetEl.text.length;
    const end =
      lastTextCursorRef.current?.elementId === targetId
        ? lastTextCursorRef.current.end
        : targetEl.text.length;
    const nextText =
      targetEl.text.slice(0, start) + clipboardText + targetEl.text.slice(end);
    handleUpdateElement(targetId, nextText);
    const nextPos = start + clipboardText.length;
    lastTextCursorRef.current = { elementId: targetId, start: nextPos, end: nextPos };
    showToast('Pasted text');
  };

  const handleInsertEmojiSymbol = (glyph: string) => {
    void navigator.clipboard?.writeText(glyph).catch(() => {});
    const targetId =
      lastTextCursorRef.current?.elementId ||
      focusedElementId ||
      currentProject.elements[0]?.id;
    const targetEl = currentProject.elements.find((el) => el.id === targetId);
    if (!targetEl) {
      showToast(`Copied "${glyph}" to clipboard`);
      return;
    }

    pushUndoSnapshot(currentProject);
    const start =
      lastTextCursorRef.current?.elementId === targetId
        ? lastTextCursorRef.current.start
        : targetEl.text.length;
    const end =
      lastTextCursorRef.current?.elementId === targetId
        ? lastTextCursorRef.current.end
        : targetEl.text.length;
    const nextText = targetEl.text.slice(0, start) + glyph + targetEl.text.slice(end);
    handleUpdateElement(targetId, nextText);
    const nextPos = start + glyph.length;
    lastTextCursorRef.current = { elementId: targetId, start: nextPos, end: nextPos };
    setFocusedElementId(targetId);
  };

  const handleReplaceAllInScript = (
    findText: string,
    replaceText: string,
    caseSensitive: boolean,
    wholeWord: boolean
  ): number => {
    if (!findText) return 0;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      wholeWord ? `\\b${escaped}\\b` : escaped,
      caseSensitive ? 'g' : 'gi'
    );
    let touchedCount = 0;
    pushUndoSnapshot(currentProject);
    updateCurrentProject((proj) => {
      const nextElements = proj.elements.map((el) => {
        regex.lastIndex = 0;
        if (!regex.test(el.text)) return el;
        touchedCount += 1;
        regex.lastIndex = 0;
        return {
          ...el,
          text: el.text.replace(regex, replaceText),
          lastEditedAt: new Date().toISOString(),
        };
      });
      return { ...proj, elements: nextElements, lastModified: 'Just now' };
    });
    return touchedCount;
  };

  const handleRenameCharacterGlobal = (oldName: string, newName: string) => {
    const oldUpper = oldName.trim().toUpperCase();
    const newUpper = newName.trim().toUpperCase();
    if (!oldUpper || !newUpper || oldUpper === newUpper) return;

    pushUndoSnapshot(currentProject);
    updateCurrentProject((proj) => {
      const updatedElements = proj.elements.map((el) => {
        let next = el;
        if (el.type === 'CHARACTER') {
          const base = el.text.replace(/\s*\([^)]*\)$/, '').trim().toUpperCase();
          if (base === oldUpper) {
            const suffix = el.text.match(/\s*\([^)]*\)$/)?.[0] || '';
            next = { ...el, text: `${newUpper}${suffix}` };
          }
        }
        if ((el.character || '').trim().toUpperCase() === oldUpper) {
          next = { ...next, character: newUpper };
        }
        return next;
      });

      const updatedScenes = proj.scenes.map((sc) => ({
        ...sc,
        characters: Array.from(
          new Set(
            sc.characters.map((c) =>
              c.trim().toUpperCase() === oldUpper ? newUpper : c
            )
          )
        ),
      }));

      const updatedChars = proj.characters.map((c) =>
        c.name.trim().toUpperCase() === oldUpper ? { ...c, name: newUpper } : c
      );

      const updatedTags = proj.tags.map((t) =>
        t.category === 'character' && t.name.trim().toUpperCase() === oldUpper
          ? { ...t, name: newUpper }
          : t
      );

      const updatedBreakdowns = (proj.characterBreakdowns || []).map((cb) =>
        cb.characterName.trim().toUpperCase() === oldUpper
          ? { ...cb, characterName: newUpper }
          : cb
      );

      const updatedBios = (proj.projectBible?.characterBios || []).map((bio) =>
        bio.characterName.trim().toUpperCase() === oldUpper
          ? { ...bio, characterName: newUpper }
          : bio
      );

      return {
        ...proj,
        elements: updatedElements,
        scenes: updatedScenes,
        characters: updatedChars,
        tags: updatedTags,
        characterBreakdowns: updatedBreakdowns,
        projectBible: proj.projectBible
          ? { ...proj.projectBible, characterBios: updatedBios }
          : undefined,
        lastModified: 'Just now',
      };
    });
    showToast(`Renamed "${oldUpper}" to "${newUpper}" across script`);
  };

  const handleAddCharacterGlobal = (payload: {
    name: string;
    role: 'Lead' | 'Supporting' | 'Antagonist' | 'Featured' | 'Ensemble';
    color: string;
    bio: string;
    insertCueInScript: boolean;
  }) => {
    const cleanName = payload.name.trim().toUpperCase();
    if (!cleanName) return;

    pushUndoSnapshot(currentProject);
    updateCurrentProject((proj) => {
      const exists = proj.characters.some(
        (c) => c.name.trim().toUpperCase() === cleanName
      );
      const nextCharacters = exists
        ? proj.characters
        : [
            ...proj.characters,
            {
              name: cleanName,
              color: payload.color,
              scenesCount: selectedSceneId ? 1 : 0,
              speakingLines: payload.insertCueInScript ? 1 : 0,
            },
          ];

      const existingBios = proj.projectBible?.characterBios || [];
      const hasBio = existingBios.some(
        (b) => b.characterName.trim().toUpperCase() === cleanName
      );
      const nextBios = hasBio
        ? existingBios
        : [
            ...existingBios,
            {
              id: `bio-${Date.now()}`,
              characterName: cleanName,
              roleType: payload.role || 'Supporting',
              loglineSummary: payload.bio || 'Added from Edit menu.',
              backstory: payload.bio || '',
              arcStartToEnd: '',
              coreFlawOrTension: '',
            },
          ];

      let nextElements = proj.elements;
      if (payload.insertCueInScript) {
        const anchorId =
          focusedElementId || proj.elements[proj.elements.length - 1]?.id;
        const idx = proj.elements.findIndex((el) => el.id === anchorId);
        const sceneId =
          proj.elements[Math.max(0, idx)]?.sceneId ||
          selectedSceneId ||
          proj.scenes[0]?.id;
        const newCue: ScreenplayElement = {
          id: `el-char-${Date.now()}`,
          type: 'CHARACTER',
          text: cleanName,
          sceneId,
          lastEditedAt: new Date().toISOString(),
        };
        nextElements = [...proj.elements];
        nextElements.splice(idx >= 0 ? idx + 1 : nextElements.length, 0, newCue);
      }

      const prevBible = proj.projectBible || {
        logline: '',
        genre: 'Drama',
        formatLabel: 'Feature Screenplay',
        targetRuntime: '110 min',
        themes: [],
        pitchSummary: '',
        characterBios: [],
        pitchDocs: [],
        researchNotes: [],
      };

      return {
        ...proj,
        characters: nextCharacters,
        elements: nextElements,
        projectBible: {
          ...prevBible,
          characterBios: nextBios,
        },
        lastModified: 'Just now',
      };
    });
    showToast(`Added character "${cleanName}"`);
  };

  const handleEditCharacterGlobal = (payload: {
    originalName: string;
    name: string;
    role: 'Lead' | 'Supporting' | 'Antagonist' | 'Featured' | 'Ensemble';
    color: string;
    bio: string;
  }) => {
    const oldUpper = payload.originalName.trim().toUpperCase();
    const newUpper = payload.name.trim().toUpperCase();
    if (!newUpper) return;

    if (oldUpper && oldUpper !== newUpper) {
      handleRenameCharacterGlobal(oldUpper, newUpper);
    }

    updateCurrentProject((proj) => {
      const nextCharacters = proj.characters.map((c) =>
        c.name.trim().toUpperCase() === newUpper
          ? { ...c, color: payload.color }
          : c
      );
      const existingBios = proj.projectBible?.characterBios || [];
      const hasBio = existingBios.some(
        (b) => b.characterName.trim().toUpperCase() === newUpper
      );
      const nextBios = hasBio
        ? existingBios.map((b) =>
            b.characterName.trim().toUpperCase() === newUpper
              ? { ...b, roleType: payload.role, loglineSummary: payload.bio }
              : b
          )
        : [
            ...existingBios,
            {
              id: `bio-${Date.now()}`,
              characterName: newUpper,
              roleType: payload.role,
              loglineSummary: payload.bio,
              backstory: payload.bio,
              arcStartToEnd: '',
              coreFlawOrTension: '',
            },
          ];

      const prevBible = proj.projectBible || {
        logline: '',
        genre: 'Drama',
        formatLabel: 'Feature Screenplay',
        targetRuntime: '110 min',
        themes: [],
        pitchSummary: '',
        characterBios: [],
        pitchDocs: [],
        researchNotes: [],
      };

      return {
        ...proj,
        characters: nextCharacters,
        projectBible: {
          ...prevBible,
          characterBios: nextBios,
        },
        lastModified: 'Just now',
      };
    });
    showToast(`Updated character "${newUpper}"`);
  };

  const handleChangeAuthoringViewMode = (mode: AuthoringViewMode) => {
    setAuthoringViewMode(mode);
    if (mode === 'simple') {
      setIsLeftPanelCollapsed(true);
      setIsRightPanelCollapsed(true);
      showToast('Switched to Simple View (distraction-free)');
    } else if (mode === 'page') {
      setIsLeftPanelCollapsed(false);
      setIsRightPanelCollapsed(false);
      showToast('Switched to Page View (paginated sheets)');
    } else {
      setIsLeftPanelCollapsed(false);
      setIsRightPanelCollapsed(false);
      showToast('Switched to Normal View');
    }
  };

  const handleReopenCollaboratorSuggestion = (suggestionId: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      collaboratorSuggestions: (proj.collaboratorSuggestions || []).map((s) =>
        s.id === suggestionId ? { ...s, status: 'pending' } : s
      ),
    }));
  };

  const handleDeleteCollaboratorSuggestion = (suggestionId: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      collaboratorSuggestions: (proj.collaboratorSuggestions || []).filter(
        (s) => s.id !== suggestionId
      ),
    }));
  };

  const handleAddDayBreak = () => {
    const dayCount =
      currentProject.strips.filter((s) => s.type === 'day_break').length + 1;
    const newDayBreak: StripboardStrip = {
      id: `db-${Date.now()}`,
      type: 'day_break',
      bannerTitle: `START OF DAY ${dayCount}`,
      bannerDate: `Day ${dayCount}, Nov 2026`,
      bannerTotalPages: '4 2/8 PAGES',
      bannerFrom: '08:30',
      bannerTo: '19:30',
    };

    updateCurrentProject((proj) => ({
      ...proj,
      strips: [...proj.strips, newDayBreak],
    }));
    showToast(`Added Shooting Day ${dayCount} Break`);
  };

  // Cast & Crew Address Book Operations
  const handleAddCrewMember = (member: CastCrewMember) => {
    updateCurrentProject((proj) => ({
      ...proj,
      crewMembers: [member, ...(proj.crewMembers || [])],
    }));
    showToast(`Added ${member.name} to Cast & Crew Address Book`);
  };

  const handleUpdateCrewMember = (updated: CastCrewMember) => {
    updateCurrentProject((proj) => ({
      ...proj,
      crewMembers: (proj.crewMembers || []).map((m) =>
        m.id === updated.id ? updated : m
      ),
    }));
    showToast(`Updated profile for ${updated.name}`);
  };

  const handleDeleteCrewMember = (memberId: string) => {
    const target = (currentProject.crewMembers || []).find((m) => m.id === memberId);
    updateCurrentProject((proj) => ({
      ...proj,
      crewMembers: (proj.crewMembers || [])
        .filter((m) => m.id !== memberId)
        .map((m) => ({
          ...m,
          connections: m.connections.filter((c) => c.memberId !== memberId),
        })),
    }));
    if (target) {
      showToast(`Removed ${target.name} from Cast & Crew`);
    }
  };

  const handleAddCrewConnection = (
    sourceId: string,
    targetId: string,
    relationship: string,
    notes: string,
    reciprocal: boolean
  ) => {
    updateCurrentProject((proj) => {
      const members = proj.crewMembers || [];
      const updated = members.map((m) => {
        if (m.id === sourceId) {
          const filtered = m.connections.filter((c) => c.memberId !== targetId);
          return {
            ...m,
            connections: [
              ...filtered,
              { memberId: targetId, relationship, notes: notes || undefined },
            ],
          };
        }
        if (reciprocal && m.id === targetId) {
          const filtered = m.connections.filter((c) => c.memberId !== sourceId);
          return {
            ...m,
            connections: [
              ...filtered,
              { memberId: sourceId, relationship, notes: notes || undefined },
            ],
          };
        }
        return m;
      });
      return { ...proj, crewMembers: updated };
    });
    showToast('Connection linked in Address Book');
  };

  const handleRemoveCrewConnection = (sourceId: string, targetId: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      crewMembers: (proj.crewMembers || []).map((m) =>
        m.id === sourceId
          ? { ...m, connections: m.connections.filter((c) => c.memberId !== targetId) }
          : m
      ),
    }));
  };

  const handleImportScriptCast = () => {
    const existing = currentProject.crewMembers || [];
    const existingChars = new Set(
      existing
        .filter((m) => m.characterName)
        .map((m) => m.characterName!.trim().toUpperCase())
    );
    const missingChars = currentProject.characters.filter(
      (c) => !existingChars.has(c.name.trim().toUpperCase())
    );
    if (missingChars.length === 0) return;

    const created: CastCrewMember[] = missingChars.map((ch, idx) => {
      const matchedSceneIds = currentProject.scenes
        .filter((sc) =>
          sc.characters.some((c) => c.trim().toUpperCase() === ch.name.trim().toUpperCase())
        )
        .map((sc) => sc.id);

      const displayName =
        ch.actor && ch.actor.trim()
          ? ch.actor.trim()
          : ch.name
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        id: `cm-sync-${Date.now()}-${idx}`,
        name: displayName,
        category: 'cast',
        department: 'Cast / Principal',
        role: `Cast — ${ch.name}`,
        characterName: ch.name.toUpperCase(),
        unionStatus: 'SAG-AFTRA',
        email: `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@cast.example`,
        phone: 'Pending',
        preferredContact: 'Phone',
        payRate: 1000,
        payBasis: 'Daily',
        currency: 'USD',
        paymentStatus: 'Pending Deal Memo',
        callTime: '07:00',
        wrapTime: '19:00',
        scheduledDays: ['Day 1'],
        linkedSceneIds: matchedSceneIds,
        availabilityStatus: 'Tentative',
        scheduleNotes: `Synced from script (${ch.scenesCount} scenes, ${ch.speakingLines} lines).`,
        connections: [],
      };
    });

    updateCurrentProject((proj) => ({
      ...proj,
      crewMembers: [...created, ...(proj.crewMembers || [])],
    }));
    showToast(`Imported ${created.length} script cast member(s) into Address Book`);
  };

  const handleAddMealBreak = () => {
    const newMeal: StripboardStrip = {
      id: `meal-${Date.now()}`,
      type: 'banner',
      bannerTitle: 'lunch and move to Stage B',
      bannerFrom: '13:00',
      bannerTo: '14:00',
      scheduledDuration: '01:00',
    };

    updateCurrentProject((proj) => ({
      ...proj,
      strips: [...proj.strips, newMeal],
    }));
    showToast('Added Lunch & Move Banner');
  };

  // Shooting Locations Operations
  const handleUpdateLocations = (locations: ShootLocation[]) => {
    updateCurrentProject((proj) => ({
      ...proj,
      locations,
    }));
  };

  // Character Breakdown Operations
  const handleUpdateCharacterBreakdown = (override: CharacterBreakdownOverride) => {
    const normalized = override.characterName.trim().toUpperCase();
    updateCurrentProject((proj) => {
      const existing = proj.characterBreakdowns || [];
      const found = existing.some(
        (item) => item.characterName.trim().toUpperCase() === normalized
      );
      const next = found
        ? existing.map((item) =>
            item.characterName.trim().toUpperCase() === normalized
              ? { ...override, characterName: normalized }
              : item
          )
        : [...existing, { ...override, characterName: normalized }];
      return {
        ...proj,
        characterBreakdowns: next,
      };
    });
  };

  const handleResetCharacterBreakdown = (characterName: string) => {
    const normalized = characterName.trim().toUpperCase();
    updateCurrentProject((proj) => ({
      ...proj,
      characterBreakdowns: (proj.characterBreakdowns || []).filter(
        (item) => item.characterName.trim().toUpperCase() !== normalized
      ),
    }));
    showToast(`Regenerated breakdown for ${normalized} from script tags`);
  };

  const handleCreateCharacterTag = (name: string, sceneIds: string[]) => {
    const normalized = name.trim().toUpperCase();
    if (!normalized) return;

    const alreadyTagged = currentProject.tags.some(
      (t) => t.category === 'character' && t.name.trim().toUpperCase() === normalized
    );
    if (alreadyTagged) {
      showToast(`${normalized} is already tagged in the script`);
      return;
    }

    const matchedChar = currentProject.characters.find(
      (c) => c.name.trim().toUpperCase() === normalized
    );
    const palette = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];
    const color =
      matchedChar?.color ||
      palette[currentProject.tags.length % palette.length];

    const newTag: Tag = {
      id: `tag-char-${Date.now()}`,
      name: normalized,
      category: 'character',
      color,
      sceneIds,
      count: Math.max(1, sceneIds.length),
    };

    updateCurrentProject((proj) => ({
      ...proj,
      tags: [...proj.tags, newTag],
    }));
    showToast(`Tagged character "${normalized}" across ${sceneIds.length} scene(s)`);
  };

  const uniqueLocationCount = React.useMemo(() => {
    const keys = new Set<string>();
    currentProject.scenes.forEach((sc) => {
      const name = (sc.location || sc.setting || '').trim().toLowerCase();
      if (name) keys.add(name);
    });
    (currentProject.locations || []).forEach((loc) => {
      const name = loc.name.trim().toLowerCase();
      if (name) keys.add(name);
    });
    return keys.size;
  }, [currentProject.scenes, currentProject.locations]);

  // Recalculate 1/8th page counts & Hollywood eighths
  const handleRecalculate = () => {
    updateCurrentProject((proj) => {
      let cumulativeSec = 0;
      const updatedScenes = proj.scenes.map((scene, idx) => {
        const sceneElements = proj.elements.filter((el) => el.sceneId === scene.id);
        const lineCount = Math.max(
          5,
          sceneElements.reduce((acc, el) => acc + Math.ceil(el.text.length / 50), 0)
        );
        const eighths = Math.max(1, Math.round((lineCount / 55) * 8));
        const whole = Math.floor(eighths / 8);
        const rem = eighths % 8;
        const pagesStr =
          whole === 0 ? `${rem}/8` : rem === 0 ? `${whole}` : `${whole} ${rem}/8`;
        const dur = Math.max(20, Math.round((eighths / 8) * 60));

        const hrs = Math.floor(cumulativeSec / 3600);
        const mins = Math.floor((cumulativeSec % 3600) / 60);
        const secs = cumulativeSec % 60;
        const timecode = `${hrs.toString().padStart(2, '0')}:${mins
          .toString()
          .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        cumulativeSec += dur;
        return {
          ...scene,
          eighths,
          pages: pagesStr,
          durationSec: dur,
          timecode,
        };
      });

      return { ...proj, scenes: updatedScenes };
    });
    showToast('Hollywood 1/8th page counts & running time recalculation complete');
  };

  // Storyboard Handlers
  const handleUpdateStoryboards = (newStoryboards: StoryboardFrame[]) => {
    updateCurrentProject((p) => ({
      ...p,
      storyboards: newStoryboards,
      lastModified: 'Just now',
    }));
  };

  const handleQuickAddStoryboardFrame = (sceneId: string) => {
    const currentBoards = currentProject.storyboards || [];
    const sceneBoards = currentBoards.filter((b) => b.sceneId === sceneId);
    const targetScene = currentProject.scenes.find((s) => s.id === sceneId);
    const count = sceneBoards.length + 1;
    const newNumber = `${targetScene?.sceneNumber || 1}${String.fromCharCode(64 + Math.min(26, count))}`;
    const newFrame: StoryboardFrame = {
      id: `sb-${Date.now()}`,
      sceneId,
      shotNumber: newNumber,
      shotType: 'Medium Shot (MS)',
      cameraMovement: 'Static / Locked Off',
      lens: '50mm Cine',
      aspectRatio: '16:9',
      description: `Camera framing for ${targetScene?.heading || 'scene'}.`,
      durationSec: 4.0,
    };
    handleUpdateStoryboards([...currentBoards, newFrame]);
    setActiveWorkspace('storyboard');
    showToast(`Added Shot ${newNumber} to Storyboard`);
  };

  const handleAddStoryboardImageForScene = (
    sceneId: string,
    imageUrl: string,
    description: string
  ) => {
    const currentBoards = currentProject.storyboards || [];
    const sceneBoards = currentBoards.filter((b) => b.sceneId === sceneId);
    const targetScene = currentProject.scenes.find((s) => s.id === sceneId);
    const count = sceneBoards.length + 1;
    const newNumber = `${targetScene?.sceneNumber || 1}${String.fromCharCode(64 + Math.min(26, count))}`;
    const newFrame: StoryboardFrame = {
      id: `sb-av-${Date.now()}`,
      sceneId,
      shotNumber: newNumber,
      shotType: 'Medium Shot (MS)',
      cameraMovement: 'Static / Locked Off',
      lens: '35mm Cine',
      aspectRatio: '16:9',
      description,
      imageUrl,
      durationSec: 4.0,
    };
    handleUpdateStoryboards([...currentBoards, newFrame]);
    showToast(`Attached storyboard plate (Shot ${newNumber}) to A/V script`);
  };

  const handleRecordGeneratedSidecar = (entry: NLEGeneratedSidecarEntry) => {
    updateCurrentProject((proj) => ({
      ...proj,
      generatedMetadataLog: [entry, ...(proj.generatedMetadataLog || [])].slice(0, 100),
    }));
  };

  const handleClearGeneratedMetadataLog = () => {
    updateCurrentProject((proj) => ({
      ...proj,
      generatedMetadataLog: [],
    }));
    showToast('Cleared generated NLE metadata log');
  };

  const handleAcknowledgeContinuity = (alertId: string) => {
    updateCurrentProject((proj) => {
      const existing = new Set(proj.acknowledgedContinuityIds || []);
      existing.add(alertId);
      return {
        ...proj,
        acknowledgedContinuityIds: Array.from(existing),
      };
    });
    showToast('Continuity alert dismissed');
  };

  const handleRestoreContinuity = (alertId: string) => {
    updateCurrentProject((proj) => ({
      ...proj,
      acknowledgedContinuityIds: (proj.acknowledgedContinuityIds || []).filter(
        (id) => id !== alertId
      ),
    }));
    showToast('Continuity alert restored');
  };

  const handleJumpToContinuityOccurrence = (sceneId: string, elementId?: string) => {
    setSelectedSceneId(sceneId);
    if (elementId) {
      setFocusedElementId(elementId);
      const matched = currentProject.elements.find((e) => e.id === elementId);
      if (matched) setCurrentElementType(matched.type);
    }
    setActiveWorkspace('authoring');
    setIsRightPanelCollapsed(false);
    setInspectorRequestedTab({ tab: 'continuity', nonce: Date.now() });
  };

  // Export handlers
  const handleExport = async (
    format: 'pdf' | 'fdx' | 'fountain' | 'json' | 'csv' | 'rust_zip'
  ) => {
    if (format === 'rust_zip') {
      try {
        const blob = await generateRustDesktopZip(currentProject);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screencraft-desktop-rust-${currentProject.id}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Rust & Tauri desktop bundle downloaded (.zip)');
      } catch (e) {
        console.error(e);
      }
    } else {
      setAutoPrintOnExport(false);
      setInitialExportFormat(format);
      setIsExportOpen(true);
    }
  };

  // File menu & local .sccrft handlers
  const handleTriggerOpenFromDevice = () => {
    if (deviceFileInputRef.current) {
      deviceFileInputRef.current.value = '';
      deviceFileInputRef.current.click();
    }
  };

  const handleDeviceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const openedProject = parseOpenedDocumentFile(file.name, content);
      setProjects((prev) => {
        const existsIdx = prev.findIndex((p) => p.id === openedProject.id);
        if (existsIdx >= 0) {
          return prev.map((p) => (p.id === openedProject.id ? openedProject : p));
        }
        return [openedProject, ...prev];
      });
      setCurrentProjectId(openedProject.id);
      setSelectedSceneId(openedProject.scenes[0]?.id || null);
      setFocusedElementId(openedProject.elements[0]?.id || null);
      setActiveWorkspace('authoring');
      showToast(`Opened "${openedProject.title}" (${file.name})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not open selected file.';
      showToast(msg);
    }
  };

  const handleSaveSccrft = async () => {
    saveProjectState(false);
    const res = await saveSccrftLocally(currentProject, { saveAs: false });
    if (res.status === 'saved') {
      showToast(`Saved local file ${res.fileName}`);
    }
  };

  const handleSaveAsSccrft = async () => {
    const res = await saveSccrftLocally(currentProject, { saveAs: true });
    if (res.status === 'saved') {
      saveProjectState(true);
      showToast(`Saved as ${res.fileName}`);
    } else if (res.status === 'needs_save_as_dialog') {
      setSaveAsFileName(res.suggestedFileName);
      setIsSaveAsModalOpen(true);
    }
  };

  const handleConfirmSaveAsModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = normalizeSccrftFileName(
      saveAsFileName || getSanitizedSccrftFileName(currentProject.title)
    );
    const res = await saveSccrftLocally(currentProject, { customFileName: finalName });
    setIsSaveAsModalOpen(false);
    saveProjectState(true);
    if (res.status === 'saved') {
      showToast(`Saved as ${res.fileName}`);
    }
  };

  const handleOpenSaveAsTemplateModal = () => {
    const cat = currentProject.documentCategory;
    const defaultCat: UserTemplateCategory =
      cat === 'stage' || cat === 'book' || cat === 'television' ? cat : 'film';
    setTemplateNameInput(`${currentProject.title} Template`);
    setTemplateCategoryInput(defaultCat);
    setTemplateDescInput('');
    setIsSaveTemplateModalOpen(true);
  };

  const handleConfirmSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const next = saveProjectAsUserTemplate(currentProject, {
      name: templateNameInput.trim() || `${currentProject.title} Template`,
      category: templateCategoryInput,
      description: templateDescInput,
    });
    setUserTemplates(next);
    setIsSaveTemplateModalOpen(false);
    showToast(`Saved template "${templateNameInput.trim() || currentProject.title}"`);
  };

  const handleCreateFromUserTemplate = (
    tpl: UserDocumentTemplate,
    options?: { title?: string; author?: string }
  ) => {
    const newProj = instantiateProjectFromUserTemplate(tpl, options);
    setProjects((prev) => [newProj, ...prev]);
    setCurrentProjectId(newProj.id);
    setSelectedSceneId(newProj.scenes[0]?.id || null);
    setFocusedElementId(newProj.elements[0]?.id || null);
    setActiveWorkspace('authoring');
    showToast(`Created from template: ${newProj.title}`);
  };

  const handleDeleteUserTemplate = (templateId: string) => {
    setUserTemplates(deleteUserTemplate(templateId));
    showToast('Removed saved template');
  };

  const handlePrintPreview = () => {
    setAutoPrintOnExport(false);
    setInitialExportFormat('pdf');
    setIsExportOpen(true);
  };

  const handlePrintDocument = () => {
    const res = printScreenplayDocument(
      currentProject,
      {
        includeTitlePage: true,
        includeSceneNumbers: true,
        includePageNumbers: true,
      },
      true
    );
    if (res.printed) {
      showToast('Print dialog opened for screenplay');
    } else {
      showToast(
        `Print blocked by preview frame — downloaded ${
          res.fallbackPdfFilename || 'screenplay.pdf'
        } for printing`
      );
    }
  };

  const handleCloseDocument = () => {
    saveProjectState(true);
    setActiveWorkspace('projects');
    showToast('Document closed — returned to Home');
  };

  const handleCreateFromDocumentTemplate = (
    kind: DocumentTemplateKind,
    options?: { title?: string; author?: string }
  ) => {
    const newProj = createProjectFromDocumentTemplate(kind, options);
    setProjects((prev) => [newProj, ...prev]);
    setCurrentProjectId(newProj.id);
    setSelectedSceneId(newProj.scenes[0]?.id || null);
    setFocusedElementId(newProj.elements[0]?.id || null);
    setActiveWorkspace('authoring');
    showToast(`Created ${kind.toUpperCase()} document: ${newProj.title}`);
  };

  const handleCreateNewProduction = (options: {
    title: string;
    author: string;
    startDate: string;
    shootDays: number;
  }) => {
    const newProj = createNewProductionProject(options);
    setProjects((prev) => [newProj, ...prev]);
    setCurrentProjectId(newProj.id);
    setSelectedSceneId(newProj.scenes[0]?.id || null);
    setProductionRequestedTab({ tab: 'stripboard', nonce: Date.now() });
    setActiveWorkspace('production');
    showToast(`Created production "${newProj.title}"`);
  };

  const handleImportProductionFromProject = (options: {
    sourceProjectId: string;
    targetProjectId: string | 'new';
    newTitle: string;
    parts: {
      strips: boolean;
      crew: boolean;
      locations: boolean;
      tags: boolean;
      storyboards: boolean;
    };
  }) => {
    const source = projects.find((p) => p.id === options.sourceProjectId);
    if (!source) return;
    const target =
      options.targetProjectId === 'new'
        ? null
        : projects.find((p) => p.id === options.targetProjectId) || null;

    const result = cloneProductionAssetsFromProject(
      source,
      target,
      options.parts,
      options.newTitle
    );

    if (result.isNew) {
      setProjects((prev) => [result.project, ...prev]);
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === result.project.id ? result.project : p))
      );
    }

    setCurrentProjectId(result.project.id);
    setSelectedSceneId(result.project.scenes[0]?.id || null);
    setProductionRequestedTab({ tab: 'stripboard', nonce: Date.now() });
    setActiveWorkspace('production');
    showToast(`Imported production assets from "${source.title}"`);
  };

  const handleCreateNewProductionSchedule = (options: {
    sourceProjectId: string | 'blank';
    title: string;
    startDate: string;
    daysCount: number;
    callTime: string;
    wrapTime: string;
  }) => {
    if (options.sourceProjectId === 'blank') {
      const newProj = createNewProductionProject({
        title: options.title || 'New Shooting Schedule',
        startDate: options.startDate,
        shootDays: options.daysCount,
      });
      setProjects((prev) => [newProj, ...prev]);
      setCurrentProjectId(newProj.id);
      setSelectedSceneId(newProj.scenes[0]?.id || null);
      setProductionRequestedTab({ tab: 'stripboard', nonce: Date.now() });
      setActiveWorkspace('production');
      showToast(`Created ${options.daysCount}-day schedule: "${newProj.title}"`);
      return;
    }

    const existing = projects.find((p) => p.id === options.sourceProjectId);
    if (!existing) return;

    const newStrips = generateNewProductionScheduleStrips(existing.scenes, {
      startDate: options.startDate,
      daysCount: options.daysCount,
      callTime: options.callTime,
      wrapTime: options.wrapTime,
    });

    setProjects((prev) =>
      prev.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              lastModified: 'Schedule created just now',
              strips: newStrips,
            }
          : p
      )
    );
    setCurrentProjectId(existing.id);
    setSelectedSceneId(existing.scenes[0]?.id || null);
    setProductionRequestedTab({ tab: 'stripboard', nonce: Date.now() });
    setActiveWorkspace('production');
    showToast(`Generated ${options.daysCount}-day production schedule for "${existing.title}"`);
  };

  const handleImportFountain = () => {
    if (!importText.trim()) return;
    const parsed = parseFountain(importText);
    const importedProject: StoryProject = {
      id: `import-${Date.now()}`,
      title: 'Imported Screenplay',
      author: 'Jeffrey (Online)',
      lastModified: 'Imported today',
      scenes: parsed.scenes,
      elements: parsed.elements,
      tags: [],
      comments: [],
      strips: parsed.scenes.map((sc) => ({
        id: `strip-${sc.id}`,
        type: 'scene',
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        intExt: sc.intExt,
        dayNight: sc.dayNight,
        set: sc.setting,
        runningTime: sc.timecode,
        pages: sc.pages,
        eighths: sc.eighths,
        storyDay: sc.storyDay,
        scheduledDuration: '01:30',
        characters: sc.characters,
        timeOfDay: sc.timeOfDay,
      })),
      characters: Array.from(
        new Set(
          parsed.elements
            .filter((e) => e.type === 'CHARACTER')
            .map((e) => (e.character || e.text.replace(/\s*\([^)]*\)$/, '')).trim())
            .filter(Boolean)
        )
      ).map((name, i) => ({
        name,
        color: ['#00d2d3', '#ff6b6b', '#feca57', '#54a0ff', '#1dd1a1'][i % 5],
        scenesCount: parsed.scenes.filter((s) => s.characters.includes(name)).length,
        speakingLines: parsed.elements.filter(
          (e) =>
            e.type === 'CHARACTER' &&
            (e.character || e.text.replace(/\s*\([^)]*\)$/, '')).trim() === name
        ).length,
      })),
    };

    setProjects([importedProject, ...projects]);
    setCurrentProjectId(importedProject.id);
    setSelectedSceneId(importedProject.scenes[0]?.id || null);
    setActiveWorkspace('authoring');
    setIsImportOpen(false);
    setImportText('');
    showToast('Fountain script imported successfully!');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#222222] text-gray-200 font-sans select-none print:h-auto print:w-auto print:overflow-visible print:bg-white print:text-black">
      {/* Google Maps Platform Quota Notice (Demo Key Case A) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-[#ff7700] text-black font-semibold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="no-print flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top Application Header */}
      <TopHeader
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        projectTitle={currentProject.title}
        onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
        pendingCollaborationCount={pendingCollaborationCount}
        onOpenHelp={() => {
          setHelpInitialCategory('all');
          setHelpInitialToolId(undefined);
          setIsHelpGuideOpen(true);
        }}
      />

      {/* Menu Bar with Working Menus */}
      <MenuBar
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        onExport={handleExport}
        onNewDocument={(kind) => {
          if (kind) {
            handleCreateFromDocumentTemplate(kind);
          } else {
            setActiveWorkspace('projects');
          }
        }}
        onOpenFromDevice={handleTriggerOpenFromDevice}
        onSave={handleSaveSccrft}
        onSaveAs={handleSaveAsSccrft}
        onSaveAsTemplate={handleOpenSaveAsTemplateModal}
        onPrintPreview={handlePrintPreview}
        onPrint={handlePrintDocument}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onCloseDocument={handleCloseDocument}
        onOpenReports={() => setIsReportsOpen(true)}
        onAddElement={(type) =>
          handleAddElementAfter(
            focusedElementId ||
              currentProject.elements[currentProject.elements.length - 1]?.id ||
              'root',
            type
          )
        }
        onRecalculate={handleRecalculate}
        onAddDayBreak={handleAddDayBreak}
        onAddComment={() => handleAddComment('Review note added from menu')}
        onOpenCastCrew={() => {
          setProductionRequestedTab({ tab: 'cast_crew', nonce: Date.now() });
          setActiveWorkspace('production');
        }}
        onOpenCharacterBreakdown={() => {
          setCharactersInitialSubView('details');
          setActiveWorkspace('characters');
        }}
        onOpenCallSheet={() => {
          setCallSheetDayNumber(null);
          setProductionRequestedTab({ tab: 'call_sheet', nonce: Date.now() });
          setActiveWorkspace('production');
        }}
        onOpenLocationMap={() => {
          setProductionRequestedTab({ tab: 'location_map', nonce: Date.now() });
          setActiveWorkspace('production');
        }}
        onOpenNLEPipeline={() => setIsNLEPipelineOpen(true)}
        onOpenRevisionImpact={() => setIsRevisionImpactOpen(true)}
        onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
        onOpenContinuityCheck={() => setIsContinuityModalOpen(true)}
        continuityAlertCount={continuityReport.summary.totalActive}
        onOpenHelpGuide={(category = 'all', toolId) => {
          setHelpInitialCategory(category);
          setHelpInitialToolId(toolId);
          setIsHelpGuideOpen(true);
        }}
        onSelectAll={handleSelectAllElements}
        onSelectScene={handleSelectSceneElements}
        onCut={handleCutSelection}
        onCopy={handleCopySelection}
        onPaste={() => void handlePasteSelection()}
        onDeleteSelection={handleDeleteSelection}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenGoTo={() => setIsGoToOpen(true)}
        onOpenFind={() => setIsFindOpen(true)}
        onRenameCharacter={() => setCharacterModalMode('rename')}
        onAddCharacter={() => setCharacterModalMode('add')}
        onEditCharacter={() => setCharacterModalMode('edit')}
        isTrackChangesEnabled={isTrackChangesEnabled}
        onToggleTrackChanges={handleToggleTrackChanges}
        onAcceptChange={handleAcceptActiveChange}
        onRejectChange={handleRejectActiveChange}
        onPreviousChange={() => handleNavigateChange(-1)}
        onNextChange={() => handleNavigateChange(1)}
        pendingTrackChangesCount={pendingTrackChanges.length}
        onOpenEmojiSymbols={() => setIsEmojiSymbolsOpen(true)}
        authoringViewMode={authoringViewMode}
        onChangeAuthoringViewMode={handleChangeAuthoringViewMode}
      />

      {/* Formatting Ribbon Toolbar (Authoring Workspace) */}
      {activeWorkspace === 'authoring' && (
        <FormattingToolbar
          activeWorkspace={activeWorkspace}
          currentElementType={currentElementType}
          onChangeElementType={(type) => {
            setCurrentElementType(type);
            const targetId =
              (focusedElementId &&
                currentProject.elements.some((el) => el.id === focusedElementId) &&
                focusedElementId) ||
              currentProject.elements[currentProject.elements.length - 1]?.id;
            if (targetId) {
              handleUpdateElementType(targetId, type);
            }
          }}
          effectiveFormatting={effectiveFormatting}
          editorTypography={projectTypography}
          onToggleBold={() => {
            if (activeTargetElement) {
              handleUpdateElementFormatting(activeTargetElement.id, {
                bold: !effectiveFormatting.bold,
              });
            }
          }}
          onToggleItalic={() => {
            if (activeTargetElement) {
              handleUpdateElementFormatting(activeTargetElement.id, {
                italic: !effectiveFormatting.italic,
              });
            }
          }}
          onToggleUnderline={() => {
            if (activeTargetElement) {
              handleUpdateElementFormatting(activeTargetElement.id, {
                underline: !effectiveFormatting.underline,
              });
            }
          }}
          onToggleStrikethrough={() => {
            if (activeTargetElement) {
              handleUpdateElementFormatting(activeTargetElement.id, {
                strikethrough: !effectiveFormatting.strikethrough,
              });
            }
          }}
          onSetHighlight={(color) => {
            if (activeTargetElement) {
              handleUpdateElementFormatting(activeTargetElement.id, { highlight: color });
            }
          }}
          onSetAlign={(align) => {
            if (activeTargetElement) {
              handleUpdateElementFormatting(activeTargetElement.id, { align });
            }
          }}
          onChangeFontFamily={(fontFamily) => handleUpdateProjectTypography({ fontFamily })}
          onChangeFontSize={(fontSizePt) => handleUpdateProjectTypography({ fontSizePt })}
          onChangeLineSpacing={(lineSpacing) => handleUpdateProjectTypography({ lineSpacing })}
          onChangePageLayout={(pageLayout) => handleUpdateProjectTypography({ pageLayout })}
          onOpenSpellCheck={() => {
            setIsRightPanelCollapsed(false);
            setInspectorRequestedTab({ tab: 'proofread', subMode: 'spelling', nonce: Date.now() });
          }}
          onOpenGrammarCheck={() => {
            setIsRightPanelCollapsed(false);
            setInspectorRequestedTab({ tab: 'proofread', subMode: 'grammar', nonce: Date.now() });
          }}
          onOpenDraftRevisions={() => {
            setIsRightPanelCollapsed(false);
            setInspectorRequestedTab({ tab: 'history', nonce: Date.now() });
          }}
          onOpenCharacterInfo={() => {
            setIsRightPanelCollapsed(false);
            setInspectorRequestedTab({ tab: 'characters', nonce: Date.now() });
          }}
          proofreadCounts={{
            spelling: proofreadReport.spellingCount,
            grammar: proofreadReport.grammarCount,
          }}
          onOpenElementsPopup={() => setElementsPopupTriggerNonce((n) => n + 1)}
          documentTitle={currentProject.title}
          onRecalculate={handleRecalculate}
          onOpenReports={() => setIsReportsOpen(true)}
          onAddBreak={handleAddDayBreak}
          scriptFormat={currentProject.scriptFormat || 'single_column_film'}
          onChangeScriptFormat={handleChangeScriptFormat}
          onOpenNLEPipeline={() => setIsNLEPipelineOpen(true)}
          onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
          pendingSyncCount={revisionImpactReport.totalImpactedScenes}
          onOpenRevisionImpact={() => setIsRevisionImpactOpen(true)}
          continuityAlertCount={continuityReport.summary.totalActive}
          onOpenContinuityCheck={() => setIsContinuityModalOpen(true)}
          isRevisionPassMode={isRevisionPassMode}
          onToggleRevisionPassMode={() => setIsRevisionPassMode((prev) => !prev)}
          revisionPassCounts={revisionPassCounts}
          isLeftPanelCollapsed={isLeftPanelCollapsed}
          isRightPanelCollapsed={isRightPanelCollapsed}
          onToggleLeftPanel={() => setIsLeftPanelCollapsed((prev) => !prev)}
          onToggleRightPanel={() => setIsRightPanelCollapsed((prev) => !prev)}
          onToggleFocusCenter={() => {
            const bothCollapsed = isLeftPanelCollapsed && isRightPanelCollapsed;
            setIsLeftPanelCollapsed(!bothCollapsed);
            setIsRightPanelCollapsed(!bothCollapsed);
          }}
          isQuickNotesOpen={isQuickNotesOpen}
          onToggleQuickNotes={() => setIsQuickNotesOpen((prev) => !prev)}
          zoomLevel={zoomLevel}
          onChangeZoom={setZoomLevel}
        />
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Workspace 1 & 4: Authoring (Script Editor) OR Production Hub */}
        {(activeWorkspace === 'authoring' || activeWorkspace === 'production') && (
          <div className="flex flex-1 w-full h-full min-h-0">
            {/* Column 1: Left Navigation / Outline / Strip Properties */}
            <OutlineColumn
              scenes={currentProject.scenes}
              elements={currentProject.elements}
              selectedSceneId={selectedSceneId}
              onSelectScene={setSelectedSceneId}
              onUpdateScene={handleUpdateScene}
              characters={currentProject.characters}
              activeWorkspace={activeWorkspace}
              isCollapsed={isLeftPanelCollapsed}
              onToggleCollapse={() => setIsLeftPanelCollapsed((prev) => !prev)}
            />

            {activeWorkspace === 'authoring' ? (
              <>
                <div className="relative flex-1 flex min-w-0 min-h-0">
                  <ScreenplayEditor
                    elements={currentProject.elements}
                    scenes={currentProject.scenes}
                    comments={currentProject.comments}
                    tags={currentProject.tags}
                    characters={currentProject.characters}
                    storyboards={currentProject.storyboards || []}
                    revisions={currentProject.revisions || []}
                    isRevisionPassMode={isRevisionPassMode}
                    continuityAlertsByElementId={continuityReport.alertsByElementId}
                    collaborators={currentProject.collaborators || []}
                    collaboratorSuggestions={currentProject.collaboratorSuggestions || []}
                    onInspectSuggestion={(suggestionId) => {
                      setSelectedSuggestionId(suggestionId);
                      setActiveWorkspace('collaboration');
                    }}
                    focusedElementId={focusedElementId}
                    selectedElementIds={selectedElementIds}
                    onClearElementSelection={() => setSelectedElementIds([])}
                    authoringViewMode={authoringViewMode}
                    onInspectContinuityElement={(elId) => {
                      setFocusedElementId(elId);
                      setIsRightPanelCollapsed(false);
                      setInspectorRequestedTab({ tab: 'continuity', nonce: Date.now() });
                    }}
                    scriptFormat={currentProject.scriptFormat || 'single_column_film'}
                    onChangeScriptFormat={handleChangeScriptFormat}
                    editorTypography={projectTypography}
                    elementsPopupTriggerNonce={elementsPopupTriggerNonce}
                    onAddStoryboardImageForScene={handleAddStoryboardImageForScene}
                    onUpdateElement={handleUpdateElement}
                    onUpdateElementType={handleUpdateElementType}
                    onUpdateElementFormatting={handleUpdateElementFormatting}
                    onUpdateElementCharacter={handleUpdateElementCharacter}
                    onAddElementAfter={handleAddElementAfter}
                    onDeleteElement={handleDeleteElement}
                    onSelectScene={setSelectedSceneId}
                    onFocusElement={(el) => {
                      setFocusedElementId(el.id);
                      setCurrentElementType(el.type);
                    }}
                    onOpenComment={(id) => {
                      const comm = currentProject.comments.find((c) => c.id === id);
                      if (comm) showToast(`Comment by ${comm.author}: "${comm.text}"`);
                    }}
                    onAddCommentForElement={(elId) => {
                      const text = prompt('Enter review note for this element:');
                      if (text) handleAddComment(text, elId);
                    }}
                    zoomLevel={zoomLevel}
                  />

                  <QuickNotesSidebar
                    projectId={currentProject.id}
                    projectTitle={currentProject.title}
                    selectedScene={currentProject.scenes.find((s) => s.id === selectedSceneId)}
                    isOpen={isQuickNotesOpen}
                    onToggleOpen={() => setIsQuickNotesOpen((prev) => !prev)}
                    onSelectScene={setSelectedSceneId}
                    onPromoteToScript={(noteText, targetType) => {
                      const anchorId =
                        (focusedElementId &&
                          currentProject.elements.some((el) => el.id === focusedElementId) &&
                          focusedElementId) ||
                        currentProject.elements[currentProject.elements.length - 1]?.id ||
                        'root';
                      handleAddElementAfter(anchorId, targetType, noteText);
                      showToast('Inserted note into screenplay');
                    }}
                    onNotify={showToast}
                  />
                </div>

                <InspectorColumn
                  selectedScene={currentProject.scenes.find((s) => s.id === selectedSceneId)}
                  allScenes={currentProject.scenes}
                  elements={currentProject.elements}
                  comments={currentProject.comments}
                  tags={currentProject.tags}
                  characters={currentProject.characters}
                  characterBios={currentProject.projectBible?.characterBios || []}
                  characterBreakdowns={currentProject.characterBreakdowns || []}
                  storyboards={currentProject.storyboards || []}
                  revisions={currentProject.revisions || []}
                  activeDraftName={currentProject.activeDraftName}
                  activeDraftColor={currentProject.activeDraftColor}
                  customDictionary={currentProject.customDictionary || []}
                  onAddComment={(text) => handleAddComment(text)}
                  onResolveComment={handleResolveComment}
                  onDeleteComment={handleDeleteComment}
                  onAddTag={handleAddTag}
                  onUpdateTagImage={handleUpdateTagImage}
                  onUpdateScene={handleUpdateScene}
                  onOpenStoryboard={() => setActiveWorkspace('storyboard')}
                  onAddStoryboardFrame={handleQuickAddStoryboardFrame}
                  onRevertRevision={handleRevertRevision}
                  onCreateDraftMilestone={handleCreateDraftMilestone}
                  onApplyElementTextFix={handleApplyElementTextFix}
                  onAddToDictionary={handleAddToDictionary}
                  onJumpToElement={handleJumpToElement}
                  onOpenCharactersWorkspace={() => {
                    setCharactersInitialSubView('details');
                    setActiveWorkspace('characters');
                  }}
                  continuityReport={continuityReport}
                  onJumpToOccurrence={handleJumpToContinuityOccurrence}
                  onAcknowledgeContinuity={handleAcknowledgeContinuity}
                  onRestoreContinuity={handleRestoreContinuity}
                  onOpenContinuityModal={() => setIsContinuityModalOpen(true)}
                  requestedTab={inspectorRequestedTab}
                  isCollapsed={isRightPanelCollapsed}
                  onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)}
                />
              </>
            ) : (
              <ProductionWorkspace
                projects={projects}
                project={currentProject}
                requestedTab={productionRequestedTab}
                callSheetDayNumber={callSheetDayNumber}
                selectedSceneId={selectedSceneId}
                locationCount={uniqueLocationCount}
                pendingSyncCount={revisionImpactReport.totalImpactedScenes}
                onSelectScene={setSelectedSceneId}
                onJumpToAuthoringScene={(sceneId) => {
                  if (sceneId) setSelectedSceneId(sceneId);
                  setActiveWorkspace('authoring');
                }}
                onUpdateStrips={handleUpdateStrips}
                onAddDayBreak={handleAddDayBreak}
                onAddMealBreak={handleAddMealBreak}
                onAddCrewMember={handleAddCrewMember}
                onUpdateCrewMember={handleUpdateCrewMember}
                onDeleteCrewMember={handleDeleteCrewMember}
                onAddCrewConnection={handleAddCrewConnection}
                onRemoveCrewConnection={handleRemoveCrewConnection}
                onUpdateCharacterBreakdown={handleUpdateCharacterBreakdown}
                onResetCharacterBreakdown={handleResetCharacterBreakdown}
                onCreateCharacterTag={handleCreateCharacterTag}
                onUpdateCharacterRelationships={handleUpdateCharacterRelationships}
                onUpdateCharacterNodePositions={handleUpdateCharacterNodePositions}
                onUpdateCharacterEdgePositions={handleUpdateCharacterEdgePositions}
                onUpdateLocations={handleUpdateLocations}
                onUpdateEquipment={handleUpdateEquipmentManifest}
                onUpdateFinanceSettings={handleUpdateFinanceSettings}
                onRecalculateFinances={handleRecalculateFinances}
                onUpdateProjectBible={handleUpdateProjectBible}
                onUpdateStoryboards={handleUpdateStoryboards}
                onImportScriptCast={handleImportScriptCast}
                onOpenRevisionImpact={() => setIsRevisionImpactOpen(true)}
                onOpenNLEPipeline={() => setIsNLEPipelineOpen(true)}
                onOpenReports={() => setIsReportsOpen(true)}
                onNotify={showToast}
                rightInspector={
                  <InspectorColumn
                    selectedScene={currentProject.scenes.find((s) => s.id === selectedSceneId)}
                    allScenes={currentProject.scenes}
                    elements={currentProject.elements}
                    comments={currentProject.comments}
                    tags={currentProject.tags}
                    characters={currentProject.characters}
                    characterBios={currentProject.projectBible?.characterBios || []}
                    characterBreakdowns={currentProject.characterBreakdowns || []}
                    storyboards={currentProject.storyboards || []}
                    revisions={currentProject.revisions || []}
                    activeDraftName={currentProject.activeDraftName}
                    activeDraftColor={currentProject.activeDraftColor}
                    customDictionary={currentProject.customDictionary || []}
                    onAddComment={(text) => handleAddComment(text)}
                    onResolveComment={handleResolveComment}
                    onDeleteComment={handleDeleteComment}
                    onAddTag={handleAddTag}
                    onUpdateTagImage={handleUpdateTagImage}
                    onUpdateScene={handleUpdateScene}
                    onOpenStoryboard={() => setActiveWorkspace('storyboard')}
                    onAddStoryboardFrame={handleQuickAddStoryboardFrame}
                    onRevertRevision={handleRevertRevision}
                    onCreateDraftMilestone={handleCreateDraftMilestone}
                    onApplyElementTextFix={handleApplyElementTextFix}
                    onAddToDictionary={handleAddToDictionary}
                    onJumpToElement={handleJumpToElement}
                    onOpenCharactersWorkspace={() => {
                      setCharactersInitialSubView('details');
                      setActiveWorkspace('characters');
                    }}
                    continuityReport={continuityReport}
                    onJumpToOccurrence={handleJumpToContinuityOccurrence}
                    onAcknowledgeContinuity={handleAcknowledgeContinuity}
                    onRestoreContinuity={handleRestoreContinuity}
                    onOpenContinuityModal={() => setIsContinuityModalOpen(true)}
                    requestedTab={inspectorRequestedTab}
                    isCollapsed={isRightPanelCollapsed}
                    onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)}
                  />
                }
              />
            )}
          </div>
        )}

        {/* Workspace 2: Characters Workspace (Details, Bios & Draggable Node Connections) */}
        {activeWorkspace === 'characters' && (
          <CharactersWorkspace
            project={currentProject}
            initialSubView={charactersInitialSubView}
            onUpdateCharacters={handleUpdateCharacters}
            onUpdateCharacterBreakdown={handleUpdateCharacterBreakdown}
            onResetCharacterBreakdown={handleResetCharacterBreakdown}
            onUpdateProjectBible={handleUpdateProjectBible}
            onUpdateRelationships={handleUpdateCharacterRelationships}
            onUpdateNodePositions={handleUpdateCharacterNodePositions}
            onUpdateEdgePositions={handleUpdateCharacterEdgePositions}
            onCreateCharacterTag={handleCreateCharacterTag}
            onSelectScene={(sceneId) => {
              setSelectedSceneId(sceneId);
              setActiveWorkspace('authoring');
            }}
          />
        )}

        {/* Workspace 3: Outline & Beat Board */}
        {activeWorkspace === 'outline' && (
          <OutlineWorkspace
            project={currentProject}
            selectedSceneId={selectedSceneId}
            onSelectScene={setSelectedSceneId}
            onOpenSceneInAuthoring={(sceneId, elementId) => {
              setSelectedSceneId(sceneId);
              if (elementId) setFocusedElementId(elementId);
              setActiveWorkspace('authoring');
            }}
            onUpdateScene={handleUpdateScene}
            onReorderScene={handleReorderScene}
            onAddNewScene={handleAddNewScene}
          />
        )}

        {/* Legacy Project Bible container fallback */}
        {activeWorkspace === 'project_bible' && (
          <ProjectContainerView
            project={currentProject}
            onUpdateProjectBible={handleUpdateProjectBible}
            onUpdateRelationships={handleUpdateCharacterRelationships}
            onUpdateNodePositions={handleUpdateCharacterNodePositions}
            onSwitchScriptFormat={handleChangeScriptFormat}
            onOpenAuthoring={() => setActiveWorkspace('authoring')}
            onOpenStoryboard={() => setActiveWorkspace('storyboard')}
            onSelectScene={(sceneId) => {
              setSelectedSceneId(sceneId);
              setActiveWorkspace('authoring');
            }}
          />
        )}

        {/* Workspace 5: Storyboarding Suite */}
        {activeWorkspace === 'storyboard' && (
          <StoryboardWorkspace
            project={currentProject}
            scenes={currentProject.scenes}
            storyboards={currentProject.storyboards || []}
            onUpdateStoryboards={handleUpdateStoryboards}
            onSelectScene={(sceneId) => {
              setSelectedSceneId(sceneId);
              setActiveWorkspace('authoring');
            }}
          />
        )}

        {/* Workspace 6: Team Collaboration & Non-Destructive Color Redlines */}
        {activeWorkspace === 'collaboration' && (
          <CollaborationWorkspace
            project={currentProject}
            initialSelectedSuggestionId={selectedSuggestionId}
            onUpdateCollaborators={handleUpdateCollaborators}
            onAddSuggestion={handleAddCollaboratorSuggestion}
            onAcceptSuggestion={handleAcceptCollaboratorSuggestion}
            onRejectSuggestion={handleRejectCollaboratorSuggestion}
            onReopenSuggestion={handleReopenCollaboratorSuggestion}
            onDeleteSuggestion={handleDeleteCollaboratorSuggestion}
            onJumpToSceneElement={(sceneId, elementId) => {
              if (sceneId) setSelectedSceneId(sceneId);
              if (elementId) setFocusedElementId(elementId);
              setActiveWorkspace('authoring');
            }}
          />
        )}

        {/* Workspace 7: Dedicated Teleprompter Workspace */}
        {activeWorkspace === 'teleprompter' && (
          <TeleprompterWindow
            projects={projects}
            initialProjectId={currentProject.id}
            embedded={true}
          />
        )}

        {/* Home (Projects & Templates Launch Hub) */}
        {activeWorkspace === 'projects' && (
          <ProjectsBrowser
            projects={projects}
            currentProjectId={currentProjectId}
            userTemplates={userTemplates}
            onSelectProject={(id, workspace = 'authoring', subView = 'stripboard') => {
              setCurrentProjectId(id);
              setSelectedSceneId(null);
              setFocusedElementId(null);
              if (workspace === 'production') {
                const mappedTab: ProductionHubTab =
                  subView === 'cast_crew'
                    ? 'cast_crew'
                    : subView === 'location_map'
                    ? 'location_map'
                    : 'stripboard';
                setProductionRequestedTab({ tab: mappedTab, nonce: Date.now() });
              }
              setActiveWorkspace(workspace);
            }}
            onCreateFromDocumentTemplate={handleCreateFromDocumentTemplate}
            onCreateFromUserTemplate={handleCreateFromUserTemplate}
            onDeleteUserTemplate={handleDeleteUserTemplate}
            onOpenFromDevice={handleTriggerOpenFromDevice}
            onCreateNewProduction={handleCreateNewProduction}
            onImportProductionFromProject={handleImportProductionFromProject}
            onCreateNewProductionSchedule={handleCreateNewProductionSchedule}
            onOpenImportScriptModal={() => setIsImportOpen(true)}
          />
        )}
      </div>

      {/* Bottom Status Bar matching Adobe Story Screenshots */}
      <footer className="h-6 bg-[#181818] border-t border-[#333] px-3 flex items-center justify-between text-[11px] text-gray-400 select-none flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
              }`}
            ></span>
            <span className={isSaving ? 'text-amber-400 font-semibold' : 'text-gray-300'}>
              {isSaving ? 'Auto-saving...' : 'Document saved'}
            </span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center space-x-1.5 text-gray-300">
            <Clock className="w-3 h-3 text-[#ff7700]" />
            <span>
              Last saved at <span className="text-amber-400 font-mono font-medium">{lastSavedTime}</span>
            </span>
          </span>
          <span className="text-gray-600">|</span>
          <button
            onClick={() => saveProjectState(false)}
            className="text-amber-500 hover:text-amber-400 hover:underline flex items-center space-x-1"
            title="Save immediately to localStorage (Ctrl+S)"
          >
            <Save className="w-3 h-3" />
            <span>Save Now</span>
          </button>
          <span className="text-gray-600">|</span>
          <span>Auto-save: <span className="text-emerald-400 font-medium">Every 30s</span></span>
          <span className="text-gray-600">|</span>
          <span>Workspace: {activeWorkspace}</span>
        </div>

        <div className="flex items-center space-x-3">
          <span>
            Page: 1 / {Math.max(1, Math.ceil(currentProject.scenes.reduce((a, s) => a + s.eighths, 0) / 8))}
          </span>
          <span className="text-gray-600">|</span>
          <span>{currentProject.elements.length} Elements</span>
          <span className="text-gray-600">|</span>
          <span className="text-cyan-400 font-mono">
            Rust Core: Ready (Tauri v2)
          </span>
        </div>
      </footer>
      </div>

      {/* Export / Print Preview Modal */}
      {isExportOpen && (
        <ExportModal
          project={currentProject}
          initialFormat={initialExportFormat}
          autoPrint={autoPrintOnExport}
          onClose={() => {
            setIsExportOpen(false);
            setAutoPrintOnExport(false);
          }}
          onRecordGeneratedSidecar={handleRecordGeneratedSidecar}
        />
      )}

      {/* Script-to-NLE Metadata Pipeline & Speech-to-Text Alignment Modal */}
      {isNLEPipelineOpen && (
        <NLEMetadataModal
          project={currentProject}
          onClose={() => setIsNLEPipelineOpen(false)}
          onSelectScene={(sceneId) => {
            setSelectedSceneId(sceneId);
            setActiveWorkspace('authoring');
          }}
          onRecordGeneratedSidecar={handleRecordGeneratedSidecar}
          onClearGeneratedMetadataLog={handleClearGeneratedMetadataLog}
        />
      )}

      {/* Live Script-to-Schedule Revision Impact Preview Modal */}
      {isRevisionImpactOpen && (
        <RevisionImpactModal
          report={revisionImpactReport}
          lastSyncedAt={currentProject.lastScheduleSyncAt}
          onCommitSync={handleCommitScheduleSync}
          onClose={() => setIsRevisionImpactOpen(false)}
        />
      )}

      {/* Reports Modal */}
      {isReportsOpen && (
        <ReportsModal project={currentProject} onClose={() => setIsReportsOpen(false)} />
      )}

      {/* Dedicated White-on-Black Teleprompter Window */}
      {isTeleprompterOpen && (
        <TeleprompterWindow
          projects={projects}
          initialProjectId={currentProject.id}
          onClose={() => setIsTeleprompterOpen(false)}
        />
      )}

      {/* Automated Scene Continuity Check Modal */}
      {isContinuityModalOpen && (
        <SceneContinuityModal
          projectTitle={currentProject.title}
          report={continuityReport}
          onJumpToOccurrence={handleJumpToContinuityOccurrence}
          onAcknowledgeAlert={handleAcknowledgeContinuity}
          onRestoreAlert={handleRestoreContinuity}
          onClose={() => setIsContinuityModalOpen(false)}
        />
      )}

      {/* Preferences & Dedicated >_ Rust Desktop Window */}
      {isPreferencesOpen && (
        <PreferencesModal
          project={currentProject}
          onUpdateTypography={handleUpdateProjectTypography}
          onClose={() => setIsPreferencesOpen(false)}
        />
      )}

      {/* Edit Menu Dialogs: Go To, Find & Replace, Character Quick Edit, Emoji & Symbols */}
      {isGoToOpen && (
        <GoToModal
          scenes={currentProject.scenes}
          elements={currentProject.elements}
          onGoToScene={(sceneId) => {
            setSelectedSceneId(sceneId);
            const firstSceneEl = currentProject.elements.find((e) => e.sceneId === sceneId);
            if (firstSceneEl) setFocusedElementId(firstSceneEl.id);
            setActiveWorkspace('authoring');
          }}
          onGoToElement={(elementId) => {
            const matched = currentProject.elements.find((e) => e.id === elementId);
            handleJumpToElement(matched?.sceneId, elementId);
          }}
          onClose={() => setIsGoToOpen(false)}
        />
      )}

      {isFindOpen && (
        <FindReplaceModal
          elements={currentProject.elements}
          onJumpToElement={(elementId) => {
            const matched = currentProject.elements.find((e) => e.id === elementId);
            handleJumpToElement(matched?.sceneId, elementId);
          }}
          onReplaceInElement={(elementId, nextText) => {
            pushUndoSnapshot(currentProject);
            handleUpdateElement(elementId, nextText);
          }}
          onReplaceAll={handleReplaceAllInScript}
          onNotify={showToast}
          onClose={() => setIsFindOpen(false)}
        />
      )}

      {characterModalMode && (
        <CharacterActionModal
          mode={characterModalMode}
          characters={currentProject.characters}
          characterBios={currentProject.projectBible?.characterBios || []}
          initialCharacterName={
            activeTargetElement?.type === 'CHARACTER'
              ? activeTargetElement.text.replace(/\s*\([^)]*\)$/, '').trim()
              : activeTargetElement?.character
          }
          onRenameCharacter={handleRenameCharacterGlobal}
          onAddCharacter={handleAddCharacterGlobal}
          onEditCharacter={handleEditCharacterGlobal}
          onOpenCharactersWorkspace={() => {
            setCharactersInitialSubView('details');
            setActiveWorkspace('characters');
          }}
          onClose={() => setCharacterModalMode(null)}
        />
      )}

      {isEmojiSymbolsOpen && (
        <EmojiSymbolsModal
          onInsertSymbol={handleInsertEmojiSymbol}
          onClose={() => setIsEmojiSymbolsOpen(false)}
        />
      )}

      {/* Interactive User Guide & Tool Documentation */}
      {isHelpGuideOpen && (
        <HelpGuideModal
          initialCategory={helpInitialCategory}
          initialToolId={helpInitialToolId}
          actions={{
            onSelectWorkspace: setActiveWorkspace,
            onOpenContinuityCheck: () => setIsContinuityModalOpen(true),
            onToggleRevisionPassMode: () => setIsRevisionPassMode((prev) => !prev),
            isRevisionPassMode,
            onOpenTeleprompter: () => setIsTeleprompterOpen(true),
            onOpenNLEPipeline: () => setIsNLEPipelineOpen(true),
            onOpenExportModal: () => setIsExportOpen(true),
            onOpenReports: () => setIsReportsOpen(true),
            onOpenCastCrew: () => {
              setProductionRequestedTab({ tab: 'cast_crew', nonce: Date.now() });
              setActiveWorkspace('production');
            },
            onOpenCharacterConnections: () => {
              setCharactersInitialSubView('connections');
              setActiveWorkspace('characters');
            },
            onOpenCallSheet: () => {
              setCallSheetDayNumber(null);
              setProductionRequestedTab({ tab: 'call_sheet', nonce: Date.now() });
              setActiveWorkspace('production');
            },
            onOpenLocationMap: () => {
              setProductionRequestedTab({ tab: 'location_map', nonce: Date.now() });
              setActiveWorkspace('production');
            },
            onOpenRevisionImpact: () => setIsRevisionImpactOpen(true),
            onToggleFocusCenter: () => {
              const bothCollapsed = isLeftPanelCollapsed && isRightPanelCollapsed;
              setIsLeftPanelCollapsed(!bothCollapsed);
              setIsRightPanelCollapsed(!bothCollapsed);
            },
            onOpenQuickNotes: () => {
              setActiveWorkspace('authoring');
              setIsQuickNotesOpen(true);
            },
          }}
          onClose={() => setIsHelpGuideOpen(false)}
        />
      )}

      {/* Import Fountain Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-xl text-xs text-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#ff7700]" />
                <span className="font-bold text-sm text-gray-100">Import Screenplay (Fountain / Text)</span>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-gray-400">
                Paste raw screenplay text or Fountain markup below. ScreenCraft will automatically detect scene headings, characters, dialogue, and calculate page eighths:
              </p>
              <textarea
                rows={10}
                placeholder="INT. COFFEE SHOP - DAY&#10;&#10;JOHN sits alone at the counter sipping dark roast.&#10;&#10;JOHN&#10;I never expected him to arrive so early."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full bg-[#181818] p-3 rounded font-mono text-xs text-gray-200 border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
              />
            </div>
            <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-between">
              <button
                onClick={() => setIsImportOpen(false)}
                className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleImportFountain}
                disabled={!importText.trim()}
                className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-white font-bold rounded"
              >
                Import Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save As (.sccrft) Modal */}
      {isSaveAsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <form
            onSubmit={handleConfirmSaveAsModal}
            className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-md text-xs text-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-[#ff7700]" />
                <span className="font-bold text-sm text-gray-100">Save Document As (.sccrft)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveAsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
                aria-label="Close Save As dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-400">
                Save a local ScreenCraft (<span className="font-mono text-amber-300">.sccrft</span>) copy containing your script, formatting, stripboard, cast/crew, and scene notes.
              </p>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  File Name
                </span>
                <input
                  type="text"
                  autoFocus
                  value={saveAsFileName}
                  onChange={(e) => setSaveAsFileName(e.target.value)}
                  placeholder="my_screenplay.sccrft"
                  className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-[#ff8000] focus:outline-none rounded px-3 py-2 font-mono text-xs text-white"
                />
              </label>
            </div>
            <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSaveAsModalOpen(false)}
                className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold rounded flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save .sccrft File</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Save as Template Modal */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <form
            onSubmit={handleConfirmSaveAsTemplate}
            className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-md text-xs text-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookmarkPlus className="w-4 h-4 text-violet-300" />
                <span className="font-bold text-sm text-gray-100">Save Document as Template</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
                aria-label="Close Save as Template dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-400">
                Save this document structure as a reusable template in your Home Screen Authoring section.
              </p>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  Template Name
                </span>
                <input
                  type="text"
                  autoFocus
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="Half-Hour Sitcom Format"
                  className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-violet-400 focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  Document Category
                </span>
                <select
                  value={templateCategoryInput}
                  onChange={(e) => setTemplateCategoryInput(e.target.value as UserTemplateCategory)}
                  className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-violet-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="film">Film Script</option>
                  <option value="stage">Stage Play</option>
                  <option value="book">Book Manuscript</option>
                  <option value="television">Television Script</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  Notes / Description (optional)
                </span>
                <input
                  type="text"
                  value={templateDescInput}
                  onChange={(e) => setTemplateDescInput(e.target.value)}
                  placeholder="Includes act structure, typography, and scene setup..."
                  className="w-full bg-[#151515] border border-[#3e3e3e] focus:border-violet-400 focus:outline-none rounded px-3 py-1.5 text-xs text-white"
                />
              </label>
            </div>
            <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded flex items-center gap-1.5"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hidden Device File Input for .sccrft, .fdx, .fountain */}
      <input
        ref={deviceFileInputRef}
        type="file"
        accept=".sccrft,.fdx,.fountain,.txt"
        onChange={handleDeviceFileSelected}
        className="hidden"
      />
    </div>
  );
}
