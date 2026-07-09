import * as ExcelJS from 'exceljs';
import { evaluateSheet, isFormulaText } from '../formulas/formula';
import {
  Cell,
  cellKey,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  normalizeRuns,
  Sheet,
  TextAlign,
  TextRun,
  Workbook,
} from '../model/workbook.model';
import { SpreadsheetFormat } from './spreadsheet-format';

/**
 * XLSX import/export via ExcelJS. Preserves rich-text runs (bold, italic,
 * underline, strikethrough, color, font size), cell background fills,
 * horizontal alignment, and multiple sheets.
 */
export class XlsxFormat implements SpreadsheetFormat {
  async read(file: File): Promise<Workbook> {
    const excel = new ExcelJS.Workbook();
    await excel.xlsx.load(await file.arrayBuffer());
    const name = file.name.replace(/\.[^.]+$/, '');
    const sheets: Sheet[] = [];
    excel.eachSheet((ws) => {
      const cells = new Map<string, Cell>();
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (excelCell, colNumber) => {
          const cell = readCell(excelCell);
          if (cell) cells.set(cellKey(rowNumber - 1, colNumber - 1), cell);
        });
      });
      const colWidths: Record<number, number> = {};
      ws.columns?.forEach((column, index) => {
        if (column?.width) colWidths[index] = excelWidthToPx(column.width);
      });
      sheets.push({
        name: ws.name,
        rowCount: Math.max(DEFAULT_ROWS, ws.rowCount),
        colCount: Math.max(DEFAULT_COLS, ws.columnCount),
        cells,
        colWidths,
      });
    });
    if (sheets.length === 0) {
      sheets.push({
        name: 'Sheet1',
        rowCount: DEFAULT_ROWS,
        colCount: DEFAULT_COLS,
        cells: new Map(),
        colWidths: {},
      });
    }
    return { name, sheets };
  }

  async write(workbook: Workbook): Promise<Blob> {
    const excel = new ExcelJS.Workbook();
    for (const sheet of workbook.sheets) {
      const ws = excel.addWorksheet(sheet.name);
      const evaluated = evaluateSheet(sheet);
      for (const [key, cell] of sheet.cells) {
        const [r, c] = key.split(':').map(Number);
        writeCell(ws.getCell(r + 1, c + 1), cell, evaluated.get(key));
      }
      for (const [col, px] of Object.entries(sheet.colWidths)) {
        ws.getColumn(Number(col) + 1).width = pxToExcelWidth(px);
      }
    }
    const buffer = await excel.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
}

function readCell(excelCell: ExcelJS.Cell): Cell | undefined {
  const value = excelCell.value;
  let runs: TextRun[];
  if (isRichValue(value)) {
    runs = normalizeRuns(
      value.richText.map((rt) => ({ text: rt.text, ...fontToRunStyle(rt.font) })),
    );
  } else if (isFormulaValue(value)) {
    runs = [{ text: `=${value.formula}`, ...fontToRunStyle(excelCell.font) }];
  } else {
    const text = excelCell.text ?? '';
    runs = text === '' ? [] : [{ text, ...fontToRunStyle(excelCell.font) }];
  }

  const style: Cell['style'] = {};
  const fill = excelCell.fill;
  if (fill && fill.type === 'pattern' && fill.pattern === 'solid' && fill.fgColor?.argb) {
    style.background = argbToHex(fill.fgColor.argb);
  }
  const horizontal = excelCell.alignment?.horizontal;
  if (horizontal === 'left' || horizontal === 'center' || horizontal === 'right') {
    style.align = horizontal;
  }

  if (runs.length === 0 && Object.keys(style).length === 0) return undefined;
  return { runs, ...(Object.keys(style).length > 0 ? { style } : {}) };
}

function writeCell(excelCell: ExcelJS.Cell, cell: Cell, evaluatedResult?: string): void {
  const runs = cell.runs;
  const text = runs.map((r) => r.text).join('');
  if (isFormulaText(text)) {
    const numeric = Number(evaluatedResult);
    excelCell.value = {
      formula: text.slice(1),
      result: evaluatedResult !== undefined && !Number.isNaN(numeric) ? numeric : evaluatedResult,
    } as ExcelJS.CellFormulaValue;
    if (runs[0] && hasRunStyle(runs[0])) excelCell.font = runStyleToFont(runs[0]);
  } else if (runs.length === 1 && !hasRunStyle(runs[0])) {
    excelCell.value = runs[0].text;
  } else if (runs.length > 0) {
    excelCell.value = {
      richText: runs.map((run) => ({ text: run.text, font: runStyleToFont(run) })),
    };
  }
  if (cell.style?.background) {
    excelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(cell.style.background) },
    };
  }
  if (cell.style?.align) {
    excelCell.alignment = { horizontal: cell.style.align as TextAlign };
  }
}

function isRichValue(value: ExcelJS.CellValue): value is ExcelJS.CellRichTextValue {
  return typeof value === 'object' && value !== null && 'richText' in value;
}

function isFormulaValue(value: ExcelJS.CellValue): value is ExcelJS.CellFormulaValue {
  return typeof value === 'object' && value !== null && 'formula' in value;
}

function hasRunStyle(run: TextRun): boolean {
  return !!(run.bold || run.italic || run.underline || run.strike || run.color || run.fontSize);
}

function fontToRunStyle(font: Partial<ExcelJS.Font> | undefined): Omit<TextRun, 'text'> {
  if (!font) return {};
  const style: Omit<TextRun, 'text'> = {};
  if (font.bold) style.bold = true;
  if (font.italic) style.italic = true;
  if (font.underline) style.underline = true;
  if (font.strike) style.strike = true;
  if (font.color?.argb) style.color = argbToHex(font.color.argb);
  if (font.size) style.fontSize = font.size;
  return style;
}

function runStyleToFont(run: TextRun): Partial<ExcelJS.Font> {
  const font: Partial<ExcelJS.Font> = {};
  if (run.bold) font.bold = true;
  if (run.italic) font.italic = true;
  if (run.underline) font.underline = true;
  if (run.strike) font.strike = true;
  if (run.color) font.color = { argb: hexToArgb(run.color) };
  if (run.fontSize) font.size = run.fontSize;
  return font;
}

// Excel column width is measured in characters of the default font (~7px each plus padding)
function excelWidthToPx(width: number): number {
  return Math.round(width * 7 + 5);
}

function pxToExcelWidth(px: number): number {
  return Math.max(1, (px - 5) / 7);
}

function argbToHex(argb: string): string {
  return `#${argb.slice(-6).toLowerCase()}`;
}

function hexToArgb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}
