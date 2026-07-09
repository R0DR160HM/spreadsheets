import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { Cell, cellKey } from '../core/model/workbook.model';
import { CellEditorComponent, EditorCommit } from './cell-editor.component';

/**
 * One grid row. All inputs are primitives (or stable references), so during
 * selection drags and column resizes Angular skips every row whose inputs
 * are unchanged — that memoization is what keeps the grid responsive.
 */
@Component({
  selector: 'tr[app-grid-row]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CellEditorComponent],
  templateUrl: './grid-row.component.html',
  styleUrl: './grid-row.component.css',
})
export class GridRowComponent {
  protected readonly i18n = inject(I18nService);

  readonly row = input.required<number>();
  readonly colCount = input.required<number>();
  /** Stable reference: changes only when cell content changes. */
  readonly cells = input.required<ReadonlyMap<string, Cell>>();
  /** Stable reference: evaluated formula results. */
  readonly evaluated = input.required<ReadonlyMap<string, string>>();
  /** Column of the active cell when it is on this row, else -1. */
  readonly selectedCol = input.required<number>();
  /** Column hosting the open editor when it is on this row, else -1. */
  readonly editingCol = input.required<number>();
  /** Range columns intersecting this row: [start, end], or [-1, -2] when none. */
  readonly rangeStart = input.required<number>();
  readonly rangeEnd = input.required<number>();
  /** Seed text for the editor; always null for rows that aren't editing. */
  readonly editSeed = input<string | null>(null);
  readonly editorLabel = input('');

  readonly committed = output<EditorCommit>();
  readonly cancelled = output<void>();

  protected readonly cols = computed(() => Array.from({ length: this.colCount() }, (_, i) => i));

  protected cellAt(col: number): Cell | undefined {
    return this.cells().get(cellKey(this.row(), col));
  }

  protected formulaResult(col: number): string | null {
    return this.evaluated().get(cellKey(this.row(), col)) ?? null;
  }

  protected inRange(col: number): boolean {
    return col >= this.rangeStart() && col <= this.rangeEnd();
  }

  protected textDecoration(run: { underline?: boolean; strike?: boolean }): string | null {
    const parts = [run.underline ? 'underline' : '', run.strike ? 'line-through' : ''].filter(
      Boolean,
    );
    return parts.length > 0 ? parts.join(' ') : null;
  }
}
