import React, { useState } from 'react';
import {
  X,
  Printer,
  FileCode,
  FileText,
  FileSpreadsheet,
  Download,
  Terminal,
  Check
} from 'lucide-react';
import { NLEGeneratedSidecarEntry, StoryProject } from '../types/story';
import {
  serializeToFountain,
  exportToFinalDraftFdx,
  exportScheduleCsv
} from '../utils/screenplayParser';
import {
  buildNLEMetadataDocument,
  createGeneratedSidecarEntry,
  exportPremiereProXML,
  runNLEPreFlightCheck,
} from '../utils/nleMetadataPipeline';
import { generateRustDesktopZip } from '../utils/rustDesktopGenerator';

interface ExportModalProps {
  project: StoryProject;
  onClose: () => void;
  onRecordGeneratedSidecar?: (entry: NLEGeneratedSidecarEntry) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  onClose,
  onRecordGeneratedSidecar,
}) => {
  const [exportFormat, setExportFormat] = useState<
    'pdf' | 'fdx' | 'fountain' | 'csv' | 'json' | 'premiere_xml' | 'nle_json' | 'rust_zip'
  >('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'fountain') {
        const text = serializeToFountain(project);
        triggerDownload(text, `${project.title.replace(/[^a-z0-9]/gi, '_')}.fountain`, 'text/plain');
      } else if (exportFormat === 'fdx') {
        const fdx = exportToFinalDraftFdx(project);
        triggerDownload(fdx, `${project.title.replace(/[^a-z0-9]/gi, '_')}.fdx`, 'application/xml');
      } else if (exportFormat === 'csv') {
        const csv = exportScheduleCsv(project);
        triggerDownload(csv, `${project.title.replace(/[^a-z0-9]/gi, '_')}_schedule.csv`, 'text/csv');
      } else if (exportFormat === 'premiere_xml') {
        const xml = exportPremiereProXML(project, 24);
        const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_premiere.xml`;
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
        const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}.nle.json`;
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
        triggerDownload(json, `${project.title.replace(/[^a-z0-9]/gi, '_')}.story.json`, 'application/json');
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
      setExportedStatus('Export completed successfully!');
      setTimeout(() => setExportedStatus(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-lg text-xs text-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7700]"></span>
            <span className="font-bold text-sm text-gray-100">Export Script & Production Assets</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formats Selection */}
        <div className="p-4 space-y-3">
          <p className="text-gray-400 text-xs">
            Choose standard industry script format or production schedules:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportFormat('pdf')}
              className={`p-3 rounded border text-left transition-all ${
                exportFormat === 'pdf'
                  ? 'bg-[#2f2214] border-[#ff7700] text-amber-300'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <Printer className="w-4 h-4 text-rose-400" />
                <span>PDF Screenplay</span>
              </div>
              <p className="text-[10px] text-gray-400">Standard 8.5x11 Courier 12pt format with page numbers</p>
            </button>

            <button
              onClick={() => setExportFormat('fdx')}
              className={`p-3 rounded border text-left transition-all ${
                exportFormat === 'fdx'
                  ? 'bg-[#2f2214] border-[#ff7700] text-amber-300'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>Final Draft (.fdx)</span>
              </div>
              <p className="text-[10px] text-gray-400">Industry standard Final Draft XML document</p>
            </button>

            <button
              onClick={() => setExportFormat('fountain')}
              className={`p-3 rounded border text-left transition-all ${
                exportFormat === 'fountain'
                  ? 'bg-[#2f2214] border-[#ff7700] text-amber-300'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Fountain (.fountain)</span>
              </div>
              <p className="text-[10px] text-gray-400">Plain text screenwriting markup syntax</p>
            </button>

            <button
              onClick={() => setExportFormat('csv')}
              className={`p-3 rounded border text-left transition-all ${
                exportFormat === 'csv'
                  ? 'bg-[#2f2214] border-[#ff7700] text-amber-300'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Schedule CSV</span>
              </div>
              <p className="text-[10px] text-gray-400">Stripboard shooting schedule with page eighths</p>
            </button>

            <button
              onClick={() => setExportFormat('premiere_xml')}
              className={`p-3 rounded border text-left transition-all ${
                exportFormat === 'premiere_xml'
                  ? 'bg-[#2f2214] border-[#ff7700] text-amber-300'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>Premiere Pro XML</span>
              </div>
              <p className="text-[10px] text-gray-400">XMEML v4 sequence with scene & dialogue markers</p>
            </button>

            <button
              onClick={() => setExportFormat('nle_json')}
              className={`p-3 rounded border text-left transition-all ${
                exportFormat === 'nle_json'
                  ? 'bg-[#2f2214] border-[#ff7700] text-amber-300'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#333]'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                <FileText className="w-4 h-4 text-amber-300" />
                <span>NLE Sidecar (.nle.json)</span>
              </div>
              <p className="text-[10px] text-gray-400">Queryable dialogue index & STT alignment schema</p>
            </button>
          </div>

          {/* Desktop Rust / Tauri package option */}
          <button
            onClick={() => setExportFormat('rust_zip')}
            className={`w-full p-3 rounded border text-left transition-all ${
              exportFormat === 'rust_zip'
                ? 'bg-[#2f1f10] border-[#ff7700] text-amber-300'
                : 'bg-[#25201d] border-[#443525] text-amber-200 hover:bg-[#2d241d]'
            }`}
          >
            <div className="flex items-center justify-between font-bold mb-1">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[#ff7700]" />
                <span className="text-white">Desktop Rust & Tauri Project Bundle (.zip)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ff7700] text-black font-extrabold">
                RECOMMENDED
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Download the complete Rust repository with Cargo.toml, src-tauri, cross-platform build configs, and GitHub Actions workflow for Windows (.exe/.msi), macOS (.dmg), and Linux (.deb).
            </p>
          </button>

          {exportedStatus && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-gray-300 rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-white font-bold rounded flex items-center space-x-1.5 shadow transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export Selected'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
