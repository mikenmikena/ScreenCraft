import { jsPDF } from 'jspdf';
import {
  CastCrewMember,
  Scene,
  StripboardStrip,
} from '../types/story';

export interface CallSheetScheduleRow {
  id: string;
  kind: 'scene' | 'banner';
  timeLabel: string;
  sceneId?: string;
  sceneNumber?: number;
  intExt: string;
  dayNight: string;
  setName: string;
  location: string;
  pages: string;
  duration: string;
  characters: string[];
  notes: string;
}

export interface CallSheetLocationEntry {
  location: string;
  sets: string[];
  sceneNumbers: number[];
  firstCallTime: string;
}

export interface CallSheetDayData {
  dayNumber: number;
  dayKey: string;
  dayLabel: string;
  bannerTitle: string;
  dateText: string;
  defaultGeneralCall: string;
  defaultEstWrap: string;
  totalPagesFormatted: string;
  sceneCount: number;
  scheduleRows: CallSheetScheduleRow[];
  locations: CallSheetLocationEntry[];
  castCalls: {
    member: CastCrewMember;
    scenesOnDay: number[];
    reason: string;
  }[];
  crewCalls: {
    member: CastCrewMember;
    scenesOnDay: number[];
    reason: string;
  }[];
  directorContact?: CastCrewMember;
  producerAdContact?: CastCrewMember;
}

export interface CallSheetOptions {
  projectTitle: string;
  draftName?: string;
  generalCallTime: string;
  estWrapTime: string;
  directorName: string;
  firstAdName: string;
  productionPhone: string;
  basecampNotes: string;
  nearestHospital: string;
  weatherSafetyNotes: string;
  includeAllCrew: boolean;
}

const formatEighths = (eighths: number): string => {
  if (eighths <= 0) return '0';
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
};

const normalizeDayNum = (label: string): string | null => {
  const m = label.match(/day\s*(\d+)/i);
  return m ? `day-${m[1]}` : null;
};

const isMemberScheduledForDay = (
  member: CastCrewMember,
  dayNumber: number,
  dayLabel: string,
  dateText: string,
  daySceneIds: Set<string>
): { matched: boolean; reason: string } => {
  const dayKey = `day-${dayNumber}`;
  const matchedDay = member.scheduledDays.some((sd) => {
    const lower = sd.toLowerCase();
    if (lower === dayLabel.toLowerCase()) return true;
    const norm = normalizeDayNum(sd);
    if (norm && norm === dayKey) return true;
    if (dateText && lower.includes(dateText.toLowerCase().slice(0, 6))) return true;
    return false;
  });

  const matchingScenes = member.linkedSceneIds.filter((id) => daySceneIds.has(id));

  if (matchedDay && matchingScenes.length > 0) {
    return { matched: true, reason: 'Scheduled + Scene Cast/Crew' };
  }
  if (matchedDay) {
    return { matched: true, reason: 'Scheduled for Shoot Day' };
  }
  if (matchingScenes.length > 0) {
    return { matched: true, reason: 'Assigned to Day Scene' };
  }
  return { matched: false, reason: 'Full Unit Standby' };
};

