# Responsive Fixed-Layout Notes

Use this reference when editing open-press styles that affect mobile, tablet, zoom, spread mode, or responsive behavior.

## Core Principle

open-press pages have canonical page geometry. Responsive behavior should scale the page and surrounding workspace, not re-author the document for every viewport.

A deployed open-press reader should stay DOM-rendered and open-press-owned. Do not embed the browser PDF viewer to solve responsive problems; that adds a second reader UI and breaks the intended workspace model.

## Page Rules

- Keep one canonical width/height ratio for each page.
- Use CSS variables for page dimensions and derive scale from the available stage size.
- On narrow viewports, show one page at a time and scale the page down.
- On wide viewports, spread mode may show two pages if both fit without clipping.
- Workbench fixed zoom presets should stay within the supported range (25%-200%); use fit-width / fit-page for adaptive sizing.
- Preserve page order, anchors, bookmarks, figure indexes, and page numbers across breakpoints.
- do not reflow document copy into a different editorial structure on mobile.

## SVG Rules

- Inline SVG charts must keep a stable `viewBox` and use CSS `aspect-ratio` that matches that viewBox.
- SVG figures should use `display: block`, `max-width: 100%`, `height: auto`, and `overflow: visible`.
- Scale the SVG as one fixed graphic within the canonical page; do not reflow labels, legends, or axes per breakpoint.
- External SVG assets used through `<img>` should be constrained like other images: fixed frame, `object-fit: contain`, and explicit max dimensions.

## Workspace Rules

- The React open-press workbench shell may be responsive: side panels can collapse, navigation can become denser, and controls may hide secondary metadata.
- The document page itself should not change its typography hierarchy, captions, table structure, or figure composition just because the viewport changed.
- If text becomes too small on mobile, prefer pinch/zoom or horizontal-safe page scaling over rewriting the document layout.
- Keep a single scroll owner per viewport mode. Avoid nested vertical scrollbars between body, stage, and page.

## Avoid

- viewport-width font sizing inside fixed pages;
- mobile-specific page content order;
- breakpoints that alter canonical page pagination;
- iframe-based PDF readers as the central stage;
- CSS transforms that leave hit targets, bookmarks, or scroll sync using stale geometry.

## Acceptance Checklist

- Desktop, tablet, and mobile all show the same page count.
- Bookmark clicks land on the same logical page across breakpoints.
- Figures and tables retain captions and do not overflow.
- The page is scaled or positioned by the workspace, not redesigned by the viewport.
- There is no embedded browser PDF toolbar inside the open-press reader.
