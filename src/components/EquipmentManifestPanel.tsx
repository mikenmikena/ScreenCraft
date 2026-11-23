import React, { useMemo, useState } from 'react';
import {
  EquipmentCategory,
  EquipmentItem,
  EquipmentStatus,
  Scene,
  StoryProject,
} from '../types/story';
import {
  Wrench,
  Plus,
  Trash2,
  Edit3,
  Download,
  Sparkles,
  Search,
  X,
  Check,
  Camera,
  Volume2,
  Sun,
  Truck,
  Cpu,
} from 'lucide-react';

interface EquipmentManifestPanelProps {
  project: StoryProject;
  equipment: EquipmentItem[];
  onUpdateEquipment: (items: EquipmentItem[]) => void;
  onSelectScene?: (sceneId: string) => void;
  onNotify?: (message: string) => void;
}

const CATEGORIES: EquipmentCategory[] = [
  'Camera',
  'Lenses',
  'Lighting & Grip',
  'Sound & Soundscape',
  'Vehicles & Picture Cars',
  'Post & DIT',
];

const STATUSES: EquipmentStatus[] = [
  'Reserved',
  'Checked Out',
  'On Set',
  'Maintenance',
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);

const getCategoryIcon = (cat: EquipmentCategory) => {
  switch (cat) {
    case 'Camera':
    case 'Lenses':
      return <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'Lighting & Grip':
      return <Sun className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    case 'Sound & Soundscape':
      return <Volume2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
    case 'Vehicles & Picture Cars':
      return <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'Post & DIT':
      return <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
};

const getStatusTextClass = (status: EquipmentStatus) => {
  switch (status) {
    case 'On Set':
      return 'text-emerald-400';
    case 'Checked Out':
      return 'text-cyan-400';
    case 'Reserved':
      return 'text-amber-300';
    case 'Maintenance':
      return 'text-rose-400';
  }
};

export const EquipmentManifestPanel: React.FC<EquipmentManifestPanelProps> = ({
  project,
  equipment,
  onUpdateEquipment,
  onSelectScene,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EquipmentCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EquipmentStatus>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<EquipmentCategory>('Camera');
  const [formQty, setFormQty] = useState('1');
  const [formDailyRate, setFormDailyRate] = useState('450');
  const [formShootDays, setFormShootDays] = useState(() =>
    String(Math.max(1, project.strips.filter((s) => s.type === 'day_break').length || 1))
  );
  const [formVendor, setFormVendor] = useState('');
  const [formStatus, setFormStatus] = useState<EquipmentStatus>('Reserved');
  const [formSceneIds, setFormSceneIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');

  const sceneById = useMemo(() => {
    const map = new Map<string, Scene>();
    project.scenes.forEach((sc) => map.set(sc.id, sc));
    return map;
  }, [project.scenes]);

  const metrics = useMemo(() => {
    const totalItems = equipment.length;
    const totalUnits = equipment.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    const activeUnits = equipment
      .filter((i) => i.status === 'Reserved' || i.status === 'Checked Out' || i.status === 'On Set')
      .reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    const maintenanceCount = equipment.filter((i) => i.status === 'Maintenance').length;
    const totalRentalEstimate = equipment.reduce(
      (sum, item) => sum + item.dailyRate * Math.max(1, item.quantity) * Math.max(1, item.shootDays),
      0
    );
    return {
      totalItems,
      totalUnits,
      activeUnits,
      maintenanceCount,
      totalRentalEstimate,
    };
  }, [equipment]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return equipment.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.vendor && item.vendor.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    });
  }, [equipment, categoryFilter, statusFilter, searchQuery]);

  const openAddForm = () => {
    setEditingId(null);
    setFormName('');
    setFormCategory('Camera');
    setFormQty('1');
    setFormDailyRate('350');
    setFormShootDays(
      String(Math.max(1, project.strips.filter((s) => s.type === 'day_break').length || 1))
    );
    setFormVendor('');
    setFormStatus('Reserved');
    setFormSceneIds([]);
    setFormNotes('');
    setIsFormOpen(true);
  };

  const openEditForm = (item: EquipmentItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQty(String(item.quantity));
    setFormDailyRate(String(item.dailyRate));
    setFormShootDays(String(item.shootDays));
    setFormVendor(item.vendor || '');
    setFormStatus(item.status);
    setFormSceneIds(item.assignedSceneIds || []);
    setFormNotes(item.notes || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) return;

    const item: EquipmentItem = {
      id: editingId || `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      category: formCategory,
      quantity: Math.max(1, Math.round(Number(formQty) || 1)),
      dailyRate: Math.max(0, Number(formDailyRate) || 0),
      shootDays: Math.max(1, Math.round(Number(formShootDays) || 1)),
      vendor: formVendor.trim() || undefined,
      status: formStatus,
      assignedSceneIds: formSceneIds,
      notes: formNotes.trim() || undefined,
    };

    if (editingId) {
      onUpdateEquipment(equipment.map((x) => (x.id === editingId ? item : x)));
      onNotify?.(`Updated equipment: ${item.name}`);
    } else {
      onUpdateEquipment([item, ...equipment]);
      onNotify?.(`Added to Equipment Manifest: ${item.name}`);
    }
    setIsFormOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    const target = equipment.find((x) => x.id === id);
    onUpdateEquipment(equipment.filter((x) => x.id !== id));
    if (target) onNotify?.(`Removed ${target.name} from manifest`);
  };

  const handleChangeStatus = (id: string, status: EquipmentStatus) => {
    onUpdateEquipment(equipment.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const toggleSceneLink = (sceneId: string) => {
    setFormSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const handleAutoScanScript = () => {
    const existingNames = new Set(equipment.map((e) => e.name.trim().toLowerCase()));
    const defaultDays = Math.max(
      1,
      project.strips.filter((s) => s.type === 'day_break').length || 1
    );
    const additions: EquipmentItem[] = [];

    const queueItem = (
      name: string,
      category: EquipmentCategory,
      dailyRate: number,
      sceneIds: string[],
      notes: string
    ) => {
      const key = name.trim().toLowerCase();
      if (!key || existingNames.has(key)) return;
      existingNames.add(key);
      additions.push({
        id: `eq-scan-${Date.now()}-${additions.length}`,
        name: name.trim(),
        category,
        quantity: 1,
        dailyRate,
        shootDays: Math.max(1, Math.min(defaultDays, sceneIds.length || defaultDays)),
        status: 'Reserved',
        assignedSceneIds: sceneIds,
        notes,
      });
    };

    // 1. Inspect storyboards for camera lenses & movement rigs
    (project.storyboards || []).forEach((sb) => {
      if (sb.lens && sb.lens.trim()) {
        queueItem(
          `${sb.lens.trim()} Prime Lens`,
          'Lenses',
          140,
          [sb.sceneId],
          `Detected from Storyboard Shot ${sb.shotNumber}`
        );
      }
      const mv = (sb.cameraMovement || '').toLowerCase();
      if (mv.includes('dolly') || mv.includes('track')) {
        queueItem(
          'Doorway Dolly & Track Package',
          'Lighting & Grip',
          260,
          [sb.sceneId],
          `Movement rig for Shot ${sb.shotNumber}`
        );
      } else if (mv.includes('drone') || mv.includes('aerial')) {
        queueItem(
          'Cinema Heavy-Lift Drone Package',
          'Camera',
          850,
          [sb.sceneId],
          `Aerial setup for Shot ${sb.shotNumber}`
        );
      } else if (mv.includes('handheld') || mv.includes('steadicam')) {
        queueItem(
          'Steadicam / Gimbal Stabilizer Rig',
          'Camera',
          380,
          [sb.sceneId],
          `Stabilizer rig for Shot ${sb.shotNumber}`
        );
      }
    });

    // 2. Inspect script notes / audio cues and storyboard audio notes for field recording kits
    const soundScenes = Array.from(
      new Set([
        ...project.elements
          .filter(
            (el) =>
              el.type === 'NOTE' ||
              /\b(soundscape|sfx|foley|audio|ambient|atmos|sound design)\b/i.test(el.text)
          )
          .map((el) => el.sceneId)
          .filter((id): id is string => Boolean(id)),
        ...(project.storyboards || [])
          .filter((sb) => Boolean(sb.audioNotes?.trim()))
          .map((sb) => sb.sceneId),
      ])
    );
    if (soundScenes.length > 0) {
      queueItem(
        'Location Boom + 4-Ch Field Recorder & Atmos Kit',
        'Sound & Soundscape',
        290,
        soundScenes,
        'Auto-flagged from script sound/audio cues & storyboard notes'
      );
    }

    // 3. Inspect night exterior scenes for lighting packages
    const nightExtScenes = project.scenes
      .filter((s) => s.intExt === 'EXT' && s.dayNight === 'NIGHT')
      .map((s) => s.id);
    if (nightExtScenes.length > 0) {
      queueItem(
        '18K HMI / LED Condor Night Exterior Lighting Kit',
        'Lighting & Grip',
        620,
        nightExtScenes,
        'Required for EXT NIGHT scenes'
      );
    }

    // 4. Inspect script tags (vehicles, sfx)
    project.tags.forEach((tag) => {
      if (tag.category === 'vehicle') {
        queueItem(
          `Picture Vehicle: ${tag.name}`,
          'Vehicles & Picture Cars',
          450,
          tag.sceneIds,
          'Synced from script vehicle tag'
        );
      } else if (tag.category === 'sfx') {
        queueItem(
          `SFX Rig: ${tag.name}`,
          'Lighting & Grip',
          220,
          tag.sceneIds,
          'Synced from script SFX tag'
        );
      }
    });

    // Ensure baseline Cinema Camera if manifest was empty
    if (equipment.length === 0 && additions.length === 0) {
      queueItem(
        'Digital Cinema A-Camera Body Package',
        'Camera',
        1150,
        project.scenes.slice(0, 3).map((s) => s.id),
        'Primary A-Cam body & media'
      );
    }

    if (additions.length === 0) {
      onNotify?.('No new unlogged equipment cues found in script or storyboards');
      return;
    }

    onUpdateEquipment([...additions, ...equipment]);
    onNotify?.(`Added ${additions.length} equipment item(s) from script & storyboards`);
  };

  const handleExportCsv = () => {
    const headers = [
      'Item',
      'Category',
      'Quantity',
      'Daily Rate (USD)',
      'Shoot Days',
      'Est. Rental Total (USD)',
      'Vendor',
      'Status',
      'Assigned Scenes',
      'Notes',
    ];
    const escape = (val: string | number) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = filteredItems.map((item) => [
      item.name,
      item.category,
      item.quantity,
      item.dailyRate,
      item.shootDays,
      item.quantity * item.dailyRate * item.shootDays,
      item.vendor || '',
      item.status,
      item.assignedSceneIds
        .map((id) => {
          const sc = sceneById.get(id);
          return sc ? `Sc.${sc.sceneNumber}` : id;
        })
        .join('; '),
      item.notes || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_equipment_manifest.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.('Exported Equipment Manifest CSV');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#1b1b1b] text-xs text-gray-200 overflow-hidden">
      {/* Top Action & Filter Bar */}
      <div className="bg-[#222222] border-b border-[#353535] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 pr-2 border-r border-[#383838]">
            <Wrench className="w-4 h-4 text-[#ff8000]" />
            <span className="font-bold text-gray-100">Equipment Manifest</span>
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gear, vendor, notes..."
              className="w-full bg-[#161616] border border-[#3a3a3a] rounded pl-8 pr-7 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | EquipmentCategory)}
            className="bg-[#161616] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | EquipmentStatus)}
            className="bg-[#161616] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoScanScript}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#343434] text-cyan-300 border border-[#444] rounded font-medium transition-colors whitespace-nowrap"
            title="Detect lenses, lighting, soundscape kits, and vehicle gear from script & storyboards"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Scan Script & Boards</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#343434] disabled:opacity-40 text-gray-200 border border-[#444] rounded font-medium transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold rounded transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bg-[#1f1f1f] border-b border-[#333333] px-4 py-2.5 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#323232] shrink-0">
        <div className="pr-4">
          <div className="text-[11px] text-gray-400">Logged Line Items</div>
          <div className="text-sm font-semibold text-gray-100 tabular-nums mt-0.5">
            {metrics.totalItems} packages · {metrics.totalUnits} total units
          </div>
        </div>
        <div className="px-4">
          <div className="text-[11px] text-gray-400">Active / Reserved Readiness</div>
          <div className="text-sm font-semibold text-emerald-400 tabular-nums mt-0.5">
            {metrics.activeUnits} / {metrics.totalUnits} units cleared
          </div>
        </div>
        <div className="px-4">
          <div className="text-[11px] text-gray-400">Maintenance / Holds</div>
          <div
            className={`text-sm font-semibold tabular-nums mt-0.5 ${
              metrics.maintenanceCount > 0 ? 'text-rose-400' : 'text-gray-300'
            }`}
          >
            {metrics.maintenanceCount} {metrics.maintenanceCount === 1 ? 'item' : 'items'} flagged
          </div>
        </div>
        <div className="pl-4">
          <div className="text-[11px] text-gray-400">Estimated Rental Subtotal</div>
          <div className="text-sm font-bold font-mono text-amber-400 tabular-nums mt-0.5">
            {formatCurrency(metrics.totalRentalEstimate)}
          </div>
        </div>
      </div>

      {/* Inline Add / Edit Drawer */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveForm}
          className="bg-[#242424] border-b border-[#404040] px-4 py-3 space-y-3 shrink-0"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300">
              {editingId ? 'Edit Equipment Line Item' : 'New Equipment Package'}
            </span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
            <label className="md:col-span-2 space-y-1">
              <span className="text-[11px] text-gray-400">Gear / Package Name</span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. ARRI Alexa 35 Production Package"
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-gray-400">Category</span>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as EquipmentCategory)}
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-gray-400">Qty</span>
              <input
                type="number"
                min={1}
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-gray-400">Daily Rate ($)</span>
              <input
                type="number"
                min={0}
                value={formDailyRate}
                onChange={(e) => setFormDailyRate(e.target.value)}
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-gray-400">Shoot Days</span>
              <input
                type="number"
                min={1}
                value={formShootDays}
                onChange={(e) => setFormShootDays(e.target.value)}
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <label className="space-y-1">
              <span className="text-[11px] text-gray-400">Vendor / Rental House</span>
              <input
                type="text"
                value={formVendor}
                onChange={(e) => setFormVendor(e.target.value)}
                placeholder="Panavision / Keslow / Internal"
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-gray-400">Status</span>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as EquipmentStatus)}
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-[11px] text-gray-400">Rigging / Tech Notes</span>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Power requirements, battery count, mount type..."
                className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
              />
            </label>
          </div>

          {project.scenes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-gray-400 block">Assigned Scenes</span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {project.scenes.map((sc) => {
                  const selected = formSceneIds.includes(sc.id);
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => toggleSceneLink(sc.id)}
                      className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                        selected
                          ? 'bg-[#2e1e0f] border-[#ff8000] text-amber-300 font-semibold'
                          : 'bg-[#171717] border-[#363636] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Sc. {sc.sceneNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 rounded bg-[#2e2e2e] hover:bg-[#3a3a3a] text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingId ? 'Save Changes' : 'Add to Manifest'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Main Equipment Table */}
      <div className="flex-1 overflow-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3 py-12">
            <Wrench className="w-10 h-10 text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-200">
                {equipment.length === 0
                  ? 'No Equipment Logged Yet'
                  : 'No Equipment Matches Your Filters'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Add camera, lens, grip, sound, or vehicle packages manually, or run Auto-Scan to extract gear needs from your script & storyboards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoScanScript}
                className="px-3.5 py-2 bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] text-cyan-300 font-semibold rounded flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Scan Script & Boards</span>
              </button>
              <button
                type="button"
                onClick={openAddForm}
                className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold rounded flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Equipment</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#222222] border border-[#353535] rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#191919] border-b border-[#333333] text-[11px] text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2.5 font-semibold">Equipment Package</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Rate / Day</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Days</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Rental Total</th>
                  <th className="px-3 py-2.5 font-semibold">Vendor &amp; Scenes</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d]">
                {filteredItems.map((item) => {
                  const lineTotal =
                    item.dailyRate * Math.max(1, item.quantity) * Math.max(1, item.shootDays);
                  return (
                    <tr key={item.id} className="hover:bg-[#272727] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-100">{item.name}</div>
                        {item.notes && (
                          <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-xs">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-gray-300">
                          {getCategoryIcon(item.category)}
                          <span>{item.category}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-200">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-300">
                        {formatCurrency(item.dailyRate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-300">
                        {item.shootDays}d
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-amber-300">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-gray-200">
                          {item.vendor || <span className="text-gray-500">Unassigned</span>}
                        </div>
                        {item.assignedSceneIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.assignedSceneIds.slice(0, 4).map((sid) => {
                              const sc = sceneById.get(sid);
                              return (
                                <button
                                  key={sid}
                                  type="button"
                                  onClick={() => onSelectScene?.(sid)}
                                  className="text-[10px] font-mono text-cyan-300 hover:underline"
                                >
                                  {sc ? `Sc.${sc.sceneNumber}` : sid}
                                </button>
                              );
                            })}
                            {item.assignedSceneIds.length > 4 && (
                              <span className="text-[10px] text-gray-500">
                                +{item.assignedSceneIds.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleChangeStatus(item.id, e.target.value as EquipmentStatus)
                          }
                          className={`bg-[#171717] border border-[#3a3a3a] rounded px-2 py-1 text-[11px] font-medium focus:outline-none focus:border-[#ff8000] ${getStatusTextClass(
                            item.status
                          )}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="text-gray-200">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#333333]"
                            title="Edit equipment item"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-[#333333]"
                            title="Remove equipment item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
