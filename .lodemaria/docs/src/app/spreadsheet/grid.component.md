```markdown
# Spreadsheet Grid Component

## Purpose and Role
The `app/spreadsheet/grid.component` is designed to render the active sheet as a table with sticky headers, handle selection + keyboard navigation, and host the rich-text editor overlay on the selected cell.

### Public/Exported Classes
- **CellRef**: Represents a stable reference to a cell in the grid.
- **CellRowComponent**: Manages the editing of cells and provides methods for handling commits.
- **GridRowComponent**: Represents individual rows of data in the grid, which can be extended with additional components (e.g., `SheetHeaderComponent`).

### Notable Internal Logic
1. **Dragging Selection**: The `endDragSelect` method stops re-rendering selected cells when a drag ends.
2. **Column Resizing**: The `startResize`, `onResizeMove`, and `endResize` methods handle column resizing, updating the guide line on release.
3. **Focus Management**: The `moveSelection` and `focusSelectedCell` methods manage the focus state of each cell.

### When Several Companion Files are Given
The companion files share a common path and name (e.g., `app/spreadsheet/grid.component.html`), so they can be integrated into the main component's structure without duplicating code. Each file is responsible for rendering the grid, handling user interactions, and managing the grid's state.

## Performance
Rows are `GridRowComponent`s fed only primitive/stable references, so drags and resizes re-render just the rows that changed.
Cell pointer events are delegated to the scroller instead of binding listeners on every cell.
