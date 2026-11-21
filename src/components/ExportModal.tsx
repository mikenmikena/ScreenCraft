import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Printer,
  FileCode,
  FileText,
  FileSpreadsheet,
  Download,
  Terminal,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileCheck2,
  Code2,
  BookOpen,
} from 'lucide-react';
import { NLEGeneratedSidecarEntry, StoryProject } from '../types/story';
import {
  serializeToFountain,
  exportToFinalDraftFdx,
  exportScheduleCsv,
} from '../utils/screenplayParser';
import {
  buildNLEMetadataDocument,
  createGeneratedSidecarEntry,
  exportPremiereProXML,
  runNLEPreFlightCheck,
} from '../utils/nleMetadataPipeline';
import { generateRustDesktopZip } from '../utils/rustDesktopGenerator';
import {
  buildExportPreview,
  ExportFormatType,
  PaginatedScriptBlock,
  PaginatedScriptPage,
} from '../utils/exportPreviewFormatter';

interface ExportModalProps {
  project: StoryProject;
  initialFormat?: ExportFormatType;
  onClose: () => void;
  onRecordGeneratedSidecar?: (entry: NLEGeneratedSidecarEntry) => void;
}

const FORMAT_ITEMS: {
  id: ExportFormatType;
  label: string;
  description: string;
  extLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'pdf',
    label: 'PDF Screenplay',
    description: '8.5×11 Courier 12pt pages with margins & numbering',
    extLabel: '.pdf',
    icon: <Printer className="w-4 h-4 text-rose-400 shrink-0" />,
  },
  {
    id: 'fdx',
    label: 'Final Draft (.fdx)',
    description: 'Final Draft XML v4 with paragraph & scene tags',
    extLabel: '.fdx',
    icon: <FileCode className="w-4 h-4 text-blue-400 shrink-0" />,
  },
  {
    id: 'fountain',
    label: 'Fountain',
    description: 'Plain-text industry screenwriting markup',
    extLabel: '.fountain',
    icon: <FileText className="w-4 h-4 text-emerald-400 shrink-0" />,
  },
  {
    id: 'csv',
    label: 'Schedule CSV',
    description: 'Stripboard shooting schedule with page eighths',
    extLabel: '.csv',
    icon: <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />,
  },
  {
    id: 'premiere_xml',
    label: 'Premiere Pro XML',
    description: 'XMEML v4 timeline with scene & dialogue markers',
    extLabel: '.xml',
    icon: <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />,
  },
  {
    id: 'nle_json',
    label: 'NLE Sidecar JSON',
    description: 'Dialogue index & speech-to-text alignment schema',
    extLabel: '.nle.json',
    icon: <FileText className="w-4 h-4 text-amber-300 shrink-0" />,
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  initialFormat = 'pdf',
  onClose,
  onRecordGeneratedSidecar,
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormatType>(initialFormat);
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeSceneNumbers, setIncludeSceneNumbers] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);

  const [previewMode, setPreviewMode] = useState<'formatted' | 'source'>('formatted');
  const [pageScope, setPageScope] = useState<'all' | 'single'>('all');
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(1);
  const [previewZoom, setPreviewZoom] = useState<number>(90);
  const [showFdxElementLabels, setShowFdxElementLabels] = useState<boolean>(true);
  const [copiedSource, setCopiedSource] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  useEffect(() => {
    setExportFormat(initialFormat);
  }, [initialFormat]);

  // Reset to sensible default view mode when switching between script & code/data formats
  useEffect(() => {
    if (exportFormat === 'pdf' || exportFormat === 'fdx' || exportFormat === 'fountain' || exportFormat === 'csv') {
      setPreviewMode('formatted');
    } else {
      setPreviewMode('source');
    }
    setCurrentPreviewPage(1);
  }, [exportFormat]);

  const preview = useMemo(
    () =>
      buildExportPreview(project, exportFormat, {
        includeTitlePage,
        includeSceneNumbers,
        includePageNumbers,
      }),
    [project, exportFormat, includeTitlePage, includeSceneNumbers, includePageNumbers]
  );

  const supportsScriptPagePreview =
    exportFormat === 'pdf' || exportFormat === 'fdx' || exportFormat === 'fountain';

  const hasCoverPage =
    (exportFormat === 'pdf' || exportFormat === 'fdx') && includeTitlePage;

  const totalPreviewSheets = hasCoverPage
    ? preview.pages.length + 1
    : preview.pages.length;

  useEffect(() => {
    if (currentPreviewPage > totalPreviewSheets) {
      setCurrentPreviewPage(Math.max(1, totalPreviewSheets));
    }
  }, [currentPreviewPage, totalPreviewSheets]);

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

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const safeTitle = project.title.replace(/[^a-z0-9]/gi, '_') || 'screenplay';
      if (exportFormat === 'fountain') {
        const text = serializeToFountain(project);
        triggerDownload(text, `${safeTitle}.fountain`, 'text/plain');
      } else if (exportFormat === 'fdx') {
        const fdx = exportToFinalDraftFdx(project, {
          includeSceneNumbers,
          includeTitlePage,
        });
        triggerDownload(fdx, `${safeTitle}.fdx`, 'application/xml');
      } else if (exportFormat === 'csv') {
        const csv = exportScheduleCsv(project);
        triggerDownload(csv, `${safeTitle}_schedule.csv`, 'text/csv');
      } else if (exportFormat === 'premiere_xml') {
        const xml = exportPremiereProXML(project, 24);
        const filename = `${safeTitle}_premiere.xml`;
        triggerDownload(xml, filename, 'application/xml');
        if (onRecordGeneratedSidecar) {
          const doc = buildNLEMetadataDocument(project, 24);
          const pf = runNLEPreFlightCheck(project);
          const entry = await createGeneratedSidecarEntry({
            project,
            content: xml,
            filename,
            format: 'premiere_xml',
            formatLabel: 'Premiere Pro XML',
            frameRate: 24,
            sceneCount: doc.scenes.length,
            dialogueLineCount: doc.dialogueIndex.totalLines,
            alignedTakeCount: 0,
            preFlightWarningsCount: pf.totalWarnings,
          });
          onRecordGeneratedSidecar(entry);
        }
      } else if (exportFormat === 'nle_json') {
        const doc = buildNLEMetadataDocument(project, 24);
        const content = JSON.stringify(doc, null, 2);
        const filename = `${safeTitle}.nle.json`;
        triggerDownload(content, filename, 'application/json');
        if (onRecordGeneratedSidecar) {
          const pf = runNLEPreFlightCheck(project);
          const entry = await createGeneratedSidecarEntry({
            project,
            content,
            filename,
            format: 'nle_json',
            formatLabel: 'NLE Sidecar JSON',
            frameRate: 24,
            sceneCount: doc.scenes.length,
            dialogueLineCount: doc.dialogueIndex.totalLines,
            alignedTakeCount: 0,
            preFlightWarningsCount: pf.totalWarnings,
          });
          onRecordGeneratedSidecar(entry);
        }
      } else if (exportFormat === 'json') {
        const json = JSON.stringify(project, null, 2);
        triggerDownload(json, `${safeTitle}.story.json`, 'application/json');
      } else if (exportFormat === 'rust_zip') {
        const blob = await generateRustDesktopZip(project);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screencraft-desktop-rust-${project.id}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'pdf') {
        window.print();
      }
      setExportedStatus(`Exported ${exportFormat.toUpperCase()} (${preview.summary.totalOutputPages} page${preview.summary.totalOutputPages === 1 ? '' : 's'})`);
      setTimeout(() => setExportedStatus(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(preview.rawSource);
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } catch {
      // clipboard unavailable in restricted environments
    }
  };

  const renderBlockContent = (block: PaginatedScriptBlock) => {
    const textContent = block.lines.join('\n');

    const fdxTagOverlay =
      exportFormat === 'fdx' && showFdxElementLabels ? (
        <span className="font-sans text-[9px] text-blue-700/75 select-none tracking-tight mr-2 shrink-0">
          [{block.fdxType}]
        </span>
      ) : null;

    if (block.type === 'SCENE_HEADING') {
      return (
        <div
          className="flex items-baseline justify-between font-bold uppercase text-black"
          style={{
            marginTop: block.spaceBefore > 0 ? `${block.spaceBefore * 1.1}em` : '0',
            marginBottom: `${block.spaceAfter * 1.0}em`,
          }}
        >
          <div className="flex items-baseline min-w-0 flex-1">
            {includeSceneNumbers && block.sceneNumber !== undefined && (
              <span className="w-10 -ml-10 pr-2 text-left font-bold tabular-nums shrink-0">
                {block.sceneNumber}
              </span>
            )}
            <span className="whitespace-pre-wrap break-words flex-1">{textContent}</span>
          </div>
          <div className="flex items-baseline shrink-0 ml-3">
            {fdxTagOverlay}
            {includeSceneNumbers && block.sceneNumber !== undefined && (
              <span className="font-bold tabular-nums">{block.sceneNumber}</span>
            )}
          </div>
        </div>
      );
    }

    if (block.type === 'CHARACTER') {
      return (
        <div
          className="flex items-baseline justify-between"
          style={{
            marginTop: block.spaceBefore > 0 ? `${block.spaceBefore * 1.05}em` : '0',
            marginBottom: '0.1em',
          }}
        >
          <div className="ml-[37%] font-bold uppercase text-black whitespace-pre-wrap">
            {textContent}
          </div>
          {fdxTagOverlay}
        </div>
      );
    }

    if (block.type === 'PARENTHETICAL') {
      return (
        <div className="flex items-baseline justify-between">
          <div className="ml-[28%] max-w-[38%] text-black whitespace-pre-wrap">
            {textContent}
          </div>
          {fdxTagOverlay}
        </div>
      );
    }

    if (block.type === 'DIALOGUE' || block.type === 'VOICE_OVER') {
      return (
        <div
          className="flex items-baseline justify-between"
          style={{
            marginBottom: block.spaceAfter > 0 ? `${block.spaceAfter * 1.0}em` : '0',
          }}
        >
          <div className="ml-[18%] max-w-[58%] text-black whitespace-pre-wrap">
            {textContent}
          </div>
          {fdxTagOverlay}
        </div>
      );
    }

    if (block.type === 'TRANSITION') {
      return (
        <div
          className="flex items-baseline justify-end gap-2 uppercase font-bold text-black"
          style={{
            marginTop: block.spaceBefore > 0 ? `${block.spaceBefore * 1.0}em` : '0',
            marginBottom: block.spaceAfter > 0 ? `${block.spaceAfter * 1.0}em` : '0',
          }}
        >
          {fdxTagOverlay}
          <span className="whitespace-pre-wrap text-right">{textContent}</span>
        </div>
      );
    }

    if (block.type === 'SHOT') {
      return (
        <div
          className="flex items-baseline justify-between font-bold uppercase text-black"
          style={{
            marginTop: block.spaceBefore > 0 ? `${block.spaceBefore * 1.0}em` : '0',
            marginBottom: block.spaceAfter > 0 ? `${block.spaceAfter * 1.0}em` : '0',
          }}
        >
          <span className="whitespace-pre-wrap">{textContent}</span>
          {fdxTagOverlay}
        </div>
      );
    }

    // ACTION / GENERAL
    return (
      <div
        className="flex items-baseline justify-between text-black"
        style={{
          marginTop: block.spaceBefore > 0 ? `${block.spaceBefore * 1.0}em` : '0',
          marginBottom: block.spaceAfter > 0 ? `${block.spaceAfter * 1.0}em` : '0',
        }}
      >
        <span className="whitespace-pre-wrap flex-1">{textContent}</span>
        {fdxTagOverlay}
      </div>
    );
  };

  const renderTitleSheet = (forPrint = false) => (
    <div
      className={`bg-[#fdfcf9] text-black font-courier border border-[#d6d1c4] shadow-lg mx-auto flex flex-col justify-between ${
        forPrint ? 'print-screenplay-page w-[8.5in] min-h-[10.5in] p-[1in]' : 'w-[680px] min-h-[880px] px-[76px] py-[64px]'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] font-sans text-gray-500 border-b border-gray-200 pb-2">
        <span>{exportFormat === 'fdx' ? 'Final Draft (.fdx) · Title Page' : 'PDF Screenplay · Title Page'}</span>
        <span className="tabular-nums">Cover Sheet</span>
      </div>

      <div className="my-auto text-center space-y-6">
        <h1 className="text-lg font-bold uppercase tracking-wider underline underline-offset-4">
          {project.title}
        </h1>
        <div className="space-y-2 text-[13px]">
          <p>Written by</p>
          <p className="font-bold">{project.author}</p>
        </div>
        {project.activeDraftName && (
          <p className="text-xs text-gray-600 pt-4">
            {project.activeDraftName} · {project.lastModified}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between text-[11px] text-gray-600 pt-6 border-t border-gray-200">
        <div>
          <p>{project.scenes.length} Scenes · {preview.summary.eighthsLabel} Pages</p>
        </div>
        <div className="text-right">
          <p>{project.author}</p>
        </div>
      </div>
    </div>
  );

  const renderScriptSheet = (page: PaginatedScriptPage, forPrint = false) => (
    <div
      key={`sheet-${page.pageNumber}-${forPrint ? 'print' : 'view'}`}
      className={`bg-[#fdfcf9] text-black font-courier border border-[#d6d1c4] shadow-lg mx-auto flex flex-col justify-between ${
        forPrint
          ? 'print-screenplay-page w-[8.5in] min-h-[10.5in] pt-[0.75in] pb-[0.75in] pl-[1.35in] pr-[0.95in]'
          : 'w-[680px] min-h-[880px] pl-[104px] pr-[68px] pt-[56px] pb-[52px]'
      }`}
    >
      <div>
        {/* Page Number Header (Hollywood standard omits page 1 header) */}
        <div className="flex items-center justify-between mb-6 text-[12px] min-h-[18px]">
          <span className="font-sans text-[10px] text-gray-400 select-none">
            {!forPrint &&
              `Page ${page.pageNumber} of ${preview.summary.scriptPageCount}${
                page.sceneNumbersOnPage.length > 0
                  ? ` · Sc. ${page.sceneNumbersOnPage.join(', ')}`
                  : ''
              }`}
          </span>
          {includePageNumbers && page.pageNumber > 1 && (
            <span className="font-bold tabular-nums">{page.pageNumber}.</span>
          )}
        </div>

        {/* Script Elements */}
        <div className="text-[12.5px] leading-[1.32]">
          {page.blocks.length === 0 ? (
            <p className="text-gray-400 italic font-sans text-xs">
              This project currently has no screenplay elements.
            </p>
          ) : (
            page.blocks.map((block) => (
              <React.Fragment key={`${page.pageNumber}-${block.id}`}>
                {renderBlockContent(block)}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {!forPrint && (
        <div className="pt-4 mt-6 border-t border-gray-200/80 flex items-center justify-between font-sans text-[10px] text-gray-500 tabular-nums select-none">
          <span>
            {page.linesUsed} / 54 lines used
          </span>
          <span>
            {exportFormat === 'fdx' ? 'Final Draft Paragraph Layout' : 'US Letter · Courier 12pt'}
          </span>
        </div>
      )}
    </div>
  );

  const visibleSheets = useMemo(() => {
    const items: { kind: 'cover' | 'page'; sheetIndex: number; page?: PaginatedScriptPage }[] = [];
    if (hasCoverPage) {
      items.push({ kind: 'cover', sheetIndex: 1 });
    }
    preview.pages.forEach((p, idx) => {
      items.push({
        kind: 'page',
        sheetIndex: hasCoverPage ? idx + 2 : idx + 1,
        page: p,
      });
    });

    if (pageScope === 'single') {
      return items.filter((item) => item.sheetIndex === currentPreviewPage);
    }
    return items;
  }, [hasCoverPage, preview.pages, pageScope, currentPreviewPage]);

  return (
    <>
      {/* Screen Modal */}
      <div className="no-print fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
        <div className="bg-[#202020] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col text-xs text-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 bg-[#171717] border-b border-[#343434] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileCheck2 className="w-5 h-5 text-[#ff7700] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-gray-100 truncate">
                    Export Script & Production Assets
                  </h2>
                  <span className="text-gray-500">·</span>
                  <span className="text-amber-300 font-medium truncate">{project.title}</span>
                </div>
                <p className="text-[11px] text-gray-400 tabular-nums">
                  {preview.summary.totalOutputPages} output page{preview.summary.totalOutputPages === 1 ? '' : 's'} ·{' '}
                  {preview.summary.eighthsLabel} eighths · {preview.summary.sceneCount} scenes ·{' '}
                  {preview.summary.formattedByteSize} est.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-[#2c2c2c] transition-colors shrink-0"
              aria-label="Close Export Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Two-Column Body: Format & Options (Left) + Live Preview Pane (Right) */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Configuration Pane */}
            <div className="w-full lg:w-[370px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#343434] bg-[#222222] overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-300">
                  Export Format
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_ITEMS.map((item) => {
                    const isSelected = exportFormat === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExportFormat(item.id)}
                        className={`p-2.5 rounded border text-left transition-colors ${
                          isSelected
                            ? 'bg-[#2e2215] border-[#ff7700] text-amber-200'
                            : 'bg-[#1a1a1a] border-[#353535] text-gray-300 hover:bg-[#262626]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 font-semibold truncate">
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Desktop Rust / Tauri package option */}
                <button
                  type="button"
                  onClick={() => setExportFormat('rust_zip')}
                  className={`w-full p-2.5 rounded border text-left transition-colors ${
                    exportFormat === 'rust_zip'
                      ? 'bg-[#2e2215] border-[#ff7700] text-amber-200'
                      : 'bg-[#1a1a1a] border-[#3a3026] text-gray-300 hover:bg-[#26211c]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-100 truncate">
                      <Terminal className="w-4 h-4 text-[#ff7700] shrink-0" />
                      <span className="truncate">Desktop Rust & Tauri Bundle (.zip)</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-snug">
                    Full Cargo/Tauri repository with assets for macOS, Windows, and Linux builds.
                  </p>
                </button>
              </div>

              {/* Formatting Options for PDF / FDX */}
              {(exportFormat === 'pdf' || exportFormat === 'fdx') && (
                <div className="pt-3 border-t border-[#333333] space-y-2">
                  <div className="text-[11px] font-semibold text-gray-300">
                    Pagination & Formatting Options
                  </div>
                  <div className="space-y-1.5 bg-[#191919] border border-[#323232] rounded p-2.5">
                    <label className="flex items-center justify-between gap-2 cursor-pointer text-gray-200">
                      <span>Include Title Page</span>
                      <input
                        type="checkbox"
                        checked={includeTitlePage}
                        onChange={(e) => setIncludeTitlePage(e.target.checked)}
                        className="accent-[#ff7700] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 cursor-pointer text-gray-200">
                      <span>Include Scene Numbers</span>
                      <input
                        type="checkbox"
                        checked={includeSceneNumbers}
                        onChange={(e) => setIncludeSceneNumbers(e.target.checked)}
                        className="accent-[#ff7700] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 cursor-pointer text-gray-200">
                      <span>Include Page Numbers</span>
                      <input
                        type="checkbox"
                        checked={includePageNumbers}
                        onChange={(e) => setIncludePageNumbers(e.target.checked)}
                        className="accent-[#ff7700] cursor-pointer"
                      />
                    </label>
                    {exportFormat === 'fdx' && (
                      <label className="flex items-center justify-between gap-2 cursor-pointer text-gray-200">
                        <span>Show FDX Paragraph Tags in Preview</span>
                        <input
                          type="checkbox"
                          checked={showFdxElementLabels}
                          onChange={(e) => setShowFdxElementLabels(e.target.checked)}
                          className="accent-[#ff7700] cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Pre-Export Verification Summary */}
              <div className="pt-3 border-t border-[#333333] space-y-2">
                <div className="text-[11px] font-semibold text-gray-300">
                  Pre-Export Verification Summary
                </div>
                <div className="bg-[#191919] border border-[#323232] rounded p-3 space-y-2 tabular-nums">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Formatted Script Pages</span>
                    <span className="font-mono font-bold text-gray-100">
                      {preview.summary.scriptPageCount}
                      {hasCoverPage ? ' (+1 Title Page)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Schedule Page Eighths</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {preview.summary.eighthsLabel} pgs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Scenes · Elements</span>
                    <span className="font-mono text-gray-200">
                      {preview.summary.sceneCount} · {preview.summary.elementCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Words · Est. Runtime</span>
                    <span className="font-mono text-gray-200">
                      {preview.summary.wordCount.toLocaleString()} · ~{preview.summary.estimatedMinutes} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Estimated Output Size</span>
                    <span className="font-mono text-cyan-300">
                      {preview.summary.formattedByteSize}
                    </span>
                  </div>

                  {exportFormat === 'fdx' && (
                    <div className="pt-2 border-t border-[#2b2b2b] space-y-1">
                      <div className="text-[10px] text-gray-400 font-semibold">
                        FDX Paragraph Mapping
                      </div>
                      <div className="text-[10px] text-gray-300 font-mono leading-relaxed">
                        {Object.entries(preview.summary.fdxParagraphBreakdown)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {exportedStatus && (
                <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{exportedStatus}</span>
                </div>
              )}
            </div>

            {/* Right Column: Live Preview Pane */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#141414]">
              {/* Preview Toolbar */}
              <div className="px-4 py-2.5 bg-[#191919] border-b border-[#323232] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 text-[#ff7700] shrink-0" />
                  <span className="font-semibold text-gray-100 whitespace-nowrap">
                    Live Preview
                  </span>
                  <span className="text-gray-500">·</span>
                  <span className="text-[11px] text-gray-400 truncate">
                    {exportFormat === 'pdf'
                      ? 'PDF Print Layout (Courier 12pt · US Letter)'
                      : exportFormat === 'fdx'
                      ? previewMode === 'formatted'
                        ? 'Final Draft (.fdx) Formatted Pages'
                        : 'Final Draft (.fdx) XML Source'
                      : exportFormat === 'fountain'
                      ? previewMode === 'formatted'
                        ? 'Fountain Script Pages'
                        : 'Raw Fountain Syntax'
                      : exportFormat === 'csv'
                      ? previewMode === 'formatted'
                        ? 'Stripboard Schedule Table'
                        : 'Raw CSV Output'
                      : `${exportFormat.toUpperCase()} Output Inspection`}
                  </span>
                </div>

                {/* Preview Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Switcher for FDX / Fountain / CSV */}
                  {(exportFormat === 'fdx' || exportFormat === 'fountain' || exportFormat === 'csv') && (
                    <div className="flex items-center bg-[#121212] border border-[#353535] rounded p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('formatted')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded whitespace-nowrap shrink-0 transition-colors ${
                          previewMode === 'formatted'
                            ? 'bg-[#2a2a2a] text-amber-300 font-semibold'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{exportFormat === 'csv' ? 'Table' : 'Formatted'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('source')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded whitespace-nowrap shrink-0 transition-colors ${
                          previewMode === 'source'
                            ? 'bg-[#2a2a2a] text-cyan-300 font-semibold'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Code2 className="w-3 h-3" />
                        <span>{exportFormat === 'fdx' ? 'FDX XML' : 'Raw Source'}</span>
                      </button>
                    </div>
                  )}

                  {/* Page Scope & Pager for Formatted Script Pages */}
                  {supportsScriptPagePreview && previewMode === 'formatted' && (
                    <>
                      <div className="flex items-center bg-[#121212] border border-[#353535] rounded p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setPageScope('all')}
                          className={`px-2 py-1 rounded whitespace-nowrap shrink-0 transition-colors ${
                            pageScope === 'all'
                              ? 'bg-[#2a2a2a] text-gray-100 font-semibold'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          All ({totalPreviewSheets})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageScope('single')}
                          className={`px-2 py-1 rounded whitespace-nowrap shrink-0 transition-colors ${
                            pageScope === 'single'
                              ? 'bg-[#2a2a2a] text-gray-100 font-semibold'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Single Page
                        </button>
                      </div>

                      {pageScope === 'single' && (
                        <div className="flex items-center gap-1 bg-[#121212] border border-[#353535] rounded px-1.5 py-0.5 tabular-nums">
                          <button
                            type="button"
                            onClick={() => setCurrentPreviewPage((p) => Math.max(1, p - 1))}
                            disabled={currentPreviewPage <= 1}
                            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                            aria-label="Previous Preview Page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-mono text-gray-200 px-1 whitespace-nowrap">
                            {currentPreviewPage} / {totalPreviewSheets}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPreviewPage((p) => Math.min(totalPreviewSheets, p + 1))
                            }
                            disabled={currentPreviewPage >= totalPreviewSheets}
                            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                            aria-label="Next Preview Page"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <select
                        value={previewZoom}
                        onChange={(e) => setPreviewZoom(Number(e.target.value))}
                        className="bg-[#121212] border border-[#353535] rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none cursor-pointer tabular-nums"
                        aria-label="Preview Zoom"
                      >
                        <option value={75}>75%</option>
                        <option value={90}>90%</option>
                        <option value={100}>100%</option>
                      </select>
                    </>
                  )}

                  {/* Copy Raw Source Button */}
                  {(previewMode === 'source' || !supportsScriptPagePreview) && exportFormat !== 'pdf' && (
                    <button
                      type="button"
                      onClick={handleCopySource}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242424] hover:bg-[#303030] border border-[#3d3d3d] text-[11px] text-gray-200 whitespace-nowrap shrink-0"
                    >
                      {copiedSource ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Output</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Viewport */}
              <div className="flex-1 overflow-auto p-6 bg-[#141414]">
                {supportsScriptPagePreview && previewMode === 'formatted' ? (
                  <div
                    className="space-y-6 origin-top mx-auto"
                    style={{
                      transform: `scale(${previewZoom / 100})`,
                      transformOrigin: 'top center',
                    }}
                  >
                    {visibleSheets.map((sheet) =>
                      sheet.kind === 'cover'
                        ? renderTitleSheet(false)
                        : sheet.page
                        ? renderScriptSheet(sheet.page, false)
                        : null
                    )}
                  </div>
                ) : exportFormat === 'csv' && previewMode === 'formatted' ? (
                  <div className="bg-[#1b1b1b] border border-[#343434] rounded overflow-hidden">
                    <div className="px-3 py-2 bg-[#181818] border-b border-[#2e2e2e] flex items-center justify-between text-[11px] text-gray-400 tabular-nums">
                      <span>Stripboard CSV Rows ({Math.max(0, preview.csvRows.length - 1)} rows)</span>
                      <span>{preview.summary.formattedByteSize}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#151515] border-b border-[#303030] text-gray-300">
                            {(preview.csvRows[0] || []).map((header, idx) => (
                              <th key={idx} className="px-2.5 py-2 font-semibold whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#282828] font-mono tabular-nums">
                          {preview.csvRows.slice(1).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#222222]">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-2.5 py-1.5 text-gray-300 whitespace-nowrap">
                                  {cell || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111111] border border-[#323232] rounded overflow-hidden">
                    <div className="px-3 py-2 bg-[#181818] border-b border-[#2e2e2e] flex items-center justify-between text-[11px] text-gray-400 tabular-nums">
                      <span>
                        {exportFormat === 'fdx'
                          ? 'Final Draft XML (<FinalDraft>)'
                          : exportFormat === 'fountain'
                          ? 'Fountain Plain Text'
                          : exportFormat === 'premiere_xml'
                          ? 'Premiere Pro XMEML v4'
                          : exportFormat === 'nle_json'
                          ? 'NLE Metadata Sidecar JSON'
                          : exportFormat === 'csv'
                          ? 'Raw Schedule CSV'
                          : 'Desktop Rust Bundle Manifest'}
                      </span>
                      <span>
                        {preview.rawLineCount.toLocaleString()} lines · {preview.summary.formattedByteSize}
                      </span>
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-gray-200 leading-relaxed overflow-x-auto select-text whitespace-pre">
                      {preview.rawSource}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-[#171717] border-t border-[#343434] flex items-center justify-between gap-4 shrink-0">
            <div className="text-[11px] text-gray-400 tabular-nums truncate">
              Ready to export <span className="text-gray-200 font-medium">{project.title}</span> as{' '}
              <span className="text-amber-300 font-semibold">{exportFormat.toUpperCase()}</span> ·{' '}
              {preview.summary.totalOutputPages} page{preview.summary.totalOutputPages === 1 ? '' : 's'} ({preview.summary.eighthsLabel} eighths)
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#353535] border border-[#444] text-gray-300 rounded font-medium transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-white font-bold rounded flex items-center gap-1.5 shadow transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isExporting
                    ? 'Generating...'
                    : exportFormat === 'pdf'
                    ? `Print / Save PDF (${preview.summary.totalOutputPages} pgs)`
                    : `Export ${exportFormat.toUpperCase()}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only Clean Courier Screenplay Sheets for PDF Export */}
      <div className="hidden print:block print-screenplay-root">
        {includeTitlePage && renderTitleSheet(true)}
        {preview.pages.map((page) => renderScriptSheet(page, true))}
      </div>
    </>
  );
};
