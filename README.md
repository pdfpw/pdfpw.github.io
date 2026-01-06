# PDFPW

PDFPW is a browser-based PDF presenter console inspired by pdfpc.
It opens a presenter view and a separate audience window, supports PDF + pdfpc pairing,
recent file history (when the File System Access API is available), and works entirely in the browser.

## Requirements

- Node.js + pnpm

## Development

```bash
pnpm install
pnpm dev
```

The dev server runs on `http://localhost:6123`.

## Build

```bash
pnpm build
```

## Preview

```bash
pnpm preview
```

## Tests

```bash
pnpm test
```

## Type Check

```bash
pnpm tsc -b
```

## Lint / Format

These are available via package scripts:

```bash
pnpm lint
pnpm format
pnpm check
```

You can also run Biome directly:

```bash
pnpm biome check
```

To apply fixes:

```bash
pnpm biome check --write
```

## Notes

- The app runs fully client-side. There is no server-side storage or sync.
- When the File System Access API is available, recent files are stored in IndexedDB.
- If the browser does not support the File System Access API, recent history is disabled.
