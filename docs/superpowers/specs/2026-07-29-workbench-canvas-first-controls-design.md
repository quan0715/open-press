# Workbench Canvas-First Controls Design

## Goal

Give the document canvas the width currently reserved by the permanent right panel while keeping export and zoom immediately available.

## Problem

The right panel permanently consumes workspace width for four unrelated concerns: output actions, theme information, document statistics, and zoom. Export and zoom are frequent controls; theme details and statistics are reference information. Keeping all four in one persistent column reduces the usable canvas without matching their usage frequency.

## Layout

`HtmlWorkbench` renders the left navigation and main canvas without a fixed right-panel column. Zoom uses one floating `PageZoomDock` anchored to the bottom-right of `WorkbenchShell.MainContent` in both normal and Focus modes. Toggling Focus mode must not remount the dock or reset its state.

The top toolbar contains an Export control. Its menu preserves PDF and PNG, exposes Word for page Presses, and adds Present for slide Presses. Existing export progress, disabled states, errors, and deployment handlers remain the source of truth.

Theme details and document statistics move into one read-only Document info dialog opened from the toolbar overflow menu. Deploy remains the existing independent Rocket control.

## Extension Panels

When `extraControlPanels` is empty, the Workbench renders no right-side tools affordance. When panels are registered, a Tools button opens an overlay drawer from the right. The drawer does not add a grid column, resize the canvas, or change zoom. Closing it restores direct interaction with the same canvas state.

## Components and State

- Retire the built-in `WorkspaceOutputPanel` registry entry and expose its actions through a focused Export control.
- Keep `useDeploymentWorkbench` handlers and status values unchanged.
- Render one floating `PageZoomDock` from `MainContent`; keep the existing per-Press `usePageViewportScale` controller.
- Combine the existing theme-detail dialog and computed document statistics into `DocumentInfoDialog` without adding editing or persistence.
- Keep `WorkbenchShell.RightPanel` available only if another runtime still consumes it; `HtmlWorkbench` no longer renders it.

## Error and Accessibility Behavior

Export failures and progress remain visible inside the Export menu and through existing toast behavior. Toolbar controls, menus, dialogs, and the optional Tools drawer must be keyboard reachable, labelled, focus-trapped where modal, and return focus to their trigger when closed.

## Verification

- Normal and Focus modes each expose exactly one floating zoom dock.
- Focus mode transitions preserve the selected zoom.
- Export options match the active Press type and preserve existing status/error behavior.
- Removing the right panel increases the canvas width at the same viewport size.
- Opening the optional Tools drawer does not resize the canvas or change zoom.
- Existing multi-Press zoom isolation tests remain green.

## Non-Goals

- Do not redesign PDF, Word, presentation, or deployment workflows.
- Do not add theme editing or new document analytics.
- Do not make the optional Tools drawer persistent or width-reserving.
- Do not change the left navigation in this work.
