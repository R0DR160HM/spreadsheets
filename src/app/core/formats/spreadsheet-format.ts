import { TranslationKey } from '../i18n/translations';
import { Workbook } from '../model/workbook.model';

/**
 * A file format plugin. Implement `read` to support importing and `write`
 * to support exporting; a format may implement either or both.
 */
export interface SpreadsheetFormat {
  /** Parses a file into a workbook. Absent for export-only formats (e.g. PDF). */
  read?(file: File, context?: ReadContext): Promise<Workbook>;
  /** Serializes a workbook into a downloadable blob. Absent for import-only formats. */
  write?(workbook: Workbook, context?: WriteContext): Promise<Blob>;
}

export interface ReadContext {
  /** Values for the descriptor's `options`, keyed by option key. */
  options?: Record<string, string>;
}

export interface WriteContext {
  /** Sheet the user is viewing; single-table formats (e.g. CSV) export this one. */
  activeSheetIndex: number;
  /** Values for the descriptor's `options`, keyed by option key. */
  options?: Record<string, string>;
}

/** A single-choice option the user is asked about before reading/writing. */
export interface FormatOption {
  key: string;
  labelKey: TranslationKey;
  defaultValue: string;
  choices: { value: string; labelKey: TranslationKey }[];
  /** Offer a free-form single-character value in addition to `choices`. */
  allowCustom?: boolean;
}

/**
 * Registry entry describing a format without loading its implementation.
 * The implementation (and any heavy third-party library it needs) is only
 * loaded on first use via the lazy `load()` function.
 */
export interface FormatDescriptor {
  /** Unique id, e.g. `csv` */
  id: string;
  /** User-facing name, e.g. `CSV` */
  label: string;
  /** Lowercase file extension without the dot, e.g. `xlsx` */
  extension: string;
  mimeType: string;
  canImport: boolean;
  canExport: boolean;
  /** `true` for formats that lose spreadsheet structure (e.g. PDF export). */
  exportOnly?: boolean;
  /** Options the user is prompted for before opening or saving (e.g. CSV separator). */
  options?: FormatOption[];
  load(): Promise<SpreadsheetFormat>;
}
