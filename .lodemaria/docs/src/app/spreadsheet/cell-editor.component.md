### File: src/app/spreadsheet/cell-editor.component.ts

#### Purpose and Role:
The `CellEditorComponent` is a rich-text editor component used to edit cell text in a spreadsheet. It supports direct typing through the toolbar, allowing users to insert, delete, or move text within the cells.

#### Public/Exported Classes:
- **CommitMove**: Represents possible moves of the cursor (down, up, right, left).
- **EditorCommit**: Stores committed text run details and movement information.
- **domToRuns**: Converts DOM `TextRun` objects into a list of runs for rendering.
- **runsToFragment**: Converts a list of runs into an HTML fragment for rendering.

#### Notable Internal Logic:
1. **TextRun**: Represents individual text runs within the editor, containing properties like `text`, `style`, and `startIndex`.
2. **EditorCommandsService**: Handles commands for adding, deleting, or moving text based on the user's actions.
3. **AfterNextRender**: Ensures that the editor has focus after rendering.
4. **afterRenderEffect**: Applies changes to the editor upon entering an input field (e.g., toolbar selection).
5. **markTouched**: Tracks when the user types directly in the editor.
6. **onKeydown**: Handles keyboard events for editing, including moving caret and committing text.
7. **onFocusOut**: Closes the editor if focus leaves it entirely.
8. **commit**: Executes the committed changes.

#### When Several Companion Files are Given:
The `CellEditorComponent` is composed of two companion files: one for the component's template (`cell-editor.component.html`) and another for its styling (`cell-editor.component.scss`). These components are placed together in a single unit to facilitate easy integration and management.
