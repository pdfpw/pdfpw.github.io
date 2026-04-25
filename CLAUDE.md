# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pdfpw is a browser-based PDF presenter console inspired by pdfpc. It features a dual-window architecture:
- **Presenter Window**: Full control interface with notes, next slides, and presenter tools
- **Presentation Window**: Minimal fullscreen display for the audience

The app runs entirely client-side with no server backend. It uses the Broadcast Channel API for real-time synchronization between windows.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (runs on http://localhost:6123)
pnpm dev

# Type check
pnpm tsc -b

# Run tests
pnpm test

# Linting and formatting (via Biome)
pnpm lint
pnpm format
pnpm check

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Architecture

### Routing (TanStack Router)
- File-based routing in `src/routes/`
- `__root.tsx`: Root layout with router and devtools
- `(main)/`: Layout group containing the main app with header
- `presentation/`: Separate route for the audience display window

### State Management (Jotai)
Atoms are defined in `src/routes/(main)/-presenter/state.ts`:
- `fileNameOrFileAtom`: File handle or snapshot
- `pdfFileAtom`: Async atom resolving to File object
- `pdfProxyAtom`: PDF.js document proxy
- `slidePageNumbersAtom`: Page labels from PDF
- `pdfpcConfigAtom`: Configuration from .pdfpc files

### Dual-Window Communication
The broadcast system in `src/broadcast/` handles window synchronization:
- **Channel**: Cached BroadcastChannel instances with cleanup
- **Presenter hooks**: Send page changes, blackout state, file data
- **Presentation hooks**: Receive state updates, request connection
- **Pairing**: Uses unique IDs per file to connect windows via lobby channel

### PDF Rendering
- Core component: `src/components/PdfPage.tsx`
- Uses PDF.js with canvas rendering
- ResizeObserver for responsive scaling
- Suspense for loading states
- Page promise caching for performance

### File Handling
Two modes based on browser capability:
- **FSA Mode** (File System Access API): Persistent file handles, stored in IndexedDB
- **Standard Mode**: File snapshots saved to IndexedDB

Recent files are managed via the `idb` library with proper permission validation for FSA handles.

### Configuration
Supports `.pdfpc` files for presentation configuration (overlays, notes, slide grouping). Configuration is merged with PDF page labels.

## Key Patterns

1. **Route-based state**: Presenter state lives in route files (`-presenter/`), synced via `onMount`
2. **Async atoms**: Jotai atoms with async derivation for file loading and PDF processing
3. **Broadcast actions**: Typed message protocol for window communication
4. **Progressive enhancement**: Feature detection for FSA API with graceful fallbacks
5. **Type safety**: Runtime validation via Typia for broadcast actions and route params

## Import Paths

The project uses import maps defined in `package.json`:
```typescript
import { foo } from "#src/bar" // resolves to ./src/bar
```
