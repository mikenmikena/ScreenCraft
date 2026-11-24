import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Captions,
  Upload,
  Download,
  Plus,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  Scissors,
  Merge,
  Clock,
  FileText,
  FileCode,
  Sparkles,
  SortAsc,
  ClipboardPaste,
  Film,
  Users,
  AlertTriangle,
  CopyPlus,
} from 'lucide-react';
import { StoryProject } from '../types/story';
import {
  buildScreenplayDataFromCues,
  convertSubtitlesToStoryProject,
  DEFAULT_SCRIPT_TO_SUBTITLE_OPTIONS,
  DEFAULT_SUBTITLE_TO_SCRIPT_OPTIONS,
  detectSpeakerAndHintFromCueText,
  formatCueDuration,
  generateSubtitlesFromScript,
  msToSrtTime,
  msToVttTime,
  parseSubtitleFile,
  parseTimestampToMs,
  SAMPLE_SUBTITLE_TEXT,
  ScriptToSubtitleOptions,
  serializeCuesToSrt,
  serializeCuesToVtt,
  SubtitleCue,
  SubtitleElementHint,
  SubtitleToScriptOptions,
  triggerSubtitleDownload,
} from '../utils/subtitleUtils';

interface SubtitlesWorkspaceProps {
  projects: StoryProject[];
  activeProject: StoryProject;
  embedded?: boolean;
  onCreateProjectFromSubtitles: (project: StoryProject) => void;
  onAppendSubtitlesToProject?: (
    targetProjectId: string,
    cues: SubtitleCue[],
    options: SubtitleToScriptOptions
  ) => void;
  onNotify?: (message: string) => void;
}

type SubtitleModeTab = 'script_to_subtitles' | 'subtitle_editor_to_script';

interface TimecodeInputProps {
  valueMs: number;
  onCommitMs: (nextMs: number) => void;
  ariaLabel: string;
  hasError?: boolean;
}

const TimecodeInput: React.FC<TimecodeInputProps> = ({
  valueMs,
  onCommitMs,
  ariaLabel,
  hasError = false,
}) => {
  const [draft, setDraft] = useState(() => msToSrtTime(valueMs));
  const [isFocused, setIsFocused] = useState(false);
  const [invalidDraft, setInvalidDraft] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(msToSrtTime(valueMs));
      setInvalidDraft(false);
    }
  }, [valueMs, isFocused]);

  const commit = () => {
    const parsed = parseTimestampToMs(draft);
    if (parsed !== null) {
      setInvalidDraft(false);
      onCommitMs(parsed);
      setDraft(msToSrtTime(parsed));
    } else {
      setInvalidDraft(true);
      setDraft(msToSrtTime(valueMs));
    }
  };

  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => {
        setDraft(e.target.value);
        setInvalidDraft(parseTimestampToMs(e.target.value) === null);
      }}
      onBlur={() => {
        setIsFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className={`w-[108px] bg-[#141414] border rounded px-2 py-1 font-mono text-[11px] tabular-nums focus:outline-none ${
        invalidDraft || hasError
          ? 'border-rose-500 text-rose-300'
          : 'border-[#3a3a3a] text-cyan-300 focus:border-[#ff8000]'
      }`}
    />
  );
};

