import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  FileText,
  Film,
  Mic,
  Type,
  Gauge,
} from 'lucide-react';
import { StoryProject, ScreenplayElement } from '../types/story';

interface TeleprompterWindowProps {
  projects: StoryProject[];
  initialProjectId: string;
  onClose?: () => void;
  embedded?: boolean;
}

type SourceMode = 'script_and_custom' | 'script_only' | 'custom_only';
type ScriptFilterMode = 'full_script' | 'spoken_only';
type CustomPlacement = 'prepend' | 'append';

const CUSTOM_TEXT_STORAGE_KEY = 'screencraft_teleprompter_custom_text_v1';

export const TeleprompterWindow: React.FC<TeleprompterWindowProps> = ({
  projects,
  initialProjectId,
  onClose,
  embedded = false,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => initialProjectId || projects[0]?.id || ''
  );
  const [sourceMode, setSourceMode] = useState<SourceMode>('script_and_custom');
  const [customPlacement, setCustomPlacement] = useState<CustomPlacement>('prepend');
  const [scriptFilter, setScriptFilter] = useState<ScriptFilterMode>('full_script');
  const [focusCharacter, setFocusCharacter] = useState<string>('ALL');

  const [customText, setCustomText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TEXT_STORAGE_KEY);
      if (saved !== null) return saved;
    } catch {
      // ignore storage errors
    }
    return '';
  });

  // Playback & Display Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(28); // 1 - 100
  const [fontSize, setFontSize] = useState<number>(48); // 24 - 96 px
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [showReadingGuide, setShowReadingGuide] = useState<boolean>(true);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const subPixelCarryRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );

  // Persist custom teleprompter text
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_TEXT_STORAGE_KEY, customText);
    } catch {
      // ignore
    }
  }, [customText]);

  // Track browser fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Derive selectable characters for the selected project
  const projectCharacters = useMemo(() => {
    if (!selectedProject) return [];
    const set = new Set<string>();
    selectedProject.characters.forEach((c) => {
      const name = c.name.trim().toUpperCase();
      if (name) set.add(name);
    });
    selectedProject.elements.forEach((el) => {
      if (el.type === 'CHARACTER' && el.text.trim()) {
        const cleaned = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
        if (cleaned) set.add(cleaned);
      } else if (el.character?.trim()) {
        set.add(el.character.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [selectedProject]);

  // Build annotated screenplay items for prompter display (attaching speaker & scene metadata)
  const scriptItems = useMemo(() => {
    if (!selectedProject) return [];
    const elements = selectedProject.elements || [];
    let currentSpeaker = '';
    let currentSpeakerIsVO = false;

    const annotated = elements.map((el, index) => {
      if (el.type === 'SCENE_HEADING' || el.type === 'ACTION' || el.type === 'TRANSITION') {
        currentSpeaker = '';
        currentSpeakerIsVO = false;
      } else if (el.type === 'CHARACTER') {
        currentSpeakerIsVO = /\((V\.?\s*O\.?|VOICE\s*OVER)\)/i.test(el.text);
        currentSpeaker = el.text.replace(/\(.*?\)/g, '').trim().toUpperCase();
      } else if ((el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') && el.character?.trim()) {
        currentSpeaker = el.character.trim().toUpperCase();
        if (el.type === 'VOICE_OVER') currentSpeakerIsVO = true;
      }

      const nextEl = elements[index + 1];
      const nextAfterParen = nextEl?.type === 'PARENTHETICAL' ? elements[index + 2] : undefined;
      const cueFollowedByVO =
        el.type === 'CHARACTER' &&
        (nextEl?.type === 'VOICE_OVER' || nextAfterParen?.type === 'VOICE_OVER');

      return {
        element: el,
        speaker: currentSpeaker,
        isVoiceOverCue: currentSpeakerIsVO || cueFollowedByVO || el.type === 'VOICE_OVER',
      };
    });

    if (scriptFilter === 'spoken_only') {
      return annotated.filter(
        ({ element }) =>
          element.type === 'SCENE_HEADING' ||
          element.type === 'CHARACTER' ||
          element.type === 'PARENTHETICAL' ||
          element.type === 'DIALOGUE' ||
          element.type === 'VOICE_OVER'
      );
    }
    return annotated;
  }, [selectedProject, scriptFilter]);

  // Smooth sub-pixel requestAnimationFrame auto-scroll
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // Check reduced motion preference only as an initial hint, still allow explicit playback when user clicks Play
    const step = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const dtSec = Math.min(0.1, (timestamp - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = timestamp;

      const viewport = scrollViewportRef.current;
      if (viewport) {
        // Non-linear studio speed curve: speed 1..100 => ~10 px/s .. ~280 px/s
        const pxPerSecond = 8 + Math.pow(scrollSpeed / 100, 1.35) * 272;
        subPixelCarryRef.current += pxPerSecond * dtSec;

        const wholePx = Math.floor(subPixelCarryRef.current);
        if (wholePx >= 1) {
          viewport.scrollTop += wholePx;
          subPixelCarryRef.current -= wholePx;
        }

        const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        if (maxScroll > 0 && viewport.scrollTop >= maxScroll - 1) {
          setIsPlaying(false);
          setScrollProgress(100);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, scrollSpeed]);

  // Track manual & auto scroll progress
  const handleViewportScroll = () => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    setScrollProgress(Math.min(100, Math.max(0, Math.round((viewport.scrollTop / maxScroll) * 100))));
  };

  // Keyboard shortcuts while teleprompter window is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (!embedded && onClose) {
          onClose();
        }
        return;
      }

      if (isEditingText) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setScrollSpeed((s) => Math.min(100, s + 4));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setScrollSpeed((s) => Math.max(1, s - 4));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setFontSize((f) => Math.min(96, f + 4));
      } else if (e.key === '-') {
        e.preventDefault();
        setFontSize((f) => Math.max(24, f - 4));
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleResetToTop();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMirrored((prev) => !prev);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, embedded]);

  const handleResetToTop = () => {
    setIsPlaying(false);
    subPixelCarryRef.current = 0;
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setFocusCharacter('ALL');
    setIsPlaying(false);
    subPixelCarryRef.current = 0;
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = 0;
    }
    setScrollProgress(0);
  };

  const handleJumpToScene = (sceneId: string) => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const targetEl = viewport.querySelector(`[data-teleprompter-scene="${sceneId}"]`) as HTMLElement | null;
    if (targetEl) {
      const offsetTop = Math.max(0, targetEl.offsetTop - viewport.clientHeight * 0.24);
      viewport.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const el = containerRef.current || document.documentElement;
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleInsertSlateTemplate = () => {
    const projectLabel = selectedProject?.title || 'UNTITLED PRODUCTION';
    const sceneLabel = selectedProject?.scenes[0]?.heading || 'SCENE 1';
    const slate = [
      `TAKE SLATE — ${projectLabel.toUpperCase()}`,
      `SCENE: ${sceneLabel}`,
      `CAMERA ROLL: A001  |  TAKE: 01`,
      `--------------------------------`,
      `[STANDBY... 3... 2... 1...]`,
    ].join('\n');

    setCustomText((prev) => (prev.trim() ? `${slate}\n\n${prev}` : slate));
    if (sourceMode === 'script_only') {
      setSourceMode('script_and_custom');
    }
  };

  const customParagraphs = useMemo(
    () =>
      customText
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean),
    [customText]
  );

  const renderCustomSection = () => {
    if (sourceMode === 'script_only') return null;
    if (customParagraphs.length === 0) {
      if (sourceMode === 'custom_only') {
        return (
          <div className="py-16 text-center max-w-2xl mx-auto">
            <p className="text-white/90 font-semibold mb-3" style={{ fontSize: `${Math.max(24, fontSize * 0.75)}px` }}>
              No custom teleprompter text entered yet
            </p>
            <p className="text-neutral-400 text-lg">
              Use the “Add Text to Display” box in the left panel to type or paste lines, slates, or announcements.
            </p>
          </div>
        );
      }
      return null;
    }

    return (
      <section aria-label="Custom Teleprompter Text" className="mb-12">
        {customParagraphs.map((paragraph, idx) => (
          <p
            key={`custom-block-${idx}`}
            className="text-white font-semibold tracking-[0.01em] whitespace-pre-wrap mb-8"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.42,
            }}
          >
            {paragraph}
          </p>
        ))}
        {sourceMode === 'script_and_custom' && (
          <div className="my-10 border-t border-white/25 pt-4 text-neutral-400 text-sm uppercase tracking-[0.2em]">
            Screenplay Script
          </div>
        )}
      </section>
    );
  };

  const renderScreenplayElement = (
    item: { element: ScreenplayElement; speaker: string; isVoiceOverCue: boolean },
    idx: number
  ) => {
    const { element, speaker, isVoiceOverCue } = item;
    const text = element.text.trim();
    if (!text) return null;

    const isFocusedMatch =
      focusCharacter === 'ALL' ||
      (speaker && speaker === focusCharacter) ||
      element.type === 'SCENE_HEADING';

    const dimClass = isFocusedMatch ? 'text-white' : 'text-neutral-500';
    const prevElement = idx > 0 ? scriptItems[idx - 1]?.element : undefined;

    switch (element.type) {
      case 'SCENE_HEADING':
        return (
          <div
            key={element.id}
            data-teleprompter-scene={element.sceneId || ''}
            className="mt-14 mb-8 pt-6 border-t border-white/25 font-bold uppercase tracking-wide text-white"
            style={{
              fontSize: `${Math.round(fontSize * 0.78)}px`,
              lineHeight: 1.35,
            }}
          >
            {text}
          </div>
        );

      case 'CHARACTER': {
        const displayCue =
          isVoiceOverCue && !/\((V\.?\s*O\.?|VOICE\s*OVER)\)/i.test(text)
            ? `${text} (V.O.)`
            : text;
        return (
          <div
            key={element.id}
            className={`mt-9 mb-2 font-bold uppercase tracking-wider ${dimClass}`}
            style={{
              fontSize: `${Math.round(fontSize * 0.82)}px`,
              lineHeight: 1.3,
            }}
          >
            {displayCue}
          </div>
        );
      }

      case 'PARENTHETICAL':
        return (
          <div
            key={element.id}
            className={`mb-2 italic ${isFocusedMatch ? 'text-neutral-300' : 'text-neutral-600'}`}
            style={{
              fontSize: `${Math.round(fontSize * 0.78)}px`,
              lineHeight: 1.35,
            }}
          >
            {text}
          </div>
        );

      case 'VOICE_OVER': {
        const needsStandaloneCue =
          prevElement?.type !== 'CHARACTER' && prevElement?.type !== 'PARENTHETICAL';
        const speakerLabel = element.character?.trim() || speaker || 'NARRATOR';
        return (
          <div key={element.id} className="mb-6">
            {needsStandaloneCue && (
              <div
                className={`mt-9 mb-2 font-bold uppercase tracking-wider ${dimClass}`}
                style={{
                  fontSize: `${Math.round(fontSize * 0.82)}px`,
                  lineHeight: 1.3,
                }}
              >
                {speakerLabel} (V.O.)
              </div>
            )}
            <p
              className={`italic tracking-[0.01em] ${dimClass}`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.45,
              }}
            >
              <span className="not-italic text-neutral-300 mr-3 font-semibold">[V.O.]</span>
              {text}
            </p>
          </div>
        );
      }

      case 'DIALOGUE':
        return (
          <p
            key={element.id}
            className={`mb-6 font-medium tracking-[0.01em] ${dimClass}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.45,
            }}
          >
            {text}
          </p>
        );

      case 'TRANSITION':
        return (
          <div
            key={element.id}
            className="my-8 text-right font-bold uppercase tracking-wider text-neutral-300"
            style={{
              fontSize: `${Math.round(fontSize * 0.74)}px`,
              lineHeight: 1.35,
            }}
          >
            {text}
          </div>
        );

      case 'SHOT':
        return (
          <div
            key={element.id}
            className="my-5 font-semibold uppercase tracking-wide text-neutral-300"
            style={{
              fontSize: `${Math.round(fontSize * 0.74)}px`,
              lineHeight: 1.4,
            }}
          >
            {text}
          </div>
        );

      case 'NEW_ACT':
      case 'END_OF_ACT':
        return (
          <div
            key={element.id}
            className="my-12 text-center font-bold uppercase underline underline-offset-4 tracking-widest text-amber-300"
            style={{
              fontSize: `${Math.round(fontSize * 0.85)}px`,
              lineHeight: 1.35,
            }}
          >
            {text}
          </div>
        );

      case 'NOTE':
      case 'SUMMARY':
      case 'OUTLINE_1':
      case 'OUTLINE_2':
      case 'OUTLINE_3':
        return null;

      case 'SEQUENCE':
      case 'CAST_LIST':
      case 'ACTION':
      case 'GENERAL':
      default:
        return (
          <p
            key={element.id}
            className="my-6 text-neutral-200 tracking-[0.01em]"
            style={{
              fontSize: `${Math.round(fontSize * 0.84)}px`,
              lineHeight: 1.48,
            }}
          >
            {text}
          </p>
        );
    }
  };

  const renderScriptSection = () => {
    if (sourceMode === 'custom_only' || !selectedProject) return null;
    if (scriptItems.length === 0) {
      return (
        <div className="py-12 text-center text-neutral-400 text-lg">
          This screenplay project has no elements to display.
        </div>
      );
    }

    return (
      <section aria-label="Screenplay Script Text">
        <div className="mb-10 pb-6 border-b border-white/25">
          <h2
            className="font-bold uppercase tracking-wide text-white"
            style={{ fontSize: `${Math.round(fontSize * 0.9)}px`, lineHeight: 1.25 }}
          >
            {selectedProject.title}
          </h2>
          <p className="text-neutral-400 mt-2 text-base">
            Written by {selectedProject.author} · {selectedProject.scenes.length} Scenes
          </p>
        </div>

        {scriptItems.map((item, idx) => renderScreenplayElement(item, idx))}
      </section>
    );
  };

  const approxPxPerSec = Math.round(8 + Math.pow(scrollSpeed / 100, 1.35) * 272);

  return (
    <div
      ref={containerRef}
      role={embedded ? 'region' : 'dialog'}
      aria-modal={embedded ? undefined : 'true'}
      aria-label="Teleprompter Dedicated Window"
      className={
        embedded
          ? 'flex-1 min-h-0 h-full bg-black text-white flex flex-col overflow-hidden'
          : 'fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden'
      }
    >
      {/* Top Operator Control Bar */}
      <header className="bg-[#0b0b0b] border-b border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0 select-none">
        {/* Zone 1: Window Identity & Drawer Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap shrink-0"
            title="Toggle Projects & Custom Text Drawer (S)"
          >
            {showSidebar ? (
              <PanelLeftClose className="w-4 h-4 text-[#ff7700]" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-[#ff7700]" />
            )}
            <span>{showSidebar ? 'Hide Setup' : 'Projects & Text'}</span>
          </button>

          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold text-white tracking-wide whitespace-nowrap">
              Studio Teleprompter
            </span>
            <span className="text-xs text-neutral-400 truncate max-w-[260px]">
              {sourceMode === 'custom_only'
                ? 'Custom Prompt Text'
                : `${selectedProject?.title || 'No Project'} · ${selectedProject?.scenes.length || 0} scenes`}
            </span>
          </div>
        </div>

        {/* Zone 2: Transport, Speed & Text Size Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Play / Pause & Reset */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold text-xs transition-colors whitespace-nowrap shrink-0 ${
                isPlaying
                  ? 'bg-[#ff7700] hover:bg-[#ff8c1a] text-black'
                  : 'bg-white hover:bg-neutral-200 text-black'
              }`}
              title="Play / Pause Auto-Scroll (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Start Scroll'}</span>
            </button>

            <button
              onClick={handleResetToTop}
              className="p-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 transition-colors"
              title="Reset to Top (R)"
              aria-label="Reset scroll to top"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-neutral-800 hidden md:block" />

          {/* Scroll Speed Control */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#ff7700] shrink-0" />
            <span className="text-xs text-neutral-300 whitespace-nowrap">Speed</span>
            <button
              onClick={() => setScrollSpeed((s) => Math.max(1, s - 5))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
              aria-label="Decrease scroll speed"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={1}
              max={100}
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              aria-label="Scroll speed"
              className="w-24 accent-[#ff7700] cursor-pointer"
            />
            <button
              onClick={() => setScrollSpeed((s) => Math.min(100, s + 5))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
              aria-label="Increase scroll speed"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono tabular-nums text-white w-14 text-right whitespace-nowrap">
              {scrollSpeed}% ({approxPxPerSec}px/s)
            </span>
          </div>

          {/* Text Size Control */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5">
            <Type className="w-3.5 h-3.5 text-[#ff7700] shrink-0" />
            <span className="text-xs text-neutral-300 whitespace-nowrap">Text Size</span>
            <button
              onClick={() => setFontSize((f) => Math.max(24, f - 4))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
              aria-label="Decrease text size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={24}
              max={96}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              aria-label="Text size"
              className="w-24 accent-[#ff7700] cursor-pointer"
            />
            <button
              onClick={() => setFontSize((f) => Math.min(96, f + 4))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
              aria-label="Increase text size"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono tabular-nums text-white w-11 text-right">
              {fontSize}px
            </span>
          </div>
        </div>

        {/* Zone 3: Guide, Mirror, Fullscreen & Close */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowReadingGuide((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-colors whitespace-nowrap ${
              showReadingGuide
                ? 'bg-neutral-800 border-neutral-600 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Eye-line Reading Guide"
          >
            {showReadingGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">Guide</span>
          </button>

          <button
            onClick={() => setIsMirrored((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-colors whitespace-nowrap ${
              isMirrored
                ? 'bg-[#ff7700] border-[#ff7700] text-black font-semibold'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="Mirror Text Horizontally for Glass Teleprompter (M)"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Mirror</span>
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {!embedded && onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-white transition-colors whitespace-nowrap"
              title="Close Teleprompter Window (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Split: Collapsible Setup Sidebar + Pure Black Teleprompter Stage */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-black">
        {showSidebar && (
          <aside className="w-80 lg:w-96 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col min-h-0 overflow-y-auto p-4 gap-5 shrink-0 select-none">
            {/* Section 1: Display Source Mode */}
            <div>
              <h3 className="text-xs font-semibold text-neutral-300 mb-2">
                Teleprompter Output Source
              </h3>
              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded">
                <button
                  onClick={() => setSourceMode('script_and_custom')}
                  className={`px-2 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                    sourceMode === 'script_and_custom'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Script + Text
                </button>
                <button
                  onClick={() => setSourceMode('script_only')}
                  className={`px-2 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                    sourceMode === 'script_only'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Script Only
                </button>
                <button
                  onClick={() => setSourceMode('custom_only')}
                  className={`px-2 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap ${
                    sourceMode === 'custom_only'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Custom Only
                </button>
              </div>
            </div>

            {/* Section 2: Add Text to Display */}
            <div className="border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="teleprompter-custom-text"
                  className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#ff7700]" />
                  <span>Add Text to Display</span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={handleInsertSlateTemplate}
                    className="text-[#ff7700] hover:underline"
                    type="button"
                  >
                    Insert Slate
                  </button>
                  {customText.trim() && (
                    <button
                      onClick={() => setCustomText('')}
                      className="text-neutral-400 hover:text-white"
                      type="button"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id="teleprompter-custom-text"
                rows={5}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type or paste camera slates, announcements, or extra lines to display on the teleprompter..."
                className="w-full bg-black border border-neutral-700 focus:border-[#ff7700] focus:outline-none rounded p-2.5 text-xs text-white placeholder:text-neutral-500 resize-y leading-relaxed select-text"
              />

              {sourceMode === 'script_and_custom' && (
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>Custom text placement:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCustomPlacement('prepend')}
                      className={`px-2 py-1 rounded text-[11px] border ${
                        customPlacement === 'prepend'
                          ? 'bg-neutral-800 border-neutral-600 text-white'
                          : 'border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Before Script
                    </button>
                    <button
                      onClick={() => setCustomPlacement('append')}
                      className={`px-2 py-1 rounded text-[11px] border ${
                        customPlacement === 'append'
                          ? 'bg-neutral-800 border-neutral-600 text-white'
                          : 'border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      After Script
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Screenplay Authored Projects (Scrollable) */}
            <div className="border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#ff7700]" />
                  <span>Authored Screenplay Projects</span>
                </h3>
                <span className="text-[11px] text-neutral-400 tabular-nums">
                  {projects.length} projects
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded bg-black divide-y divide-neutral-900">
                {projects.map((proj) => {
                  const isSelected = proj.id === selectedProject?.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => handleSelectProject(proj.id)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${
                        isSelected
                          ? 'bg-neutral-900 text-white'
                          : 'bg-black text-neutral-300 hover:bg-neutral-950 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{proj.title}</span>
                        {isSelected && (
                          <span className="text-[11px] text-[#ff7700] font-medium shrink-0">
                            Loaded
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 truncate tabular-nums">
                        {proj.author} · {proj.scenes.length} scenes · {proj.elements.length} lines
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Filming Filters & Scene Jump List */}
            {selectedProject && sourceMode !== 'custom_only' && (
              <div className="border-t border-neutral-800 pt-4 flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-200 mb-2 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[#ff7700]" />
                    <span>Reading Mode & Character Focus</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded mb-2">
                    <button
                      onClick={() => setScriptFilter('full_script')}
                      className={`px-2 py-1.5 text-xs rounded font-medium transition-colors ${
                        scriptFilter === 'full_script'
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Full Script
                    </button>
                    <button
                      onClick={() => setScriptFilter('spoken_only')}
                      className={`px-2 py-1.5 text-xs rounded font-medium transition-colors ${
                        scriptFilter === 'spoken_only'
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Spoken Lines Only
                    </button>
                  </div>

                  <select
                    value={focusCharacter}
                    onChange={(e) => setFocusCharacter(e.target.value)}
                    aria-label="Highlight character lines"
                    className="w-full bg-black border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-[#ff7700] focus:outline-none"
                  >
                    <option value="ALL">Highlight: All Characters</option>
                    {projectCharacters.map((charName) => (
                      <option key={charName} value={charName}>
                        Focus Character: {charName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-neutral-300">
                      Jump to Scene
                    </span>
                    <span className="text-[11px] text-neutral-500 tabular-nums">
                      {scrollProgress}% read
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded bg-black divide-y divide-neutral-900">
                    {selectedProject.scenes.map((scene) => (
                      <button
                        key={scene.id}
                        onClick={() => handleJumpToScene(scene.id)}
                        className="w-full text-left px-2.5 py-2 hover:bg-neutral-900 transition-colors"
                      >
                        <div className="text-xs text-neutral-200 font-medium truncate">
                          {scene.sceneNumber}. {scene.heading}
                        </div>
                        <div className="text-[11px] text-neutral-500 tabular-nums">
                          {scene.pages} pp · {scene.characters.length} cast
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Shortcut Legend */}
            <div className="mt-auto pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <div>Space: Play / Pause · R: Reset to Top</div>
              <div>Up / Down: Speed · +/-: Text Size · M: Mirror</div>
            </div>
          </aside>
        )}

        {/* Dedicated White-on-Black Teleprompter Reading Viewport */}
        <main className="flex-1 relative bg-black overflow-hidden">
          {/* Top & bottom subtle optical framing gradients */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black to-transparent z-10" />
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black to-transparent z-10" />

          {/* Eye-line Reading Guide at ~32% height */}
          {showReadingGuide && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-[32%] z-20 flex items-center justify-between px-3 md:px-6"
            >
              <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-[#ff7700]" />
              <div className="flex-1 mx-3 border-t border-white/15" />
              <div className="w-0 h-0 border-y-[8px] border-y-transparent border-r-[14px] border-r-[#ff7700]" />
            </div>
          )}

          {/* Scrollable Text Stage */}
          <div
            ref={scrollViewportRef}
            onScroll={handleViewportScroll}
            className={`h-full w-full overflow-y-auto bg-black text-white px-8 sm:px-14 md:px-20 ${
              isMirrored ? 'scale-x-[-1]' : ''
            }`}
          >
            <div className="max-w-4xl mx-auto pt-[30vh] pb-[65vh] select-text">
              {customPlacement === 'prepend' && renderCustomSection()}
              {renderScriptSection()}
              {customPlacement === 'append' && renderCustomSection()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
