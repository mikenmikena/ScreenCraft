import React, { useMemo, useState } from 'react';
import {
  CastingCandidate,
  CastingRoleOverride,
  CastingRolePriority,
  CastingRoleStatus,
  CastingStage,
  StoryProject,
} from '../types/story';
import { processUploadedImageFile } from '../utils/imageUpload';
import {
  UserCheck,
  Search,
  Plus,
  Star,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  Building2,
  Film,
  ExternalLink,
  RotateCcw,
  Users,
  Video,
  X,
} from 'lucide-react';

interface CastingWorkspacePanelProps {
  project: StoryProject;
  onUpdateCastingCandidates: (candidates: CastingCandidate[]) => void;
  onUpdateCastingRoleOverrides: (overrides: CastingRoleOverride[]) => void;
  onCastActorToRole: (
    characterName: string,
    candidate: {
      actorName: string;
      headshotUrl?: string;
      agentOrRep?: string;
      email?: string;
      phone?: string;
      unionStatus?: string;
      dayRateEstimate?: number;
    }
  ) => void;
  onClearCastActorForRole: (characterName: string) => void;
  onJumpToScene: (sceneId: string) => void;
  onOpenCastRoster?: () => void;
  onNotify: (msg: string) => void;
}

const CASTING_STAGES: CastingStage[] = [
  'Shortlist',
  'Self-Tape',
  'Callback',
  'Chemistry Read',
  'Offer Extended',
  'Cast',
  'Passed',
];

const ROLE_PRIORITIES: CastingRolePriority[] = [
  'Lead',
  'Principal',
  'Day Player',
  'Featured',
  'Voice Only',
];

const ROLE_STATUSES: CastingRoleStatus[] = [
  'Open / Uncast',
  'Reviewing Tapes',
  'Callbacks',
  'Offer Out',
  'Cast',
];

const STAGE_BADGE_STYLES: Record<CastingStage, string> = {
  Shortlist: 'bg-[#25252b] text-gray-200 border-[#3d3d47]',
  'Self-Tape': 'bg-sky-950/50 text-sky-300 border-sky-700/50',
  Callback: 'bg-amber-950/50 text-amber-300 border-amber-700/50',
  'Chemistry Read': 'bg-violet-950/50 text-violet-300 border-violet-700/50',
  'Offer Extended': 'bg-orange-950/60 text-orange-300 border-orange-600/60',
  Cast: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60',
  Passed: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
};

const ROLE_STATUS_BADGE: Record<CastingRoleStatus, string> = {
  'Open / Uncast': 'bg-[#26262c] text-gray-300 border-[#3a3a44]',
  'Reviewing Tapes': 'bg-sky-950/50 text-sky-300 border-sky-700/50',
  Callbacks: 'bg-amber-950/50 text-amber-300 border-amber-700/50',
  'Offer Out': 'bg-orange-950/60 text-orange-300 border-orange-600/60',
  Cast: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60',
};

type RoleFilter = 'all' | 'uncast' | 'callbacks' | 'offer' | 'cast';

