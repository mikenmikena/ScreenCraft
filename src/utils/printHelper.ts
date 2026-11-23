import { jsPDF } from 'jspdf';
import { StoryboardFrame, StoryProject } from '../types/story';
import { ExportPreviewOptions } from './exportPreviewFormatter';
import {
  buildScreenplayPrintableHtml,
  downloadScreenplayPdf,
  triggerBlobDownload,
} from './screenplayPdfGenerator';

export interface PrintExecutionResult {
  printed: boolean;
  blockedByEnvironment: boolean;
  fallbackPdfFilename?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function printHtmlDocument(html: string): PrintExecutionResult {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  };

  try {
    const cw = iframe.contentWindow;
    const doc = iframe.contentDocument || cw?.document;
    if (!cw || !doc) {
      cleanup();
      return { printed: false, blockedByEnvironment: true };
    }

    doc.open();
    doc.write(html);
    doc.close();

    let beforePrintFired = false;
    const onBeforePrint = () => {
      beforePrintFired = true;
    };
    cw.addEventListener('beforeprint', onBeforePrint);
    cw.addEventListener('afterprint', cleanup, { once: true });

    const start = performance.now();
    cw.focus();
    cw.print();
    const elapsed = performance.now() - start;

    cw.removeEventListener('beforeprint', onBeforePrint);

    // If a sandboxed iframe suppressed window.print(), it returns immediately without firing beforeprint
    if (!beforePrintFired && elapsed < 25) {
      cleanup();
      return { printed: false, blockedByEnvironment: true };
    }

    setTimeout(cleanup, 60_000);
    return { printed: true, blockedByEnvironment: false };
  } catch {
    cleanup();
    return { printed: false, blockedByEnvironment: true };
  }
}

export function printScreenplayDocument(
  project: StoryProject,
  options: ExportPreviewOptions = {
    includeTitlePage: true,
    includeSceneNumbers: true,
    includePageNumbers: true,
  },
  autoDownloadPdfFallback = true
): PrintExecutionResult {
  const html = buildScreenplayPrintableHtml(project, options);
  const res = printHtmlDocument(html);
  if (!res.printed && autoDownloadPdfFallback) {
    const pdfRes = downloadScreenplayPdf(project, options);
    return {
      printed: false,
      blockedByEnvironment: res.blockedByEnvironment,
      fallbackPdfFilename: pdfRes.filename,
    };
  }
  return res;
}

