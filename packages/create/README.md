# @open-press/create

Bootstrap a new OpenPress workspace.

```bash
npm create @open-press my-deck -- --type slides
cd my-deck
npm run dev
```

This package writes the workspace `package.json`, `.gitignore`, and a minimal folder-per-slide Press under `press/<name>/`. It can install dependencies, sync OpenPress skills, and initialize git unless those steps are skipped with flags.

Pages scaffolding is not supported in this v1 create surface.
