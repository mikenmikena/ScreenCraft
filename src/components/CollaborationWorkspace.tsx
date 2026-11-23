import React, { useMemo, useState } from 'react';
import {
  CollaboratorProfile,
  CollaboratorSuggestion,
  ElementType,
  StoryProject,
  SuggestionKind,
  SuggestionStatus,
} from '../types/story';
import {
  Users,
  UserPlus,
  GitPullRequest,
  Check,
  X,
  RotateCcw,
  Trash2,
  ArrowUpRight,
  Palette,
  MessageSquarePlus,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface CollaborationWorkspaceProps {
  project: StoryProject;
  initialSelectedSuggestionId?: string | null;
  onUpdateCollaborators: (collaborators: CollaboratorProfile[]) => void;
  onAddSuggestion: (
    suggestion: Omit<CollaboratorSuggestion, 'id' | 'createdAt' | 'status'>
  ) => void;
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  onReopenSuggestion: (suggestionId: string) => void;
  onDeleteSuggestion: (suggestionId: string) => void;
  onJumpToSceneElement: (sceneId?: string, elementId?: string) => void;
}

const COLOR_SWATCHES = [
  '#06b6d4', // Cyan
  '#a855f7', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#84cc16', // Lime
];

const KIND_LABELS: Record<SuggestionKind, string> = {
  edit_text: 'Edit Master Text',
  insert_after: 'Insert Block After',
  delete_element: 'Flag Line Removal',
  note: 'Margin Review Note',
};

const INSERTABLE_TYPES: { value: ElementType; label: string }[] = [
  { value: 'ACTION', label: 'Action' },
  { value: 'CHARACTER', label: 'Character' },
  { value: 'DIALOGUE', label: 'Dialogue' },
  { value: 'VOICE_OVER', label: 'Voice-over (V.O.)' },
  { value: 'PARENTHETICAL', label: 'Parenthetical' },
  { value: 'SHOT', label: 'Shot' },
  { value: 'SCENE_HEADING', label: 'Scene Heading' },
  { value: 'TRANSITION', label: 'Transition' },
  { value: 'NOTE', label: 'Script Note' },
];

export const CollaborationWorkspace: React.FC<CollaborationWorkspaceProps> = ({
  project,
  initialSelectedSuggestionId,
  onUpdateCollaborators,
  onAddSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  onReopenSuggestion,
  onDeleteSuggestion,
  onJumpToSceneElement,
}) => {
  const collaborators = useMemo(() => project.collaborators || [], [project.collaborators]);
  const suggestions = useMemo(
    () => project.collaboratorSuggestions || [],
    [project.collaboratorSuggestions]
  );

  const [activeCollaboratorId, setActiveCollaboratorId] = useState<string>(
    () => collaborators[0]?.id || ''
  );
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | SuggestionStatus>('all');
  const [filterSceneId, setFilterSceneId] = useState<string>('all');
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState<string | null>(
    initialSelectedSuggestionId || null
  );

  // Add Contributor Inline Form
  const [isAddingCollab, setIsAddingCollab] = useState(false);
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabRole, setNewCollabRole] = useState('Script Consultant');
  const [newCollabEmail, setNewCollabEmail] = useState('');
  const [newCollabColor, setNewCollabColor] = useState(
    () => COLOR_SWATCHES[collaborators.length % COLOR_SWATCHES.length]
  );
  const [newCollabExternal, setNewCollabExternal] = useState(true);

  // Compose Suggestion Form
  const [composeSceneId, setComposeSceneId] = useState<string>(
    () => project.scenes[0]?.id || ''
  );
  const [composeElementId, setComposeElementId] = useState<string>('');
  const [composeKind, setComposeKind] = useState<SuggestionKind>('edit_text');
  const [composeElementType, setComposeElementType] = useState<ElementType>('DIALOGUE');
  const [composeText, setComposeText] = useState('');
  const [composeRationale, setComposeRationale] = useState('');

  React.useEffect(() => {
    if (initialSelectedSuggestionId) {
      setHighlightedSuggestionId(initialSelectedSuggestionId);
    }
  }, [initialSelectedSuggestionId]);

  React.useEffect(() => {
    if (!activeCollaboratorId && collaborators.length > 0) {
      setActiveCollaboratorId(collaborators[0].id);
    }
  }, [activeCollaboratorId, collaborators]);

  const collaboratorById = useMemo(() => {
    const map = new Map<string, CollaboratorProfile>();
    collaborators.forEach((c) => map.set(c.id, c));
    return map;
  }, [collaborators]);

  const sceneById = useMemo(() => {
    const map = new Map(project.scenes.map((s) => [s.id, s]));
    return map;
  }, [project.scenes]);

  const elementById = useMemo(() => {
    const map = new Map(project.elements.map((el) => [el.id, el]));
    return map;
  }, [project.elements]);

  const sceneElements = useMemo(() => {
    if (!composeSceneId) return project.elements.slice(0, 40);
    return project.elements.filter((el) => el.sceneId === composeSceneId);
  }, [project.elements, composeSceneId]);

  const targetMasterElement = useMemo(() => {
    if (composeElementId) {
      return elementById.get(composeElementId) || null;
    }
    return sceneElements[0] || null;
  }, [composeElementId, elementById, sceneElements]);

  const counts = useMemo(() => {
    const pending = suggestions.filter((s) => s.status === 'pending').length;
    const accepted = suggestions.filter((s) => s.status === 'accepted').length;
    const rejected = suggestions.filter((s) => s.status === 'rejected').length;
    const externalCount = collaborators.filter((c) => c.isExternal).length;
    return { pending, accepted, rejected, externalCount };
  }, [suggestions, collaborators]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (filterCollaboratorId !== 'all' && s.collaboratorId !== filterCollaboratorId) {
        return false;
      }
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterSceneId !== 'all' && s.sceneId !== filterSceneId) return false;
      return true;
    });
  }, [suggestions, filterCollaboratorId, filterStatus, filterSceneId]);

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCollabName.trim();
    if (!trimmed) return;
    const created: CollaboratorProfile = {
      id: `collab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: trimmed,
      role: newCollabRole.trim() || 'Outside Contributor',
      color: newCollabColor,
      email: newCollabEmail.trim() || undefined,
      isExternal: newCollabExternal,
      addedAt: new Date().toLocaleDateString(),
    };
    const next = [...collaborators, created];
    onUpdateCollaborators(next);
    setActiveCollaboratorId(created.id);
    setNewCollabName('');
    setNewCollabEmail('');
    setNewCollabColor(COLOR_SWATCHES[next.length % COLOR_SWATCHES.length]);
    setIsAddingCollab(false);
  };

  const handleUpdateCollaboratorColor = (collabId: string, color: string) => {
    onUpdateCollaborators(
      collaborators.map((c) => (c.id === collabId ? { ...c, color } : c))
    );
  };

  const handleRemoveCollaborator = (collabId: string) => {
    const next = collaborators.filter((c) => c.id !== collabId);
    onUpdateCollaborators(next);
    if (activeCollaboratorId === collabId) {
      setActiveCollaboratorId(next[0]?.id || '');
    }
  };

  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    const activeCollab =
      collaboratorById.get(activeCollaboratorId) || collaborators[0];
    if (!activeCollab) return;

    const chosenElement =
      composeElementId && elementById.has(composeElementId)
        ? elementById.get(composeElementId)
        : sceneElements[0];

    if (composeKind !== 'delete_element' && !composeText.trim()) return;

    onAddSuggestion({
      collaboratorId: activeCollab.id,
      sceneId: composeSceneId || chosenElement?.sceneId,
      elementId: chosenElement?.id,
      kind: composeKind,
      proposedElementType: composeKind === 'insert_after' ? composeElementType : undefined,
      originalTextSnapshot: chosenElement?.text || '',
      proposedText:
        composeKind === 'delete_element'
          ? `[Suggested removal of ${chosenElement?.type || 'element'}]`
          : composeText.trim(),
      rationale: composeRationale.trim() || undefined,
    });

    setComposeText('');
    setComposeRationale('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#181818] text-xs text-gray-200 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-[#212121] border-b border-[#343434] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <GitPullRequest className="w-4 h-4 text-[#ff8000] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-100 truncate">
              Non-Destructive Team Collaboration &amp; Color Redlines
            </h2>
            <p className="text-[11px] text-gray-400 truncate">
              Assign unique contributor colors. Outside edits &amp; notes stay isolated in their color outline until accepted into the master script.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] tabular-nums shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Protected</span>
          </div>
          <span className="text-gray-600">·</span>
          <span className="text-amber-300 font-semibold">{counts.pending} Pending</span>
          <span className="text-gray-600">·</span>
          <span className="text-emerald-400">{counts.accepted} Accepted</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-400">{collaborators.length} Contributors ({counts.externalCount} External)</span>
        </div>
      </div>

      {/* Main Split: Left Roster & Composer | Right Non-Destructive Suggestion Feed */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Contributor Roster + Non-Destructive Proposal Composer */}
        <aside className="lg:col-span-5 xl:col-span-4 bg-[#1c1c1c] border-r border-[#333333] overflow-y-auto p-4 space-y-5">
          {/* Section 1: Contributors & Assignable Color Codes */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ff8000]" />
                <span>Contributors &amp; Color Codes</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCollab((p) => !p)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2a2a2a] hover:bg-[#343434] border border-[#444] text-amber-300 font-medium"
              >
                <UserPlus className="w-3 h-3" />
                <span>Add Contributor</span>
              </button>
            </div>

            {isAddingCollab && (
              <form
                onSubmit={handleAddCollaborator}
                className="bg-[#151515] border border-[#3c3c3c] rounded p-3 space-y-2.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newCollabName}
                    onChange={(e) => setNewCollabName(e.target.value)}
                    placeholder="Contributor name..."
                    className="bg-[#1e1e1e] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                  <input
                    type="text"
                    value={newCollabRole}
                    onChange={(e) => setNewCollabRole(e.target.value)}
                    placeholder="Role (e.g. Script Doctor)"
                    className="bg-[#1e1e1e] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <input
                    type="email"
                    value={newCollabEmail}
                    onChange={(e) => setNewCollabEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="bg-[#1e1e1e] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                  <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCollabExternal}
                      onChange={(e) => setNewCollabExternal(e.target.checked)}
                      className="accent-[#ff8000]"
                    />
                    <span>Outside Contributor</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Palette className="w-3.5 h-3.5 text-gray-400" />
                    {COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setNewCollabColor(hex)}
                        className={`w-5 h-5 rounded border-2 transition-transform ${
                          newCollabColor === hex
                            ? 'border-white scale-110'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Assign color ${hex}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={newCollabColor}
                      onChange={(e) => setNewCollabColor(e.target.value)}
                      className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                      title="Pick custom color"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <div className="p-3 bg-[#161616] border border-[#2f2f2f] rounded text-gray-400">
                  No contributors added yet. Add a contributor to assign an outline color.
                </div>
              ) : (
                collaborators.map((collab) => {
                  const isActive = collab.id === activeCollaboratorId;
                  const pendingForCollab = suggestions.filter(
                    (s) => s.collaboratorId === collab.id && s.status === 'pending'
                  ).length;
                  return (
                    <div
                      key={collab.id}
                      onClick={() => setActiveCollaboratorId(collab.id)}
                      className={`p-2.5 rounded border-2 cursor-pointer transition-colors ${
                        isActive ? 'bg-[#232323]' : 'bg-[#171717] hover:bg-[#1e1e1e]'
                      }`}
                      style={{ borderColor: collab.color }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="color"
                            value={collab.color}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateCollaboratorColor(collab.id, e.target.value)
                            }
                            className="w-5 h-5 rounded bg-transparent border-0 cursor-pointer shrink-0"
                            title="Change assigned contributor outline color"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-100 truncate">
                              {collab.name}
                              {isActive && (
                                <span
                                  className="ml-1.5 text-[10px] font-mono"
                                  style={{ color: collab.color }}
                                >
                                  (Posting As)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {collab.role}
                              {collab.isExternal ? ' · Outside Contributor' : ' · Internal Team'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-mono tabular-nums text-gray-300">
                            {pendingForCollab} open
                          </span>
                          {collaborators.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCollaborator(collab.id);
                              }}
                              className="p-1 text-gray-500 hover:text-rose-400 rounded"
                              title="Remove contributor"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Section 2: Add Non-Destructive Change or Note */}
          <section className="border-t border-[#323232] pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Propose Non-Destructive Change / Note</span>
            </h3>

            <form onSubmit={handleSubmitSuggestion} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-gray-400">Contributor</span>
                  <select
                    value={activeCollaboratorId}
                    onChange={(e) => setActiveCollaboratorId(e.target.value)}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] text-gray-400">Proposal Type</span>
                  <select
                    value={composeKind}
                    onChange={(e) => setComposeKind(e.target.value as SuggestionKind)}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {(Object.keys(KIND_LABELS) as SuggestionKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-gray-400">Target Scene</span>
                  <select
                    value={composeSceneId}
                    onChange={(e) => {
                      setComposeSceneId(e.target.value);
                      setComposeElementId('');
                    }}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {project.scenes.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        Sc. {sc.sceneNumber} — {sc.heading}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] text-gray-400">Target Script Block</span>
                  <select
                    value={composeElementId || sceneElements[0]?.id || ''}
                    onChange={(e) => setComposeElementId(e.target.value)}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {sceneElements.map((el) => (
                      <option key={el.id} value={el.id}>
                        [{el.type}] {el.text.slice(0, 56) || '(empty)'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {targetMasterElement && (
                <div className="bg-[#141414] border border-[#2f2f2f] rounded p-2 text-[11px] space-y-1">
                  <div className="text-gray-500 font-semibold">
                    Current Master Script ({targetMasterElement.type}):
                  </div>
                  <div className="font-mono text-gray-300 leading-relaxed max-h-20 overflow-y-auto">
                    {targetMasterElement.text || '(empty block)'}
                  </div>
                </div>
              )}

              {composeKind === 'insert_after' && (
                <label className="space-y-1 block">
                  <span className="text-[11px] text-gray-400">New Element Type</span>
                  <select
                    value={composeElementType}
                    onChange={(e) => setComposeElementType(e.target.value as ElementType)}
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {INSERTABLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {composeKind !== 'delete_element' && (
                <label className="space-y-1 block">
                  <span className="text-[11px] text-gray-400">
                    {composeKind === 'note' ? 'Contributor Note' : 'Proposed Replacement / New Text'}
                  </span>
                  <textarea
                    rows={3}
                    required
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder={
                      composeKind === 'note'
                        ? 'Add story feedback, continuity question, or pacing note...'
                        : 'Enter suggested rewrite or new block copy (original stays untouched)...'
                    }
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-2 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </label>
              )}

              <label className="space-y-1 block">
                <span className="text-[11px] text-gray-400">Rationale / Note Context (optional)</span>
                <input
                  type="text"
                  value={composeRationale}
                  onChange={(e) => setComposeRationale(e.target.value)}
                  placeholder="Why this change helps scene pacing or character voice..."
                  className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                />
              </label>

              <button
                type="submit"
                disabled={collaborators.length === 0}
                className="w-full py-2 rounded bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Color-Outlined Suggestion</span>
              </button>
            </form>
          </section>
        </aside>

        {/* Right Column: Color-Outlined Non-Destructive Redline Feed */}
        <main className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 bg-[#141414]">
          {/* Filter Bar */}
          <div className="bg-[#1b1b1b] border-b border-[#323232] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center p-0.5 bg-[#121212] border border-[#353535] rounded">
                {(['all', 'pending', 'accepted', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                      filterStatus === st
                        ? 'bg-[#2d2d2d] text-[#ff8000]'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                value={filterCollaboratorId}
                onChange={(e) => setFilterCollaboratorId(e.target.value)}
                className="bg-[#121212] border border-[#353535] rounded px-2.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#ff8000]"
              >
                <option value="all">All Contributors</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSceneId}
                onChange={(e) => setFilterSceneId(e.target.value)}
                className="bg-[#121212] border border-[#353535] rounded px-2.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#ff8000]"
              >
                <option value="all">All Scenes</option>
                {project.scenes.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    Sc. {sc.sceneNumber} — {sc.setting}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-gray-400 tabular-nums">
              Showing {filteredSuggestions.length} of {suggestions.length} proposals
            </span>
          </div>

          {/* Suggestions Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredSuggestions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2 py-12">
                <GitPullRequest className="w-10 h-10 text-gray-600" />
                <p className="text-sm font-semibold text-gray-200">
                  No Collaborator Proposals Found
                </p>
                <p className="text-xs text-gray-500 max-w-md">
                  Select a contributor on the left to add color-outlined rewrites, insertions, or notes without altering your master screenplay.
                </p>
              </div>
            ) : (
              filteredSuggestions.map((item) => {
                const collab = collaboratorById.get(item.collaboratorId);
                const outlineColor = collab?.color || '#06b6d4';
                const sc = item.sceneId ? sceneById.get(item.sceneId) : undefined;
                const liveMaster = item.elementId ? elementById.get(item.elementId) : undefined;
                const isSelected = highlightedSuggestionId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setHighlightedSuggestionId(item.id)}
                    className={`rounded-lg border-2 p-3.5 transition-all space-y-2.5 ${
                      isSelected ? 'bg-[#1e1e1e]' : 'bg-[#191919]'
                    }`}
                    style={{
                      borderColor: outlineColor,
                      boxShadow: isSelected
                        ? `0 0 0 1px ${outlineColor}, 0 8px 24px -8px ${outlineColor}40`
                        : `0 0 12px -6px ${outlineColor}30`,
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: outlineColor }}
                        />
                        <span className="font-bold text-gray-100 truncate">
                          {collab?.name || 'Contributor'}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate">
                          {collab?.role || 'Reviewer'}
                          {collab?.isExternal ? ' · Outside' : ''}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: outlineColor }}
                        >
                          {KIND_LABELS[item.kind]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px]">
                        <span className="text-gray-400">{item.createdAt}</span>
                        <span
                          className={`font-semibold uppercase tracking-wide ${
                            item.status === 'accepted'
                              ? 'text-emerald-400'
                              : item.status === 'rejected'
                              ? 'text-gray-500'
                              : 'text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Scene & Target Location */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 border-b border-[#2b2b2b] pb-2">
                      <div className="truncate">
                        {sc ? (
                          <span>
                            Sc. {sc.sceneNumber} — {sc.heading}
                          </span>
                        ) : (
                          <span>Project-wide proposal</span>
                        )}
                        {item.proposedElementType && (
                          <span className="ml-2 font-mono text-cyan-300">
                            [{item.proposedElementType}]
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onJumpToSceneElement(item.sceneId, item.elementId)}
                        className="flex items-center gap-1 text-amber-300 hover:underline whitespace-nowrap shrink-0"
                      >
                        <span>View in Script</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Original Master vs Color-Outlined Proposal */}
                    {item.kind !== 'note' && (item.originalTextSnapshot || liveMaster?.text) && (
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded p-2.5 space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                          Original Master Script (Untouched)
                        </div>
                        <div className="font-mono text-xs text-gray-400 leading-relaxed">
                          {liveMaster?.text || item.originalTextSnapshot}
                        </div>
                      </div>
                    )}

                    <div
                      className="rounded p-2.5 space-y-1 border"
                      style={{
                        borderColor: `${outlineColor}80`,
                        backgroundColor: `${outlineColor}14`,
                      }}
                    >
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: outlineColor }}
                      >
                        {item.kind === 'note'
                          ? 'Contributor Review Note'
                          : 'Proposed Non-Destructive Change'}
                      </div>
                      <div className="font-mono text-xs text-gray-100 leading-relaxed whitespace-pre-wrap">
                        {item.proposedText}
                      </div>
                    </div>

                    {item.rationale && (
                      <div className="text-[11px] text-gray-300 italic">
                        Note: {item.rationale}
                      </div>
                    )}

                    {/* Owner Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onAcceptSuggestion(item.id)}
                              className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                {item.kind === 'note' ? 'Resolve Note' : 'Accept & Apply to Master'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectSuggestion(item.id)}
                              className="flex items-center gap-1 px-3 py-1 rounded bg-[#2a2a2a] hover:bg-[#363636] border border-[#444] text-gray-300 font-medium transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Dismiss</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onReopenSuggestion(item.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#323232] border border-[#3e3e3e] text-amber-300 font-medium"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen Proposal</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteSuggestion(item.id)}
                        className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-rose-400 transition-colors"
                        title="Delete proposal record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
