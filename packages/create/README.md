# @open-press/create

Bootstrap a new OpenPress workspace.

```bash
npm create @open-press my-report -- --type pages
cd my-report
npm run dev
```

Choose either scaffold:

```bash
npm create @open-press my-report -- --type pages
npm create @open-press my-deck -- --type slides
```

This package writes the workspace `package.json`, `openpress/settings.json`, `.gitignore`, and a minimal Press under `press/<name>/`. Pages start as an editable A4 MDX document in `chapters/`; slides use the folder-per-slide contract. It can install dependencies, sync OpenPress skills, and initialize git unless those steps are skipped with flags.