export const extractCallSheetDays = (
  strips: StripboardStrip[],
  scenes: Scene[],
  members: CastCrewMember[],
  includeAllCrew: boolean = false
): CallSheetDayData[] => {
  const sceneById = new Map<string, Scene>();
  scenes.forEach((sc) => sceneById.set(sc.id, sc));

  interface RawDayBucket {
    dayNumber: number;
    bannerTitle: string;
    dateText: string;
    defaultGeneralCall: string;
    defaultEstWrap: string;
    strips: StripboardStrip[];
  }

  const buckets: RawDayBucket[] = [];
  let current: RawDayBucket | null = null;
  let dayNum = 1;

  strips.forEach((strip) => {
    if (strip.type === 'day_break') {
      current = {
        dayNumber: dayNum,
        bannerTitle: strip.bannerTitle || `START OF DAY ${dayNum}`,
        dateText: strip.bannerDate || `Shooting Day ${dayNum}`,
        defaultGeneralCall: strip.bannerFrom || '07:00',
        defaultEstWrap: strip.bannerTo || '19:00',
        strips: [],
      };
      buckets.push(current);
      dayNum++;
    } else {
      if (!current) {
        current = {
          dayNumber: dayNum,
          bannerTitle: `START OF DAY ${dayNum}`,
          dateText: `Shooting Day ${dayNum}`,
          defaultGeneralCall: '07:00',
          defaultEstWrap: '19:00',
          strips: [],
        };
        buckets.push(current);
        dayNum++;
      }
      current.strips.push(strip);
    }
  });

  if (buckets.length === 0) {
    buckets.push({
      dayNumber: 1,
      bannerTitle: 'START OF DAY 1',
      dateText: scenes[0]?.shootingStartDate || 'Shooting Day 1',
      defaultGeneralCall: '07:00',
      defaultEstWrap: '19:00',
      strips: scenes.map((sc) => ({
        id: `auto-strip-${sc.id}`,
        type: 'scene',
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        intExt: sc.intExt,
        dayNight: sc.dayNight,
        set: sc.setting,
        pages: sc.pages,
        eighths: sc.eighths,
        scheduledDuration: sc.shootingDuration || '01:30',
        characters: sc.characters,
        timeOfDay: sc.timeOfDay,
      })),
    });
  }

  const directorContact = members.find(
    (m) =>
      m.department === 'Directing' ||
      m.role.toLowerCase().includes('director') && !m.role.toLowerCase().includes('photography')
  );
  const producerAdContact = members.find(
    (m) =>
      m.department === 'Production Office' ||
      m.role.toLowerCase().includes('1st ad') ||
      m.role.toLowerCase().includes('producer')
  );

  return buckets.map((bucket) => {
    const dateShort = bucket.dateText.replace(/^[^,]+,\s*/, '').slice(0, 6);
    const dayLabel = dateShort
      ? `Day ${bucket.dayNumber} (${dateShort})`
      : `Day ${bucket.dayNumber}`;

    let totalEighths = 0;
    let sceneCount = 0;
    const daySceneIds = new Set<string>();
    const locationMap = new Map<
      string,
      { sets: Set<string>; sceneNumbers: number[]; firstCallTime: string }
    >();

    const scheduleRows: CallSheetScheduleRow[] = bucket.strips.map((strip) => {
      if (strip.type === 'banner') {
        return {
          id: strip.id,
          kind: 'banner',
          timeLabel:
            strip.bannerFrom && strip.bannerTo
              ? `${strip.bannerFrom}–${strip.bannerTo}`
              : strip.bannerFrom || 'TBD',
          intExt: '-',
          dayNight: '-',
          setName: strip.bannerTitle || 'PRODUCTION MOVE / BREAK',
          location: 'Company Move / Meal',
          pages: '-',
          duration: strip.scheduledDuration || '-',
          characters: [],
          notes: strip.bannerTitle || '',
        };
      }

      const sc = strip.sceneId ? sceneById.get(strip.sceneId) : undefined;
      if (strip.sceneId) daySceneIds.add(strip.sceneId);
      sceneCount++;
      const eighths = strip.eighths ?? sc?.eighths ?? 0;
      totalEighths += eighths;

      const sceneNum = strip.sceneNumber ?? sc?.sceneNumber ?? sceneCount;
      const setName = strip.set || sc?.setting || sc?.heading || `Scene ${sceneNum}`;
      const location = sc?.location || setName;
      const shootTime = strip.timeOfDay || sc?.timeOfDay || bucket.defaultGeneralCall;

      const locEntry = locationMap.get(location) || {
        sets: new Set<string>(),
        sceneNumbers: [],
        firstCallTime: shootTime,
      };
      locEntry.sets.add(setName);
      if (!locEntry.sceneNumbers.includes(sceneNum)) {
        locEntry.sceneNumbers.push(sceneNum);
      }
      if (shootTime && (!locEntry.firstCallTime || shootTime < locEntry.firstCallTime)) {
        locEntry.firstCallTime = shootTime;
      }
      locationMap.set(location, locEntry);

      return {
        id: strip.id,
        kind: 'scene',
        timeLabel: shootTime || 'TBD',
        sceneId: strip.sceneId,
        sceneNumber: sceneNum,
        intExt: strip.intExt || sc?.intExt || 'INT',
        dayNight: strip.dayNight || sc?.dayNight || 'DAY',
        setName,
        location,
        pages: strip.pages || sc?.pages || formatEighths(eighths),
        duration: strip.scheduledDuration || sc?.shootingDuration || '-',
        characters: strip.characters || sc?.characters || [],
        notes: sc?.scheduleNotes || sc?.notes || sc?.synopsis || '',
      };
    });

    const locations: CallSheetLocationEntry[] = Array.from(locationMap.entries()).map(
      ([location, info]) => ({
        location,
        sets: Array.from(info.sets),
        sceneNumbers: info.sceneNumbers.sort((a, b) => a - b),
        firstCallTime: info.firstCallTime,
      })
    );

    const castCalls: CallSheetDayData['castCalls'] = [];
    const crewCalls: CallSheetDayData['crewCalls'] = [];

    members.forEach((member) => {
      const match = isMemberScheduledForDay(
        member,
        bucket.dayNumber,
        dayLabel,
        dateShort,
        daySceneIds
      );
      if (!match.matched && !(includeAllCrew && member.category === 'crew')) {
        return;
      }

      const scenesOnDay = member.linkedSceneIds
        .filter((id) => daySceneIds.has(id))
        .map((id) => sceneById.get(id)?.sceneNumber)
        .filter((n): n is number => typeof n === 'number')
        .sort((a, b) => a - b);

      const entry = {
        member,
        scenesOnDay,
        reason: match.reason,
      };

      if (member.category === 'cast') {
        castCalls.push(entry);
      } else {
        crewCalls.push(entry);
      }
    });

    castCalls.sort((a, b) =>
      (a.member.callTime || '07:00').localeCompare(b.member.callTime || '07:00')
    );
    crewCalls.sort((a, b) => {
      const deptCmp = a.member.department.localeCompare(b.member.department);
      if (deptCmp !== 0) return deptCmp;
      return (a.member.callTime || '07:00').localeCompare(b.member.callTime || '07:00');
    });

    // Derive earliest crew call if not explicitly set on banner
    const earliestCrewCall = crewCalls.reduce((min, item) => {
      const ct = item.member.callTime;
      if (!ct) return min;
      return !min || ct < min ? ct : min;
    }, '');

    const latestWrap = [...castCalls, ...crewCalls].reduce((max, item) => {
      const wt = item.member.wrapTime;
      if (!wt) return max;
      return !max || wt > max ? wt : max;
    }, '');

    return {
      dayNumber: bucket.dayNumber,
      dayKey: `day-${bucket.dayNumber}`,
      dayLabel,
      bannerTitle: bucket.bannerTitle,
      dateText: bucket.dateText,
      defaultGeneralCall: bucket.defaultGeneralCall || earliestCrewCall || '07:00',
      defaultEstWrap: bucket.defaultEstWrap || latestWrap || '19:00',
      totalPagesFormatted: formatEighths(totalEighths),
      sceneCount,
      scheduleRows,
      locations,
      castCalls,
      crewCalls,
      directorContact,
      producerAdContact,
    };
  });
};

