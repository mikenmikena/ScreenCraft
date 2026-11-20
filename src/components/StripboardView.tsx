import React, { useState } from 'react';
import { StripboardStrip, Scene } from '../types/story';
import {
  Calendar,
  ArrowUp,
  ArrowDown,
  Coffee,
  Sun,
  Moon,
  Users,
  Layers,
  FileText,
  MapPin,
  RefreshCw,
  Edit3,
  Check,
  X,
} from 'lucide-react';

interface StripboardViewProps {
  strips: StripboardStrip[];
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onUpdateStrips: (newStrips: StripboardStrip[]) => void;
  onAddDayBreak: () => void;
  onAddMealBreak: () => void;
  crewCount?: number;
  locationCount?: number;
  pendingSyncCount?: number;
  onOpenRevisionImpact?: () => void;
  onSwitchSubView?: (view: 'stripboard' | 'cast_crew' | 'location_map') => void;
  onOpenCallSheet?: (dayNumber?: number) => void;
}

export const StripboardView: React.FC<StripboardViewProps> = ({
  strips,
  scenes: _scenes,
  selectedSceneId,
  onSelectScene,
  onUpdateStrips,
  onAddDayBreak,
  onAddMealBreak,
  crewCount = 0,
  locationCount = 0,
  pendingSyncCount = 0,
  onOpenRevisionImpact,
  onSwitchSubView,
  onOpenCallSheet,
}) => {
  const [selectedStripId, setSelectedStripId] = useState<string | null>(null);
  const [editingStripId, setEditingStripId] = useState<string | null>(null);
  const [editSet, setEditSet] = useState('');
  const [editIntExt, setEditIntExt] = useState('INT');
  const [editDayNight, setEditDayNight] = useState('DAY');
  const [editTimeOfDay, setEditTimeOfDay] = useState('09:00');
  const [editStoryDay, setEditStoryDay] = useState(1);

  const moveStrip = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === strips.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...strips];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    onUpdateStrips(updated);
  };

  const removeStrip = (id: string) => {
    onUpdateStrips(strips.filter((s) => s.id !== id));
  };

  const startEditStrip = (strip: StripboardStrip) => {
    setEditingStripId(strip.id);
    setEditSet(strip.set || '');
    setEditIntExt(strip.intExt || 'INT');
    setEditDayNight(strip.dayNight || 'DAY');
    setEditTimeOfDay(strip.timeOfDay || '09:00');
    setEditStoryDay(strip.storyDay || 1);
  };

  const saveEditStrip = (stripId: string) => {
    const updated = strips.map((s) =>
      s.id === stripId
        ? {
            ...s,
            set: editSet.trim().toUpperCase() || s.set,
            intExt: editIntExt,
            dayNight: editDayNight,
            timeOfDay: editTimeOfDay,
            storyDay: editStoryDay,
          }
        : s
    );
    onUpdateStrips(updated);
    setEditingStripId(null);
  };

  const getStripColorStyle = (strip: StripboardStrip) => {
    if (strip.type !== 'scene') return '';
    const intExt = (strip.intExt || 'INT').toUpperCase();
    const dayNight = (strip.dayNight || 'DAY').toUpperCase();

    if (intExt === 'EXT' && dayNight === 'DAY') {
      return 'bg-[#22d3ee] text-black font-semibold';
    }
    if (intExt === 'EXT' && dayNight !== 'DAY') {
      return 'bg-[#60a5fa] text-black font-semibold';
    }
    if (intExt === 'INT' && dayNight === 'DAY') {
      return 'bg-[#fef08a] text-black font-semibold';
    }
    return 'bg-[#fb923c] text-black font-semibold';
  };

  return (
    <div className="flex-1 bg-[#202020] overflow-y-auto flex flex-col text-xs select-none">
      {/* Stripboard & Production Schedule Toolbar */}
      <div className="bg-[#292929] px-4 py-2 border-b border-[#3e3e3e] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onSwitchSubView ? (
            <div className="flex items-center p-0.5 bg-[#191919] rounded border border-[#3c3c3c]">
              <button
                onClick={() => onSwitchSubView('stripboard')}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#333333] text-[#ff8000] shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stripboard</span>
              </button>
              <button
                onClick={() => onSwitchSubView('cast_crew')}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cast & Crew Address Book ({crewCount})</span>
              </button>
              <button
                onClick={() => onSwitchSubView('location_map')}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap shrink-0"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Location Map ({locationCount})</span>
              </button>
            </div>
          ) : (
            <span className="font-semibold text-gray-200 uppercase tracking-wider text-xs">
              Production Day-Break Stripboard
            </span>
          )}
          <span className="text-[11px] text-gray-400 font-mono tabular-nums whitespace-nowrap">
            {strips.filter((s) => s.type === 'scene').length} strips
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onOpenRevisionImpact && (
            <button
              onClick={onOpenRevisionImpact}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${
                pendingSyncCount > 0
                  ? 'bg-[#2e2012] hover:bg-[#3a2816] text-amber-300 border-[#ff7700]'
                  : 'bg-[#242424] hover:bg-[#333] text-emerald-400 border-[#444]'
              }`}
              title="Preview live script-to-schedule diff and conflicts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {pendingSyncCount > 0
                  ? `Script Sync (${pendingSyncCount})`
                  : 'Script Synced'}
              </span>
            </button>
          )}
          {onOpenCallSheet && (
            <button
              onClick={() => onOpenCallSheet()}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap shrink-0"
              title="Generate shareable PDF Call Sheet from Stripboard & Cast/Crew Directory"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Call Sheet PDF</span>
            </button>
          )}
          <button
            onClick={onAddDayBreak}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#333333] hover:bg-[#444444] text-gray-200 rounded border border-[#4d4d4d] transition-colors whitespace-nowrap shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Shoot Day</span>
          </button>
          <button
            onClick={onAddMealBreak}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#333333] hover:bg-[#444444] text-gray-200 rounded border border-[#4d4d4d] transition-colors whitespace-nowrap shrink-0"
          >
            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Meal/Move</span>
          </button>
        </div>
      </div>

      {/* Main Stripboard Grid */}
      <div className="overflow-x-auto min-w-full">
        <div className="grid grid-cols-12 bg-[#171717] text-gray-400 font-semibold text-[11px] border-b border-[#3a3a3a] py-2 px-3 tracking-wider">
          <div className="col-span-1">INT / EXT</div>
          <div className="col-span-1">DAY / NIGHT</div>
          <div className="col-span-2">SET / LOCATION</div>
          <div className="col-span-1">RUN TIME</div>
          <div className="col-span-1">PAGES</div>
          <div className="col-span-1">STORY DAY</div>
          <div className="col-span-1">S. DUR.</div>
          <div className="col-span-3">CHARACTERS</div>
          <div className="col-span-1 text-right">TIME / MOVE</div>
        </div>

        {/* Strips Flow */}
        <div className="divide-y divide-[#333333]">
          {strips.map((strip, idx) => {
            const isSelected =
              strip.id === selectedStripId ||
              (strip.sceneId && strip.sceneId === selectedSceneId);

            if (strip.type === 'day_break') {
              const dayNumber =
                strips
                  .slice(0, idx + 1)
                  .filter((s) => s.type === 'day_break').length || 1;
              return (
                <div
                  key={strip.id}
                  className="bg-[#2f2f2f] text-gray-200 border-y-2 border-black/60 px-4 py-2 flex items-center justify-between font-medium shadow-md"
                >
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-amber-400 tracking-wider">
                      {strip.bannerTitle || 'START OF DAY'}
                    </span>
                    <span className="text-[11px] text-gray-300">
                      DATE: {strip.bannerDate || 'Monday, 10 Nov 2026'}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300 bg-[#222] px-2 py-0.5 rounded border border-[#444]">
                      {strip.bannerTotalPages || '64 PAGES'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-gray-400">
                      FROM: <span className="text-white font-mono">{strip.bannerFrom || '09:00'}</span> TO:{' '}
                      <span className="text-white font-mono">{strip.bannerTo || '23:00'}</span>
                    </span>
                    {onOpenCallSheet && (
                      <button
                        onClick={() => onOpenCallSheet(dayNumber)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-[#1e1e1e] hover:bg-[#ff7700] hover:text-black text-amber-300 rounded border border-[#444] text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
                        title={`Generate Call Sheet PDF for Shoot Day ${dayNumber}`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>Day {dayNumber} Call Sheet</span>
                      </button>
                    )}
                    <button
                      onClick={() => removeStrip(strip.id)}
                      className="text-gray-400 hover:text-red-400 ml-2"
                      title="Remove Day Break"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            }

            if (strip.type === 'banner') {
              return (
                <div
                  key={strip.id}
                  className="bg-[#403d39] text-amber-200 border-y border-[#524e49] px-4 py-1.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-[11px] font-mono text-amber-300">
                      {strip.bannerFrom} - {strip.bannerTo}
                    </span>
                    <span className="font-semibold uppercase tracking-wide">
                      {strip.bannerTitle || 'lunch and move'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-gray-300">{strip.scheduledDuration || '01:00'}</span>
                    <button
                      onClick={() => removeStrip(strip.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            }

            const colorClass = getStripColorStyle(strip);
            const isEditing = editingStripId === strip.id;

            return (
              <div key={strip.id}>
                <div
                  onClick={() => {
                    setSelectedStripId(strip.id);
                    if (strip.sceneId) onSelectScene(strip.sceneId);
                  }}
                  className={`grid grid-cols-12 py-2 px-3 text-xs cursor-pointer items-center transition-all ${colorClass} ${
                    isSelected ? 'ring-2 ring-black ring-inset shadow-lg' : 'hover:opacity-95'
                  }`}
                >
                  <div className="col-span-1 font-bold tracking-wider">
                    {strip.intExt || 'INT'}
                  </div>

                  <div className="col-span-1 font-medium flex items-center space-x-1">
                    {strip.dayNight === 'NIGHT' ? (
                      <Moon className="w-3 h-3 text-gray-800" />
                    ) : (
                      <Sun className="w-3 h-3 text-amber-800" />
                    )}
                    <span>{strip.dayNight || 'DAY'}</span>
                  </div>

                  <div className="col-span-2 font-bold truncate pr-2">
                    {strip.sceneNumber ? `#${strip.sceneNumber} ` : ''}
                    {strip.set || 'SET'}
                  </div>

                  <div className="col-span-1 font-mono text-[11px] tabular-nums">
                    {strip.runningTime || '00:01:00'}
                  </div>

                  <div className="col-span-1 font-mono font-bold tabular-nums">
                    {strip.pages || '1'}
                  </div>

                  <div className="col-span-1 font-medium tabular-nums">
                    {strip.storyDay || '1'}
                  </div>

                  <div className="col-span-1 font-mono tabular-nums">
                    {strip.scheduledDuration || '01:00'}
                  </div>

                  <div className="col-span-3 text-[11px] truncate pr-2 font-sans opacity-90">
                    {strip.characters && strip.characters.length > 0
                      ? strip.characters.join(' / ')
                      : 'NO CAST'}
                  </div>

                  <div className="col-span-1 flex items-center justify-end space-x-1 text-right">
                    <span className="font-mono text-[11px] mr-1 tabular-nums">
                      {strip.timeOfDay || '09:00'}
                    </span>
                    <div className="flex items-center space-x-0.5 opacity-75 hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) setEditingStripId(null);
                          else startEditStrip(strip);
                        }}
                        className="p-0.5 hover:bg-black/20 rounded"
                        title="Edit Strip (Syncs live back to Script)"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStrip(idx, 'up');
                        }}
                        className="p-0.5 hover:bg-black/20 rounded"
                        title="Move Strip Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStrip(idx, 'down');
                        }}
                        className="p-0.5 hover:bg-black/20 rounded"
                        title="Move Strip Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Two-Way Strip Editor (Schedule -> Script live writeback) */}
                {isEditing && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1b1b1b] border-y border-[#3a3a3a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-gray-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-amber-400 font-semibold">
                        Two-Way Strip Edit (writes to Script):
                      </span>
                      <select
                        value={editIntExt}
                        onChange={(e) => setEditIntExt(e.target.value)}
                        className="bg-[#141414] border border-[#3e3e3e] rounded px-2 py-1 text-xs text-gray-200"
                      >
                        <option value="INT">INT</option>
                        <option value="EXT">EXT</option>
                        <option value="INT/EXT">INT/EXT</option>
                      </select>
                      <input
                        type="text"
                        value={editSet}
                        onChange={(e) => setEditSet(e.target.value)}
                        placeholder="Set / Location"
                        className="bg-[#141414] border border-[#3e3e3e] rounded px-2.5 py-1 text-xs text-gray-200 w-48"
                      />
                      <select
                        value={editDayNight}
                        onChange={(e) => setEditDayNight(e.target.value)}
                        className="bg-[#141414] border border-[#3e3e3e] rounded px-2 py-1 text-xs text-gray-200"
                      >
                        <option value="DAY">DAY</option>
                        <option value="NIGHT">NIGHT</option>
                        <option value="EVENING">EVENING</option>
                        <option value="DUSK">DUSK</option>
                        <option value="DAWN">DAWN</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={editStoryDay}
                        onChange={(e) => setEditStoryDay(Number(e.target.value) || 1)}
                        className="bg-[#141414] border border-[#3e3e3e] rounded px-2 py-1 text-xs text-gray-200 w-16 font-mono"
                        title="Story Day"
                      />
                      <input
                        type="text"
                        value={editTimeOfDay}
                        onChange={(e) => setEditTimeOfDay(e.target.value)}
                        className="bg-[#141414] border border-[#3e3e3e] rounded px-2 py-1 text-xs text-cyan-300 w-20 font-mono"
                        title="Time of Day"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingStripId(null)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#2a2a2a] hover:bg-[#353535] rounded text-gray-300"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => saveEditStrip(strip.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded"
                      >
                        <Check className="w-3 h-3" />
                        <span>Apply & Sync Script</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

