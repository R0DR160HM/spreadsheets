# XLSX Format

## Overview

This file defines an implementation of the XLSX format using the ExcelJS library, which allows for easy creation and reading of XLSX files. It includes functions to read and write spreadsheets, with options for customizing cell styles and handling nested cells.

## Components

1. **File I/O**: The `read` function reads a file into an `ExcelWorkbook`, where each sheet is represented as a separate object in the `sheets` array.
2. **Writing**: The `write` function writes the contents of an `ExcelWorkbook` to a file, preserving rich-text runs and cell background fills.
3. **Cell Reading**: `readCell` and `writeCell` read and write specific cells within a workbook.
4. **Rich Text Handling**: `isRichValue`, `isFormulaValue`, `hasRunStyle`, and `fontToRunStyle` help determine the type of text to include in a cell's run, and `runStyleToFont` converts font styles between Excel and Node.js formats.
5. **Column Widths**: The `excelWidthToPx` function calculates the width of each column in characters, padding with spaces as necessary.
6. **Pixel Conversion**: The `pxToExcelWidth` function ensures that cells are rendered correctly on the screen by adjusting their font size according to their content.

## Notes

- The `readFile` and `writeFile` functions handle file operations using Node.js's `fs` module, which is recommended for web applications.
- The `sheetName` parameter in the `read` function should match the name of a sheet in the Excel workbook.

This implementation assumes that the XLSX format is well-known and compatible with Excel. If you encounter issues or differences between the file and expected output, consider checking the compatibility of the library and any custom formats used.
