# Optional Explanatory Visuals Skill Design

## Summary

OpenPress will stop distributing and managing `chinese-ai-writing-polish`.
The existing `openpress-diagram-drawing` skill will be replaced by the
broader, opt-in `openpress-explanatory-visuals` skill. The replacement owns
decisions about explanatory SVG diagrams and AI-generated explanatory
illustrations, while OpenPress core remains provider-neutral and continues to
own media paths, figure primitives, captions, rendering, and export.

This work ships together with the skill sync/link repair in the existing
3.1.1 patch release and Draft PR #87.

## Goals

- Keep new OpenPress workspaces focused on seven framework workflow skills.
- Let users explicitly install explanatory-visual generation when they need it.
- Select SVG, an existing media asset, a chart/table, or Image Gen from the
  content's explanatory intent.
- Keep SVG labels and structure editable in authored React source.
- Require user approval before any Image Gen operation.
- Retire the Traditional Chinese writing skill without deleting potentially
  user-modified local files.
- Preserve deterministic, lockfile-backed updates and agent links for every
  installed optional skill.

## Non-Goals

- Do not generate or manage hero images, decorative backgrounds, stock photos,
  screenshots, logos, or general-purpose visual design.
- Do not add an image-provider API, credentials, billing, or prompt execution to
  `@open-press/core`.
- Do not make explanatory visuals mandatory for OpenPress authoring.
- Do not add general `skills:list` or `skills:remove` commands in this release.
- Do not automatically delete retired skill directories from existing
  workspaces.

## Skill Catalog

### Default framework bundle

New workspaces and `skills:sync` install these seven skills explicitly:

1. `openpress`
2. `openpress-apply-comments`
3. `openpress-collaborate`
4. `openpress-create-pages`
5. `openpress-create-slide`
6. `openpress-deploy`
7. `openpress-upgrade`

The installer must not use `--skill '*'`; repository membership no longer
means default installation.

### Optional official skill

`openpress-explanatory-visuals` remains in the OpenPress repository and follows
the framework release cadence, but it is installed only through:

```bash
open-press skills add explanatory-visuals
```

The command maps the stable alias `explanatory-visuals` to the published skill
name `openpress-explanatory-visuals`, invokes the pinned upstream `skills` CLI
with the universal and Claude agent targets, and verifies the resulting
canonical directory, lock entry, and agent link.

After installation, ordinary `skills:sync` updates it because it is recorded in
`skills-lock.json`. `doctor` never requires the optional skill in an untracked
workspace; once tracked, the normal missing-directory and link checks apply.

## Retiring Legacy Skills

The `chinese-ai-writing-polish` directory, catalog entry, routing instruction,
and framework cross references are removed. `openpress-diagram-drawing` is
replaced by the optional `openpress-explanatory-visuals`; existing workspaces
are not opted into the replacement automatically.

For an existing workspace, `skills:sync` treats a lock entry as retired only
when both conditions are true:

- the skill name is `chinese-ai-writing-polish` or
  `openpress-diagram-drawing`; and
- its normalized source is `quan0715/open-press`.

Before running upstream sync commands, OpenPress removes that entry from
`skills-lock.json` using an atomic rewrite. It leaves `.agents/skills` and
`.claude/skills` content untouched and prints a migration notice with the paths
the user may remove manually. A same-named skill from another source remains a
normal user-managed dependency.

`doctor` ignores the retired OpenPress-owned lock entry during migration so the
workspace is not marked stale solely because the retired skill no longer
exists upstream.

## Explanatory Visual Decision Model

The skill runs only when it is installed and the request explicitly asks for a
visual or the content contains a relationship that materially benefits from
one. It applies this order:

1. Keep prose when spatial structure adds no information.
2. Use a table for dense comparison or trace rows.
3. Use an OpenPress chart primitive for quantitative trends or proportions.
4. Reuse an appropriate authored workspace asset when one already exists.
5. Create an editable SVG for flows, structures, relationships, states,
   before/after changes, and operation sequences.
6. Consider Image Gen for explanatory concepts that cannot be expressed clearly
   through geometry and labels alone.

The skill does not create a visual merely to fill space.

## SVG Workflow

SVG output is authored as a React component at:

```text
press/<slug>/components/<Name>Figure/index.tsx
```

The component:

