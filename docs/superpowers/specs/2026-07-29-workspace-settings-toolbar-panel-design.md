# Workspace Settings, Toolbar Hierarchy, and Resizable Navigation Design

**Date:** 2026-07-29

## Objective

Reduce workbench chrome competition while giving Workspace-wide appearance and navigation preferences a durable home.

The release should:

- move appearance controls from the document toolbar into a Workspace settings page;
- offer five curated Workspace accent colors without changing Press output themes;
- keep only high-frequency document actions visible in the toolbar;
- place Bookmarks beside Home and Document Info at the far-right edge;
- remove duplicated document identity metadata from the left panel; and
- let users resize the left navigation panel, with the width remembered by the browser.

## Non-goals

- Do not change Press theme tokens, rendered pages, the public Web reader, PDF, Word, or slide output.
- Do not support arbitrary color values or a color picker.
- Do not add user accounts, server-side preference storage, or preference synchronization between browsers.
- Do not make toolbar visibility user-configurable in this release.
- Do not make navigation-panel width Press-specific.
- Do not redesign the document gallery or add unrelated Workspace settings.

## Information Architecture

### Workspace destinations

The Workspace gains two first-class destinations:

- **Documents** at `/workspace`, retaining the existing All, Pages, and Slides filters.
- **Settings** at `/workspace/settings`.

The settings page reuses the gallery shell and navigation language instead of introducing a modal or a second application shell. Browser back/forward and direct refresh must preserve the destination.

For a single-Press workspace, `/workspace` may continue to enter the only Press automatically. `/workspace/settings` remains directly resolvable, and the Settings entry exposed from the workbench More menu provides access to it.

### Settings page

The first release contains one quiet **Appearance** section:

1. **Mode:** System, Dark, or Light.
2. **Accent:** Amber, Blue, Emerald, Violet, or Rose.

The layout should use compact rows, segmented choices, and labeled swatches. It should not introduce nested cards or dashboard-style panels. Each choice shows its selected state through text, icon/check state, and accessible attributes rather than color alone.

## Appearance State

Appearance is a Workspace UI preference, shared across the gallery, settings page, and workbench.

The preference model contains:

```ts
type WorkspaceColorModePreference = "system" | "dark" | "light";
type WorkspaceAccent = "amber" | "blue" | "emerald" | "violet" | "rose";
```

The browser persists both values in local storage. Existing `openpress:workspace:color-mode` values must migrate without a visual reset: stored `dark` and `light` values remain authoritative. Missing or invalid values fall back to the current dark mode and Amber accent.

`system` resolves through `prefers-color-scheme` and reacts when the operating-system preference changes. Components consume the resolved dark/light mode while controls display the stored preference.

The Workspace root exposes stable data attributes for resolved mode and accent. CSS maps each accent identifier to a complete token family:

- accent foreground;
- hover foreground;
- subtle surface;
- border/focus color; and
- any contrast-safe text used over a filled accent surface.

Each palette receives explicit dark- and light-mode values. No document/output theme variables are modified.

## Workbench Toolbar

### Left navigation group

The order is:

1. Home, when the Workspace destination exists;
2. Bookmarks panel toggle; and
3. Press tabs or the active Press label.

Bookmarks is a navigation control and therefore must no longer live in the right action group. Its pressed state continues to reflect whether the left panel is open.

### Right action group

The visible order is:

1. Comments, when available;
2. Export;
3. More; and
4. Document Info, always at the far-right edge.

The standalone color-mode action is removed.

The **More** menu owns lower-frequency actions:

- Workspace Settings;
- experimental MDX source mode, when available;
- Deployment, when locally available; and
- extension tools supplied by `extraControlPanels`.

Menu items should invoke shared action/controller logic. Interactive buttons or popovers must not be nested inside another menu trigger. Existing deployment, editor, and extension behavior remains intact after the entry point moves.

