# src/app/core/formulas/formula.spec.ts

## Purpose and Role

This file contains unit tests for the `isFormulaText` function, which checks if a given formula is of type `'+'`, `'='`, or `'*'`. It also includes helper functions to parse cell references, calculate sums and averages, and perform basic arithmetic operations.

---

## IsFormulaText

The `isFormulaText` function takes a string as input and returns a boolean indicating whether the string represents a valid mathematical formula. Here's how it works:
- **`=1+2*3'`:** This checks if the string is equal to `'=1+2*3'`.
- **`='=(1+2)*3'`:** This checks if the string is equal to `='=(1+2)*3'`.
- **`'=10/4'`:** This checks if the string is equal to `'=10/4'`.

## Formula Evaluation

The `evalRef` function takes a map of cell references and a string as input and returns the value of that reference. It uses `evaluateSheet` from the `workbook.model` module to calculate the value of each reference:
- **`A1: '=1+2*3'`:** This evaluates to `7`.
- **`A1: '=(1+2)*3'`:** This evaluates to `9`.
- **`A1: '=10/4'`:** This evaluates to `2.5`.
- **`A1: '=2^10'`:** This evaluates to `1024`.
- **`A1: '=-3+5'`:** This evaluates to `2`.
- **`A1: '=0.1+0.2'`:** This evaluates to `0.3`.
- **`C1: '=2^10'`:** This evaluates to `1024`.

## Cell Reference Handling

The `cellRefName` function parses a cell reference and returns the corresponding row and column indices:
- **`A1: '=B1+2'`:** This parses to `{row: 11, col: 1}`.
- **`AA1`:** This parses to `{row: 0, col: 26}`.

## Error Handling

The `cellRefName` function also handles cases where the cell reference is empty or contains invalid text:
- **`A1: '=Z99+1'`:** This returns `'#CIRC!'`.
- **`A1: '=A1+1'`:** This returns `'#ERROR!'.
- **`A1: '=FOO(1)'`:** This returns `'#ERROR!'`.
- **`A1: '=1/0'`:** This returns `'#DIV/0!'`.

## Circular References

The `evalRef` function reports circular references by returning a string indicating that the reference is an error.
- **`A1: '=B1', B1: '=A1'`:** This returns `'#CIRC!'`.
- **`A1: '=A1'`:** This returns `'#CIRC!'`.

## Errors for Text Operands, Bad Syntax and Division by Zero

The `evalRef` function also reports errors for text operands, bad syntax, and division by zero:
- **`A1: 'hello', B1: '=A1+1'`:** This returns `'#VALUE!'`.
- **`A1: '=1+'`, `A1: '2*3'`:** This returns `'#ERROR!'`.
- **`A1: '=FOO(1)'`, `A1: '=1/0'`:** This returns `'#DIV/0!'`.

## Supports SUM/AVERAGE/MIN/MAX/COUNT over Ranges, ignoring Text

The `evalRef` function supports sum and average operations over ranges, ignoring text:
- **`data = { A1: '1', A2: '2', A3: 'x', B1: '3', B2: '4' }`:** This evaluates to `'10'`.
- **`A1: '=SUM(A1:B2)'`, `A1: '=AVERAGE(A1:A2)'`, `A1: '=MIN(A1:B2)'`, `A1: '=MAX(A1:B2)'`, `A1: '=COUNT(A1:A3)'`:** This evaluates to `'7'`.

---

## Additional Notes

- The tests cover various scenarios, including:
  - Empty referenced cells.
  - Mixed argument and both separators.
  - Division by zero errors.
- The helper functions parse cell references correctly and report the expected results.
