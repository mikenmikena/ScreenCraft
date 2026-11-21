import React, { useState, useMemo } from 'react';
import {
  CastCrewMember,
  CrewDepartment,
  PayBasis,
  AvailabilityStatus,
  PaymentStatus,
  CrewConnection,
  Scene,
  StripboardStrip,
  StoryCharacter,
  ScreenplayElement,
  StoryComment,
  Tag,
  CharacterBreakdownOverride,
  CharacterRelationshipEdge,
  StoryProject,
} from '../types/story';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShieldAlert,
  Calendar,
  Clock,
  DollarSign,
  Link2,
  Edit3,
  Trash2,
  X,
  Check,
  Copy,
  Upload,
  Plus,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Flag,
  Layers,
  Sparkles,
  BarChart3,
  AlertTriangle,
  FileText,
  Tag as TagIcon,
  LayoutGrid,
  Network,
} from 'lucide-react';
import {
  CrewAvailabilityChart,
  analyzeScheduleConflicts,
} from './CrewAvailabilityChart';
import {
  ProductionBudgetPanel,
  estimateMemberBudgetLine,
} from './ProductionBudgetPanel';
import { CallSheetGenerator } from './CallSheetGenerator';
import { CharacterBreakdownPanel } from './CharacterBreakdownPanel';
import { CastGalleryView, resolveCastMemberPortrait } from './CastGalleryView';
import { CharacterConnectionsChart } from './CharacterConnectionsChart';

interface CastCrewDirectoryProps {
  project?: StoryProject;
  projectTitle?: string;
  projectAuthor?: string;
  draftName?: string;
  members: CastCrewMember[];
  scenes: Scene[];
  strips: StripboardStrip[];
  characters: StoryCharacter[];
  tags?: Tag[];
  elements?: ScreenplayElement[];
  comments?: StoryComment[];
  characterBreakdowns?: CharacterBreakdownOverride[];
  initialDirectoryView?: 'roster' | 'gallery' | 'character_breakdown' | 'connections' | 'timeline' | 'budget' | 'call_sheet';
  initialCallSheetDay?: number | null;
  onAddMember: (member: CastCrewMember) => void;
  onUpdateMember: (member: CastCrewMember) => void;
  onDeleteMember: (memberId: string) => void;
  onAddConnection: (
    sourceId: string,
    targetId: string,
    relationship: string,
    notes: string,
    reciprocal: boolean
  ) => void;
  onRemoveConnection: (sourceId: string, targetId: string) => void;
  onUpdateCharacterBreakdown?: (override: CharacterBreakdownOverride) => void;
  onResetCharacterBreakdown?: (characterName: string) => void;
  onCreateCharacterTag?: (name: string, sceneIds: string[]) => void;
  onUpdateCharacterRelationships?: (relationships: CharacterRelationshipEdge[]) => void;
  onUpdateCharacterNodePositions?: (positions: Record<string, { x: number; y: number }>) => void;
  locationCount?: number;
  onSwitchSubView: (view: 'stripboard' | 'cast_crew' | 'location_map') => void;
  onSelectScene: (sceneId: string) => void;
  onImportScriptCast: () => void;
}

const DEPARTMENTS: CrewDepartment[] = [
  'Cast / Principal',
  'Directing',
  'Camera & Lighting',
  'Sound',
  'Art & Props',
  'Hair, Makeup & Wardrobe',
  'Production Office',
  'VFX & Post',
  'Locations & Stunts',
];

const PAY_BASES: PayBasis[] = ['Daily', 'Weekly', 'Hourly', 'Flat / Project'];
const AVAILABILITY_STATUSES: AvailabilityStatus[] = ['Confirmed', 'Tentative', 'On Hold', 'Wrapped'];
const PAYMENT_STATUSES: PaymentStatus[] = ['Approved', 'Pending Deal Memo', 'On Hold'];
const RELATIONSHIP_PRESETS = [
  'Scene Partner',
  'Reports to',
  'Directs / Supervises',
  'Unit Partner',
  'Department Head',
  'Stunt / Safety Lead',
  'Prop / Wardrobe Sync',
  'Talent Agent / Rep',
  'Stand-In / Double',
  'Assistant To',
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const estimateMemberTotal = (member: CastCrewMember): number => {
  return estimateMemberBudgetLine(member).totalCost;
};

const renderAvailabilityIndicator = (status: AvailabilityStatus) => {
  switch (status) {
    case 'Confirmed':
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>Confirmed</span>
        </span>
      );
    case 'Tentative':
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-medium whitespace-nowrap">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Tentative</span>
        </span>
      );
    case 'On Hold':
      return (
        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium whitespace-nowrap">
          <PauseCircle className="w-3 h-3 shrink-0" />
          <span>On Hold</span>
        </span>
      );
    case 'Wrapped':
      return (
        <span className="inline-flex items-center gap-1 text-gray-400 text-[11px] font-medium whitespace-nowrap">
          <Flag className="w-3 h-3 shrink-0" />
          <span>Wrapped</span>
        </span>
      );
  }
};

