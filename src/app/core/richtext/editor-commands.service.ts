import { Injectable, signal } from '@angular/core';

/**
 * Bridge between the toolbar and the active cell editor. While a cell is
 * being edited, formatting applies to the editor's text selection; the
 * toolbar checks `active()` to decide whether to route here or to the store.
 */
@Injectable({ providedIn: 'root' })
export class EditorCommandsService {
  private editor: HTMLElement | null = null;
  readonly active = signal(false);

  register(editor: HTMLElement): void {
    this.editor = editor;
    this.active.set(true);
  }

  unregister(editor: HTMLElement): void {
    if (this.editor === editor) {
      this.editor = null;
      this.active.set(false);
    }
  }

  exec(command: 'bold' | 'italic' | 'underline' | 'strikeThrough'): void {
    this.focusEditor();
    document.execCommand(command);
  }

  /** True while the active editor holds a formula (text starting with `=`). */
  isEditingFormula(): boolean {
    return this.active() && (this.editor?.textContent ?? '').trimStart().startsWith('=');
  }

  /** Inserts text at the caret — used to insert cell references clicked mid-formula. */
  insertText(text: string): void {
    this.focusEditor();
    document.execCommand('insertText', false, text);
  }

  setTextColor(color: string): void {
    this.focusEditor();
    document.execCommand('foreColor', false, color);
  }

  /**
   * `execCommand` only supports legacy 1–7 sizes, so apply size 7 as a
   * marker and rewrite the generated `<font>` tags to real point sizes.
   */
  setFontSize(points: number): void {
    if (!this.editor) return;
    this.focusEditor();
    document.execCommand('fontSize', false, '7');
    for (const font of Array.from(this.editor.querySelectorAll('font[size="7"]'))) {
      const span = document.createElement('span');
      span.style.fontSize = `${points}pt`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    }
  }

  private focusEditor(): void {
    this.editor?.focus();
  }
}
