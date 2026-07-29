# Workbench Bookmarks Toggle and Toolbar Export Design

## Goal

Replace the broad Focus / Hide UI mode with a single-purpose bookmarks-panel toggle, and make the toolbar Export trigger visually consistent with the other toolbar actions.

## Interaction design

### Bookmarks toggle

- Remove the Workbench Focus / Hide UI control and its whole-interface hiding behavior.
- Keep the control in the toolbar's right action group, but present it as a bookmarks control.
- The control only expands or collapses the left navigation panel. Export, deploy, comments, More, color mode, extension Tools, and the floating zoom dock remain available in either state.
- Use a bookmark-oriented icon and the accessible labels `收合書籤` and `展開書籤` according to the current state.
- Expose a stable `data-openpress-bookmarks-toggle` selector and `aria-pressed` state for tests and integrations.
- The active visual state means the bookmarks panel is open.

### Persistence and responsive defaults

- Persist panel state through the existing reader panel-state mechanism rather than maintaining a second Workbench-only UI mode.
- Store the Workbench panel preference under a dedicated local-storage key.
- On first use, the bookmarks panel is open on desktop and closed at narrow Workbench widths (`860px` and below).
- Once the user toggles the panel, the saved preference wins on reload.
- The preference is workspace-wide, matching the previous Focus preference; it is not duplicated per Press.
- The obsolete Focus storage key is no longer read or written. No migration is needed because its meaning is incompatible with the new control.

### Export trigger

- Keep the existing Export menu and all PDF, Word, PNG, and presentation behavior unchanged.
- Render the toolbar trigger with the same fixed 44px action slot, icon scale, neutral color, hover state, and active state as More, Tools, comments, and color mode.
- In toolbar placement, show only the export icon. Remove the permanently visible `匯出` label and chevron; retain `title="匯出"` and `aria-label="匯出"`.
- Panel placement remains unchanged for any non-toolbar consumer.

## Architecture

- `HtmlWorkbench` passes a storage key, responsive initial panel state, and breakpoint to `useReaderRuntime`, then uses `reader.leftPanelOpen` as the shell's controlled left-panel state.
- `WorkbenchToolbarActions` receives `bookmarksOpen` and `onToggleBookmarks` instead of `hideUiMode` and `onToggleHideUiMode`.
- `WorkbenchShell` no longer needs Workbench Hide UI state to produce this behavior; normal left-panel layout transitions handle canvas expansion and restoration.
- Source-edit mode can continue forcing the left panel closed without overwriting the saved user preference.
- `ExportControl` uses the shared toolbar action class without width or label overrides when `placement="toolbar"`.

## Accessibility

- The bookmarks button has a state-specific accessible name and `aria-pressed` value.
- Keyboard activation follows the existing native button behavior.
- Collapsing the panel does not remove the toolbar or move focus into hidden content.
- The Export button remains discoverable through its accessible name even though the visible label is removed.

## Testing

- Replace the Focus-mode E2E case with a bookmarks-toggle regression test that verifies:
  - only the left panel closes;
  - the canvas expands;
  - Export, More, and floating Zoom remain available;
  - the state persists after reload;
  - toggling again restores the panel.
- Cover the narrow viewport default and saved-preference override.
- Assert that the Export trigger uses the same toolbar dimensions as another standard action and contains no visible label or chevron.
- Run core typecheck, node/unit tests, the complete reader E2E suite, and live-browser visual QA.

## Out of scope

- Changing export menu contents or export execution.
- Redesigning the left-panel content.
- Adding per-Press panel preferences.
- Changing public-reader panel controls.
