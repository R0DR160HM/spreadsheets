import { describe, expect, it } from 'vitest';
import { cellKey, cellText, createWorkbook } from '../model/workbook.model';
import { CsvFormat, escapeCsvField, parseCsv } from './csv-format';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles quoted fields with commas, quotes and newlines', () => {
    expect(parseCsv('"a,b","say ""hi""","line1\nline2"')).toEqual([
      ['a,b', 'say "hi"', 'line1\nline2'],
    ]);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('﻿a,b')).toEqual([['a', 'b']]);
  });

  it('keeps empty fields', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });

  it('supports custom separators', () => {
    expect(parseCsv('a;b;c', ';')).toEqual([['a', 'b', 'c']]);
    expect(parseCsv('a\tb', '\t')).toEqual([['a', 'b']]);
    expect(parseCsv('a|b|c', '|')).toEqual([['a', 'b', 'c']]);
    expect(parseCsv('a#b', '#')).toEqual([['a', 'b']]);
    // With a semicolon separator, commas are plain characters
    expect(parseCsv('1,5;2,5', ';')).toEqual([['1,5', '2,5']]);
  });
});

describe('CsvFormat with separator option', () => {
  it('writes and reads back with a semicolon separator', async () => {
    const format = new CsvFormat();
    const workbook = createWorkbook('test', 'Sheet1');
    const cells = new Map(workbook.sheets[0].cells);
    cells.set(cellKey(0, 0), { runs: [{ text: '1,5' }] });
    cells.set(cellKey(0, 1), { runs: [{ text: 'x;y' }] });
    workbook.sheets[0] = { ...workbook.sheets[0], cells };

    const options = { separator: ';' };
    const blob = await format.write(workbook, { activeSheetIndex: 0, options });
    expect(await blob.text()).toBe('1,5;"x;y"');

    const file = new File([blob], 'test.csv', { type: 'text/csv' });
    const result = await format.read(file, { options });
    expect(cellText(result.sheets[0].cells.get(cellKey(0, 0)))).toBe('1,5');
    expect(cellText(result.sheets[0].cells.get(cellKey(0, 1)))).toBe('x;y');
  });
});

describe('escapeCsvField', () => {
  it('quotes fields containing delimiters, quotes or newlines', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('two\nlines')).toBe('"two\nlines"');
  });
});

describe('CsvFormat', () => {
  it('round-trips a workbook through write and read', async () => {
    const format = new CsvFormat();
    const workbook = createWorkbook('test', 'Sheet1');
    const cells = new Map(workbook.sheets[0].cells);
    cells.set(cellKey(0, 0), { runs: [{ text: 'hello' }] });
    cells.set(cellKey(0, 1), { runs: [{ text: 'a,b', bold: true }] });
    cells.set(cellKey(1, 0), { runs: [{ text: 'world' }] });
    workbook.sheets[0] = { ...workbook.sheets[0], cells };

    const blob = await format.write(workbook, { activeSheetIndex: 0 });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });
    const result = await format.read(file);

    const sheet = result.sheets[0];
    expect(cellText(sheet.cells.get(cellKey(0, 0)))).toBe('hello');
    // Rich formatting is flattened to plain text in CSV
    expect(sheet.cells.get(cellKey(0, 1))).toEqual({ runs: [{ text: 'a,b' }] });
    expect(cellText(sheet.cells.get(cellKey(1, 0)))).toBe('world');
  });
});
