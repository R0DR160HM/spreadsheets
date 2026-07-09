import { jsPDF } from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import { displayText, evaluateSheet } from '../formulas/formula';
import { Cell, cellKey, columnName, Workbook } from '../model/workbook.model';
import { SpreadsheetFormat } from './spreadsheet-format';

/**
 * PDF export (export-only format). Each sheet becomes a titled table.
 * jspdf-autotable styles whole cells, not text spans, so mixed formatting
 * inside a cell is flattened to the first styled run's formatting.
 */
export class PdfFormat implements SpreadsheetFormat {
  async write(workbook: Workbook): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });

    workbook.sheets.forEach((sheet, index) => {
      if (index > 0) doc.addPage();
      const evaluated = evaluateSheet(sheet);
      let maxRow = -1;
      let maxCol = -1;
      for (const [key, cell] of sheet.cells) {
        if (displayText(sheet, evaluated, key) === '' && !cell.style) continue;
        const [r, c] = key.split(':').map(Number);
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
      }

      doc.setFontSize(14);
      doc.text(sheet.name, 40, 40);
      if (maxRow < 0) return;

      const cells: (Cell | undefined)[][] = [];
      const body: string[][] = [];
      for (let r = 0; r <= maxRow; r++) {
        const cellRow: (Cell | undefined)[] = [];
        const textRow: string[] = [];
        for (let c = 0; c <= maxCol; c++) {
          const key = cellKey(r, c);
          cellRow.push(sheet.cells.get(key));
          textRow.push(displayText(sheet, evaluated, key));
        }
        cells.push(cellRow);
        body.push(textRow);
      }

      autoTable(doc, {
        startY: 56,
        head: [Array.from({ length: maxCol + 1 }, (_, c) => columnName(c))],
        body,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59] },
        didParseCell: (data: CellHookData) => {
          if (data.section !== 'body') return;
          applyCellStyle(data, cells[data.row.index]?.[data.column.index]);
        },
      });
    });

    return doc.output('blob');
  }
}

function applyCellStyle(data: CellHookData, cell: Cell | undefined): void {
  if (!cell) return;
  const run = cell.runs.find((r) => r.text.trim() !== '') ?? cell.runs[0];
  if (run) {
    if (run.bold && run.italic) data.cell.styles.fontStyle = 'bolditalic';
    else if (run.bold) data.cell.styles.fontStyle = 'bold';
    else if (run.italic) data.cell.styles.fontStyle = 'italic';
    if (run.color) data.cell.styles.textColor = hexToRgb(run.color);
    if (run.fontSize) data.cell.styles.fontSize = run.fontSize;
  }
  if (cell.style?.background) data.cell.styles.fillColor = hexToRgb(cell.style.background);
  if (cell.style?.align) data.cell.styles.halign = cell.style.align;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}
