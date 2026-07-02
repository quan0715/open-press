# Inline edit & Vite HMR

The workbench's inline editor writes directly to source MDX/TSX files. In dev
mode, that file write would normally trigger Vite to full-reload the browser —
which wipes React state, in-flight save animations, and the user's scroll /
selection. This doc explains how the framework prevents that without resorting
to a tmp-file staging area.

## Architecture (do not redesign)

```
┌──────────────────────┐    POST /__openpress/source-edit
│ Inline text editor   │ ───────────────────────────────────────┐
│ (workbench page)     │                                        │
└──────────────────────┘                                        ▼
       ▲                                       ┌───────────────────────────┐
       │ 1. response { renderId }              │  Vite dev middleware      │
       │ 2. client refetches document.json     │  (configureServer)        │
       │ 3. React commits new page HTML        │                           │
       │ 4. CSS flash plays on stable page div │  • write source file      │
       │                                       │  • exportReactDocument    │
       │                                       │  • respond with renderId  │
       │                                       └───────────────────────────┘
```

The pipeline writes to **real source files**, not a tmp scratch area. This
keeps git, PDF export, deploy, and external tools coherent. The cost is that
Vite's file watcher and HMR machinery see those writes and will try to refresh
the page. The framework defends against that with three layers.

## Three layers of HMR suppression

All three live in `packages/core/vite.config.ts` under
`openpressLocalDeployPlugin()`. **Do not remove any layer without replacing it
with something equivalent — they cover different paths.**

### Layer 1 — `server.watch.ignored`

Vite's chokidar watcher is told to ignore the generated output directories:

```ts
server: {
  watch: {
    ignored: [
      "**/.openpress/tmp/**",
      "**/.deploy/**",
      openpressConfig.paths.outputDir + "/**",   // dist-react/**
      openpressConfig.paths.publicDir + "/**",   // public/openpress/**
    ],
  },
}
```

Without this, every file written by `exportReactDocument` (`document.json`,
per-page HTML) would fire watcher events, and Vite's built-in publicDir
behaviour would full-reload the browser.

### Layer 2 — `handleHotUpdate` plugin hook

When the user edits inline, the server writes the source `.mdx` / `.tsx` first.
That file lives inside the workspace press tree (`reactDocumentRoot`), which IS
watched. `handleHotUpdate` suppresses the resulting HMR while a source-edit
request is in flight:

```ts
const shouldSuppressForSourceEdit = () => {
  if (inFlightSourceEdits > 0) return true;
  if (lastSourceEditEndedAt === 0) return false;
  return Date.now() - lastSourceEditEndedAt < SOURCE_EDIT_QUIET_MS; // 5_000
};
```

`inFlightSourceEdits` is a counter — incremented when a `POST
/__openpress/source-edit` middleware fires, decremented on `res.on("close" /
"finish")`. The 5-second quiet window after a request ends absorbs late
chokidar events that arrive after the response was sent.

### Layer 3 — `server.ws.send` wrapper (the non-obvious one)

**Plugin `handleHotUpdate` is not the only path that can trigger a
full-reload.** Vite core, `@vitejs/plugin-react`, and `import.meta.glob`
invalidation can all call `server.ws.send({ type: "full-reload" })` directly,
bypassing the plugin hook. To catch those, `configureServer` wraps `ws.send`:

```ts
const originalSend = server.ws.send.bind(server.ws);
server.ws.send = ((payload) => {
  const payloadType =
    payload && typeof payload === "object" && "type" in payload
      ? payload.type : undefined;
  if (payloadType === "full-reload") {
    if (shouldSuppressForSourceEdit()) {
      console.log("[Vite] Suppressing full-reload while source-edit is in flight");
      return;
    }
    console.log("[Vite] ws.send full-reload (NOT suppressed)");
  }
  return originalSend(payload);
}) as typeof originalSend;
```

This is the layer that fixes the historically reported "I edit inline and the
whole browser reloads" symptom. The diagnostic log lines (`Suppressing
full-reload while source-edit is in flight`, `ws.send full-reload (NOT
suppressed)`) are intentional — keep them.

## Client-side reconciliation

Once the suppression layers stop the browser from reloading, the client still
needs to show the new content. The flow in
`packages/core/src/openpress/app/OpenPressApp.tsx` and the inline editor hook:

1. POST response includes `document.renderId`.
2. `refreshDocument({ expectedRenderId })` polls `document.json` until the
   render id matches, then `setState({ document: nextDocument })`.
3. `OpenPressApp` preserves `htmlPage` block refs whose `html` string is
   unchanged, so React's memo on `PageHtmlContent` skips the `innerHTML` swap
   and any running CSS animations survive.
4. For the page whose HTML did change, the inline editor re-locates the
   equivalent text element in the new DOM (by `blockId` / `objectId` /
   `tableCellIndex`) and reapplies the `saved` state on both the element and
   its `[data-openpress-page-index]` page container. The "saved" flash
   animation runs on the container, which is React-stable across the swap.

See `useInlineDocumentEditor.ts` → `persistElementEdit` →
`relocateRefreshedEditableElement`.

## What NOT to do

- **Do not move source-edit to a tmp file staging area.** It seems like it
  would avoid HMR entirely, but it breaks git, PDF export, deploy, external
  editors, and forces a second "promote tmp to source" state machine. The
  three suppression layers above are simpler and self-contained.
- **Do not delete the `server.ws.send` wrapper just because
  `handleHotUpdate` looks like it covers the same thing.** It does not —
  see Layer 3.
- **Do not shorten `SOURCE_EDIT_QUIET_MS` aggressively.** Large workspaces
  have slower exports and slower chokidar debounce on macOS FSEvents. 5
  seconds is a safe headroom.
- **Do not rely on per-element `data-openpress-edit-state` for the visible
  save animation.** Per-element attrs live inside `dangerouslySetInnerHTML`
  and are destroyed when the page HTML is swapped in. The visible
  shimmer / flash CSS hangs off the page container's
  `[data-openpress-inline-save]` attribute, which is set via `setAttribute`
  on a React-stable element and survives `innerHTML` replacement.

## Diagnosing future regressions

If a user reports "I edit inline and the page reloads / state resets",
reproduce while watching the dev server terminal:

| Log line | Meaning |
| --- | --- |
| `[Vite] Suppressing HMR for document file because source-edit is in flight: <path>` | Layer 2 caught a watcher event for the source file. ✓ |
| `[Vite] Suppressing full-reload while source-edit is in flight` | Layer 3 caught an internal Vite full-reload. ✓ |
| `[Vite] ws.send full-reload (NOT suppressed)` | A full-reload leaked through. Investigate timing vs. `SOURCE_EDIT_QUIET_MS`. |
| `[Vite] Triggering HMR full-reload for document file: <path>` | A *manual* edit happened (not from inline editor); full-reload is expected here. |
| `[Vite] Falling back to Vite default HMR for outside file: <path>` | The watcher fired for a file outside `documentRoot` / `contentDir` / generated output. Default Vite HMR will run. |

If you see no log lines at all but the browser still reloads, the trigger is
upstream of our plugin (likely an html / vite.config.ts change, or a real
JS module HMR rejection). That is a different problem from inline edit.
