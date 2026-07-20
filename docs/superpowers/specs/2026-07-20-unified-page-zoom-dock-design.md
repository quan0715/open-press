# Unified Page Zoom Dock Design

## Summary

Replace the existing toolbar and output-panel zoom dropdowns with one controlled `PageZoomDock` component. Workbench renders it as a native footer control at the bottom of the right panel. Public Reader renders the same component as a compact floating control at the bottom-right of the canvas, moving it to bottom-center on narrow screens.

The dock provides minus and plus controls, a current-percentage menu, fit modes, fixed shortcuts, and an integer custom zoom between 25% and 200%. It reuses the zoom persistence and page-relative scroll anchoring already owned by `usePageViewportScale`.

## Goals

- Give Public Reader and Workbench one consistent zoom interaction.
- Support arbitrary integer zoom percentages from 25% through 200%.
- Keep zoom mode persistence and reading-position anchoring intact.
- Make the Workbench control look native to the right panel rather than like another card or section.
- Remove the user-facing two-page spread control.
- Preserve keyboard access, screen-reader labels, and responsive usability.

## Non-goals

- Do not move zoom state, storage, or scroll anchoring into the shell or dock.
- Do not add sliders, gesture-specific controls, or animated zoom transitions.
- Do not redesign the rest of the right panel or toolbar.
- Do not remove the exported low-level `PageLayoutMode` compatibility surface in this patch. The Reader and Workbench UI will be fixed to single-page layout; dormant low-level support can be removed in a future major release.

## Component Architecture

Create a controlled `PageZoomDock` under the existing workbench actions area. It accepts:

- the current `scaleMode`;
- the resolved numeric `scale`;
- the formatted `scaleLabel`;
- an `onScaleModeChange` callback;
- a placement variant: `panel` or `floating`.

The component does not access local storage, page DOM, or scroll position. `usePageViewportScale` remains the single owner of mode state, persistence, scale calculation, and viewport-anchor restoration.

Workbench renders a two-row wrapper inside `WorkbenchShell.RightPanel`: the existing scrollable `WorkbenchControlPanel` occupies the flexible row, and `PageZoomDock` occupies the auto-sized footer row. This wrapper belongs to Workbench composition, so `WorkbenchShell` remains unaware of zoom semantics.

Public Reader renders `PageZoomDock` as a sibling of the reader stage inside `WorkbenchShell.MainContent`. The main-content surface supplies the positioning context; the floating variant owns its offsets and responsive placement.

## Visual Design

The Workbench footer must read as a control already built into the panel:

- one horizontal row only;
- no panel title, card shell, nested section, or decorative container;
- a single top border separating it from scrollable panel content;
- the same panel background and spacing tokens as its parent;
- compact icon buttons and a wider central percentage trigger.

The visible structure is:

```text
[ − ]  [ 125% ▾ ]  [ + ]
```

The floating Reader variant uses the same row and tokens with one raised-surface background, border, and restrained shadow needed to separate it from the canvas. It must not introduce additional nested visual layers.

The dock height should remain approximately 36–40px. The menu opens upward so it cannot collide with the bottom edge.

### Flat visual refinement

The dock controls use a fully flat treatment. Minus, percentage, chevron, and plus have transparent backgrounds in their default, hover, focus, pressed, and expanded states. Interaction and hierarchy are communicated only through text and icon color: muted at rest, stronger on hover or focus, and accent-colored while the percentage menu is open. Disabled controls reduce text/icon opacity without introducing a fill.

The Workbench footer inherits the right panel background and retains only its top divider. It must not create a separate colored strip. The Public Reader keeps one outer raised surface so the floating dock remains legible over the canvas, but its three inner controls follow the same transparent, color-only treatment. Focus-visible rings remain available for keyboard accessibility without becoming a persistent visual block.

### Readability and kinetic value refinement

The flat controls remain compact, but their visible content increases slightly in scale: minus and plus icons render at 18px, while the central zoom label renders at 13px. Button hit areas and dock height remain unchanged, so the control gains legibility without consuming more panel space.

When the zoom value changes, the previous label leaves and the next label enters with a short vertical odometer transition. Increasing zoom moves the new value upward into place; decreasing zoom moves it downward into place. The transition lasts approximately 180ms, uses the existing workspace easing, and affects only the label—not the chevron or dock geometry. Fit-mode changes at the same resolved percentage use a restrained crossfade. Under `prefers-reduced-motion: reduce`, the label updates immediately without translation.

