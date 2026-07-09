### **Rich Text DOM**

#### Overview

The `richTextDom.ts` file provides utilities for converting between the rich-text run model and the Document content of an editable cell editor, while maintaining untrusted text inert.

#### Public API

1. **`runsToFragment(runs: TextRun[], doc: Document): DocumentFragment`**
   - Converts a list of `TextRun` objects into a `DocumentFragment`. Each runs are added as `span` elements within the fragment, with optional attributes like bold, italic, underline, strike, and color.

2. **`domToRuns(root: HTMLElement): TextRun[]`**
   - Converts an entire DOM element into a list of `TextRun` objects. The element is expected to be a contenteditable container and not containing untrusted text.

3. **`walk(node: Node, style: RunStyle, runs: TextRun[], state: { firstBlock: boolean }): void`**
   - Recursively walks through the DOM tree, applying CSS styles to each node and its children. Handles block elements and normal spans (divs, p tags).

4. **`mergeStyle(el: HTMLElement, inherited: RunStyle): RunStyle`**
   - Merges the `inherited` style with the current element's style to ensure all properties are consistent.

5. **`clean(style: RunStyle): RunStyle`**
   - Cleans up the run style by removing any non-alphanumeric characters and normalizing color values.

6. **`normalizeColor(color: string): string`**
   - Converts a color string from RGB or named `#hex` format to lowercase hex.

7. **`parseFontSize(value: string): number | undefined`**
   - Parses the font size value (like `16px`, `12pt`) into points, ensuring appropriate scaling for Excel's unit conversion.

#### Notable Internal Logic

- **Normalization**: Converts RGB values and named colors to lowercase hex.
- **Parsing Font Sizes**: Adjusts font sizes based on the element's parent's font settings.
- **DOM Walkthrough**: Recursively processes all child elements within the DOM, applying styles as needed.
- **Error Handling**: Trims whitespace from text and ensures proper HTML structure.

This implementation is designed to handle edge cases and ensure the integrity of the rich-text content.
