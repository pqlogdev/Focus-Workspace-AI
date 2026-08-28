import { jsPDF } from 'jspdf';

interface ExportPdfOptions {
  title?: string;
  filename?: string;
}

export const exportNotesToPdf = async (
  content: string,
  options: ExportPdfOptions = {}
): Promise<boolean> => {
  if (!content.trim()) {
    return false;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const checkPageBreak = (neededHeight: number = 10) => {
    if (cursorY + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      cursorY = margin + 10;
      return true;
    }
    return false;
  };

  // Header
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(options.title || 'AiRiser Focus & Thought Notes', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated on ${dateStr} • AiRiser Workspace`, margin, 21);

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, 28, pageWidth - margin, 28);

  cursorY = 38;

  // Process markdown lines
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check for image markdown: ![alt](data:image/...)
    const imageMatch = rawLine.match(/!\[(.*?)\]\((data:image\/[a-zA-Z]+;base64,[^)]+)\)/);
    if (imageMatch) {
      const imgData = imageMatch[2];
      try {
        checkPageBreak(55);
        // Estimate image aspect ratio or fit standard box
        doc.addImage(imgData, 'JPEG', margin, cursorY, 60, 45, undefined, 'FAST');
        cursorY += 50;
      } catch (err) {
        console.warn('Could not render image in PDF:', err);
      }
      continue;
    }

    // Code block toggle
    if (rawLine.trim().startsWith('```')) {
      if (inCodeBlock) {
        // flush code block
        if (codeBuffer.length > 0) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          
          const codeText = codeBuffer.join('\n');
          const splitCode = doc.splitTextToSize(codeText, contentWidth - 8);
          const blockHeight = splitCode.length * 4.5 + 6;

          checkPageBreak(blockHeight);

          doc.setFillColor(241, 245, 249);
          doc.roundedRect(margin, cursorY - 2, contentWidth, blockHeight, 2, 2, 'F');

          doc.text(splitCode, margin + 4, cursorY + 3);
          cursorY += blockHeight + 4;
          codeBuffer = [];
        }
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Blank line
    if (!rawLine.trim()) {
      cursorY += 4;
      continue;
    }

    // Headings
    if (rawLine.startsWith('# ')) {
      checkPageBreak(12);
      cursorY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      const text = rawLine.replace(/^#\s+/, '');
      doc.text(text, margin, cursorY);
      cursorY += 7;
      continue;
    }

    if (rawLine.startsWith('## ')) {
      checkPageBreak(10);
      cursorY += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      const text = rawLine.replace(/^##\s+/, '');
      doc.text(text, margin, cursorY);
      cursorY += 6;
      continue;
    }

    if (rawLine.startsWith('### ')) {
      checkPageBreak(8);
      cursorY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      const text = rawLine.replace(/^###\s+/, '');
      doc.text(text, margin, cursorY);
      cursorY += 5;
      continue;
    }

    // Checkboxes
    if (rawLine.match(/^-\s*\[([ xX])\]\s*(.*)/)) {
      const match = rawLine.match(/^-\s*\[([ xX])\]\s*(.*)/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const taskText = match[2];
        checkPageBreak(6);

        // Draw checkbox square
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.rect(margin, cursorY - 3, 3.5, 3.5);

        if (isChecked) {
          doc.setFillColor(99, 102, 241);
          doc.rect(margin + 0.6, cursorY - 2.4, 2.3, 2.3, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(isChecked ? 148 : 51, isChecked ? 163 : 65, isChecked ? 184 : 85);

        const cleanText = taskText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
        const splitText = doc.splitTextToSize(cleanText, contentWidth - 7);
        doc.text(splitText, margin + 6, cursorY);
        cursorY += splitText.length * 4.8 + 1.5;
        continue;
      }
    }

    // Bullet items
    if (rawLine.match(/^[-*•]\s+(.*)/)) {
      const match = rawLine.match(/^[-*•]\s+(.*)/);
      if (match) {
        const bulletText = match[1];
        checkPageBreak(6);

        // Draw small round bullet
        doc.setFillColor(99, 102, 241);
        doc.circle(margin + 1.5, cursorY - 1, 0.8, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        const cleanText = bulletText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
        const splitText = doc.splitTextToSize(cleanText, contentWidth - 6);
        doc.text(splitText, margin + 5, cursorY);
        cursorY += splitText.length * 4.8 + 1.5;
        continue;
      }
    }

    // Standard body text
    checkPageBreak(6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    const cleanText = rawLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    const splitText = doc.splitTextToSize(cleanText, contentWidth);
    doc.text(splitText, margin, cursorY);
    cursorY += splitText.length * 4.8 + 1.5;
  }

  // Footer for each page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('AiRiser Workspace • Exported Thought & Focus Notes', margin, pageHeight - 7);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const dateSlug = now.toISOString().split('T')[0];
  const outputFilename = options.filename || `airiser-focus-notes-${dateSlug}.pdf`;
  doc.save(outputFilename);
  return true;
};
