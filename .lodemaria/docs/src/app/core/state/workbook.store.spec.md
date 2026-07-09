# WorkbookStore

The `WorkbookStore` class manages the state of a workbook, including the current active sheet and selection.

## Class Purpose

- Manages the active sheet and selection of cells in the workbook.
- Provides methods to manipulate sheet creation, deletion, renaming, and removal.
- Applies cell styles without modifying content or applying style changes via undo/redo stack.
- Clamps selection boundaries to maintain a consistent sheet state.

## Methods

### `select`

Sets the current active sheet and selects a range of cells. If the specified range is invalid, it throws an error.

```typescript
store.select(row: number, col: number);
```

### `setCell`

Adds or updates a cell in the workbook with given row and column indices. Returns the updated cell object.

```typescript
store.setCell(row: number, col: number, value: any): Cell;
```

### `clearCell`

Removes a cell from the workbook with the specified row and column index. Returns the removed cell object or undefined if the cell was not found.

```typescript
store.clearCell(row: number, col: number);
```

### `removeSheet`

Removes the sheet at the specified index. Returns the removed sheet object or null if the sheet does not exist.

```typescript
store.removeSheet(index: number): Sheet;
```

### `addSheet`

Adds a new sheet to the workbook with an empty active cell. Returns the newly created sheet object.

```typescript
store.addSheet();
```

### `renameSheet`

Replaces an existing sheet with the specified name. Returns the renamed sheet object or null if the sheet does not exist.

```typescript
store.renameSheet(oldName: string, newName: string): Sheet;
```

### `removeSheet`

Removes the sheet at the specified index. Returns the removed sheet object or null if the sheet does not exist.

```typescript
store.removeSheet(index: number): Sheet;
```

### `extendSelection`

Extends the selection to include a range of cells from row to column indices provided. If the specified range is invalid, it throws an error.

```typescript
store.extendSelection(row1: number, col1: number, row2: number, col2: number);
```

### `applyCellStyle`

Applies cell styles without modifying content or applying style changes via undo/redo stack. Returns the applied cell object or undefined if the cell was not found.

```typescript
store.applyCellStyle(cellStyle: CellStyle);
```

### `toggleRunFlag`

Toggles run flags on the selected cell. Returns true if the cell's run flag was toggled, otherwise false.

```typescript
store.toggleRunFlag(runType: 'bold' | 'underline');
```

### `activeSheet`

Returns the currently active sheet object.

```typescript
store.activeSheet();
```

### `activeSheetIndex`

Returns the index of the currently active sheet in the workbook.

```typescript
store.activeSheetIndex();
```

### `range`

Returns the current selection range as a { r1, r2, c1, c2 } tuple.

```typescript
store.range();
```

## Additional Notes

- The class is designed to be modular and reusable across different parts of the application.
- It handles sheet creation, deletion, renaming, removal, and modification.
- The class provides methods for handling cell styles without altering content or applying style changes via undo/redo stack.
- Clamps selection boundaries to maintain a consistent sheet state.
