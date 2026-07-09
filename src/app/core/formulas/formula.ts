import { Cell, cellKey, cellText, columnName, Sheet } from '../model/workbook.model';

/**
 * Excel-style formula evaluation. A cell whose text starts with `=` is a
 * formula supporting arithmetic (`+ - * / ^`), parentheses, cell references
 * (`A1`, case-insensitive), ranges inside functions (`A1:B3`) and the
 * functions SUM, AVERAGE, MIN, MAX, COUNT, ABS and ROUND. Errors surface as
 * Excel-like codes: #ERROR!, #CIRC!, #DIV/0!, #VALUE!.
 */

export function isFormulaText(text: string): boolean {
  return text.length > 1 && text.startsWith('=');
}

/** Evaluated display text for every formula cell, keyed by cell key. */
export function evaluateCells(cells: ReadonlyMap<string, Cell>): ReadonlyMap<string, string> {
  const cache = new Map<string, number | string>();
  const results = new Map<string, string>();
  for (const [key, cell] of cells) {
    if (!isFormulaText(cellText(cell))) continue;
    results.set(key, formatValue(resolveKey(cells, key, cache, new Set())));
  }
  return results;
}

/** Evaluated display text for every formula cell of the sheet, keyed by cell key. */
export function evaluateSheet(sheet: Sheet): ReadonlyMap<string, string> {
  return evaluateCells(sheet.cells);
}

/** Display text of a cell with formulas evaluated (for CSV/PDF export and the grid). */
export function displayText(sheet: Sheet, evaluated: ReadonlyMap<string, string>, key: string): string {
  return evaluated.get(key) ?? cellText(sheet.cells.get(key));
}

class FormulaError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** Value of a cell as seen by formulas: number, text, or null when empty. */
function resolveKey(
  cells: ReadonlyMap<string, Cell>,
  key: string,
  cache: Map<string, number | string>,
  visiting: Set<string>,
): number | string | null {
  const text = cellText(cells.get(key));
  if (text === '') return null;
  if (!isFormulaText(text)) {
    const numeric = Number(text);
    return text.trim() !== '' && !Number.isNaN(numeric) ? numeric : text;
  }
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  if (visiting.has(key)) throw new FormulaError('#CIRC!');
  visiting.add(key);
  let value: number | string;
  try {
    value = new Parser(text.slice(1), (row, col) =>
      resolveKey(cells, cellKey(row, col), cache, visiting),
    ).run();
  } catch (err) {
    value = err instanceof FormulaError ? err.code : '#ERROR!';
  } finally {
    visiting.delete(key);
  }
  cache.set(key, value);
  return value;
}

export function formatValue(value: number | string | null): string {
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '#DIV/0!';
  // Trim binary floating point noise (0.1 + 0.2 -> 0.3)
  return String(Number(value.toPrecision(12)));
}

type Resolve = (row: number, col: number) => number | string | null;

interface CellRefToken {
  row: number;
  col: number;
}

const FUNCTIONS: Record<string, (args: (number | string | null)[]) => number> = {
  SUM: (values) => numbers(values).reduce((a, b) => a + b, 0),
  AVERAGE: (values) => {
    const nums = numbers(values);
    if (nums.length === 0) throw new FormulaError('#DIV/0!');
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },
  MIN: (values) => {
    const nums = numbers(values);
    return nums.length === 0 ? 0 : Math.min(...nums);
  },
  MAX: (values) => {
    const nums = numbers(values);
    return nums.length === 0 ? 0 : Math.max(...nums);
  },
  COUNT: (values) => numbers(values).length,
  ABS: (values) => Math.abs(requireNumber(values[0] ?? null)),
  ROUND: (values) => {
    const factor = 10 ** Math.trunc(values.length > 1 ? requireNumber(values[1]) : 0);
    return Math.round(requireNumber(values[0] ?? null) * factor) / factor;
  },
};

function isErrorCode(value: string): boolean {
  return /^#.+!$/.test(value);
}

/** Numeric values only — text and empties are ignored, but referenced errors propagate. */
function numbers(values: (number | string | null)[]): number[] {
  for (const value of values) {
    if (typeof value === 'string' && isErrorCode(value)) throw new FormulaError(value);
  }
  return values.filter((v): v is number => typeof v === 'number');
}

/** Arithmetic operand: empty counts as 0, text is a #VALUE! error; referenced errors propagate. */
function requireNumber(value: number | string | null): number {
  if (value === null) return 0;
  if (typeof value === 'number') return value;
  throw new FormulaError(isErrorCode(value) ? value : '#VALUE!');
}

class Parser {
  private pos = 0;
  private readonly src: string;

  constructor(
    source: string,
    private readonly resolve: Resolve,
  ) {
    this.src = source;
  }

