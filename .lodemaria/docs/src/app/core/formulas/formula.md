**File: src/app/core/formulas/formula.ts**

**Purpose:** Provides utilities for evaluating Excel-style formulas with various types of arguments.

**Role in the Project:**
- Handles basic arithmetic operations and function evaluations.
- Supports cell references, ranges, functions, and error handling.
- Validates input to ensure it is a valid cell reference or range.

**Description of Public/Exported Classes, Function, Constant, Entry Point:**

- **FormulaError:** Custom exception for errors related to Excel-like codes in formulas.
- **evaluateCells:** Evaluates a list of cells based on the provided function and cache.
- **evaluateSheet:** Evaluates all sheet cells.
- **displayText:** Converts a cell's text to its formatted display text.
- **Parser:** Parses expressions and functions, handles parentheses and ranges, and returns the evaluated result.

**Description of Notable Internal Logic, Algorithms, and Side Effects:**

1. **Evaluation Functions:**
   - `isFormulaText`: Checks if a string is a valid Excel-like formula (starts with '=').
   - `evaluateCells`: Evaluates each cell based on its text and cache.
   - `evaluateSheet`: Recursively evaluates all sheet cells.
   - `displayText`: Converts a cell's text to formatted display text.

2. **Handling Functions:**
   - `FUNCTIONS`: Maps function names to their respective functions.
   - `resolveKey`: Parses cell references and ranges, handles errors and returns the value.
   - `isErrorCode`: Checks for specific error codes in formulas.
   - `numbers`: Handles numeric values, including text and empty strings.

3. **Parsing Cell References:**
   - `parseCellRef`: Extracts column and row numbers from a cell reference string.
   - `cellRefName`: Converts an explicit cell reference to its named form (e.g., B12).

4. **Error Handling:**
   - Ensures the input text is valid by checking if it contains only alphanumeric characters and spaces.

**Description of When Several Companion Files are Given:**

- Each companion file is a separate unit that documents a different aspect of Excel-like formulas or functions.
- They relate directly to each other through package imports, making the documentation self-contained.

This documentation provides a structured approach to documenting the codebase while ensuring that it is clear and comprehensive.
