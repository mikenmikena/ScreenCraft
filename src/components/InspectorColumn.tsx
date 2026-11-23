import React, { useState } from 'react';
import {
  MessageSquare,
  Tag as TagIcon,
  Sliders,
  Camera,
  Search,
  Plus,
  CheckCircle,
  Clock,
  User,
  Trash2,
  Share2,
  Upload,
  X,
  Image as ImageIcon,
  ExternalLink,
  Film,
  Volume2,
  History,
  RotateCcw,
  FileEdit,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  Bookmark,
  Sparkles,
  Filter,
  Check,
  ShieldAlert,
  PanelRightClose,
  PanelRightOpen,
  SpellCheck,
  BookCheck,
  Users,
  ArrowUpRight,
  Wand2,
} from 'lucide-react';
import {
  Scene,
  StoryComment,
  Tag,
  TagCategory,
  StoryCharacter,
  StoryboardFrame,
  ScreenplayRevision,
  RevisionChangeType,
  ScreenplayElement,
  CharacterBio,
  CharacterBreakdownOverride,
} from '../types/story';
import { SceneContinuityReport } from '../utils/sceneContinuityCheck';
import { SceneContinuityPanel } from './SceneContinuityPanel';
import {
  analyzeScriptProofreading,
  applyProofreadFixToText,
  ProofreadIssue,
  ProofreadScope,
} from '../utils/scriptProofreading';

export type InspectorTabId =
  | 'comments'
  | 'tags'
  | 'properties'
  | 'shots'
  | 'history'
  | 'continuity'
  | 'proofread'
  | 'characters';

interface InspectorColumnProps {
  selectedScene: Scene | undefined;
  allScenes?: Scene[];
  elements?: ScreenplayElement[];
  comments: StoryComment[];
  tags: Tag[];
  characters: StoryCharacter[];
  characterBios?: CharacterBio[];
  characterBreakdowns?: CharacterBreakdownOverride[];
  storyboards?: StoryboardFrame[];
  revisions?: ScreenplayRevision[];
  activeDraftName?: string;
  activeDraftColor?: string;
  customDictionary?: string[];
  onAddComment: (text: string) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onAddTag: (name: string, category: TagCategory, color: string, image?: string) => void;
  onUpdateTagImage?: (tagId: string, image?: string) => void;
  onUpdateScene: (scene: Scene) => void;
  onOpenStoryboard?: (frameId?: string) => void;
  onAddStoryboardFrame?: (sceneId: string) => void;
  onRevertRevision?: (revision: ScreenplayRevision) => void;
  onCreateDraftMilestone?: (name: string, color: string) => void;
  onApplyElementTextFix?: (elementId: string, newText: string, description: string) => void;
  onAddToDictionary?: (word: string) => void;
  onJumpToElement?: (sceneId: string | undefined, elementId: string) => void;
  onOpenCharactersWorkspace?: () => void;
  continuityReport?: SceneContinuityReport;
  onJumpToOccurrence?: (sceneId: string, elementId?: string) => void;
  onAcknowledgeContinuity?: (alertId: string) => void;
  onRestoreContinuity?: (alertId: string) => void;
  onOpenContinuityModal?: () => void;
  requestedTab?: {
    tab: InspectorTabId;
    subMode?: 'spelling' | 'grammar';
    nonce: number;
  } | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const InspectorColumn: React.FC<InspectorColumnProps> = ({
  selectedScene,
  allScenes = [],
  elements = [],
  comments,
  tags,
  characters,
  characterBios = [],
  characterBreakdowns = [],
  storyboards = [],
  revisions = [],
  activeDraftName = 'Blue Revision Draft',
  activeDraftColor = '#3b82f6',
  customDictionary = [],
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onAddTag,
  onUpdateTagImage,
  onUpdateScene,
  onOpenStoryboard,
  onAddStoryboardFrame,
  onRevertRevision,
  onCreateDraftMilestone,
  onApplyElementTextFix,
  onAddToDictionary,
  onJumpToElement,
  onOpenCharactersWorkspace,
  continuityReport,
  onJumpToOccurrence,
  onAcknowledgeContinuity,
  onRestoreContinuity,
  onOpenContinuityModal,
  requestedTab,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTabId>('history');
  const [proofreadScope, setProofreadScope] = useState<ProofreadScope>('scene');
  const [proofreadFilter, setProofreadFilter] = useState<'all' | 'spelling' | 'grammar'>('all');
  const [characterInfoScope, setCharacterInfoScope] = useState<'scene' | 'project'>('scene');

  React.useEffect(() => {
    if (requestedTab?.tab) {
      setActiveTab(requestedTab.tab);
      if (requestedTab.tab === 'proofread' && requestedTab.subMode) {
        setProofreadFilter(requestedTab.subMode);
      }
    }
  }, [requestedTab]);
  const [historyScope, setHistoryScope] = useState<'scene' | 'project'>('scene');
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [newDraftColor, setNewDraftColor] = useState('#ec4899');
  const [revertedRevisionId, setRevertedRevisionId] = useState<string | null>(null);
  const [commentSearch, setCommentSearch] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>('character');
  const [newTagColor, setNewTagColor] = useState('#00d2d3');
  const [newTagImage, setNewTagImage] = useState<string | undefined>(undefined);

  const proofreadReport = React.useMemo(
    () =>
      analyzeScriptProofreading(
        elements,
        allScenes.length > 0 ? allScenes : selectedScene ? [selectedScene] : [],
        proofreadScope,
        selectedScene?.id || null,
        customDictionary
      ),
    [elements, allScenes, selectedScene, proofreadScope, customDictionary]
  );

  const filteredProofreadIssues = React.useMemo(() => {
    if (proofreadFilter === 'all') return proofreadReport.issues;
    return proofreadReport.issues.filter((i) => i.kind === proofreadFilter);
  }, [proofreadReport.issues, proofreadFilter]);

  const characterInfoRows = React.useMemo(() => {
    const bioMap = new Map(
      characterBios.map((b) => [b.characterName.trim().toUpperCase(), b])
    );
    const breakdownMap = new Map(
      characterBreakdowns.map((b) => [b.characterName.trim().toUpperCase(), b])
    );

    const names = new Set<string>();
    if (characterInfoScope === 'scene' && selectedScene) {
      selectedScene.characters.forEach((c) => {
        const norm = c.trim().toUpperCase();
        if (norm) names.add(norm);
      });
      elements
        .filter((el) => el.sceneId === selectedScene.id)
        .forEach((el) => {
          if (el.type === 'CHARACTER' && el.text.trim()) {
            names.add(el.text.replace(/\(.*?\)/g, '').trim().toUpperCase());
          } else if (el.character?.trim()) {
            names.add(el.character.trim().toUpperCase());
          }
        });
    } else {
      characters.forEach((c) => names.add(c.name.trim().toUpperCase()));
      characterBios.forEach((b) => names.add(b.characterName.trim().toUpperCase()));
    }

    const scopedElements =
      characterInfoScope === 'scene' && selectedScene
        ? elements.filter((el) => el.sceneId === selectedScene.id)
        : elements;

    return Array.from(names)
      .filter(Boolean)
      .map((name) => {
        const storyChar = characters.find((c) => c.name.trim().toUpperCase() === name);
        const bio = bioMap.get(name);
        const breakdown = breakdownMap.get(name);

        let dialogueLines = 0;
        let voiceOverLines = 0;
        let currentSpeaker = '';
        scopedElements.forEach((el) => {
          if (el.type === 'SCENE_HEADING' || el.type === 'ACTION' || el.type === 'TRANSITION') {
            currentSpeaker = '';
          } else if (el.type === 'CHARACTER') {
            currentSpeaker = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
          } else if (el.type === 'DIALOGUE') {
            const spk = (el.character || currentSpeaker).trim().toUpperCase();
            if (spk === name) dialogueLines += 1;
          } else if (el.type === 'VOICE_OVER') {
            const spk = (el.character || currentSpeaker).trim().toUpperCase();
            if (spk === name) voiceOverLines += 1;
          }
        });

        return {
          name,
          color: storyChar?.color || '#f59e0b',
          actor: storyChar?.actor,
          roleType: bio?.roleType || breakdown?.roleCategory || 'Cast',
          scenesCount: storyChar?.scenesCount || 0,
          dialogueLines,
          voiceOverLines,
          summary: bio?.loglineSummary || storyChar?.description || '',
          arc: breakdown?.characterArc || bio?.arcStartToEnd || '',
          wardrobeNotes: breakdown?.wardrobeNotes || bio?.visualNotes || '',
          propsCarried: breakdown?.propsCarried || [],
        };
      })
      .sort((a, b) => b.dialogueLines + b.voiceOverLines - (a.dialogueLines + a.voiceOverLines));
  }, [characterInfoScope, selectedScene, characters, characterBios, characterBreakdowns, elements]);

  const filteredComments = comments.filter((c) =>
    c.text.toLowerCase().includes(commentSearch.toLowerCase()) ||
    c.author.toLowerCase().includes(commentSearch.toLowerCase())
  );

  const sceneShots = selectedScene
    ? storyboards.filter((s) => s.sceneId === selectedScene.id)
    : storyboards;

  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim());
    setNewCommentText('');
  };

