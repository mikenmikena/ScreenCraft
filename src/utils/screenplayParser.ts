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

    // Dialogue or Voice-over: previous element was Character or Parenthetical
    const lastElement = elements[elements.length - 1];
    if (lastElement && (lastElement.type === 'CHARACTER' || lastElement.type === 'PARENTHETICAL')) {
      let precedingChar: ScreenplayElement | undefined =
        lastElement.type === 'CHARACTER' ? lastElement : undefined;
      if (!precedingChar && elements.length >= 2 && elements[elements.length - 2].type === 'CHARACTER') {
        precedingChar = elements[elements.length - 2];
      }
      const isVoiceOverCue = Boolean(
        precedingChar && /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(precedingChar.text)
      );
      elements.push({
        id: `el-${elements.length + 1}`,
        type: isVoiceOverCue ? 'VOICE_OVER' : 'DIALOGUE',
        text: trimmed,
        character: precedingChar?.character,
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

  for (let i = 0; i < project.elements.length; i++) {
    const el = project.elements[i];
    if (el.type === 'SCENE_HEADING') {
      output += `\n${el.text}\n\n`;
    } else if (el.type === 'SHOT') {
      output += `${el.text}\n\n`;
    } else if (el.type === 'CHARACTER') {
      const nextEl = project.elements[i + 1];
      const nextAfterParen = nextEl?.type === 'PARENTHETICAL' ? project.elements[i + 2] : undefined;
      const followedByVO = nextEl?.type === 'VOICE_OVER' || nextAfterParen?.type === 'VOICE_OVER';
      const hasVO = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(el.text);
      output += `\n${followedByVO && !hasVO ? `${el.text} (V.O.)` : el.text}\n`;
    } else if (el.type === 'PARENTHETICAL') {
      output += `${el.text}\n`;
    } else if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') {
      const prevEl = project.elements[i - 1];
      if (el.type === 'VOICE_OVER' && prevEl?.type !== 'CHARACTER' && prevEl?.type !== 'PARENTHETICAL') {
        const speaker = (el.character || 'NARRATOR').toUpperCase();
        output += `\n${speaker} (V.O.)\n${el.text}\n\n`;
      } else {
        output += `${el.text}\n\n`;
      }
    } else if (el.type === 'TRANSITION') {
      output += `\n> ${el.text}\n\n`;
    } else if (el.type === 'NEW_ACT' || el.type === 'END_OF_ACT') {
      output += `\n> ${el.text.toUpperCase()} <\n\n`;
    } else if (el.type === 'OUTLINE_1') {
      output += `\n# ${el.text}\n\n`;
    } else if (el.type === 'OUTLINE_2') {
      output += `\n## ${el.text}\n\n`;
    } else if (el.type === 'OUTLINE_3') {
      output += `\n### ${el.text}\n\n`;
    } else if (el.type === 'SUMMARY') {
      output += `= ${el.text}\n\n`;
    } else if (el.type === 'NOTE') {
      output += `[[${el.text}]]\n\n`;
    } else {
      output += `${el.text}\n\n`;
    }
  }

  return output;
}

export interface ExportFdxOptions {
  includeSceneNumbers?: boolean;
  includeTitlePage?: boolean;
}

export function exportToFinalDraftFdx(
  project: StoryProject,
  options: ExportFdxOptions = {}
): string {
  const { includeSceneNumbers = true, includeTitlePage = true } = options;
  const sceneMap = new Map<string, Scene>();
  project.scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  let fdx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="4">
`;

  if (includeTitlePage) {
    fdx += `  <TitlePage>
    <Content>
      <Paragraph Alignment="Center" Type="Title">
        <Text>${escapeXml(project.title.toUpperCase())}</Text>
      </Paragraph>
      <Paragraph Alignment="Center" Type="Authors">
        <Text>Written by ${escapeXml(project.author)}</Text>
      </Paragraph>
    </Content>
  </TitlePage>
`;
  }

  fdx += `  <Content>
`;

  for (let i = 0; i < project.elements.length; i++) {
    const el = project.elements[i];
    const prevEl = i > 0 ? project.elements[i - 1] : undefined;
    const nextEl = i + 1 < project.elements.length ? project.elements[i + 1] : undefined;
    const nextAfterParen =
      nextEl?.type === 'PARENTHETICAL' ? project.elements[i + 2] : undefined;

    if (
      el.type === 'VOICE_OVER' &&
      prevEl?.type !== 'CHARACTER' &&
      prevEl?.type !== 'PARENTHETICAL'
    ) {
      const speaker = (el.character || 'NARRATOR').toUpperCase();
      fdx += `    <Paragraph Type="Character">
      <Text>${escapeXml(`${speaker} (V.O.)`)}</Text>
    </Paragraph>\n`;
    }

    let fdxType = 'Action';
    if (el.type === 'SCENE_HEADING') fdxType = 'Scene Heading';
    else if (el.type === 'CHARACTER') fdxType = 'Character';
    else if (el.type === 'DIALOGUE' || el.type === 'VOICE_OVER') fdxType = 'Dialogue';
    else if (el.type === 'PARENTHETICAL') fdxType = 'Parenthetical';
    else if (el.type === 'TRANSITION') fdxType = 'Transition';
    else if (el.type === 'SHOT') fdxType = 'Shot';
    else if (el.type === 'CAST_LIST') fdxType = 'Cast List';
    else if (el.type === 'NEW_ACT') fdxType = 'New Act';
    else if (el.type === 'END_OF_ACT') fdxType = 'End of Act';
    else if (el.type === 'OUTLINE_1') fdxType = 'Outline 1';
    else if (el.type === 'OUTLINE_2') fdxType = 'Outline 2';
    else if (el.type === 'OUTLINE_3') fdxType = 'Outline 3';
    else if (el.type === 'NOTE') fdxType = 'Note';
    else if (el.type === 'GENERAL' || el.type === 'SEQUENCE' || el.type === 'SUMMARY') fdxType = 'General';

    let outputText = el.text;
    if (el.type === 'CHARACTER') {
      const followedByVO =
        nextEl?.type === 'VOICE_OVER' || nextAfterParen?.type === 'VOICE_OVER';
      const hasVO = /\((V\.?O\.?|VOICE\s*OVER)\)/i.test(outputText);
      if (followedByVO && !hasVO) {
        outputText = `${outputText.trim()} (V.O.)`;
      }
    }

    const scene = el.sceneId ? sceneMap.get(el.sceneId) : undefined;
    const numberAttr =
      includeSceneNumbers && el.type === 'SCENE_HEADING' && scene
        ? ` Number="${scene.sceneNumber}"`
        : '';

    fdx += `    <Paragraph Type="${fdxType}"${numberAttr}>
      <Text>${escapeXml(outputText)}</Text>
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
