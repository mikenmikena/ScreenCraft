import { ScreenplayElement, Scene, ElementType, StoryProject } from '../types/story';

export function parseFountain(text: string): { elements: ScreenplayElement[]; scenes: Scene[] } {
  const lines = text.split('\n');
  const elements: ScreenplayElement[] = [];
  const scenes: Scene[] = [];

  let currentSceneNumber = 0;
  let currentSceneId = '';
  let cumulativeSeconds = 0;
  let sceneLineCount = 0;
  let sceneCharacters: Set<string> = new Set();
  let currentSceneHeading = '';
  let currentSceneSetting = '';
  let currentIntExt: 'INT' | 'EXT' | 'INT/EXT' = 'INT';
  let currentDayNight: 'DAY' | 'NIGHT' | 'EVENING' | 'DUSK' | 'DAWN' = 'DAY';

  function formatTimecode(totalSecs: number): string {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function eighthsToFraction(eighths: number): string {
    const whole = Math.floor(eighths / 8);
    const rem = eighths % 8;
    if (whole === 0 && rem === 0) return '1/8';
    if (whole === 0) return `${rem}/8`;
    if (rem === 0) return `${whole}`;
    return `${whole} ${rem}/8`;
  }

  function finalizeScene() {
    if (currentSceneId && currentSceneHeading) {
      const calculatedEighths = Math.max(1, Math.round((sceneLineCount / 55) * 8));
      const duration = Math.max(15, Math.round((calculatedEighths / 8) * 60));
      scenes.push({
        id: currentSceneId,
        sceneNumber: currentSceneNumber,
        heading: currentSceneHeading,
        setting: currentSceneSetting || 'MAIN SET',
        intExt: currentIntExt,
        dayNight: currentDayNight,
        timecode: formatTimecode(cumulativeSeconds),
        durationSec: duration,
        pages: eighthsToFraction(calculatedEighths),
        eighths: calculatedEighths,
        characters: Array.from(sceneCharacters),
        synopsis: `Scene ${currentSceneNumber} at ${currentSceneSetting}`,
        notes: '',
        budget: '$10,000',
        location: currentSceneSetting,
        act: currentSceneNumber <= 3 ? 1 : currentSceneNumber <= 7 ? 2 : 3,
        storyDay: Math.ceil(currentSceneNumber / 4),
        timeOfDay: currentDayNight === 'NIGHT' ? '21:00' : '09:00',
      });
      cumulativeSeconds += duration;
      sceneLineCount = 0;
      sceneCharacters = new Set();
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;
    sceneLineCount++;

    // Scene Heading check: starts with INT, EXT, INT./EXT, etc.
    const headingMatch = trimmed.match(/^(?:(?:INT|EXT|INT\/EXT|EXT\/INT|I\/E)[\.\s]|(?:[0-9]+\.\s*(?:INT|EXT)))/i);
    if (headingMatch) {
      finalizeScene();
      currentSceneNumber++;
      currentSceneId = `scene-${currentSceneNumber}-${Date.now()}`;
      currentSceneHeading = trimmed.toUpperCase();

      const isExt = trimmed.toUpperCase().includes('EXT');
      const isIntExt = trimmed.toUpperCase().includes('INT/EXT') || trimmed.toUpperCase().includes('I/E');
      currentIntExt = isIntExt ? 'INT/EXT' : isExt ? 'EXT' : 'INT';

      if (trimmed.toUpperCase().includes('NIGHT')) currentDayNight = 'NIGHT';
      else if (trimmed.toUpperCase().includes('DUSK')) currentDayNight = 'DUSK';
      else if (trimmed.toUpperCase().includes('DAWN')) currentDayNight = 'DAWN';
      else if (trimmed.toUpperCase().includes('EVENING')) currentDayNight = 'EVENING';
      else currentDayNight = 'DAY';

      const parts = trimmed.split(/[-–—]/);
      if (parts.length > 1) {
        currentSceneSetting = parts[0].replace(/^(INT|EXT|INT\/EXT|I\/E)[\.\s]*/i, '').trim().toUpperCase();
      } else {
        currentSceneSetting = trimmed.replace(/^(INT|EXT|INT\/EXT|I\/E)[\.\s]*/i, '').trim().toUpperCase();
      }

      elements.push({
        id: `el-${elements.length + 1}`,
        type: 'SCENE_HEADING',
        text: currentSceneHeading,
        sceneId: currentSceneId,
      });
      continue;
    }

    // Shot check (e.g., "1. 3 XMS" or starts with "SHOT:" or "ANGLE ON" or "CLOSE UP")
    const shotMatch = trimmed.match(/^([0-9]+)\.\s+([0-9A-Z\s\/\-]+)$/);
    if (shotMatch && trimmed.length < 30) {
      elements.push({
        id: `el-${elements.length + 1}`,
        type: 'SHOT',
        text: trimmed,
        shotNumber: shotMatch[1],
        shotType: shotMatch[2],
        sceneId: currentSceneId,
      });
      continue;
    }

    // Transition (e.g. CUT TO:, FADE OUT., DISSOLVE TO:)
    if (trimmed.endsWith(':') && (trimmed.startsWith('CUT') || trimmed.startsWith('FADE') || trimmed.startsWith('DISSOLVE') || trimmed.startsWith('SMASH'))) {
      elements.push({
        id: `el-${elements.length + 1}`,
        type: 'TRANSITION',
        text: trimmed.toUpperCase(),
        sceneId: currentSceneId,
      });
      continue;
    }

    // Character check: all caps, not ending with punctuation other than (V.O.) or (O.S.)
    const isCharacter =
      trimmed === trimmed.toUpperCase() &&
      trimmed.length < 35 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(':') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().length > 0;

    if (isCharacter) {
      const charName = trimmed.replace(/\s*\([^)]*\)$/, '').trim();
      sceneCharacters.add(charName);
      elements.push({
        id: `el-${elements.length + 1}`,
        type: 'CHARACTER',
        text: trimmed,
        character: charName,
        sceneId: currentSceneId,
      });
      continue;
    }

    // Parenthetical: starts with ( and ends with )
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      elements.push({
        id: `el-${elements.length + 1}`,
        type: 'PARENTHETICAL',
        text: trimmed,
        sceneId: currentSceneId,
      });
      continue;
    }

    // Dialogue: previous element was Character or Parenthetical
    const lastElement = elements[elements.length - 1];
    if (lastElement && (lastElement.type === 'CHARACTER' || lastElement.type === 'PARENTHETICAL')) {
      elements.push({
        id: `el-${elements.length + 1}`,
        type: 'DIALOGUE',
        text: trimmed,
        sceneId: currentSceneId,
      });
      continue;
    }

    // Default: Action
    elements.push({
      id: `el-${elements.length + 1}`,
      type: 'ACTION',
      text: trimmed,
      sceneId: currentSceneId,
    });
  }

  finalizeScene();
  return { elements, scenes };
}

