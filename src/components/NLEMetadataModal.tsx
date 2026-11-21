import React, { useEffect, useMemo, useState } from 'react';
import {
  NLEExportConfig,
  NLEExportPreset,
  NLEFrameRate,
  NLEGeneratedSidecarEntry,
  NLESidecarFormat,
  NLETargetSoftware,
  StoryProject,
  TranscriptAlignmentMatch,
} from '../types/story';
import {
  alignTranscriptToDialogue,
  analyzeCharacterPresenceAndScheduleConflicts,
  buildNLEMetadataDocument,
  computeScriptFingerprint,
  createGeneratedSidecarEntry,
  DEFAULT_NLE_PRESETS,
  DialogueQueryMatchMode,
  DialogueQueryResult,
  exportPremiereProXML,
  getSampleTranscriptForProject,
  NLEPreFlightCategory,
  NLEPreFlightReport,
  queryDialogueEntries,
  runNLEPreFlightCheck,
} from '../utils/nleMetadataPipeline';
import {
  X,
  Film,
  FileCode,
  Search,
  Copy,
  Check,
  Download,
  AudioWaveform,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  MapPin,
  ArrowUpRight,
  Send,
  Hash,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  History,
  Trash2,
  Clock,
  GitCommitHorizontal,
  Sliders,
  Save,
  Bookmark,
  CalendarClock,
  Users,
} from 'lucide-react';

interface NLEMetadataModalProps {
  project: StoryProject;
  onClose: () => void;
  onSelectScene?: (sceneId: string) => void;
  onRecordGeneratedSidecar?: (entry: NLEGeneratedSidecarEntry) => void;
  onClearGeneratedMetadataLog?: () => void;
}

const renderHighlightedText = (text: string, query: string): React.ReactNode => {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark
        key={idx}
        className="bg-[#ff7700]/30 text-amber-200 px-0.5 rounded-xs font-medium"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
};

const NLE_PRESETS_STORAGE_KEY = 'screencraft_nle_export_presets_v1';

