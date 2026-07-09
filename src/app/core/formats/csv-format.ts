import {
  Cell,
  cellKey,
  cellText,
  createWorkbook,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  plainCell,
  Workbook,
} from '../model/workbook.model';
import { displayText, evaluateSheet } from '../formulas/formula';
import { ReadContext, SpreadsheetFormat, WriteContext } from './spreadsheet-format';

const DEFAULT_SEPARATOR = ',';

function separatorFrom(options?: Record<string, string>): string {
  const separator = options?.['separator'] ?? DEFAULT_SEPARATOR;
  return separator === '\\t' ? '\t' : separator;
}

/**
 * CSV import/export (RFC 4180, configurable column separator). CSV has no
 * formatting, so rich text is flattened to plain text on save and imported
 * cells are unformatted. Only the active sheet is exported since CSV is
 * single-table.
 */
export class CsvFormat implements SpreadsheetFormat {
  async read(file: File, context?: ReadContext): Promise<Workbook> {
    const text = await file.text();
    const rows = parseCsv(text, separatorFrom(context?.options));
    const name = file.name.replace(/\.[^.]+$/, '');
    const workbook = createWorkbook(name, name || 'Sheet1');
    const cells = new Map<string, Cell>();
    let maxCols = 0;
    rows.forEach((row, r) => {
      maxCols = Math.max(maxCols, row.length);
      row.forEach((value, c) => {
        if (value !== '') cells.set(cellKey(r, c), plainCell(value));
      });
    });
    const sheet = workbook.sheets[0];
    workbook.sheets[0] = {
      ...sheet,
      rowCount: Math.max(DEFAULT_ROWS, rows.length),
      colCount: Math.max(DEFAULT_COLS, maxCols),
      cells,
    };
    return workbook;
  }

  async write(workbook: Workbook, context?: WriteContext): Promise<Blob> {
    const separator = separatorFrom(context?.options);
    const sheet = workbook.sheets[context?.activeSheetIndex ?? 0] ?? workbook.sheets[0];
    const evaluated = evaluateSheet(sheet);
    let maxRow = -1;
    let maxCol = -1;
    for (const key of sheet.cells.keys()) {
      const [r, c] = key.split(':').map(Number);
      if (displayText(sheet, evaluated, key) !== '') {
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
      }
    }
    const lines: string[] = [];
    for (let r = 0; r <= maxRow; r++) {
      const fields: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        fields.push(escapeCsvField(displayText(sheet, evaluated, cellKey(r, c)), separator));
      }
      lines.push(fields.join(separator));
    }
    return new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  }
}

export function escapeCsvField(value: string, separator = DEFAULT_SEPARATOR): string {
  if (value.includes(separator) || /["\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Parses CSV text into rows of fields, honoring quoted fields with embedded delimiters and newlines. */
export function parseCsv(text: string, separator = DEFAULT_SEPARATOR): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  // Strip a UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += char;
        i++;
      }
    } else if (char === '"' && field === '') {
      inQuotes = true;
      i++;
    } else if (char === separator) {
      row.push(field);
      field = '';
      i++;
    } else if (char === '\r' || char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += char === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += char;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
