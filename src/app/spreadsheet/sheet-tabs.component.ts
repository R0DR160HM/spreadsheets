import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { WorkbookStore } from '../core/state/workbook.store';

/** Bottom bar with one button per sheet, plus add/remove/rename controls. */
@Component({
  selector: 'app-sheet-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs" role="toolbar" [attr.aria-label]="i18n.t('sheet.tabs')">
      @for (sheet of store.workbook().sheets; track $index) {
        @if (renaming() === $index) {
          <input
            class="rename-input"
            type="text"
            [value]="sheet.name"
            [attr.aria-label]="i18n.t('sheet.rename')"
            (keydown.enter)="commitRename($index, $any($event.target).value)"
            (keydown.escape)="renaming.set(null)"
            (blur)="commitRename($index, $any($event.target).value)"
            autofocus
          />
        } @else {
          <button
            type="button"
            class="tab"
            [class.active]="$index === store.activeSheetIndex()"
            [attr.aria-pressed]="$index === store.activeSheetIndex()"
            (click)="store.selectSheet($index)"
            (dblclick)="renaming.set($index)"
          >
            {{ sheet.name }}
          </button>
        }
      }
      <button
        type="button"
        class="tab action"
        (click)="store.addSheet()"
        [attr.aria-label]="i18n.t('sheet.add')"
        [title]="i18n.t('sheet.add')"
      >
        <span aria-hidden="true">+</span>
      </button>
      @if (store.workbook().sheets.length > 1) {
        <button
          type="button"
          class="tab action"
          (click)="removeActive()"
          [attr.aria-label]="i18n.t('sheet.remove')"
          [title]="i18n.t('sheet.remove')"
        >
          <span aria-hidden="true">×</span>
        </button>
      }
    </div>
  `,
  styles: `
    .tabs {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      border-top: 1px solid #cbd5e1;
      background: #f8fafc;
      overflow-x: auto;
    }
    .tab {
      touch-action: manipulation;
      min-height: 1.85rem;
      padding: 0.125rem 0.75rem;
      border: 1px solid #94a3b8;
      border-radius: 0.25rem;
      background: #ffffff;
      color: #1e293b;
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .tab:hover {
      background: #e2e8f0;
    }
    .tab:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 1px;
    }
    .tab.active {
      background: #dbeafe;
      border-color: #1d4ed8;
      font-weight: 600;
    }
    .action {
      min-width: 1.85rem;
      font-weight: 700;
    }
    .rename-input {
      min-height: 1.85rem;
      padding: 0.125rem 0.5rem;
      border: 1px solid #1d4ed8;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      width: 8rem;
    }
    @media (pointer: coarse) {
      .tab,
      .rename-input {
        min-height: 2.75rem;
      }
      .action {
        min-width: 2.75rem;
      }
    }
  `,
})
export class SheetTabsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(WorkbookStore);
  protected readonly renaming = signal<number | null>(null);

  protected commitRename(index: number, name: string): void {
    if (this.renaming() === null) return;
    this.renaming.set(null);
    this.store.renameSheet(index, name);
  }

  protected removeActive(): void {
    const index = this.store.activeSheetIndex();
    const name = this.store.workbook().sheets[index].name;
    if (confirm(this.i18n.t('sheet.confirmRemove', { name }))) {
      this.store.removeSheet(index);
    }
  }
}
