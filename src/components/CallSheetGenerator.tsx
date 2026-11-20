import React, { useState, useMemo, useEffect } from 'react';
import {
  CastCrewMember,
  Scene,
  StripboardStrip,
} from '../types/story';
import {
  extractCallSheetDays,
  generateCallSheetPdf,
  formatCallSheetSummaryText,
  CallSheetOptions,
} from '../utils/callSheetPdfGenerator';
import {
  FileText,
  Download,
  Share2,
  Copy,
  Check,
  Calendar,
  MapPin,
  Clock,
  Users,
  Edit3,
  AlertTriangle,
} from 'lucide-react';

interface CallSheetGeneratorProps {
  projectTitle: string;
  projectAuthor: string;
  draftName?: string;
  members: CastCrewMember[];
  scenes: Scene[];
  strips: StripboardStrip[];
  initialDayNumber?: number | null;
  onEditMember: (member: CastCrewMember) => void;
  onSelectScene: (sceneId: string) => void;
}

export const CallSheetGenerator: React.FC<CallSheetGeneratorProps> = ({
  projectTitle,
  projectAuthor,
  draftName,
  members,
  scenes,
  strips,
  initialDayNumber,
  onEditMember,
  onSelectScene,
}) => {
  const [includeAllCrew, setIncludeAllCrew] = useState(false);

  const days = useMemo(
    () => extractCallSheetDays(strips, scenes, members, includeAllCrew),
    [strips, scenes, members, includeAllCrew]
  );

  const [selectedDayNum, setSelectedDayNum] = useState<number>(() => {
    if (initialDayNumber && days.some((d) => d.dayNumber === initialDayNumber)) {
      return initialDayNumber;
    }
    return days[0]?.dayNumber || 1;
  });

  useEffect(() => {
    if (initialDayNumber && days.some((d) => d.dayNumber === initialDayNumber)) {
      setSelectedDayNum(initialDayNumber);
    }
  }, [initialDayNumber, days]);

  const activeDay = useMemo(
    () => days.find((d) => d.dayNumber === selectedDayNum) || days[0],
    [days, selectedDayNum]
  );

  // Editable Call Sheet header / safety fields (synced when shooting day or unit changes)
  const [generalCallTime, setGeneralCallTime] = useState(
    activeDay?.defaultGeneralCall || '07:00'
  );
  const [estWrapTime, setEstWrapTime] = useState(
    activeDay?.defaultEstWrap || '19:00'
  );
  const [directorName, setDirectorName] = useState(
    activeDay?.directorContact?.name || projectAuthor || 'Director TBD'
  );
  const [firstAdName, setFirstAdName] = useState(
    activeDay?.producerAdContact?.name || '1st AD / Line Producer'
  );
  const [productionPhone, setProductionPhone] = useState(
    activeDay?.producerAdContact?.phone ||
      activeDay?.directorContact?.phone ||
      '+1 (310) 555-0100'
  );
  const [basecampNotes, setBasecampNotes] = useState(
    'Crew parking & unit basecamp per primary stage / location gates. Shuttles begin 30 min prior to general call.'
  );
  const [nearestHospital, setNearestHospital] = useState(
    'Cedars-Sinai Medical Center · 8700 Beverly Blvd · Emergency: 911'
  );
  const [weatherSafetyNotes, setWeatherSafetyNotes] = useState(
    'Closed set during rehearsal & takes. Radio Ch. 1 Production · Ch. 2 Camera/Lighting · Ch. 3 Transport.'
  );

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Update call/wrap times when switching shooting days
  useEffect(() => {
    if (activeDay) {
      setGeneralCallTime(activeDay.defaultGeneralCall);
      setEstWrapTime(activeDay.defaultEstWrap);
      if (activeDay.directorContact?.name) {
        setDirectorName(activeDay.directorContact.name);
      }
      if (activeDay.producerAdContact?.name) {
        setFirstAdName(activeDay.producerAdContact.name);
      }
      if (activeDay.producerAdContact?.phone) {
        setProductionPhone(activeDay.producerAdContact.phone);
      }
    }
  }, [activeDay?.dayNumber, activeDay?.defaultGeneralCall, activeDay?.defaultEstWrap]);

  const callSheetOptions: CallSheetOptions = {
    projectTitle,
    draftName,
    generalCallTime,
    estWrapTime,
    directorName,
    firstAdName,
    productionPhone,
    basecampNotes,
    nearestHospital,
    weatherSafetyNotes,
    includeAllCrew,
  };

  const showTempStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3200);
  };

  const handleDownloadPdf = () => {
    if (!activeDay) return;
    const { blob, filename } = generateCallSheetPdf(activeDay, callSheetOptions);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showTempStatus(`Downloaded ${filename}`);
  };

  const handleSharePdf = async () => {
    if (!activeDay) return;
    const { blob, filename } = generateCallSheetPdf(activeDay, callSheetOptions);
    const file = new File([blob], filename, { type: 'application/pdf' });
    const summaryText = formatCallSheetSummaryText(activeDay, callSheetOptions);

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };

    if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await nav.share({
          title: `${projectTitle} — Shoot Day ${activeDay.dayNumber} Call Sheet`,
          text: `Daily Call Sheet for ${activeDay.dateText} (General Call: ${generalCallTime})`,
          files: [file],
        });
        showTempStatus('Call sheet PDF shared');
        return;
      } catch (err) {
        // User cancelled or share sheet rejected; fall back cleanly to download + clipboard
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: download PDF and copy dispatch summary text so user can immediately send it
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(summaryText).catch(() => {});
    showTempStatus(`PDF saved (${filename}) & dispatch summary copied to clipboard`);
  };

  const handleCopySummary = () => {
    if (!activeDay) return;
    const text = formatCallSheetSummaryText(activeDay, callSheetOptions);
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
    showTempStatus('Call sheet dispatch text copied');
  };

  if (!activeDay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <FileText className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-sm font-semibold text-gray-200">No Stripboard Shooting Days Found</p>
        <p className="text-xs text-gray-500 mt-1 max-w-md">
          Add scenes or day breaks to your Production Stripboard to automatically generate daily call sheets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#1b1b1b] text-xs">
      {/* Left Configuration & Dispatch Controls Sidebar */}
      <aside className="w-[340px] flex-shrink-0 bg-[#212121] border-r border-[#363636] flex flex-col min-h-0">
        <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#333333] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#ff8000]" />
              <span>Automated Call Sheet</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Synced with Stripboard & Cast/Crew Directory
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Shooting Day Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
              Select Shooting Day
            </label>
            <div className="space-y-1.5">
              {days.map((day) => {
                const active = day.dayNumber === activeDay.dayNumber;
                return (
                  <button
                    key={day.dayKey}
                    onClick={() => setSelectedDayNum(day.dayNumber)}
                    className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                      active
                        ? 'bg-[#2c251d] border-[#ff8000] text-gray-100'
                        : 'bg-[#181818] border-[#333333] text-gray-300 hover:bg-[#252525]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-amber-300">
                        Shoot Day {day.dayNumber}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-gray-400">
                        {day.sceneCount} sc · {day.totalPagesFormatted} pgs
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {day.dateText} · {day.castCalls.length} cast · {day.crewCalls.length} crew
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* General Call & Key Leadership Overrides */}
          <div className="pt-2 border-t border-[#323232] space-y-2.5">
            <div className="text-[11px] font-semibold text-gray-300">
              Call Sheet Header & Key Contacts
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">General Crew Call</label>
                <input
                  type="text"
                  value={generalCallTime}
                  onChange={(e) => setGeneralCallTime(e.target.value)}
                  className="w-full bg-[#161616] text-amber-300 font-mono tabular-nums px-2.5 py-1.5 rounded border border-[#383838] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Estimated Wrap</label>
                <input
                  type="text"
                  value={estWrapTime}
                  onChange={(e) => setEstWrapTime(e.target.value)}
                  className="w-full bg-[#161616] text-gray-100 font-mono tabular-nums px-2.5 py-1.5 rounded border border-[#383838] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Director</label>
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                className="w-full bg-[#161616] text-gray-200 px-2.5 py-1.5 rounded border border-[#383838] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">1st AD / Line Producer</label>
                <input
                  type="text"
                  value={firstAdName}
                  onChange={(e) => setFirstAdName(e.target.value)}
                  className="w-full bg-[#161616] text-gray-200 px-2.5 py-1.5 rounded border border-[#383838] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Production Phone</label>
                <input
                  type="text"
                  value={productionPhone}
                  onChange={(e) => setProductionPhone(e.target.value)}
                  className="w-full bg-[#161616] text-gray-200 font-mono px-2.5 py-1.5 rounded border border-[#383838] focus:outline-none focus:border-[#ff8000]"
                />
              </div>
            </div>
          </div>

          {/* Logistics & Safety Bulletin */}
          <div className="pt-2 border-t border-[#323232] space-y-2.5">
            <div className="text-[11px] font-semibold text-gray-300">
              Location, Hospital & Safety Notes
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Basecamp & Parking</label>
              <textarea
                rows={2}
                value={basecampNotes}
                onChange={(e) => setBasecampNotes(e.target.value)}
                className="w-full bg-[#161616] text-gray-200 p-2 rounded border border-[#383838] text-[11px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Nearest Hospital</label>
              <input
                type="text"
                value={nearestHospital}
                onChange={(e) => setNearestHospital(e.target.value)}
                className="w-full bg-[#161616] text-gray-200 px-2.5 py-1.5 rounded border border-[#383838] text-[11px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Set, Radio & Safety Notes</label>
              <textarea
                rows={2}
                value={weatherSafetyNotes}
                onChange={(e) => setWeatherSafetyNotes(e.target.value)}
                className="w-full bg-[#161616] text-gray-200 p-2 rounded border border-[#383838] text-[11px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>

            <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeAllCrew}
                onChange={(e) => setIncludeAllCrew(e.target.checked)}
                className="accent-[#ff7700]"
              />
              <span>Include full unit crew (even if off this day)</span>
            </label>
          </div>
        </div>

        {/* Sticky Export & Share Footer */}
        <div className="p-4 bg-[#1c1c1c] border-t border-[#333333] space-y-2">
          {statusMessage && (
            <div className="text-[11px] text-emerald-400 font-medium text-center pb-1">
              {statusMessage}
            </div>
          )}

          <button
            onClick={handleDownloadPdf}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Download Call Sheet PDF</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSharePdf}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2b2b2b] hover:bg-[#383838] text-gray-200 rounded border border-[#444] font-medium transition-colors whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Share PDF</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2b2b2b] hover:bg-[#383838] text-gray-200 rounded border border-[#444] font-medium transition-colors whitespace-nowrap"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Right Workspace: Crisp Live Industry Call Sheet Document Preview */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#141414]">
        <div className="max-w-[880px] mx-auto bg-[#fafafa] text-neutral-900 rounded shadow-2xl border border-neutral-300 overflow-hidden">
          {/* Document Top Banner */}
          <div className="bg-neutral-900 text-white px-6 py-4 border-b-4 border-[#ff7700] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-bold tracking-tight uppercase">
                {projectTitle}
              </div>
              <div className="text-[11px] text-neutral-300 mt-0.5">
                Daily Production Call Sheet
                {draftName ? ` · ${draftName}` : ''}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1.5">
                Director: <span className="text-neutral-100 font-medium">{directorName}</span>
                <span aria-hidden="true"> · </span>
                1st AD / LP: <span className="text-neutral-100 font-medium">{firstAdName}</span>
                <span aria-hidden="true"> · </span>
                Unit Phone: <span className="text-neutral-100 font-mono tabular-nums">{productionPhone}</span>
              </div>
            </div>

            <div className="bg-[#ff7700] text-black px-5 py-2.5 rounded text-center shrink-0">
              <div className="text-sm font-extrabold tracking-wide uppercase">
                Shoot Day {activeDay.dayNumber}
              </div>
              <div className="text-[11px] font-semibold">{activeDay.dateText}</div>
              <div className="text-xs font-mono font-bold tabular-nums mt-1">
                CALL {generalCallTime} · WRAP {estWrapTime}
              </div>
            </div>
          </div>

          {/* Logistics & Totals Strip */}
          <div className="bg-neutral-100 border-b border-neutral-300 px-6 py-3 space-y-1.5 text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-neutral-800">
              <div className="flex items-center gap-3 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#cc5f00]" />
                  {activeDay.sceneCount} Scenes
                </span>
                <span>·</span>
                <span>{activeDay.totalPagesFormatted} Pages</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#cc5f00]" />
                  {activeDay.castCalls.length} Cast / {activeDay.crewCalls.length} Crew
                </span>
              </div>
              <span className="text-neutral-500 font-normal">
                Click any cast/crew member to adjust call times
              </span>
            </div>
            <div className="text-neutral-700 leading-relaxed">
              <span className="font-semibold text-neutral-900">Basecamp & Parking:</span> {basecampNotes}
            </div>
            <div className="text-neutral-700 leading-relaxed">
              <span className="font-semibold text-neutral-900">Hospital:</span> {nearestHospital}
              <span aria-hidden="true"> · </span>
              <span className="font-semibold text-neutral-900">Notes:</span> {weatherSafetyNotes}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Section 1: Shooting Locations */}
            <div>
              <div className="bg-neutral-800 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#ff8000]" />
                  Shooting Locations & Sets
                </span>
                <span className="font-normal text-neutral-300 tabular-nums">
                  {activeDay.locations.length} Location(s)
                </span>
              </div>
              {activeDay.locations.length === 0 ? (
                <p className="text-[11px] text-neutral-500 italic py-2">
                  No scene locations linked to this shooting day.
                </p>
              ) : (
                <div className="border border-t-0 border-neutral-300 divide-y divide-neutral-200">
                  {activeDay.locations.map((loc) => (
                    <div
                      key={loc.location}
                      className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="font-semibold text-neutral-900">{loc.location}</div>
                      <div className="text-neutral-600 font-mono tabular-nums">
                        Sets: {loc.sets.join(', ')} · Scenes {loc.sceneNumbers.join(', ')} · First Shoot {loc.firstCallTime || generalCallTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Stripboard Shooting Schedule */}
            <div>
              <div className="bg-neutral-800 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#ff8000]" />
                  Shooting Schedule (Stripboard Order)
                </span>
                <span className="font-normal text-neutral-300 tabular-nums">
                  {activeDay.sceneCount} Scenes · {activeDay.totalPagesFormatted} Pages
                </span>
              </div>

              <div className="border border-t-0 border-neutral-300 overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-neutral-200 text-neutral-700 font-bold">
                    <tr>
                      <th className="py-1.5 px-2.5">Time</th>
                      <th className="py-1.5 px-2">Sc.</th>
                      <th className="py-1.5 px-2">I/E · D/N</th>
                      <th className="py-1.5 px-2.5">Set & Location</th>
                      <th className="py-1.5 px-2 text-right">Pages</th>
                      <th className="py-1.5 px-2.5">Cast Required</th>
                      <th className="py-1.5 px-2.5">Shoot Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {activeDay.scheduleRows.map((row) =>
                      row.kind === 'banner' ? (
                        <tr key={row.id} className="bg-amber-100 text-amber-950 font-semibold">
                          <td className="py-1.5 px-2.5 font-mono tabular-nums">{row.timeLabel}</td>
                          <td colSpan={6} className="py-1.5 px-2.5 uppercase tracking-wide">
                            {row.setName} ({row.duration})
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className="hover:bg-neutral-100">
                          <td className="py-2 px-2.5 font-mono font-semibold tabular-nums text-neutral-900 whitespace-nowrap">
                            {row.timeLabel}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold tabular-nums">
                            {row.sceneId ? (
                              <button
                                onClick={() => onSelectScene(row.sceneId!)}
                                className="text-[#c25900] hover:underline"
                                title="Open scene in script"
                              >
                                {row.sceneNumber}
                              </button>
                            ) : (
                              row.sceneNumber
                            )}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap text-neutral-700">
                            {row.intExt} {row.dayNight}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-semibold text-neutral-900">{row.setName}</div>
                            <div className="text-[10px] text-neutral-600">{row.location}</div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                            {row.pages}
                          </td>
                          <td className="py-2 px-2.5 text-neutral-700 max-w-[160px]">
                            {row.characters.length > 0 ? row.characters.join(', ') : '—'}
                          </td>
                          <td className="py-2 px-2.5 text-neutral-600 max-w-[180px]">
                            {row.notes || '—'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Cast Call Times */}
            <div>
              <div className="bg-neutral-800 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Cast Call Times</span>
                <span className="font-normal text-neutral-300 tabular-nums">
                  {activeDay.castCalls.length} Talent Called
                </span>
              </div>

              {activeDay.castCalls.length === 0 ? (
                <div className="border border-t-0 border-neutral-300 p-3 text-[11px] text-neutral-500 italic">
                  No cast members scheduled for Shoot Day {activeDay.dayNumber}.
                </div>
              ) : (
                <div className="border border-t-0 border-neutral-300 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-neutral-200 text-neutral-700 font-bold">
                      <tr>
                        <th className="py-1.5 px-2.5">Character</th>
                        <th className="py-1.5 px-2.5">Actor</th>
                        <th className="py-1.5 px-2">Scenes</th>
                        <th className="py-1.5 px-2">Call</th>
                        <th className="py-1.5 px-2">Wrap</th>
                        <th className="py-1.5 px-2.5">Contact</th>
                        <th className="py-1.5 px-2.5">Notes</th>
                        <th className="py-1.5 px-2 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {activeDay.castCalls.map(({ member, scenesOnDay }) => (
                        <tr key={member.id} className="hover:bg-neutral-100">
                          <td className="py-2 px-2.5 font-semibold text-neutral-900">
                            {member.characterName || member.role}
                          </td>
                          <td className="py-2 px-2.5 text-neutral-800">
                            {member.name}
                            {member.availabilityStatus !== 'Confirmed' && (
                              <span className="ml-1.5 text-[10px] font-semibold text-amber-700 inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                {member.availabilityStatus}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono tabular-nums text-neutral-700">
                            {scenesOnDay.length > 0 ? scenesOnDay.join(', ') : 'All'}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold tabular-nums text-neutral-900">
                            {member.callTime || generalCallTime}
                          </td>
                          <td className="py-2 px-2 font-mono tabular-nums text-neutral-700">
                            {member.wrapTime || estWrapTime}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                            {member.phone}
                          </td>
                          <td className="py-2 px-2.5 text-neutral-600 max-w-[180px]">
                            {member.scheduleNotes || '—'}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              onClick={() => onEditMember(member)}
                              className="text-neutral-500 hover:text-[#c25900] p-1"
                              title="Edit cast call time or notes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 4: Crew Call Sheet */}
            <div>
              <div className="bg-neutral-800 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Crew Call Times & Department Contacts</span>
                <span className="font-normal text-neutral-300 tabular-nums">
                  {activeDay.crewCalls.length} Crew Called
                </span>
              </div>

              {activeDay.crewCalls.length === 0 ? (
                <div className="border border-t-0 border-neutral-300 p-3 text-[11px] text-neutral-500 italic">
                  No crew members scheduled for Shoot Day {activeDay.dayNumber}.
                </div>
              ) : (
                <div className="border border-t-0 border-neutral-300 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-neutral-200 text-neutral-700 font-bold">
                      <tr>
                        <th className="py-1.5 px-2.5">Department</th>
                        <th className="py-1.5 px-2.5">Role</th>
                        <th className="py-1.5 px-2.5">Name</th>
                        <th className="py-1.5 px-2">Call</th>
                        <th className="py-1.5 px-2">Wrap</th>
                        <th className="py-1.5 px-2.5">Phone / Channel</th>
                        <th className="py-1.5 px-2.5">Base / Notes</th>
                        <th className="py-1.5 px-2 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {activeDay.crewCalls.map(({ member }) => (
                        <tr key={member.id} className="hover:bg-neutral-100">
                          <td className="py-2 px-2.5 text-neutral-700 font-medium">
                            {member.department}
                          </td>
                          <td className="py-2 px-2.5 text-neutral-900">{member.role}</td>
                          <td className="py-2 px-2.5 font-semibold text-neutral-900">
                            {member.name}
                            {member.availabilityStatus !== 'Confirmed' && (
                              <span className="ml-1.5 text-[10px] font-semibold text-amber-700 inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                {member.availabilityStatus}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold tabular-nums text-neutral-900">
                            {member.callTime || generalCallTime}
                          </td>
                          <td className="py-2 px-2 font-mono tabular-nums text-neutral-700">
                            {member.wrapTime || estWrapTime}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-neutral-700 whitespace-nowrap">
                            {member.phone}
                            {member.preferredContact ? ` · ${member.preferredContact}` : ''}
                          </td>
                          <td className="py-2 px-2.5 text-neutral-600 max-w-[160px]">
                            {member.location || member.scheduleNotes || '—'}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              onClick={() => onEditMember(member)}
                              className="text-neutral-500 hover:text-[#c25900] p-1"
                              title="Edit crew call time or notes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
