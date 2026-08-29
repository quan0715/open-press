---
"@open-press/core": patch
---

Resolve `@fig-*` and `@tbl-*` prose references from stable figure and table IDs, using the same localized caption numbering as rendered output. Reject missing, duplicate, or mismatched targets and preserve a single table anchor across paginated continuations.
