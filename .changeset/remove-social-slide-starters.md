---
"@open-press/cli": major
---

Remove the bundled `social-post` and `slide-deck` starter-bearing skills from the framework repo. Social-card projects should install the external skill instead:

```bash
npx -y skills@latest add quan0715/openpress-social-card-skill
```

The external social-card skill targets 1080x1350 (4:5 portrait), not the removed 1080x1080 square starter. There is no direct `slide-deck` replacement; initialize an OpenPress workspace without a removed pack name and edit the Press tree manually or use a dedicated external skill. Existing workspaces are unaffected.
