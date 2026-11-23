import React, { useState } from 'react';
import { X, Users, MapPin, Calendar, Download, Printer } from 'lucide-react';
import { StoryProject } from '../types/story';
import { downloadReportPdf, printReportDocument } from '../utils/printHelper';

interface ReportsModalProps {
  project: StoryProject;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ project, onClose }) => {
  const [activeReport, setActiveReport] = useState<'cast' | 'locations' | 'schedule'>('cast');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Compute stats
  const totalEighths = project.scenes.reduce((acc, s) => acc + s.eighths, 0);
  const totalPages = (totalEighths / 8).toFixed(1);
  const intScenes = project.scenes.filter((s) => s.intExt.includes('INT')).length;
  const extScenes = project.scenes.filter((s) => s.intExt.includes('EXT')).length;
  const dayScenes = project.scenes.filter((s) => s.dayNight === 'DAY').length;
  const nightScenes = project.scenes.filter((s) => s.dayNight === 'NIGHT').length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#242424] border border-[#444] rounded-lg shadow-2xl w-full max-w-3xl text-xs text-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#1d1d1d] border-b border-[#383838] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7700]"></span>
            <span className="font-bold text-sm text-gray-100">
              ScreenCraft Production Reports — {project.title}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report Tabs (wraps cleanly onto a second row if exceeding modal width) */}
        <div className="flex flex-wrap gap-1 p-1 border-b border-[#383838] bg-[#1e1e1e]">
          <button
            onClick={() => setActiveReport('cast')}
            className={`flex-1 min-w-fit py-1.5 px-3 rounded text-center font-semibold tracking-wide border transition-colors flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeReport === 'cast'
                ? 'bg-[#242424] text-[#ff8000] border-[#ff8000]/60'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#232323] border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cast Breakdown</span>
          </button>
          <button
            onClick={() => setActiveReport('locations')}
            className={`flex-1 min-w-fit py-1.5 px-3 rounded text-center font-semibold tracking-wide border transition-colors flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeReport === 'locations'
                ? 'bg-[#242424] text-[#ff8000] border-[#ff8000]/60'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#232323] border-transparent'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations & Sets ({intScenes} INT / {extScenes} EXT)</span>
          </button>
          <button
            onClick={() => setActiveReport('schedule')}
            className={`flex-1 min-w-fit py-1.5 px-3 rounded text-center font-semibold tracking-wide border transition-colors flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeReport === 'schedule'
                ? 'bg-[#242424] text-[#ff8000] border-[#ff8000]/60'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#232323] border-transparent'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Shooting Day Summary</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#212121]">
          {activeReport === 'cast' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] text-gray-400 pb-2 border-b border-[#333]">
                <span>{project.characters.length} CHARACTERS WITH SPEAKING ROLES</span>
                <span>TOTAL SCREENPLAY PAGES: {totalPages} PGS</span>
              </div>

              <div className="divide-y divide-[#333] border border-[#383838] rounded overflow-hidden">
                <div className="grid grid-cols-12 bg-[#181818] p-2 font-bold text-gray-400 text-[11px]">
                  <div className="col-span-4">CHARACTER NAME</div>
                  <div className="col-span-3">ASSIGNED ACTOR</div>
                  <div className="col-span-2 text-center">SCENES</div>
                  <div className="col-span-3 text-right">SPEAKING LINES</div>
                </div>

                {project.characters.map((char, i) => (
                  <div key={i} className="grid grid-cols-12 p-2.5 items-center hover:bg-[#282828] text-xs">
                    <div className="col-span-4 flex items-center space-x-2 font-semibold text-gray-200">
                      <span
                        style={{ backgroundColor: char.color }}
                        className="w-3 h-3 rounded-full"
                      />
                      <span>{char.name}</span>
                    </div>
                    <div className="col-span-3 text-gray-300">
                      {char.actor || 'Pending Audition'}
                    </div>
                    <div className="col-span-2 text-center font-mono text-cyan-300">
                      {char.scenesCount} scenes
                    </div>
                    <div className="col-span-3 text-right font-mono text-amber-300">
                      {char.speakingLines} lines
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'locations' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#191919] p-2.5 rounded border border-[#333]">
                  <div className="text-[10px] text-gray-400">INTERIOR SCENES</div>
                  <div className="text-base font-bold text-cyan-400">{intScenes}</div>
                </div>
                <div className="bg-[#191919] p-2.5 rounded border border-[#333]">
                  <div className="text-[10px] text-gray-400">EXTERIOR SCENES</div>
                  <div className="text-base font-bold text-emerald-400">{extScenes}</div>
                </div>
                <div className="bg-[#191919] p-2.5 rounded border border-[#333]">
                  <div className="text-[10px] text-gray-400">DAYTIME</div>
                  <div className="text-base font-bold text-amber-400">{dayScenes}</div>
                </div>
                <div className="bg-[#191919] p-2.5 rounded border border-[#333]">
                  <div className="text-[10px] text-gray-400">NIGHTTIME</div>
                  <div className="text-base font-bold text-purple-400">{nightScenes}</div>
                </div>
              </div>

              <div className="border border-[#383838] rounded divide-y divide-[#333]">
                {project.scenes.map((scene) => (
                  <div key={scene.id} className="p-2.5 flex items-center justify-between hover:bg-[#282828]">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-amber-500 font-mono">#{scene.sceneNumber}</span>
                      <span className="font-semibold text-gray-200">{scene.setting}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#1a1a1a] text-gray-400 border border-[#333]">
                        {scene.intExt} / {scene.dayNight}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-gray-400 text-[11px]">
                      <span>{scene.pages} pgs</span>
                      <span className="font-mono text-cyan-400">{scene.timecode}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'schedule' && (
            <div className="space-y-3">
              <div className="bg-[#1a1a1a] p-3 rounded border border-[#333] space-y-1">
                <div className="font-bold text-gray-200 text-xs">Production Overview</div>
                <p className="text-gray-400 text-xs">
                  Estimated Principal Photography: {project.strips.filter((s) => s.type === 'day_break').length} Shooting Days. Total Screenplay: {totalPages} Pages.
                </p>
              </div>

              <div className="space-y-2">
                {project.strips
                  .filter((s) => s.type === 'day_break')
                  .map((db, idx) => (
                    <div key={db.id} className="p-2.5 rounded bg-[#2a2a2a] border border-[#3e3e3e]">
                      <div className="flex justify-between items-center font-bold text-xs">
                        <span className="text-amber-400">{db.bannerTitle}</span>
                        <span className="text-gray-400">{db.bannerDate}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                        <span>Total Pages: {db.bannerTotalPages || '4 3/8 PGS'}</span>
                        <span>Call: {db.bannerFrom} - Wrap: {db.bannerTo}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#1e1e1e] border-t border-[#383838] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                const res = printReportDocument(project, activeReport);
                setStatusMessage(
                  res.printed
                    ? 'Print dialog opened for report'
                    : `Print dialog blocked in preview — downloaded ${res.fallbackPdfFilename}`
                );
                setTimeout(() => setStatusMessage(null), 4000);
              }}
              className="px-3 py-1 bg-[#2c2c2c] hover:bg-[#383838] text-gray-200 rounded flex items-center space-x-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const filename = downloadReportPdf(project, activeReport);
                setStatusMessage(`Downloaded ${filename}`);
                setTimeout(() => setStatusMessage(null), 3500);
              }}
              className="px-3 py-1 bg-[#2c2c2c] hover:bg-[#383838] text-amber-300 rounded flex items-center space-x-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            {statusMessage && (
              <span className="text-[11px] text-emerald-400 truncate">{statusMessage}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] text-white font-bold rounded shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
