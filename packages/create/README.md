# @open-press/create

Bootstrap a new OpenPress workspace.

```bash
npm create @open-press my-deck -- --type slides
cd my-deck
npm run dev
```

This package writes the workspace `package.json`, `.gitignore`, and a minimal folder-per-slide Press under `press/<name>/`. It can install dependencies, sync OpenPress skills, and initialize git unless those steps are skipped with flags. The scaffold uses the OpenPress 2.0 slides folder contract and Tailwind-ready runtime.

Page-based scaffolding is intentionally handled by the OpenPress skills layer. The create package keeps the installable workspace bootstrap small and delegates richer document structure to agents that can read the current skills.
