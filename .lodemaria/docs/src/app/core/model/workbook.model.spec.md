### `columnName`
**Purpose:** Maps indexes to spreadsheet letters.
**Role:** Provides a convenient way to access cells in a workbook by their row and column indices.

#### Code Snippet:
```typescript
import { cellText, columnName } from './workbook.model';

describe('columnName', () => {
  it('maps indexes to spreadsheet letters', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(51)).toBe('AZ');
    expect(columnName(52)).toBe('BA');
    expect(columnName(701)).toBe('ZZ');
    expect(columnName(702)).toBe('AAA');
  });
});
```

### `normalizeRuns`
**Purpose:** Merges adjacent runs with identical styling.
**Role:** Ensures that cells in the workbook are visually consistent by merging them if they have the same style or formatting.

#### Code Snippet:
```typescript
import { normalizeRuns } from './workbook.model';

describe('normalizeRuns', () => {
  it('merges adjacent runs with identical styling', () => {
    expect(
      normalizeRuns([
        { text: 'a', bold: true },
        { text: 'b', bold: true },
        { text: 'c' },
      ]),
    ).toEqual([{ text: 'ab', bold: true }, { text: 'c' }]);
  });

  it('drops empty runs', () => {
    expect(normalizeRuns([{ text: '' }, { text: 'x' }])).toEqual([{ text: 'x' }]);
  });

  it('does not merge runs with different styling', () => {
    const runs = [{ text: 'a', color: '#ff0000' }, { text: 'b' }];
    expect(normalizeRuns(runs)).toEqual(runs);
  });
});
```

### `serialization`
**Purpose:** Rounds-trips a workbook through JSON.
**Role:** Converts the workbook model into its JSON representation for storage or transmission.

#### Code Snippet:
```typescript
import { cellText, columnName } from './workbook.model';

describe('serialization', () => {
  it('round-trips a workbook through JSON', () => {
    const workbook = createWorkbook('name', 'Sheet1');
    const cells = new Map(workbook.sheets[0].cells);
    cells.set('0:0', { runs: [{ text: 'hi', bold: true }], style: { background: '#ff0000' } });
    workbook.sheets[0] = { ...workbook.sheets[0], cells };

    const restored = deserializeWorkbook(JSON.parse(JSON.stringify(serializeWorkbook(workbook))));
    expect(restored.name).toBe('name');
    expect(restored.sheets[0].cells.get('0:0')).toEqual({
      runs: [{ text: 'hi', bold: true }],
      style: { background: '#ff0000' },
    });
    expect(cellText(restored.sheets[0].cells.get('0:0'))).toBe('hi');
  });
});
```
