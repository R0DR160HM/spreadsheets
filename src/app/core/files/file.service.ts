import { inject, Injectable } from '@angular/core';
import { FormatRegistryService } from '../formats/format-registry.service';
import { Workbook } from '../model/workbook.model';

/** Opens files through the format registry and saves workbooks as downloads. */
@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly registry = inject(FormatRegistryService);

  /** @throws `unsupported` if no importer matches the file extension. */
  async open(file: File, options?: Record<string, string>): Promise<Workbook> {
    const descriptor = this.registry.forFileName(file.name);
    if (!descriptor?.canImport) throw new Error('unsupported');
    const format = await descriptor.load();
    if (!format.read) throw new Error('unsupported');
    return format.read(file, { options });
  }

  async save(
    workbook: Workbook,
    formatId: string,
    activeSheetIndex = 0,
    options?: Record<string, string>,
  ): Promise<void> {
    const descriptor = this.registry.byId(formatId);
    if (!descriptor?.canExport) throw new Error('unsupported');
    const format = await descriptor.load();
    if (!format.write) throw new Error('unsupported');
    const blob = await format.write(workbook, { activeSheetIndex, options });
    download(blob, `${workbook.name || 'spreadsheet'}.${descriptor.extension}`);
  }
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
