### EditorCommandsService

Bridge between the toolbar and the active cell editor. While a cell is being edited, formatting applies to the editor's text selection; the toolbar checks `active()` to decide whether to route here or to the store.

#### Public APIs

- **register(editor: HTMLElement): void**: Registers an editor element with this service.
- **unregister(editor: HTMLElement): void**: Removes an editor element from this service.
- **exec(command: 'bold' | 'italic' | 'underline' | 'strikeThrough'): void**: Executes a command on the active editor, adjusting formatting as needed.
- **isEditingFormula(): boolean**: Checks if the active editor holds a formula.
- **insertText(text: string): void**: Inserts text at the caret, handling text within cell references.
- **setTextColor(color: string): void**: Sets the text color of the active editor.
- **setFontSize(points: number): void**: Adjusts the font size of the selected text to the nearest 7-point size.

#### Internal Logic

- **focusEditor(): void**: Focuses on the active editor to ensure proper formatting operations are applied.
- **isEditingFormula(): boolean**: Checks if the editor is currently editing a formula, which triggers the insertion of cell references.

This service facilitates interactive and responsive text editing in components like the Rich Text Editor.
