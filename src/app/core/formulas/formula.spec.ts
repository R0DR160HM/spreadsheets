import { describe, expect, it } from 'vitest';
import { Cell, cellKey, createSheet, Sheet } from '../model/workbook.model';
import { cellRefName, evaluateSheet, isFormulaText, parseCellRef } from './formula';

function sheetWith(entries: Record<string, string>): Sheet {
  const sheet = createSheet('S');
  const cells = new Map<string, Cell>();
  for (const [ref, text] of Object.entries(entries)) {
    const { row, col } = parseCellRef(ref)!;
    cells.set(cellKey(row, col), { runs: [{ text }] });
  }
  return { ...sheet, cells };
}

function evalRef(entries: Record<string, string>, ref: string): string | undefined {
  const { row, col } = parseCellRef(ref)!;
  return evaluateSheet(sheetWith(entries)).get(cellKey(row, col));
}

describe('isFormulaText', () => {
  it('requires = plus content', () => {
    expect(isFormulaText('=1')).toBe(true);
    expect(isFormulaText('=')).toBe(false);
    expect(isFormulaText('1+1')).toBe(false);
  });
});

describe('formula evaluation', () => {
  it('does arithmetic with precedence and parentheses', () => {
    expect(evalRef({ A1: '=1+2*3' }, 'A1')).toBe('7');
    expect(evalRef({ A1: '=(1+2)*3' }, 'A1')).toBe('9');
    expect(evalRef({ A1: '=10/4' }, 'A1')).toBe('2.5');
    expect(evalRef({ A1: '=2^10' }, 'A1')).toBe('1024');
    expect(evalRef({ A1: '=-3+5' }, 'A1')).toBe('2');
    expect(evalRef({ A1: '=0.1+0.2' }, 'A1')).toBe('0.3');
  });

  it('resolves cell references, case-insensitively', () => {
    expect(evalRef({ A1: '5', B2: '=a1*2' }, 'B2')).toBe('10');
    expect(evalRef({ A1: '5', B1: '3', C1: '=A1+B1' }, 'C1')).toBe('8');
  });

  it('chains formulas through other formulas', () => {
    expect(evalRef({ A1: '2', A2: '=A1*3', A3: '=A2+1' }, 'A3')).toBe('7');
  });

  it('treats empty referenced cells as zero', () => {
    expect(evalRef({ A1: '=Z99+1' }, 'A1')).toBe('1');
  });

  it('reports circular references', () => {
    const result = evalRef({ A1: '=B1', B1: '=A1' }, 'A1');
    expect(result).toBe('#CIRC!');
    expect(evalRef({ A1: '=A1' }, 'A1')).toBe('#CIRC!');
  });

  it('reports errors for text operands, bad syntax and division by zero', () => {
    expect(evalRef({ A1: 'hello', B1: '=A1+1' }, 'B1')).toBe('#VALUE!');
    expect(evalRef({ A1: '=1+' }, 'A1')).toBe('#ERROR!');
    expect(evalRef({ A1: '=FOO(1)' }, 'A1')).toBe('#ERROR!');
    expect(evalRef({ A1: '=1/0' }, 'A1')).toBe('#DIV/0!');
  });

  it('supports SUM/AVERAGE/MIN/MAX/COUNT over ranges, ignoring text', () => {
    const data = { A1: '1', A2: '2', A3: 'x', B1: '3', B2: '4' };
    expect(evalRef({ ...data, C1: '=SUM(A1:B2)' }, 'C1')).toBe('10');
    expect(evalRef({ ...data, C1: '=AVERAGE(A1:A2)' }, 'C1')).toBe('1.5');
    expect(evalRef({ ...data, C1: '=MIN(A1:B2)' }, 'C1')).toBe('1');
    expect(evalRef({ ...data, C1: '=MAX(A1:B2)' }, 'C1')).toBe('4');
    expect(evalRef({ ...data, C1: '=COUNT(A1:A3)' }, 'C1')).toBe('2');
  });

  it('supports mixed arguments and both separators', () => {
    expect(evalRef({ A1: '2', B1: '=SUM(A1, 3; 5)' }, 'B1')).toBe('10');
    expect(evalRef({ A1: '=ROUND(2.567, 2)' }, 'A1')).toBe('2.57');
    expect(evalRef({ A1: '=ABS(0-8)' }, 'A1')).toBe('8');
    expect(evalRef({ A1: '=sum(1,2)+max(3,4)' }, 'A1')).toBe('7');
  });
});

describe('cell reference helpers', () => {
  it('parses and prints refs symmetrically', () => {
    expect(parseCellRef('B12')).toEqual({ row: 11, col: 1 });
    expect(parseCellRef('AA1')).toEqual({ row: 0, col: 26 });
    expect(parseCellRef('12B')).toBeNull();
    expect(cellRefName(11, 1)).toBe('B12');
    expect(cellRefName(0, 26)).toBe('AA1');
  });
});
