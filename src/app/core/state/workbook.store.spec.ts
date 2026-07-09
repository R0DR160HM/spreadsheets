import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { cellKey, cellText } from '../model/workbook.model';
import { WorkbookStore } from './workbook.store';

describe('WorkbookStore', () => {
  let store: WorkbookStore;

  beforeEach(() => {
    // jsdom has no IndexedDB, so PersistenceService is inert here
    TestBed.resetTestingModule();
    store = TestBed.inject(WorkbookStore);
  });

  it('starts with a single empty sheet', () => {
    expect(store.workbook().sheets.length).toBe(1);
    expect(store.activeSheet().cells.size).toBe(0);
  });

  it('sets and clears cells', () => {
    store.setCell(1, 2, { runs: [{ text: 'hello' }] });
    expect(cellText(store.activeSheet().cells.get(cellKey(1, 2)))).toBe('hello');
    store.clearCell(1, 2);
    expect(store.activeSheet().cells.has(cellKey(1, 2))).toBe(false);
  });

  it('removes cells that become empty', () => {
    store.setCell(0, 0, { runs: [{ text: 'x' }] });
    store.setCell(0, 0, { runs: [] });
    expect(store.activeSheet().cells.has(cellKey(0, 0))).toBe(false);
  });

  it('toggles run flags on the selected cell', () => {
    store.select(0, 0);
    store.setCell(0, 0, { runs: [{ text: 'a' }, { text: 'b', bold: true }] });
    store.toggleRunFlag('bold');
    expect(store.selectedCell()?.runs.every((r) => r.bold)).toBe(true);
    store.toggleRunFlag('bold');
    expect(store.selectedCell()?.runs.some((r) => r.bold)).toBe(false);
  });

  it('applies cell styles without touching content', () => {
    store.select(0, 0);
    store.setCell(0, 0, { runs: [{ text: 'x' }] });
    store.applyCellStyle({ background: '#ffff00', align: 'center' });
    const cell = store.selectedCell();
    expect(cell?.style).toEqual({ background: '#ffff00', align: 'center' });
    expect(cellText(cell)).toBe('x');
  });

  it('clamps selection to sheet bounds', () => {
    store.select(-5, 9999);
    expect(store.selection()).toEqual({ row: 0, col: store.activeSheet().colCount - 1 });
  });

  it('manages sheets: add, rename, remove', () => {
    store.addSheet();
    expect(store.workbook().sheets.length).toBe(2);
    expect(store.activeSheetIndex()).toBe(1);

    store.renameSheet(1, 'Data');
    expect(store.workbook().sheets[1].name).toBe('Data');

    store.removeSheet(1);
    expect(store.workbook().sheets.length).toBe(1);

    // The last sheet cannot be removed
    store.removeSheet(0);
    expect(store.workbook().sheets.length).toBe(1);
  });

  it('extends the selection into a range without moving the anchor', () => {
    store.select(1, 1);
    store.extendSelection(3, 2);
    expect(store.range()).toEqual({ r1: 1, r2: 3, c1: 1, c2: 2 });
    // Extending "backwards" still normalizes the rectangle
    store.extendSelection(0, 0);
    expect(store.range()).toEqual({ r1: 0, r2: 1, c1: 0, c2: 1 });
    // A plain select collapses the range
    store.select(5, 5);
    expect(store.range()).toEqual({ r1: 5, r2: 5, c1: 5, c2: 5 });
  });

  it('applies styling to every cell in the selected range as one undo step', () => {
    store.setCell(0, 0, { runs: [{ text: 'a' }] });
    store.setCell(1, 1, { runs: [{ text: 'b' }] });
    store.select(0, 0);
    store.extendSelection(1, 1);

    store.toggleRunFlag('bold');
    expect(store.activeSheet().cells.get(cellKey(0, 0))?.runs[0].bold).toBe(true);
    expect(store.activeSheet().cells.get(cellKey(1, 1))?.runs[0].bold).toBe(true);

    store.applyCellStyle({ background: '#00ff00' });
    // Empty cells inside the range get the style too
    expect(store.activeSheet().cells.get(cellKey(0, 1))?.style?.background).toBe('#00ff00');
    expect(store.activeSheet().cells.get(cellKey(1, 0))?.style?.background).toBe('#00ff00');

    store.undo(); // one step reverts the whole background change
    expect(store.activeSheet().cells.get(cellKey(0, 1))).toBeUndefined();
  });

  it('clears the whole selected range', () => {
    store.setCell(0, 0, { runs: [{ text: 'a' }] });
    store.setCell(2, 2, { runs: [{ text: 'b' }] });
    store.select(0, 0);
    store.extendSelection(2, 2);
    store.clearRange();
    expect(store.activeSheet().cells.size).toBe(0);
  });

  it('undoes and redoes cell edits with Ctrl+Z semantics', () => {
    store.setCell(0, 0, { runs: [{ text: 'first' }] });
    store.setCell(0, 0, { runs: [{ text: 'second' }] });

    store.undo();
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('first');
    store.undo();
    expect(store.activeSheet().cells.has(cellKey(0, 0))).toBe(false);
    store.undo(); // nothing left to undo — no-op
    expect(store.activeSheet().cells.has(cellKey(0, 0))).toBe(false);

    store.redo();
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('first');
    store.redo();
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('second');
  });

  it('a new change clears the redo stack', () => {
    store.setCell(0, 0, { runs: [{ text: 'a' }] });
    store.undo();
    store.setCell(0, 0, { runs: [{ text: 'b' }] });
    store.redo(); // must be a no-op
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('b');
  });

  it('caps the undo history at 100 entries', () => {
    for (let i = 0; i <= 120; i++) {
      store.setCell(0, 0, { runs: [{ text: `v${i}` }] });
    }
    for (let i = 0; i < 150; i++) store.undo();
    // 100 undos land on v20, the oldest retained snapshot's content
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('v20');
  });

  it('undoes structural changes like sheet removal', () => {
    store.addSheet();
    store.removeSheet(1);
    expect(store.workbook().sheets.length).toBe(1);
    store.undo();
    expect(store.workbook().sheets.length).toBe(2);
  });

  it('sets and clamps column widths', () => {
    store.setColumnWidth(2, 200);
    expect(store.activeSheet().colWidths[2]).toBe(200);
    store.setColumnWidth(2, 5);
    expect(store.activeSheet().colWidths[2]).toBe(40);
    store.setColumnWidth(2, 9999);
    expect(store.activeSheet().colWidths[2]).toBe(800);
  });

  it('inserts a row below the selection, shifting content down', () => {
    store.setCell(0, 0, { runs: [{ text: 'above' }] });
    store.setCell(1, 0, { runs: [{ text: 'below' }] });
    store.select(0, 0);
    const { rowCount } = store.activeSheet();

    store.insertRowBelow();

    expect(store.activeSheet().rowCount).toBe(rowCount + 1);
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('above');
    expect(store.activeSheet().cells.has(cellKey(1, 0))).toBe(false);
    expect(cellText(store.activeSheet().cells.get(cellKey(2, 0)))).toBe('below');
  });

  it('inserts a column right of the selection, shifting content and widths right', () => {
    store.setCell(0, 0, { runs: [{ text: 'left' }] });
    store.setCell(0, 1, { runs: [{ text: 'right' }] });
    store.setColumnWidth(1, 300);
    store.select(0, 0);
    const { colCount } = store.activeSheet();

    store.insertColumnRight();

    expect(store.activeSheet().colCount).toBe(colCount + 1);
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 0)))).toBe('left');
    expect(store.activeSheet().cells.has(cellKey(0, 1))).toBe(false);
    expect(cellText(store.activeSheet().cells.get(cellKey(0, 2)))).toBe('right');
    expect(store.activeSheet().colWidths[2]).toBe(300);
    expect(store.activeSheet().colWidths[1]).toBeUndefined();
  });
});