  const handleFileSelect = (file: File, callback: (dataUrl: string) => void) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onAddTag(newTagName.trim(), newTagCategory, newTagColor, newTagImage);
    setNewTagName('');
    setNewTagImage(undefined);
  };

  // Revisions Filtering for Scope (This Scene vs Entire Project)
  const sceneRevisions = selectedScene
    ? revisions.filter((r) => r.sceneId === selectedScene.id || r.sceneNumber === selectedScene.sceneNumber)
    : revisions;

  const scopedRevisions = historyScope === 'scene' && selectedScene ? sceneRevisions : revisions;

  const filteredRevisions = scopedRevisions.filter((rev) => {
    // Search query matching
    const searchLower = historySearch.toLowerCase();
    const matchesSearch =
      !historySearch.trim() ||
      rev.description.toLowerCase().includes(searchLower) ||
      rev.author.toLowerCase().includes(searchLower) ||
      (rev.previousText && rev.previousText.toLowerCase().includes(searchLower)) ||
      (rev.newText && rev.newText.toLowerCase().includes(searchLower)) ||
      (rev.draftLabel && rev.draftLabel.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    // Type filter
    if (historyTypeFilter === 'all') return true;
    if (historyTypeFilter === 'edits') return rev.changeType === 'text_edit';
    if (historyTypeFilter === 'elements') return rev.changeType === 'element_added' || rev.changeType === 'element_deleted';
    if (historyTypeFilter === 'types') return rev.changeType === 'element_type_changed';
    if (historyTypeFilter === 'drafts') return rev.changeType === 'draft_milestone';
    return true;
  });

  const handleRevert = (rev: ScreenplayRevision) => {
    if (onRevertRevision) {
      onRevertRevision(rev);
      setRevertedRevisionId(rev.id);
      setTimeout(() => setRevertedRevisionId(null), 2500);
    }
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftName.trim() || !onCreateDraftMilestone) return;
    onCreateDraftMilestone(newDraftName.trim(), newDraftColor);
    setNewDraftName('');
    setShowDraftModal(false);
  };

  // Standard Hollywood production revision draft colors
  const draftColorOptions = [
    { name: 'White (1st Draft)', color: '#f3f4f6' },
    { name: 'Blue (1st Rev)', color: '#3b82f6' },
    { name: 'Pink (2nd Rev)', color: '#ec4899' },
    { name: 'Yellow (3rd Rev)', color: '#eab308' },
    { name: 'Green (4th Rev)', color: '#22c55e' },
    { name: 'Goldenrod (5th Rev)', color: '#d97706' },
    { name: 'Buff (6th Rev)', color: '#f59e0b' },
    { name: 'Salmon (7th Rev)', color: '#f87171' },
    { name: 'Cherry (8th Rev)', color: '#ef4444' },
  ];

  const openCommentsCount = comments.filter((c) => !c.resolved).length;
  const activeContinuityCount = continuityReport ? continuityReport.summary.totalActive : 0;

  const totalProofreadCount = proofreadReport.spellingCount + proofreadReport.grammarCount;

  if (isCollapsed) {
    const railItems: {
      id: InspectorTabId;
      label: string;
      icon: React.ReactNode;
      hasAlert?: boolean;
    }[] = [
      { id: 'properties', label: 'Scene Properties', icon: <Sliders className="w-4 h-4" /> },
      { id: 'comments', label: `Comments (${openCommentsCount})`, icon: <MessageSquare className="w-4 h-4" /> },
      { id: 'tags', label: `Tags (${tags.length})`, icon: <TagIcon className="w-4 h-4" /> },
      { id: 'history', label: `Draft Revisions & History (${scopedRevisions.length})`, icon: <History className="w-4 h-4" /> },
      {
        id: 'continuity',
        label: `Continuity (${activeContinuityCount})`,
        icon: <ShieldAlert className="w-4 h-4" />,
        hasAlert: activeContinuityCount > 0,
      },
      {
        id: 'proofread',
        label: `Spell & Grammar Check (${totalProofreadCount})`,
        icon: <SpellCheck className="w-4 h-4" />,
      },
      {
        id: 'characters',
        label: `Character Info (${characterInfoRows.length})`,
        icon: <Users className="w-4 h-4" />,
      },
      { id: 'shots', label: `Shots (${sceneShots.length})`, icon: <Camera className="w-4 h-4" /> },
    ];

    return (
      <aside className="w-10 flex-shrink-0 bg-[#1b1b1b] border-l border-[#383838] flex flex-col items-center py-2.5 gap-2 h-full text-xs select-none">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Right Inspector Panel"
            aria-label="Expand Right Inspector Panel"
            className="p-1.5 rounded bg-[#252525] hover:bg-[#333333] text-gray-300 hover:text-[#ff8000] border border-[#3a3a3a] transition-colors"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        )}

        <div className="w-5 h-px bg-[#323232] my-0.5" />

        {railItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveTab(item.id);
              onToggleCollapse?.();
            }}
            title={item.label}
            className={`relative p-1.5 rounded transition-colors ${
              activeTab === item.id
                ? 'bg-[#2a2219] text-[#ff8000] border border-[#ff8000]/40'
                : item.hasAlert
                ? 'text-rose-300 hover:text-rose-200 hover:bg-[#262626]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#262626]'
            }`}
          >
            {item.icon}
          </button>
        ))}

        <div className="mt-auto pb-2 text-[10px] font-semibold tracking-widest text-gray-500 [writing-mode:vertical-rl]">
          INSPECTOR
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 bg-[#242424] border-l border-[#383838] flex flex-col h-full text-xs select-none">
      {/* Inspector Header with Collapse Button */}
      <div className="px-3 py-1.5 bg-[#181818] border-b border-[#323232] flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-300 tracking-wide truncate">
          Scene Inspector
        </span>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Right Panel to Maximize Center Window"
            aria-label="Collapse Right Inspector Panel"
            className="p-1 rounded text-gray-400 hover:text-[#ff8000] hover:bg-[#282828] transition-colors shrink-0"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Multi-Row Wrapping Tab Strip */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-[#383838] bg-[#1c1c1c] text-[10px]">
        <button
          type="button"
          onClick={() => setActiveTab('properties')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap ${
            activeTab === 'properties'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Scene Properties"
        >
          <Sliders className="w-3 h-3 shrink-0" />
          <span>Scene</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'comments'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Review Comments"
        >
          <MessageSquare className="w-3 h-3 shrink-0" />
          <span>Notes ({openCommentsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tags')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'tags'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Scene & Script Tags"
        >
          <TagIcon className="w-3 h-3 shrink-0" />
          <span>Tags ({tags.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'history'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="History & Draft Revisions"
        >
          <History className="w-3 h-3 shrink-0" />
          <span>History</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('continuity')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'continuity'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : activeContinuityCount > 0
              ? 'text-rose-300 hover:text-rose-200 hover:bg-[#222] border-transparent'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Automated Prop & Costume Continuity Check"
        >
          <ShieldAlert
            className={`w-3 h-3 shrink-0 ${
              activeContinuityCount > 0 ? 'text-rose-400' : ''
            }`}
          />
          <span>QC ({activeContinuityCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('proofread')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'proofread'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Spell Check & Grammar Check"
        >
          <SpellCheck className="w-3 h-3 shrink-0" />
          <span>Spell ({totalProofreadCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'characters'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Character Info & Dialogue Counts"
        >
          <Users className="w-3 h-3 shrink-0" />
          <span>Chars</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shots')}
          className={`flex-auto px-2 py-1.5 rounded flex items-center justify-center gap-1 font-semibold transition-colors border whitespace-nowrap tabular-nums ${
            activeTab === 'shots'
              ? 'bg-[#262626] text-[#ff8000] border-[#ff8000]/60'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#222] border-transparent'
          }`}
          title="Storyboard & Camera Shots"
        >
          <Camera className="w-3 h-3 shrink-0" />
          <span>Shots ({sceneShots.length})</span>
        </button>
      </div>

      {/* TAB 1: COMMENTS / COLLABORATOR REVIEW (Screenshot 4: Hasraf Dulull, Whitney) */}
      {activeTab === 'comments' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#242424]">
          {/* Search comments */}
          <div className="p-2 border-b border-[#333] bg-[#202020]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-500" />
              <input
                type="text"
                placeholder="Search Comments..."
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                className="w-full bg-[#181818] text-gray-200 pl-7 pr-2 py-1 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000]"
              />
            </div>
          </div>

          {/* Comment Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>No comments in this thread</p>
              </div>
            ) : (
              filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded border transition-all ${
                    comment.resolved
                      ? 'bg-[#1c1c1c] border-[#333] opacity-60'
                      : 'bg-[#2b2b2b] border-[#444] shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    {/* Adobe Story Author Name in Gold/Amber (Hasraf Dulull / Whitney) */}
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff8000]"></span>
                      <span className="font-bold text-amber-400 text-xs">{comment.author}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{comment.createdAt}</span>
                  </div>

                  <p className="text-gray-200 text-xs leading-relaxed font-sans mb-2 pl-3 border-l-2 border-[#ff8000]/60">
                    {comment.text}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#383838]">
                    <span className="text-gray-500">Page {comment.page || 1}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onResolveComment(comment.id)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                          comment.resolved
                            ? 'text-emerald-400 bg-emerald-950/40'
                            : 'text-gray-400 hover:text-emerald-400 hover:bg-[#333]'
                        }`}
                      >
                        {comment.resolved ? 'Resolved' : 'Resolve'}
                      </button>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-gray-500 hover:text-red-400 p-1"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add New Comment Box */}
          <form onSubmit={handleCreateComment} className="p-2.5 bg-[#1e1e1e] border-t border-[#383838]">
            <textarea
              rows={2}
              placeholder="Add a script review note..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full bg-[#282828] text-gray-200 p-2 rounded border border-[#404040] text-xs focus:outline-none focus:border-[#ff8000] resize-none"
            />
            <div className="flex justify-end mt-1.5">
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-white font-semibold rounded text-xs transition-colors"
              >
                Post Comment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: TAGS (Character Profile Photos, Props, Wardrobe, Vehicles) */}
      {activeTab === 'tags' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#242424]">
          <div className="p-2.5 bg-[#1f1f1f] border-b border-[#333] flex justify-between items-center">
            <span className="font-semibold text-gray-300">ELEMENT TAGGER & CAST PROFILES</span>
            <span className="text-[10px] text-amber-400 font-mono">ScreenCraft Tags</span>
          </div>

          {/* Tags List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="p-2 rounded bg-[#2c2c2c] border border-[#3e3e3e] flex items-center justify-between hover:border-gray-500 transition-colors group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* User-Uploaded Character Profile Photo or Colored Category Badge */}
                  <div className="relative group/avatar flex-shrink-0">
                    {tag.image ? (
                      <img
                        src={tag.image}
                        alt={tag.name}
                        className="w-9 h-9 rounded-full object-cover shadow-xs transition-transform group-hover/avatar:scale-105"
                        style={{ border: `2px solid ${tag.color}` }}
                      />
                    ) : (
                      <div
                        style={{ backgroundColor: `${tag.color}25`, borderColor: tag.color }}
                        className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-[11px] text-gray-200 shadow-inner group-hover/avatar:border-white transition-colors"
                      >
                        {tag.category === 'character' ? (
                          tag.name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                        ) : (
                          <TagIcon className="w-4 h-4" style={{ color: tag.color }} />
                        )}
                      </div>
                    )}

                    {/* Camera / Upload trigger overlay */}
                    {onUpdateTagImage && (
                      <label
                        title="Upload or change character profile picture"
                        className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity"
                      >
                        <Camera className="w-3.5 h-3.5 text-white drop-shadow" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileSelect(file, (dataUrl) => onUpdateTagImage(tag.id, dataUrl));
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-200 text-xs truncate">{tag.name}</div>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                      <span className="font-semibold text-amber-400">{tag.category}</span>
                      <span>•</span>
                      <span>{tag.sceneIds.length} scenes</span>
                    </div>
                    {tag.image && onUpdateTagImage && (
                      <button
                        onClick={() => onUpdateTagImage(tag.id, undefined)}
                        className="text-[9px] text-gray-500 hover:text-red-400 block mt-0.5"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
                  <span className="text-[11px] font-mono text-amber-400 bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#383838]">
                    #{tag.count || tag.sceneIds.length}
                  </span>
                  {onUpdateTagImage && !tag.image && (
                    <label
                      title="Upload profile photo"
                      className="text-[9px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center space-x-0.5"
                    >
                      <Camera className="w-2.5 h-2.5" />
                      <span>+Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(file, (dataUrl) => onUpdateTagImage(tag.id, dataUrl));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New Tag Tool with Profile Image Upload Support */}
          <form onSubmit={handleCreateTag} className="p-3 bg-[#1e1e1e] border-t border-[#383838] space-y-2.5">
            <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide">
              Create New Tag & Profile Photo
            </div>

            <input
              type="text"
              placeholder="Character or Element Name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-full bg-[#282828] text-gray-200 px-2.5 py-1 rounded border border-[#404040] text-xs focus:outline-none focus:border-[#ff8000]"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Category:</label>
                <select
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value as TagCategory)}
                  className="w-full bg-[#282828] text-gray-200 p-1 rounded border border-[#404040] text-xs"
                >
                  <option value="character">Character</option>
                  <option value="prop">Prop</option>
                  <option value="wardrobe">Wardrobe</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="sfx">Sound FX</option>
                  <option value="vfx">Visual FX</option>
                  <option value="extra">Extras</option>
                  <option value="location">Location</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Color Marker:</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-7 bg-transparent rounded cursor-pointer border border-[#404040]"
                  />
                  <span className="font-mono text-[10px] text-gray-400">{newTagColor}</span>
                </div>
              </div>
            </div>

            {/* Profile Image Upload Zone */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 font-semibold">
                Character Profile Image:
              </label>
              <div className="flex items-center space-x-2 bg-[#282828] p-2 rounded border border-[#404040]">
                {newTagImage ? (
                  <div className="relative flex-shrink-0">
                    <img
                      src={newTagImage}
                      alt="Preview"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#ff7700]"
                    />
                    <button
                      type="button"
                      onClick={() => setNewTagImage(undefined)}
                      className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5"
                      title="Remove image"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-dashed border-[#555] flex items-center justify-center text-gray-500 flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <label className="px-2 py-1 bg-[#333] hover:bg-[#3e3e3e] text-gray-200 rounded text-[11px] font-medium cursor-pointer inline-flex items-center space-x-1.5 border border-[#4a4a4a]">
                    <Upload className="w-3 h-3 text-[#ff7700]" />
                    <span>{newTagImage ? 'Replace Image' : 'Upload Image...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelect(file, (dataUrl) => setNewTagImage(dataUrl));
                        }
                      }}
                    />
                  </label>
                  <div className="text-[9px] text-gray-500 mt-0.5">Supports PNG, JPG, or WebP</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="w-full py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-white font-semibold rounded text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Breakdown Tag</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SCENE METADATA PROPERTIES */}
      {activeTab === 'properties' && selectedScene && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#242424]">
          <div className="bg-[#1b1b1b] p-2.5 rounded border border-[#383838]">
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Current Scene</div>
            <div className="font-bold text-amber-400 text-sm">{selectedScene.heading}</div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Location / Set:</label>
              <input
                type="text"
                value={selectedScene.location}
                onChange={(e) => onUpdateScene({ ...selectedScene, location: e.target.value })}
                className="w-full bg-[#1c1c1c] text-gray-200 p-1.5 rounded border border-[#3e3e3e] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Act:</label>
                <input
                  type="number"
                  value={selectedScene.act}
                  onChange={(e) => onUpdateScene({ ...selectedScene, act: Number(e.target.value) })}
                  className="w-full bg-[#1c1c1c] text-gray-200 p-1.5 rounded border border-[#3e3e3e] text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Story Day:</label>
                <input
                  type="number"
                  value={selectedScene.storyDay}
                  onChange={(e) => onUpdateScene({ ...selectedScene, storyDay: Number(e.target.value) })}
                  className="w-full bg-[#1c1c1c] text-gray-200 p-1.5 rounded border border-[#3e3e3e] text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Cast in this Scene:</label>
              <div className="bg-[#1c1c1c] p-2 rounded border border-[#3e3e3e] space-y-1.5">
                {characters.map((char) => {
                  const isPresent = selectedScene.characters.includes(char.name);
                  return (
                    <label key={char.name} className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPresent}
                        onChange={(e) => {
                          const updatedChars = e.target.checked
                            ? [...selectedScene.characters, char.name]
                            : selectedScene.characters.filter((c) => c !== char.name);
                          onUpdateScene({ ...selectedScene, characters: updatedChars });
                        }}
                        className="rounded text-[#ff7700] focus:ring-0"
                      />
                      <span
                        style={{ backgroundColor: char.color }}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                      <span>{char.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHOTS & STORYBOARD */}
      {activeTab === 'shots' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#242424]">
          <div className="p-2.5 bg-[#1b1b1b] rounded border border-[#383838] flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-[#ff8000]" />
                <span>
                  {selectedScene
                    ? `SCENE ${selectedScene.sceneNumber} SHOT LIST`
                    : 'ALL STORYBOARD SHOTS'}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {sceneShots.length} shot{sceneShots.length !== 1 ? 's' : ''} planned
              </div>
            </div>
            {onOpenStoryboard && (
              <button
                onClick={() => onOpenStoryboard()}
                className="px-2 py-1 bg-[#2e1d0c] hover:bg-[#ff7700] hover:text-white text-[#ff8000] border border-[#ff7700]/40 rounded font-medium text-[11px] flex items-center space-x-1 transition-colors"
                title="Switch to full Storyboard & Animatic workspace"
              >
                <span>Full Board</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Add Button */}
          {selectedScene && onAddStoryboardFrame && (
            <button
              onClick={() => onAddStoryboardFrame(selectedScene.id)}
              className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#383838] hover:text-[#ff8000] text-gray-300 border border-dashed border-[#444] rounded flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#ff8000]" />
              <span className="font-medium">Add Shot to Scene {selectedScene.sceneNumber}</span>
            </button>
          )}

          {/* Shots List */}
          {sceneShots.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[#383838] rounded bg-[#1f1f1f] text-gray-400 space-y-2">
              <Camera className="w-8 h-8 mx-auto text-gray-500 stroke-1" />
              <p className="text-xs font-medium text-gray-300">No shots created yet</p>
              <p className="text-[11px] text-gray-500">
                Plan camera angles, framing, lenses, and sketches for this scene.
              </p>
              {onOpenStoryboard && (
                <button
                  onClick={() => onOpenStoryboard()}
                  className="mt-2 px-3 py-1 bg-[#ff7700] text-white rounded font-medium hover:bg-[#ff8c1a] transition-colors cursor-pointer"
                >
                  Open Storyboard Suite
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {sceneShots.map((frame) => {
                return (
                  <div
                    key={frame.id}
                    className="p-2.5 rounded bg-[#2a2a2a] border border-[#3e3e3e] hover:border-[#ff8000]/60 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-400">
                        <span className="px-1.5 py-0.5 bg-[#1b1b1b] rounded text-white border border-[#444]">
                          #{frame.shotNumber}
                        </span>
                        <span>{frame.shotType}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {frame.durationSec}s
                      </span>
                    </div>

                    {/* Frame Preview / Thumbnail */}
                    <div
                      onClick={() => onOpenStoryboard && onOpenStoryboard(frame.id)}
                      className="relative aspect-video w-full rounded bg-[#181818] border border-[#383838] overflow-hidden flex items-center justify-center cursor-pointer group-hover:border-[#ff8000]/50"
                    >
                      {frame.imageUrl ? (
                        <img
                          src={frame.imageUrl}
                          alt={frame.description}
                          className="w-full h-full object-cover"
                        />
                      ) : frame.drawingData ? (
                        <img
                          src={frame.drawingData}
                          alt="Sketch"
                          className="w-full h-full object-contain bg-[#111]"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-500 space-y-1">
                          <Film className="w-5 h-5 opacity-40" />
                          <span className="text-[10px]">Click to sketch / edit</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-medium space-x-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Inspect Frame</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-mono">
                      <span className="px-1 bg-[#1e1e1e] rounded text-cyan-400 border border-[#333]">
                        {frame.lens}
                      </span>
                      <span>•</span>
                      <span className="truncate">{frame.cameraMovement}</span>
                    </div>

                    <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                      {frame.description}
                    </p>

                    {frame.dialogue && (
                      <div className="pl-2 border-l-2 border-amber-500/80 text-[10px] italic text-amber-200/90 bg-[#221c15] py-0.5 pr-1 rounded-r">
                        "{frame.dialogue}"
                      </div>
                    )}

                    {frame.audioNotes && (
                      <div className="flex items-center space-x-1 text-[10px] text-gray-400">
                        <Volume2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{frame.audioNotes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REVISION HISTORY / SCREENPLAY EDITS */}
      {activeTab === 'history' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#242424]">
          {/* Scope Switcher: This Scene vs Entire Project */}
          <div className="p-2 border-b border-[#333] bg-[#202020] space-y-2">
            <div className="flex items-center space-x-1 bg-[#161616] p-1 rounded border border-[#333]">
              <button
                onClick={() => setHistoryScope('scene')}
                className={`flex-1 py-1 px-2 rounded font-semibold text-[11px] transition-colors flex items-center justify-center space-x-1.5 ${
                  historyScope === 'scene'
                    ? 'bg-[#2b2b2b] text-[#ff8000] shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>This Scene</span>
                <span className="px-1.5 py-0.2 bg-[#333] text-gray-300 rounded-full text-[10px]">
                  {selectedScene ? `Sc. ${selectedScene.sceneNumber}` : 'None'}
                </span>
              </button>
              <button
                onClick={() => setHistoryScope('project')}
                className={`flex-1 py-1 px-2 rounded font-semibold text-[11px] transition-colors flex items-center justify-center space-x-1.5 ${
                  historyScope === 'project'
                    ? 'bg-[#2b2b2b] text-[#ff8000] shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>Entire Project</span>
                <span className="px-1.5 py-0.2 bg-[#333] text-gray-300 rounded-full text-[10px]">
                  {revisions.length}
                </span>
              </button>
            </div>

            {/* Production Draft Status Bar & New Draft Button */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-[#1b1b1b] rounded border border-[#383838]">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: activeDraftColor }}
                />
                <span className="text-[11px] font-medium text-gray-200 truncate">
                  {activeDraftName}
                </span>
              </div>
              <button
                onClick={() => setShowDraftModal(!showDraftModal)}
                className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60 transition-colors"
                title="Mark a new production draft milestone"
              >
                <Bookmark className="w-3 h-3" />
                <span>+ New Draft</span>
              </button>
            </div>

            {/* Inline New Draft Modal / Form */}
            {showDraftModal && (
              <form onSubmit={handleCreateDraft} className="p-2.5 bg-[#191919] rounded border border-[#444] space-y-2 mt-1 shadow-lg">
                <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold border-b border-[#333] pb-1">
                  <span className="flex items-center space-x-1">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Create Production Draft</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDraftModal(false)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Draft Label / Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Pink Revision Draft"
                    value={newDraftName}
                    onChange={(e) => setNewDraftName(e.target.value)}
                    className="w-full bg-[#121212] text-gray-200 px-2 py-1 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Standard Production Color</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {draftColorOptions.map((opt) => (
                      <button
                        key={opt.color}
                        type="button"
                        onClick={() => setNewDraftColor(opt.color)}
                        className={`flex items-center space-x-1.5 px-1.5 py-1 rounded text-[10px] border transition-colors ${
                          newDraftColor === opt.color
                            ? 'border-amber-400 bg-[#292929] text-white'
                            : 'border-[#333] bg-[#1c1c1c] text-gray-400 hover:bg-[#222]'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                        <span className="truncate">{opt.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-1.5 pt-1 border-t border-[#333]">
                  <button
                    type="button"
                    onClick={() => setShowDraftModal(false)}
                    className="px-2 py-0.5 rounded text-[10px] text-gray-400 hover:bg-[#282828]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newDraftName.trim()}
                    className="px-2.5 py-0.5 rounded text-[10px] bg-[#ff8000] text-black font-semibold hover:bg-amber-400 disabled:opacity-40 transition-colors"
                  >
                    Lock Draft
                  </button>
                </div>
              </form>
            )}

            {/* Search and Type Filters */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-500" />
              <input
                type="text"
                placeholder="Search edits, dialogue, notes..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-[#181818] text-gray-200 pl-7 pr-2 py-1 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1 py-0.5 text-[10px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'edits', label: 'Edits' },
                { id: 'elements', label: 'Added/Del' },
                { id: 'types', label: 'Types' },
                { id: 'drafts', label: 'Milestones' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setHistoryTypeFilter(pill.id)}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                    historyTypeFilter === pill.id
                      ? 'bg-amber-500/20 text-[#ff8000] border border-[#ff8000]/60 font-semibold'
                      : 'bg-[#181818] text-gray-400 hover:text-gray-200 border border-[#333]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Revisions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredRevisions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <History className="w-8 h-8 mx-auto text-gray-600" />
                <p className="font-medium text-gray-400">No revisions found</p>
                <p className="text-[11px] text-gray-500 max-w-[200px] mx-auto">
                  {historyScope === 'scene'
                    ? `No edits recorded for Scene ${selectedScene?.sceneNumber || '1'} yet.`
                    : 'No edits matching your current search or type filter.'}
                </p>
                {historyScope === 'scene' && revisions.length > 0 && (
                  <button
                    onClick={() => setHistoryScope('project')}
                    className="mt-2 text-xs text-[#ff8000] hover:underline"
                  >
                    View Entire Project ({revisions.length} edits)
                  </button>
                )}
              </div>
            ) : (
              filteredRevisions.map((rev) => {
                const isReverted = revertedRevisionId === rev.id;
                return (
                  <div
                    key={rev.id}
                    className={`p-3 rounded border transition-all ${
                      rev.changeType === 'draft_milestone'
                        ? 'bg-[#1a1f2c] border-purple-800/60 shadow-md'
                        : 'bg-[#2b2b2b] border-[#444] shadow'
                    }`}
                  >
                    {/* Header: Author, Time, Type Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              rev.draftColor || (rev.changeType === 'draft_milestone' ? '#a855f7' : '#ff8000')
                          }}
                        />
                        <span className="font-bold text-amber-400 text-xs">{rev.author}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{rev.dateFormatted}</span>
                    </div>

                    {/* Meta bar: Scene pill, change type badge, element type */}
                    <div className="flex items-center flex-wrap gap-1.5 mb-2">
                      {rev.sceneNumber && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1a1a1a] text-cyan-400 border border-[#3e3e3e]">
                          Scene {rev.sceneNumber}
                        </span>
                      )}

                      {rev.elementType && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1f1f1f] text-gray-300 border border-[#3a3a3a] font-mono">
                          {rev.elementType}
                        </span>
                      )}

                      {rev.changeType === 'text_edit' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/70 text-blue-300 border border-blue-800/60 flex items-center space-x-1">
                          <FileEdit className="w-2.5 h-2.5" />
                          <span>EDIT</span>
                        </span>
                      )}

                      {rev.changeType === 'element_added' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 flex items-center space-x-1">
                          <PlusCircle className="w-2.5 h-2.5" />
                          <span>ADDED</span>
                        </span>
                      )}

                      {rev.changeType === 'element_deleted' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/70 text-red-300 border border-red-800/60 flex items-center space-x-1">
                          <MinusCircle className="w-2.5 h-2.5" />
                          <span>DELETED</span>
                        </span>
                      )}

                      {rev.changeType === 'element_type_changed' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800/60 flex items-center space-x-1">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          <span>TYPE</span>
                        </span>
                      )}

                      {rev.changeType === 'draft_milestone' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/70 text-purple-200 border border-purple-700/60 flex items-center space-x-1">
                          <Bookmark className="w-2.5 h-2.5" />
                          <span>{rev.draftLabel || 'MILESTONE'}</span>
                        </span>
                      )}
                    </div>

                    {/* Change Description */}
                    <p className="text-gray-200 text-xs leading-relaxed mb-2">
                      {rev.description}
                    </p>

                    {/* Diff Visualization (Previous vs Revised) */}
                    {(rev.previousText || rev.newText) && (
                      <div className="space-y-1.5 mb-2 font-mono text-[11px]">
                        {/* Previous Text (Red Strikethrough) */}
                        {rev.previousText && (
                          <div className="p-1.5 rounded bg-red-950/40 border border-red-900/50 text-red-300/90 leading-tight">
                            <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold block mb-0.5">
                              Previous:
                            </span>
                            <span className="line-through opacity-85 select-text">
                              "{rev.previousText}"
                            </span>
                          </div>
                        )}

                        {/* Revised Text (Green Highlight) */}
                        {rev.newText && rev.changeType !== 'element_deleted' && (
                          <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 leading-tight">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">
                              Revised:
                            </span>
                            <span className="select-text">"{rev.newText}"</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Actions: Revert / Restore */}
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#383838]">
                      {rev.draftLabel ? (
                        <span className="text-gray-400 text-[10px] flex items-center space-x-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: rev.draftColor || '#3b82f6' }}
                          />
                          <span>{rev.draftLabel}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[10px]">
                          {rev.sceneHeading ? rev.sceneHeading.slice(0, 24) + '...' : 'Screenplay element'}
                        </span>
                      )}

                      {onRevertRevision && (rev.previousText || rev.changeType === 'element_added') && (
                        <button
                          onClick={() => handleRevert(rev)}
                          disabled={isReverted}
                          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            isReverted
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                              : 'bg-[#202020] text-gray-300 hover:text-amber-400 hover:bg-[#333] border border-[#3e3e3e]'
                          }`}
                          title="Restore original text or revert this change"
                        >
                          {isReverted ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Restored!</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3 h-3" />
                              <span>Revert Edit</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SCENE CONTINUITY CHECK */}
      {activeTab === 'continuity' && continuityReport && (
        <SceneContinuityPanel
          report={continuityReport}
          selectedScene={selectedScene}
          onJumpToOccurrence={(sceneId, elementId) =>
            onJumpToOccurrence?.(sceneId, elementId)
          }
          onAcknowledgeAlert={(alertId) => onAcknowledgeContinuity?.(alertId)}
          onRestoreAlert={(alertId) => onRestoreContinuity?.(alertId)}
          onOpenFullModal={() => onOpenContinuityModal?.()}
        />
      )}

      {/* TAB 7: SPELL CHECK & GRAMMAR CHECK */}
      {activeTab === 'proofread' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#242424]">
          <div className="p-2.5 border-b border-[#333] bg-[#1e1e1e] space-y-2">
            {/* Scope Toggle: This Scene vs Entire Project */}
            <div className="flex flex-wrap gap-1 p-0.5 bg-[#151515] rounded border border-[#3a3a3a]">
              <button
                type="button"
                onClick={() => setProofreadScope('scene')}
                className={`flex-1 min-w-fit px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  proofreadScope === 'scene'
                    ? 'bg-[#2d2d2d] text-[#ff8000]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                This Scene {selectedScene ? `(#${selectedScene.sceneNumber})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setProofreadScope('project')}
                className={`flex-1 min-w-fit px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  proofreadScope === 'project'
                    ? 'bg-[#2d2d2d] text-[#ff8000]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Entire Project
              </button>
            </div>

            {/* Kind Filter: All / Spell Check / Grammar Check */}
            <div className="flex flex-wrap gap-1 p-0.5 bg-[#151515] rounded border border-[#3a3a3a] tabular-nums">
              <button
                type="button"
                onClick={() => setProofreadFilter('all')}
                className={`flex-1 min-w-fit px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                  proofreadFilter === 'all'
                    ? 'bg-[#2d2d2d] text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All ({totalProofreadCount})
              </button>
              <button
                type="button"
                onClick={() => setProofreadFilter('spelling')}
                className={`flex-1 min-w-fit px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                  proofreadFilter === 'spelling'
                    ? 'bg-[#2d2d2d] text-amber-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Spelling ({proofreadReport.spellingCount})
              </button>
              <button
                type="button"
                onClick={() => setProofreadFilter('grammar')}
                className={`flex-1 min-w-fit px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                  proofreadFilter === 'grammar'
                    ? 'bg-[#2d2d2d] text-cyan-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Grammar ({proofreadReport.grammarCount})
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span className="tabular-nums">
                Scanned {proofreadReport.totalElementsScanned} blocks
              </span>
              {filteredProofreadIssues.some((i) => i.safeAutoFix && i.suggestion) &&
                onApplyElementTextFix && (
                  <button
                    type="button"
                    onClick={() => {
                      // Apply first safe fix per element sequentially on latest elements array
                      const handledElementIds = new Set<string>();
                      filteredProofreadIssues.forEach((issue: ProofreadIssue) => {
                        if (!issue.safeAutoFix || !issue.suggestion) return;
                        if (handledElementIds.has(issue.elementId)) return;
                        const targetEl = elements.find((e) => e.id === issue.elementId);
                        if (!targetEl) return;
                        const fixed = applyProofreadFixToText(targetEl.text, issue);
                        if (fixed !== targetEl.text) {
                          handledElementIds.add(issue.elementId);
                          onApplyElementTextFix(
                            issue.elementId,
                            fixed,
                            `Auto-fixed ${issue.kind}: "${issue.wordOrPhrase}" → "${issue.suggestion}"`
                          );
                        }
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold text-[10px]"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Fix Safe Issues</span>
                  </button>
                )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredProofreadIssues.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-2 text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-400" />
                <p className="text-xs font-semibold text-gray-200">
                  No {proofreadFilter === 'all' ? 'Spelling or Grammar' : proofreadFilter} Issues Found
                </p>
                <p className="text-[11px] text-gray-500">
                  {proofreadScope === 'scene'
                    ? 'The current scene looks clean. Switch to Entire Project to audit all scenes.'
                    : 'All scanned screenplay blocks pass current spelling and grammar checks.'}
                </p>
              </div>
            ) : (
              filteredProofreadIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-[#2c2c2c] border border-[#3e3e3e] rounded p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span
                      className={`font-semibold uppercase tracking-wide flex items-center gap-1 ${
                        issue.kind === 'spelling' ? 'text-amber-300' : 'text-cyan-300'
                      }`}
                    >
                      {issue.kind === 'spelling' ? (
                        <SpellCheck className="w-3 h-3" />
                      ) : (
                        <BookCheck className="w-3 h-3" />
                      )}
                      <span>{issue.kind}</span>
                    </span>
                    <span className="text-gray-400 font-mono tabular-nums truncate">
                      {issue.sceneNumber ? `Sc ${issue.sceneNumber} · ` : ''}
                      {issue.elementType.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-200 leading-snug">{issue.message}</p>

                  <div className="bg-[#1b1b1b] border border-[#353535] rounded px-2 py-1.5 font-mono text-[11px] text-gray-300 select-text">
                    {issue.excerpt}
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                    {issue.suggestion && onApplyElementTextFix && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetEl = elements.find((e) => e.id === issue.elementId);
                          if (!targetEl) return;
                          const updated = applyProofreadFixToText(targetEl.text, issue);
                          onApplyElementTextFix(
                            issue.elementId,
                            updated,
                            `${issue.kind === 'spelling' ? 'Spell' : 'Grammar'} fix: "${issue.wordOrPhrase}" → "${issue.suggestion}"`
                          );
                        }}
                        className="px-2 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold text-[10px]"
                      >
                        Fix → "{issue.suggestion}"
                      </button>
                    )}

                    {issue.kind === 'spelling' && onAddToDictionary && (
                      <button
                        type="button"
                        onClick={() => onAddToDictionary(issue.wordOrPhrase)}
                        className="px-2 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#444] text-gray-300 text-[10px]"
                      >
                        Ignore / Dictionary
                      </button>
                    )}

                    {onJumpToElement && (
                      <button
                        type="button"
                        onClick={() => onJumpToElement(issue.sceneId, issue.elementId)}
                        className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded bg-[#222] hover:bg-[#333] border border-[#444] text-gray-300 text-[10px]"
                        title="Focus element in script"
                      >
                        <span>Jump</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: CHARACTER INFO (This Scene vs Entire Project) */}
      {activeTab === 'characters' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[#242424]">
          <div className="p-2.5 border-b border-[#333] bg-[#1e1e1e] space-y-2">
            <div className="grid grid-cols-2 p-0.5 bg-[#151515] rounded border border-[#3a3a3a]">
              <button
                type="button"
                onClick={() => setCharacterInfoScope('scene')}
                className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                  characterInfoScope === 'scene'
                    ? 'bg-[#2d2d2d] text-[#ff8000]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                This Scene {selectedScene ? `(#${selectedScene.sceneNumber})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setCharacterInfoScope('project')}
                className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                  characterInfoScope === 'project'
                    ? 'bg-[#2d2d2d] text-[#ff8000]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Entire Project
              </button>
            </div>

            {onOpenCharactersWorkspace && (
              <button
                type="button"
                onClick={onOpenCharactersWorkspace}
                className="w-full py-1.5 px-2.5 rounded bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] text-amber-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Open Full Characters & Node Connections</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {characterInfoRows.length === 0 ? (
              <div className="text-center py-8 text-gray-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-gray-600" />
                <p className="text-xs text-gray-300">No characters found in this scope.</p>
              </div>
            ) : (
              characterInfoRows.map((ch) => (
                <div
                  key={ch.name}
                  className="bg-[#2c2c2c] border border-[#3e3e3e] rounded p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        <span className="font-bold text-gray-100 truncate">{ch.name}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {ch.roleType}
                        {ch.actor ? ` · Cast: ${ch.actor}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 tabular-nums shrink-0">
                      {ch.dialogueLines} dl{ch.voiceOverLines > 0 ? ` · ${ch.voiceOverLines} vo` : ''}
                    </span>
                  </div>

                  {ch.summary && (
                    <p className="text-[11px] text-gray-300 leading-relaxed">{ch.summary}</p>
                  )}

                  {ch.arc && (
                    <div className="text-[10px] text-gray-400 pt-1 border-t border-[#383838]">
                      <span className="text-gray-300 font-medium">Arc: </span>
                      {ch.arc}
                    </div>
                  )}

                  {ch.wardrobeNotes && (
                    <div className="text-[10px] text-gray-400">
                      <span className="text-gray-300 font-medium">Wardrobe: </span>
                      {ch.wardrobeNotes}
                    </div>
                  )}

                  {ch.propsCarried.length > 0 && (
                    <div className="text-[10px] text-gray-400">
                      <span className="text-gray-300 font-medium">Props: </span>
                      {ch.propsCarried.join(' · ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
