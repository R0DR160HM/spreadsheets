### File: tools/serve.mjs

**Purpose and Role:** A minimal static server for the production build (dist/spreadsheet/browser). The service worker (and therefore offline support and PWA install) only exists in production builds, so use this instead of `ng serve` to test or install the PWA: `npm run preview   (or: node tools/serve.mjs [port])`.

**Public Exported Classes, Functions, Constants, Entry Points:**
1. **Server**: Initializes an HTTP server that serves files from a specified directory.
2. **File**: Represents a file or directory within the production build.
3. **Index.html**: Represents the main entry point of the application.

**Notable Internal Logic:**
- **File Paths**: Uses `path.normalize` and `fs.existsSync` to ensure paths are resolved correctly.
- **Server Configuration**: Sets up basic server options including port and MIME types.

**When Several Companion Files Are Given:**
- Combines multiple companion files into a single unit, which can be easier to manage and debug.
- Each file contributes to the overall static server functionality by handling requests and serving files from the appropriate directory.
