# Portable Slide Style Templates

**Goal:** Make slide style portable by replacing the `SlideProtocol` scaffold with workspace-local template slide copying.

**Motivation:** The dogfood slide deck currently depends on copied layout components such as `layouts/SlideProtocol.tsx`. That shape makes each workspace inherit a semi-framework abstraction, and future migrations must reason about both slide content and shared layout APIs. A portable style package should instead be a folder of complete slide templates, theme files, and assets that can be copied between workspaces without requiring the engine or CLI to understand visual design.

---

## Design Direction

Slide style is a source package, not a framework export.

Each slides Press owns a `slide-style/` folder. That folder registers complete `slide.tsx` templates in a manifest. `open-press slide add` copies one registered template into `slides/<id>/slide.tsx`, substitutes a small set of deterministic tokens, and appends the `<Slide id />` marker to `press.tsx`.

The CLI does not generate JSX, maintain layout components, or know the meaning of a template. The engine remains dumb: it validates the resulting slide source exactly like any other `slides/<id>/slide.tsx`.

## Source Shape

New slides Presses use this default shape:

```txt
press/<slug>/
├── press.tsx
├── slides/
│   └── intro/
│       └── slide.tsx
├── slide-style/
│   ├── manifest.json
│   ├── templates/
│   │   ├── blank/
│   │   │   └── slide.tsx
│   │   ├── title-image/
│   │   │   └── slide.tsx
│   │   ├── statement/
│   │   │   └── slide.tsx
│   │   ├── split-media/
│   │   │   └── slide.tsx
│   │   └── card-grid/
│   │       └── slide.tsx
│   ├── theme/
│   │   └── default.css
│   └── assets/
├── theme/
│   └── default.css
└── media/
```

`layouts/SlideProtocol.tsx` is not scaffolded for new workspaces. Existing workspaces may keep `layouts/` files; they are normal user source, not part of the new portable style contract.

## Manifest

`press/<slug>/slide-style/manifest.json` is the only registry file in the first version.

```json
{
  "id": "openpress-default-slide-style",
  "version": "1.0.0",
  "defaultTemplate": "blank",
  "templates": {
    "blank": {
      "source": "templates/blank/slide.tsx",
      "description": "Minimal starter slide"
    },
    "title-image": {
      "source": "templates/title-image/slide.tsx",
      "description": "Title slide with a media object"
    },
    "statement": {
      "source": "templates/statement/slide.tsx",
      "description": "Large editorial statement slide"
    },
    "split-media": {
      "source": "templates/split-media/slide.tsx",
      "description": "Two-column text and media slide"
    },
    "card-grid": {
      "source": "templates/card-grid/slide.tsx",
      "description": "Three-card argument or feature grid"
    }
  },
  "theme": {
    "source": "theme/default.css",
    "target": "theme/default.css"
  }
}
```

The manifest is deliberately small. It does not declare layout APIs, slot contracts, or package dependencies. Those details live in template source.

## Template Source Contract

Each template is a complete `slide.tsx` file. It imports only core primitives and optional local assets or helpers.

```tsx
import { Media, MediaCaption, MediaObject, Slide, Text } from "@open-press/core";
import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "title-image",
  description: "Title slide with a strong media object.",
  keypoints: ["Replace the title", "Replace the image"],
} satisfies SlideMeta;

export const notes = "Replace these notes before presenting.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page bg-bg text-text [font-family:var(--font-body)]">
      <section className="grid h-full gap-op-lg px-op-xl py-op-lg [grid-template-columns:minmax(0,1fr)_520px]">
        <div className="grid content-end border-l-[6px] border-accent pl-op-md">
          <Text as="p" className="op-kicker mb-op-sm">
            Template
          </Text>
          <Text as="h1" className="op-display max-w-[920px]">
            Replace this title.
          </Text>
          <Text as="p" className="op-lead mt-op-sm max-w-[820px] text-text-muted">
            Replace this supporting line.
          </Text>
        </div>
        <MediaObject className="relative min-h-[660px] overflow-hidden rounded-op-card border border-border bg-surface-muted">
          <Media src="openpress-hero-art.png" alt="Template media" fit="cover" />
          <MediaCaption className="absolute bottom-op-sm left-op-sm rounded-op-pill bg-surface-inverse px-op-sm py-op-xs text-op-caption text-text-inverse">
            Replace caption
          </MediaCaption>
        </MediaObject>
      </section>
    </Slide>
  );
}
```

Templates may use direct DOM elements for visual effects and geometry-specific composition. They should still use `Text`, `MediaObject`, `Media`, and `MediaCaption` where the object model or source-edit targeting matters.

## Token Substitution

The first version supports exactly these tokens:

| Token | Replacement |
| --- | --- |
| `__SLIDE_ID__` | The validated slide id passed to `open-press slide add` |
| `__SLIDE_COMPONENT__` | PascalCase component name derived from the slide id, suffixed with `Slide` |