const loadCustomPresetsFromStorage = (): NLEExportPreset[] => {
  try {
    const raw = localStorage.getItem(NLE_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const NLEMetadataModal: React.FC<NLEMetadataModalProps> = ({
  project,
  onClose,
  onSelectScene,
  onRecordGeneratedSidecar,
  onClearGeneratedMetadataLog,
}) => {
  const [activeTab, setActiveTab] = useState<
    'export' | 'dialogue_index' | 'stt_align' | 'generated_log'
  >('export');
  const [frameRate, setFrameRate] = useState<NLEFrameRate>(
    DEFAULT_NLE_PRESETS[0].config.frameRate
  );
  const [previewFormat, setPreviewFormat] = useState<'xml' | 'json'>(
    DEFAULT_NLE_PRESETS[0].config.preferredFormat
  );
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // NLE Presets state
  const [customPresets, setCustomPresets] = useState<NLEExportPreset[]>(() =>
    loadCustomPresetsFromStorage()
  );
  const [activePresetId, setActivePresetId] = useState<string>(DEFAULT_NLE_PRESETS[0].id);
  const [exportConfig, setExportConfig] = useState<NLEExportConfig>(() => ({
    ...DEFAULT_NLE_PRESETS[0].config,
  }));
  const [isPresetsExpanded, setIsPresetsExpanded] = useState<boolean>(true);
  const [showSavePresetForm, setShowSavePresetForm] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetTarget, setNewPresetTarget] = useState<NLETargetSoftware>('Adobe Premiere Pro');
  const [newPresetDesc, setNewPresetDesc] = useState<string>('');
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(NLE_PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // Ignore storage quota errors
    }
  }, [customPresets]);

  const allPresets = useMemo(
    () => [...DEFAULT_NLE_PRESETS, ...customPresets],
    [customPresets]
  );

  const activePreset = useMemo(
    () => allPresets.find((p) => p.id === activePresetId) || null,
    [allPresets, activePresetId]
  );

  const isPresetModified = useMemo(() => {
    if (!activePreset) return true;
    return JSON.stringify(activePreset.config) !== JSON.stringify(exportConfig);
  }, [activePreset, exportConfig]);

  const handleLoadPreset = (preset: NLEExportPreset) => {
    setActivePresetId(preset.id);
    setExportConfig({ ...preset.config });
    setFrameRate(preset.config.frameRate);
    setPreviewFormat(preset.config.preferredFormat);
    setPresetFeedback(`Loaded "${preset.name}"`);
    setTimeout(() => setPresetFeedback(null), 2200);
  };

  const updateExportConfig = (patch: Partial<NLEExportConfig>) => {
    setExportConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.frameRate !== undefined) setFrameRate(patch.frameRate);
      if (patch.preferredFormat !== undefined) setPreviewFormat(patch.preferredFormat);
      return next;
    });
  };

  const handleSaveCustomPreset = () => {
    const trimmedName = newPresetName.trim();
    if (!trimmedName) return;
    const savedConfig: NLEExportConfig = {
      ...exportConfig,
      nleTarget: newPresetTarget,
      frameRate,
      preferredFormat: previewFormat,
    };
    const created: NLEExportPreset = {
      id: `preset-custom-${Date.now()}`,
      name: trimmedName,
      nleTarget: newPresetTarget,
      description:
        newPresetDesc.trim() ||
        `${newPresetTarget} · ${frameRate}fps · TC ${savedConfig.timecodeStart} · ${savedConfig.preferredFormat.toUpperCase()}`,
      isBuiltIn: false,
      updatedAt: new Date().toISOString(),
      config: savedConfig,
    };
    setCustomPresets((prev) => [created, ...prev]);
    setActivePresetId(created.id);
    setExportConfig(savedConfig);
    setNewPresetName('');
    setNewPresetDesc('');
    setShowSavePresetForm(false);
    setPresetFeedback(`Saved preset "${created.name}"`);
    setTimeout(() => setPresetFeedback(null), 2400);
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (activePresetId === presetId) {
      setActivePresetId(DEFAULT_NLE_PRESETS[0].id);
    }
  };

  // Dialogue Query state
  const [dialogueQuery, setDialogueQuery] = useState('');
  const [queryMatchMode, setQueryMatchMode] = useState<DialogueQueryMatchMode>('smart');
  const [sceneFilter, setSceneFilter] = useState<string>('all');
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');
  const [selectedLineKey, setSelectedLineKey] = useState<string | null>(null);

  // Speech-to-Text Alignment state
  const [transcriptInput, setTranscriptInput] = useState<string>(() =>
    getSampleTranscriptForProject(project)
  );

  // Pre-Flight Check state
  const [preFlightFilter, setPreFlightFilter] = useState<'all' | NLEPreFlightCategory>('all');
  const [isPreFlightExpanded, setIsPreFlightExpanded] = useState<boolean>(true);
  const [scanPulse, setScanPulse] = useState<number>(0);
  const [pendingExportAction, setPendingExportAction] = useState<{
    label: string;
    format: NLESidecarFormat;
    content: string;
    filename: string;
    mime: string;
  } | null>(null);

  // Generated Metadata Log state
  const [localFallbackLog, setLocalFallbackLog] = useState<NLEGeneratedSidecarEntry[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFormatFilter, setLogFormatFilter] = useState<'all' | NLESidecarFormat>('all');
  const [confirmClearLog, setConfirmClearLog] = useState(false);

  const preFlightReport: NLEPreFlightReport = useMemo(
    () => runNLEPreFlightCheck(project),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, scanPulse]
  );

  const charCrossRef = useMemo(
    () => analyzeCharacterPresenceAndScheduleConflicts(project),
    [project]
  );

  const getCharColor = (name: string): string =>
    charCrossRef.characterColors[name.trim().toUpperCase()] || '#9ca3af';

  const filteredPreFlightWarnings = useMemo(() => {
    if (preFlightFilter === 'all') return preFlightReport.warnings;
    return preFlightReport.warnings.filter((w) => w.category === preFlightFilter);
  }, [preFlightReport, preFlightFilter]);

  const metadataDoc = useMemo(
    () => buildNLEMetadataDocument(project, frameRate, exportConfig, activePreset?.name),
    [project, frameRate, exportConfig, activePreset?.name]
  );

  const alignedMatches: TranscriptAlignmentMatch[] = useMemo(
    () => alignTranscriptToDialogue(project, transcriptInput, frameRate),
    [project, transcriptInput, frameRate]
  );

  const alignedByLineKey = useMemo(() => {
    const map = new Map<string, TranscriptAlignmentMatch[]>();
    alignedMatches.forEach((m) => {
      if (!m.matchedEntry) return;
      const key = m.matchedEntry.lineKey;
      const existing = map.get(key) || [];
      existing.push(m);
      map.set(key, existing);
    });
    return map;
  }, [alignedMatches]);

  const xmlOutput = useMemo(
    () => exportPremiereProXML(project, frameRate, alignedMatches, exportConfig),
    [project, frameRate, alignedMatches, exportConfig]
  );

  const jsonOutput = useMemo(
    () => JSON.stringify(metadataDoc, null, 2),
    [metadataDoc]
  );

  const queryResults: DialogueQueryResult[] = useMemo(
    () =>
      queryDialogueEntries(metadataDoc, {
        query: dialogueQuery,
        sceneId: sceneFilter,
        speaker: speakerFilter,
        matchMode: queryMatchMode,
      }),
    [metadataDoc, dialogueQuery, sceneFilter, speakerFilter, queryMatchMode]
  );

  const selectedResult: DialogueQueryResult | null = useMemo(() => {
    if (queryResults.length === 0) return null;
    if (selectedLineKey) {
      const found = queryResults.find((r) => r.entry.lineKey === selectedLineKey);
      if (found) return found;
    }
    return queryResults[0];
  }, [queryResults, selectedLineKey]);

  const speakers = useMemo(
    () => Object.keys(metadataDoc.dialogueIndex.bySpeaker).sort(),
    [metadataDoc]
  );

  const alignmentStats = useMemo(() => {
    const matched = alignedMatches.filter((m) => m.matchedEntry !== null);
    const avgConfidence =
      matched.length > 0
        ? Math.round(matched.reduce((acc, m) => acc + m.confidence, 0) / matched.length)
        : 0;
    return {
      totalSegments: alignedMatches.length,
      matchedCount: matched.length,
      avgConfidence,
    };
  }, [alignedMatches]);

  const currentScriptFingerprint = useMemo(
    () => computeScriptFingerprint(project),
    [project]
  );

  const generatedMetadataLog = useMemo(() => {
    const persisted = project.generatedMetadataLog || [];
    if (localFallbackLog.length === 0) return persisted;
    const seen = new Set(persisted.map((e) => e.id));
    return [...localFallbackLog.filter((e) => !seen.has(e.id)), ...persisted];
  }, [project.generatedMetadataLog, localFallbackLog]);

  const filteredGeneratedLog = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return generatedMetadataLog.filter((entry) => {
      if (logFormatFilter !== 'all' && entry.format !== logFormatFilter) return false;
      if (!q) return true;
      return (
        entry.filename.toLowerCase().includes(q) ||
        entry.fileHash.toLowerCase().includes(q) ||
        entry.formatLabel.toLowerCase().includes(q) ||
        (entry.draftName || '').toLowerCase().includes(q)
      );
    });
  }, [generatedMetadataLog, logSearchQuery, logFormatFilter]);

  const handleCopy = (label: string, content: string) => {
    navigator.clipboard?.writeText(content).catch(() => {});
    setCopiedState(label);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const executeAndLogSidecarDownload = async (params: {
    label: string;
    format: NLESidecarFormat;
    content: string;
    filename: string;
    mime: string;
  }) => {
    triggerDownload(params.content, params.filename, params.mime);
    const entry = await createGeneratedSidecarEntry({
      project,
      content: params.content,
      filename: params.filename,
      format: params.format,
      formatLabel: params.label,
      frameRate,
      sceneCount: metadataDoc.scenes.length,
      dialogueLineCount: metadataDoc.dialogueIndex.totalLines,
      alignedTakeCount: alignmentStats.matchedCount,
      preFlightWarningsCount: preFlightReport.totalWarnings,
    });
    if (onRecordGeneratedSidecar) {
      onRecordGeneratedSidecar(entry);
    } else {
      setLocalFallbackLog((prev) => [entry, ...prev]);
    }
  };

  const requestNLEExport = (
    label: string,
    format: NLESidecarFormat,
    content: string,
    filename: string,
    mime: string
  ) => {
    if (preFlightReport.totalWarnings > 0) {
      setActiveTab('export');
      setIsPreFlightExpanded(true);
      setPendingExportAction({ label, format, content, filename, mime });
      return;
    }
    void executeAndLogSidecarDownload({ label, format, content, filename, mime });
  };

  const handleUploadTranscript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTranscriptInput(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleSendToTakeAligner = (result: DialogueQueryResult) => {
    const cueLine = `[Take ${result.entry.sceneNumber}A-${result.entry.lineKey} | ${result.entry.timecodeIn}] ${result.entry.speaker}: ${result.entry.exactText}`;
    setTranscriptInput((prev) => {
      const trimmed = prev.trim();
      if (trimmed.includes(cueLine)) return prev;
      return trimmed ? `${trimmed}\n${cueLine}` : cueLine;
    });
    setActiveTab('stt_align');
  };

  const baseSlug = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileSuffix = exportConfig.filenameSuffix || '';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none text-xs text-gray-200">
      <div className="bg-[#212121] border border-[#424242] rounded-lg shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#191919] border-b border-[#363636] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-[#2d2115] border border-[#ff7700]/40 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4 text-[#ff8000]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-100 truncate">
                Script-to-NLE Metadata Pipeline & Speech-to-Text Alignment
              </h2>
              <p className="text-[11px] text-gray-400 truncate">
                {project.title} · {exportConfig.nleTarget} · Preset: {activePreset ? activePreset.name : 'Custom'} {isPresetModified ? '(Modified)' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#252525] border border-[#3a3a3a] rounded px-2.5 py-1">
              <span className="text-[11px] text-gray-400">Timebase:</span>
              <select
                value={frameRate}
                onChange={(e) => {
                  const nextFps = Number(e.target.value) as NLEFrameRate;
                  setFrameRate(nextFps);
                  setExportConfig((prev) => ({ ...prev, frameRate: nextFps }));
                }}
                className="bg-transparent text-amber-300 font-mono text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value={23.976} className="bg-[#222]">23.976 fps</option>
                <option value={24} className="bg-[#222]">24 fps</option>
                <option value={25} className="bg-[#222]">25 fps (PAL)</option>
                <option value={29.97} className="bg-[#222]">29.97 DF</option>
                <option value={30} className="bg-[#222]">30 fps</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#303030] rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-tabs */}
        <div className="px-5 py-2 bg-[#1e1e1e] border-b border-[#343434] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center p-0.5 bg-[#151515] rounded border border-[#363636]">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'export'
                  ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Premiere Pro XML & Sidecar Schema</span>
            </button>
            <button
              onClick={() => setActiveTab('dialogue_index')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dialogue_index'
                  ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Dialogue Query ({metadataDoc.dialogueIndex.totalLines})</span>
            </button>
            <button
              onClick={() => setActiveTab('stt_align')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'stt_align'
                  ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <AudioWaveform className="w-3.5 h-3.5" />
              <span>Speech-to-Text Take Aligner</span>
            </button>
            <button
              onClick={() => setActiveTab('generated_log')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'generated_log'
                  ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Generated Metadata Log ({generatedMetadataLog.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0">
            <button
              onClick={() => setActiveTab('dialogue_index')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-sans font-medium transition-colors whitespace-nowrap shrink-0 ${
                charCrossRef.conflicts.length > 0
                  ? 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-950/90'
                  : 'bg-[#1a2226] border-cyan-800/50 text-cyan-300 hover:bg-[#1f292e]'
              }`}
              title="Cross-reference character presence indicators against Production Schedule"
            >
              <CalendarClock
                className={`w-3.5 h-3.5 ${
                  charCrossRef.conflicts.length > 0 ? 'text-rose-400' : 'text-cyan-400'
                }`}
              />
              <span>
                {charCrossRef.conflicts.length > 0
                  ? `${charCrossRef.conflicts.length} Cast 2-Loc Conflict${
                      charCrossRef.conflicts.length === 1 ? '' : 's'
                    }`
                  : 'Cast Schedule Synced'}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('export');
                setIsPreFlightExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-sans font-medium transition-colors whitespace-nowrap shrink-0 ${
                preFlightReport.passed
                  ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/80'
                  : 'bg-amber-950/60 border-amber-600/60 text-amber-300 hover:bg-amber-950/90'
              }`}
              title="Inspect Pre-Flight Script Check"
            >
              {preFlightReport.passed ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {preFlightReport.passed
                  ? 'Pre-Flight Passed'
                  : `Pre-Flight: ${preFlightReport.totalWarnings} Warning${
                      preFlightReport.totalWarnings === 1 ? '' : 's'
                    }`}
              </span>
            </button>
            <span className="text-gray-400 hidden xl:inline">{metadataDoc.scenes.length} Scenes</span>
            <span className="text-gray-600 hidden xl:inline">·</span>
            <span className="text-gray-400 hidden xl:inline">{metadataDoc.totalDurationSec.toFixed(1)}s</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'export' && (
            <div className="flex-1 flex flex-col min-h-0 p-5 gap-3.5 overflow-y-auto">
              {/* Pre-Flight Check Banner & Warning List */}
              <div
                className={`rounded border flex-shrink-0 overflow-hidden ${
                  preFlightReport.passed
                    ? 'bg-[#17211b] border-emerald-800/60'
                    : 'bg-[#231d15] border-amber-700/60'
                }`}
              >
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setIsPreFlightExpanded((v) => !v)}
                    className="flex items-center gap-2 text-left min-w-0"
                  >
                    {isPreFlightExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    {preFlightReport.passed ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span
                        className={`font-semibold text-xs ${
                          preFlightReport.passed ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {preFlightReport.passed
                          ? 'Pre-Flight Check Passed — Script Ready for NLE Sidecar Generation'
                          : `Pre-Flight Check: ${preFlightReport.totalWarnings} Warning${
                              preFlightReport.totalWarnings === 1 ? '' : 's'
                            } Detected Before Sidecar Export`}
                      </span>
                      <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                        <span>
                          Missing Scene Headings:{' '}
                          <strong
                            className={
                              preFlightReport.counts.missingSceneHeadings > 0
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }
                          >
                            {preFlightReport.counts.missingSceneHeadings}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Orphaned Dialogue:{' '}
                          <strong
                            className={
                              preFlightReport.counts.orphanedDialogue > 0
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }
                          >
                            {preFlightReport.counts.orphanedDialogue}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Unassigned Character Tags:{' '}
                          <strong
                            className={
                              preFlightReport.counts.unassignedCharacterTags > 0
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }
                          >
                            {preFlightReport.counts.unassignedCharacterTags}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {!preFlightReport.passed && (
                      <div className="flex items-center p-0.5 bg-[#151515] border border-[#3a3a3a] rounded">
                        {(
                          [
                            { id: 'all', label: `All (${preFlightReport.totalWarnings})` },
                            {
                              id: 'missing_scene_heading',
                              label: `Headings (${preFlightReport.counts.missingSceneHeadings})`,
                            },
                            {
                              id: 'orphaned_dialogue',
                              label: `Orphaned (${preFlightReport.counts.orphanedDialogue})`,
                            },
                            {
                              id: 'unassigned_character_tag',
                              label: `Tags (${preFlightReport.counts.unassignedCharacterTags})`,
                            },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setPreFlightFilter(tab.id);
                              setIsPreFlightExpanded(true);
                            }}
                            className={`px-2 py-0.5 rounded-xs text-[10px] transition-colors whitespace-nowrap shrink-0 ${
                              preFlightFilter === tab.id
                                ? 'bg-[#2c2c2c] text-amber-300 font-semibold'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setScanPulse((n) => n + 1);
                        setIsPreFlightExpanded(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1b1b1b] hover:bg-[#2a2a2a] border border-[#3c3c3c] text-[11px] text-gray-200 whitespace-nowrap shrink-0"
                      title="Re-run pre-flight script scan"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-400" />
                      <span>Re-scan Script</span>
                    </button>
                  </div>
                </div>

                {isPreFlightExpanded && !preFlightReport.passed && (
                  <div className="border-t border-amber-800/40 bg-[#171717] max-h-44 overflow-y-auto divide-y divide-[#262626]">
                    {filteredPreFlightWarnings.length === 0 ? (
                      <div className="px-4 py-3 text-[11px] text-gray-400">
                        No warnings in this category.
                      </div>
                    ) : (
                      filteredPreFlightWarnings.map((w) => (
                        <div
                          key={w.id}
                          className="px-3.5 py-2 flex items-start justify-between gap-3 hover:bg-[#1e1e1e]"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <AlertTriangle
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                w.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded-xs text-[10px] font-mono uppercase border ${
                                    w.severity === 'error'
                                      ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                                      : 'bg-amber-950/60 border-amber-700/50 text-amber-300'
                                  }`}
                                >
                                  {w.category.replace(/_/g, ' ')}
                                </span>
                                <span className="font-semibold text-gray-100 text-[11px]">
                                  {w.title}
                                </span>
                                {w.elementId && (
                                  <span className="text-[10px] font-mono text-gray-500">
                                    ({w.elementId})
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 leading-snug">
                                {w.detail}{' '}
                                <span className="text-cyan-300/90">Fix: {w.suggestion}</span>
                              </p>
                            </div>
                          </div>

                          {onSelectScene && w.sceneId && (
                            <button
                              onClick={() => {
                                onSelectScene(w.sceneId!);
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-[#262626] hover:bg-[#ff7700] hover:text-black border border-[#3d3d3d] text-[10px] text-gray-200 whitespace-nowrap shrink-0 transition-colors"
                            >
                              {w.sceneNumber ? `Fix Sc. ${w.sceneNumber}` : 'Go to Scene'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Pre-Export Confirmation Gate when user tries to generate sidecars with active warnings */}
                {pendingExportAction && !preFlightReport.passed && (
                  <div className="px-3.5 py-2.5 bg-[#2e1e11] border-t border-[#ff7700]/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-[#ff8000] shrink-0" />
                      <span>
                        <strong>{preFlightReport.totalWarnings} pre-flight warning(s)</strong> may affect NLE timeline markers or dialogue indexing in{' '}
                        <code className="text-white">{pendingExportAction.filename}</code>.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPendingExportAction(null)}
                        className="px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333] border border-[#444] text-gray-200 text-[11px] whitespace-nowrap shrink-0"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          void executeAndLogSidecarDownload(pendingExportAction);
                          setPendingExportAction(null);
                        }}
                        className="px-3 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold text-[11px] whitespace-nowrap shrink-0"
                      >
                        Generate {pendingExportAction.label} Anyway
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidecar Presets Section */}
              <div className="bg-[#181818] border border-[#343434] rounded flex-shrink-0 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#1b1b1b] flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2e2e]">
                  <button
                    onClick={() => setIsPresetsExpanded((v) => !v)}
                    className="flex items-center gap-2 text-left min-w-0"
                  >
                    {isPresetsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <Sliders className="w-4 h-4 text-[#ff8000] shrink-0" />
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-gray-100">
                        Presets — Sidecar NLE Profiles
                      </span>
                      <span className="px-1.5 py-0.5 rounded-xs bg-[#262626] border border-[#3b3b3b] text-[10px] font-mono text-amber-300">
                        {activePreset ? activePreset.name : 'Custom Profile'}
                      </span>
                      {isPresetModified && (
                        <span className="px-1.5 py-0.5 rounded-xs bg-amber-950/60 border border-amber-700/50 text-[10px] text-amber-300">
                          Modified
                        </span>
                      )}
                      {presetFeedback && (
                        <span className="text-[11px] text-emerald-400 font-medium">
                          {presetFeedback}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setNewPresetTarget(exportConfig.nleTarget);
                        setShowSavePresetForm((v) => !v);
                        setIsPresetsExpanded(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252525] hover:bg-[#303030] border border-[#3f3f3f] text-[11px] text-amber-300 whitespace-nowrap shrink-0"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Current as Preset</span>
                    </button>
                  </div>
                </div>

                {isPresetsExpanded && (
                  <div className="p-3.5 space-y-3">
                    {/* Preset Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {allPresets.map((preset) => {
                        const isActive = preset.id === activePresetId;
                        return (
                          <div
                            key={preset.id}
                            className={`rounded border p-2.5 flex flex-col justify-between gap-2 transition-colors ${
                              isActive
                                ? 'bg-[#261f17] border-[#ff7700]/80'
                                : 'bg-[#141414] border-[#2e2e2e] hover:border-[#464646]'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Bookmark
                                      className={`w-3 h-3 shrink-0 ${
                                        isActive ? 'text-[#ff8000]' : 'text-gray-500'
                                      }`}
                                    />
                                    <span className="font-semibold text-[11px] text-gray-100 truncate">
                                      {preset.name}
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                                    {preset.nleTarget} · {preset.config.frameRate}fps · TC{' '}
                                    {preset.config.timecodeStart}
                                  </div>
                                </div>

                                {!preset.isBuiltIn && (
                                  <button
                                    onClick={() => handleDeleteCustomPreset(preset.id)}
                                    className="p-1 text-gray-500 hover:text-rose-400 rounded shrink-0"
                                    title="Delete custom preset"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 leading-snug line-clamp-2">
                                {preset.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#262626]">
                              <span className="text-[10px] font-mono text-gray-500">
                                {preset.isBuiltIn ? 'Built-in' : 'Saved Preset'} ·{' '}
                                {preset.config.preferredFormat.toUpperCase()}
                              </span>
                              <button
                                onClick={() => handleLoadPreset(preset)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                                  isActive
                                    ? 'bg-[#ff7700] text-black'
                                    : 'bg-[#262626] hover:bg-[#353535] text-gray-200 border border-[#3b3b3b]'
                                }`}
                              >
                                {isActive && !isPresetModified ? 'Active' : 'Load Preset'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inline Save Preset Form */}
                    {showSavePresetForm && (
                      <div className="p-3 rounded bg-[#141414] border border-[#ff7700]/60 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] text-gray-400 block">Preset Name</label>
                          <input
                            type="text"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder="e.g. Resolve Color Lock 23.976"
                            className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] text-gray-400 block">Target NLE</label>
                          <select
                            value={newPresetTarget}
                            onChange={(e) =>
                              setNewPresetTarget(e.target.value as NLETargetSoftware)
                            }
                            className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                          >
                            <option value="Adobe Premiere Pro">Adobe Premiere Pro</option>
                            <option value="DaVinci Resolve">DaVinci Resolve</option>
                            <option value="Avid Media Composer">Avid Media Composer</option>
                            <option value="Custom NLE">Custom NLE</option>
                          </select>
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] text-gray-400 block">Notes (optional)</label>
                          <input
                            type="text"
                            value={newPresetDesc}
                            onChange={(e) => setNewPresetDesc(e.target.value)}
                            placeholder="Marker & timecode notes..."
                            className="w-full bg-[#1c1c1c] border border-[#3a3a3a] rounded px-2.5 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setShowSavePresetForm(false)}
                            className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#323232] text-gray-300 text-[11px]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveCustomPreset}
                            disabled={!newPresetName.trim()}
                            className="px-3 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold text-[11px] whitespace-nowrap"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Sidecar Parameter Editor */}
                    <div className="p-2.5 rounded bg-[#141414] border border-[#2a2a2a] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <label className="flex items-center gap-1.5 text-gray-400">
                          <span>Start TC:</span>
                          <select
                            value={exportConfig.timecodeStart}
                            onChange={(e) =>
                              updateExportConfig({
                                timecodeStart: e.target.value as '00:00:00:00' | '01:00:00:00',
                              })
                            }
                            className="bg-[#1e1e1e] border border-[#3a3a3a] rounded px-2 py-0.5 font-mono text-gray-200 focus:outline-none focus:border-[#ff8000]"
                          >
                            <option value="00:00:00:00">00:00:00:00</option>
                            <option value="01:00:00:00">01:00:00:00 (Hour 1)</option>
                          </select>
                        </label>

                        <label className="flex items-center gap-1.5 text-gray-400">
                          <span>Marker Colors:</span>
                          <select
                            value={exportConfig.markerColorProfile}
                            onChange={(e) =>
                              updateExportConfig({
                                markerColorProfile: e.target.value as 'premiere' | 'resolve' | 'avid',
                              })
                            }
                            className="bg-[#1e1e1e] border border-[#3a3a3a] rounded px-2 py-0.5 text-gray-200 focus:outline-none focus:border-[#ff8000]"
                          >
                            <option value="premiere">Premiere (Orange / Cyan)</option>
                            <option value="resolve">Resolve (Blue / Emerald)</option>
                            <option value="avid">Avid (Yellow / Violet)</option>
                          </select>
                        </label>

                        <label className="flex items-center gap-1.5 text-gray-400">
                          <span>Suffix:</span>
                          <input
                            type="text"
                            value={exportConfig.filenameSuffix}
                            onChange={(e) =>
                              updateExportConfig({ filenameSuffix: e.target.value })
                            }
                            className="w-24 bg-[#1e1e1e] border border-[#3a3a3a] rounded px-2 py-0.5 font-mono text-gray-200 focus:outline-none focus:border-[#ff8000]"
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        {(
                          [
                            ['includeSceneMarkers', 'Scene Markers'],
                            ['includeDialogueCues', 'Dialogue Cues'],
                            ['includeCameraMetadata', 'Camera Shots'],
                            ['includePropAndTagMetadata', 'Props & Tags'],
                            ['includeAlignedTakes', 'STT Takes'],
                            ['includeTranscriptTokens', 'STT Tokens'],
                          ] as const
                        ).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-1.5 cursor-pointer text-gray-300 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={exportConfig[key]}
                              onChange={(e) =>
                                updateExportConfig({ [key]: e.target.checked })
                              }
                              className="accent-[#ff7700] rounded"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mapping Overview Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-[#191919] border border-[#343434] rounded p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-400">
                    01. Scene & Camera Markers
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Scene headings, cast lists, props, and camera shot directions map to NLE timeline <code className="text-gray-200">&lt;marker&gt;</code> blocks at <span className="font-mono tabular-nums">{frameRate} fps</span> (<span className="font-mono text-gray-300">{exportConfig.timecodeStart}</span>).
                  </p>
                </div>
                <div className="bg-[#191919] border border-[#343434] rounded p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-cyan-400">
                    02. Queryable Dialogue Cues
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Each spoken block receives a deterministic <code className="text-gray-200">lineKey</code> (<span className="font-mono">S01:L001</span>), normalized tokens, and SMPTE span for automated paper-edit matching.
                  </p>
                </div>
                <div className="bg-[#191919] border border-[#343434] rounded p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400">
                    03. Aligned Audio Take Track
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Speech-to-text matched takes are embedded directly into XMEML <code className="text-gray-200">&lt;audio&gt;&lt;clipitem&gt;</code> nodes with <code className="text-gray-200">&lt;logginginfo&gt;</code>.
                  </p>
                </div>
              </div>

              {/* Preview Header & Actions */}
              <div className="flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center p-0.5 bg-[#161616] rounded border border-[#363636]">
                  <button
                    onClick={() => {
                      setPreviewFormat('xml');
                      setExportConfig((prev) => ({ ...prev, preferredFormat: 'xml' }));
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                      previewFormat === 'xml'
                        ? 'bg-[#2c2c2c] text-amber-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Premiere Pro XMEML v4 (.xml)
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFormat('json');
                      setExportConfig((prev) => ({ ...prev, preferredFormat: 'json' }));
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                      previewFormat === 'json'
                        ? 'bg-[#2c2c2c] text-cyan-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    NLE Metadata Sidecar (.nle.json)
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      handleCopy(previewFormat, previewFormat === 'xml' ? xmlOutput : jsonOutput)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#363636] border border-[#444] rounded text-gray-200 whitespace-nowrap shrink-0"
                  >
                    {copiedState === previewFormat ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy {previewFormat.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      requestNLEExport(
                        `${exportConfig.nleTarget} XML`,
                        'premiere_xml',
                        xmlOutput,
                        `${baseSlug}${fileSuffix}_sequence.xml`,
                        'application/xml'
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export NLE XML</span>
                  </button>
                  <button
                    onClick={() =>
                      requestNLEExport(
                        `${exportConfig.nleTarget} JSON`,
                        'nle_json',
                        jsonOutput,
                        `${baseSlug}${fileSuffix}.nle.json`,
                        'application/json'
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#262626] hover:bg-[#333333] text-cyan-300 border border-[#3e3e3e] font-semibold rounded whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON Sidecar</span>
                  </button>
                </div>
              </div>

              {/* Code Preview */}
              <pre className="flex-1 min-h-[200px] overflow-auto bg-[#141414] border border-[#343434] rounded p-3.5 font-mono text-[11px] leading-relaxed text-gray-300 select-text">
                {previewFormat === 'xml' ? xmlOutput : jsonOutput}
              </pre>
            </div>
          )}

          {activeTab === 'dialogue_index' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Query Toolbar */}
              <div className="px-5 py-3 bg-[#1c1c1c] border-b border-[#343434] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
                    <input
                      type="text"
                      value={dialogueQuery}
                      onChange={(e) => setDialogueQuery(e.target.value)}
                      placeholder="Search dialogue string, character, lineKey (S01:L002), or elementId..."
                      className="w-full bg-[#141414] text-gray-100 pl-8 pr-7 py-1.5 rounded border border-[#3c3c3c] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                    {dialogueQuery && (
                      <button
                        onClick={() => setDialogueQuery('')}
                        className="absolute right-2 top-1.5 text-gray-500 hover:text-white"
                        title="Clear query"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Match Mode Switcher */}
                  <div className="flex items-center p-0.5 bg-[#141414] border border-[#363636] rounded">
                    {(
                      [
                        { id: 'smart', label: 'Smart' },
                        { id: 'exact_phrase', label: 'Exact Phrase' },
                        { id: 'fuzzy', label: 'Fuzzy STT' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setQueryMatchMode(mode.id)}
                        className={`px-2.5 py-1 rounded-xs text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                          queryMatchMode === mode.id
                            ? 'bg-[#2c2c2c] text-[#ff8000] font-semibold'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={sceneFilter}
                    onChange={(e) => setSceneFilter(e.target.value)}
                    className="bg-[#161616] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                  >
                    <option value="all">All Scenes ({project.scenes.length})</option>
                    {project.scenes.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        Sc. {sc.sceneNumber} — {sc.setting}
                      </option>
                    ))}
                  </select>

                  <select
                    value={speakerFilter}
                    onChange={(e) => setSpeakerFilter(e.target.value)}
                    className="bg-[#161616] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                  >
                    <option value="all">All Characters ({speakers.length})</option>
                    {speakers.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono tabular-nums text-gray-400 px-2">
                    {queryResults.length} / {metadataDoc.dialogueIndex.totalLines} lines
                  </span>
                  <button
                    onClick={() =>
                      void executeAndLogSidecarDownload({
                        label: 'Dialogue Query JSON',
                        format: 'dialogue_query_json',
                        content: JSON.stringify(
                          queryResults.map((r) => ({
                            lineKey: r.entry.lineKey,
                            elementId: r.entry.elementId,
                            sceneId: r.entry.sceneId,
                            sceneNumber: r.entry.sceneNumber,
                            sceneHeading: r.entry.sceneHeading,
                            speaker: r.entry.speaker,
                            exactText: r.entry.exactText,
                            timecodeIn: r.entry.timecodeIn,
                            timecodeOut: r.entry.timecodeOut,
                            startFrame: r.startFrame,
                            endFrame: r.endFrame,
                            matchType: r.matchType,
                            score: r.score,
                          })),
                          null,
                          2
                        ),
                        filename: `${baseSlug}_dialogue_query_results.json`,
                        mime: 'application/json',
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] rounded text-amber-300 font-medium whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Query JSON</span>
                  </button>
                </div>
              </div>

              {/* Schedule Cross-Reference Conflict Banner */}
              {charCrossRef.conflicts.length > 0 && (
                <div className="px-5 py-2.5 bg-[#2a171b] border-b border-rose-800/60 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-1">
                      <div className="text-[11px] font-semibold text-rose-200">
                        Character Presence Schedule Conflict: {charCrossRef.conflicts.length} simultaneous two-location booking
                        {charCrossRef.conflicts.length === 1 ? '' : 's'} detected in Production Schedule
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {charCrossRef.conflicts.map((cf) => (
                          <button
                            key={cf.id}
                            onClick={() => {
                              const hasSceneA = (metadataDoc.dialogueIndex.byScene[cf.slotA.sceneId] || []).length > 0;
                              const hasSceneB = (metadataDoc.dialogueIndex.byScene[cf.slotB.sceneId] || []).length > 0;
                              const hasSpeaker = (metadataDoc.dialogueIndex.bySpeaker[cf.characterName] || []).length > 0;
                              setSceneFilter(hasSceneA ? cf.slotA.sceneId : hasSceneB ? cf.slotB.sceneId : 'all');
                              setSpeakerFilter(hasSpeaker ? cf.characterName : 'all');
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#1b1114] hover:bg-[#361c22] border border-rose-700/60 text-[10px] text-rose-200 transition-colors"
                            title={cf.reason}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                              style={{ backgroundColor: cf.color }}
                            />
                            <span className="font-semibold">{cf.characterName}</span>
                            <span className="text-rose-300/80 font-mono">
                              Sc. {cf.slotA.sceneNumber} ({cf.slotA.location}) vs Sc. {cf.slotB.sceneNumber} ({cf.slotB.location}) · {cf.shootDayLabel}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Master-Detail Split View */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#343434]">
                {/* Left Results List */}
                <div className="lg:col-span-7 overflow-y-auto bg-[#181818] divide-y divide-[#282828]">
                  {queryResults.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 space-y-2">
                      <div className="text-sm font-medium text-gray-300">
                        No matching dialogue strings found
                      </div>
                      <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                        Try switching to <strong className="text-gray-300">Fuzzy STT</strong> mode for partial or misheard spoken phrases, or clear scene/character filters.
                      </p>
                    </div>
                  ) : (
                    queryResults.map((res) => {
                      const { entry } = res;
                      const isSelected = selectedResult?.entry.lineKey === entry.lineKey;
                      const matchedTakes = alignedByLineKey.get(entry.lineKey) || [];
                      const sceneConflicts = charCrossRef.conflictsBySceneId[entry.sceneId] || [];
                      const speakerConflicts =
                        charCrossRef.conflictsByCharacter[entry.speaker.toUpperCase()]?.filter(
                          (c) =>
                            c.slotA.sceneId === entry.sceneId || c.slotB.sceneId === entry.sceneId
                        ) || [];
                      const sceneSlot = charCrossRef.sceneSlotsBySceneId[entry.sceneId];
                      const sceneCast =
                        res.sceneContext.cast.length > 0
                          ? res.sceneContext.cast
                          : [entry.speaker];

                      return (
                        <div
                          key={entry.lineKey}
                          onClick={() => setSelectedLineKey(entry.lineKey)}
                          className={`px-4 py-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#26211c] ring-1 ring-inset ring-[#ff7700]/70'
                              : 'hover:bg-[#202020]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-amber-400 whitespace-nowrap">
                                {entry.lineKey}
                              </span>
                              <span
                                className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${
                                  speakerConflicts.length > 0
                                    ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-[#181818]'
                                    : ''
                                }`}
                                style={{ backgroundColor: getCharColor(entry.speaker) }}
                                title={
                                  speakerConflicts.length > 0
                                    ? speakerConflicts[0].reason
                                    : `${entry.speaker} presence indicator`
                                }
                              />
                              <span className="font-semibold text-gray-100 whitespace-nowrap">
                                {entry.speaker}
                              </span>
                              <span className="text-[11px] text-gray-400 truncate">
                                · Sc. {entry.sceneNumber} — {entry.sceneHeading}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                              {sceneConflicts.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-rose-950/80 border border-rose-600/70 text-rose-300 text-[10px] font-sans font-semibold"
                                  title={sceneConflicts.map((c) => c.reason).join(' | ')}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                                  <span>2-Loc Conflict</span>
                                </span>
                              )}
                              {matchedTakes.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-xs bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 text-[10px]">
                                  {matchedTakes.length} take{matchedTakes.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {dialogueQuery.trim() && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-xs text-[10px] border ${
                                    res.score >= 85
                                      ? 'bg-amber-950/60 border-amber-700/50 text-amber-300'
                                      : 'bg-[#262626] border-[#3d3d3d] text-gray-300'
                                  }`}
                                >
                                  {res.score}% {res.matchType.replace('_', ' ')}
                                </span>
                              )}
                              <span className="text-cyan-400">
                                {entry.timecodeIn}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-200 leading-relaxed select-text">
                            {entry.parenthetical && (
                              <span className="text-gray-400 italic mr-1.5">
                                {entry.parenthetical}
                              </span>
                            )}
                            "{renderHighlightedText(entry.exactText, dialogueQuery)}"
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-500 tabular-nums">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>elem: {entry.elementId}</span>
                              <span>scene: {entry.sceneId}</span>
                              <span>
                                frames: {res.startFrame}–{res.endFrame}
                              </span>
                              {sceneSlot && (
                                <span className="text-gray-400">
                                  {sceneSlot.shootDayLabel} · {sceneSlot.timeWindowLabel}
                                </span>
                              )}
                            </div>

                            {/* Scene Cast Presence Squares */}
                            <div
                              className="flex items-center gap-1"
                              title="Scene character presence indicators (rose ring = simultaneous 2-location schedule conflict)"
                            >
                              {sceneCast.map((castName) => {
                                const norm = castName.trim().toUpperCase();
                                const hasConflict = (
                                  charCrossRef.conflictsByCharacter[norm] || []
                                ).some(
                                  (c) =>
                                    c.slotA.sceneId === entry.sceneId ||
                                    c.slotB.sceneId === entry.sceneId
                                );
                                return (
                                  <span
                                    key={norm}
                                    className={`w-2.5 h-2.5 rounded-[2px] ${
                                      hasConflict
                                        ? 'ring-2 ring-rose-500 animate-pulse'
                                        : 'opacity-85'
                                    }`}
                                    style={{ backgroundColor: getCharColor(norm) }}
                                    title={
                                      hasConflict
                                        ? `${norm} — SCHEDULE CONFLICT: simultaneous two-location booking`
                                        : `${norm} present in Sc. ${entry.sceneNumber}`
                                    }
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Scene Context & Take-to-Line IDs Inspector */}
                <div className="lg:col-span-5 overflow-y-auto bg-[#1b1b1b] p-4 space-y-4">
                  {!selectedResult ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-center p-6">
                      Select any dialogue entry on the left to inspect its precise scene context, beat neighbors, and take-to-line IDs.
                    </div>
                  ) : (
                    <>
                      {/* Selected Entry Header */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#323232]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#ff8000]">
                              {selectedResult.entry.lineKey}
                            </span>
                            <span className="text-sm font-semibold text-gray-100 truncate">
                              {selectedResult.entry.speaker}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                            Sc. {selectedResult.entry.sceneNumber} · {selectedResult.entry.sceneHeading}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onSelectScene && (
                            <button
                              onClick={() => {
                                onSelectScene(selectedResult.entry.sceneId);
                                onClose();
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#282828] hover:bg-[#363636] border border-[#424242] text-[11px] text-gray-200 whitespace-nowrap shrink-0"
                            >
                              <span>Open Scene</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleSendToTakeAligner(selectedResult)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold text-[11px] whitespace-nowrap shrink-0"
                            title="Queue this script line in the Speech-to-Text Take Aligner"
                          >
                            <Send className="w-3 h-3" />
                            <span>Match in Aligner</span>
                          </button>
                        </div>
                      </div>

                      {/* Associated IDs for Take-to-Line Matching */}
                      <div className="bg-[#151515] border border-[#323232] rounded p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-200">
                            <Hash className="w-3.5 h-3.5 text-amber-400" />
                            <span>Associated IDs for Take-to-Line Matching</span>
                          </div>
                          <button
                            onClick={() =>
                              handleCopy(
                                'payload',
                                JSON.stringify(
                                  {
                                    lineKey: selectedResult.entry.lineKey,
                                    elementId: selectedResult.entry.elementId,
                                    sceneId: selectedResult.entry.sceneId,
                                    sceneNumber: selectedResult.entry.sceneNumber,
                                    speaker: selectedResult.entry.speaker,
                                    timecodeIn: selectedResult.entry.timecodeIn,
                                    timecodeOut: selectedResult.entry.timecodeOut,
                                    startFrame: selectedResult.startFrame,
                                    endFrame: selectedResult.endFrame,
                                    exactText: selectedResult.entry.exactText,
                                    normalizedText: selectedResult.entry.normalizedText,
                                  },
                                  null,
                                  2
                                )
                              )
                            }
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#242424] hover:bg-[#303030] border border-[#3a3a3a] text-[10px] text-cyan-300 whitespace-nowrap shrink-0"
                          >
                            {copiedState === 'payload' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied JSON</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Match Payload</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {[
                            { label: 'Line Key', value: selectedResult.entry.lineKey, key: 'lineKey' },
                            { label: 'Element ID', value: selectedResult.entry.elementId, key: 'elementId' },
                            { label: 'Scene ID', value: selectedResult.entry.sceneId, key: 'sceneId' },
                            {
                              label: `Frames (${frameRate}fps)`,
                              value: `${selectedResult.startFrame}–${selectedResult.endFrame}`,
                              key: 'frames',
                            },
                          ].map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-2 bg-[#1c1c1c] border border-[#2d2d2d] rounded px-2.5 py-1.5"
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] text-gray-500">{item.label}</div>
                                <div className="font-mono text-gray-200 truncate tabular-nums select-text">
                                  {item.value}
                                </div>
                              </div>
                              <button
                                onClick={() => handleCopy(item.key, item.value)}
                                className="p-1 text-gray-400 hover:text-amber-300 shrink-0"
                                title={`Copy ${item.label}`}
                              >
                                {copiedState === item.key ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums pt-1 border-t border-[#262626] text-gray-400">
                          <span>
                            TC Span: <span className="text-cyan-300">{selectedResult.entry.timecodeIn} → {selectedResult.entry.timecodeOut}</span>
                          </span>
                          <span>~{selectedResult.entry.estimatedDurationSec}s</span>
                        </div>
                      </div>

                      {/* Precise Scene Context & Character Presence Schedule Cross-Reference */}
                      <div className="bg-[#151515] border border-[#323232] rounded p-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-200">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Scene Context & Schedule Cross-Reference</span>
                          </div>
                          {charCrossRef.sceneSlotsBySceneId[selectedResult.entry.sceneId] && (
                            <span className="font-mono text-[10px] text-amber-300 bg-[#221d16] border border-amber-800/50 px-1.5 py-0.5 rounded-xs">
                              {charCrossRef.sceneSlotsBySceneId[selectedResult.entry.sceneId].shootDayLabel} ·{' '}
                              {charCrossRef.sceneSlotsBySceneId[selectedResult.entry.sceneId].timeWindowLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] space-y-2 text-gray-300">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-100 truncate">
                              Sc. {selectedResult.sceneContext.sceneNumber}: {selectedResult.sceneContext.slugline}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400 tabular-nums shrink-0">
                              {selectedResult.sceneContext.timecodeIn}–{selectedResult.sceneContext.timecodeOut}
                            </span>
                          </div>

                          {charCrossRef.sceneSlotsBySceneId[selectedResult.entry.sceneId] ? (
                            <div className="text-[11px] text-gray-400">
                              Scheduled Location:{' '}
                              <span className="text-cyan-300 font-medium">
                                {charCrossRef.sceneSlotsBySceneId[selectedResult.entry.sceneId].location}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500">
                              Not yet placed on a Production Schedule shooting day.
                            </div>
                          )}

                          {/* Color-Coded Character Presence Indicators */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span>Character Presence Indicators (Schedule Checked):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedResult.sceneContext.cast.length > 0
                                ? selectedResult.sceneContext.cast
                                : [selectedResult.entry.speaker]
                              ).map((charName) => {
                                const norm = charName.trim().toUpperCase();
                                const charConflicts = (
                                  charCrossRef.conflictsByCharacter[norm] || []
                                ).filter(
                                  (c) =>
                                    c.slotA.sceneId === selectedResult.entry.sceneId ||
                                    c.slotB.sceneId === selectedResult.entry.sceneId
                                );
                                const hasConflict = charConflicts.length > 0;
                                return (
                                  <span
                                    key={norm}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs border text-[10px] font-medium ${
                                      hasConflict
                                        ? 'bg-rose-950/70 border-rose-600/80 text-rose-200'
                                        : 'bg-[#1d1d1d] border-[#343434] text-gray-200'
                                    }`}
                                    title={
                                      hasConflict
                                        ? charConflicts[0].reason
                                        : `${norm} has no overlapping location bookings on this shoot day`
                                    }
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                                      style={{ backgroundColor: getCharColor(norm) }}
                                    />
                                    <span>{norm}</span>
                                    {hasConflict && (
                                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Simultaneous Two-Location Conflict Details for Selected Scene */}
                          {(charCrossRef.conflictsBySceneId[selectedResult.entry.sceneId] || []).length > 0 && (
                            <div className="p-2 rounded bg-[#2a1519] border border-rose-700/70 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>Simultaneous Two-Location Schedule Conflict</span>
                              </div>
                              {(charCrossRef.conflictsBySceneId[selectedResult.entry.sceneId] || []).map((cf) => {
                                const otherSlot =
                                  cf.slotA.sceneId === selectedResult.entry.sceneId ? cf.slotB : cf.slotA;
                                return (
                                  <div
                                    key={cf.id}
                                    className="text-[11px] text-rose-200/90 leading-snug flex items-start justify-between gap-2"
                                  >
                                    <span>{cf.reason}</span>
                                    <button
                                      onClick={() => setSceneFilter(otherSlot.sceneId)}
                                      className="px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 border border-rose-600/60 text-[10px] text-white whitespace-nowrap shrink-0"
                                    >
                                      View Sc. {otherSlot.sceneNumber}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {selectedResult.sceneContext.props.length > 0 && (
                            <div className="text-[11px] text-gray-400">
                              Props Tagged: <span className="text-amber-300">{selectedResult.sceneContext.props.join(', ')}</span>
                            </div>
                          )}
                          {(selectedResult.nearestCameraCue || selectedResult.sceneContext.cameraDirections.length > 0) && (
                            <div className="flex items-start gap-1.5 text-[11px] text-gray-400 pt-0.5">
                              <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>
                                {selectedResult.nearestCameraCue
                                  ? `Nearest Camera Cue: ${selectedResult.nearestCameraCue}`
                                  : `Scene Shots: ${selectedResult.sceneContext.cameraDirections.join(' | ')}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Surrounding Script Beat Context */}
                      <div className="bg-[#151515] border border-[#323232] rounded p-3 space-y-2">
                        <div className="text-[11px] font-semibold text-gray-200">
                          Surrounding Script Beat (±2 Elements)
                        </div>
                        <div className="space-y-1.5">
                          {selectedResult.surroundingBlocks.map((blk) => (
                            <div
                              key={blk.blockId}
                              className={`p-2 rounded border text-[11px] ${
                                blk.isTarget
                                  ? 'bg-[#2a2117] border-[#ff7700]/70 text-gray-100'
                                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-0.5">
                                <span className={blk.isTarget ? 'text-amber-400 font-semibold' : 'text-gray-500'}>
                                  {blk.type}
                                  {blk.speaker ? ` · ${blk.speaker}` : ''}
                                  {blk.isTarget ? ' (MATCHED LINE)' : ''}
                                </span>
                                <span className="text-gray-500 tabular-nums">
                                  {blk.timecodeIn} · {blk.blockId}
                                </span>
                              </div>
                              <div className={blk.isTarget ? 'text-gray-100 font-medium' : 'text-gray-300'}>
                                {blk.isTarget
                                  ? renderHighlightedText(blk.text, dialogueQuery)
                                  : blk.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Currently Aligned Takes for this Line Key */}
                      <div className="bg-[#151515] border border-[#323232] rounded p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-200">
                            Aligned Takes for {selectedResult.entry.lineKey}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                            {(alignedByLineKey.get(selectedResult.entry.lineKey) || []).length} matched
                          </span>
                        </div>
                        {(alignedByLineKey.get(selectedResult.entry.lineKey) || []).length === 0 ? (
                          <div className="text-[11px] text-gray-500">
                            No transcript takes currently aligned to this line key. Click <strong className="text-gray-300">Match in Aligner</strong> above to test or align audio takes.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {(alignedByLineKey.get(selectedResult.entry.lineKey) || []).map((tk) => (
                              <div
                                key={tk.segmentId}
                                className="p-2 rounded bg-[#1b1f1c] border border-emerald-800/50 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between font-mono">
                                  <span className="text-amber-300 font-semibold">{tk.takeLabel}</span>
                                  <span className="text-emerald-400 tabular-nums">
                                    {tk.confidence}% match · {tk.transcriptTimecodeIn}
                                  </span>
                                </div>
                                <p className="text-gray-300">"{tk.transcriptText}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stt_align' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#343434]">
              {/* Left Input Pane */}
              <div className="lg:col-span-5 p-4 flex flex-col gap-3 min-h-0 bg-[#1b1b1b]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-100">
                      Speech-to-Text Transcript Input
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Accepts Whisper JSON, SRT/VTT, Premiere timecoded TXT, or take-prefixed lines.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setTranscriptInput(getSampleTranscriptForProject(project))}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#292929] hover:bg-[#353535] border border-[#444] rounded text-[11px] text-amber-300 whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Load Sample Takes</span>
                  </button>
                  <label className="flex items-center gap-1.5 px-2.5 py-1 bg-[#292929] hover:bg-[#353535] border border-[#444] rounded text-[11px] text-gray-200 cursor-pointer whitespace-nowrap shrink-0">
                    <Upload className="w-3 h-3" />
                    <span>Upload .txt / .srt / .json</span>
                    <input
                      type="file"
                      accept=".txt,.srt,.vtt,.json"
                      onChange={handleUploadTranscript}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  placeholder="[Take 1A | 00:00:12:04] SPEAKER: Paste transcribed audio lines here..."
                  className="flex-1 min-h-[200px] bg-[#141414] border border-[#3a3a3a] rounded p-3 font-mono text-[11px] leading-relaxed text-gray-200 focus:outline-none focus:border-[#ff8000] resize-none select-text"
                />

                <div className="flex items-center justify-between text-[11px] text-gray-400 tabular-nums pt-1 border-t border-[#2e2e2e]">
                  <span>{alignmentStats.totalSegments} transcript segments parsed</span>
                  <span className="text-emerald-400 font-semibold">
                    {alignmentStats.matchedCount} matched ({alignmentStats.avgConfidence}% avg confidence)
                  </span>
                </div>
              </div>

              {/* Right Alignment Output Pane */}
              <div className="lg:col-span-7 p-4 flex flex-col gap-3 min-h-0 bg-[#202020]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-100">
                      Automated Take-to-Line Alignment Matrix
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Replaces manual paper edits by locking audio takes to exact script line keys.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      requestNLEExport(
                        `Aligned ${exportConfig.nleTarget} XML`,
                        'aligned_premiere_xml',
                        exportPremiereProXML(project, frameRate, alignedMatches, exportConfig),
                        `${baseSlug}${fileSuffix}_aligned_takes.xml`,
                        'application/xml'
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Aligned NLE XML</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {alignedMatches.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 border border-[#343434] rounded bg-[#181818]">
                      Paste or upload a speech-to-text transcript on the left to compute take-to-line alignment.
                    </div>
                  ) : (
                    alignedMatches.map((m) => (
                      <div
                        key={m.segmentId}
                        className="p-3 rounded bg-[#191919] border border-[#343434] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-semibold text-amber-400 whitespace-nowrap">
                              {m.takeLabel}
                            </span>
                            <span className="text-[11px] font-mono text-gray-400 tabular-nums whitespace-nowrap">
                              {m.transcriptTimecodeIn}
                            </span>
                            {m.matchedEntry && (
                              <span className="text-[11px] font-mono text-cyan-400 whitespace-nowrap">
                                → {m.matchedEntry.lineKey} ({m.matchedEntry.speaker})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[11px]">
                            {m.matchedEntry ? (
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  m.confidence >= 75
                                    ? 'text-emerald-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{m.confidence}% match</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Unmatched</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-[#141414] border border-[#2c2c2c] rounded p-2">
                            <div className="text-[10px] text-gray-500 mb-0.5">
                              Transcribed Audio
                            </div>
                            <p className="text-gray-300 leading-relaxed">"{m.transcriptText}"</p>
                          </div>
                          <div className="bg-[#141414] border border-[#2c2c2c] rounded p-2">
                            <div className="text-[10px] text-gray-500 mb-0.5">
                              Matched Script Line {m.matchedEntry ? `(Sc. ${m.matchedEntry.sceneNumber})` : ''}
                            </div>
                            <p className="text-gray-200 leading-relaxed">
                              {m.matchedEntry
                                ? `"${m.matchedEntry.exactText}"`
                                : 'No matching line above 25% threshold.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'generated_log' && (
            <div className="flex-1 flex flex-col min-h-0 p-5 gap-4 overflow-hidden">
              {/* Version Control Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-[#181818] border border-[#343434] rounded p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-400">Logged Sidecar Revisions</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-gray-100 mt-0.5">
                      {generatedMetadataLog.length}
                    </div>
                  </div>
                  <History className="w-5 h-5 text-[#ff8000]" />
                </div>

                <div className="bg-[#181818] border border-[#343434] rounded p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-400">Current Script Fingerprint</div>
                    <div className="text-xs font-mono text-cyan-300 truncate mt-1 select-text">
                      {currentScriptFingerprint}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy('script-fp', currentScriptFingerprint)}
                    className="p-1.5 rounded bg-[#242424] hover:bg-[#303030] border border-[#3a3a3a] text-gray-300 shrink-0"
                    title="Copy current script fingerprint"
                  >
                    {copiedState === 'script-fp' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="bg-[#181818] border border-[#343434] rounded p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-400">Latest Export Sync Status</div>
                    {generatedMetadataLog.length === 0 ? (
                      <div className="text-xs text-gray-500 mt-1">No exports recorded yet</div>
                    ) : generatedMetadataLog[0].scriptSnapshotHash === currentScriptFingerprint ? (
                      <div className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Up-to-date with current script</span>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-amber-300 mt-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Script changed since last sidecar</span>
                      </div>
                    )}
                  </div>
                  <GitCommitHorizontal className="w-5 h-5 text-cyan-400 shrink-0" />
                </div>
              </div>

              {/* Filter & Log Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
                    <input
                      type="text"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      placeholder="Filter by filename, SHA-256 hash, or draft..."
                      className="w-full bg-[#141414] text-gray-100 pl-8 pr-7 py-1.5 rounded border border-[#3a3a3a] text-xs focus:outline-none focus:border-[#ff8000]"
                    />
                    {logSearchQuery && (
                      <button
                        onClick={() => setLogSearchQuery('')}
                        className="absolute right-2 top-1.5 text-gray-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={logFormatFilter}
                    onChange={(e) =>
                      setLogFormatFilter(e.target.value as 'all' | NLESidecarFormat)
                    }
                    className="bg-[#161616] border border-[#3a3a3a] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000]"
                  >
                    <option value="all">All Formats ({generatedMetadataLog.length})</option>
                    <option value="premiere_xml">Premiere Pro XML</option>
                    <option value="nle_json">NLE Sidecar JSON</option>
                    <option value="aligned_premiere_xml">Aligned Premiere XML</option>
                    <option value="dialogue_query_json">Dialogue Query JSON</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {generatedMetadataLog.length > 0 && (
                    <>
                      <button
                        onClick={() =>
                          triggerDownload(
                            JSON.stringify(generatedMetadataLog, null, 2),
                            `${baseSlug}_nle_metadata_audit_log.json`,
                            'application/json'
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] rounded text-cyan-300 font-medium whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Audit Log</span>
                      </button>

                      {!confirmClearLog ? (
                        <button
                          onClick={() => setConfirmClearLog(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#241b1b] hover:bg-[#322020] border border-rose-900/50 rounded text-rose-300 text-xs whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Log</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-[#2c1919] border border-rose-700/70 rounded px-2 py-1">
                          <span className="text-[11px] text-rose-200">Clear history?</span>
                          <button
                            onClick={() => {
                              setLocalFallbackLog([]);
                              onClearGeneratedMetadataLog?.();
                              setConfirmClearLog(false);
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmClearLog(false)}
                            className="px-2 py-0.5 bg-[#2b2b2b] hover:bg-[#3a3a3a] text-gray-200 rounded text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Log Entries Table */}
              <div className="flex-1 min-h-0 overflow-auto border border-[#343434] rounded bg-[#181818]">
                {filteredGeneratedLog.length === 0 ? (
                  <div className="p-10 text-center space-y-2 text-gray-400">
                    <History className="w-7 h-7 text-gray-600 mx-auto" />
                    <div className="text-sm font-medium text-gray-300">
                      {generatedMetadataLog.length === 0
                        ? 'No sidecar metadata files have been generated yet'
                        : 'No log entries match your current filter'}
                    </div>
                    <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                      Export a Premiere Pro XML sequence, JSON sidecar, Aligned Premiere XML, or Dialogue Query JSON to record its SHA-256 hash and timestamp here for version control.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#141414] border-b border-[#343434] text-[11px] text-gray-400 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Rev</th>
                        <th className="py-2.5 px-3">Sidecar Filename & Format</th>
                        <th className="py-2.5 px-3">File SHA-256 Hash</th>
                        <th className="py-2.5 px-3">Generated Timestamp</th>
                        <th className="py-2.5 px-3">Snapshot Details</th>
                        <th className="py-2.5 px-3">Script Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#282828] text-xs">
                      {filteredGeneratedLog.map((entry, idx) => {
                        const revNum = generatedMetadataLog.length - generatedMetadataLog.indexOf(entry);
                        const matchesCurrent =
                          entry.scriptSnapshotHash === currentScriptFingerprint;
                        const sizeLabel =
                          entry.byteSize >= 1024
                            ? `${(entry.byteSize / 1024).toFixed(1)} KB`
                            : `${entry.byteSize} B`;
                        const formattedDate = new Date(entry.generatedAt).toLocaleString();

                        return (
                          <tr
                            key={entry.id}
                            className={`transition-colors ${
                              idx === 0 ? 'bg-[#1f1c18]' : 'hover:bg-[#202020]'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap tabular-nums">
                              v{revNum}
                            </td>
                            <td className="py-2.5 px-3 min-w-[200px]">
                              <div className="font-mono text-gray-100 font-medium truncate max-w-xs">
                                {entry.filename}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded-xs border font-mono ${
                                    entry.format === 'nle_json' ||
                                    entry.format === 'dialogue_query_json'
                                      ? 'bg-cyan-950/50 border-cyan-800/50 text-cyan-300'
                                      : 'bg-amber-950/50 border-amber-800/50 text-amber-300'
                                  }`}
                                >
                                  {entry.formatLabel}
                                </span>
                                {entry.draftName && (
                                  <span className="text-gray-400">{entry.draftName}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-cyan-300 bg-[#141414] border border-[#2f2f2f] px-2 py-0.5 rounded text-[11px] select-text"
                                  title={`Full hash: ${entry.fileHash}`}
                                >
                                  {entry.shortHash}…
                                </span>
                                <button
                                  onClick={() => handleCopy(entry.id, entry.fileHash)}
                                  className="p-1 rounded hover:bg-[#2d2d2d] text-gray-400 hover:text-amber-300"
                                  title="Copy full file hash"
                                >
                                  {copiedState === entry.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-gray-200 font-mono text-[11px] tabular-nums">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span>{formattedDate}</span>
                              </div>
                              <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                                {entry.frameRate} fps · {sizeLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-gray-300 tabular-nums whitespace-nowrap">
                              <div>
                                {entry.sceneCount} sc · {entry.dialogueLineCount} lines
                                {entry.alignedTakeCount > 0
                                  ? ` · ${entry.alignedTakeCount} takes`
                                  : ''}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                Pre-flight:{' '}
                                <span
                                  className={
                                    entry.preFlightWarningsCount > 0
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }
                                >
                                  {entry.preFlightWarningsCount} warn
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {matchesCurrent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-[10px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Matches Script</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-amber-950/60 border border-amber-700/50 text-amber-300 text-[10px] font-semibold">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Script Modified</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
