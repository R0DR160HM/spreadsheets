import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import {
  Cell,
  cellKey,
  CellStyle,
  cellText,
  createSheet,
  createWorkbook,
  isEmptyCell,
  MAX_COL_WIDTH_PX,
  MIN_COL_WIDTH_PX,
  normalizeRuns,
  Sheet,
  TextRun,
  Workbook,
} from '../model/workbook.model';
import { evaluateCells } from '../formulas/formula';
import { PersistenceService } from './persistence.service';

export interface CellRef {
  row: number;
  col: number;
}

export type SortDirection = 'asc' | 'desc';

/** Normalized rectangular selection (inclusive bounds). */
export interface CellRange {
  r1: number;
  r2: number;
  c1: number;
  c2: number;
}

/**
 * Holds the open workbook plus UI state (active sheet, selection, edit mode)
 * as signals, and autosaves the workbook to IndexedDB so in-progress work
 * survives a reload even while offline.
 */
@Injectable({ providedIn: 'root' })
export class WorkbookStore {
  private readonly i18n = inject(I18nService);
  private readonly persistence = inject(PersistenceService);

  private readonly workbookSignal = signal<Workbook>(this.restore());
  readonly workbook = this.workbookSignal.asReadonly();

  readonly activeSheetIndex = signal(0);
  /** Active cell (keyboard focus, editing target). */
  readonly selection = signal<CellRef>({ row: 0, col: 0 });
  /** Where a multi-cell selection started; equals `selection` when a single cell is selected. */
  readonly anchor = signal<CellRef>({ row: 0, col: 0 });
  readonly editing = signal(false);

  /** Rectangle spanned by anchor and active cell. */
  readonly range = computed<CellRange>(() => {
    const a = this.anchor();
    const s = this.selection();
    return {
      r1: Math.min(a.row, s.row),
      r2: Math.max(a.row, s.row),
      c1: Math.min(a.col, s.col),
      c2: Math.max(a.col, s.col),
    };
  });

  readonly activeSheet = computed<Sheet>(() => {
    const sheets = this.workbook().sheets;
    return sheets[Math.min(this.activeSheetIndex(), sheets.length - 1)];
  });

  readonly selectedCell = computed<Cell | undefined>(() => {
    const { row, col } = this.selection();
    return this.activeSheet().cells.get(cellKey(row, col));
  });

  /**
   * Cells of the active sheet. Memoized separately so consumers (formula
   * evaluation, grid rows) are untouched by sheet changes that don't alter
   * content, e.g. column resizes.
   */
  readonly activeCells = computed<ReadonlyMap<string, Cell>>(() => this.activeSheet().cells);

  /** Evaluated display text of every formula cell in the active sheet. */
  readonly evaluated = computed<ReadonlyMap<string, string>>(() =>
    evaluateCells(this.activeCells()),
  );

  /** Snapshot history for undo/redo. The model is immutable, so entries are just references. */
  private readonly undoStack: Workbook[] = [];
  private readonly redoStack: Workbook[] = [];
  private static readonly MAX_HISTORY = 100;

  constructor() {
    effect(() => {
      this.persistence.save(this.workbook());
    });
  }

