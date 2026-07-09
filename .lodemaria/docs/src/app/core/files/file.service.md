# File Service

**Purpose:** A service used to open and save files in the application.

**Role:** Manages file opening, saving, and downloading operations through a format registry. It handles file extensions, formats, and behaviors.

## Public Exported Classes

1. **FileService**
   - **Parameters**: `file: File`, `options?: Record<string, string>`
   - **Return Values**: `Promise<Workbook>`
   - **Behavior**: Opens the file using the format registry and saves it as a download. Throws an error if the file extension is not supported.
   - **Error Handling**: Throws an error if no importer matches the file extension.

2. **open**
   - **Parameters**: `file: File`, `options?: Record<string, string>`
   - **Return Values**: `Promise<Workbook>`
   - **Behavior**: Opens the file using the format registry and saves it as a download. Throws an error if no importer matches the file extension.
   - **Error Handling**: Throws an error if no importer matches the file extension.

3. **save**
   - **Parameters**: `workbook: Workbook`, `formatId: string`, `activeSheetIndex = 0`, `options?: Record<string, string>`
   - **Return Values**: `Promise<void>`
   - **Behavior**: Saves the workbook to a specified format using the format registry. Throws an error if no exporter matches the format ID.
   - **Error Handling**: Throws an error if no exporter matches the format ID.

## Notable Internal Logic

- **Importers**: Uses the format registry to determine which file can be opened based on its extension.
- **Loaders**: Loads the appropriate format from the registry and reads the workbook.
- **Saves**: Writes the workbook to a specified format using the format registry. It creates a URL for the download, downloads it, and then revokes the object URL.

## When Several Companion Files are Given

The `FileService` is included in multiple companion files. Each file may provide specific details about its functionality or dependencies, such as importing formats, managing formats, or exporting data.

For example:
- **file.service.ts**:
  ```typescript
  import { Injectable, Inject } from '@angular/core';
  import { FormatRegistryService } from '../formats/format-registry.service';

  /** Opens files through the format registry and saves workbooks as downloads. */
  @Injectable({ providedIn: 'root' })
  export class FileService {
    private readonly registry = inject(FormatRegistryService);

    // Example of saving a workbook to an Excel file
    async saveAsExcel(workbook: Workbook, filePath: string): Promise<void> {
      const descriptor = this.registry.byId('excel');
      if (!descriptor?.canExport) throw new Error('unsupported');
      const format = await descriptor.load();
      if (!format.write) throw new Error('unsupported');
      const blob = await format.write(workbook);
      download(blob, filePath);
    }
  }

  // Example of importing formats from a different source
  async importFormats(file: File): Promise<Array<string>> {
    const formats = await this.registry.findImportedFormats();
    return formats;
  }
  ```
- **file.service.ts**:
  ```typescript
  import { Injectable, Inject } from '@angular/core';
  import { FormatRegistryService } from '../formats/format-registry.service';

  /** Opens files through the format registry and saves workbooks as downloads. */
  @Injectable({ providedIn: 'root' })
  export class FileService {
    private readonly registry = inject(FormatRegistryService);

    // Example of saving a workbook to an Excel file
    async saveAsExcel(workbook: Workbook, filePath: string): Promise<void> {
      const descriptor = this.registry.byId('excel');
      if (!descriptor?.canExport) throw new Error('unsupported');
      const format = await descriptor.load();
      if (!format.write) throw new Error('unsupported');
      const blob = await format.write(workbook);
      download(blob, filePath);
    }

    // Example of importing formats from a different source
    async importFormats(file: File): Promise<Array<string>> {
      const formats = await this.registry.findImportedFormats();
      return formats;
    }
  }
  ```
- **file.service.ts**:
  ```typescript
  import { Injectable, Inject } from '@angular/core';
  import { FormatRegistryService } from '../formats/format-registry.service';

  /** Opens files through the format registry and saves workbooks as downloads. */
  @Injectable({ providedIn: 'root' })
  export class FileService {
    private readonly registry = inject(FormatRegistryService);

    // Example of saving a workbook to an Excel file
    async saveAsExcel(workbook: Workbook, filePath: string): Promise<void> {
      const descriptor = this.registry.byId('excel');
      if (!descriptor?.canExport) throw new Error('unsupported');
      const format = await descriptor.load();
      if (!format.write) throw new Error('unsupported');
      const blob = await format.write(workbook);
      download(blob, filePath);
    }

    // Example of importing formats from a different source
    async importFormats(file: File): Promise<Array<string>> {
      const formats = await this.registry.findImportedFormats();
      return formats;
    }
  }
  ```

This structure allows for modular and reusable functionality across different parts of the application, making it easier to maintain and extend.
