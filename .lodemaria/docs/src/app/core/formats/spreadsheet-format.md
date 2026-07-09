# Spreadsheet Format

This file provides an implementation of a spreadsheet format plugin, which allows users to import and export files in a structured manner using Google Sheets.

### Purpose and Role

The plugin implements various functionality, including reading from and writing to Google Sheets. It supports both read-only and write-only formats, as well as exporting specific Excel files based on user selections.

#### Public/Exported Classes

1. **Workbook**: Represents the workbook being loaded or exported.
2. **ReadContext**: Contains options for reading a file.
3. **WriteContext**: Contains information about which worksheet to export, along with options for writing.

4. **FormatOption**: Defines an option for format settings.

5. **FormatDescriptor**: Represents the format without loading its implementation and provides access to its load function.

### Notable Internal Logic

- **Reading from Google Sheets**: Uses `google-apps-script` to interact with Google Sheets API.
- **Writing to Google Sheets**: Uses `google-apps-script` to write data to Google Sheets.

#### When Several Companion Files are Given

If multiple companion files are provided, they are treated as one unit. Each file contains its own set of options and implementors.

### Code Examples

Here's a simple example of how you might use the `SpreadsheetFormat` plugin in a web application:

```typescript
// Importing required modules from google-apps-script
const { SpreadsheetApp } = GoogleAppsScript;

async function loadSpreadsheetFormat() {
  try {
    // Reading from a file
    const workbook = await SpreadsheetApp.openById('1234567890');
    console.log(workbook);

    // Writing to a file
    await spreadsheetApp.saveCells({ range: 'A1:B10', values: [['Name', 'Age']] });
  } catch (error) {
    console.error('Error loading or writing workbook:', error);
  }
}

// Example usage of the plugin
loadSpreadsheetFormat();
```

### Additional Considerations

- **Error Handling**: Implement robust error handling for each file operation.
- **Performance**: Ensure that your application can handle large files efficiently.
- **API Limitations**: Be mindful of Google Sheets API limits and consider using other methods if necessary.

This framework provides a basic structure for implementing spreadsheet formats in a web application, with the ability to support read/write operations as specified.