No arbitrary variables are supported in the first version. This keeps template copying deterministic and avoids turning the manifest into a second authoring language.

## CLI Behavior

`open-press slide add` gains a `--template <name>` option:

```bash
open-press slide add pricing
open-press slide add cover --template title-image
open-press slide add comparison --template split-media
```

Behavior:

1. Resolve the slides Press exactly as today.
2. Read `press/<slug>/slide-style/manifest.json`.
3. Select `--template` or `defaultTemplate`.
4. Validate that the template source path stays inside `slide-style/`.
5. Copy the template to `press/<slug>/slides/<id>/slide.tsx`.
6. Replace supported tokens.
7. Append `<Slide id="<id>" />` to `press.tsx` atomically.

If `slide-style/manifest.json` is missing, the command falls back to the current internal blank source for existing workspaces. New scaffolded workspaces always include the manifest, so the fallback is compatibility-only.

## Create Scaffold Behavior

Both `@open-press/create` and `open-press create <slug> --type slides` scaffold the same template-first Press:

- marker-only `press.tsx`;
- `slide-style/manifest.json`;
- registered template files under `slide-style/templates/`;
- `slide-style/theme/default.css`;
- active `theme/default.css`, initially copied from the style package theme;
- `slides/intro/slide.tsx`, created by copying the registered default template with `__SLIDE_ID__ = intro`.

The scaffold no longer writes `layouts/SlideProtocol.tsx`. It may keep `components/DeckSlide.tsx` out of the default shape unless a template explicitly imports it. The first style package should prefer self-contained template slides built from `Slide`, `Text`, and media primitives.

## Dogfood Migration

The tracked `press/slide` deck becomes the first dogfood style package.

Migration is incremental:

1. Add `press/slide/slide-style/manifest.json`.
2. Add template slides under `press/slide/slide-style/templates/`.
3. Update `open-press slide add` tests to prove `--template` copies from dogfood-style fixtures.
4. Update create package tests to assert that new workspaces contain `slide-style/` and do not contain `layouts/SlideProtocol.tsx`.
5. Leave existing `press/slide/slides/*` files working during the transition.
6. Remove `press/slide/layouts/SlideProtocol.tsx` only after dogfood slide source no longer imports it.

This avoids a large all-at-once rewrite while still making the future contract clear.

## Migration Semantics

The portable unit is `slide-style/`.

Future style migration can compare or replace:

- `slide-style/manifest.json`;
- `slide-style/templates/**`;
- `slide-style/theme/**`;
- optional `slide-style/assets/**`.

Existing `slides/*/slide.tsx` files are not automatically rewritten when a style package changes. Template updates affect future slides, not already-authored slides. That keeps authored decks stable and makes migration reviewable.

## Validation And Errors

The engine's existing slide validation remains authoritative after copy:

- matching `<Slide id />` marker and `slides/<id>/slide.tsx`;
- default export exists;
- literal `meta` when extracted;
- literal `notes` when extracted;
- no hand-authored `objectId` or `data-op-id`.

The template registry adds only source-level safety:

- manifest must be valid JSON;
- selected template must exist;
- selected template path must remain inside `slide-style/`;
- slide id must pass the existing slide id validator;
- destination slide folder must not already exist.

## Non-Goals

The first version does not include:

- npm-based slide style installers;
- a style marketplace;
- remote template fetching;
- a generalized template variable language;
- core-owned visual template packages;
- automatic rewriting of existing slides;
- a replacement for agent judgement when editing real slide content.

## Test Strategy

Tests should cover the behavior at the package boundary:

- core slide command test: `slide add --template title-image` copies the registered template and substitutes id/component tokens;
- core slide command test: missing manifest falls back to the compatibility blank slide;
- core slide command test: manifest paths cannot escape `slide-style/`;
- create package test: scaffold includes `slide-style/manifest.json` and template files;
- create package test: scaffold does not include `layouts/SlideProtocol.tsx`;
- generated workspace build test: a scaffolded slides workspace builds successfully;
- dogfood build: `npm run build` validates the tracked `press/slide` deck after the migration.

## Documentation Updates

Update these docs and skills after implementation:

- `docs/slide-template-protocol.md`: replace the protocol-component model with template-copy style packages, or supersede the document with a migration note.
- `docs/superpowers/specs/2026-06-09-slides-folder-architecture.md`: revise the recommended folder layout from `layouts/` to `slide-style/`.
- `skills/openpress-create-slide/SKILL.md`: remove guidance that prefers `SlideProtocol` compound components; instruct agents to use `open-press slide add --template <name>` and then edit copied slide source.
- `skills/openpress-create-slide/references/layout-contract.md`: replace the layout contract with template source guidance.
- `skills/openpress/SKILL.md`: update create/core alignment checks to require `slide-style/` instead of `layouts/SlideProtocol.tsx`.
