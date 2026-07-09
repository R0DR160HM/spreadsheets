## GridRowComponent

One grid row in a spreadsheet application, which is responsible for rendering and handling cell content. It uses the `@for` loop to iterate over each column, applying styles and behaviors based on the current cell's state.

### **Attributes**

- `row`: The index of the current row.
- `colCount`: The total number of columns in the grid.
- `cells`: A read-only map containing the cell values for all cells in the grid.
- `evaluated`: A read-only map containing formulas evaluated for each cell.
- `selectedCol`: The column ID of the currently selected cell, or -1 if no selection is active.
- `editingCol`: The column ID of the currently active editor, or -1 if no editing is active.
- `rangeStart`: The start index of the range intersecting the current row.
- `rangeEnd`: The end index of the range intersecting the current row.
- `editSeed`: The seed text for the editor, typically null for rows that are not editing.
- `editorLabel`: A label to display in the editor.

### **Component Logic**

#### `cellAt(col: number): Cell | undefined`
This method retrieves the cell value at a specific column. It uses the `cells` map for efficient lookups.

#### `formulaResult(col: number): string | null`
This method computes the formula result for a given cell, ensuring that changes only affect cells with unaltered formulas.

#### `inRange(col: number): boolean`
This method checks if a given column is within the range of the current row.

#### `textDecoration(run: { underline?: boolean; strike?: boolean }): string | null`
This helper function formats the text decoration based on whether it's an underline or strikethrough.

### **Event Handlers**

- **`committed`:** This method emits an event when a cell is committed to the editor, allowing any changes to be tracked.
- **`cancelled`:** This method emits a cancellation event when the editor is cancelled.

This component serves as a bridge between the spreadsheet's data model and the rendering logic, ensuring that the grid remains responsive even as cells are edited or selected.
