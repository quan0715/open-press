# Local Review

Workbench review is the visual gate before PDF or public deploy.

## Run

```bash
npm run build
npm run dev
```

Open the Vite URL ending in `/workspace`; use the reported port when `5173` is occupied.

## Review

Inspect the affected Press for:

- expected page count and order;
- overflow, cropping, overlap, blank pages, and stale rendering;
- typography, media, captions, page chrome, and pagination;
- unresolved items in **Pending comments**.

Use fit-page and spread views when page rhythm matters. If anything changes, edit source and repeat build → Workbench review.

## Workbench Controls

- Left panel: Press identity, outline, and current page.
- Center: rendered pages, zoom, and single/spread view.
- Right panel: pending comments and registered media/components.
- Inspector: add, edit, or remove source-linked comments; use `openpress-apply-comments` to resolve them.
- Changes: compare Current and Proposed output from `openpress-collaborate`; Proposal feedback does not mutate source.
- Inline editing: dev-only MDX text and table-cell editing; saving refreshes derived indexes.
- Speaker Notes: in a Slides Press, edit the current slide note in the bottom dock; use **Save** or `Cmd/Ctrl+Enter`, and `Escape` to revert the draft.
- PDF export: opens the latest generated PDF; it does not generate or approve one by itself.

## Fast Source Refresh

For a full source refresh, run `npm run build`. For the inner export only:

```bash
open-press export .
open-press validate .
```

## Safety

- Workbench review is not deploy approval.
- Do not fix preview issues by editing generated output.
- For blank or stale output, inspect export status, dev-server output, and browser console before changing content.
