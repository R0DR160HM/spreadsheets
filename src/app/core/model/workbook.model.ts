/**
 * Core spreadsheet data model.
 *
 * A cell's content is a list of rich-text runs so a single cell can mix
 * formatting (e.g. one bold word inside a normal sentence). Cell-level
 * presentation (background, alignment) lives in `CellStyle`.
 */

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** CSS hex color, e.g. `#ff0000` */
  color?: string;
  /** Font size in points */
  fontSize?: number;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface CellStyle {
  /** CSS hex background color */
  background?: string;
  align?: TextAlign;
}

export interface Cell {
  runs: TextRun[];
  style?: CellStyle;
}

export interface Sheet {
  name: string;
  rowCount: number;
  colCount: number;
  /** Sparse cell storage keyed by `cellKey(row, col)` */
  cells: ReadonlyMap<string, Cell>;
  /** Custom column widths in px, keyed by column index; absent columns use the default. */
  colWidths: Readonly<Record<number, number>>;
}

export const DEFAULT_COL_WIDTH_PX = 120;
export const MIN_COL_WIDTH_PX = 40;
export const MAX_COL_WIDTH_PX = 800;

export interface Workbook {
  /** File name without extension */
  name: string;
  sheets: Sheet[];
}

export const DEFAULT_ROWS = 100;
export const DEFAULT_COLS = 26;

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function createSheet(name: string, rowCount = DEFAULT_ROWS, colCount = DEFAULT_COLS): Sheet {
  return { name, rowCount, colCount, cells: new Map(), colWidths: {} };
}

export function createWorkbook(name: string, sheetName: string): Workbook {
  return { name, sheets: [createSheet(sheetName)] };
}

/** Column index (0-based) to spreadsheet letters: 0 -> A, 25 -> Z, 26 -> AA */
export function columnName(col: number): string {
  let name = '';
  let n = col;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/** Flattens a cell's rich runs to plain text (for CSV, accessibility, etc.) */
export function cellText(cell: Cell | undefined): string {
  return cell?.runs.map((r) => r.text).join('') ?? '';
}

export function plainCell(text: string): Cell {
  return { runs: text === '' ? [] : [{ text }] };
}

export function isEmptyCell(cell: Cell | undefined): boolean {
  return !cell || (cellText(cell) === '' && !cell.style);
}

/** Merges adjacent runs that share identical formatting; drops empty runs. */
export function normalizeRuns(runs: TextRun[]): TextRun[] {
  const result: TextRun[] = [];
  for (const run of runs) {
    if (run.text === '') continue;
    const prev = result[result.length - 1];
    if (prev && sameRunStyle(prev, run)) {
      result[result.length - 1] = { ...prev, text: prev.text + run.text };
    } else {
      result.push({ ...run });
    }
  }
  return result;
}

export function sameRunStyle(a: TextRun, b: TextRun): boolean {
  return (
    !a.bold === !b.bold &&
    !a.italic === !b.italic &&
    !a.underline === !b.underline &&
    !a.strike === !b.strike &&
    (a.color ?? null) === (b.color ?? null) &&
    (a.fontSize ?? null) === (b.fontSize ?? null)
  );
}

/** JSON-safe representation used for persistence (Maps are not serializable). */
export interface SerializedSheet {
  name: string;
  rowCount: number;
  colCount: number;
  cells: [string, Cell][];
  colWidths?: Record<number, number>;
}

export interface SerializedWorkbook {
  name: string;
  sheets: SerializedSheet[];
}

export function serializeWorkbook(workbook: Workbook): SerializedWorkbook {
  return {
    name: workbook.name,
    sheets: workbook.sheets.map((s) => ({
      name: s.name,
      rowCount: s.rowCount,
      colCount: s.colCount,
      cells: [...s.cells.entries()],
      colWidths: { ...s.colWidths },
    })),
  };
}

export function deserializeWorkbook(data: SerializedWorkbook): Workbook {
  return {
    name: data.name,
    sheets: data.sheets.map((s) => ({
      name: s.name,
      rowCount: s.rowCount,
      colCount: s.colCount,
      cells: new Map(s.cells),
      colWidths: s.colWidths ?? {},
    })),
  };
}
