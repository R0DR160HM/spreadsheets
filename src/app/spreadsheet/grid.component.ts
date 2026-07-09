import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { cellRefName } from '../core/formulas/formula';
import { I18nService } from '../core/i18n/i18n.service';
import { EditorCommandsService } from '../core/richtext/editor-commands.service';
import {
  Cell,
  cellKey,
  columnName,
  DEFAULT_COL_WIDTH_PX,
  MAX_COL_WIDTH_PX,
  MIN_COL_WIDTH_PX,
} from '../core/model/workbook.model';
import { CellRef, WorkbookStore } from '../core/state/workbook.store';
import { CommitMove, EditorCommit } from './cell-editor.component';
import { GridRowComponent } from './grid-row.component';

/**
 * The spreadsheet grid: renders the active sheet as a table with sticky
 * headers, handles selection + keyboard navigation, and hosts the rich-text
 * editor overlay on the selected cell.
 *
 * Performance: rows are `GridRowComponent`s fed only primitives/stable
 * references, so drags and resizes re-render just the rows that changed.
 * Cell pointer events are delegated to the scroller instead of binding
 * listeners on every cell.
 */
@Component({
  selector: 'app-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GridRowComponent],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.css',
  host: {
    '(document:mouseup)': 'endDragSelect()',
    '(document:keydown)': 'onGlobalKeydown($event)',
  },
})
export class GridComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(WorkbookStore);
  private readonly editorCommands = inject(EditorCommandsService);

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  /** Text that starts an edit by replacing the cell content (typing), or null to edit existing runs. */
  protected readonly editSeed = signal<string | null>(null);

  /**
   * Cell hosting the open editor. Kept separate from the selection so that
   * clicking another cell mid-edit moves the selection without tearing down
   * (or re-targeting) the editor before it commits to its own cell.
   */
  protected readonly editingCell = signal<CellRef | null>(null);

  private dragSelecting = false;
  private resizing: { col: number; startX: number; startWidth: number } | null = null;

  /**
   * Vertical guide line shown while dragging a column edge. The real width is
   * applied once on release — resizing live would reflow the entire table
   * (tens of thousands of cells on large sheets) on every frame.
   */
  protected readonly resizeGuide = signal<{ x: number; top: number; height: number } | null>(
    null,
  );

  constructor() {
    // The store can end editing on its own (sheet switch, file open, undo).
    effect(() => {
      if (!this.store.editing()) this.editingCell.set(null);
    });
  }

  protected readonly rows = computed(() =>
    Array.from({ length: this.store.activeSheet().rowCount }, (_, i) => i),
  );
  protected readonly cols = computed(() =>
    Array.from({ length: this.store.activeSheet().colCount }, (_, i) => i),
  );
  protected readonly colCount = computed(() => this.store.activeSheet().colCount);

  protected readonly columnName = columnName;

  protected colWidth(col: number): number {
    return this.store.activeSheet().colWidths[col] ?? DEFAULT_COL_WIDTH_PX;
  }

  /** Explicit width so `table-layout: fixed` honors the column widths (48px row-header). */
  protected readonly tableWidthPx = computed(() => {
    const sheet = this.store.activeSheet();
    let width = 48;
    for (let c = 0; c < sheet.colCount; c++) {
      width += sheet.colWidths[c] ?? DEFAULT_COL_WIDTH_PX;
    }
    return width;
  });

  // ---- Per-row primitive inputs (stable values keep unchanged rows from re-rendering) ----

  protected selectedColFor(row: number): number {
    const sel = this.store.selection();
    return sel.row === row ? sel.col : -1;
  }

  protected editingColFor(row: number): number {
    const editing = this.editingCell();
    return editing?.row === row ? editing.col : -1;
  }

  protected rangeStartFor(row: number): number {
    const { r1, r2, c1 } = this.store.range();
    return row >= r1 && row <= r2 ? c1 : -1;
  }

  protected rangeEndFor(row: number): number {
    const { r1, r2, c2 } = this.store.range();
    return row >= r1 && row <= r2 ? c2 : -2;
  }

  protected editorLabel(): string {
    const target = this.editingCell() ?? this.store.selection();
    return this.i18n.t('editor.label', { ref: cellRefName(target.row, target.col) });
  }

  // ---- Delegated cell pointer events ----

  protected onGridMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    const cell = cellFromEvent(event);
    if (!cell) return;
    const { row, col } = cell;
    if (this.isEditing(row, col)) return;
    // Mid-formula, clicking a cell inserts its reference at the caret
    // instead of moving the selection (preventDefault keeps editor focus).
    if (this.editorCommands.isEditingFormula()) {
      event.preventDefault();
      this.editorCommands.insertText(cellRefName(row, col));
      return;
    }
    // If another cell is being edited, its editor commits itself via focusout
    // (to the cell it belongs to) — here we only move the selection.
    if (event.shiftKey) {
      this.store.extendSelection(row, col);
    } else {
      this.store.select(row, col);
      this.dragSelecting = true;
    }
  }

  protected onGridMouseOver(event: MouseEvent): void {
    if (!this.dragSelecting) return;
    const cell = cellFromEvent(event);
    if (cell) this.store.extendSelection(cell.row, cell.col);
  }

  protected onGridDoubleClick(event: MouseEvent): void {
    const cell = cellFromEvent(event);
    if (!cell || this.isEditing(cell.row, cell.col)) return;
    this.store.select(cell.row, cell.col);
    this.startEdit(null);
  }

  protected endDragSelect(): void {
    this.dragSelecting = false;
  }

  /** App-wide undo/redo — skipped inside text inputs and the cell editor, where native undo applies. */
  protected onGlobalKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const isUndo = key === 'z' && !event.shiftKey;
    const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
    if (!isUndo && !isRedo) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input, textarea, select, [contenteditable]')
    ) {
      return;
    }
    event.preventDefault();
    if (isUndo) this.store.undo();
    else this.store.redo();
  }

  // ---- Keyboard ----

  protected onKeydown(event: KeyboardEvent): void {
    if (this.store.editing()) {
      // Keys can land here while the editor is still being rendered/focused
      // (the editor stops propagation once it has focus). Buffer printable
      // characters into the seed and honor commit keys so nothing is lost.
      if (isPrintableKey(event) && this.editSeed() !== null) {
        event.preventDefault();
        this.editSeed.update((seed) => (seed ?? '') + event.key);
      } else if (event.key === 'Enter' && (event.altKey || event.ctrlKey)) {
        // Alt/Ctrl+Enter is a line break inside the cell, not a commit
        if (this.editSeed() !== null) {
          event.preventDefault();
          this.editSeed.update((seed) => (seed ?? '') + '\n');
        }
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        this.commitSeedEdit(
          event.key === 'Tab' ? (event.shiftKey ? 'left' : 'right') : event.shiftKey ? 'up' : 'down',
        );
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.stopEditing();
      }
      return;
    }
    const { row, col } = this.store.selection();
    const key = event.key;

    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (key in moves) {
      event.preventDefault();
      const [dr, dc] = moves[key];
      if (event.shiftKey) {
        this.store.extendSelection(row + dr, col + dc);
        this.focusSelectedCell();
      } else {
        this.moveSelection(row + dr, col + dc);
      }
    } else if (key === 'Tab') {
      event.preventDefault();
      this.moveSelection(row, col + (event.shiftKey ? -1 : 1));
    } else if (key === 'Home') {
      event.preventDefault();
      this.moveSelection(row, 0);
    } else if (key === 'Enter' || key === 'F2') {
      event.preventDefault();
      this.startEdit(null);
    } else if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      this.store.clearRange();
    } else if (isPrintableKey(event)) {
      event.preventDefault();
      this.startEdit(key);
    }
  }

  // ---- Editing ----

  protected isEditing(row: number, col: number): boolean {
    const editing = this.editingCell();
    return editing !== null && editing.row === row && editing.col === col;
  }

  protected onCommit(commit: EditorCommit): void {
    const target = this.editingCell();
    if (!target) return;
    this.onCommitAt(target, commit);
  }

  protected onCancel(): void {
    this.stopEditing();
    this.focusSelectedCell();
  }

  private onCommitAt(target: CellRef, commit: EditorCommit): void {
    const { row, col } = target;
    const existing = this.cellAt(row, col);
    this.store.setCell(row, col, { runs: commit.runs, style: existing?.style });
    this.stopEditing();
    switch (commit.move) {
      case 'down':
        this.moveSelection(row + 1, col);
        break;
      case 'up':
        this.moveSelection(row - 1, col);
        break;
      case 'right':
        this.moveSelection(row, col + 1);
        break;
      case 'left':
        this.moveSelection(row, col - 1);
        break;
      default:
        // Blur-commit: the user clicked elsewhere — don't steal focus back.
        break;
    }
  }

  /** Commits an edit whose editor never took focus (commit key raced the mount). */
  private commitSeedEdit(move: CommitMove): void {
    const target = this.editingCell();
    if (!target) return;
    const seed = this.editSeed();
    const existing = this.cellAt(target.row, target.col);
    const runs = seed === null ? (existing?.runs ?? []) : seed === '' ? [] : [{ text: seed }];
    this.onCommitAt(target, { runs, move });
  }

  private cellAt(row: number, col: number): Cell | undefined {
    return this.store.activeCells().get(cellKey(row, col));
  }

  private startEdit(seed: string | null): void {
    this.editSeed.set(seed);
    this.editingCell.set(this.store.selection());
    this.store.editing.set(true);
  }

  private stopEditing(): void {
    this.editingCell.set(null);
    this.store.editing.set(false);
  }

  // ---- Column resizing (guide line while dragging; width applied on release) ----

  protected startResize(col: number, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.resizing = { col, startX: event.clientX, startWidth: this.colWidth(col) };
    const rect = this.scroller().nativeElement.getBoundingClientRect();
    this.resizeGuide.set({ x: this.clampGuideX(event.clientX), top: rect.top, height: rect.height });
  }

  protected onResizeMove(event: PointerEvent): void {
    const guide = this.resizeGuide();
    if (!this.resizing || !guide) return;
    this.resizeGuide.set({ ...guide, x: this.clampGuideX(event.clientX) });
  }

  protected endResize(): void {
    const resizing = this.resizing;
    const guide = this.resizeGuide();
    this.resizing = null;
    this.resizeGuide.set(null);
    if (!resizing || !guide) return;
    const width = resizing.startWidth + guide.x - resizing.startX;
    if (width !== resizing.startWidth) {
      this.store.setColumnWidth(resizing.col, width);
    }
  }

  /** Keeps the guide within the column's allowed width range. */
  private clampGuideX(clientX: number): number {
    const { startX, startWidth } = this.resizing!;
    const columnLeft = startX - startWidth;
    return Math.max(columnLeft + MIN_COL_WIDTH_PX, Math.min(clientX, columnLeft + MAX_COL_WIDTH_PX));
  }

  protected onResizeKeydown(col: number, event: KeyboardEvent): void {
    const delta = event.key === 'ArrowRight' ? 10 : event.key === 'ArrowLeft' ? -10 : 0;
    if (delta === 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.store.setColumnWidth(col, this.colWidth(col) + delta);
  }

  // ---- Focus ----

  private moveSelection(row: number, col: number): void {
    this.store.select(row, col);
    this.focusSelectedCell();
  }

  private focusSelectedCell(): void {
    // Focus synchronously so keys typed right after a commit land on the next
    // cell instead of the disappearing editor; fall back to the next frame
    // when the cell isn't rendered yet (e.g. a freshly added row).
    if (!this.tryFocusSelectedCell()) {
      requestAnimationFrame(() => this.tryFocusSelectedCell());
    }
  }

  private tryFocusSelectedCell(): boolean {
    const { row, col } = this.store.selection();
    const el = this.scroller().nativeElement.querySelector<HTMLElement>(
      `[data-cell="${row}:${col}"]`,
    );
    el?.focus();
    return el !== null;
  }
}

function cellFromEvent(event: Event): CellRef | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const key = target.closest('[data-cell]')?.getAttribute('data-cell');
  if (!key) return null;
  const [row, col] = key.split(':').map(Number);
  return { row, col };
}

function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}