  loadWorkbook(workbook: Workbook): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.workbookSignal.set(workbook);
    this.activeSheetIndex.set(0);
    this.select(0, 0);
    this.editing.set(false);
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.workbook());
    this.workbookSignal.set(previous);
    this.afterHistoryRestore();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.workbook());
    this.workbookSignal.set(next);
    this.afterHistoryRestore();
  }

  /** Records the current state as an undo step; called before every mutation. */
  private snapshot(): void {
    this.undoStack.push(this.workbook());
    if (this.undoStack.length > WorkbookStore.MAX_HISTORY) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  private afterHistoryRestore(): void {
    this.editing.set(false);
    this.activeSheetIndex.update((i) => Math.min(i, this.workbook().sheets.length - 1));
    const { row, col } = this.selection();
    this.select(row, col);
  }

  newWorkbook(): void {
    this.loadWorkbook(
      createWorkbook(this.i18n.t('untitled'), this.i18n.t('sheet.defaultName', { n: 1 })),
    );
  }

  rename(name: string): void {
    this.snapshot();
    this.workbookSignal.update((wb) => ({ ...wb, name }));
  }

  select(row: number, col: number): void {
    const sheet = this.activeSheet();
    const ref = {
      row: clamp(row, sheet.rowCount - 1),
      col: clamp(col, sheet.colCount - 1),
    };
    if (!sameRef(this.selection(), ref)) this.selection.set(ref);
    if (!sameRef(this.anchor(), ref)) this.anchor.set(ref);
  }

  /** Extends the selection rectangle: moves the active cell, keeps the anchor. */
  extendSelection(row: number, col: number): void {
    const sheet = this.activeSheet();
    const ref = {
      row: clamp(row, sheet.rowCount - 1),
      col: clamp(col, sheet.colCount - 1),
    };
    if (!sameRef(this.selection(), ref)) this.selection.set(ref);
  }

  /**
   * Selects every cell in the active sheet. The active cell stays at the
   * top-left corner (anchor at the bottom-right) so focus doesn't scroll the
   * viewport to the far edge of the sheet.
   */
  selectAll(): void {
    const sheet = this.activeSheet();
    this.selection.set({ row: 0, col: 0 });
    this.anchor.set({ row: sheet.rowCount - 1, col: sheet.colCount - 1 });
  }

  /**
   * Plain, unformatted text of the current selection as TSV: cells in a row
   * joined by tabs, rows by newlines. A single-cell selection yields just that
   * cell's text.
   */
  selectionText(): string {
    const { r1, r2, c1, c2 } = this.range();
    const cells = this.activeSheet().cells;
    const lines: string[] = [];
    for (let r = r1; r <= r2; r++) {
      const cols: string[] = [];
      for (let c = c1; c <= c2; c++) {
        cols.push(cellText(cells.get(cellKey(r, c))));
      }
      lines.push(cols.join('\t'));
    }
    return lines.join('\n');
  }

  setCell(row: number, col: number, cell: Cell): void {
    this.snapshot();
    this.updateSheet((sheet) => {
      const cells = new Map(sheet.cells);
      const normalized: Cell = { ...cell, runs: normalizeRuns(cell.runs) };
      if (isEmptyCell(normalized)) {
        cells.delete(cellKey(row, col));
      } else {
        cells.set(cellKey(row, col), normalized);
      }
      return { ...sheet, cells };
    });
  }

  clearCell(row: number, col: number): void {
    this.snapshot();
    this.updateSheet((sheet) => {
      const cells = new Map(sheet.cells);
      cells.delete(cellKey(row, col));
      return { ...sheet, cells };
    });
  }

  /** Applies a run-style patch to every run of every non-empty cell in the selection. */
  applyRunStyle(patch: Partial<Omit<TextRun, 'text'>>): void {
    this.mutateRange((cells, row, col) => {
      const key = cellKey(row, col);
      const cell = cells.get(key);
      if (!cell || cell.runs.length === 0) return;
      cells.set(key, {
        ...cell,
        runs: normalizeRuns(cell.runs.map((run) => ({ ...run, ...patch }))),
      });
    });
  }

  /** Toggles a boolean run style (bold/italic/...): on unless every run in the selection already has it. */
  toggleRunFlag(flag: 'bold' | 'italic' | 'underline' | 'strike'): void {
    const nonEmpty = this.rangeCells().filter((c) => c.runs.length > 0);
    if (nonEmpty.length === 0) return;
    const enable = !nonEmpty.every((cell) => cell.runs.every((run) => run[flag]));
    this.applyRunStyle({ [flag]: enable || undefined });
  }

  /** Applies a cell-style patch (background, alignment) to every cell in the selection. */
  applyCellStyle(patch: Partial<CellStyle>): void {
    this.mutateRange((cells, row, col) => {
      const key = cellKey(row, col);
      const existing = cells.get(key) ?? { runs: [] };
      const style: CellStyle = { ...existing.style, ...patch };
      for (const styleKey of Object.keys(style) as (keyof CellStyle)[]) {
        if (style[styleKey] === undefined) delete style[styleKey];
      }
      const cell: Cell = {
        ...existing,
        ...(Object.keys(style).length > 0 ? { style } : { style: undefined }),
      };
      if (isEmptyCell(cell)) {
        cells.delete(key);
      } else {
        cells.set(key, cell);
      }
    });
  }

  /** Clears content and styling of every cell in the selection. */
  clearRange(): void {
    this.mutateRange((cells, row, col) => {
      cells.delete(cellKey(row, col));
    });
  }

  /** Existing cells inside the selection rectangle. */
  private rangeCells(): Cell[] {
    const { r1, r2, c1, c2 } = this.range();
    const cells = this.activeSheet().cells;
    const result: Cell[] = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = cells.get(cellKey(r, c));
        if (cell) result.push(cell);
      }
    }
    return result;
  }

  /** Runs `fn` for each position in the selection as a single undo step. */
  private mutateRange(fn: (cells: Map<string, Cell>, row: number, col: number) => void): void {
    this.snapshot();
    const { r1, r2, c1, c2 } = this.range();
    this.updateSheet((sheet) => {
      const cells = new Map(sheet.cells);
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          fn(cells, r, c);
        }
      }
      return { ...sheet, cells };
    });
  }

  setColumnWidth(col: number, widthPx: number): void {
    this.snapshot();
    const width = Math.round(clampWidth(widthPx));
    this.updateSheet((sheet) => ({
      ...sheet,
      colWidths: { ...sheet.colWidths, [col]: width },
    }));
  }

  /** Inserts an empty row below the selected one, shifting rows underneath down. */
  insertRowBelow(): void {
    this.snapshot();
    const index = this.selection().row + 1;
    this.updateSheet((sheet) => {
      const cells = new Map<string, Cell>();
      for (const [key, cell] of sheet.cells) {
        const [r, c] = key.split(':').map(Number);
        cells.set(cellKey(r >= index ? r + 1 : r, c), cell);
      }
      return { ...sheet, rowCount: sheet.rowCount + 1, cells };
    });
  }

  /** Inserts an empty column to the right of the selected one, shifting columns right. */
  insertColumnRight(): void {
    this.snapshot();
    const index = this.selection().col + 1;
    this.updateSheet((sheet) => {
      const cells = new Map<string, Cell>();
      for (const [key, cell] of sheet.cells) {
        const [r, c] = key.split(':').map(Number);
        cells.set(cellKey(r, c >= index ? c + 1 : c), cell);
      }
      const colWidths: Record<number, number> = {};
      for (const [key, width] of Object.entries(sheet.colWidths)) {
        const c = Number(key);
        colWidths[c >= index ? c + 1 : c] = width;
      }
      return { ...sheet, colCount: sheet.colCount + 1, cells, colWidths };
    });
  }

  /**
   * Reorders entire rows by the display value of the given column. Numbers
   * compare numerically and sort before text; rows with an empty cell in the
   * column always sink to the bottom, whatever the direction. Formula cells
   * sort by their current evaluated value (references are not rewritten).
   */
  sortByColumn(col: number, direction: SortDirection): void {
    this.snapshot();
    const evaluated = this.evaluated();
    this.updateSheet((sheet) => {
      const keyText = (row: number): string => {
        const key = cellKey(row, col);
        return evaluated.get(key) ?? cellText(sheet.cells.get(key));
      };
      const texts = Array.from({ length: sheet.rowCount }, (_, r) => keyText(r));
      const order = texts
        .map((_, r) => r)
        .sort((a, b) => compareCellText(texts[a], texts[b], direction) || a - b);
      const rowTarget = new Map<number, number>();
      order.forEach((oldRow, newRow) => rowTarget.set(oldRow, newRow));
      const cells = new Map<string, Cell>();
      for (const [key, cell] of sheet.cells) {
        const [r, c] = key.split(':').map(Number);
        cells.set(cellKey(rowTarget.get(r) ?? r, c), cell);
      }
      return { ...sheet, cells };
    });
  }

  addSheet(): void {
    this.snapshot();
    this.workbookSignal.update((wb) => {
      let n = wb.sheets.length + 1;
      let name = this.i18n.t('sheet.defaultName', { n });
      while (wb.sheets.some((s) => s.name === name)) {
        name = this.i18n.t('sheet.defaultName', { n: ++n });
      }
      return { ...wb, sheets: [...wb.sheets, createSheet(name)] };
    });
    this.activeSheetIndex.set(this.workbook().sheets.length - 1);
    this.select(0, 0);
  }

  removeSheet(index: number): void {
    if (this.workbook().sheets.length <= 1) return;
    this.snapshot();
    this.workbookSignal.update((wb) => ({
      ...wb,
      sheets: wb.sheets.filter((_, i) => i !== index),
    }));
    this.activeSheetIndex.update((i) => Math.min(i, this.workbook().sheets.length - 1));
    this.select(0, 0);
  }

  renameSheet(index: number, name: string): void {
    const trimmed = name.trim();
    if (trimmed === '') return;
    this.snapshot();
    this.workbookSignal.update((wb) => ({
      ...wb,
      sheets: wb.sheets.map((s, i) => (i === index ? { ...s, name: trimmed } : s)),
    }));
  }

  selectSheet(index: number): void {
    if (index < 0 || index >= this.workbook().sheets.length) return;
    this.activeSheetIndex.set(index);
    this.select(0, 0);
    this.editing.set(false);
  }

  private updateSheet(fn: (sheet: Sheet) => Sheet): void {
    const index = this.activeSheetIndex();
    this.workbookSignal.update((wb) => ({
      ...wb,
      sheets: wb.sheets.map((s, i) => (i === index ? fn(s) : s)),
    }));
  }

  private restore(): Workbook {
    return (
      this.persistence.takeRestored() ??
      createWorkbook(this.i18n.t('untitled'), this.i18n.t('sheet.defaultName', { n: 1 }))
    );
  }
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

function sameRef(a: CellRef, b: CellRef): boolean {
  return a.row === b.row && a.col === b.col;
}

function clampWidth(width: number): number {
  return Math.max(MIN_COL_WIDTH_PX, Math.min(width, MAX_COL_WIDTH_PX));
}

/** Empty last in both directions; numbers before text ascending; text is locale-compared. */
function compareCellText(a: string, b: string, direction: SortDirection): number {
  if (a === '' || b === '') return (a === '' ? 1 : 0) - (b === '' ? 1 : 0);
  const numA = Number(a);
  const numB = Number(b);
  const aIsNum = a.trim() !== '' && !Number.isNaN(numA);
  const bIsNum = b.trim() !== '' && !Number.isNaN(numB);
  let cmp: number;
  if (aIsNum && bIsNum) {
    cmp = numA - numB;
  } else if (aIsNum !== bIsNum) {
    cmp = aIsNum ? -1 : 1;
  } else {
    cmp = a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  }
  return direction === 'asc' ? cmp : -cmp;
}
