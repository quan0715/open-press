---
chapter: 1
slug: reader-contract
title: Reader Navigation Contract
---

## Reader Navigation Contract

The reader should treat bookmark navigation as a deliberate route update. A tap on a section bookmark should resolve to the target page and keep that target stable while layout observers settle.

### Touch Bookmark Target

This section gives the E2E test a nested bookmark target. The exact heading text is not used by the test; only the reader bookmark contract matters.

#### Topic Bookmark Marker

Topic-level headings are present so the fixture also exercises deeper bookmark collection without depending on any real document.

<div class="fixture-scroll-box" tabindex="0">
  <p>Scrollable fixture row 1</p>
  <p>Scrollable fixture row 2</p>
  <p>Scrollable fixture row 3</p>
  <p>Scrollable fixture row 4</p>
</div>

### Resize Stability

Changing viewport orientation should not move the route back to the table of contents or to a nearby page.

## Second Fixture Section

The second section exists so the reader has more than one report page in addition to cover and contents.

### Secondary Nested Target

This heading keeps the fixture representative of documents with multiple H2 and H3 entries.