export function downloadReportPdf(
  project: StoryProject,
  activeReport: 'cast' | 'locations' | 'schedule'
): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Production Report — ${project.title}`, 44, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const reportLabel =
    activeReport === 'cast'
      ? 'Cast Breakdown'
      : activeReport === 'locations'
      ? 'Locations & Sets'
      : 'Shooting Day Summary';
  doc.text(`${reportLabel} · ${project.scenes.length} Scenes`, 44, y);
  y += 16;
  doc.setDrawColor(200, 200, 200);
  doc.line(44, y, pageWidth - 44, y);
  y += 22;
  doc.setTextColor(0, 0, 0);

  const ensureSpace = (needed = 24) => {
    if (y + needed > 745) {
      doc.addPage('letter', 'portrait');
      y = 52;
    }
  };

  if (activeReport === 'cast') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CHARACTER', 44, y);
    doc.text('ACTOR', 230, y);
    doc.text('SCENES', 420, y);
    doc.text('LINES', 500, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    project.characters.forEach((char) => {
      ensureSpace();
      doc.text(char.name, 44, y);
      doc.text(char.actor || 'Pending Audition', 230, y);
      doc.text(String(char.scenesCount), 420, y);
      doc.text(String(char.speakingLines), 500, y);
      y += 16;
    });
  } else if (activeReport === 'locations') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SCENE #', 44, y);
    doc.text('SETTING / LOCATION', 110, y);
    doc.text('INT/EXT · TIME', 370, y);
    doc.text('PAGES', 500, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    project.scenes.forEach((sc) => {
      ensureSpace();
      doc.text(`#${sc.sceneNumber}`, 44, y);
      doc.text((sc.setting || sc.heading).slice(0, 40), 110, y);
      doc.text(`${sc.intExt} / ${sc.dayNight}`, 370, y);
      doc.text(sc.pages || '—', 500, y);
      y += 16;
    });
  } else {
    const dayBreaks = project.strips.filter((s) => s.type === 'day_break');
    dayBreaks.forEach((db) => {
      ensureSpace(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${db.bannerTitle || 'Shoot Day'} (${db.bannerDate || 'TBD'})`, 44, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        `Pages: ${db.bannerTotalPages || '—'} · Call: ${db.bannerFrom || '—'} · Wrap: ${db.bannerTo || '—'}`,
        44,
        y
      );
      y += 22;
    });
  }

  const safeTitle = (project.title || 'Project').replace(/[^a-z0-9]+/gi, '_');
  const filename = `${safeTitle}_${activeReport}_report.pdf`;
  triggerBlobDownload(doc.output('blob'), filename);
  return filename;
}

export function printReportDocument(
  project: StoryProject,
  activeReport: 'cast' | 'locations' | 'schedule'
): PrintExecutionResult {
  const totalEighths = project.scenes.reduce((acc, s) => acc + s.eighths, 0);
  const totalPages = (totalEighths / 8).toFixed(1);

  let bodyHtml = '';
  if (activeReport === 'cast') {
    const rows = project.characters
      .map(
        (c) => `<tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${escapeHtml(c.actor || 'Pending Audition')}</td>
          <td>${c.scenesCount} scenes</td>
          <td>${c.speakingLines} lines</td>
        </tr>`
      )
      .join('');
    bodyHtml = `<h2>Cast Breakdown (${project.characters.length} Speaking Roles · ${totalPages} Script Pages)</h2>
      <table><thead><tr><th>Character</th><th>Actor</th><th>Scenes</th><th>Lines</th></tr></thead><tbody>${rows}</tbody></table>`;
  } else if (activeReport === 'locations') {
    const rows = project.scenes
      .map(
        (s) => `<tr>
          <td>#${s.sceneNumber}</td>
          <td>${escapeHtml(s.setting || s.heading)}</td>
          <td>${escapeHtml(s.intExt)} / ${escapeHtml(s.dayNight)}</td>
          <td>${escapeHtml(s.pages)} pgs</td>
        </tr>`
      )
      .join('');
    bodyHtml = `<h2>Locations & Sets (${project.scenes.length} Scenes)</h2>
      <table><thead><tr><th>Scene</th><th>Setting</th><th>INT/EXT · Time</th><th>Pages</th></tr></thead><tbody>${rows}</tbody></table>`;
  } else {
    const rows = project.strips
      .filter((s) => s.type === 'day_break')
      .map(
        (db) => `<tr>
          <td><strong>${escapeHtml(db.bannerTitle || 'Shoot Day')}</strong></td>
          <td>${escapeHtml(db.bannerDate || '—')}</td>
          <td>${escapeHtml(db.bannerTotalPages || '—')}</td>
          <td>${escapeHtml(db.bannerFrom || '—')} – ${escapeHtml(db.bannerTo || '—')}</td>
        </tr>`
      )
      .join('');
    bodyHtml = `<h2>Shooting Day Summary</h2>
      <table><thead><tr><th>Shoot Day</th><th>Date</th><th>Total Pages</th><th>Call – Wrap</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(
    project.title
  )} Report</title>
  <style>
    @page { size: letter portrait; margin: 0.6in; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; margin: 0; font-size: 11pt; }
    h1 { font-size: 16pt; margin: 0 0 4pt 0; }
    h2 { font-size: 12pt; margin: 14pt 0 8pt 0; color: #333; }
    .meta { font-size: 9pt; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 8pt; margin-bottom: 12pt; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th, td { border: 1px solid #ddd; padding: 6pt 8pt; text-align: left; }
    th { background: #f3f3f3; }
  </style></head><body>
    <h1>${escapeHtml(project.title)} — Production Report</h1>
    <div class="meta">Author: ${escapeHtml(project.author)} · ${project.scenes.length} Scenes · ${totalPages} Script Pages</div>
    ${bodyHtml}
  </body></html>`;

  const res = printHtmlDocument(html);
  if (!res.printed) {
    const filename = downloadReportPdf(project, activeReport);
    return {
      printed: false,
      blockedByEnvironment: res.blockedByEnvironment,
      fallbackPdfFilename: filename,
    };
  }
  return res;
}

export function printStoryboardDocument(
  project: StoryProject,
  frames: StoryboardFrame[]
): PrintExecutionResult {
  const sceneMap = new Map(project.scenes.map((s) => [s.id, s]));
  const cardsHtml = frames
    .map((f) => {
      const sc = sceneMap.get(f.sceneId);
      const img = f.drawingData || f.imageUrl;
      return `<div class="card">
        <div class="card-head">
          <span><strong>Shot ${escapeHtml(f.shotNumber)}</strong> · ${escapeHtml(f.shotType)}</span>
          <span>Sc. ${sc?.sceneNumber ?? '—'} · ${escapeHtml(f.lens)} · ${escapeHtml(f.aspectRatio)}</span>
        </div>
        ${
          img
            ? `<img src="${escapeHtml(img)}" alt="Shot ${escapeHtml(f.shotNumber)}" class="frame-img" />`
            : `<div class="frame-placeholder">No sketch or reference plate attached</div>`
        }
        <p class="desc">${escapeHtml(f.description || 'No action description')}</p>
        ${f.dialogue ? `<p class="sub"><strong>Dialogue:</strong> ${escapeHtml(f.dialogue)}</p>` : ''}
        ${f.audioNotes ? `<p class="sub"><strong>Audio / Sound:</strong> ${escapeHtml(f.audioNotes)}</p>` : ''}
      </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(
    project.title
  )} Storyboard</title>
  <style>
    @page { size: letter portrait; margin: 0.5in; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; margin: 0; font-size: 10pt; }
    h1 { font-size: 15pt; margin: 0 0 4pt 0; }
    .meta { font-size: 9pt; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 6pt; margin-bottom: 12pt; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12pt; }
    .card { border: 1px solid #bbb; border-radius: 4pt; padding: 8pt; break-inside: avoid; page-break-inside: avoid; }
    .card-head { display: flex; justify-content: space-between; font-size: 8.5pt; margin-bottom: 6pt; border-bottom: 1px solid #eee; padding-bottom: 4pt; }
    .frame-img { width: 100%; height: 145pt; object-fit: cover; border: 1px solid #ddd; margin-bottom: 6pt; }
    .frame-placeholder { width: 100%; height: 110pt; display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #777; border: 1px dashed #ccc; margin-bottom: 6pt; font-size: 9pt; }
    .desc { margin: 0 0 4pt 0; font-size: 9pt; }
    .sub { margin: 2pt 0 0 0; font-size: 8pt; color: #444; }
  </style></head><body>
    <h1>${escapeHtml(project.title)} — Storyboard Sheet</h1>
    <div class="meta">${frames.length} Shot Frames · Author: ${escapeHtml(project.author)}</div>
    <div class="grid">${cardsHtml}</div>
  </body></html>`;

  const res = printHtmlDocument(html);
  if (!res.printed) {
    // Fallback PDF summary for storyboards
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${project.title} — Storyboard Sheet (${frames.length} Shots)`, 42, 48);
    let y = 78;
    frames.forEach((f) => {
      if (y > 720) {
        doc.addPage('letter', 'portrait');
        y = 48;
      }
      const sc = sceneMap.get(f.sceneId);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(
        `Shot ${f.shotNumber} | Sc. ${sc?.sceneNumber ?? '—'} | ${f.shotType} | ${f.cameraMovement} | ${f.lens}`,
        42,
        y
      );
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(f.description || 'No description', 520) as string[];
      lines.forEach((line) => {
        doc.text(line, 42, y);
        y += 12;
      });
      y += 10;
    });
    const safeTitle = (project.title || 'Storyboard').replace(/[^a-z0-9]+/gi, '_');
    const filename = `${safeTitle}_Storyboards.pdf`;
    triggerBlobDownload(doc.output('blob'), filename);
    return {
      printed: false,
      blockedByEnvironment: res.blockedByEnvironment,
      fallbackPdfFilename: filename,
    };
  }
  return res;
}