export const generateCallSheetPdf = (
  day: CallSheetDayData,
  options: CallSheetOptions
): { blob: Blob; filename: string; doc: jsPDF } => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 612pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 792pt
  const marginX = 32;
  const contentWidth = pageWidth - marginX * 2; // 548pt
  let y = 32;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 44) {
      doc.addPage();
      y = 36;
    }
  };

  const drawSectionBar = (title: string, subtitle?: string) => {
    ensureSpace(34);
    doc.setFillColor(30, 34, 42);
    doc.rect(marginX, y, contentWidth, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), marginX + 6, y + 12);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(210, 214, 220);
      doc.text(subtitle, marginX + contentWidth - 6, y + 12, { align: 'right' });
    }
    y += 22;
  };

  // 1. TOP PRODUCTION CALL SHEET HEADER
  doc.setFillColor(24, 24, 27);
  doc.rect(marginX, y, contentWidth, 56, 'F');
  doc.setDrawColor(234, 118, 0);
  doc.setLineWidth(2);
  doc.line(marginX, y + 56, marginX + contentWidth, y + 56);

  // Left: Production Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(options.projectTitle.toUpperCase(), marginX + 10, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 205, 212);
  const subTitle = `DAILY PRODUCTION CALL SHEET${options.draftName ? `  ·  ${options.draftName}` : ''}`;
  doc.text(subTitle, marginX + 10, y + 36);
  doc.text(
    `Director: ${options.directorName || 'TBD'}   |   1st AD / LP: ${options.firstAdName || 'TBD'}   |   Unit Phone: ${options.productionPhone || 'TBD'}`,
    marginX + 10,
    y + 49
  );

  // Right: Day Box & General Call
  doc.setFillColor(255, 119, 0);
  doc.rect(marginX + contentWidth - 150, y + 6, 142, 44, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text(`SHOOT DAY ${day.dayNumber}`, marginX + contentWidth - 79, y + 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text(day.dateText, marginX + contentWidth - 79, y + 32, { align: 'center' });
  doc.setFontSize(9);
  doc.text(
    `CALL: ${options.generalCallTime}  |  WRAP: ${options.estWrapTime}`,
    marginX + contentWidth - 79,
    y + 44,
    { align: 'center' }
  );

  y += 66;

  // 2. LOGISTICS / SAFETY / KEY METRICS BOX
  doc.setFillColor(246, 247, 249);
  doc.setDrawColor(205, 210, 218);
  doc.setLineWidth(0.7);

  const infoColW = contentWidth / 2;
  const safetyLines = doc.splitTextToSize(
    `Hospital: ${options.nearestHospital}   |   Notes: ${options.weatherSafetyNotes}`,
    contentWidth - 16
  );
  const basecampLines = doc.splitTextToSize(`Basecamp / Parking: ${options.basecampNotes}`, infoColW - 14);
  const boxHeight = Math.max(40, 22 + safetyLines.length * 10 + basecampLines.length * 10);

  doc.rect(marginX, y, contentWidth, boxHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 34, 42);
  doc.text(
    `SCHEDULE TOTALS: ${day.sceneCount} Scenes  ·  ${day.totalPagesFormatted} Pages  ·  ${day.castCalls.length} Cast  ·  ${day.crewCalls.length} Crew`,
    marginX + 8,
    y + 13
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(60, 65, 75);
  doc.text(basecampLines, marginX + 8, y + 25);
  doc.text(safetyLines, marginX + 8, y + 25 + basecampLines.length * 10);

  y += boxHeight + 10;

  // 3. LOCATIONS SUMMARY
  drawSectionBar('Shooting Locations & Set List', `${day.locations.length} Location(s)`);
  if (day.locations.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('No scene locations assigned to this shooting day.', marginX + 6, y + 10);
    y += 18;
  } else {
    day.locations.forEach((loc, idx) => {
      ensureSpace(22);
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(marginX, y, contentWidth, 18, 'F');
      }
      doc.setDrawColor(225, 228, 232);
      doc.line(marginX, y + 18, marginX + contentWidth, y + 18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(25, 28, 34);
      doc.text(`${loc.location}`, marginX + 6, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(75, 82, 92);
      const setsLabel = `Sets: ${loc.sets.join(', ')}  ·  Scenes: ${loc.sceneNumbers.join(', ')}  ·  First Shoot: ${loc.firstCallTime || options.generalCallTime}`;
      doc.text(setsLabel, marginX + contentWidth - 6, y + 12, { align: 'right' });
      y += 18;
    });
    y += 8;
  }

  // 4. SHOOTING SCHEDULE (STRIPBOARD ORDER)
  drawSectionBar('Shooting Schedule (Stripboard Order)', `${day.sceneCount} Scenes · ${day.totalPagesFormatted} Pages`);

  const schedCols = [
    { label: 'TIME', width: 52 },
    { label: 'SC #', width: 34 },
    { label: 'I/E · D/N', width: 52 },
    { label: 'SET / LOCATION', width: 174 },
    { label: 'PAGES', width: 42 },
    { label: 'CAST', width: 92 },
    { label: 'NOTES', width: 102 },
  ];

  // Table header
  ensureSpace(24);
  doc.setFillColor(232, 235, 240);
  doc.rect(marginX, y, contentWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(40, 44, 52);
  let colX = marginX;
  schedCols.forEach((c) => {
    doc.text(c.label, colX + 4, y + 11);
    colX += c.width;
  });
  y += 16;

  day.scheduleRows.forEach((row, idx) => {
    if (row.kind === 'banner') {
      ensureSpace(18);
      doc.setFillColor(254, 243, 199);
      doc.rect(marginX, y, contentWidth, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(146, 64, 14);
      doc.text(
        `${row.timeLabel}  —  ${row.setName.toUpperCase()} (${row.duration})`,
        marginX + 6,
        y + 11
      );
      y += 16;
      return;
    }

    const setLocText = `${row.setName}\n${row.location}`;
    const setLines = doc.splitTextToSize(setLocText, schedCols[3].width - 8);
    const castLines = doc.splitTextToSize(
      row.characters.length > 0 ? row.characters.join(', ') : '-',
      schedCols[5].width - 8
    );
    const noteLines = doc.splitTextToSize(row.notes || '-', schedCols[6].width - 8);
    const maxLines = Math.max(setLines.length, castLines.length, noteLines.length, 1);
    const rowH = Math.max(18, maxLines * 9 + 8);

    ensureSpace(rowH);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 249, 251);
      doc.rect(marginX, y, contentWidth, rowH, 'F');
    }
    doc.setDrawColor(225, 228, 232);
    doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 34, 42);

    let cx = marginX;
    doc.setFont('helvetica', 'bold');
    doc.text(row.timeLabel, cx + 4, y + 11);
    cx += schedCols[0].width;

    doc.text(String(row.sceneNumber ?? '-'), cx + 4, y + 11);
    cx += schedCols[1].width;

    doc.setFont('helvetica', 'normal');
    doc.text(`${row.intExt} ${row.dayNight}`, cx + 4, y + 11);
    cx += schedCols[2].width;

    doc.text(setLines, cx + 4, y + 11);
    cx += schedCols[3].width;

    doc.text(row.pages, cx + 4, y + 11);
    cx += schedCols[4].width;

    doc.text(castLines, cx + 4, y + 11);
    cx += schedCols[5].width;

    doc.setTextColor(80, 85, 95);
    doc.text(noteLines, cx + 4, y + 11);

    y += rowH;
  });

  y += 12;

  // 5. CAST CALL TIMES
  drawSectionBar('Cast Call Times', `${day.castCalls.length} Principal / Supporting`);
  if (day.castCalls.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('No cast members assigned to this shooting day.', marginX + 6, y + 10);
    y += 20;
  } else {
    const castCols = [
      { label: 'CHARACTER', width: 105 },
      { label: 'TALENT NAME', width: 95 },
      { label: 'SCENES', width: 52 },
      { label: 'CALL', width: 42 },
      { label: 'WRAP', width: 42 },
      { label: 'PHONE', width: 88 },
      { label: 'WARDROBE / NOTES', width: 124 },
    ];

    ensureSpace(22);
    doc.setFillColor(232, 235, 240);
    doc.rect(marginX, y, contentWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(40, 44, 52);
    let cx = marginX;
    castCols.forEach((c) => {
      doc.text(c.label, cx + 4, y + 11);
      cx += c.width;
    });
    y += 16;

    day.castCalls.forEach((entry, idx) => {
      const m = entry.member;
      const charText = m.characterName || m.role;
      const charLines = doc.splitTextToSize(charText, castCols[0].width - 8);
      const noteText = [
        m.availabilityStatus !== 'Confirmed' ? `[${m.availabilityStatus}]` : '',
        m.scheduleNotes || '',
      ]
        .filter(Boolean)
        .join(' ');
      const noteLines = doc.splitTextToSize(noteText || '-', castCols[6].width - 8);
      const rowH = Math.max(18, Math.max(charLines.length, noteLines.length) * 9 + 8);

      ensureSpace(rowH);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 251);
        doc.rect(marginX, y, contentWidth, rowH, 'F');
      }
      doc.setDrawColor(225, 228, 232);
      doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH);

      let xPos = marginX;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(25, 28, 34);
      doc.text(charLines, xPos + 4, y + 11);
      xPos += castCols[0].width;

      doc.setFont('helvetica', 'normal');
      doc.text(m.name, xPos + 4, y + 11);
      xPos += castCols[1].width;

      doc.text(entry.scenesOnDay.length > 0 ? entry.scenesOnDay.join(', ') : 'All', xPos + 4, y + 11);
      xPos += castCols[2].width;

      doc.setFont('helvetica', 'bold');
      doc.text(m.callTime || options.generalCallTime, xPos + 4, y + 11);
      xPos += castCols[3].width;

      doc.setFont('helvetica', 'normal');
      doc.text(m.wrapTime || options.estWrapTime, xPos + 4, y + 11);
      xPos += castCols[4].width;

      doc.text(m.phone || '-', xPos + 4, y + 11);
      xPos += castCols[5].width;

      doc.setTextColor(75, 82, 92);
      doc.text(noteLines, xPos + 4, y + 11);

      y += rowH;
    });
    y += 12;
  }

  // 6. CREW CALL SHEET BY DEPARTMENT
  drawSectionBar('Department Crew Calls & Contacts', `${day.crewCalls.length} Crew Member(s)`);
  if (day.crewCalls.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('No crew members scheduled for this shooting day.', marginX + 6, y + 10);
    y += 20;
  } else {
    const crewCols = [
      { label: 'DEPARTMENT', width: 96 },
      { label: 'ROLE / TITLE', width: 112 },
      { label: 'NAME', width: 88 },
      { label: 'CALL', width: 38 },
      { label: 'WRAP', width: 38 },
      { label: 'PHONE / RADIO', width: 92 },
      { label: 'BASE / NOTES', width: 84 },
    ];

    ensureSpace(22);
    doc.setFillColor(232, 235, 240);
    doc.rect(marginX, y, contentWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(40, 44, 52);
    let cx = marginX;
    crewCols.forEach((c) => {
      doc.text(c.label, cx + 4, y + 11);
      cx += c.width;
    });
    y += 16;

    day.crewCalls.forEach((entry, idx) => {
      const m = entry.member;
      const roleLines = doc.splitTextToSize(m.role, crewCols[1].width - 8);
      const baseNote = [m.location, m.preferredContact ? `(${m.preferredContact})` : '']
        .filter(Boolean)
        .join(' ');
      const noteLines = doc.splitTextToSize(baseNote || '-', crewCols[6].width - 8);
      const rowH = Math.max(18, Math.max(roleLines.length, noteLines.length) * 9 + 8);

      ensureSpace(rowH);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 251);
        doc.rect(marginX, y, contentWidth, rowH, 'F');
      }
      doc.setDrawColor(225, 228, 232);
      doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH);

      let xPos = marginX;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(60, 65, 75);
      doc.text(m.department, xPos + 4, y + 11);
      xPos += crewCols[0].width;

      doc.setTextColor(25, 28, 34);
      doc.text(roleLines, xPos + 4, y + 11);
      xPos += crewCols[1].width;

      doc.setFont('helvetica', 'bold');
      doc.text(m.name, xPos + 4, y + 11);
      xPos += crewCols[2].width;

      doc.text(m.callTime || options.generalCallTime, xPos + 4, y + 11);
      xPos += crewCols[3].width;

      doc.setFont('helvetica', 'normal');
      doc.text(m.wrapTime || options.estWrapTime, xPos + 4, y + 11);
      xPos += crewCols[4].width;

      doc.text(m.phone || '-', xPos + 4, y + 11);
      xPos += crewCols[5].width;

      doc.setTextColor(75, 82, 92);
      doc.text(noteLines, xPos + 4, y + 11);

      y += rowH;
    });
  }

  // Add consistent page footer across all pages
  const totalPages = doc.getNumberOfPages();
  const timestamp = new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(210, 214, 220);
    doc.line(marginX, pageHeight - 30, marginX + contentWidth, pageHeight - 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 115, 125);
    doc.text(
      `${options.projectTitle} · Shoot Day ${day.dayNumber} (${day.dateText}) · Generated ${timestamp}`,
      marginX,
      pageHeight - 18
    );
    doc.text(`Page ${p} of ${totalPages}`, marginX + contentWidth, pageHeight - 18, {
      align: 'right',
    });
  }

  const safeTitle = options.projectTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Production';
  const filename = `${safeTitle}_Call_Sheet_Day_${day.dayNumber}.pdf`;
  const blob = doc.output('blob');

  return { blob, filename, doc };
};

