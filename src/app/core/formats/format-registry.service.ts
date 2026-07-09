import { Injectable } from '@angular/core';
import { FormatDescriptor } from './spreadsheet-format';

/**
 * Central registry of file format plugins. To add support for a new format,
 * call `register()` with a descriptor whose `load()` lazily imports the
 * implementation — nothing else in the app needs to change.
 */
@Injectable({ providedIn: 'root' })
export class FormatRegistryService {
  private readonly formats = new Map<string, FormatDescriptor>();

  constructor() {
    this.register({
      id: 'csv',
      label: 'CSV',
      extension: 'csv',
      mimeType: 'text/csv',
      canImport: true,
      canExport: true,
      options: [
        {
          key: 'separator',
          labelKey: 'csv.separator',
          defaultValue: ',',
          choices: [
            { value: ',', labelKey: 'csv.sep.comma' },
            { value: ';', labelKey: 'csv.sep.semicolon' },
            { value: '\\t', labelKey: 'csv.sep.tab' },
            { value: '|', labelKey: 'csv.sep.pipe' },
          ],
          allowCustom: true,
        },
      ],
      load: () => import('./csv-format').then((m) => new m.CsvFormat()),
    });
    this.register({
      id: 'xlsx',
      label: 'XLSX',
      extension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      canImport: true,
      canExport: true,
      load: () => import('./xlsx-format').then((m) => new m.XlsxFormat()),
    });
    this.register({
      id: 'pdf',
      label: 'PDF',
      extension: 'pdf',
      mimeType: 'application/pdf',
      canImport: false,
      canExport: true,
      exportOnly: true,
      load: () => import('./pdf-format').then((m) => new m.PdfFormat()),
    });
  }

  register(descriptor: FormatDescriptor): void {
    this.formats.set(descriptor.id, descriptor);
  }

  all(): FormatDescriptor[] {
    return [...this.formats.values()];
  }

  importers(): FormatDescriptor[] {
    return this.all().filter((f) => f.canImport);
  }

  exporters(): FormatDescriptor[] {
    return this.all().filter((f) => f.canExport);
  }

  byId(id: string): FormatDescriptor | undefined {
    return this.formats.get(id);
  }

  forFileName(fileName: string): FormatDescriptor | undefined {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    return this.all().find((f) => f.extension === extension);
  }

  /** `accept` attribute value for the file-open dialog. */
  acceptString(): string {
    return this.importers()
      .map((f) => `.${f.extension}`)
      .join(',');
  }
}