export const CastCrewDirectory: React.FC<CastCrewDirectoryProps> = ({
  project,
  projectTitle = 'Untitled Production',
  projectAuthor = 'Director',
  draftName,
  members,
  scenes,
  strips,
  characters,
  tags = [],
  elements = [],
  comments = [],
  characterBreakdowns = [],
  initialDirectoryView,
  initialCallSheetDay,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddConnection,
  onRemoveConnection,
  onUpdateCharacterBreakdown,
  onResetCharacterBreakdown,
  onCreateCharacterTag,
  onUpdateCharacterRelationships,
  onUpdateCharacterNodePositions,
  locationCount = 0,
  onSwitchSubView,
  onSelectScene,
  onImportScriptCast,
}) => {
  const [directoryView, setDirectoryView] = useState<
    'roster' | 'gallery' | 'character_breakdown' | 'connections' | 'timeline' | 'budget' | 'call_sheet'
  >(initialDirectoryView || 'roster');

  React.useEffect(() => {
    if (initialDirectoryView) {
      setDirectoryView(initialDirectoryView);
    }
  }, [initialDirectoryView, initialCallSheetDay]);

  const characterTagCount = useMemo(
    () => tags.filter((t) => t.category === 'character').length,
    [tags]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cast' | 'crew'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'pay' | 'days'>('name');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    members[0]?.id || null
  );

  // Copy feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<Record<string, boolean>>({});

  // Confirm delete state (no window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Connection builder inline state
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [connTargetId, setConnTargetId] = useState('');
  const [connRelationship, setConnRelationship] = useState('Scene Partner');
  const [connNotes, setConnNotes] = useState('');
  const [connReciprocal, setConnReciprocal] = useState(true);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CastCrewMember | null>(null);

  // Form states for Add / Edit modal
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'cast' | 'crew'>('crew');
  const [formDepartment, setFormDepartment] = useState<CrewDepartment>('Camera & Lighting');
  const [formRole, setFormRole] = useState('');
  const [formCharacterName, setFormCharacterName] = useState('');
  const [formUnionStatus, setFormUnionStatus] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | undefined>(undefined);
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPreferredContact, setFormPreferredContact] = useState<
    'Phone' | 'Email' | 'SMS' | 'Radio Ch.'
  >('Phone');
  const [formLocation, setFormLocation] = useState('');
  const [formAgency, setFormAgency] = useState('');
  const [formEmergency, setFormEmergency] = useState('');
  const [formPayRate, setFormPayRate] = useState<string>('850');
  const [formPayBasis, setFormPayBasis] = useState<PayBasis>('Daily');
  const [formKitFee, setFormKitFee] = useState<string>('0');
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>('Approved');
  const [formAvailability, setFormAvailability] = useState<AvailabilityStatus>('Confirmed');
  const [formCallTime, setFormCallTime] = useState('07:00');
  const [formWrapTime, setFormWrapTime] = useState('19:00');
  const [formScheduledDays, setFormScheduledDays] = useState<string[]>([]);
  const [formCustomDay, setFormCustomDay] = useState('');
  const [formLinkedSceneIds, setFormLinkedSceneIds] = useState<string[]>([]);
  const [formScheduleNotes, setFormScheduleNotes] = useState('');

  // Derive available shooting days from stripboard day_break banners
  const stripboardDays = useMemo(() => {
    const days: string[] = [];
    let dayCounter = 1;
    strips.forEach((s) => {
      if (s.type === 'day_break') {
        const title = s.bannerTitle || `DAY ${dayCounter}`;
        const datePart = s.bannerDate ? s.bannerDate.replace(/^[^,]+,\s*/, '') : '';
        const label = datePart ? `Day ${dayCounter} (${datePart.slice(0, 6)})` : title;
        if (!days.includes(label)) {
          days.push(label);
        }
        dayCounter++;
      }
    });
    // Also include any days already referenced by existing members so none are orphaned
    members.forEach((m) => {
      m.scheduledDays.forEach((d) => {
        if (!days.includes(d)) days.push(d);
      });
    });
    if (days.length === 0) {
      days.push('Day 1', 'Day 2', 'Day 3');
    }
    return days;
  }, [strips, members]);

  // Count characters from screenplay not yet represented in Cast & Crew
  const unmappedScriptCastCount = useMemo(() => {
    const existingCharNames = new Set(
      members
        .filter((m) => m.characterName)
        .map((m) => m.characterName!.trim().toUpperCase())
    );
    return characters.filter((c) => !existingCharNames.has(c.name.trim().toUpperCase())).length;
  }, [characters, members]);

  // Map members by id for quick connection resolution
  const memberById = useMemo(() => {
    const map = new Map<string, CastCrewMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // Selected member (fallback cleanly if deleted)
  const selectedMember = useMemo(() => {
    if (selectedMemberId && memberById.has(selectedMemberId)) {
      return memberById.get(selectedMemberId)!;
    }
    return members[0] || null;
  }, [selectedMemberId, memberById, members]);

  // Filtered & sorted members
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = members.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (departmentFilter !== 'all' && m.department !== departmentFilter) return false;
      if (!q) return true;
      const connectionMatch = m.connections.some((c) => {
        const target = memberById.get(c.memberId);
        return (
          c.relationship.toLowerCase().includes(q) ||
          (target && target.name.toLowerCase().includes(q))
        );
      });
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        (m.characterName && m.characterName.toLowerCase().includes(q)) ||
        (m.agencyOrCompany && m.agencyOrCompany.toLowerCase().includes(q)) ||
        connectionMatch
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'department') return a.department.localeCompare(b.department);
      if (sortBy === 'pay') return b.payRate - a.payRate;
      if (sortBy === 'days') return b.scheduledDays.length - a.scheduledDays.length;
      return 0;
    });
  }, [members, searchQuery, categoryFilter, departmentFilter, sortBy, memberById]);

  // Summary KPIs & Live Conflict Analysis
  const conflictSummary = useMemo(
    () => analyzeScheduleConflicts(members, scenes, strips),
    [members, scenes, strips]
  );

  const memberConflictMap = useMemo(() => {
    const map = new Map<string, string[]>();
    conflictSummary.conflicts.forEach((conf) => {
      conf.affectedMembers.forEach((am) => {
        const list = map.get(am.id) || [];
        list.push(`Sc. ${conf.sceneNumber}: ${am.issue}`);
        map.set(am.id, list);
      });
    });
    return map;
  }, [conflictSummary]);

  const summary = useMemo(() => {
    const castCount = members.filter((m) => m.category === 'cast').length;
    const crewCount = members.filter((m) => m.category === 'crew').length;
    const confirmedCount = members.filter((m) => m.availabilityStatus === 'Confirmed').length;
    const totalEstimatedPayroll = members.reduce((sum, m) => sum + estimateMemberTotal(m), 0);
    const totalConnections = members.reduce((sum, m) => sum + m.connections.length, 0);
    return {
      castCount,
      crewCount,
      confirmedCount,
      totalEstimatedPayroll,
      totalConnections,
    };
  }, [members]);

  const handleCopy = (label: string, value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const openAddModal = (defaultCategory: 'cast' | 'crew' = 'crew') => {
    setEditingMember(null);
    setFormName('');
    setFormCategory(defaultCategory);
    setFormDepartment(defaultCategory === 'cast' ? 'Cast / Principal' : 'Camera & Lighting');
    setFormRole('');
    setFormCharacterName('');
    setFormUnionStatus('');
    setFormAvatarUrl(undefined);
    setFormEmail('');
    setFormPhone('');
    setFormPreferredContact('Phone');
    setFormLocation('');
    setFormAgency('');
    setFormEmergency('');
    setFormPayRate(defaultCategory === 'cast' ? '1000' : '850');
    setFormPayBasis('Daily');
    setFormKitFee('0');
    setFormPaymentStatus('Approved');
    setFormAvailability('Confirmed');
    setFormCallTime('07:00');
    setFormWrapTime('19:00');
    setFormScheduledDays(stripboardDays.slice(0, 1));
    setFormLinkedSceneIds(scenes[0] ? [scenes[0].id] : []);
    setFormScheduleNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: CastCrewMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormCategory(member.category);
    setFormDepartment(member.department);
    setFormRole(member.role);
    setFormCharacterName(member.characterName || '');
    setFormUnionStatus(member.unionStatus || '');
    setFormAvatarUrl(member.avatarUrl);
    setFormEmail(member.email);
    setFormPhone(member.phone);
    setFormPreferredContact(member.preferredContact || 'Phone');
    setFormLocation(member.location || '');
    setFormAgency(member.agencyOrCompany || '');
    setFormEmergency(member.emergencyContact || '');
    setFormPayRate(String(member.payRate));
    setFormPayBasis(member.payBasis);
    setFormKitFee(String(member.kitFee || 0));
    setFormPaymentStatus(member.paymentStatus);
    setFormAvailability(member.availabilityStatus);
    setFormCallTime(member.callTime || '07:00');
    setFormWrapTime(member.wrapTime || '19:00');
    setFormScheduledDays(member.scheduledDays);
    setFormLinkedSceneIds(member.linkedSceneIds);
    setFormScheduleNotes(member.scheduleNotes || '');
    setIsModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim()) return;

    const payload: CastCrewMember = {
      id: editingMember ? editingMember.id : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: formName.trim(),
      category: formCategory,
      department: formDepartment,
      role: formRole.trim(),
      characterName: formCategory === 'cast' && formCharacterName.trim() ? formCharacterName.trim().toUpperCase() : undefined,
      unionStatus: formUnionStatus.trim() || undefined,
      avatarUrl: formAvatarUrl,
      email: formEmail.trim() || 'pending@production.example',
      phone: formPhone.trim() || 'Pending',
      preferredContact: formPreferredContact,
      location: formLocation.trim() || undefined,
      agencyOrCompany: formAgency.trim() || undefined,
      emergencyContact: formEmergency.trim() || undefined,
      payRate: Math.max(0, Number(formPayRate) || 0),
      payBasis: formPayBasis,
      currency: 'USD',
      kitFee: Math.max(0, Number(formKitFee) || 0) || undefined,
      paymentStatus: formPaymentStatus,
      callTime: formCallTime.trim() || undefined,
      wrapTime: formWrapTime.trim() || undefined,
      scheduledDays: formScheduledDays,
      linkedSceneIds: formLinkedSceneIds,
      availabilityStatus: formAvailability,
      scheduleNotes: formScheduleNotes.trim() || undefined,
      connections: editingMember ? editingMember.connections : [],
    };

    if (editingMember) {
      onUpdateMember(payload);
    } else {
      onAddMember(payload);
      setSelectedMemberId(payload.id);
    }
    setIsModalOpen(false);
  };

  const handlePhotoUpload = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleDayInForm = (day: string) => {
    setFormScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addCustomDayInForm = () => {
    const trimmed = formCustomDay.trim();
    if (!trimmed) return;
    if (!formScheduledDays.includes(trimmed)) {
      setFormScheduledDays((prev) => [...prev, trimmed]);
    }
    setFormCustomDay('');
  };

  const toggleSceneInForm = (sceneId: string) => {
    setFormLinkedSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const handleSubmitConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !connTargetId || !connRelationship.trim()) return;
    onAddConnection(
      selectedMember.id,
      connTargetId,
      connRelationship.trim(),
      connNotes.trim(),
      connReciprocal
    );
    setConnTargetId('');
    setConnNotes('');
    setIsAddingConnection(false);
  };

  const availableConnectionTargets = useMemo(() => {
    if (!selectedMember) return [];
    const existingIds = new Set(selectedMember.connections.map((c) => c.memberId));
    return members.filter((m) => m.id !== selectedMember.id && !existingIds.has(m.id));
  }, [selectedMember, members]);

  return (
    <div className="flex-1 bg-[#202020] flex flex-col min-h-0 overflow-hidden text-xs select-none">
      {/* Unified Production Schedule Workspace Toolbar (Row 1: View Switcher & Primary CTAs) */}
      <div className="bg-[#292929] px-4 py-2 border-b border-[#3e3e3e] flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Segmented View Switcher: Stripboard vs Cast & Crew Address Book vs Location Map */}
          <div className="flex items-center p-0.5 bg-[#191919] rounded border border-[#3c3c3c]">
            <button
              onClick={() => onSwitchSubView('stripboard')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stripboard</span>
            </button>
            <button
              onClick={() => onSwitchSubView('cast_crew')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#333333] text-[#ff8000] shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cast & Crew Address Book ({members.length})</span>
            </button>
            <button
              onClick={() => onSwitchSubView('location_map')}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Location Map ({locationCount})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unmappedScriptCastCount > 0 && (
            <button
              onClick={onImportScriptCast}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242424] hover:bg-[#333333] text-amber-300 rounded border border-[#484848] transition-colors whitespace-nowrap shrink-0"
              title="Create Cast Address Book entries from screenplay characters"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sync Script Cast (+{unmappedScriptCastCount})</span>
            </button>
          )}
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Cast / Crew</span>
          </button>
        </div>
      </div>

      {/* Row 2: Directory Sub-View Tab Strip */}
      <div className="bg-[#232323] border-b border-[#383838] px-4 py-1.5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center p-0.5 bg-[#191919] rounded border border-[#3c3c3c]">
          <button
            onClick={() => setDirectoryView('roster')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'roster'
                ? 'bg-[#2c2c2c] text-gray-100 font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster & Address Book</span>
          </button>
          <button
            onClick={() => setDirectoryView('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'gallery'
                ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Gallery View</span>
          </button>
          <button
            onClick={() => setDirectoryView('character_breakdown')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'character_breakdown'
                ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>Character Breakdown</span>
          </button>
          <button
            onClick={() => setDirectoryView('connections')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'connections'
                ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Character Connections</span>
          </button>
          <button
            onClick={() => setDirectoryView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'timeline'
                ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Availability Timeline</span>
            {conflictSummary.conflicts.length > 0 && (
              <span className="ml-0.5 text-rose-400 font-mono tabular-nums">
                ({conflictSummary.conflicts.length})
              </span>
            )}
          </button>
          <button
            onClick={() => setDirectoryView('budget')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'budget'
                ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Production Budget</span>
          </button>
          <button
            onClick={() => setDirectoryView('call_sheet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
              directoryView === 'call_sheet'
                ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                : 'text-gray-400 hover:text-gray-200 font-medium'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Call Sheet PDF</span>
          </button>
        </div>

        <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap shrink-0">
          {characterTagCount} Character Tags
        </span>
      </div>

      {/* Summary KPI Strip (Unboxed clean metrics with tabular figures) */}
      <div className="bg-[#1b1b1b] border-b border-[#333333] px-4 py-2.5 grid grid-cols-4 divide-x divide-[#323232] flex-shrink-0">
        <div className="pr-4">
          <div className="text-[11px] text-gray-400">Active Roster</div>
          <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
            <span className="text-sm font-semibold text-gray-100">{members.length} Total</span>
            <span className="text-[11px] text-gray-400">
              {summary.castCount} Cast · {summary.crewCount} Crew
            </span>
          </div>
        </div>

        <div className="px-4">
          <div className="text-[11px] text-gray-400">Production Budget (Running Est.)</div>
          <div className="flex items-baseline gap-2 mt-0.5 font-mono tabular-nums">
            <button
              onClick={() => setDirectoryView('budget')}
              className="text-sm font-semibold text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
              title="Open Production Budget breakdown"
            >
              {formatCurrency(summary.totalEstimatedPayroll)}
            </button>
            <span className="text-[11px] font-sans text-gray-400">incl. kit fees</span>
          </div>
        </div>

        <div className="px-4">
          <div className="text-[11px] text-gray-400">Schedule Readiness & Conflicts</div>
          <div className="flex items-center gap-2 mt-0.5 tabular-nums">
            <span className="text-sm font-semibold text-emerald-400">
              {summary.confirmedCount}/{members.length} Ready
            </span>
            <span className="text-gray-600">·</span>
            {conflictSummary.conflicts.length > 0 ? (
              <button
                onClick={() => setDirectoryView('timeline')}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 underline-offset-2 hover:underline"
                title="View multi-member scene conflicts in Availability Timeline"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{conflictSummary.conflicts.length} Conflicts</span>
              </button>
            ) : (
              <span className="text-[11px] text-gray-400">0 conflicts</span>
            )}
          </div>
        </div>

        <div className="pl-4">
          <div className="text-[11px] text-gray-400">Unit Relationships</div>
          <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
            <span className="text-sm font-semibold text-cyan-400">
              {summary.totalConnections} Connections
            </span>
            <span className="text-[11px] text-gray-400">mapped across units</span>
          </div>
        </div>
      </div>

      {directoryView === 'gallery' ? (
        <CastGalleryView
          members={members}
          characters={characters}
          tags={tags}
          scenes={scenes}
          unmappedScriptCastCount={unmappedScriptCastCount}
          onImportScriptCast={onImportScriptCast}
          onUpdateMember={onUpdateMember}
          onEditMember={(member) => openEditModal(member)}
          onSelectMemberInRoster={(memberId) => {
            setSelectedMemberId(memberId);
            setDirectoryView('roster');
          }}
          onOpenCharacterBreakdown={() => setDirectoryView('character_breakdown')}
          onSelectScene={onSelectScene}
          onAddCastMember={() => openAddModal('cast')}
        />
      ) : directoryView === 'character_breakdown' ? (
        <CharacterBreakdownPanel
          projectTitle={projectTitle}
          tags={tags}
          characters={characters}
          scenes={scenes}
          elements={elements}
          comments={comments}
          crewMembers={members}
          overrides={characterBreakdowns}
          onUpdateOverride={(override) => onUpdateCharacterBreakdown?.(override)}
          onResetOverride={(name) => onResetCharacterBreakdown?.(name)}
          onCreateCharacterTag={onCreateCharacterTag}
          onSelectScene={onSelectScene}
          onViewActorInRoster={(memberId) => {
            setSelectedMemberId(memberId);
            setDirectoryView('roster');
          }}
        />
      ) : directoryView === 'connections' ? (
        <CharacterConnectionsChart
          project={
            project || {
              id: 'active-project',
              title: projectTitle,
              author: projectAuthor,
              lastModified: 'Today',
              elements,
              scenes,
              tags,
              comments,
              strips,
              characters,
              crewMembers: members,
            }
          }
          onUpdateRelationships={(rels) => onUpdateCharacterRelationships?.(rels)}
          onUpdateNodePositions={(pos) => onUpdateCharacterNodePositions?.(pos)}
          onSelectScene={onSelectScene}
        />
      ) : directoryView === 'timeline' ? (
        <CrewAvailabilityChart
          members={members}
          scenes={scenes}
          strips={strips}
          onSelectMember={(memberId) => {
            setSelectedMemberId(memberId);
            setDirectoryView('roster');
          }}
          onEditMember={(member) => openEditModal(member)}
          onSelectScene={onSelectScene}
        />
      ) : directoryView === 'budget' ? (
        <ProductionBudgetPanel
          members={members}
          scenes={scenes}
          strips={strips}
          onEditMember={(member) => openEditModal(member)}
          onSelectMember={(memberId) => {
            setSelectedMemberId(memberId);
            setDirectoryView('roster');
          }}
          onAddMember={() => openAddModal()}
        />
      ) : directoryView === 'call_sheet' ? (
        <CallSheetGenerator
          projectTitle={projectTitle}
          projectAuthor={projectAuthor}
          draftName={draftName}
          members={members}
          scenes={scenes}
          strips={strips}
          initialDayNumber={initialCallSheetDay}
          onEditMember={(member) => openEditModal(member)}
          onSelectScene={onSelectScene}
        />
      ) : (
        <>
          {/* Search & Filter Control Bar */}
          <div className="bg-[#232323] border-b border-[#363636] px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search name, role, email, phone, or connection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#171717] text-gray-200 pl-8 pr-7 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-200"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Segmented Cast / Crew Filter */}
              <div className="flex items-center p-0.5 bg-[#171717] rounded border border-[#383838]">
                {(['all', 'cast', 'crew'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      categoryFilter === cat
                        ? 'bg-[#2e2e2e] text-[#ff8000]'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat === 'cast' ? 'Cast' : 'Crew'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-[#171717] text-gray-200 px-2.5 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[#171717] text-gray-200 px-2.5 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
              >
                <option value="name">Sort: Name (A–Z)</option>
                <option value="department">Sort: Department</option>
                <option value="pay">Sort: Pay Rate (High–Low)</option>
                <option value="days">Sort: Scheduled Days</option>
              </select>
            </div>
          </div>

          {/* Main Split Workspace: Master Detailed Roster Table + Right Address Book & Connections Detail */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left/Center: Detailed Listing Table */}
            <div className="flex-1 overflow-auto bg-[#202020]">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400 space-y-3">
              <Users className="w-10 h-10 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {members.length === 0
                    ? 'No cast or crew members listed yet'
                    : 'No members match your filters'}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  {members.length === 0
                    ? 'Add talent, department heads, and unit crew to track pay rates, call schedules, contact details, and unit connections.'
                    : 'Try adjusting your search query, category toggle, or department filter.'}
                </p>
              </div>
              {members.length === 0 ? (
                <button
                  onClick={() => openAddModal()}
                  className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors"
                >
                  Add First Member
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setDepartmentFilter('all');
                  }}
                  className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-200 rounded border border-[#444] transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-10 bg-[#171717] border-b border-[#383838] text-[11px] font-semibold text-gray-400">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Role & Department</th>
                  <th className="py-2.5 px-3">Contact Info</th>
                  <th className="py-2.5 px-3 text-right">Pay Rate</th>
                  <th className="py-2.5 px-3">Schedule</th>
                  <th className="py-2.5 px-3">Connections</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d]">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  const isDeleting = confirmDeleteId === member.id;
                  return (
                    <tr
                      key={member.id}
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setConfirmDeleteId(null);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#2c251d]'
                          : 'hover:bg-[#262626]'
                      }`}
                    >
                      {/* Member Name & Avatar */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const portrait =
                              member.category === 'cast'
                                ? resolveCastMemberPortrait(member, tags, characters)
                                : { src: member.avatarUrl };
                            const avatarSrc =
                              portrait.src && !failedAvatarUrls[portrait.src]
                                ? portrait.src
                                : undefined;
                            return avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={member.name}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setFailedAvatarUrls((prev) => ({
                                    ...prev,
                                    [avatarSrc]: true,
                                  }))
                                }
                                className={`w-8 h-8 object-cover border border-[#444] shrink-0 ${
                                  member.category === 'cast' ? 'rounded-full' : 'rounded'
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 flex items-center justify-center font-semibold text-[11px] shrink-0 border ${
                                  member.category === 'cast'
                                    ? 'rounded-full bg-[#2a221b] text-amber-300 border-amber-700/40'
                                    : 'rounded bg-[#1c262e] text-cyan-300 border-cyan-800/40'
                                }`}
                              >
                                {getInitials(member.name)}
                              </div>
                            );
                          })()}
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-100 truncate">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {member.unionStatus || (member.category === 'cast' ? 'Cast' : 'Crew')}
                              {member.agencyOrCompany ? ` · ${member.agencyOrCompany}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-medium text-gray-200 max-w-[200px] truncate">
                          {member.role}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          <span>{member.category === 'cast' ? 'Cast' : 'Crew'}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{member.department}</span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="text-gray-200 font-mono tabular-nums text-[11px]">
                          {member.phone}
                        </div>
                        <div className="text-gray-400 text-[11px] truncate max-w-[175px]">
                          {member.email}
                        </div>
                      </td>

                      {/* Pay Rate */}
                      <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums">
                        <div className="font-semibold text-amber-300">
                          {formatCurrency(member.payRate)}
                          <span className="text-[10px] font-sans font-normal text-gray-400">
                            /{member.payBasis === 'Flat / Project' ? 'flat' : member.payBasis.toLowerCase().replace('ly', '')}
                          </span>
                        </div>
                        <div className="text-[10px] font-sans text-gray-400 mt-0.5">
                          {member.kitFee ? `+${formatCurrency(member.kitFee)} kit · ` : ''}
                          <span
                            className={
                              member.paymentStatus === 'Approved'
                                ? 'text-emerald-400'
                                : member.paymentStatus === 'Pending Deal Memo'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }
                          >
                            {member.paymentStatus}
                          </span>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-2.5 px-3 align-top">
                        {(() => {
                          const memberConflicts = memberConflictMap.get(member.id) || [];
                          return (
                            <>
                              <div className="flex items-center gap-2">
                                {renderAvailabilityIndicator(member.availabilityStatus)}
                                {memberConflicts.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDirectoryView('timeline');
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline-offset-2 hover:underline"
                                    title={memberConflicts.join(' | ')}
                                  >
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span className="tabular-nums">
                                      {memberConflicts.length} {memberConflicts.length === 1 ? 'conflict' : 'conflicts'}
                                    </span>
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5">
                                {member.callTime || '07:00'}–{member.wrapTime || '19:00'} · {member.scheduledDays.length}d · {member.linkedSceneIds.length} sc
                              </div>
                            </>
                          );
                        })()}
                      </td>

                      {/* Connections */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="text-gray-200 font-medium tabular-nums">
                          {member.connections.length}{' '}
                          {member.connections.length === 1 ? 'link' : 'links'}
                        </div>
                        {member.connections.length > 0 ? (
                          <div className="text-[11px] text-gray-400 truncate max-w-[140px]">
                            {member.connections
                              .map((c) => memberById.get(c.memberId)?.name.split(' ')[0])
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500">None mapped</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-2.5 px-3 align-top text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                onDeleteMember(member.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-[#333] hover:bg-[#444] text-gray-200 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-[#333] rounded transition-colors"
                              title="Edit Member Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(member.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#333] rounded transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Detail Panel: Contact Address Book & Unit Connections */}
        {selectedMember && (
          <aside className="w-[380px] flex-shrink-0 border-l border-[#383838] bg-[#1d1d1d] flex flex-col min-h-0 overflow-y-auto">
            {/* Profile Header */}
            <div className="p-4 border-b border-[#323232] bg-[#222222]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const portrait =
                      selectedMember.category === 'cast'
                        ? resolveCastMemberPortrait(selectedMember, tags, characters)
                        : { src: selectedMember.avatarUrl };
                    const avatarSrc =
                      portrait.src && !failedAvatarUrls[portrait.src]
                        ? portrait.src
                        : undefined;
                    return avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={selectedMember.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedAvatarUrls((prev) => ({
                            ...prev,
                            [avatarSrc]: true,
                          }))
                        }
                        className={`w-12 h-12 object-cover border border-[#444] shrink-0 ${
                          selectedMember.category === 'cast' ? 'rounded-full' : 'rounded'
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 flex items-center justify-center font-bold text-sm shrink-0 border ${
                          selectedMember.category === 'cast'
                            ? 'rounded-full bg-[#2a221b] text-amber-300 border-amber-700/40'
                            : 'rounded bg-[#1c262e] text-cyan-300 border-cyan-800/40'
                        }`}
                      >
                        {getInitials(selectedMember.name)}
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-100 truncate">
                      {selectedMember.name}
                    </h3>
                    <p className="text-xs text-amber-400 font-medium truncate">
                      {selectedMember.role}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {selectedMember.department}
                      {selectedMember.unionStatus ? ` · ${selectedMember.unionStatus}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(selectedMember)}
                    className="px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#3a3a3a] text-gray-200 border border-[#444] text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 1: Contact Information */}
            <div className="p-4 border-b border-[#303030] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                  Contact Address Book
                </span>
                {selectedMember.preferredContact && (
                  <span className="text-[11px] text-gray-400">
                    Prefers {selectedMember.preferredContact}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 py-1 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2 text-gray-300 min-w-0">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-mono tabular-nums truncate">{selectedMember.phone}</span>
                  </div>
                  <button
                    onClick={() => handleCopy('phone', selectedMember.phone)}
                    className="text-[11px] text-gray-400 hover:text-amber-400 flex items-center gap-1 shrink-0"
                    title="Copy phone number"
                  >
                    {copiedField === 'phone' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 py-1 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2 text-gray-300 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{selectedMember.email}</span>
                  </div>
                  <button
                    onClick={() => handleCopy('email', selectedMember.email)}
                    className="text-[11px] text-gray-400 hover:text-amber-400 flex items-center gap-1 shrink-0"
                    title="Copy email"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {selectedMember.location && (
                  <div className="flex items-center gap-2 text-gray-300 py-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedMember.location}</span>
                  </div>
                )}

                {selectedMember.agencyOrCompany && (
                  <div className="flex items-center gap-2 text-gray-300 py-0.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedMember.agencyOrCompany}</span>
                  </div>
                )}

                {selectedMember.emergencyContact && (
                  <div className="flex items-center gap-2 text-gray-300 py-0.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-[11px] text-gray-300">
                      ICE: {selectedMember.emergencyContact}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Compensation / Pay */}
            <div className="p-4 border-b border-[#303030] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                  Pay & Deal Memo
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    selectedMember.paymentStatus === 'Approved'
                      ? 'text-emerald-400'
                      : selectedMember.paymentStatus === 'Pending Deal Memo'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedMember.paymentStatus}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-[#242424] p-2 rounded border border-[#323232]">
                  <div className="text-[10px] text-gray-400">Base Rate</div>
                  <div className="font-mono tabular-nums font-semibold text-gray-100 mt-0.5">
                    {formatCurrency(selectedMember.payRate)}
                  </div>
                  <div className="text-[10px] text-gray-400">{selectedMember.payBasis}</div>
                </div>

                <div className="bg-[#242424] p-2 rounded border border-[#323232]">
                  <div className="text-[10px] text-gray-400">Kit / Gear</div>
                  <div className="font-mono tabular-nums font-semibold text-gray-100 mt-0.5">
                    {selectedMember.kitFee ? formatCurrency(selectedMember.kitFee) : '$0'}
                  </div>
                  <div className="text-[10px] text-gray-400">per day</div>
                </div>

                <div className="bg-[#242424] p-2 rounded border border-[#323232]">
                  <div className="text-[10px] text-gray-400">Est. Total</div>
                  <div className="font-mono tabular-nums font-semibold text-amber-400 mt-0.5">
                    {formatCurrency(estimateMemberTotal(selectedMember))}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {selectedMember.scheduledDays.length} sched. day(s)
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Schedule & Scene Assignments */}
            <div className="p-4 border-b border-[#303030] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                  Schedule & Call Window
                </span>
                {renderAvailabilityIndicator(selectedMember.availabilityStatus)}
              </div>

              <div className="flex items-center justify-between text-xs bg-[#242424] px-3 py-2 rounded border border-[#323232]">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Standard Call / Wrap</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-gray-100">
                  {selectedMember.callTime || '07:00'} – {selectedMember.wrapTime || '19:00'}
                </span>
              </div>

              <div>
                <div className="text-[11px] text-gray-400 mb-1">Scheduled Shooting Days</div>
                {selectedMember.scheduledDays.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">No shooting days assigned</p>
                ) : (
                  <div className="text-xs text-gray-200 leading-relaxed">
                    {selectedMember.scheduledDays.join(' · ')}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] text-gray-400 mb-1.5">
                  Assigned Scenes ({selectedMember.linkedSceneIds.length})
                </div>
                {selectedMember.linkedSceneIds.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">No scenes linked</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMember.linkedSceneIds.map((sceneId) => {
                      const sc = scenes.find((s) => s.id === sceneId);
                      if (!sc) return null;
                      return (
                        <button
                          key={sceneId}
                          onClick={() => onSelectScene(sceneId)}
                          className="px-2 py-1 bg-[#262626] hover:bg-[#323232] text-gray-200 rounded border border-[#3a3a3a] text-[11px] font-mono tabular-nums transition-colors"
                          title={sc.heading}
                        >
                          Sc. {sc.sceneNumber}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedMember.scheduleNotes && (
                <div className="text-[11px] text-gray-300 bg-[#242424] p-2.5 rounded border border-[#323232] leading-relaxed">
                  {selectedMember.scheduleNotes}
                </div>
              )}
            </div>

            {/* Section 4: Cast & Crew Connections */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                  Cast & Crew Connections ({selectedMember.connections.length})
                </span>
                <button
                  onClick={() => setIsAddingConnection((prev) => !prev)}
                  disabled={availableConnectionTargets.length === 0 && !isAddingConnection}
                  className="text-[11px] text-amber-400 hover:text-amber-300 disabled:opacity-40 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingConnection ? 'Close' : 'Link Person'}</span>
                </button>
              </div>

              {/* Inline Add Connection Form */}
              {isAddingConnection && (
                <form
                  onSubmit={handleSubmitConnection}
                  className="p-3 bg-[#242424] rounded border border-[#444] space-y-2.5"
                >
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      Connect To Cast / Crew Member
                    </label>
                    <select
                      value={connTargetId}
                      onChange={(e) => setConnTargetId(e.target.value)}
                      required
                      className="w-full bg-[#171717] text-gray-200 px-2 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
                    >
                      <option value="">Select member...</option>
                      {availableConnectionTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name} ({target.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      Relationship / Work Connection
                    </label>
                    <select
                      value={
                        RELATIONSHIP_PRESETS.includes(connRelationship)
                          ? connRelationship
                          : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setConnRelationship(e.target.value);
                        } else {
                          setConnRelationship('');
                        }
                      }}
                      className="w-full bg-[#171717] text-gray-200 px-2 py-1.5 rounded border border-[#3a3a3a] text-xs mb-1.5 focus:outline-none focus:border-[#ff8000]"
                    >
                      {RELATIONSHIP_PRESETS.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                      <option value="custom">Custom Relationship...</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Relationship label..."
                      value={connRelationship}
                      onChange={(e) => setConnRelationship(e.target.value)}
                      required
                      className="w-full bg-[#171717] text-gray-200 px-2 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shared Scene 4 blocking & wire rig"
                      value={connNotes}
                      onChange={(e) => setConnNotes(e.target.value)}
                      className="w-full bg-[#171717] text-gray-200 px-2 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={connReciprocal}
                      onChange={(e) => setConnReciprocal(e.target.checked)}
                      className="accent-[#ff7700]"
                    />
                    <span>Create reciprocal connection on target profile</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingConnection(false)}
                      className="px-2.5 py-1 rounded text-[11px] text-gray-400 hover:bg-[#333]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!connTargetId || !connRelationship.trim()}
                      className="px-3 py-1 rounded text-[11px] bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold disabled:opacity-40"
                    >
                      Save Link
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Connections List */}
              {selectedMember.connections.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  No connections mapped yet. Link scene partners, supervisors, or department leads.
                </p>
              ) : (
                <div className="divide-y divide-[#2d2d2d] border border-[#323232] rounded bg-[#232323]">
                  {selectedMember.connections.map((conn) => {
                    const target = memberById.get(conn.memberId);
                    if (!target) return null;
                    return (
                      <div
                        key={conn.memberId}
                        className="p-2.5 flex items-start justify-between gap-2 hover:bg-[#2a2a2a] transition-colors"
                      >
                        <button
                          onClick={() => setSelectedMemberId(target.id)}
                          className="text-left flex-1 min-w-0 group"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-100 group-hover:text-[#ff8000] truncate">
                              {target.name}
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-[#ff8000] shrink-0" />
                          </div>
                          <div className="text-[11px] text-amber-400/90 mt-0.5">
                            {conn.relationship} ·{' '}
                            <span className="text-gray-400">{target.role}</span>
                          </div>
                          {conn.notes && (
                            <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                              {conn.notes}
                            </p>
                          )}
                        </button>
                        <button
                          onClick={() => onRemoveConnection(selectedMember.id, conn.memberId)}
                          className="p-1 text-gray-500 hover:text-red-400 shrink-0"
                          title="Remove connection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
          </div>
        </>
      )}

      {/* Add / Edit Cast & Crew Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#222222] border border-[#444444] rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-xs text-gray-200">
            <div className="px-5 py-3.5 bg-[#1b1b1b] border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#ff8000]" />
                <h2 className="text-sm font-bold text-gray-100">
                  {editingMember ? `Edit ${editingMember.name}` : 'Add Cast / Crew Member'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Section 1: Identity & Role */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-amber-400 border-b border-[#333] pb-1.5">
                  Identity & Work Role
                </h3>

                <div className="flex items-start gap-4">
                  {/* Profile Photo Upload */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {formAvatarUrl ? (
                      <div className="relative w-16 h-16">
                        <img
                          src={formAvatarUrl}
                          alt="Profile preview"
                          className="w-16 h-16 rounded object-cover border border-[#555]"
                        />
                        <button
                          type="button"
                          onClick={() => setFormAvatarUrl(undefined)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded bg-[#181818] border border-dashed border-[#4a4a4a] flex items-center justify-center text-gray-500 font-semibold">
                        {formName ? getInitials(formName) : 'IMG'}
                      </div>
                    )}
                    <label className="cursor-pointer text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Elena Morales"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Classification *</label>
                      <div className="flex items-center p-0.5 bg-[#171717] rounded border border-[#3e3e3e]">
                        <button
                          type="button"
                          onClick={() => {
                            setFormCategory('cast');
                            setFormDepartment('Cast / Principal');
                          }}
                          className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                            formCategory === 'cast'
                              ? 'bg-[#2e2e2e] text-[#ff8000]'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Cast
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormCategory('crew');
                            if (formDepartment === 'Cast / Principal') {
                              setFormDepartment('Camera & Lighting');
                            }
                          }}
                          className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                            formCategory === 'crew'
                              ? 'bg-[#2e2e2e] text-[#ff8000]'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Crew
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Department *</label>
                      <select
                        value={formDepartment}
                        onChange={(e) => setFormDepartment(e.target.value as CrewDepartment)}
                        className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Work Role / Title *</label>
                      <input
                        type="text"
                        required
                        placeholder={
                          formCategory === 'cast'
                            ? 'e.g. Lead Actor — AMBASSADOR JULIAN'
                            : 'e.g. Director of Photography'
                        }
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>

                    {formCategory === 'cast' && (
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Linked Script Character
                        </label>
                        <input
                          type="text"
                          list="script-characters-list"
                          placeholder="Select or type character..."
                          value={formCharacterName}
                          onChange={(e) => setFormCharacterName(e.target.value)}
                          className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                        />
                        <datalist id="script-characters-list">
                          {characters.map((ch) => (
                            <option key={ch.name} value={ch.name} />
                          ))}
                        </datalist>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Union / Guild Affiliation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SAG-AFTRA, IATSE Local 600, DGA"
                        value={formUnionStatus}
                        onChange={(e) => setFormUnionStatus(e.target.value)}
                        className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-amber-400 border-b border-[#333] pb-1.5">
                  Contact Address Book
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+1 (310) 555-0199"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 font-mono px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@studio.example"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Preferred Channel</label>
                    <select
                      value={formPreferredContact}
                      onChange={(e) =>
                        setFormPreferredContact(e.target.value as typeof formPreferredContact)
                      }
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    >
                      <option value="Phone">Phone</option>
                      <option value="Email">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="Radio Ch.">Radio Ch.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Base / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Soundstage 4, Los Angeles"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Agency / Loan-out Company
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vanguard Talent / CineOptics"
                      value={formAgency}
                      onChange={(e) => setFormAgency(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="Name · Phone"
                      value={formEmergency}
                      onChange={(e) => setFormEmergency(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Pay & Compensation */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-amber-400 border-b border-[#333] pb-1.5">
                  Pay Rate & Deal Memo
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Pay Rate (USD) *</label>
                    <input
                      type="number"
                      min="0"
                      step="25"
                      required
                      value={formPayRate}
                      onChange={(e) => setFormPayRate(e.target.value)}
                      className="w-full bg-[#171717] text-amber-300 font-mono tabular-nums px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Pay Basis</label>
                    <select
                      value={formPayBasis}
                      onChange={(e) => setFormPayBasis(e.target.value as PayBasis)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    >
                      {PAY_BASES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Kit / Gear Fee ($/day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="25"
                      value={formKitFee}
                      onChange={(e) => setFormKitFee(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 font-mono tabular-nums px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Deal Status</label>
                    <select
                      value={formPaymentStatus}
                      onChange={(e) => setFormPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    >
                      {PAYMENT_STATUSES.map((ps) => (
                        <option key={ps} value={ps}>
                          {ps}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Schedules & Scene Assignments */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-amber-400 border-b border-[#333] pb-1.5">
                  Schedules & Scene Assignments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Availability</label>
                    <select
                      value={formAvailability}
                      onChange={(e) => setFormAvailability(e.target.value as AvailabilityStatus)}
                      className="w-full bg-[#171717] text-gray-100 px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    >
                      {AVAILABILITY_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Call Time</label>
                    <input
                      type="text"
                      placeholder="07:00"
                      value={formCallTime}
                      onChange={(e) => setFormCallTime(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 font-mono px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Est. Wrap Time</label>
                    <input
                      type="text"
                      placeholder="19:00"
                      value={formWrapTime}
                      onChange={(e) => setFormWrapTime(e.target.value)}
                      className="w-full bg-[#171717] text-gray-100 font-mono px-2.5 py-1.5 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
                    />
                  </div>
                </div>

                {/* Scheduled Days Checkboxes */}
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">
                    Scheduled Shooting Days
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Array.from(new Set([...stripboardDays, ...formScheduledDays])).map((day) => {
                      const active = formScheduledDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDayInForm(day)}
                          className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                            active
                              ? 'bg-[#2c251d] border-[#ff8000] text-amber-300 font-medium'
                              : 'bg-[#171717] border-[#383838] text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="text"
                      placeholder="Add custom day (e.g. Day 4 Nov 13)"
                      value={formCustomDay}
                      onChange={(e) => setFormCustomDay(e.target.value)}
                      className="flex-1 bg-[#171717] text-gray-200 px-2.5 py-1 rounded border border-[#3a3a3a] text-[11px] focus:outline-none focus:border-[#ff8000]"
                    />
                    <button
                      type="button"
                      onClick={addCustomDayInForm}
                      className="px-2.5 py-1 bg-[#2f2f2f] hover:bg-[#3a3a3a] text-gray-200 rounded border border-[#444] text-[11px]"
                    >
                      Add Day
                    </button>
                  </div>
                </div>

                {/* Linked Scenes */}
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">
                    Assigned Scenes
                  </label>
                  <div className="max-h-28 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 bg-[#171717] rounded border border-[#383838]">
                    {scenes.map((sc) => {
                      const checked = formLinkedSceneIds.includes(sc.id);
                      return (
                        <label
                          key={sc.id}
                          className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer hover:text-white truncate"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSceneInForm(sc.id)}
                            className="accent-[#ff7700]"
                          />
                          <span className="truncate">
                            Sc. {sc.sceneNumber} — {sc.heading}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Schedule / Call Sheet Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Fittings, travel days, kit specs, or overtime restrictions..."
                    value={formScheduleNotes}
                    onChange={(e) => setFormScheduleNotes(e.target.value)}
                    className="w-full bg-[#171717] text-gray-200 p-2 rounded border border-[#3e3e3e] text-xs focus:outline-none focus:border-[#ff8000]"
                  />
                </div>
              </div>
            </form>

            <div className="px-5 py-3 bg-[#1b1b1b] border-t border-[#383838] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMember}
                disabled={!formName.trim() || !formRole.trim()}
                className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold rounded transition-colors"
              >
                {editingMember ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