export function serializeToFountain(project: StoryProject): string {
  let output = `Title: ${project.title}\nCredit: Written by\nAuthor: ${project.author}\n\n`;

  for (const el of project.elements) {
    if (el.type === 'SCENE_HEADING') {
      output += `\n${el.text}\n\n`;
    } else if (el.type === 'SHOT') {
      output += `${el.text}\n\n`;
    } else if (el.type === 'CHARACTER') {
      output += `\n${el.text}\n`;
    } else if (el.type === 'PARENTHETICAL') {
      output += `${el.text}\n`;
    } else if (el.type === 'DIALOGUE') {
      output += `${el.text}\n\n`;
    } else if (el.type === 'TRANSITION') {
      output += `\n> ${el.text}\n\n`;
    } else {
      output += `${el.text}\n\n`;
    }
  }

  return output;
}

export function exportToFinalDraftFdx(project: StoryProject): string {
  let fdx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph Type="General">
      <Text>${project.title}</Text>
    </Paragraph>
`;

  for (const el of project.elements) {
    let fdxType = 'Action';
    if (el.type === 'SCENE_HEADING') fdxType = 'Scene Heading';
    else if (el.type === 'CHARACTER') fdxType = 'Character';
    else if (el.type === 'DIALOGUE') fdxType = 'Dialogue';
    else if (el.type === 'PARENTHETICAL') fdxType = 'Parenthetical';
    else if (el.type === 'TRANSITION') fdxType = 'Transition';
    else if (el.type === 'SHOT') fdxType = 'Shot';

    const safeText = el.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    fdx += `    <Paragraph Type="${fdxType}">
      <Text>${safeText}</Text>
    </Paragraph>\n`;
  }

  fdx += `  </Content>
</FinalDraft>`;
  return fdx;
}

export function exportScheduleCsv(project: StoryProject): string {
  let csv = 'Scene Number,INT/EXT,Day/Night,Set/Location,Running Time,Pages (8ths),Story Day,Scheduled Duration,Cast,Time of Day\n';

  for (const strip of project.strips) {
    if (strip.type === 'scene') {
      const cast = strip.characters ? `"${strip.characters.join('; ')}"` : '""';
      csv += `${strip.sceneNumber || ''},${strip.intExt || ''},${strip.dayNight || ''},"${strip.set || ''}",${strip.runningTime || ''},"${strip.pages || ''}",${strip.storyDay || ''},${strip.scheduledDuration || ''},${cast},${strip.timeOfDay || ''}\n`;
    } else if (strip.type === 'day_break') {
      csv += `--- ${strip.bannerTitle || 'DAY BREAK'} ---,${strip.bannerDate || ''},,,,${strip.bannerTotalPages || ''},,From: ${strip.bannerFrom} To: ${strip.bannerTo},\n`;
    }
  }

  return csv;
}
