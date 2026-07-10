---
name: verify
description: Build, serve, and drive this spreadsheet PWA with puppeteer-core to verify changes end-to-end, including AXE accessibility checks.
---

# Verifying the spreadsheet app

1. `npm run build` → outputs to `dist/spreadsheet/browser`.
2. Serve that directory with a tiny Node `http` server (SPA fallback to `index.html`). No dev-server needed.
3. Drive with **puppeteer-core** (devDependency) against system Chrome at
   `C:/Program Files/Google/Chrome/Application/chrome.exe`, `headless: 'new'`.
   In an `.mjs` script outside the repo, load it via
   `createRequire('<repo>/package.json')('puppeteer-core')`.
4. AXE: `page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'))`,
   then `window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })`. Zero violations expected.

## Driving the grid

- Cells are `[data-cell="row:col"]` (0-based). Click to select, type to edit,
  `Enter` commits and moves down. Wait ~80ms after commit.
- Column headers are `th.col-header`; sort buttons are `.sort-btn`, resize handles `.col-resize`.
- Undo/redo: `Ctrl+Z` / `Ctrl+Y` on the page.

## Gotchas

- The app auto-detects the OS locale — on this machine it runs in **Portuguese**,
  so never select by English `aria-label`; use structural selectors (`.sort-btn`, nth `th`).
- Autosave goes to IndexedDB: a reloaded page restores the previous test's data.
  Use a fresh browser context (or clear IndexedDB) for a clean sheet.
- PowerShell 5.1 mangles UTF-8 via `Get-Content`/`Set-Content`; use the Edit/Write tools.
