# CsvFormat

The `CsvFormat` class in the project is responsible for parsing and exporting CSV files. It supports basic CSV import/export functionality, including handling quoted fields and newlines.

### Public Methods

#### read(file: File, context?: ReadContext): Promise<Workbook>
Reads a CSV file from a specified file path, parses it into rows of fields, and returns the workbook.
- Parameters:
  - `file`: A `File` object representing the CSV file.
  - `context?`: An optional `ReadContext` object containing options for parsing the CSV.
- Returns:
  - A `Workbook` object created from the parsed CSV data.

#### write(workbook: Workbook, context?: WriteContext): Promise<Blob>
Writes a workbook to a specified file path as a CSV file. The workbook's cells are unformatted, and only the active sheet is exported.
- Parameters:
  - `workbook`: A `Workbook` object representing the workbook.
  - `context?`: An optional `WriteContext` object containing options for exporting the workbook.
- Returns:
  - A `Blob` object representing the CSV file.

### Internal Logic

1. **Parser**: The `parseCsv` method reads a CSV text and splits it into rows of fields using the specified separator. It handles quoted fields with embedded delimiters and newlines by iterating over each character and treating characters inside quotes as part of the field.

2. **Validation**: The `read` method checks for UTF-8 BOMs and ensures that the parsed CSV is valid before returning it.

3. **Exporting**: The `write` method constructs a CSV string from the workbook's cells, ensuring only the active sheet is included in the export.

### Notable Internal Logic

- **Quotes Handling**: The method uses boolean flags (`inQuotes`) to track whether it's currently inside a quoted field and whether it's processing the next character.
- **Newline Handling**: The method handles the newline delimiter by checking if the current character is a newline or the end of the file.
- **CSV Field Encoding**: The `escapeCsvField` function safely encodes string values in a CSV format, ensuring proper escaping.

This class provides a basic framework for handling CSV files and exporting them efficiently.