## Interaction Model

### Minus and plus

- Minus subtracts 10 percentage points.
- Plus adds 10 percentage points.
- The valid range is 25% through 200%.
- The corresponding button is disabled at each bound.
- For a fixed or custom mode, stepping begins from that exact percentage: 125% becomes 115% or 135%.
- For `fit-width` or `fit-page`, stepping begins from the resolved displayed percentage: a resolved 47% becomes 37% or 57%, then changes to a fixed mode.

### Percentage menu

Selecting the central percentage opens a compact menu containing:

1. Fit width.
2. Fit page.
3. Fixed shortcuts: 25%, 50%, 75%, 100%, 125%, 150%, and 200%.
4. One custom percentage field.

The custom field accepts integer input. Enter or blur applies the value. Values below 25 are clamped to 25; values above 200 are clamped to 200. Empty or non-numeric input leaves the current mode unchanged and restores the displayed current value.

The menu keeps keyboard focus within standard Radix menu behavior. The custom field stops menu selection keystrokes from swallowing text editing. Minus, plus, the percentage trigger, fit choices, shortcuts, and custom input all receive explicit accessible names.

## Scale Model and Persistence

Generalize fixed scale modes so runtime code can represent `scale-137` and other integer values, while retaining the existing fit modes. Add one normalizer that:

- parses persisted and UI-provided values;
- accepts only integer fixed values;
- clamps values to 25–200;
- returns a valid fixed scale mode.

Persistence stores the selected mode string, including custom values. Existing Reader and Workbench storage keys remain separate. Invalid persisted values fall back to the configured initial mode. Storage access remains guarded for private browsing and embedded contexts.

Changing scale through any dock action continues through `usePageViewportScale`, so the existing page-relative center anchor is captured and restored automatically.

## Placement and Responsive Behavior

### Workbench

- The dock stays attached to the bottom of the right panel.
- Right-panel content scrolls independently above it.
- The dock is hidden with the right panel and during modes where the right panel is unavailable.
- It does not create another independently scrolling area.

### Public Reader

- Desktop placement is 16px from the canvas right and bottom edges.
- Below the narrow breakpoint, the dock is centered horizontally at the bottom.
- Bottom spacing includes `env(safe-area-inset-bottom)`.
- The reader stage reserves enough bottom space that the final page can scroll clear of the dock.
- The menu opens upward and remains within the viewport.

## Existing UI Removal

- Remove `PageZoomControl` from the Public Reader toolbar.
- Remove the old zoom control from Workbench toolbar/output-panel composition.
- Remove single/spread UI and local layout state from Public Reader and Workbench callers.
- Render both surfaces in single-page layout.
- Remove now-unused internal control props, toolbar classes, and tests.
- Preserve low-level layout compatibility where removal would create an unnecessary patch-level API break.

## Error Handling

- Unavailable local storage does not block zoom operation.
- Invalid stored modes fall back to fit width.
- Invalid custom input does not change zoom.
- Out-of-range custom input is clamped visibly before application.
- If page geometry is temporarily unavailable, scale calculation keeps its existing safe fallback and skips anchor restoration for that frame.

## Test Strategy

### Unit tests

- Parse and normalize custom fixed modes.
- Clamp custom values to 25–200.
- Calculate 10-point stepping from fixed and fit scales.
- Reject invalid persisted values.
- Format arbitrary fixed percentages correctly.

### Reader E2E

- Minus and plus update the scale by 10 points.
- A shortcut applies the selected percentage.
- Custom percentage input applies and persists across reload.
- Fit modes remain selectable.
- Page-relative reading position stays stable after dock-driven zoom.
- Floating placement is usable on desktop and tablet.
- Toolbar zoom and spread controls are absent.

### Workbench E2E

- The dock renders at the right-panel footer.
- Right-panel content scrolls without moving the dock.
- Custom percentage persists across reload.
- Toolbar/output-panel zoom and spread controls are absent.

### Regression verification

- Run core typecheck and unit tests.
- Run the complete Reader E2E suite on desktop and tablet.
- Run root typecheck and test tasks before integration.

## Release Scope

This is a patch change to `@open-press/core`. The existing fixed Changesets package group may version `@open-press/core`, `@open-press/cli`, and `@open-press/create` together. No release is performed as part of implementation.