export const formatCallSheetSummaryText = (
  day: CallSheetDayData,
  options: CallSheetOptions
): string => {
  const lines: string[] = [
    `${options.projectTitle.toUpperCase()} — DAILY CALL SHEET`,
    `Shoot Day ${day.dayNumber}: ${day.dateText}`,
    `General Crew Call: ${options.generalCallTime} | Est. Wrap: ${options.estWrapTime} | Pages: ${day.totalPagesFormatted}`,
    `Director: ${options.directorName} | 1st AD / LP: ${options.firstAdName} | Unit Phone: ${options.productionPhone}`,
    `Basecamp: ${options.basecampNotes}`,
    `Hospital: ${options.nearestHospital}`,
    '',
    'LOCATIONS:',
    ...day.locations.map(
      (l) => `- ${l.location} (Sc. ${l.sceneNumbers.join(', ')} @ ${l.firstCallTime || options.generalCallTime})`
    ),
    '',
    'SHOOTING SCHEDULE:',
    ...day.scheduleRows.map((r) =>
      r.kind === 'banner'
        ? `[${r.timeLabel}] ${r.setName}`
        : `[${r.timeLabel}] Sc. ${r.sceneNumber} (${r.intExt} ${r.dayNight}) ${r.setName} — ${r.pages} pgs | Cast: ${r.characters.join(', ') || 'None'}`
    ),
    '',
    'CAST CALLS:',
    ...day.castCalls.map(
      (c) =>
        `- ${c.member.characterName || c.member.role} (${c.member.name}): Call ${c.member.callTime || options.generalCallTime} / Wrap ${c.member.wrapTime || options.estWrapTime} · ${c.member.phone}`
    ),
    '',
    'CREW CALLS:',
    ...day.crewCalls.map(
      (c) =>
        `- ${c.member.department} | ${c.member.role} (${c.member.name}): Call ${c.member.callTime || options.generalCallTime} / Wrap ${c.member.wrapTime || options.estWrapTime} · ${c.member.phone}`
    ),
  ];

  return lines.join('\n');
};
