import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormatOption } from '../core/formats/spreadsheet-format';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslationKey } from '../core/i18n/translations';

export interface FormatDialogResult {
  values: Record<string, string>;
  /** Only present when the dialog asked for a file name (save flow). */
  fileName?: string;
}

/**
 * Modal shown before a file is opened or saved: asks for format options
 * (e.g. the CSV column separator) and, when saving, the file name. Emits
 * the result, or `null` when cancelled.
 */
@Component({
  selector: 'app-format-options-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="cancel()">
      <div
        #dialog
        class="dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="i18n.t(titleKey())"
        (click)="$event.stopPropagation()"
        (keydown)="onKeydown($event)"
      >
        <h2 class="title">{{ i18n.t(titleKey()) }}</h2>
        @if (askName()) {
          <label class="name-row">
            <span class="name-label">{{ i18n.t('file.name') }}</span>
            <input
              class="name-input"
              type="text"
              [value]="nameValue()"
              (input)="nameValue.set($any($event.target).value)"
              (keydown.enter)="confirm()"
            />
          </label>
        }
        @for (option of options(); track option.key) {
          <fieldset class="option">
            <legend class="legend">{{ i18n.t(option.labelKey) }}</legend>
            @for (choice of option.choices; track choice.value) {
              <label class="choice">
                <input
                  type="radio"
                  [name]="option.key"
                  [value]="choice.value"
                  [checked]="!isCustom(option.key) && valueOf(option) === choice.value"
                  (change)="setValue(option.key, choice.value)"
                />
                {{ i18n.t(choice.labelKey) }}
              </label>
            }
            @if (option.allowCustom) {
              <label class="choice">
                <input
                  type="radio"
                  [name]="option.key"
                  [checked]="isCustom(option.key)"
                  (change)="selectCustom(option.key)"
                />
                {{ i18n.t('dialog.custom') }}
                <input
                  type="text"
                  class="custom-input"
                  maxlength="1"
                  [value]="customValueOf(option.key)"
                  [attr.aria-label]="i18n.t('dialog.custom')"
                  (focus)="selectCustom(option.key)"
                  (input)="setCustomValue(option.key, $any($event.target).value)"
                />
              </label>
            }
          </fieldset>
        }
        <div class="actions">
          <button type="button" class="btn" (click)="cancel()">
            {{ i18n.t('dialog.cancel') }}
          </button>
          <button type="button" class="btn primary" [disabled]="!canConfirm()" (click)="confirm()">
            {{ i18n.t('dialog.ok') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(15 23 42 / 0.4);
    }
    .dialog {
      min-width: min(18rem, calc(100vw - 2rem));
      max-width: calc(100vw - 2rem);
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
      background: #ffffff;
      color: #1e293b;
      box-shadow: 0 10px 30px rgb(15 23 42 / 0.3);
    }
    .title {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      font-weight: 600;
    }
    .option {
      margin: 0 0 0.75rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
    }
    .legend {
      padding: 0 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }
    .choice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .choice input:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 1px;
    }
    .name-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin: 0 0 0.75rem;
    }
    .name-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }
    .name-input {
      min-height: 2rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #94a3b8;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .name-input:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 1px;
    }
    .custom-input {
      width: 2.5rem;
      min-height: 1.75rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid #94a3b8;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      text-align: center;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .btn {
      min-height: 2rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid #94a3b8;
      border-radius: 0.25rem;
      background: #ffffff;
      color: #1e293b;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .btn:hover {
      background: #e2e8f0;
    }
    .btn:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 1px;
    }
    .btn.primary {
      background: #1d4ed8;
      border-color: #1d4ed8;
      color: #ffffff;
    }
    .btn.primary:hover {
      background: #1e40af;
    }
  `,
})
export class FormatOptionsDialogComponent {
  protected readonly i18n = inject(I18nService);

  readonly options = input.required<FormatOption[]>();
  readonly titleKey = input<TranslationKey>('file.options');
  /** Show a file-name field (save flow). */
  readonly askName = input(false);
  readonly defaultName = input('');

  readonly closed = output<FormatDialogResult | null>();

  protected readonly nameValue = linkedSignal(() => this.defaultName());

  private readonly dialogRef = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly values = signal<Record<string, string>>({});
  private readonly customSelected = signal<Record<string, boolean>>({});
  private readonly customValues = signal<Record<string, string>>({});

  constructor() {
    afterNextRender(() => {
      this.dialogRef().nativeElement.querySelector<HTMLElement>('input, button')?.focus();
    });
  }

  protected valueOf(option: FormatOption): string {
    return this.values()[option.key] ?? option.defaultValue;
  }

  protected setValue(key: string, value: string): void {
    this.values.update((v) => ({ ...v, [key]: value }));
    this.customSelected.update((c) => ({ ...c, [key]: false }));
  }

  protected isCustom(key: string): boolean {
    return this.customSelected()[key] ?? false;
  }

  protected selectCustom(key: string): void {
    this.customSelected.update((c) => ({ ...c, [key]: true }));
  }

  protected setCustomValue(key: string, value: string): void {
    this.customValues.update((v) => ({ ...v, [key]: value }));
  }

  protected customValueOf(key: string): string {
    return this.customValues()[key] ?? '';
  }

  /** A selected custom value must be one character and not the CSV quote; a requested name must not be blank. */
  protected canConfirm(): boolean {
    if (this.askName() && this.nameValue().trim() === '') return false;
    return this.options().every((option) => {
      if (!this.isCustom(option.key)) return true;
      const value = this.customValueOf(option.key);
      return value.length === 1 && value !== '"';
    });
  }

  protected confirm(): void {
    if (!this.canConfirm()) return;
    const values: Record<string, string> = {};
    for (const option of this.options()) {
      values[option.key] = this.isCustom(option.key)
        ? this.customValueOf(option.key)
        : this.valueOf(option);
    }
    this.closed.emit({
      values,
      ...(this.askName() ? { fileName: this.nameValue().trim() } : {}),
    });
  }

  protected cancel(): void {
    this.closed.emit(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep focus inside the modal
    const focusable = Array.from(
      this.dialogRef().nativeElement.querySelectorAll<HTMLElement>('input, button'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
