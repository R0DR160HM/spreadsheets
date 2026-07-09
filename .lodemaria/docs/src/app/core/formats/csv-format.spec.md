## File: src/app/core/formats/csv-format.spec.ts

### Purpose and Role in the Project:
This file contains unit tests for the `CsvFormat` class, which is responsible for parsing and writing CSV files.

### Public/Exported Classes, Function, Constant, Entry Point:
- **parseCsv**: Parses simple rows, handles CRLF line endings, quoted fields, custom separators, and supports a semicolon separator.
  - Expects an array of arrays (rows) with corresponding cell keys and cell text values.
  - Returns the parsed data as a two-dimensional array.
- **escapeCsvField**: Escapes field containing delimiters, quotes or newlines to ensure correct CSV formatting.
  - Converts field values that should be quoted, escaped, or wrapped in double quotes if necessary.

### Notable Internal Logic:
- **File Reading**: Reads a `.csv` file using `createWorkbook`, creating a worksheet from cells.
- **Cell Formatting**: Uses `cellKey`, `cellText`, and `parseCsv` to format cell text values, handling quoted fields and custom separators.
  - Handles different delimiters (e.g., commas, quotes) by wrapping text in double quotes or escaping it with escape characters.

### When Several Companion Files are Given:
- **Single Unit**: Documented as a single unit containing multiple tests for `parseCsv` and `escapeCsvField`.
- **Companion Files**: Detailed descriptions of each companion file's test cases.

### Related Integration Tests:
- **CSV Format with Separator Option**: Tests the `CsvFormat` class with a semicolon separator, ensuring that cell text values are correctly formatted.
- **Escape Csv Field**: Tests the `escapeCsvField` method to ensure field handling, including quotes and newlines.

This structure provides a comprehensive coverage of both parsing and writing operations for CSV formats in the project.