const isSafeHttpUrl = (value?: string) => {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export const CastingWorkspacePanel: React.FC<CastingWorkspacePanelProps> = ({
  project,
  onUpdateCastingCandidates,
  onUpdateCastingRoleOverrides,
  onCastActorToRole,
  onClearCastActorForRole,
  onJumpToScene,
  onOpenCastRoster,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedRoleName, setSelectedRoleName] = useState<string>(
    () => project.characters[0]?.name?.trim().toUpperCase() || ''
  );

  // Add Candidate form state
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [candActorName, setCandActorName] = useState('');
  const [candHeadshotUrl, setCandHeadshotUrl] = useState('');
  const [candStage, setCandStage] = useState<CastingStage>('Shortlist');
  const [candRating, setCandRating] = useState<number>(4);
  const [candAgent, setCandAgent] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candUnion, setCandUnion] = useState('SAG-AFTRA');
  const [candDayRate, setCandDayRate] = useState('1200');
  const [candReelLink, setCandReelLink] = useState('');
  const [candNotes, setCandNotes] = useState('');

  const candidates = project.castingCandidates || [];
  const roleOverrides = project.castingRoleOverrides || [];
  const crewMembers = project.crewMembers || [];

  const roles = useMemo(() => {
    const nameSet = new Set<string>();
    project.characters.forEach((c) => {
      if (c.name.trim()) nameSet.add(c.name.trim().toUpperCase());
    });
    (project.projectBible?.characterBios || []).forEach((b) => {
      if (b.characterName.trim()) nameSet.add(b.characterName.trim().toUpperCase());
    });
    candidates.forEach((cand) => {
      if (cand.characterName.trim()) nameSet.add(cand.characterName.trim().toUpperCase());
    });

    return Array.from(nameSet).map((upperName, idx) => {
      const charRec = project.characters.find(
        (c) => c.name.trim().toUpperCase() === upperName
      );
      const bioRec = (project.projectBible?.characterBios || []).find(
        (b) => b.characterName.trim().toUpperCase() === upperName
      );
      const breakdownRec = (project.characterBreakdowns || []).find(
        (b) => b.characterName.trim().toUpperCase() === upperName
      );
      const tagEntry = project.tags.find(
        (t) => t.category === 'character' && t.name.trim().toUpperCase() === upperName
      );
      const override = roleOverrides.find(
        (o) => o.characterName.trim().toUpperCase() === upperName
      );
      const linkedCastMember = crewMembers.find(
        (m) =>
          m.category === 'cast' &&
          (m.characterName || '').trim().toUpperCase() === upperName
      );

      const roleCandidates = candidates.filter(
        (cand) => cand.characterName.trim().toUpperCase() === upperName
      );
      const matchedScenes = project.scenes.filter((sc) =>
        sc.characters.some((c) => c.trim().toUpperCase() === upperName)
      );

      let dialogueLines = 0;
      let voLines = 0;
      let speaker = '';
      project.elements.forEach((el) => {
        if (el.type === 'SCENE_HEADING' || el.type === 'ACTION' || el.type === 'TRANSITION') {
          speaker = '';
        } else if (el.type === 'CHARACTER') {
          speaker = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
        } else if (el.type === 'DIALOGUE') {
          if ((el.character || speaker).trim().toUpperCase() === upperName) dialogueLines++;
        } else if (el.type === 'VOICE_OVER') {
          if ((el.character || speaker).trim().toUpperCase() === upperName) voLines++;
        }
      });

      const lockedCandidate = roleCandidates.find((c) => c.stage === 'Cast');
      const castActorName =
        charRec?.actor?.trim() ||
        lockedCandidate?.actorName?.trim() ||
        (linkedCastMember &&
        linkedCastMember.name.trim().toUpperCase() !== upperName
          ? linkedCastMember.name.trim()
          : '');

      const hasOffer = roleCandidates.some((c) => c.stage === 'Offer Extended');
      const hasCallbacks = roleCandidates.some(
        (c) => c.stage === 'Callback' || c.stage === 'Chemistry Read'
      );
      const hasTapes = roleCandidates.some((c) => c.stage === 'Self-Tape');

      const inferredStatus: CastingRoleStatus = castActorName
        ? 'Cast'
        : hasOffer
        ? 'Offer Out'
        : hasCallbacks
        ? 'Callbacks'
        : hasTapes
        ? 'Reviewing Tapes'
        : 'Open / Uncast';

      const status = override?.castingStatus || inferredStatus;
      const priority: CastingRolePriority =
        override?.castingPriority ||
        (voLines > 0 && dialogueLines === 0
          ? 'Voice Only'
          : matchedScenes.length >= 4 || bioRec?.roleType === 'Lead'
          ? 'Lead'
          : matchedScenes.length >= 2
          ? 'Principal'
          : 'Day Player');

      return {
        name: upperName,
        color: charRec?.color || tagEntry?.color || ['#f59e0b', '#06b6d4', '#10b981', '#ec4899'][idx % 4],
        portraitUrl: charRec?.image || tagEntry?.image || '',
        referenceImages: charRec?.referenceImages || [],
        description:
          charRec?.description ||
          bioRec?.loglineSummary ||
          '',
        wardrobeNotes:
          breakdownRec?.wardrobeNotes || bioRec?.visualNotes || '',
        vocalNotes: breakdownRec?.vocalOrPhysicalNotes || '',
        matchedScenes,
        dialogueLines,
        voLines,
        castActorName,
        actorHeadshotUrl:
          lockedCandidate?.headshotUrl || linkedCastMember?.avatarUrl || '',
        status,
        priority,
        targetAgeRange: override?.targetAgeRange || '',
        castingSpecs: override?.castingSpecs || '',
        candidates: roleCandidates,
      };
    });
  }, [project, candidates, roleOverrides, crewMembers]);

  const kpis = useMemo(() => {
    const totalRoles = roles.length;
    const castCount = roles.filter((r) => r.status === 'Cast' || Boolean(r.castActorName)).length;
    const callbackOrOfferCount = roles.filter(
      (r) => r.status === 'Callbacks' || r.status === 'Offer Out'
    ).length;
    const openCount = roles.filter((r) => !r.castActorName && r.status !== 'Cast').length;
    return {
      totalRoles,
      castCount,
      callbackOrOfferCount,
      openCount,
      totalCandidates: candidates.length,
    };
  }, [roles, candidates.length]);

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roles.filter((role) => {
      if (roleFilter === 'uncast' && (role.castActorName || role.status === 'Cast')) return false;
      if (roleFilter === 'callbacks' && role.status !== 'Callbacks' && role.status !== 'Reviewing Tapes')
        return false;
      if (roleFilter === 'offer' && role.status !== 'Offer Out') return false;
      if (roleFilter === 'cast' && !role.castActorName && role.status !== 'Cast') return false;

      if (!q) return true;
      return (
        role.name.toLowerCase().includes(q) ||
        role.castActorName.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q) ||
        role.candidates.some((c) => c.actorName.toLowerCase().includes(q))
      );
    });
  }, [roles, roleFilter, searchQuery]);

  const activeRole =
    filteredRoles.find((r) => r.name === selectedRoleName) ||
    roles.find((r) => r.name === selectedRoleName) ||
    filteredRoles[0] ||
    roles[0] ||
    null;

  const upsertRoleOverride = (
    characterName: string,
    patch: Partial<CastingRoleOverride>
  ) => {
    const upper = characterName.trim().toUpperCase();
    const exists = roleOverrides.some(
      (o) => o.characterName.trim().toUpperCase() === upper
    );
    const next = exists
      ? roleOverrides.map((o) =>
          o.characterName.trim().toUpperCase() === upper ? { ...o, ...patch } : o
        )
      : [...roleOverrides, { characterName: upper, ...patch }];
    onUpdateCastingRoleOverrides(next);
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRole || !candActorName.trim()) return;

    const newCandidate: CastingCandidate = {
      id: `cast-cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      characterName: activeRole.name,
      actorName: candActorName.trim(),
      headshotUrl: candHeadshotUrl || undefined,
      agentOrRep: candAgent.trim() || undefined,
      email: candEmail.trim() || undefined,
      phone: candPhone.trim() || undefined,
      unionStatus: candUnion.trim() || undefined,
      stage: candStage,
      rating: candRating,
      reelOrTapeLink: candReelLink.trim() || undefined,
      notes: candNotes.trim() || undefined,
      dayRateEstimate: candDayRate ? Number(candDayRate) || undefined : undefined,
      updatedAt: new Date().toLocaleDateString(),
    };

    let nextList = [newCandidate, ...candidates];
    if (candStage === 'Cast') {
      nextList = nextList.map((c) =>
        c.id !== newCandidate.id &&
        c.characterName.trim().toUpperCase() === activeRole.name &&
        c.stage === 'Cast'
          ? { ...c, stage: 'Callback' }
          : c
      );
      onCastActorToRole(activeRole.name, {
        actorName: newCandidate.actorName,
        headshotUrl: newCandidate.headshotUrl,
        agentOrRep: newCandidate.agentOrRep,
        email: newCandidate.email,
        phone: newCandidate.phone,
        unionStatus: newCandidate.unionStatus,
        dayRateEstimate: newCandidate.dayRateEstimate,
      });
    }

    onUpdateCastingCandidates(nextList);
    setCandActorName('');
    setCandHeadshotUrl('');
    setCandStage('Shortlist');
    setCandRating(4);
    setCandAgent('');
    setCandEmail('');
    setCandPhone('');
    setCandReelLink('');
    setCandNotes('');
    setIsAddCandidateOpen(false);
    onNotify(`Added ${newCandidate.actorName} to ${activeRole.name} auditions`);
  };

  const handleUpdateCandidate = (
    candidateId: string,
    patch: Partial<CastingCandidate>
  ) => {
    const target = candidates.find((c) => c.id === candidateId);
    if (!target) return;

    const updated = {
      ...target,
      ...patch,
      updatedAt: new Date().toLocaleDateString(),
    };

    let nextList = candidates.map((c) => (c.id === candidateId ? updated : c));
    if (patch.stage === 'Cast') {
      const roleUpper = target.characterName.trim().toUpperCase();
      nextList = nextList.map((c) =>
        c.id !== candidateId &&
        c.characterName.trim().toUpperCase() === roleUpper &&
        c.stage === 'Cast'
          ? { ...c, stage: 'Callback' }
          : c
      );
      onCastActorToRole(roleUpper, {
        actorName: updated.actorName,
        headshotUrl: updated.headshotUrl,
        agentOrRep: updated.agentOrRep,
        email: updated.email,
        phone: updated.phone,
        unionStatus: updated.unionStatus,
        dayRateEstimate: updated.dayRateEstimate,
      });
    }

    onUpdateCastingCandidates(nextList);
  };

  const handleLockCandidateToRole = (cand: CastingCandidate) => {
    const roleUpper = cand.characterName.trim().toUpperCase();
    const nextList = candidates.map((c) => {
      if (c.id === cand.id) {
        return { ...c, stage: 'Cast' as CastingStage, updatedAt: new Date().toLocaleDateString() };
      }
      if (c.characterName.trim().toUpperCase() === roleUpper && c.stage === 'Cast') {
        return { ...c, stage: 'Callback' as CastingStage };
      }
      return c;
    });
    onUpdateCastingCandidates(nextList);
    onCastActorToRole(roleUpper, {
      actorName: cand.actorName,
      headshotUrl: cand.headshotUrl,
      agentOrRep: cand.agentOrRep,
      email: cand.email,
      phone: cand.phone,
      unionStatus: cand.unionStatus,
      dayRateEstimate: cand.dayRateEstimate,
    });
  };

  const handleDeleteCandidate = (candidateId: string) => {
    onUpdateCastingCandidates(candidates.filter((c) => c.id !== candidateId));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#18181a] text-gray-200 text-xs overflow-hidden">
      {/* Top KPI & Filter Toolbar */}
      <div className="bg-[#212125] border-b border-[#34343b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-gray-100">
            <UserCheck className="w-4 h-4 text-[#ff8000]" />
            <span>Casting Studio</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
            <span className="px-2 py-0.5 rounded bg-[#161618] border border-[#34343c] text-gray-300">
              {kpis.totalRoles} Roles
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-700/50 text-emerald-300">
              {kpis.castCount} Cast
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/50 border border-amber-700/50 text-amber-300">
              {kpis.callbackOrOfferCount} Callbacks / Offers
            </span>
            <span className="px-2 py-0.5 rounded bg-[#161618] border border-[#34343c] text-gray-400">
              {kpis.openCount} Open · {kpis.totalCandidates} Auditions
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search role or actor..."
              className="bg-[#141416] border border-[#363640] rounded pl-8 pr-7 py-1.5 text-xs text-gray-100 w-52 focus:outline-none focus:border-[#ff8000]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center p-0.5 bg-[#141416] border border-[#34343e] rounded gap-0.5">
            {(
              [
                ['all', 'All'],
                ['uncast', 'Uncast'],
                ['callbacks', 'Auditions'],
                ['offer', 'Offer Out'],
                ['cast', 'Cast'],
              ] as [RoleFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRoleFilter(key)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  roleFilter === key
                    ? 'bg-[#2c2c33] text-[#ff8000] font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {onOpenCastRoster && (
            <button
              type="button"
              onClick={onOpenCastRoster}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#26262c] hover:bg-[#32323a] border border-[#3c3c46] text-gray-200 font-medium whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Cast Book</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split View: Role Breakdown Queue + Audition Pipeline */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Role Breakdown Queue */}
        <aside className="w-80 bg-[#1c1c20] border-r border-[#323239] flex flex-col min-h-0 shrink-0">
          <div className="px-3.5 py-2 border-b border-[#2c2c34] flex items-center justify-between text-[11px] text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Script Roles</span>
            <span className="tabular-nums">{filteredRoles.length} shown</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#28282f]">
            {filteredRoles.length === 0 ? (
              <div className="p-6 text-center text-gray-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-gray-600" />
                <p>No roles match your current filter.</p>
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = activeRole?.name === role.name;
                return (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() => {
                      setSelectedRoleName(role.name);
                      setIsAddCandidateOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-3 transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-[#27272e]' : 'hover:bg-[#222228]'
                    }`}
                  >
                    {/* Character Detail Portrait or Initials */}
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden bg-[#141416] border flex items-center justify-center shrink-0"
                      style={{ borderColor: role.color }}
                    >
                      {role.portraitUrl ? (
                        <img
                          src={role.portraitUrl}
                          alt={role.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-xs font-bold"
                          style={{ color: role.color }}
                        >
                          {role.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-bold truncate ${
                            isSelected ? 'text-[#ff8000]' : 'text-gray-100'
                          }`}
                        >
                          {role.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 ${
                            ROLE_STATUS_BADGE[role.status]
                          }`}
                        >
                          {role.status === 'Open / Uncast' ? 'Open' : role.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 truncate">
                        {role.castActorName ? (
                          <span className="text-emerald-300 font-medium">
                            Cast: {role.castActorName}
                          </span>
                        ) : (
                          <span>
                            {role.priority} · {role.candidates.length} audition
                            {role.candidates.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono tabular-nums">
                        {role.matchedScenes.length} scenes · {role.dialogueLines} lines
                        {role.voLines > 0 ? ` · ${role.voLines} V.O.` : ''}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Role Specs + Audition Candidates */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#18181a]">
          {!activeRole ? (
            <div className="max-w-xl mx-auto py-16 text-center space-y-3">
              <UserCheck className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-200">
                No Script Roles Available
              </p>
              <p className="text-xs text-gray-400">
                Add characters in the screenplay or Characters Workspace to begin casting auditions and callbacks.
              </p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Role Header & Character Reference Summary */}
              <div className="bg-[#1e1e23] border border-[#33333c] rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden bg-[#141416] border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: activeRole.color }}
                    >
                      {activeRole.portraitUrl ? (
                        <img
                          src={activeRole.portraitUrl}
                          alt={activeRole.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-lg font-bold"
                          style={{ color: activeRole.color }}
                        >
                          {activeRole.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-100">
                          {activeRole.name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            ROLE_STATUS_BADGE[activeRole.status]
                          }`}
                        >
                          {activeRole.status}
                        </span>
                        {activeRole.castActorName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Locked: {activeRole.castActorName}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">
                        {activeRole.description ||
                          `${activeRole.priority} role appearing across ${activeRole.matchedScenes.length} script scene(s).`}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-400 tabular-nums">
                        <span>{activeRole.matchedScenes.length} Scenes</span>
                        <span>·</span>
                        <span>{activeRole.dialogueLines} Spoken Lines</span>
                        {activeRole.voLines > 0 && (
                          <>
                            <span>·</span>
                            <span>{activeRole.voLines} Voice-over Cues</span>
                          </>
                        )}
                        {activeRole.matchedScenes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {activeRole.matchedScenes.slice(0, 5).map((sc) => (
                              <button
                                key={sc.id}
                                type="button"
                                onClick={() => onJumpToScene(sc.id)}
                                className="px-1.5 py-0.5 rounded bg-[#141416] hover:bg-[#2a2a32] border border-[#32323c] text-[10px] font-mono text-amber-300"
                                title={`Open Scene ${sc.sceneNumber} sides in Authoring`}
                              >
                                Sc.{sc.sceneNumber}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {activeRole.castActorName && (
                      <button
                        type="button"
                        onClick={() => {
                          onClearCastActorForRole(activeRole.name);
                          upsertRoleOverride(activeRole.name, {
                            castingStatus: 'Open / Uncast',
                          });
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#26262c] hover:bg-rose-950/60 border border-[#3c3c46] hover:border-rose-700 text-rose-300 font-medium"
                        title="Release locked actor and reopen casting for this role"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Uncast Role</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAddCandidateOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Audition / Candidate</span>
                    </button>
                  </div>
                </div>

                {/* Role Casting Specs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#2d2d35]">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Role Priority
                    </label>
                    <select
                      value={activeRole.priority}
                      onChange={(e) =>
                        upsertRoleOverride(activeRole.name, {
                          castingPriority: e.target.value as CastingRolePriority,
                        })
                      }
                      className="w-full bg-[#141416] border border-[#34343c] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    >
                      {ROLE_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Casting Status
                    </label>
                    <select
                      value={activeRole.status}
                      onChange={(e) =>
                        upsertRoleOverride(activeRole.name, {
                          castingStatus: e.target.value as CastingRoleStatus,
                        })
                      }
                      className="w-full bg-[#141416] border border-[#34343c] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    >
                      {ROLE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Target Age / Archetype
                    </label>
                    <input
                      type="text"
                      value={activeRole.targetAgeRange}
                      onChange={(e) =>
                        upsertRoleOverride(activeRole.name, {
                          targetAgeRange: e.target.value,
                        })
                      }
                      placeholder="e.g. 30s–40s, commanding presence"
                      className="w-full bg-[#141416] border border-[#34343c] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                      Casting Brief / Audition Sides &amp; Notes
                    </label>
                    <textarea
                      rows={2}
                      value={activeRole.castingSpecs}
                      onChange={(e) =>
                        upsertRoleOverride(activeRole.name, {
                          castingSpecs: e.target.value,
                        })
                      }
                      placeholder="Sides selection, chemistry read pairings, accent/stunt requirements..."
                      className="w-full bg-[#141416] border border-[#34343c] rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div className="bg-[#141416] border border-[#2c2c34] rounded p-2.5 space-y-1 text-[11px]">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      Synced Script &amp; Wardrobe Context
                    </div>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Wardrobe:</span>{' '}
                      {activeRole.wardrobeNotes || 'No wardrobe notes specified yet.'}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Vocal / Physical:</span>{' '}
                      {activeRole.vocalNotes || 'No vocal/physical requirements specified.'}
                    </p>
                    {activeRole.referenceImages.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {activeRole.referenceImages.slice(0, 4).map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt="Lookbook reference"
                            className="w-8 h-8 rounded object-cover border border-[#34343d]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Audition Candidate Form */}
              {isAddCandidateOpen && (
                <form
                  onSubmit={handleAddCandidate}
                  className="bg-[#202026] border border-[#ff8000]/50 rounded-lg p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#ff8000]">
                      New Audition Candidate for {activeRole.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddCandidateOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Actor Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={candActorName}
                        onChange={(e) => setCandActorName(e.target.value)}
                        placeholder="e.g. Elena Rostova"
                        className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Audition Stage
                      </label>
                      <select
                        value={candStage}
                        onChange={(e) => setCandStage(e.target.value as CastingStage)}
                        className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      >
                        {CASTING_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Casting Rating
                      </label>
                      <div className="flex items-center gap-1.5 h-[30px]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCandRating(star)}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= candRating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Agent / Management
                      </label>
                      <input
                        type="text"
                        value={candAgent}
                        onChange={(e) => setCandAgent(e.target.value)}
                        placeholder="Agency or rep"
                        className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={candEmail}
                        onChange={(e) => setCandEmail(e.target.value)}
                        placeholder="actor@rep.com"
                        className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={candPhone}
                        onChange={(e) => setCandPhone(e.target.value)}
                        placeholder="555-0148"
                        className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Union
                        </label>
                        <input
                          type="text"
                          value={candUnion}
                          onChange={(e) => setCandUnion(e.target.value)}
                          placeholder="SAG-AFTRA"
                          className="w-full bg-[#141416] border border-[#363640] rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Day Rate $
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={candDayRate}
                          onChange={(e) => setCandDayRate(e.target.value)}
                          className="w-full bg-[#141416] border border-[#363640] rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#141416] border border-[#3a3a44] flex items-center justify-center shrink-0">
                        {candHeadshotUrl ? (
                          <img
                            src={candHeadshotUrl}
                            alt="Candidate headshot"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#282830] hover:bg-[#33333d] border border-[#3e3e48] text-gray-200 cursor-pointer font-medium">
                        <Upload className="w-3.5 h-3.5 text-[#ff8000]" />
                        <span>{candHeadshotUrl ? 'Replace Headshot' : 'Upload Headshot'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setCandHeadshotUrl(await processUploadedImageFile(file, 600));
                              } catch {
                                // ignore invalid image
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Self-Tape / Reel URL
                        </label>
                        <input
                          type="url"
                          value={candReelLink}
                          onChange={(e) => setCandReelLink(e.target.value)}
                          placeholder="https://vimeo.com/..."
                          className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Audition Notes
                        </label>
                        <input
                          type="text"
                          value={candNotes}
                          onChange={(e) => setCandNotes(e.target.value)}
                          placeholder="Callback impressions, availability, chemistry..."
                          className="w-full bg-[#141416] border border-[#363640] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#32323a]">
                    <button
                      type="button"
                      onClick={() => setIsAddCandidateOpen(false)}
                      className="px-3 py-1.5 rounded bg-[#2a2a32] hover:bg-[#35353f] text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold"
                    >
                      Save Candidate
                    </button>
                  </div>
                </form>
              )}

              {/* Audition Candidates List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff8000]" />
                    <span>
                      Audition Shortlist &amp; Candidates ({activeRole.candidates.length})
                    </span>
                  </h3>
                </div>

                {activeRole.candidates.length === 0 ? (
                  <div className="bg-[#1e1e23] border border-[#32323b] rounded-lg p-8 text-center space-y-3">
                    <Film className="w-9 h-9 text-gray-600 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-200">
                        No audition candidates logged for {activeRole.name}
                      </p>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Add actors with headshots, self-tapes, callback notes, and ratings, then lock the chosen performer directly into the Production Cast Book.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddCandidateOpen(true)}
                      className="px-4 py-2 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold"
                    >
                      Add First Audition Candidate
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeRole.candidates.map((cand) => {
                      const isLocked = cand.stage === 'Cast';
                      return (
                        <div
                          key={cand.id}
                          className={`rounded-lg border p-4 space-y-3 transition-colors ${
                            isLocked
                              ? 'bg-[#1a241f] border-emerald-600/60'
                              : 'bg-[#1e1e23] border-[#33333c]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Candidate Headshot with click-to-upload */}
                              <label
                                className="relative w-14 h-14 rounded-full overflow-hidden bg-[#141416] border-2 border-[#3c3c46] flex items-center justify-center shrink-0 cursor-pointer group"
                                title="Upload or replace actor headshot"
                              >
                                {cand.headshotUrl ? (
                                  <img
                                    src={cand.headshotUrl}
                                    alt={cand.actorName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-amber-400">
                                    {cand.actorName
                                      .split(/\s+/)
                                      .map((p) => p[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                                <span className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Camera className="w-4 h-4 text-[#ff8000]" />
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const url = await processUploadedImageFile(file, 600);
                                        handleUpdateCandidate(cand.id, { headshotUrl: url });
                                      } catch {
                                        // ignore invalid image
                                      }
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-gray-100 truncate">
                                    {cand.actorName}
                                  </h4>
                                  {isLocked && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                                      CAST
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-2 mt-0.5">
                                  {cand.unionStatus && <span>{cand.unionStatus}</span>}
                                  {cand.dayRateEstimate ? (
                                    <span className="font-mono tabular-nums text-amber-300">
                                      ${cand.dayRateEstimate}/day
                                    </span>
                                  ) : null}
                                  {cand.agentOrRep && (
                                    <span className="inline-flex items-center gap-1 truncate">
                                      <Building2 className="w-3 h-3 text-gray-500" />
                                      <span>{cand.agentOrRep}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(cand.id)}
                              className="p-1 text-gray-500 hover:text-rose-400 rounded"
                              title="Remove candidate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Stage + Rating Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <select
                              value={cand.stage}
                              onChange={(e) =>
                                handleUpdateCandidate(cand.id, {
                                  stage: e.target.value as CastingStage,
                                })
                              }
                              className={`px-2 py-1 rounded border text-[11px] font-semibold focus:outline-none ${
                                STAGE_BADGE_STYLES[cand.stage]
                              }`}
                            >
                              {CASTING_STAGES.map((st) => (
                                <option
                                  key={st}
                                  value={st}
                                  className="bg-[#1b1b20] text-gray-100"
                                >
                                  {st}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1" title="Casting rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCandidate(cand.id, { rating: star })
                                  }
                                  className="p-0.5"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      star <= cand.rating
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Contact & Self-Tape Links */}
                          {(cand.email || cand.phone || cand.reelOrTapeLink) && (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                              {cand.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-gray-500" />
                                  <span className="select-text">{cand.email}</span>
                                </span>
                              )}
                              {cand.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-500" />
                                  <span className="select-text">{cand.phone}</span>
                                </span>
                              )}
                              {isSafeHttpUrl(cand.reelOrTapeLink) && (
                                <a
                                  href={cand.reelOrTapeLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                                >
                                  <Video className="w-3 h-3" />
                                  <span>Self-Tape / Reel</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <textarea
                              rows={2}
                              value={cand.notes || ''}
                              onChange={(e) =>
                                handleUpdateCandidate(cand.id, { notes: e.target.value })
                              }
                              placeholder="Audition impression, callback notes, availability..."
                              className="w-full bg-[#141416] border border-[#2f2f38] rounded p-2 text-[11px] text-gray-200 focus:outline-none focus:border-[#ff8000]"
                            />
                          </div>

                          {/* Footer Action */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[10px] text-gray-500">
                              Updated {cand.updatedAt}
                            </span>

                            {isLocked ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Synced to Cast &amp; Call Sheet</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLockCandidateToRole(cand)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#27272e] hover:bg-[#ff7700] border border-[#3e3e48] hover:border-[#ff7700] text-amber-300 hover:text-black font-semibold text-[11px] transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Cast &amp; Sync to Production</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
