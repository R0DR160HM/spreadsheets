# WorkbookStore - Core File

## Purpose

The `WorkbookStore` component in the app core provides a centralized store for managing various aspects of the workbook, including sheet states, selection, and undo/redo functionality.

## Components and Interfaces

1. **Cell Ref**: Represents a cell reference with row and column indices.
2. **Cell Range**: Defines a rectangular selection spanned by rows and columns.
3. **Workbook Store**: Manages state across different parts of the app (sheets, active sheet, selection, etc.), including loading, undo/redo, and snapshotting functionality.

## Implementation

### `Workbook`

- **State Management**:
  - `activeSheetIndex`: Tracks the currently active sheet.
  - `selection`: Current cell selected.
  - `anchor`: Reference to the current anchor point.
  - `editing`: Indicates whether the user is editing the active cell.
  - `range`: Rectangular selection spanned by the active and anchor cells.

- **Methods**:
  - `loadWorkbook(workbook: Workbook)`: Restores the workbook from IndexedDB.
  - `undo()`, `redo()`: Handles undo/redo operations, updating the state accordingly.
  - `snapshot()`: Saves the current workbook as an immutable snapshot.

### `Sheet`

- **State Management**:
  - `cells`: Stores cell objects with their run styles and positions.
  - `colWidths`: Maps column indices to their respective widths.

- **Methods**:
  - `setCell(row: number, col: number, cell: Cell)`: Updates a single cell's properties.
  - `clearCell(row: number, col: number)`: Clears a single cell from the sheet.
  - `applyRunStyle(patch: Partial<Omit<TextRun, 'text'>>): Applies a run-style patch to a cell's runs.
  - `toggleRunFlag(flag: 'bold' | 'italic' | 'underline' | 'strike'): Toggles a boolean run style.
  - `applyCellStyle(patch: Partial<CellStyle>): Applies a cell-style patch.

### `WorkbookStore`

- **State Management**:
  - `activeSheetIndex`: Tracks the currently active sheet.
  - `selection`: Current cell selected.
  - `anchor`: Reference to the current anchor point.
  - `editing`: Indicates whether the user is editing the active cell.
  - `range`: Rectangular selection spanned by the active and anchor cells.
  - `sheetCells`: Stores all cells in each sheet.

- **Methods**:
  - `loadWorkbook(workbook: Workbook)`: Restores the workbook from IndexedDB.
  - `undo()`, `redo()`: Handles undo/redo operations, updating the state accordingly.
  - `snapshot()`: Saves the current workbook as an immutable snapshot.
  - `setColumnWidth(col: number, widthPx: number): Adds a new column to the sheet.
  - `insertRowBelow()`: Inserts a new row below the selected one.
  - `insertColumnRight()`: Inserts a new column to the right of the selected one.
  - `addSheet(name: string): Adds a new sheet with the specified name.
  - `removeSheet(index: number): Removes a sheet at the specified index.
  - `renameSheet(index: number, name: string): Renames an existing sheet.

### Example Usage

```typescript
// Load an existing workbook from IndexedDB
const workbook = WorkbookStore.loadWorkbook(yourWorkbookObject);

// Use the workbook as needed
workbook.setCell(1, 2, { text: 'Hello, World!' });
console.log(workbook.getCellValue(1, 2));
```

## Notes

- **State Management**: The `WorkbookStore` maintains a state tree with a single root object (usually an instance of `Workbook`).
- **Reflexibility**: It allows for the easy addition or removal of sheets, cells, and other objects within the same state.
- **Error Handling**: Handles potential errors such as missing keys or invalid sheet names.
- **Performance**: Efficiently manages cell selections and applies formatting styles.