- renders a semantic `figure` containing an SVG and `figcaption`;
- uses `role="img"` and an accessible name or description;
- keeps nodes, labels, values, arrows, and relationships in editable TSX;
- uses Press theme tokens instead of hard-coded brand styling;
- avoids explanatory paragraphs inside the figure;
- receives a stable caption that participates in OpenPress figure numbering and
  the figure directory.

The surrounding page or slide skill owns placement, layout skin, typography,
and explanatory prose. The explanatory-visuals skill owns only the visual
semantics and the component source needed to express them.

## Image Gen Workflow

Image Gen is always approval-gated. Before generation, the agent presents:

- the explanatory purpose;
- the intended composition;
- the visual style;
- the proposed prompt; and
- the destination path.

After approval, the agent uses whatever image-generation capability is
available in its environment. OpenPress does not select or invoke a provider.
The authored result is saved to:

```text
press/<slug>/media/figures/<name>.png
```

It is inserted with `MediaFigure` or the equivalent `MediaObject`, `Media`, and
`MediaCaption` primitives. Alt text and captions remain in TSX or MDX. Generated
images must not contain titles, long prose, exact numeric labels, or other text
that must remain editable or localizable.

If no Image Gen capability exists, the agent offers an SVG alternative or
leaves the content unchanged. Failed generation never creates a placeholder or
broken media reference.

## Source and Runtime Boundaries

- Generated PNG files under `press/<slug>/media/figures/` are authored workspace
  source and may be committed.
- Generated render/export output under `public/openpress/`, `dist-react/`,
  `.deploy/`, and `.openpress/` remains non-editable output.
- OpenPress core retains its existing media indexing, `MediaFigure`, caption
  directory, rendering, PDF, image, and Word behavior.
- The skill may call an agent's Image Gen tool, but framework code must not
  import a provider SDK or store provider credentials.

## CLI and Sync Behavior

`open-press skills add explanatory-visuals` is the public package command; the
core runtime exposes the equivalent `skills:add` command. Both share the pinned
upstream CLI package, source normalization, agent targets, command formatting,
execution, and post-install inspection used by `skills:sync`.

`skills:sync` always installs the seven default framework skills, then refreshes
tracked non-framework skills and tracked optional OpenPress skills. Framework
lock entries are not blindly replaced with every skill found in the repository.

Sync verification requires:

- all seven default skills;
- every non-retired skill recorded in the lock;
- canonical `.agents/skills/<name>/SKILL.md`; and
- valid `.claude/skills/<name>` links or copied-directory fallbacks.

## Error Handling

- An unknown `skills:add` alias exits non-zero and lists the supported alias.
- A malformed or unsupported lockfile remains a hard error.
- A failed upstream install propagates its exit code.
- A zero-exit install that does not produce the expected lock entry, canonical
  skill, or agent link is treated as failure.
- Retirement lock rewrites preserve unrelated fields and entries and use a
  temporary file plus rename to avoid partial JSON.
- Files belonging to retired skills are never deleted automatically.

## Verification

Automated tests cover:

- a default sync plan containing exactly seven explicit framework skill names;
- optional skill installation, lock tracking, canonical source, and agent link;
- optional tracked skills participating in later sync and doctor checks;
- unknown optional aliases;
- retirement of only the OpenPress-owned legacy skill lock entries;
- preservation of a same-named skill from another source;
- preservation of local retired skill directories;
- scaffolding with the explicit seven-skill bundle;
- JSON and dry-run output remaining parseable; and
- Node 20 compatibility.

Repository verification includes `typecheck`, the complete test suite, build,
changeset status, `git diff --check`, and a real temporary-workspace install
using the pinned upstream `skills` CLI.

Skill contract review confirms that the new skill contains the SVG decision
rules, Image Gen approval gate, media paths, accessibility, caption behavior,
failure handling, and source/generated boundary. Human prose is reviewed rather
than tested through brittle source-text assertions.

## Release and GitHub Scope

The existing patch changeset remains a 3.1.1 patch for
`@open-press/core`, `@open-press/cli`, and `@open-press/create`, as explicitly
requested. PR #87 stays Draft and targets `dev`; it still requires #86 to merge
first and must then be rebased and reverified.

The only currently open repository issue is #64, which concerns Workbench
screenshot parity and is unrelated to this change. It must remain open. No issue
will be closed merely to create bookkeeping; only an issue whose acceptance
criteria are fully satisfied by this implementation may be closed.