export const SubtitlesWorkspace: React.FC<SubtitlesWorkspaceProps> = ({
  projects,
  activeProject,
  embedded = false,
  onCreateProjectFromSubtitles,
  onAppendSubtitlesToProject,
  onNotify,
}) => {
  const [modeTab, setModeTab] = useState<SubtitleModeTab>('script_to_subtitles');

  // --- Mode 1: Script -> Subtitles Export State ---
  const [sourceProjectId, setSourceProjectId] = useState<string>(activeProject.id);
  const [exportOptions, setExportOptions] = useState<ScriptToSubtitleOptions>(
    DEFAULT_SCRIPT_TO_SUBTITLE_OPTIONS
  );
  const [useVttVoiceTags, setUseVttVoiceTags] = useState<boolean>(true);
  const [exportPreviewTab, setExportPreviewTab] = useState<'cues' | 'source'>('cues');
  const [copiedExport, setCopiedExport] = useState<boolean>(false);

  useEffect(() => {
    if (!projects.some((p) => p.id === sourceProjectId)) {
      setSourceProjectId(activeProject.id);
    }
  }, [projects, activeProject.id, sourceProjectId]);

  const selectedExportProject = useMemo(
    () => projects.find((p) => p.id === sourceProjectId) || activeProject,
    [projects, sourceProjectId, activeProject]
  );

  // Reset sceneId filter when project changes if that scene isn't in new project
  useEffect(() => {
    if (
      exportOptions.sceneId !== 'all' &&
      !selectedExportProject.scenes.some((s) => s.id === exportOptions.sceneId)
    ) {
      setExportOptions((prev) => ({ ...prev, sceneId: 'all' }));
    }
  }, [selectedExportProject, exportOptions.sceneId]);

  const generatedCues = useMemo(
    () => generateSubtitlesFromScript(selectedExportProject, exportOptions),
    [selectedExportProject, exportOptions]
  );

  const generatedRawSource = useMemo(() => {
    if (exportOptions.format === 'vtt') {
      return serializeCuesToVtt(generatedCues, {
        title: selectedExportProject.title,
        author: selectedExportProject.author,
        useVoiceTags: useVttVoiceTags,
      });
    }
    return serializeCuesToSrt(generatedCues);
  }, [generatedCues, exportOptions.format, selectedExportProject.title, selectedExportProject.author, useVttVoiceTags]);

  const generatedRuntimeLabel = useMemo(() => {
    const last = generatedCues[generatedCues.length - 1];
    if (!last) return '00:00:00';
    return msToVttTime(last.endMs).split('.')[0];
  }, [generatedCues]);

  // --- Mode 2: Subtitle Importer / Editor -> Screenplay State ---
  const [editorCues, setEditorCues] = useState<SubtitleCue[]>(
    () => parseSubtitleFile('sample.srt', SAMPLE_SUBTITLE_TEXT).cues
  );
  const [importedFileName, setImportedFileName] = useState<string>('Sample Subtitles (.srt)');
  const [detectedFormatLabel, setDetectedFormatLabel] = useState<string>('SubRip (.srt)');
  const [shiftSecondsInput, setShiftSecondsInput] = useState<string>('1.0');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [copiedEditedSource, setCopiedEditedSource] = useState<boolean>(false);
  const [rightPaneTab, setRightPaneTab] = useState<'preview' | 'raw_srt' | 'raw_vtt'>('preview');

  const [scriptOptions, setScriptOptions] = useState<SubtitleToScriptOptions>({
    ...DEFAULT_SUBTITLE_TO_SCRIPT_OPTIONS,
    author: activeProject.author || 'Jeffrey (Online)',
  });

  const subtitleFileInputRef = useRef<HTMLInputElement>(null);

  const editedSrtSource = useMemo(() => serializeCuesToSrt(editorCues), [editorCues]);
  const editedVttSource = useMemo(
    () =>
      serializeCuesToVtt(editorCues, {
        title: scriptOptions.title,
        author: scriptOptions.author,
        useVoiceTags: true,
      }),
    [editorCues, scriptOptions.title, scriptOptions.author]
  );

  const previewScreenplay = useMemo(
    () => buildScreenplayDataFromCues(editorCues, scriptOptions, 1),
    [editorCues, scriptOptions]
  );

  const notify = (msg: string) => {
    onNotify?.(msg);
  };

  // Export Handlers (Mode 1)
  const handleDownloadGenerated = (format: 'srt' | 'vtt') => {
    if (generatedCues.length === 0) {
      notify('No dialogue or caption cues found for the current script filter.');
      return;
    }
    const safeTitle =
      selectedExportProject.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_') || 'screenplay';
    if (format === 'vtt') {
      const vtt = serializeCuesToVtt(generatedCues, {
        title: selectedExportProject.title,
        author: selectedExportProject.author,
        useVoiceTags: useVttVoiceTags,
      });
      triggerSubtitleDownload(vtt, `${safeTitle}.vtt`, 'text/vtt;charset=utf-8');
      notify(`Exported ${generatedCues.length} cues to ${safeTitle}.vtt`);
    } else {
      const srt = serializeCuesToSrt(generatedCues);
      triggerSubtitleDownload(srt, `${safeTitle}.srt`, 'application/x-subrip;charset=utf-8');
      notify(`Exported ${generatedCues.length} cues to ${safeTitle}.srt`);
    }
  };

  const handleCopyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(generatedRawSource);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 1800);
      notify(`Copied ${exportOptions.format.toUpperCase()} subtitles to clipboard`);
    } catch {
      notify('Clipboard access unavailable in this preview frame');
    }
  };

  const handleSendGeneratedToEditor = () => {
    if (generatedCues.length === 0) return;
    setEditorCues(
      generatedCues.map((c, idx) => ({
        ...c,
        id: `cue-edit-${Date.now()}-${idx}`,
        index: idx + 1,
      }))
    );
    setImportedFileName(`${selectedExportProject.title} (from Script)`);
    setDetectedFormatLabel(exportOptions.format === 'vtt' ? 'WebVTT (.vtt)' : 'SubRip (.srt)');
    setScriptOptions((prev) => ({
      ...prev,
      title: `${selectedExportProject.title} (Subtitle Cut)`,
      author: selectedExportProject.author || prev.author,
    }));
    setModeTab('subtitle_editor_to_script');
    notify(`Loaded ${generatedCues.length} generated cues into Subtitle Editor`);
  };

  // Import & Editor Handlers (Mode 2)
  const handleTriggerFileImport = () => {
    if (subtitleFileInputRef.current) {
      subtitleFileInputRef.current.value = '';
      subtitleFileInputRef.current.click();
    }
  };

  const handleSubtitleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const { cues, detectedFormat } = parseSubtitleFile(file.name, content);
      if (cues.length === 0) {
        notify(`No valid subtitle cues found in ${file.name}`);
        return;
      }
      setEditorCues(cues);
      setImportedFileName(file.name);
      setDetectedFormatLabel(detectedFormat);
      const baseTitle = file.name.replace(/\.(srt|vtt|sbv|txt)$/i, '').replace(/[_-]+/g, ' ').trim();
      if (baseTitle) {
        setScriptOptions((prev) => ({ ...prev, title: baseTitle }));
      }
      notify(`Imported ${cues.length} cues (${detectedFormat}) from ${file.name}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to read subtitle file');
    }
  };

  const handleImportPastedSubtitles = () => {
    if (!pasteText.trim()) return;
    const { cues, detectedFormat } = parseSubtitleFile('pasted.srt', pasteText);
    if (cues.length === 0) {
      notify('Could not parse any subtitle cues from pasted text.');
      return;
    }
    setEditorCues(cues);
    setImportedFileName('Pasted Subtitle Text');
    setDetectedFormatLabel(detectedFormat);
    setIsPasteModalOpen(false);
    setPasteText('');
    notify(`Parsed ${cues.length} cues (${detectedFormat})`);
  };

  const handleLoadSampleSubtitles = () => {
    const { cues } = parseSubtitleFile('sample.srt', SAMPLE_SUBTITLE_TEXT);
    setEditorCues(cues);
    setImportedFileName('Observatory Sample (.srt)');
    setDetectedFormatLabel('SubRip (.srt)');
    setScriptOptions((prev) => ({ ...prev, title: 'Observatory Signal (From Subtitles)' }));
    notify('Loaded sample subtitle cues');
  };

  const updateCue = (id: string, patch: Partial<SubtitleCue>) => {
    setEditorCues((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const handleAddCue = () => {
    const lastCue = editorCues[editorCues.length - 1];
    const startMs = lastCue ? lastCue.endMs + 250 : 1000;
    const endMs = startMs + 2500;
    const nextCue: SubtitleCue = {
      id: `cue-new-${Date.now()}`,
      index: editorCues.length + 1,
      startMs,
      endMs,
      text: 'New dialogue or action caption.',
      speaker: lastCue?.speaker || 'CHARACTER',
      elementHint: 'DIALOGUE',
    };
    setEditorCues((prev) => [...prev, nextCue]);
  };

  const handleDuplicateCue = (idx: number) => {
    const target = editorCues[idx];
    if (!target) return;
    const dur = Math.max(500, target.endMs - target.startMs);
    const clone: SubtitleCue = {
      ...target,
      id: `cue-dup-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      startMs: target.endMs + 120,
      endMs: target.endMs + 120 + dur,
    };
    setEditorCues((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next.map((c, i) => ({ ...c, index: i + 1 }));
    });
  };

  const handleDeleteCue = (id: string) => {
    setEditorCues((prev) =>
      prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, index: i + 1 }))
    );
  };

  const handleSplitCue = (idx: number) => {
    const target = editorCues[idx];
    if (!target) return;
    const words = target.text.trim().split(/\s+/);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    const firstText = words.length > 1 ? words.slice(0, midWord).join(' ') : target.text;
    const secondText = words.length > 1 ? words.slice(midWord).join(' ') : target.text;
    const midMs = Math.round((target.startMs + target.endMs) / 2);

    const firstHalf: SubtitleCue = {
      ...target,
      endMs: Math.max(target.startMs + 300, midMs - 60),
      text: firstText,
    };
    const secondHalf: SubtitleCue = {
      ...target,
      id: `cue-split-${Date.now()}`,
      startMs: Math.max(firstHalf.endMs + 60, midMs),
      endMs: Math.max(midMs + 400, target.endMs),
      text: secondText,
    };

    setEditorCues((prev) => {
      const next = [...prev];
      next.splice(idx, 1, firstHalf, secondHalf);
      return next.map((c, i) => ({ ...c, index: i + 1 }));
    });
  };

  const handleMergeWithNext = (idx: number) => {
    if (idx >= editorCues.length - 1) return;
    const current = editorCues[idx];
    const nextCue = editorCues[idx + 1];
    const merged: SubtitleCue = {
      ...current,
      endMs: Math.max(current.endMs, nextCue.endMs),
      text: `${current.text.trim()} ${nextCue.text.trim()}`.trim(),
      speaker: current.speaker || nextCue.speaker,
    };
    setEditorCues((prev) => {
      const next = [...prev];
      next.splice(idx, 2, merged);
      return next.map((c, i) => ({ ...c, index: i + 1 }));
    });
  };

  const handleSortByStartTime = () => {
    setEditorCues((prev) =>
      [...prev]
        .sort((a, b) => a.startMs - b.startMs)
        .map((c, i) => ({ ...c, index: i + 1 }))
    );
    notify('Sorted cues chronologically by start timecode');
  };

  const handleShiftAllTimes = (direction: 1 | -1) => {
    const sec = Number(shiftSecondsInput);
    if (Number.isNaN(sec) || sec === 0) return;
    const deltaMs = Math.round(sec * 1000) * direction;
    setEditorCues((prev) =>
      prev.map((c) => {
        const nextStart = Math.max(0, c.startMs + deltaMs);
        const dur = Math.max(300, c.endMs - c.startMs);
        return {
          ...c,
          startMs: nextStart,
          endMs: Math.max(nextStart + dur, c.endMs + deltaMs),
        };
      })
    );
    notify(`Shifted all cues by ${direction > 0 ? '+' : '-'}${Math.abs(sec)}s`);
  };

  const handleAutoDetectSpeakers = () => {
    setEditorCues((prev) =>
      prev.map((c) => {
        const detected = detectSpeakerAndHintFromCueText(c.text, c.speaker);
        return {
          ...c,
          speaker: detected.speaker || c.speaker,
          elementHint: detected.hint !== 'auto' ? detected.hint : c.elementHint || 'auto',
        };
      })
    );
    notify('Re-scanned subtitle cues for speakers, voice-overs, and scene headings');
  };

  const handleDownloadEdited = (format: 'srt' | 'vtt') => {
    if (editorCues.length === 0) return;
    const safeTitle =
      scriptOptions.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_') || 'edited_subtitles';
    if (format === 'vtt') {
      triggerSubtitleDownload(editedVttSource, `${safeTitle}.vtt`, 'text/vtt;charset=utf-8');
      notify(`Downloaded ${safeTitle}.vtt`);
    } else {
      triggerSubtitleDownload(editedSrtSource, `${safeTitle}.srt`, 'application/x-subrip;charset=utf-8');
      notify(`Downloaded ${safeTitle}.srt`);
    }
  };

  const handleCopyEdited = async (format: 'srt' | 'vtt') => {
    try {
      await navigator.clipboard.writeText(format === 'vtt' ? editedVttSource : editedSrtSource);
      setCopiedEditedSource(true);
      setTimeout(() => setCopiedEditedSource(false), 1800);
      notify(`Copied edited ${format.toUpperCase()} subtitles`);
    } catch {
      notify('Clipboard access unavailable in this preview frame');
    }
  };

  const handleConvertToNewScreenplay = () => {
    if (editorCues.length === 0) {
      notify('Add or import at least one subtitle cue first.');
      return;
    }
    const newProj = convertSubtitlesToStoryProject(editorCues, scriptOptions);
    onCreateProjectFromSubtitles(newProj);
  };

  const handleAppendToActive = () => {
    if (editorCues.length === 0 || !onAppendSubtitlesToProject) return;
    onAppendSubtitlesToProject(activeProject.id, editorCues, scriptOptions);
  };

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 min-h-0 bg-[#181818] text-xs text-gray-200 overflow-hidden ${
        embedded ? '' : 'h-full'
      }`}
    >
      {/* Top Subtitles Workspace Bar with Flex-Wrap Tabs */}
      <div className="bg-[#232323] border-b border-[#383838] px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Captions className="w-4 h-4 text-[#ff7700]" />
            <span className="font-bold text-sm text-gray-100 whitespace-nowrap">
              Subtitles Studio
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-[#181818] border border-[#353535] rounded p-0.5">
            <button
              type="button"
              onClick={() => setModeTab('script_to_subtitles')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                modeTab === 'script_to_subtitles'
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Script → Subtitles Export (.SRT / .VTT)</span>
            </button>
            <button
              type="button"
              onClick={() => setModeTab('subtitle_editor_to_script')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                modeTab === 'subtitle_editor_to_script'
                  ? 'bg-[#ff7700] text-black'
                  : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subtitle Importer / Editor → Screenplay</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 tabular-nums">
          <span>
            Active Script:{' '}
            <span className="text-amber-300 font-medium">{activeProject.title}</span>
          </span>
        </div>
      </div>

      {/* MODE 1: SCRIPT -> SUBTITLES EXPORT */}
      {modeTab === 'script_to_subtitles' && (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Settings Column */}
          <div className="w-full lg:w-[330px] shrink-0 bg-[#202020] border-b lg:border-b-0 lg:border-r border-[#363636] overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Source Screenplay
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] text-gray-300">Project</span>
                <select
                  value={selectedExportProject.id}
                  onChange={(e) => setSourceProjectId(e.target.value)}
                  className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.scenes.length} scenes)
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] text-gray-300">Scene Scope</span>
                <select
                  value={exportOptions.sceneId}
                  onChange={(e) =>
                    setExportOptions((prev) => ({ ...prev, sceneId: e.target.value }))
                  }
                  className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                >
                  <option value="all">
                    All Scenes ({selectedExportProject.scenes.length})
                  </option>
                  {selectedExportProject.scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      Sc.{sc.sceneNumber} — {sc.heading}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pt-3 border-t border-[#323232] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Subtitle Format &amp; Content
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExportOptions((prev) => ({ ...prev, format: 'srt' }))
                  }
                  className={`p-2 rounded border text-left transition-colors ${
                    exportOptions.format === 'srt'
                      ? 'bg-[#2c2116] border-[#ff7700] text-amber-200'
                      : 'bg-[#171717] border-[#353535] text-gray-300 hover:bg-[#242424]'
                  }`}
                >
                  <div className="font-bold">SubRip (.srt)</div>
                  <div className="text-[10px] text-gray-400">Universal NLE &amp; YouTube</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExportOptions((prev) => ({ ...prev, format: 'vtt' }))
                  }
                  className={`p-2 rounded border text-left transition-colors ${
                    exportOptions.format === 'vtt'
                      ? 'bg-[#2c2116] border-[#ff7700] text-amber-200'
                      : 'bg-[#171717] border-[#353535] text-gray-300 hover:bg-[#242424]'
                  }`}
                >
                  <div className="font-bold">WebVTT (.vtt)</div>
                  <div className="text-[10px] text-gray-400">HTML5 &amp; Voice Spans</div>
                </button>
              </div>

              <label className="block space-y-1 pt-1">
                <span className="text-[11px] text-gray-300">Caption Scope</span>
                <select
                  value={exportOptions.scope}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      scope: e.target.value as ScriptToSubtitleOptions['scope'],
                    }))
                  }
                  className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                >
                  <option value="spoken_only">Spoken Dialogue &amp; Voice-Over Only</option>
                  <option value="spoken_and_action">
                    Dialogue + Action / SDH Descriptions [Action]
                  </option>
                </select>
              </label>

              <div className="space-y-1.5 bg-[#181818] border border-[#323232] rounded p-2.5 text-[11px]">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-gray-200">Include Speaker Prefix (NAME:)</span>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeSpeakerNames}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        includeSpeakerNames: e.target.checked,
                      }))
                    }
                    className="accent-[#ff7700]"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-gray-200">Include Parentheticals</span>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeParentheticals}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        includeParentheticals: e.target.checked,
                      }))
                    }
                    className="accent-[#ff7700]"
                  />
                </label>
                {exportOptions.format === 'vtt' && (
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-gray-200">WebVTT &lt;v Speaker&gt; Tags</span>
                    <input
                      type="checkbox"
                      checked={useVttVoiceTags}
                      onChange={(e) => setUseVttVoiceTags(e.target.checked)}
                      className="accent-[#ff7700]"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#323232] space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Timing &amp; Line Wrapping
              </div>
              <label className="block space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-300">Reading Pace (WPM)</span>
                  <span className="font-mono text-amber-300">
                    {exportOptions.wordsPerMinute} WPM
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={230}
                  step={5}
                  value={exportOptions.wordsPerMinute}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      wordsPerMinute: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#ff7700]"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-300">Max Chars / Line</span>
                  <input
                    type="number"
                    min={24}
                    max={72}
                    value={exportOptions.maxCharsPerLine}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        maxCharsPerLine: Math.max(24, Number(e.target.value) || 42),
                      }))
                    }
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-300">Max Lines / Cue</span>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={exportOptions.maxLinesPerCue}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        maxLinesPerCue: Math.max(1, Math.min(4, Number(e.target.value) || 2)),
                      }))
                    }
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-300">Min Cue (sec)</span>
                  <input
                    type="number"
                    step="0.2"
                    min={0.5}
                    max={5}
                    value={(exportOptions.minDurationMs / 1000).toFixed(1)}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        minDurationMs: Math.max(500, Math.round(Number(e.target.value) * 1000)),
                      }))
                    }
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-gray-300">Cue Gap (ms)</span>
                  <input
                    type="number"
                    step={20}
                    min={40}
                    max={1000}
                    value={exportOptions.gapMs}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        gapMs: Math.max(40, Number(e.target.value) || 120),
                      }))
                    }
                    className="w-full bg-[#151515] border border-[#3a3a3a] rounded px-2 py-1 font-mono text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Generated Output & Actions */}
          <div className="flex-1 min-w-0 flex flex-col bg-[#161616] overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-2.5 bg-[#1c1c1c] border-b border-[#333333] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-[#121212] border border-[#353535] rounded p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setExportPreviewTab('cues')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                      exportPreviewTab === 'cues'
                        ? 'bg-[#2a2a2a] text-amber-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Captions className="w-3.5 h-3.5" />
                    <span>Cue Timeline ({generatedCues.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportPreviewTab('source')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                      exportPreviewTab === 'source'
                        ? 'bg-[#2a2a2a] text-cyan-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Raw {exportOptions.format.toUpperCase()} Source</span>
                  </button>
                </div>

                <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                  Est. Span: <span className="text-gray-200">{generatedRuntimeLabel}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendGeneratedToEditor}
                  disabled={generatedCues.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#272727] hover:bg-[#333333] disabled:opacity-40 border border-[#444] text-amber-300 font-semibold whitespace-nowrap"
                >
                  <span>Edit Cues in Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyGenerated}
                  disabled={generatedCues.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#252525] hover:bg-[#313131] disabled:opacity-40 border border-[#3e3e3e] text-gray-200 whitespace-nowrap"
                >
                  {copiedExport ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadGenerated('srt')}
                  disabled={generatedCues.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-bold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .SRT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadGenerated('vtt')}
                  disabled={generatedCues.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .VTT</span>
                </button>
              </div>
            </div>

            {/* Output Viewport */}
            <div className="flex-1 overflow-y-auto p-4">
              {generatedCues.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2 p-8">
                  <Captions className="w-8 h-8 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-300">
                    No subtitle cues matched your filter
                  </p>
                  <p className="max-w-md text-xs text-gray-500">
                    Try selecting &ldquo;All Scenes&rdquo; or switching Caption Scope to include Action / SDH lines.
                  </p>
                </div>
              ) : exportPreviewTab === 'cues' ? (
                <div className="space-y-2 max-w-4xl mx-auto">
                  {generatedCues.map((cue) => (
                    <div
                      key={cue.id}
                      className="bg-[#1e1e1e] border border-[#323232] rounded p-3 flex flex-col sm:flex-row sm:items-start gap-3"
                    >
                      <div className="flex items-center gap-2 shrink-0 sm:w-56">
                        <span className="font-mono text-[11px] font-bold text-amber-400 w-7 tabular-nums">
                          #{cue.index}
                        </span>
                        <div className="font-mono text-[11px] text-cyan-300 tabular-nums">
                          <div>{msToSrtTime(cue.startMs)}</div>
                          <div className="text-gray-500">{msToSrtTime(cue.endMs)}</div>
                        </div>
                        <span className="ml-auto text-[10px] font-mono text-gray-400 bg-[#141414] border border-[#2d2d2d] rounded px-1.5 py-0.5 tabular-nums">
                          {formatCueDuration(cue.startMs, cue.endMs)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {cue.sceneNumber !== undefined && (
                            <span className="text-[10px] font-mono text-gray-400 bg-[#141414] border border-[#2f2f2f] rounded px-1.5 py-0.5">
                              Sc.{cue.sceneNumber}
                            </span>
                          )}
                          {cue.speaker && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
                              {cue.speaker}
                            </span>
                          )}
                          {cue.elementHint && cue.elementHint !== 'auto' && (
                            <span className="text-[10px] text-gray-500 uppercase">
                              {cue.elementHint.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-100 whitespace-pre-wrap leading-relaxed font-sans">
                          {cue.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-4xl mx-auto bg-[#111111] border border-[#323232] rounded overflow-hidden">
                  <div className="px-3 py-2 bg-[#181818] border-b border-[#2e2e2e] flex items-center justify-between text-[11px] text-gray-400">
                    <span>
                      {exportOptions.format === 'vtt' ? 'WebVTT Output (.vtt)' : 'SubRip Output (.srt)'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {generatedCues.length} cues · {new Blob([generatedRawSource]).size} bytes
                    </span>
                  </div>
                  <pre className="p-4 font-mono text-xs text-gray-200 whitespace-pre-wrap select-text leading-relaxed">
                    {generatedRawSource}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: SUBTITLE IMPORTER & EDITOR -> SCREENPLAY */}
      {modeTab === 'subtitle_editor_to_script' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Import & Editor Action Toolbar */}
          <div className="px-4 py-2 bg-[#1d1d1d] border-b border-[#343434] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleTriggerFileImport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Subtitle File (.srt / .vtt / .sbv)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#353535] border border-[#424242] text-gray-200 font-medium whitespace-nowrap"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                <span>Paste Subtitle Text</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSampleSubtitles}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#252525] hover:bg-[#313131] border border-[#3c3c3c] text-gray-300 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Load Sample</span>
              </button>
              <span className="text-[11px] text-gray-400 pl-1">
                Loaded: <span className="text-gray-200 font-medium">{importedFileName}</span> ({detectedFormatLabel})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddCue}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#404040] text-emerald-300 font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cue</span>
              </button>
              <button
                type="button"
                onClick={handleSortByStartTime}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#3d3d3d] text-gray-200 whitespace-nowrap"
                title="Sort all cues chronologically by start timestamp"
              >
                <SortAsc className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sort</span>
              </button>
              <button
                type="button"
                onClick={handleAutoDetectSpeakers}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#262626] hover:bg-[#333333] border border-[#3d3d3d] text-gray-200 whitespace-nowrap"
                title="Scan cue text for SPEAKER:, [ACTION], and INT./EXT. headings"
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>Detect Speakers</span>
              </button>

              {/* Time Shift Utility */}
              <div className="flex items-center gap-1 bg-[#141414] border border-[#383838] rounded px-1.5 py-0.5">
                <Clock className="w-3 h-3 text-gray-400" />
                <button
                  type="button"
                  onClick={() => handleShiftAllTimes(-1)}
                  className="px-1.5 py-0.5 rounded bg-[#252525] hover:bg-[#333] text-gray-200 font-mono text-[10px]"
                  title="Shift all cue timestamps earlier"
                >
                  -
                </button>
                <input
                  type="number"
                  step="0.5"
                  min={0.1}
                  value={shiftSecondsInput}
                  onChange={(e) => setShiftSecondsInput(e.target.value)}
                  className="w-12 bg-transparent text-center font-mono text-[11px] text-gray-100 focus:outline-none"
                  aria-label="Time shift seconds"
                />
                <span className="text-[10px] text-gray-500">s</span>
                <button
                  type="button"
                  onClick={() => handleShiftAllTimes(1)}
                  className="px-1.5 py-0.5 rounded bg-[#252525] hover:bg-[#333] text-gray-200 font-mono text-[10px]"
                  title="Shift all cue timestamps later"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadEdited('srt')}
                disabled={editorCues.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] disabled:opacity-40 border border-[#404040] text-amber-300 font-semibold whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .SRT</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadEdited('vtt')}
                disabled={editorCues.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] disabled:opacity-40 border border-[#404040] text-cyan-300 font-semibold whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .VTT</span>
              </button>
            </div>
          </div>

          {/* Two-Pane Body: Cue Editor (Left) + Screenplay Converter & Live Script Preview (Right) */}
          <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
            {/* Left: Interactive Subtitle Cue Editor */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#161616] border-b xl:border-b-0 xl:border-r border-[#343434]">
              <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 shrink-0">
                <span className="font-semibold text-gray-200">
                  Subtitle Cue Editor ({editorCues.length} cues)
                </span>
                <span>Edit timestamps, speaker cues, element roles, or split/merge lines</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {editorCues.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
                    <Captions className="w-8 h-8 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-300">
                      No subtitle cues loaded
                    </p>
                    <p className="text-xs text-gray-500 max-w-md">
                      Import a .srt, .vtt, or .sbv subtitle file, paste timed captions, or click Add Cue to build a subtitle track from scratch.
                    </p>
                  </div>
                ) : (
                  editorCues.map((cue, idx) => {
                    const prevCue = idx > 0 ? editorCues[idx - 1] : null;
                    const hasRangeErr = cue.endMs <= cue.startMs;
                    const overlapsPrev = Boolean(prevCue && cue.startMs < prevCue.endMs);

                    return (
                      <div
                        key={cue.id}
                        className={`bg-[#1f1f1f] border rounded p-3 space-y-2 transition-colors ${
                          hasRangeErr
                            ? 'border-rose-500/70'
                            : overlapsPrev
                            ? 'border-amber-500/60'
                            : 'border-[#333333] hover:border-[#474747]'
                        }`}
                      >
                        {/* Row Header: Index, Start, End, Duration, Speaker, Role Hint, Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-amber-400 text-[11px] w-7 tabular-nums">
                              #{idx + 1}
                            </span>

                            <div className="flex items-center gap-1">
                              <TimecodeInput
                                ariaLabel={`Cue ${idx + 1} start timecode`}
                                valueMs={cue.startMs}
                                hasError={hasRangeErr || overlapsPrev}
                                onCommitMs={(nextStart) =>
                                  updateCue(cue.id, { startMs: nextStart })
                                }
                              />
                              <span className="text-gray-500 font-mono text-[10px]">→</span>
                              <TimecodeInput
                                ariaLabel={`Cue ${idx + 1} end timecode`}
                                valueMs={cue.endMs}
                                hasError={hasRangeErr}
                                onCommitMs={(nextEnd) =>
                                  updateCue(cue.id, { endMs: nextEnd })
                                }
                              />
                            </div>

                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border tabular-nums ${
                                hasRangeErr
                                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                                  : 'bg-[#141414] border-[#2e2e2e] text-gray-300'
                              }`}
                            >
                              {formatCueDuration(cue.startMs, cue.endMs)}
                            </span>

                            {(hasRangeErr || overlapsPrev) && (
                              <span
                                className="flex items-center gap-1 text-[10px] text-amber-300"
                                title={
                                  hasRangeErr
                                    ? 'End time must be after start time'
                                    : 'Overlaps previous cue'
                                }
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>{hasRangeErr ? 'Invalid range' : 'Overlap'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              value={cue.speaker || ''}
                              onChange={(e) =>
                                updateCue(cue.id, { speaker: e.target.value })
                              }
                              placeholder="SPEAKER"
                              aria-label={`Cue ${idx + 1} speaker`}
                              className="w-28 bg-[#141414] border border-[#383838] focus:border-[#ff8000] focus:outline-none rounded px-2 py-1 text-[11px] font-semibold uppercase text-amber-200 placeholder:text-gray-600"
                            />

                            <select
                              value={cue.elementHint || 'auto'}
                              onChange={(e) =>
                                updateCue(cue.id, {
                                  elementHint: e.target.value as SubtitleElementHint,
                                })
                              }
                              aria-label={`Cue ${idx + 1} screenplay element type`}
                              className="bg-[#141414] border border-[#383838] focus:border-[#ff8000] focus:outline-none rounded px-2 py-1 text-[11px] text-gray-200"
                            >
                              <option value="auto">Auto Detect</option>
                              <option value="DIALOGUE">Dialogue</option>
                              <option value="VOICE_OVER">Voice-Over (V.O.)</option>
                              <option value="ACTION">Action</option>
                              <option value="SCENE_HEADING">Scene Heading</option>
                              <option value="PARENTHETICAL">Parenthetical</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleSplitCue(idx)}
                              className="p-1 rounded bg-[#272727] hover:bg-[#353535] text-gray-300"
                              title="Split cue in half"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMergeWithNext(idx)}
                              disabled={idx >= editorCues.length - 1}
                              className="p-1 rounded bg-[#272727] hover:bg-[#353535] disabled:opacity-30 text-gray-300"
                              title="Merge with next cue"
                            >
                              <Merge className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateCue(idx)}
                              className="p-1 rounded bg-[#272727] hover:bg-[#353535] text-gray-300"
                              title="Duplicate cue"
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCue(cue.id)}
                              className="p-1 rounded bg-[#272727] hover:bg-rose-900/60 text-gray-400 hover:text-rose-300"
                              title="Delete cue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Cue Text Editor */}
                        <textarea
                          rows={Math.min(4, Math.max(2, cue.text.split('\n').length))}
                          value={cue.text}
                          onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                          placeholder="Enter subtitle text..."
                          aria-label={`Cue ${idx + 1} text`}
                          className="w-full bg-[#141414] border border-[#333333] focus:border-[#ff8000] focus:outline-none rounded px-2.5 py-1.5 text-xs text-gray-100 leading-relaxed resize-y"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Screenplay Conversion Config & Live Screenplay Document Preview */}
            <div className="w-full xl:w-[480px] shrink-0 flex flex-col bg-[#1b1b1b] min-h-0 overflow-hidden">
              {/* Conversion Options */}
              <div className="p-4 border-b border-[#323232] bg-[#202020] space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#ff7700]" />
                    <span className="font-bold text-gray-100">
                      Convert Subtitles → Screenplay Document
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 tabular-nums">
                    {previewScreenplay.scenes.length} Scenes · {previewScreenplay.elements.length} Elements
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-[10px] text-gray-400">Screenplay Title</span>
                    <input
                      type="text"
                      value={scriptOptions.title}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full bg-[#141414] border border-[#3a3a3a] rounded px-2.5 py-1 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] text-gray-400">Author</span>
                    <input
                      type="text"
                      value={scriptOptions.author}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({ ...prev, author: e.target.value }))
                      }
                      className="w-full bg-[#141414] border border-[#3a3a3a] rounded px-2.5 py-1 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-[10px] text-gray-400">Default Scene Heading</span>
                    <input
                      type="text"
                      value={scriptOptions.defaultSceneHeading}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          defaultSceneHeading: e.target.value,
                        }))
                      }
                      className="w-full bg-[#141414] border border-[#3a3a3a] rounded px-2.5 py-1 font-mono text-[11px] uppercase text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] text-gray-400">Format</span>
                    <select
                      value={scriptOptions.documentCategory}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          documentCategory: e.target.value as SubtitleToScriptOptions['documentCategory'],
                        }))
                      }
                      className="w-full bg-[#141414] border border-[#3a3a3a] rounded px-2 py-1 text-gray-100 focus:outline-none focus:border-[#ff8000]"
                    >
                      <option value="film">Film Script</option>
                      <option value="television">Television</option>
                      <option value="stage">Stage Play</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] bg-[#161616] border border-[#303030] rounded p-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scriptOptions.extractSpeakerPrefixes}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          extractSpeakerPrefixes: e.target.checked,
                        }))
                      }
                      className="accent-[#ff7700]"
                    />
                    <span className="text-gray-200">Extract NAME: prefixes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scriptOptions.mergeConsecutiveSameSpeaker}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          mergeConsecutiveSameSpeaker: e.target.checked,
                        }))
                      }
                      className="accent-[#ff7700]"
                    />
                    <span className="text-gray-200">Merge same-speaker cues</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scriptOptions.treatBracketedAsAction}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          treatBracketedAsAction: e.target.checked,
                        }))
                      }
                      className="accent-[#ff7700]"
                    />
                    <span className="text-gray-200">[Bracketed] → Action</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-gray-300">
                    <span>New scene gap:</span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={scriptOptions.detectSceneBreaksOnGapSec}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          detectSceneBreaksOnGapSec: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-12 bg-[#111] border border-[#383838] rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-amber-300"
                    />
                    <span className="text-gray-500">s (0=off)</span>
                  </label>
                </div>

                {/* Convert Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConvertToNewScreenplay}
                    disabled={editorCues.length === 0}
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-bold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Create Screenplay Document</span>
                  </button>
                  {onAppendSubtitlesToProject && (
                    <button
                      type="button"
                      onClick={handleAppendToActive}
                      disabled={editorCues.length === 0}
                      className="px-3 py-2 rounded bg-[#2a2a2a] hover:bg-[#353535] disabled:opacity-40 border border-[#444] text-gray-100 font-semibold whitespace-nowrap"
                      title={`Append converted scenes into "${activeProject.title}"`}
                    >
                      + Append to Active Script
                    </button>
                  )}
                </div>
              </div>

              {/* Right Preview Tabs (Formatted Screenplay vs Edited SRT/VTT) */}
              <div className="px-3 py-1.5 bg-[#181818] border-b border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('preview')}
                    className={`px-2 py-1 rounded ${
                      rightPaneTab === 'preview'
                        ? 'bg-[#2a2a2a] text-amber-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Screenplay Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('raw_srt')}
                    className={`px-2 py-1 rounded ${
                      rightPaneTab === 'raw_srt'
                        ? 'bg-[#2a2a2a] text-cyan-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Edited .SRT
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('raw_vtt')}
                    className={`px-2 py-1 rounded ${
                      rightPaneTab === 'raw_vtt'
                        ? 'bg-[#2a2a2a] text-cyan-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Edited .VTT
                  </button>
                </div>

                {rightPaneTab !== 'preview' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyEdited(rightPaneTab === 'raw_vtt' ? 'vtt' : 'srt')
                    }
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#242424] hover:bg-[#303030] border border-[#3a3a3a] text-[10px] text-gray-200"
                  >
                    {copiedEditedSource ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#141414]">
                {rightPaneTab === 'preview' ? (
                  <div className="space-y-3">
                    {previewScreenplay.characters.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-gray-400 font-semibold">Detected Cast:</span>
                        {previewScreenplay.characters.map((ch) => (
                          <span
                            key={ch.name}
                            className="px-1.5 py-0.5 rounded bg-[#202020] border border-[#353535] text-amber-200 font-mono"
                          >
                            {ch.name} ({ch.speakingLines})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="bg-[#faf8f3] text-black font-courier rounded border border-[#d6d1c4] shadow p-5 space-y-2 text-[12px] leading-snug">
                      {previewScreenplay.elements.map((el) => {
                        if (el.type === 'SCENE_HEADING') {
                          return (
                            <div
                              key={el.id}
                              className="font-bold uppercase pt-2 pb-1 border-b border-gray-300/70"
                            >
                              {el.text}
                            </div>
                          );
                        }
                        if (el.type === 'CHARACTER') {
                          return (
                            <div key={el.id} className="ml-[32%] font-bold uppercase pt-2">
                              {el.text}
                            </div>
                          );
                        }
                        if (el.type === 'PARENTHETICAL') {
                          return (
                            <div key={el.id} className="ml-[24%] max-w-[44%] text-gray-800">
                              {el.text}
                            </div>
                          );
                        }
                        if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') {
                          return (
                            <div key={el.id} className="ml-[16%] max-w-[66%] pb-1">
                              {el.text}
                            </div>
                          );
                        }
                        return (
                          <div key={el.id} className="py-1">
                            {el.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <pre className="bg-[#101010] border border-[#303030] rounded p-3 font-mono text-[11px] text-gray-200 whitespace-pre-wrap select-text leading-relaxed">
                    {rightPaneTab === 'raw_vtt' ? editedVttSource : editedSrtSource}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paste Subtitle Text Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#222222] border border-[#444] rounded-lg shadow-2xl w-full max-w-xl text-xs text-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#363636] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-[#ff7700]" />
                <span className="font-bold text-sm text-gray-100">
                  Paste Subtitles (.SRT, .VTT, .SBV, or Timed Transcript)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-gray-400 hover:text-white px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2">
              <textarea
                rows={11}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`1\n00:00:01,000 --> 00:00:04,200\nINT. STUDIO - DAY\n\n2\n00:00:04,500 --> 00:00:07,800\nELENA: Ready for sound check.`}
                className="w-full bg-[#141414] border border-[#3a3a3a] focus:border-[#ff8000] focus:outline-none rounded p-3 font-mono text-xs text-gray-100"
              />
            </div>
            <div className="px-4 py-3 bg-[#1a1a1a] border-t border-[#363636] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#2c2c2c] hover:bg-[#383838] text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportPastedSubtitles}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-bold"
              >
                Parse into Cue Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Importing Subtitles */}
      <input
        ref={subtitleFileInputRef}
        type="file"
        accept=".srt,.vtt,.sbv,.txt"
        onChange={handleSubtitleFileSelected}
        className="hidden"
      />
    </div>
  );
};
