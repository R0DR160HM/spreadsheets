import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FileService } from '../core/files/file.service';
import { FormatRegistryService } from '../core/formats/format-registry.service';
import { FormatDescriptor, FormatOption } from '../core/formats/spreadsheet-format';
import { I18nService } from '../core/i18n/i18n.service';
import { TitlebarService } from '../core/pwa/titlebar.service';
import { EditorCommandsService } from '../core/richtext/editor-commands.service';
import { TranslationKey } from '../core/i18n/translations';
import { WorkbookStore } from '../core/state/workbook.store';
import {
  FormatDialogResult,
  FormatOptionsDialogComponent,
} from './format-options-dialog.component';

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];

@Component({
  selector: 'app-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatOptionsDialogComponent],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class ToolbarComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(WorkbookStore);
  protected readonly titlebar = inject(TitlebarService);
  protected readonly registry = inject(FormatRegistryService);
  private readonly files = inject(FileService);
  private readonly editorCommands = inject(EditorCommandsService);

  protected readonly fontSizes = FONT_SIZES;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly menuOpen = signal(false);
  /** Viewport position of the open menu (fixed, so the scrollable toolbar can't clip it). */
  protected readonly menuPosition = signal({ top: 0, left: 0 });

  /** Options dialog currently shown; resolves with the chosen values or null. */
  protected readonly optionsRequest = signal<{
    options: FormatOption[];
    titleKey: TranslationKey;
    askName: boolean;
    resolve: (result: FormatDialogResult | null) => void;
  } | null>(null);

  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  protected readonly exporters = this.registry.exporters();
  protected readonly accept = this.registry.acceptString();

  protected readonly boldActive = this.flagActive('bold');
  protected readonly italicActive = this.flagActive('italic');
  protected readonly underlineActive = this.flagActive('underline');
  protected readonly strikeActive = this.flagActive('strike');

  protected readonly textColor = computed(
    () => this.store.selectedCell()?.runs.find((r) => r.color)?.color ?? '#000000',
  );
  protected readonly fillColor = computed(
    () => this.store.selectedCell()?.style?.background ?? '#ffffff',
  );
  protected readonly fontSize = computed(
    () => this.store.selectedCell()?.runs.find((r) => r.fontSize)?.fontSize ?? 11,
  );
  protected readonly align = computed(() => this.store.selectedCell()?.style?.align ?? 'left');

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    if (this.menuOpen()) {
      const rect = this.menuButton().nativeElement.getBoundingClientRect();
      const menuWidth = 208; // .menu min-width (13rem)
      this.menuPosition.set({
        top: Math.round(rect.bottom + 4),
        left: Math.round(Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))),
      });
      this.focusMenuItem(0);
    }
  }

  closeMenu(restoreFocus: boolean): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.menuButton().nativeElement.focus();
  }

  onMenuKeydown(event: KeyboardEvent): void {
    const items = this.menuItems();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusMenuItem((current + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusMenuItem((current - 1 + items.length) % items.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.focusMenuItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.focusMenuItem(items.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu(true);
    } else if (event.key === 'Tab') {
      this.closeMenu(false);
    }
  }

  /**
   * Closes the menu on any press outside it. This replaces a focusout-based
   * close: on touch devices buttons never receive focus, so focusout fired
   * with a null relatedTarget and unmounted the menu before the tapped
   * item's click could dispatch.
   */
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.menuOpen()) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.menu-host')) return;
    this.closeMenu(false);
  }

  private menuItems(): HTMLButtonElement[] {
    const menu = this.menu()?.nativeElement;
    return menu ? Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')) : [];
  }

  private focusMenuItem(index: number): void {
    requestAnimationFrame(() => {
      const items = this.menuItems();
      items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
    });
  }

  newWorkbook(): void {
    if (confirm(this.i18n.t('file.confirmNew'))) {
      this.store.newWorkbook();
    }
  }

  async openFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set(null);
    const descriptor = this.registry.forFileName(file.name);
    if (!descriptor?.canImport) {
      this.error.set(this.i18n.t('file.unsupported'));
      return;
    }
    const result = await this.askOptions(descriptor, 'open');
    if (result === null) return;
    this.busy.set(true);
    try {
      this.store.loadWorkbook(await this.files.open(file, result.values));
    } catch (err) {
      this.error.set(
        this.i18n.t(err instanceof Error && err.message === 'unsupported' ? 'file.unsupported' : 'file.openError'),
      );
    } finally {
      this.busy.set(false);
    }
  }

  async save(formatId: string): Promise<void> {
    this.error.set(null);
    const descriptor = this.registry.byId(formatId);
    if (!descriptor) return;
    const result = await this.askOptions(descriptor, 'save');
    if (result === null) return;
    const name = result.fileName?.trim();
    if (name && name !== this.store.workbook().name) this.store.rename(name);
    this.busy.set(true);
    try {
      await this.files.save(
        this.store.workbook(),
        formatId,
        this.store.activeSheetIndex(),
        result.values,
      );
    } catch {
      this.error.set(this.i18n.t('file.saveError'));
    } finally {
      this.busy.set(false);
    }
  }

  onOptionsDialogClosed(result: FormatDialogResult | null): void {
    const request = this.optionsRequest();
    this.optionsRequest.set(null);
    request?.resolve(result);
  }

  /**
   * Prompts before opening/saving. Saving always shows the dialog (it asks
   * for the file name); opening only when the format declares options.
   */
  private askOptions(
    descriptor: FormatDescriptor,
    mode: 'open' | 'save',
  ): Promise<FormatDialogResult | null> {
    const options = descriptor.options ?? [];
    if (mode === 'open' && options.length === 0) {
      return Promise.resolve({ values: {} });
    }
    return new Promise((resolve) =>
      this.optionsRequest.set({
        options,
        titleKey: mode === 'save' ? 'file.save' : 'file.options',
        askName: mode === 'save',
        resolve,
      }),
    );
  }

  saveLabel(formatId: string, label: string): string {
    const exportOnly = this.registry.byId(formatId)?.exportOnly;
    return this.i18n.t(exportOnly ? 'file.export' : 'file.saveFormat', { format: label });
  }

  toggle(flag: 'bold' | 'italic' | 'underline' | 'strike'): void {
    if (this.editorCommands.active()) {
      const command = flag === 'strike' ? 'strikeThrough' : flag;
      this.editorCommands.exec(command);
    } else {
      this.store.toggleRunFlag(flag);
    }
  }

  setTextColor(color: string): void {
    if (this.editorCommands.active()) {
      this.editorCommands.setTextColor(color);
    } else {
      this.store.applyRunStyle({ color });
    }
  }

  setFontSize(value: string): void {
    const size = Number(value);
    if (this.editorCommands.active()) {
      this.editorCommands.setFontSize(size);
    } else {
      this.store.applyRunStyle({ fontSize: size });
    }
  }

  setFillColor(color: string): void {
    this.store.applyCellStyle({ background: color });
  }

  setAlign(align: 'left' | 'center' | 'right'): void {
    this.store.applyCellStyle({ align });
  }

  /** Keeps focus (and the text selection) in the cell editor while clicking toolbar controls. */
  keepFocus(event: MouseEvent): void {
    if (this.editorCommands.active()) event.preventDefault();
  }

  private flagActive(flag: 'bold' | 'italic' | 'underline' | 'strike') {
    return computed(() => {
      const runs = this.store.selectedCell()?.runs;
      return !!runs && runs.length > 0 && runs.every((r) => r[flag]);
    });
  }
}
