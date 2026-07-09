import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import { TextRun } from '../core/model/workbook.model';
import { EditorCommandsService } from '../core/richtext/editor-commands.service';
import { domToRuns, runsToFragment } from '../core/richtext/rich-text-dom';

export type CommitMove = 'down' | 'up' | 'right' | 'left' | 'none';

export interface EditorCommit {
  runs: TextRun[];
  move: CommitMove;
}

/**
 * Rich-text editor overlay for a single cell. Renders the cell's runs into a
 * contenteditable element; inline formatting while editing comes from the
 * toolbar through `EditorCommandsService`.
 */
@Component({
  selector: 'app-cell-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #editor
      class="editor"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      [attr.aria-label]="label()"
      (keydown)="onKeydown($event)"
      (input)="markTouched()"
      (focusout)="onFocusOut($event)"
    ></div>
  `,
  styles: `
    .editor {
      position: absolute;
      inset: 0;
      z-index: 10;
      min-width: 100%;
      min-height: 100%;
      width: max-content;
      max-width: 40rem;
      padding: 0.125rem 0.375rem;
      background: #ffffff;
      color: #1e293b;
      outline: 2px solid #1d4ed8;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 0.875rem;
      /* The grid disables selection; re-enable it for editing */
      user-select: text;
    }
  `,
})
export class CellEditorComponent implements OnDestroy {
  /** Runs to edit; ignored when `initialText` is set (typing replaced the content). */
  readonly runs = input.required<TextRun[]>();
  readonly initialText = input<string | null>(null);
  readonly label = input('');

  readonly committed = output<EditorCommit>();
  readonly cancelled = output<void>();

  private readonly editorRef = viewChild<ElementRef<HTMLElement>>('editor');
  private readonly commands = inject(EditorCommandsService);
  private done = false;
  /** True once the user has typed directly in the editor. */
  private touched = false;

  constructor() {
    afterNextRender(() => {
      const editor = this.editorRef()?.nativeElement;
      if (editor) this.commands.register(editor);
    });
    // Sync the seed into the editor until the user types here directly —
    // keystrokes buffered by the grid while this component was rendering
    // keep arriving through `initialText` for the first few frames.
    afterRenderEffect(() => {
      const seed = this.initialText();
      if (this.touched) return;
      const editor = this.editorRef()?.nativeElement;
      if (!editor) return;
      if (seed !== null) {
        editor.textContent = seed;
      } else if (editor.childNodes.length === 0) {
        editor.appendChild(runsToFragment(this.runs(), editor.ownerDocument));
      }
      editor.focus();
      moveCaretToEnd(editor);
    });
  }

  ngOnDestroy(): void {
    const editor = this.editorRef()?.nativeElement;
    if (editor) this.commands.unregister(editor);
  }

  markTouched(): void {
    this.touched = true;
  }

  onKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    this.touched = true;
    if (event.key === 'Enter' && !event.altKey && !event.ctrlKey) {
      event.preventDefault();
      this.commit(event.shiftKey ? 'up' : 'down');
    } else if (event.key === 'Enter') {
      // Alt/Ctrl+Enter inserts a line break within the cell. Chrome does not
      // implement `insertLineBreak`, so fall back to inserting a <br>.
      event.preventDefault();
      if (!document.execCommand('insertLineBreak')) {
        document.execCommand('insertHTML', false, '<br>');
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.commit(event.shiftKey ? 'left' : 'right');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.done = true;
      this.cancelled.emit();
    }
  }

  onFocusOut(event: FocusEvent): void {
    // Commit when focus leaves the editor entirely. Focus moving into the
    // toolbar (e.g. the color picker) is still part of the same edit.
    const editor = this.editorRef()?.nativeElement;
    if (!editor) return;
    const target = event.relatedTarget;
    if (target instanceof Element && (editor.contains(target) || target.closest('[role="toolbar"]'))) {
      return;
    }
    this.commit('none');
  }

  private commit(move: CommitMove): void {
    if (this.done) return;
    const editor = this.editorRef()?.nativeElement;
    if (!editor) return;
    this.done = true;
    this.committed.emit({ runs: domToRuns(editor), move });
  }
}

function moveCaretToEnd(el: HTMLElement): void {
  const selection = el.ownerDocument.defaultView?.getSelection();
  if (!selection) return;
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
