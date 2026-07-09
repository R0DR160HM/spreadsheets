# File: src/app/core/formats/pdf-format.ts

## Purpose and Role in the Project
The `PdfFormat` class is designed to generate PDF files from a workbook. It uses the `jsPDF` library for rendering the table and the `autoTable` for formatting the cells, which are then added to the PDF.

## Public/Exported Classes
- **createSheet()**: This method creates a new worksheet in the workbook.
- **evaluateSheet()**: This method evaluates a cell's value and returns it formatted according to its type.
- **CellHookData**: A helper structure for data used by `autoTable` during parsing.

## Notable Internal Logic, Algorithms and Side Effects
1. **jsPDF Setup**: The class sets up the PDF document with landscape orientation, using point size 14.
2. **Body Generation**: For each sheet, it extracts cells and adds them to a table structure.
3. **Cell Formatting**: The `applyCellStyle` method is used to apply styles like bold, italic, color, font size, background, alignment, and more.
4. **Helper Functions**: `hexToRgb` converts hexadecimal values to RGB for styling.

## When Several Companion Files are Given
The `PdfFormat` class can be combined with other formats by passing the corresponding instance to the `write()` method. This allows for easy integration of additional PDF exporters like Excel or a third-party library.

## Testing and Documentation
- **Unit Tests**: Ensure that the `PdfFormat` class works correctly by integrating it with other components and validating its behavior.
- **Documentation**: Document each method, property, and interface to clarify their purpose, parameters, return values, behaviors, error handling, and internal logic.
