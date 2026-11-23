import { jsPDF } from 'jspdf';
import { StoryProject } from '../types/story';
import {
  ExportPreviewOptions,
  PaginatedScriptBlock,
  PaginatedScriptPage,
  paginateScreenplayForExport,
} from './exportPreviewFormatter';

export interface ScreenplayPdfResult {
  blob: Blob;
  filename: string;
  doc: jsPDF;
  pageCount: number;
  byteSize: number;
}

const sanitizeFileName = (title: string): string => {
  const cleaned = title
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Screenplay';
};

const formatEighthsLabel = (eighths: number): string => {
  if (eighths <= 0) return '0/8';
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function generateScreenplayPdf(
  project: StoryProject,
  options: ExportPreviewOptions
): ScreenplayPdfResult {
  const layout = project.editorTypography?.pageLayout || 'letter';
  const format: 'letter' | 'a4' = layout === 'a4' ? 'a4' : 'letter';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { pages } = paginateScreenplayForExport(project, options);

  const leftMargin = layout === 'compact' ? 1.1 : 1.5;
  const rightMargin = layout === 'compact' ? 0.85 : 1.0;
  const topMargin = 0.85;
  const lineHeight = 0.168; // ~12pt Courier industry vertical rhythm (54 lines fit inside 11in)

  let isFirstPdfPage = true;

  // 1. Optional Title Page
  if (options.includeTitlePage) {
    isFirstPdfPage = false;
    doc.setFont('courier', 'normal');
    doc.setTextColor(0, 0, 0);

    // Top subtle label
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('SCREENPLAY · TITLE PAGE', leftMargin, 0.75);
    doc.text('COVER SHEET', pageWidth - rightMargin, 0.75, { align: 'right' });
    doc.setDrawColor(210, 210, 210);
    doc.line(leftMargin, 0.85, pageWidth - rightMargin, 0.85);

    // Centered Title & Author
    doc.setTextColor(0, 0, 0);
    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    const titleUpper = (project.title || 'UNTITLED SCREENPLAY').toUpperCase();
    const titleLines = doc.splitTextToSize(titleUpper, pageWidth - 2.4) as string[];
    let titleY = pageHeight * 0.42 - (titleLines.length - 1) * 0.14;
    titleLines.forEach((line) => {
      doc.text(line, pageWidth / 2, titleY, { align: 'center' });
      const textWidth = doc.getTextWidth(line);
      doc.setDrawColor(0, 0, 0);
      doc.line(
        pageWidth / 2 - textWidth / 2,
        titleY + 0.04,
        pageWidth / 2 + textWidth / 2,
        titleY + 0.04
      );
      titleY += 0.28;
    });

    doc.setFont('courier', 'normal');
    doc.setFontSize(12);
    doc.text('Written by', pageWidth / 2, titleY + 0.25, { align: 'center' });

    doc.setFont('courier', 'bold');
    doc.text(project.author || 'Screenwriter', pageWidth / 2, titleY + 0.55, {
      align: 'center',
    });

    if (project.activeDraftName) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `${project.activeDraftName}${project.lastModified ? ` · ${project.lastModified}` : ''}`,
        pageWidth / 2,
        titleY + 0.95,
        { align: 'center' }
      );
    }

    // Bottom metadata footer
    const eighthsTotal = project.scenes.reduce((acc, s) => acc + (s.eighths || 0), 0);
    doc.setDrawColor(210, 210, 210);
    doc.line(leftMargin, pageHeight - 1.15, pageWidth - rightMargin, pageHeight - 1.15);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `${project.scenes.length} Scenes · ${formatEighthsLabel(eighthsTotal)} Pages`,
      leftMargin,
      pageHeight - 0.92
    );
    doc.text(project.author || '', pageWidth - rightMargin, pageHeight - 0.92, {
      align: 'right',
    });
  }

  // 2. Paginated Script Pages
  const renderBlockOnPdf = (
    block: PaginatedScriptBlock,
    cursorY: number
  ): number => {
    let y = cursorY + block.spaceBefore * lineHeight;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    if (block.type === 'SCENE_HEADING') {
      doc.setFont('courier', 'bold');
      if (options.includeSceneNumbers && block.sceneNumber !== undefined) {
        doc.text(String(block.sceneNumber), leftMargin - 0.55, y);
        doc.text(String(block.sceneNumber), pageWidth - rightMargin + 0.25, y);
      }
      block.lines.forEach((line) => {
        doc.text(line, leftMargin, y);
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'CHARACTER') {
      doc.setFont('courier', 'bold');
      const charX = Math.min(pageWidth - 2.6, leftMargin + 2.2);
      block.lines.forEach((line) => {
        doc.text(line, charX, y);
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'PARENTHETICAL') {
      doc.setFont('courier', 'normal');
      const parenX = Math.min(pageWidth - 3.0, leftMargin + 1.6);
      block.lines.forEach((line) => {
        doc.text(line, parenX, y);
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'DIALOGUE' || block.type === 'VOICE_OVER') {
      doc.setFont('courier', block.type === 'VOICE_OVER' ? 'italic' : 'normal');
      const dialX = Math.min(pageWidth - 3.6, leftMargin + 1.0);
      block.lines.forEach((line) => {
        doc.text(line, dialX, y);
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'TRANSITION') {
      doc.setFont('courier', 'bold');
      block.lines.forEach((line) => {
        doc.text(line, pageWidth - rightMargin, y, { align: 'right' });
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'SHOT') {
      doc.setFont('courier', 'bold');
      block.lines.forEach((line) => {
        doc.text(line, leftMargin, y);
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'NEW_ACT' || block.type === 'END_OF_ACT') {
      doc.setFont('courier', 'bold');
      block.lines.forEach((line) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        const tw = doc.getTextWidth(line);
        doc.setDrawColor(0, 0, 0);
        doc.line(pageWidth / 2 - tw / 2, y + 0.03, pageWidth / 2 + tw / 2, y + 0.03);
        y += lineHeight;
      });
      return y + block.spaceAfter * lineHeight;
    }

    if (block.type === 'NOTE') {
      const boxHeight = Math.max(1, block.lines.length) * lineHeight + 0.12;
      doc.setFillColor(254, 249, 231);
      doc.setDrawColor(229, 198, 120);
      doc.roundedRect(
        leftMargin - 0.08,
        y - 0.13,
        pageWidth - leftMargin - rightMargin + 0.16,
        boxHeight,
        0.04,
        0.04,
        'FD'
      );
      doc.setFont('courier', 'italic');
      doc.setTextColor(120, 72, 12);
      block.lines.forEach((line, idx) => {
        const prefix = idx === 0 ? '[[NOTE: ' : '';
        const suffix = idx === block.lines.length - 1 ? ']]' : '';
        doc.text(`${prefix}${line}${suffix}`, leftMargin, y);
        y += lineHeight;
      });
      doc.setTextColor(0, 0, 0);
      return y + block.spaceAfter * lineHeight;
    }

    // ACTION / GENERAL / SEQUENCE / CAST_LIST / OUTLINE_* / SUMMARY
    const isBold = block.type === 'SEQUENCE' || block.type === 'OUTLINE_1';
    const isItalic = block.type === 'SUMMARY' || block.type === 'OUTLINE_3';
    doc.setFont('courier', isBold ? 'bold' : isItalic ? 'italic' : 'normal');
    if (isItalic) {
      doc.setTextColor(70, 70, 70);
    }
    block.lines.forEach((line) => {
      doc.text(line, leftMargin, y);
      y += lineHeight;
    });
    doc.setTextColor(0, 0, 0);
    return y + block.spaceAfter * lineHeight;
  };

  pages.forEach((page: PaginatedScriptPage) => {
    if (isFirstPdfPage) {
      isFirstPdfPage = false;
    } else {
      doc.addPage(format, 'portrait');
    }

    // Page number header (Hollywood standard omits page 1 number)
    if (options.includePageNumbers && page.pageNumber > 1) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`${page.pageNumber}.`, pageWidth - rightMargin, 0.52, { align: 'right' });
    }

    let y = topMargin;
    if (page.blocks.length === 0) {
      doc.setFont('courier', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(130, 130, 130);
      doc.text('This project currently has no screenplay elements.', leftMargin, y);
      doc.setTextColor(0, 0, 0);
      return;
    }

    for (const block of page.blocks) {
      y = renderBlockOnPdf(block, y);
      if (y > pageHeight - 0.65) {
        break;
      }
    }
  });

  const blob = doc.output('blob');
  const filename = `${sanitizeFileName(project.title)}.pdf`;
  const totalPages = doc.getNumberOfPages();

  return {
    blob,
    filename,
    doc,
    pageCount: totalPages,
    byteSize: blob.size,
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 4000);
}

export function downloadScreenplayPdf(
  project: StoryProject,
  options: ExportPreviewOptions
): ScreenplayPdfResult {
  const result = generateScreenplayPdf(project, options);
  triggerBlobDownload(result.blob, result.filename);
  return result;
}

export function buildScreenplayPrintableHtml(
  project: StoryProject,
  options: ExportPreviewOptions
): string {
  const layout = project.editorTypography?.pageLayout || 'letter';
  const pageSizeCss = layout === 'a4' ? 'A4 portrait' : 'letter portrait';
  const { pages } = paginateScreenplayForExport(project, options);
  const eighthsTotal = project.scenes.reduce((acc, s) => acc + (s.eighths || 0), 0);

  const renderBlockHtml = (block: PaginatedScriptBlock): string => {
    const content = escapeHtml(block.lines.join('\n'));
    const mt = block.spaceBefore > 0 ? `${(block.spaceBefore * 1.05).toFixed(2)}em` : '0';
    const mb = block.spaceAfter > 0 ? `${(block.spaceAfter * 1.0).toFixed(2)}em` : '0';

    if (block.type === 'SCENE_HEADING') {
      const leftNum =
        options.includeSceneNumbers && block.sceneNumber !== undefined
          ? `<span class="sc-num-left">${block.sceneNumber}</span>`
          : '';
      const rightNum =
        options.includeSceneNumbers && block.sceneNumber !== undefined
          ? `<span class="sc-num-right">${block.sceneNumber}</span>`
          : '';
      return `<div class="blk blk-heading" style="margin-top:${mt};margin-bottom:${mb}">${leftNum}<span class="blk-text">${content}</span>${rightNum}</div>`;
    }
    if (block.type === 'CHARACTER') {
      return `<div class="blk blk-char" style="margin-top:${mt};margin-bottom:0.1em">${content}</div>`;
    }
    if (block.type === 'PARENTHETICAL') {
      return `<div class="blk blk-paren">${content}</div>`;
    }
    if (block.type === 'DIALOGUE' || block.type === 'VOICE_OVER') {
      const cls = block.type === 'VOICE_OVER' ? 'blk blk-dialogue blk-vo' : 'blk blk-dialogue';
      return `<div class="${cls}" style="margin-bottom:${mb}">${content}</div>`;
    }
    if (block.type === 'TRANSITION') {
      return `<div class="blk blk-transition" style="margin-top:${mt};margin-bottom:${mb}">${content}</div>`;
    }
    if (block.type === 'SHOT') {
      return `<div class="blk blk-shot" style="margin-top:${mt};margin-bottom:${mb}">${content}</div>`;
    }
    if (block.type === 'NEW_ACT' || block.type === 'END_OF_ACT') {
      return `<div class="blk blk-act" style="margin-top:${mt};margin-bottom:${mb}">${content}</div>`;
    }
    if (block.type === 'NOTE') {
      return `<div class="blk blk-note" style="margin-top:${mt};margin-bottom:${mb}">[[NOTE: ${content}]]</div>`;
    }
    const extraCls =
      block.type === 'SEQUENCE' || block.type === 'OUTLINE_1'
        ? ' blk-bold'
        : block.type === 'SUMMARY' || block.type === 'OUTLINE_3'
        ? ' blk-italic'
        : '';
    return `<div class="blk blk-action${extraCls}" style="margin-top:${mt};margin-bottom:${mb}">${content}</div>`;
  };

  const titleSheetHtml = options.includeTitlePage
    ? `<section class="sheet title-sheet">
        <div class="title-top">
          <span>SCREENPLAY · TITLE PAGE</span>
          <span>COVER SHEET</span>
        </div>
        <div class="title-center">
          <h1>${escapeHtml(project.title || 'UNTITLED SCREENPLAY')}</h1>
          <p class="written-by">Written by</p>
          <p class="author">${escapeHtml(project.author || 'Screenwriter')}</p>
          ${
            project.activeDraftName
              ? `<p class="draft-meta">${escapeHtml(project.activeDraftName)} · ${escapeHtml(
                  project.lastModified || ''
                )}</p>`
              : ''
          }
        </div>
        <div class="title-bottom">
          <span>${project.scenes.length} Scenes · ${escapeHtml(formatEighthsLabel(eighthsTotal))} Pages</span>
          <span>${escapeHtml(project.author || '')}</span>
        </div>
      </section>`
    : '';

  const pagesHtml = pages
    .map((page) => {
      const pageNumHtml =
        options.includePageNumbers && page.pageNumber > 1
          ? `<div class="page-num">${page.pageNumber}.</div>`
          : `<div class="page-num">&nbsp;</div>`;
      const blocksHtml =
        page.blocks.length === 0
          ? `<p class="empty-note">This project currently has no screenplay elements.</p>`
          : page.blocks.map(renderBlockHtml).join('');
      return `<section class="sheet script-sheet">
        ${pageNumHtml}
        <div class="script-body">${blocksHtml}</div>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(project.title || 'Screenplay')} — Print</title>
  <style>
    @page { size: ${pageSizeCss}; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier Prime', 'Courier New', Courier, monospace;
      font-size: 12pt;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: ${layout === 'a4' ? '210mm' : '8.5in'};
      min-height: ${layout === 'a4' ? '297mm' : '11in'};
      padding: ${layout === 'compact' ? '0.75in 0.85in 0.75in 1.1in' : '0.75in 1.0in 0.75in 1.5in'};
      margin: 0 auto;
      background: #ffffff;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .title-sheet {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1in;
    }
    .title-top, .title-bottom {
      display: flex;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 9pt;
      color: #555555;
      border-bottom: 1px solid #d4d4d4;
      padding-bottom: 6pt;
    }
    .title-bottom {
      border-bottom: none;
      border-top: 1px solid #d4d4d4;
      padding-top: 8pt;
      padding-bottom: 0;
    }
    .title-center {
      text-align: center;
      margin: auto 0;
    }
    .title-center h1 {
      font-size: 16pt;
      text-transform: uppercase;
      text-decoration: underline;
      text-underline-offset: 4pt;
      margin: 0 0 18pt 0;
      letter-spacing: 0.05em;
    }
    .title-center .written-by { margin: 0 0 6pt 0; }
    .title-center .author { margin: 0; font-weight: bold; }
    .title-center .draft-meta {
      margin-top: 18pt;
      font-size: 10pt;
      color: #555555;
    }
    .page-num {
      text-align: right;
      font-weight: bold;
      margin-bottom: 18pt;
      min-height: 14pt;
    }
    .blk { white-space: pre-wrap; word-break: break-word; }
    .blk-heading {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: bold;
      text-transform: uppercase;
    }
    .blk-heading .blk-text { flex: 1; }
    .sc-num-left {
      position: absolute;
      left: -0.55in;
      font-weight: bold;
    }
    .sc-num-right {
      margin-left: 12pt;
      font-weight: bold;
    }
    .blk-char {
      margin-left: 2.2in;
      font-weight: bold;
      text-transform: uppercase;
    }
    .blk-paren {
      margin-left: 1.6in;
      max-width: 2.3in;
    }
    .blk-dialogue {
      margin-left: 1.0in;
      max-width: 3.5in;
    }
    .blk-vo { font-style: italic; }
    .blk-transition {
      text-align: right;
      font-weight: bold;
      text-transform: uppercase;
    }
    .blk-shot {
      font-weight: bold;
      text-transform: uppercase;
    }
    .blk-act {
      text-align: center;
      font-weight: bold;
      text-transform: uppercase;
      text-decoration: underline;
      text-underline-offset: 3pt;
    }
    .blk-note {
      font-style: italic;
      background: #fef9e7;
      border: 1px solid #e5c678;
      padding: 4pt 8pt;
      border-radius: 3pt;
      color: #6b430b;
    }
    .blk-bold { font-weight: bold; }
    .blk-italic { font-style: italic; color: #444444; }
    .empty-note { font-style: italic; color: #777777; }
  </style>
</head>
<body>
  ${titleSheetHtml}
  ${pagesHtml}
</body>
</html>`;
}