  run(): number {
    const value = this.expression();
    this.skipSpace();
    if (this.pos < this.src.length) throw new FormulaError('#ERROR!');
    return value;
  }

  // expression := term (('+'|'-') term)*
  private expression(): number {
    let value = this.term();
    for (;;) {
      const op = this.peekOperator(['+', '-']);
      if (!op) return value;
      const rhs = this.term();
      value = op === '+' ? value + rhs : value - rhs;
    }
  }

  // term := power (('*'|'/') power)*
  private term(): number {
    let value = this.power();
    for (;;) {
      const op = this.peekOperator(['*', '/']);
      if (!op) return value;
      const rhs = this.power();
      value = op === '*' ? value * rhs : value / rhs;
    }
  }

  // power := unary ('^' power)?  — right-associative
  private power(): number {
    const base = this.unary();
    if (this.peekOperator(['^'])) {
      return base ** this.power();
    }
    return base;
  }

  private unary(): number {
    if (this.peekOperator(['-'])) return -this.unary();
    if (this.peekOperator(['+'])) return this.unary();
    return this.primary();
  }

  private primary(): number {
    this.skipSpace();
    const char = this.src[this.pos];
    if (char === undefined) throw new FormulaError('#ERROR!');

    if (char === '(') {
      this.pos++;
      const value = this.expression();
      this.expect(')');
      return value;
    }

    if (/[0-9.]/.test(char)) return this.number();

    const name = this.identifier();
    if (name === null) throw new FormulaError('#ERROR!');

    const ref = parseCellRef(name);
    this.skipSpace();
    if (this.src[this.pos] === '(') {
      return this.functionCall(name.toUpperCase());
    }
    if (ref) return requireNumber(this.resolve(ref.row, ref.col));
    throw new FormulaError('#ERROR!');
  }

  private functionCall(name: string): number {
    const fn = FUNCTIONS[name];
    if (!fn) throw new FormulaError('#ERROR!');
    this.expect('(');
    const args: (number | string | null)[] = [];
    this.skipSpace();
    if (this.src[this.pos] === ')') {
      this.pos++;
      return fn(args);
    }
    for (;;) {
      args.push(...this.argument());
      this.skipSpace();
      const char = this.src[this.pos];
      if (char === ',' || char === ';') {
        this.pos++;
        continue;
      }
      this.expect(')');
      return fn(args);
    }
  }

  /** A function argument: a range (`A1:B2`) expands to its cell values, anything else evaluates. */
  private argument(): (number | string | null)[] {
    this.skipSpace();
    const start = this.pos;
    const name = this.identifier();
    if (name !== null) {
      const from = parseCellRef(name);
      this.skipSpace();
      if (from && this.src[this.pos] === ':') {
        this.pos++;
        this.skipSpace();
        const toName = this.identifier();
        const to = toName !== null ? parseCellRef(toName) : null;
        if (!to) throw new FormulaError('#ERROR!');
        const values: (number | string | null)[] = [];
        for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r++) {
          for (let c = Math.min(from.col, to.col); c <= Math.max(from.col, to.col); c++) {
            values.push(this.resolve(r, c));
          }
        }
        return values;
      }
    }
    this.pos = start;
    return [this.expression()];
  }

  private number(): number {
    const match = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(this.src.slice(this.pos));
    if (!match) throw new FormulaError('#ERROR!');
    this.pos += match[0].length;
    return parseFloat(match[0]);
  }

  private identifier(): string | null {
    this.skipSpace();
    const match = /^[A-Za-z][A-Za-z0-9]*/.exec(this.src.slice(this.pos));
    if (!match) return null;
    this.pos += match[0].length;
    return match[0];
  }

  private peekOperator(ops: string[]): string | null {
    this.skipSpace();
    const char = this.src[this.pos];
    if (char !== undefined && ops.includes(char)) {
      this.pos++;
      return char;
    }
    return null;
  }

  private expect(char: string): void {
    this.skipSpace();
    if (this.src[this.pos] !== char) throw new FormulaError('#ERROR!');
    this.pos++;
  }

  private skipSpace(): void {
    while (this.src[this.pos] === ' ') this.pos++;
  }
}

/** `B12` -> {row: 11, col: 1}; null when the text is not a cell reference. */
export function parseCellRef(text: string): CellRefToken | null {
  const match = /^([A-Za-z]+)([0-9]+)$/.exec(text);
  if (!match) return null;
  let col = 0;
  for (const letter of match[1].toUpperCase()) {
    col = col * 26 + (letter.charCodeAt(0) - 64);
  }
  const row = parseInt(match[2], 10) - 1;
  if (row < 0) return null;
  return { row, col: col - 1 };
}

/** {row: 11, col: 1} -> `B12` */
export function cellRefName(row: number, col: number): string {
  return `${columnName(col)}${row + 1}`;
}
