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
  CharacterRelationshipEdge
} from './types/story';
import { SAMPLE_PROJECTS } from './data/sampleScripts';
import { TopHeader } from './components/TopHeader';
import { MenuBar } from './components/MenuBar';
import { FormattingToolbar } from './components/FormattingToolbar';
import { OutlineColumn } from './components/OutlineColumn';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { StripboardView } from './components/StripboardView';
import { CastCrewDirectory } from './components/CastCrewDirectory';
import { LocationMapView } from './components/LocationMapView';
import { InspectorColumn } from './components/InspectorColumn';
import { StoryboardWorkspace } from './components/StoryboardWorkspace';
import { ProjectContainerView } from './components/ProjectContainerView';
import { RustDesktopHub } from './components/RustDesktopHub';
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
import { generateRustDesktopZip } from './utils/rustDesktopGenerator';
import {
  computeRevisionImpact,
  commitScriptToScheduleSync,
  syncStripboardToScript,
} from './utils/liveScheduleSync';
import { computeRevisionPassCounts } from './utils/revisionPass';
import { analyzeSceneContinuity } from './utils/sceneContinuityCheck';
import { ExportFormatType } from './utils/exportPreviewFormatter';
import { Upload, X, Clock, Save, CheckCircle } from 'lucide-react';

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
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('authoring');
  const [productionSubView, setProductionSubView] = useState<'stripboard' | 'cast_crew' | 'location_map'>('stripboard');
  const [directoryInitialView, setDirectoryInitialView] = useState<
    'roster' | 'gallery' | 'character_breakdown' | 'connections' | 'timeline' | 'budget' | 'call_sheet'
  >('roster');
  const [callSheetDayNumber, setCallSheetDayNumber] = useState<number | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [currentElementType, setCurrentElementType] = useState<ElementType>('SCENE_HEADING');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Modals & Popups
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [initialExportFormat, setInitialExportFormat] = useState<ExportFormatType>('pdf');
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNLEPipelineOpen, setIsNLEPipelineOpen] = useState(false);
  const [isRevisionImpactOpen, setIsRevisionImpactOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isContinuityModalOpen, setIsContinuityModalOpen] = useState(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const [helpInitialCategory, setHelpInitialCategory] = useState<HelpSectionCategory>('all');
  const [helpInitialToolId, setHelpInitialToolId] = useState<string | undefined>(undefined);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [inspectorRequestedTab, setInspectorRequestedTab] = useState<{
    tab: 'comments' | 'tags' | 'properties' | 'shots' | 'history' | 'continuity';
    nonce: number;
  } | null>(null);
  const [isRevisionPassMode, setIsRevisionPassMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

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

  // Global Ctrl+S / Cmd+S shortcut to manually trigger save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectState(false);
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

  // Screenplay Element Operations & Revision Tracking
  const handleUpdateElement = (id: string, text: string) => {
    // 1. If we haven't stored original text for this edit session, cache it
    if (!initialElementTextsRef.current.has(id)) {
      const existingEl = currentProject.elements.find((el) => el.id === id);
      initialElementTextsRef.current.set(id, existingEl ? existingEl.text : '');
    }

    // 2. Immediately update element text & lastEditedAt in state for zero keystroke latency
    const editedIso = new Date().toISOString();
    updateCurrentProject((proj) => {
      const updatedElements = proj.elements.map((el) =>
        el.id === id ? { ...el, text, lastEditedAt: editedIso } : el
      );
      return { ...proj, elements: updatedElements };
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
      setInitialExportFormat(format);
      setIsExportOpen(true);
    }
  };

  const handleCreateNewProject = () => {
    const newProj: StoryProject = {
      id: `proj-${Date.now()}`,
      title: 'Untitled Screenplay',
      author: 'Jeffrey (Online)',
      lastModified: 'Just now',
      scenes: [
        {
          id: 'sc-new-1',
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
          synopsis: 'The beginning of a new script.',
          notes: '',
          budget: '$5,000',
          location: 'Main Studio',
          act: 1,
          storyDay: 1,
          timeOfDay: '09:00',
        },
      ],
      elements: [
        { id: 'el-n1', type: 'SCENE_HEADING', text: 'INT. PRODUCTION OFFICE - DAY', sceneId: 'sc-new-1' },
        { id: 'el-n2', type: 'ACTION', text: 'Bright morning sun streams through blinds. A single monitor hums with an empty Courier page.', sceneId: 'sc-new-1' },
        { id: 'el-n3', type: 'CHARACTER', text: 'WRITER', sceneId: 'sc-new-1' },
        { id: 'el-n4', type: 'DIALOGUE', text: 'Where every story begins.', sceneId: 'sc-new-1' },
      ],
      tags: [],
      comments: [],
      strips: [
        {
          id: 'b-new-1',
          type: 'day_break',
          bannerTitle: 'START OF DAY 1',
          bannerDate: 'Monday, 10 Nov 2026',
          bannerTotalPages: '1 PAGE',
          bannerFrom: '09:00',
          bannerTo: '18:00',
        },
        {
          id: 'st-new-1',
          type: 'scene',
          sceneId: 'sc-new-1',
          sceneNumber: 1,
          intExt: 'INT',
          dayNight: 'DAY',
          set: 'PRODUCTION OFFICE',
          runningTime: '00:01:00',
          pages: '1',
          eighths: 8,
          storyDay: 1,
          scheduledDuration: '02:00',
          characters: ['WRITER'],
          timeOfDay: '09:00',
          colorClass: 'day-int',
        },
      ],
      characters: [
        { name: 'WRITER', color: '#ff9f43', scenesCount: 1, speakingLines: 1 },
      ],
      storyboards: [],
    };

    setProjects([newProj, ...projects]);
    setCurrentProjectId(newProj.id);
    setSelectedSceneId('sc-new-1');
    setActiveWorkspace('authoring');
    showToast('Created new screenplay');
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
    setIsImportOpen(false);
    setImportText('');
    showToast('Fountain script imported successfully!');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#222222] text-gray-200 font-sans select-none">
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

      {/* Top Application Header */}
      <TopHeader
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        projectTitle={currentProject.title}
        onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
      />

      {/* Menu Bar with Working Menus */}
      <MenuBar
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        onExport={handleExport}
        onImport={() => setIsImportOpen(true)}
        onSave={() => saveProjectState(false)}
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
        onOpenSample={(sampleId) => {
          setCurrentProjectId(sampleId);
          setSelectedSceneId(null);
          setFocusedElementId(null);
          showToast('Sample screenplay loaded');
        }}
        onAddDayBreak={handleAddDayBreak}
        onAddComment={() => handleAddComment('Review note added from menu')}
        onOpenCastCrew={() => {
          setDirectoryInitialView('roster');
          setActiveWorkspace('production');
          setProductionSubView('cast_crew');
        }}
        onOpenCharacterBreakdown={() => {
          setDirectoryInitialView('character_breakdown');
          setActiveWorkspace('production');
          setProductionSubView('cast_crew');
        }}
        onOpenCallSheet={() => {
          setCallSheetDayNumber(null);
          setDirectoryInitialView('call_sheet');
          setActiveWorkspace('production');
          setProductionSubView('cast_crew');
        }}
        onOpenLocationMap={() => {
          setActiveWorkspace('production');
          setProductionSubView('location_map');
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
        currentProject={currentProject}
        sampleProjects={projects}
      />

      {/* Formatting & Production Ribbon Toolbar (Only in Authoring & Production) */}
      {(activeWorkspace === 'authoring' || activeWorkspace === 'production') && (
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
        {/* Workspace 1 & 2: Authoring (Script Editor) OR Production (Stripboard) with 3-Column Layout! */}
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

            {/* Column 2 & 3: Authoring Editor OR Production Stripboard / Cast & Crew Address Book */}
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
                    focusedElementId={focusedElementId}
                    onInspectContinuityElement={(elId) => {
                      setFocusedElementId(elId);
                      setIsRightPanelCollapsed(false);
                      setInspectorRequestedTab({ tab: 'continuity', nonce: Date.now() });
                    }}
                    scriptFormat={currentProject.scriptFormat || 'single_column_film'}
                    onChangeScriptFormat={handleChangeScriptFormat}
                    onAddStoryboardImageForScene={handleAddStoryboardImageForScene}
                    onUpdateElement={handleUpdateElement}
                    onUpdateElementType={handleUpdateElementType}
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
                  comments={currentProject.comments}
                  tags={currentProject.tags}
                  characters={currentProject.characters}
                  storyboards={currentProject.storyboards || []}
                  revisions={currentProject.revisions || []}
                  activeDraftName={currentProject.activeDraftName}
                  activeDraftColor={currentProject.activeDraftColor}
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
            ) : productionSubView === 'cast_crew' ? (
              <CastCrewDirectory
                project={currentProject}
                projectTitle={currentProject.title}
                projectAuthor={currentProject.author}
                draftName={currentProject.activeDraftName}
                members={currentProject.crewMembers || []}
                scenes={currentProject.scenes}
                strips={currentProject.strips}
                characters={currentProject.characters}
                tags={currentProject.tags}
                elements={currentProject.elements}
                comments={currentProject.comments}
                characterBreakdowns={currentProject.characterBreakdowns}
                initialDirectoryView={directoryInitialView}
                initialCallSheetDay={callSheetDayNumber}
                onAddMember={handleAddCrewMember}
                onUpdateMember={handleUpdateCrewMember}
                onDeleteMember={handleDeleteCrewMember}
                onAddConnection={handleAddCrewConnection}
                onRemoveConnection={handleRemoveCrewConnection}
                onUpdateCharacterBreakdown={handleUpdateCharacterBreakdown}
                onResetCharacterBreakdown={handleResetCharacterBreakdown}
                onCreateCharacterTag={handleCreateCharacterTag}
                onUpdateCharacterRelationships={handleUpdateCharacterRelationships}
                onUpdateCharacterNodePositions={handleUpdateCharacterNodePositions}
                locationCount={uniqueLocationCount}
                onSwitchSubView={(view) => {
                  if (view === 'cast_crew') setDirectoryInitialView('roster');
                  setProductionSubView(view);
                }}
                onSelectScene={(sceneId) => {
                  setSelectedSceneId(sceneId);
                  setActiveWorkspace('authoring');
                }}
                onImportScriptCast={handleImportScriptCast}
              />
            ) : productionSubView === 'location_map' ? (
              <LocationMapView
                projectTitle={currentProject.title}
                scenes={currentProject.scenes}
                savedLocations={currentProject.locations || []}
                crewCount={(currentProject.crewMembers || []).length}
                onUpdateLocations={handleUpdateLocations}
                onSwitchSubView={(view) => {
                  if (view === 'cast_crew') setDirectoryInitialView('roster');
                  setProductionSubView(view);
                }}
                onSelectScene={(sceneId) => {
                  setSelectedSceneId(sceneId);
                  setActiveWorkspace('authoring');
                }}
              />
            ) : (
              <>
                <StripboardView
                  strips={currentProject.strips}
                  scenes={currentProject.scenes}
                  elements={currentProject.elements}
                  locations={currentProject.locations}
                  selectedSceneId={selectedSceneId}
                  onSelectScene={setSelectedSceneId}
                  onUpdateStrips={handleUpdateStrips}
                  onAddDayBreak={handleAddDayBreak}
                  onAddMealBreak={handleAddMealBreak}
                  crewCount={(currentProject.crewMembers || []).length}
                  locationCount={uniqueLocationCount}
                  pendingSyncCount={revisionImpactReport.totalImpactedScenes}
                  onOpenRevisionImpact={() => setIsRevisionImpactOpen(true)}
                  onNotify={showToast}
                  onSwitchSubView={(view) => {
                    if (view === 'cast_crew') setDirectoryInitialView('roster');
                    setProductionSubView(view);
                  }}
                  onOpenCallSheet={(dayNum) => {
                    setCallSheetDayNumber(dayNum ?? null);
                    setDirectoryInitialView('call_sheet');
                    setProductionSubView('cast_crew');
                  }}
                />

                <InspectorColumn
                  selectedScene={currentProject.scenes.find((s) => s.id === selectedSceneId)}
                  comments={currentProject.comments}
                  tags={currentProject.tags}
                  characters={currentProject.characters}
                  storyboards={currentProject.storyboards || []}
                  revisions={currentProject.revisions || []}
                  activeDraftName={currentProject.activeDraftName}
                  activeDraftColor={currentProject.activeDraftColor}
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
            )}
          </div>
        )}

        {/* Workspace: Unified Project Bible & Pitch Hub */}
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

        {/* Workspace: Storyboard & Animatic Suite */}
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

        {/* Workspace 3: Rust Desktop Engine & Native Installer Hub */}
        {activeWorkspace === 'rust_engine' && (
          <RustDesktopHub currentProject={currentProject} />
        )}

        {/* Workspace 4: Projects Browser */}
        {activeWorkspace === 'projects' && (
          <ProjectsBrowser
            projects={projects}
            currentProjectId={currentProjectId}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
              setSelectedSceneId(null);
              setActiveWorkspace('authoring');
            }}
            onCreateNewProject={handleCreateNewProject}
            onExportRust={(proj) => handleExport('rust_zip')}
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

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          project={currentProject}
          initialFormat={initialExportFormat}
          onClose={() => setIsExportOpen(false)}
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
              setDirectoryInitialView('roster');
              setActiveWorkspace('production');
              setProductionSubView('cast_crew');
            },
            onOpenCharacterConnections: () => {
              setDirectoryInitialView('connections');
              setActiveWorkspace('production');
              setProductionSubView('cast_crew');
            },
            onOpenCallSheet: () => {
              setCallSheetDayNumber(null);
              setDirectoryInitialView('call_sheet');
              setActiveWorkspace('production');
              setProductionSubView('cast_crew');
            },
            onOpenLocationMap: () => {
              setActiveWorkspace('production');
              setProductionSubView('location_map');
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
    </div>
  );
}
