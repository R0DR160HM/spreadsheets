/**
 * Minimal static server for the production build (dist/spreadsheet/browser).
 * The service worker (and therefore offline support and PWA install) only
 * exists in production builds, so use this instead of `ng serve` to test or
 * install the PWA:  npm run preview   (or: node tools/serve.mjs [port])
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'spreadsheet', 'browser');
const PORT = Number(process.argv[2] ?? process.env['PORT'] ?? 4200);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`No production build found at ${DIST}\nRun "npm run build" first (or use "npm run preview").`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = path.normalize(path.join(DIST, url));
    // SPA fallback + path traversal guard
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html');
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    res.end(fs.readFileSync(file));
  })
  .listen(PORT, () => {
    console.log(`Serving production build at http://localhost:${PORT}`);
    console.log('Open it once while the server runs; after that the app works fully offline.');
  });
