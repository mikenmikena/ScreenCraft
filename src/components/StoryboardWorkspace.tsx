import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Camera,
  Compass,
  Volume2,
  Clock,
  Layers,
  ArrowRight,
  Upload,
  Grid,
  Sliders
} from 'lucide-react';
import {
  StoryboardFrame,
  Scene,
  ShotType,
  CameraMovement,
  StoryProject
} from '../types/story';
import { printStoryboardDocument } from '../utils/printHelper';
import { StoryboardBlockingCanvasModal } from './StoryboardBlockingCanvasModal';

interface StoryboardWorkspaceProps {
  project: StoryProject;
  scenes: Scene[];
  storyboards: StoryboardFrame[];
  onUpdateStoryboards: (storyboards: StoryboardFrame[]) => void;
  onSelectScene: (sceneId: string) => void;
}

const SHOT_TYPES: ShotType[] = [
  'Wide Shot (WS)',
  'Extreme Long Shot (XMS)',
  'Medium Shot (MS)',
  'Close Up (CU)',
  'Extreme Close Up (ECU)',
  'Over The Shoulder (OTS)',
  'Point of View (POV)',
  'Dutch Angle',
  'Aerial / Bird Eye',
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'Static / Locked Off',
  'Pan Left',
  'Pan Right',
  'Tilt Up',
  'Tilt Down',
  'Dolly In',
  'Dolly Out',
  'Tracking / Truck',
  'Crane / Jib',
  'Steadicam / Handheld',
];

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({
  project,
  scenes,
  storyboards = [],
  onUpdateStoryboards,
  onSelectScene,
}) => {
  const [selectedSceneFilter, setSelectedSceneFilter] = useState<string>('all');
  const [globalAspectRatio, setGlobalAspectRatio] = useState<'16:9' | '2.39:1' | '4:3'>('16:9');
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(false);

  // Animatic Playback State
  const [isPlayingAnimatic, setIsPlayingAnimatic] = useState(false);
  const [currentAnimaticIndex, setCurrentAnimaticIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Sketch Drawing Modal State
  const [sketchingFrameId, setSketchingFrameId] = useState<string | null>(null);

  // Frame Editor Modal
  const [editingFrame, setEditingFrame] = useState<StoryboardFrame | null>(null);
  const [isNewFrame, setIsNewFrame] = useState(false);

  // Filtered frames
  const filteredFrames = storyboards.filter((frame) => {
    if (selectedSceneFilter === 'all') return true;
    return frame.sceneId === selectedSceneFilter;
  });

  // Animatic timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAnimatic && filteredFrames.length > 0) {
      const activeFrame = filteredFrames[currentAnimaticIndex];
      const durationMs = ((activeFrame?.durationSec || 3) * 1000) / playbackSpeed;

      timer = setTimeout(() => {
        if (currentAnimaticIndex < filteredFrames.length - 1) {
          setCurrentAnimaticIndex((prev) => prev + 1);
        } else {
          setIsPlayingAnimatic(false);
          setCurrentAnimaticIndex(0);
        }
      }, durationMs);
    }
    return () => clearTimeout(timer);
  }, [isPlayingAnimatic, currentAnimaticIndex, filteredFrames, playbackSpeed]);

  // Sketch Canvas Save & Open Handlers
  const saveSketch = (frameId: string, dataUrl: string) => {
    const updated = storyboards.map((f) =>
      f.id === frameId ? { ...f, imageUrl: dataUrl, drawingData: dataUrl } : f
    );
    onUpdateStoryboards(updated);
    setSketchingFrameId(null);
  };

  const openSketchModal = (frame: StoryboardFrame) => {
    setSketchingFrameId(frame.id);
  };

  // Reordering & frame operations
  const moveFrame = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === storyboards.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...storyboards];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onUpdateStoryboards(updated);
  };

  const deleteFrame = (id: string) => {
    onUpdateStoryboards(storyboards.filter((f) => f.id !== id));
  };

  const duplicateFrame = (frame: StoryboardFrame) => {
    const newFrame: StoryboardFrame = {
      ...frame,
      id: `sb-${Date.now()}`,
      shotNumber: `${frame.shotNumber}B`,
    };
    onUpdateStoryboards([...storyboards, newFrame]);
  };

  const handleCreateNewFrame = () => {
    const defaultScene = scenes[0]?.id || 'scene-1';
    const newF: StoryboardFrame = {
      id: `sb-${Date.now()}`,
      sceneId: selectedSceneFilter !== 'all' ? selectedSceneFilter : defaultScene,
      shotNumber: `${storyboards.length + 1}`,
      shotType: 'Medium Shot (MS)',
      cameraMovement: 'Static / Locked Off',
      lens: '50mm Prime',
      aspectRatio: globalAspectRatio,
      description: 'Describe camera framing, actor blocking, and visual cues...',
      dialogue: '',
      audioNotes: '',
      durationSec: 4.0,
      equipment: 'Tripod',
    };
    setEditingFrame(newF);
    setIsNewFrame(true);
  };

  const handleSaveEditedFrame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFrame) return;

    if (isNewFrame) {
      onUpdateStoryboards([...storyboards, editingFrame]);
    } else {
      onUpdateStoryboards(
        storyboards.map((f) => (f.id === editingFrame.id ? editingFrame : f))
      );
    }
    setEditingFrame(null);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, frameId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const updated = storyboards.map((f) =>
            f.id === frameId ? { ...f, imageUrl: reader.result as string } : f
          );
          onUpdateStoryboards(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 bg-[#1a1a1a] text-gray-200 overflow-y-auto flex flex-col select-none text-xs">
      {/* Storyboard Top Ribbon Bar */}
      <div className="bg-[#262626] border-b border-[#3e3e3e] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Film className="w-4 h-4 text-[#ff7700]" />
            <span>Production Storyboard & Pre-Vis</span>
          </div>

          <span className="text-gray-500">|</span>

          {/* Filter by Scene */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-gray-400">Scene:</span>
            <select
              value={selectedSceneFilter}
              onChange={(e) => setSelectedSceneFilter(e.target.value)}
              className="bg-[#1c1c1c] text-gray-200 text-xs px-2 py-1 rounded border border-[#3e3e3e] focus:outline-none focus:border-[#ff8000]"
            >
              <option value="all">All Scenes ({storyboards.length} Shots)</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Sc {s.sceneNumber}: {s.heading}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center space-x-1 text-xs bg-[#1f1f1f] px-2 py-1 rounded border border-[#383838]">
            <span className="text-gray-400">Ratio:</span>
            <select
              value={globalAspectRatio}
              onChange={(e) => setGlobalAspectRatio(e.target.value as any)}
              className="bg-transparent text-amber-400 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="16:9" className="bg-[#222]">16:9 HD Broadcast</option>
              <option value="2.39:1" className="bg-[#222]">2.39:1 Anamorphic Scope</option>
              <option value="4:3" className="bg-[#222]">4:3 Classic Academy</option>
            </select>
          </div>

          {/* Rule of Thirds Toggle */}
          <button
            onClick={() => setShowGridOverlay(!showGridOverlay)}
            className={`px-2 py-1 rounded border flex items-center space-x-1 transition-colors ${
              showGridOverlay
                ? 'bg-[#3d2e1e] border-[#ff7700] text-amber-300'
                : 'bg-[#222] border-[#3e3e3e] text-gray-400 hover:text-white'
            }`}
            title="Toggle Rule of Thirds Grid"
          >
            <Grid className="w-3 h-3" />
            <span>Thirds Grid</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Animatic Play Button */}
          <button
            onClick={() => {
              if (isPlayingAnimatic) {
                setIsPlayingAnimatic(false);
              } else {
                setCurrentAnimaticIndex(0);
                setIsPlayingAnimatic(true);
              }
            }}
            disabled={filteredFrames.length === 0}
            className={`px-3 py-1.5 rounded font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              isPlayingAnimatic
                ? 'bg-amber-500 text-black animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlayingAnimatic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlayingAnimatic ? 'Pause Animatic' : 'Play Animatic'}</span>
          </button>

          {/* Add Frame Button */}
          <button
            onClick={handleCreateNewFrame}
            className="px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-bold rounded flex items-center space-x-1.5 shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Shot Frame</span>
          </button>

          {/* Print Storyboard Sheet */}
          <button
            type="button"
            onClick={() => printStoryboardDocument(project, filteredFrames)}
            className="p-1.5 bg-[#333] hover:bg-[#444] text-gray-300 hover:text-white rounded border border-[#444]"
            title="Print Storyboard Sheet (downloads PDF automatically if browser blocks print)"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Storyboard Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredFrames.length === 0 ? (
          <div className="text-center py-20 bg-[#222] rounded-lg border border-dashed border-[#444] max-w-lg mx-auto p-8 space-y-3">
            <Film className="w-12 h-12 mx-auto text-gray-600" />
            <h3 className="text-base font-bold text-gray-200">No Storyboard Shots Added</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Create visual shot cards, camera angles, movement notations, and actor blocking sketches for your screenplay scenes.
            </p>
            <button
              onClick={handleCreateNewFrame}
              className="px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-bold rounded shadow transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Storyboard Frame</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredFrames.map((frame, index) => {
              const scene = scenes.find((s) => s.id === frame.sceneId);
              const aspectClass =
                globalAspectRatio === '2.39:1'
                  ? 'aspect-[2.39/1]'
                  : globalAspectRatio === '4:3'
                  ? 'aspect-[4/3]'
                  : 'aspect-[16/9]';

              return (
                <div
                  key={frame.id}
                  className="bg-[#242424] rounded-lg border border-[#3e3e3e] shadow-xl overflow-hidden flex flex-col transition-all hover:border-gray-500 group"
                >
                  {/* Card Header Bar */}
                  <div className="bg-[#1c1c1c] px-3 py-2 border-b border-[#333] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-[#ff7700] font-mono text-xs">
                        SHOT {frame.shotNumber}
                      </span>
                      {scene && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                          Sc #{scene.sceneNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveFrame(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-[#333] rounded disabled:opacity-30"
                        title="Move Shot Left/Up"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveFrame(index, 'down')}
                        disabled={index === filteredFrames.length - 1}
                        className="p-1 hover:bg-[#333] rounded disabled:opacity-30"
                        title="Move Shot Right/Down"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => duplicateFrame(frame)}
                        className="p-1 hover:bg-[#333] text-gray-400 hover:text-white rounded"
                        title="Duplicate Frame"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteFrame(frame.id)}
                        className="p-1 hover:bg-[#333] text-gray-400 hover:text-red-400 rounded"
                        title="Delete Frame"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Cinematic Frame Canvas / Photo Container */}
                  <div className={`relative bg-black w-full ${aspectClass} overflow-hidden flex items-center justify-center`}>
                    {frame.imageUrl ? (
                      <img
                        src={frame.imageUrl}
                        alt={`Shot ${frame.shotNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 space-y-2">
                        <Camera className="w-8 h-8 mx-auto text-gray-600" />
                        <span className="text-[11px] text-gray-500 block">No Visual Added</span>
                      </div>
                    )}

                    {/* Rule of Thirds Grid Overlay */}
                    {showGridOverlay && (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-cyan-400/30">
                        <div className="border-r border-b border-cyan-400/30"></div>
                        <div className="border-r border-b border-cyan-400/30"></div>
                        <div className="border-b border-cyan-400/30"></div>
                        <div className="border-r border-b border-cyan-400/30"></div>
                        <div className="border-r border-b border-cyan-400/30"></div>
                        <div className="border-b border-cyan-400/30"></div>
                        <div className="border-r border-cyan-400/30"></div>
                        <div className="border-r border-cyan-400/30"></div>
                        <div></div>
                      </div>
                    )}

                    {/* Quick Action Floating Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openSketchModal(frame)}
                        className="px-2.5 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-white rounded text-xs font-semibold flex items-center space-x-1 shadow"
                        title="Sketch blocking and action"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Draw / Sketch</span>
                      </button>

                      <label
                        className="px-2.5 py-1.5 bg-[#333] hover:bg-[#444] text-gray-200 rounded text-xs font-semibold flex items-center space-x-1 shadow cursor-pointer border border-[#555]"
                        title="Upload reference photo"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, frame.id)}
                        />
                      </label>
                    </div>

                    {/* Camera Shot Type & Movement Badges */}
                    <div className="absolute bottom-1.5 left-2 flex items-center space-x-1">
                      <span className="px-1.5 py-0.5 rounded bg-black/80 text-cyan-300 text-[10px] font-mono border border-cyan-500/40">
                        {frame.shotType}
                      </span>
                    </div>

                    <div className="absolute bottom-1.5 right-2 flex items-center space-x-1">
                      <span className="px-1.5 py-0.5 rounded bg-black/80 text-amber-300 text-[10px] font-mono border border-amber-500/40">
                        {frame.cameraMovement}
                      </span>
                    </div>
                  </div>

                  {/* Frame Metadata Body */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-[#212121]">
                    {/* Action Description */}
                    <div>
                      <p className="text-gray-200 text-xs leading-relaxed line-clamp-3">
                        {frame.description || 'No description entered.'}
                      </p>
                    </div>

                    {/* Dialogue Line (if present) */}
                    {frame.dialogue && (
                      <div className="bg-[#181818] p-2 rounded border border-[#333] font-courier text-[11px] text-amber-200/90 italic border-l-2 border-l-[#ff7700]">
                        "{frame.dialogue}"
                      </div>
                    )}

                    {/* Camera Specs & Equipment Footer */}
                    <div className="pt-2 border-t border-[#333] flex items-center justify-between text-[10px] text-gray-400">
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-purple-300 font-semibold">{frame.lens}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-0.5 text-cyan-400">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{frame.durationSec}s</span>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setEditingFrame(frame);
                          setIsNewFrame(false);
                        }}
                        className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-semibold"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Shot</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Interactive Animatic Reel Player Modal */}
      {isPlayingAnimatic && filteredFrames.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-6 select-none">
          {/* Top Animatic Header */}
          <div className="w-full max-w-5xl flex items-center justify-between text-gray-300">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-sm text-white uppercase tracking-wider">
                ScreenCraft Animatic Reel — Shot {filteredFrames[currentAnimaticIndex].shotNumber} ({currentAnimaticIndex + 1} / {filteredFrames.length})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Speed:</span>
              {[0.5, 1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    playbackSpeed === spd
                      ? 'bg-[#ff7700] text-black font-bold'
                      : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
              <button
                onClick={() => setIsPlayingAnimatic(false)}
                className="p-1 text-gray-400 hover:text-white ml-3"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Cinema Projection Screen */}
          <div className="relative w-full max-w-4xl max-h-[65vh] flex-1 my-4 flex items-center justify-center bg-black border border-[#333] shadow-2xl rounded overflow-hidden">
            {filteredFrames[currentAnimaticIndex].imageUrl ? (
              <img
                src={filteredFrames[currentAnimaticIndex].imageUrl}
                alt="Animatic Frame"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 text-gray-500 font-mono">
                <Camera className="w-16 h-16 mx-auto mb-2 text-gray-700" />
                <p>Shot {filteredFrames[currentAnimaticIndex].shotNumber} — {filteredFrames[currentAnimaticIndex].shotType}</p>
              </div>
            )}

            {/* In-Frame Camera Movement Indicator */}
            <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 rounded text-amber-400 font-mono text-xs border border-amber-500/40">
              Camera: {filteredFrames[currentAnimaticIndex].cameraMovement}
            </div>

            <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded text-cyan-300 font-mono text-xs border border-cyan-500/40">
              Lens: {filteredFrames[currentAnimaticIndex].lens}
            </div>
          </div>

          {/* Bottom Subtitle / Dialogue Banner & Timeline Scrubber */}
          <div className="w-full max-w-5xl space-y-3">
            {/* Dialogue & Audio display */}
            <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#333] text-center min-h-[60px] flex flex-col justify-center">
              {filteredFrames[currentAnimaticIndex].dialogue ? (
                <div className="font-courier text-sm text-amber-300 font-bold">
                  "{filteredFrames[currentAnimaticIndex].dialogue}"
                </div>
              ) : (
                <div className="text-xs text-gray-300 italic">
                  {filteredFrames[currentAnimaticIndex].description}
                </div>
              )}
              {filteredFrames[currentAnimaticIndex].audioNotes && (
                <div className="text-[11px] text-gray-400 flex items-center justify-center space-x-1 mt-1 font-mono">
                  <Volume2 className="w-3 h-3 text-[#ff7700]" />
                  <span>Audio: {filteredFrames[currentAnimaticIndex].audioNotes}</span>
                </div>
              )}
            </div>

            {/* Playback Controls & Frame Strip */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <button
                onClick={() => setCurrentAnimaticIndex((p) => Math.max(0, p - 1))}
                disabled={currentAnimaticIndex === 0}
                className="px-3 py-1.5 bg-[#292929] hover:bg-[#383838] disabled:opacity-30 rounded text-white flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Shot</span>
              </button>

              {/* Frame thumbnail track */}
              <div className="flex items-center space-x-1.5 overflow-x-auto max-w-lg px-2 py-1">
                {filteredFrames.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => setCurrentAnimaticIndex(i)}
                    className={`w-10 h-7 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                      i === currentAnimaticIndex
                        ? 'border-[#ff7700] scale-110'
                        : 'border-[#444] opacity-50 hover:opacity-100'
                    }`}
                  >
                    {f.imageUrl ? (
                      <img src={f.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-[#222] text-[8px] flex items-center justify-center w-full h-full text-gray-400 font-mono">
                        {f.shotNumber}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentAnimaticIndex((p) => Math.min(filteredFrames.length - 1, p + 1))
                }
                disabled={currentAnimaticIndex === filteredFrames.length - 1}
                className="px-3 py-1.5 bg-[#292929] hover:bg-[#383838] disabled:opacity-30 rounded text-white flex items-center space-x-1"
              >
                <span>Next Shot</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Storyboard Blocking Canvas Modal */}
      {sketchingFrameId && (() => {
        const activeSketchFrame = storyboards.find((f) => f.id === sketchingFrameId);
        if (!activeSketchFrame) return null;
        return (
          <StoryboardBlockingCanvasModal
            frame={activeSketchFrame}
            aspectRatio={globalAspectRatio}
            onClose={() => setSketchingFrameId(null)}
            onSave={saveSketch}
          />
        );
      })()}

      {/* Frame Edit / Add Modal */}
      {editingFrame && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 select-none">
          <form
            onSubmit={handleSaveEditedFrame}
            className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-xs text-gray-200"
          >
            <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#ff7700]" />
                <span className="font-bold text-sm text-gray-100">
                  {isNewFrame ? 'Create New Storyboard Frame' : `Edit Shot ${editingFrame.shotNumber}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingFrame(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Shot Number:</label>
                  <input
                    type="text"
                    value={editingFrame.shotNumber}
                    onChange={(e) => setEditingFrame({ ...editingFrame, shotNumber: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-amber-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Scene:</label>
                  <select
                    value={editingFrame.sceneId}
                    onChange={(e) => setEditingFrame({ ...editingFrame, sceneId: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-gray-200"
                  >
                    {scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        Scene {s.sceneNumber}: {s.heading}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Duration (sec):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingFrame.durationSec}
                    onChange={(e) => setEditingFrame({ ...editingFrame, durationSec: Number(e.target.value) })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-cyan-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Shot Type (Framing):</label>
                  <select
                    value={editingFrame.shotType}
                    onChange={(e) => setEditingFrame({ ...editingFrame, shotType: e.target.value as any })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-cyan-300"
                  >
                    {SHOT_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Camera Movement:</label>
                  <select
                    value={editingFrame.cameraMovement}
                    onChange={(e) => setEditingFrame({ ...editingFrame, cameraMovement: e.target.value as any })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-amber-300"
                  >
                    {CAMERA_MOVEMENTS.map((cm) => (
                      <option key={cm} value={cm}>
                        {cm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Focal Length / Lens:</label>
                  <input
                    type="text"
                    placeholder="e.g. 35mm Prime, 50mm, 85mm"
                    value={editingFrame.lens}
                    onChange={(e) => setEditingFrame({ ...editingFrame, lens: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-purple-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Equipment / Support:</label>
                  <input
                    type="text"
                    placeholder="e.g. Steadicam, Dolly Track, Tripod, Jib"
                    value={editingFrame.equipment || ''}
                    onChange={(e) => setEditingFrame({ ...editingFrame, equipment: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Visual Action / Camera Direction:</label>
                <textarea
                  rows={3}
                  value={editingFrame.description}
                  onChange={(e) => setEditingFrame({ ...editingFrame, description: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-2 text-xs text-gray-200 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Dialogue Cue (Optional):</label>
                <input
                  type="text"
                  placeholder="Spoken line during this shot..."
                  value={editingFrame.dialogue || ''}
                  onChange={(e) => setEditingFrame({ ...editingFrame, dialogue: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-amber-200 font-courier"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 font-semibold">Audio & Sound FX:</label>
                <input
                  type="text"
                  placeholder="e.g. Thunderclap, engine spool, subtle cello melody..."
                  value={editingFrame.audioNotes || ''}
                  onChange={(e) => setEditingFrame({ ...editingFrame, audioNotes: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-1.5 text-xs text-gray-200"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#1d1d1d] border-t border-[#383838] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingFrame(null)}
                className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-bold rounded shadow"
              >
                {isNewFrame ? 'Create Frame' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
