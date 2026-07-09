import { normalizeRuns, TextRun } from '../model/workbook.model';

/**
 * Converts between the rich-text run model and DOM content of the
 * contenteditable cell editor. Building content with DOM APIs (never
 * innerHTML from strings) keeps untrusted text inert.
 */

export function runsToFragment(runs: TextRun[], doc: Document): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  for (const run of runs) {
    const span = doc.createElement('span');
    if (run.bold) span.style.fontWeight = 'bold';
    if (run.italic) span.style.fontStyle = 'italic';
    const decorations = [run.underline ? 'underline' : '', run.strike ? 'line-through' : '']
      .filter(Boolean)
      .join(' ');
    if (decorations) span.style.textDecoration = decorations;
    if (run.color) span.style.color = run.color;
    if (run.fontSize) span.style.fontSize = `${run.fontSize}pt`;
    const lines = run.text.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) span.appendChild(doc.createElement('br'));
      if (line) span.appendChild(doc.createTextNode(line));
    });
    fragment.appendChild(span);
  }
  return fragment;
}

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fontSize?: number;
}

export function domToRuns(root: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  walk(root, {}, runs, { firstBlock: true });
  return normalizeRuns(runs);
}

function walk(
  node: Node,
  style: RunStyle,
  runs: TextRun[],
  state: { firstBlock: boolean },
): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      // Contenteditable inserts non-breaking spaces (U+00A0); store regular spaces.
      const text = (child.textContent ?? '').split(String.fromCharCode(160)).join(' ');
      if (text) runs.push({ text, ...style });
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName === 'BR') {
      runs.push({ text: '\n', ...style });
      continue;
    }
    // Block elements (DIV/P) after the first start a new line
    const isBlock = child.tagName === 'DIV' || child.tagName === 'P';
    if (isBlock && !state.firstBlock) runs.push({ text: '\n', ...style });
    if (isBlock) state.firstBlock = false;
    walk(child, mergeStyle(child, style), runs, state);
  }
}

function mergeStyle(el: HTMLElement, inherited: RunStyle): RunStyle {
  const style: RunStyle = { ...inherited };
  const tag = el.tagName;
  if (tag === 'B' || tag === 'STRONG') style.bold = true;
  if (tag === 'I' || tag === 'EM') style.italic = true;
  if (tag === 'U') style.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') style.strike = true;
  if (tag === 'FONT') {
    const color = el.getAttribute('color');
    if (color) style.color = normalizeColor(color);
  }

  const inline = el.style;
  const weight = inline.fontWeight;
  if (weight === 'bold' || Number(weight) >= 600) style.bold = true;
  if (weight === 'normal' || Number(weight) === 400) style.bold = false;
  if (inline.fontStyle === 'italic') style.italic = true;
  if (inline.fontStyle === 'normal') style.italic = false;
  const decoration = `${inline.textDecoration} ${inline.textDecorationLine}`;
  if (decoration.includes('underline')) style.underline = true;
  if (decoration.includes('line-through')) style.strike = true;
  if (inline.color) style.color = normalizeColor(inline.color);
  if (inline.fontSize) {
    const size = parseFontSize(inline.fontSize);
    if (size) style.fontSize = size;
  }
  return clean(style);
}

function clean(style: RunStyle): RunStyle {
  const result: RunStyle = {};
  if (style.bold) result.bold = true;
  if (style.italic) result.italic = true;
  if (style.underline) result.underline = true;
  if (style.strike) result.strike = true;
  if (style.color) result.color = style.color;
  if (style.fontSize) result.fontSize = style.fontSize;
  return result;
}

/** Converts `rgb(r, g, b)` / named `#hex` colors to lowercase hex. */
export function normalizeColor(color: string): string {
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (rgb) {
    const toHex = (v: string) => Number(v).toString(16).padStart(2, '0');
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return color.toLowerCase();
}

/** Parses CSS font sizes to points (Excel's unit): `16px` -> 12, `12pt` -> 12. */
export function parseFontSize(value: string): number | undefined {
  const match = /^([\d.]+)(px|pt)$/.exec(value.trim());
  if (!match) return undefined;
  const size = parseFloat(match[1]);
  return Math.round(match[2] === 'px' ? size * 0.75 : size);
}
