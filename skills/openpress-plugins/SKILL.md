---
name: openpress-plugins
description: Use when an OpenPress document, slide, or workflow needs external plugin tools (such as diagram-design for architecture/system diagrams, visual toolkits, or writing helpers).
---

# OpenPress Plugins

Manage, recommend, and adapt external specialized skills into OpenPress documents, components, and media.

## Workflow

1. **Recognize Intent**:
   - Match user requests (e.g. "畫架構圖", "system diagram", "flowchart", "sequence diagram", "cover design") against triggers in `references/catalog.json`.

2. **Check Readiness & Recommend**:
   - **If installed** (`.agents/skills/<id>` or `skills/<id>` exists): invoke the plugin skill directly, then read its matching adapter.
   - **If not installed**: present a compact, actionable **Recommendation Card** in chat:

```markdown
### 🧩 Recommended Plugin: <Plugin Name>

<Short Description>

- **Source**: `<source>` (<License>)
- **Why**: <Why this plugin fits the user's specific request>

**Options:**
1. **Install & Use**: Follow the short installation note in the matching adapter, then proceed with the generation.
2. **Continue with Native**: Proceed using standard OpenPress basic SVG without installing the plugin.
```

3. **Handle User Response**:
   - **Install & Use**: Give the adapter's natural-language installation note, then invoke the plugin and adapt its output.
   - **Native Fallback**: Generate standard basic React SVG figure or table directly without external dependencies.

4. **Adapt and Insert**:
   - Save visual components to `press/<slug>/components/figures/<Name>Figure.tsx` (or `components/<Name>Figure/index.tsx`).
   - For writing plugins: apply edits directly to the target MDX file.
   - Follow `openpress` → Local Review Gate (`npm run dev:workspace` or `npm run build`) to verify layout, pagination, and theming.

## Responsibility Boundary

- **`openpress-plugins`**: Recommends external skills based on document authoring needs (e.g. diagrams, posters, writing polish) and provides adapters to convert external skill outputs into OpenPress native components (`components/figures/<Name>Figure.tsx`).
- **Workbench Updates (`/workspace/settings`)**: Read-only capability status in the UI with copyable prompts for Agent handoff.
- **Codex / Claude (Agent)**: Executes actual remote inspection, dependency upgrades, `skills-lock.json` hash updates, and verification.

## References & Adapters

- `references/catalog.json`: Registry of supported companion plugins, triggers, and sources.
- `adapters/diagram-design.md`: Adapter rules for `diagram-design` architecture and technical diagrams.
- `adapters/gc-minimal-zine-poster.md`: Adapter rules for `gc-minimal-zine-poster` editorial covers and poster art.
