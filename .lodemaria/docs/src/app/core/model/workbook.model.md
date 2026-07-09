# Workbook Model

The `Workbook` model is designed to manage spreadsheet data in a structured and efficient manner. It encapsulates properties such as the workbook's name, sheet names, cell contents, and column widths.

## Overview

- **File Name**: The file name without extension.
- **Sheets**: A collection of sheets with their own properties (name, row count, col count).
- **Cells**: Each sheet contains a collection of cells with their properties (runs, style).
- **Columns**: Represents the column indices (0-based) and their corresponding spreadsheet letters.

## Public/Exported Classes

### `TextRun`

An object representing text run in a cell. It includes:
- `text`: The content of the text run.
- `bold?`: A boolean indicating if the text is bold.
- `italic?`: A boolean indicating if the text is italic.
- `underline?`: A boolean indicating if the text is underlined.
- `strike?`: A boolean indicating if the text is strikethrough.
- `color?: string`: A CSS hex color for the text.
- `fontSize?: number`: The font size in points.

### `CellStyle`

An object representing cell style. It includes:
- `background?`: A CSS hex background color for the cell.
- `align?`: A textAlign (left, center, right) for the cell.

### `Cell`

A representation of a cell in the workbook. It includes:
- `runs`: An array of text runs, which can be empty or contain multiple runs with different styles.
- `style`: An object representing the cell's style.

### `Sheet`

A collection of cells for a specific sheet. It includes:
- `name`: The name of the sheet.
- `rowCount`: The number of rows in the sheet.
- `colCount`: The number of columns in the sheet.
- `cells`: A Map of cell keys to `Cell` objects.
- `colWidths`: An object representing column widths, keyed by column index.

### `Workbook`

The entire workbook, containing all sheets and their respective properties. It includes:
- `name`: The name of the workbook.
- `sheets`: A collection of `Sheet` objects.

## Public/Exported Functions

### `cellKey(row: number, col: number)`

A utility function to create a unique key for a cell based on its row and column indices.

### `createSheet(name: string, rowCount = DEFAULT_ROWS, colCount = DEFAULT_COLS): Sheet`

A factory function to create a new sheet with the specified name, default rows, and columns. It returns a `Sheet` object.

### `createWorkbook(name: string, sheetName: string): Workbook`

A factory function to create a new workbook with the specified name and sheet names. It returns a `Workbook` object.

### `columnName(col: number): string`

A utility function to convert a column index into a spreadsheet letter (e.g., 'A', 'Z', 'AA').

### `cellText(cell: Cell | undefined): string`

Converts a cell's rich runs to plain text for easier CSV, accessibility, etc. If the cell is empty or does not have style, it returns an empty string.

### `plainCell(text: string): Cell`

Creates a plain cell object from a given string of text.

### `isEmptyCell(cell: Cell | undefined): boolean`

Checks if a cell's text is empty and has no style.

### `normalizeRuns(runs: TextRun[]): TextRun[]`

Normalizes a list of runs to ensure each run has the same formatting, dropping empty ones. It returns the normalized list.

### `sameRunStyle(a: TextRun, b: TextRun): boolean`

Checks if two text runs have the same style properties.

### `serializeWorkbook(workbook: Workbook): SerializedWorkbook`

Serializes the workbook into a JSON-safe format, including Map and Record objects for sparse cell storage.

### `deserializeWorkbook(data: SerializedWorkbook): Workbook`

Deserializes a workbook from its JSON-safe representation, creating a new instance of `Workbook`.

## Usage Examples

```typescript
// Example usage of createSheet and createWorkbook
const sheet = createSheet('Data');
sheet.cells.set(cellKey(0, 1), plainCell('Hello'));
sheet.cells.set(cellKey(2, 2), plainCell('World'));

const workbook = createWorkbook('Report', 'Data');
workbook.sheets.push(sheet);
```

## Additional Considerations

- **Column Widths**: The `colWidths` property allows for the customization of column widths in pixels. Adjust this value as needed.
- **Sparse Cell Storage**: The use of a Map to store cell properties ensures efficient retrieval and modification of cells based on their index.

This structure provides a robust foundation for managing spreadsheet data, making it easy to add new features or integrate with existing systems.