Document Info becomes a dedicated Info icon button that opens the existing information surface. It is no longer disguised as the More button and remains the last toolbar child so its location is stable.

## Left Navigation Panel

### Header removal

Remove the identity block that repeats Press type, title, subtitle, and page geometry. The active Press tab and Document Info already own that information.

The panel begins with search, followed by search results or bookmarks/thumbnails. The current-page progress footer remains. Slide-specific Slides/Templates tabs remain where they are needed.

### Resizing

The panel's right edge exposes a visually quiet vertical resize handle.

- Default width preserves the current responsive width behavior.
- User-adjustable range is `240px` through `480px`.
- Pointer dragging updates the canvas layout continuously.
- Double-click resets to the default width.
- The handle uses `role="separator"`, vertical orientation, and reports minimum, maximum, and current values.
- Left/Right arrow keys adjust by a small increment; Shift+Arrow uses a larger increment.
- Pointer capture prevents the drag from ending when the cursor leaves the narrow handle.
- Selection is suppressed only for the active drag and is restored on completion or cancellation.

The width is a single Workspace-wide browser preference, not a per-Press value. It is persisted locally and restored on refresh and when switching Presses.

At compact viewport sizes where applying the saved width would starve the canvas, the resize handle is hidden and the shell uses its responsive width. The saved desktop value is retained and becomes active again when enough viewport space is available. Public-reader panel behavior is unchanged.

## Routing and Component Boundaries

`OpenPressApp` distinguishes Workspace Documents, Workspace Settings, Press preview, and slide presentation destinations. Route parsing and history updates remain lightweight and continue to use the History API; a routing dependency is not introduced.

Appearance persistence and resolution move into a shared Workspace appearance model/hook so the gallery, settings page, and workbench do not maintain divergent copies of the same local-storage behavior.

Workbench receives an `onOpenWorkspaceSettings` navigation callback. The shell owns panel geometry and the resize interaction; document components provide only panel content. This keeps resizable layout generic and document metadata out of shell state.

## Accessibility and Interaction

- Settings choices are reachable by keyboard and have programmatic labels and selected states.
- Accent swatches include text labels; color is never the only signal.
- Toolbar icon buttons retain tooltips and `aria-label` values.
- The More menu returns focus to its trigger after actions that do not navigate.
- The resize separator is keyboard-operable and exposes its current value.
- Focus rings use contrast-safe accent tokens in every palette and mode.
- Motion respects the existing Workspace motion system; system-theme changes do not animate the entire page.

## Failure and Compatibility Behavior

- Local-storage reads and writes are guarded; storage denial leaves an in-memory preference for the current session.
- Invalid persisted modes, accents, or widths fall back safely.
- Width is clamped again on load so old or manually edited storage cannot break layout.
- Missing `matchMedia` support resolves System to the existing dark fallback.
- Existing deep links to `/workspace`, `/<slug>/preview`, and `/<slug>/present` retain their meaning.

## Verification

Automated coverage should prove:

- `/workspace/settings` loads directly and participates in back/forward navigation;
- Dark, Light, and System preferences resolve correctly and survive refresh;
- all five accent identifiers apply and persist without touching output theme styles;
- legacy color-mode storage migrates correctly;
- Bookmarks follows Home and is absent from the right action group;
- the visible right action order ends with Document Info;
- MDX, Deployment, extension tools, and Settings appear in More only when applicable;
- the left identity header is absent while search and progress remain;
- pointer and keyboard resizing clamp to the supported range;
- reset, refresh, and Press switching preserve the Workspace-wide width;
- compact layouts ignore, but do not erase, the saved desktop width; and
- existing export formats, comments, deployment, inline editing, zoom, bookmark persistence, and reader E2E coverage remain green.

Manual QA should exercise all five accents in Dark and Light, switch the operating-system mode while System is selected, drag and reset the left panel at wide and compact viewport sizes, and verify the toolbar at widths where Press tabs overflow.
