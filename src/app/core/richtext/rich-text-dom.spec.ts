import { describe, expect, it } from 'vitest';
import { TextRun } from '../model/workbook.model';
import { domToRuns, normalizeColor, parseFontSize, runsToFragment } from './rich-text-dom';

function roundTrip(runs: TextRun[]): TextRun[] {
  const host = document.createElement('div');
  host.appendChild(runsToFragment(runs, document));
  return domToRuns(host);
}

describe('rich text DOM round trip', () => {
  it('preserves mixed formatting', () => {
    const runs: TextRun[] = [
      { text: 'plain ' },
      { text: 'bold', bold: true },
      { text: ' and ', italic: true },
      { text: 'red', color: '#ff0000', fontSize: 14 },
    ];
    expect(roundTrip(runs)).toEqual(runs);
  });

  it('preserves underline and strikethrough together', () => {
    const runs: TextRun[] = [{ text: 'both', underline: true, strike: true }];
    expect(roundTrip(runs)).toEqual(runs);
  });

  it('preserves line breaks', () => {
    const runs: TextRun[] = [{ text: 'line1\nline2' }];
    expect(roundTrip(runs)).toEqual(runs);
  });

  it('reads legacy tags produced by execCommand', () => {
    const host = document.createElement('div');
    host.innerHTML = '<b>bold</b><i>italic</i><font color="#00ff00">green</font>';
    expect(domToRuns(host)).toEqual([
      { text: 'bold', bold: true },
      { text: 'italic', italic: true },
      { text: 'green', color: '#00ff00' },
    ]);
  });
});

describe('normalizeColor', () => {
  it('converts rgb() to hex', () => {
    expect(normalizeColor('rgb(255, 0, 128)')).toBe('#ff0080');
  });

  it('lowercases hex colors', () => {
    expect(normalizeColor('#FF0000')).toBe('#ff0000');
  });
});

describe('parseFontSize', () => {
  it('converts px to points', () => {
    expect(parseFontSize('16px')).toBe(12);
  });

  it('keeps points', () => {
    expect(parseFontSize('14pt')).toBe(14);
  });

  it('rejects other units', () => {
    expect(parseFontSize('1.2em')).toBeUndefined();
  });
});
