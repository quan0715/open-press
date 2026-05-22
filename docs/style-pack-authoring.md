# Authoring a third-party style pack

open-press lets anyone publish a style pack from their own GitHub repo. No PR to upstream, no maintainer review, no central registry.

## When to make your own pack vs. PR upstream

| You should... | Because |
| --- | --- |
| Open a PR to `quan0715/open-press` for **demo / exemplar** packs (general-purpose designs that show off the framework) | Bundled packs ship inside `@open-press/cli` and are the default `--pack <name>` flags |
| Make your own pack repo for **institution-specific, niche, or personally-maintained** packs (university thesis templates, company internal docs, school-specific course handouts) | You keep release cadence; upstream doesn't bottleneck your edits; the pack stays under your ownership |

Example: NYCU 學位論文 template should be a separate repo (`quan0715/openpress-pack-nycu-thesis`), not a PR to the main repo — it has institutional rules that may change, and the format isn't generally applicable.

## Repo layout

Your pack repo must follow this shape exactly:

```txt
your-pack-repo/
├── README.md           # description, screenshots, when to use
├── LICENSE             # MIT recommended (mirrors open-press itself)
└── starter/
    └── document/       # ← cli copies this into the user's workspace document/
        ├── index.tsx
        ├── chapters/
        ├── components/
        ├── design.md
        ├── media/
        └── theme/
```

Optionally, add a `skills/<your-pack-name>/SKILL.md` if you want a SKILL to load with the pack (rules for the agent, design philosophy, etc.):

```txt
your-pack-repo/
├── starter/document/...
└── skills/
    └── your-pack-name/
        └── SKILL.md
```

The cli runs `npx skills add <owner>/<repo>` after fetching the pack, so the SKILL files load automatically. Without `skills/`, the user just gets the starter content with no extra rules.

## Naming convention

For discoverability, use the prefix `openpress-pack-<short-name>` for your repo:

- `quan0715/openpress-pack-nycu-thesis` ✓
- `acme/openpress-pack-business-proposal` ✓
- `someone/my-thesis` ✗ (works but harder to find)

GitHub topic `openpress-pack` is also useful for indexing.

## Users install your pack like this

```bash
npx @open-press/cli init my-doc --pack github:<owner>/<repo>
# e.g.
npx @open-press/cli init my-thesis --pack github:quan0715/openpress-pack-nycu-thesis
```

For a specific branch / tag:

```bash
npx @open-press/cli init my-doc --pack github:owner/repo#v1.2
```

The cli:

1. Scaffolds the framework into `my-doc/`
2. Fetches `starter/document/` from your repo → `my-doc/document/`
3. Patches metadata (title, subtitle, author, organization)
4. Runs `npx skills add quan0715/open-press` (framework skills)
5. Runs `npx skills add <owner>/<repo>` (your pack's skills, if any)
6. Installs deps, git init

## Recommended workflow when building a pack

1. `npx @open-press/cli init prototype --pack editorial-monograph` (or claude-document) to get a working starting point.
2. Iterate on `prototype/document/theme/`, `components/`, `chapters/` until the design is what you want.
3. Copy the final `document/` into your pack repo's `starter/document/`.
4. Tag a release if you want to support `--pack github:.../...#tag`.
5. Test the pack from scratch: `npx @open-press/cli init /tmp/test --pack github:<your-owner>/<your-repo>`.

## License

Your pack is your own work; pick whatever license suits you. MIT keeps the chain clean and matches open-press itself.
