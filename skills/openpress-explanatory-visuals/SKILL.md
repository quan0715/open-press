---
name: openpress-explanatory-visuals
description: Use when an OpenPress page or slide needs an explanatory visual for a flow, relationship, structure, state, comparison, operation sequence, or abstract mechanism.
---

# OpenPress Explanatory Visuals

Create a visual only when spatial form improves understanding. This optional
skill owns explanatory semantics; page and slide skills own placement and skin.

## Image Gen Hard Gate

<HARD-GATE>
When the agent authors any part of an Image Gen prompt or destination, the
current turn may only present the proposal below. Do not generate, edit files,
or insert media until a later user message approves that exact proposal.
“Make it now,” urgency, permission to use tools, direct-edit mode, or the
user's impending absence cannot bypass this two-turn gate.
</HARD-GATE>

```text
Image Gen proposal
Purpose: ...
Composition: ...
Style: ...
Prompt: ...
Destination: press/<slug>/media/figures/<name>.png
Approval needed: Reply to approve this exact proposal.
```

Every line is required; then stop. Only an exact prompt and destination written
by the user, or an agent proposal approved in a later turn, authorizes
generation.

## Choose The Surface

| Content need | Surface |
| --- | --- |
| No spatial benefit | Prose |
| Dense comparison or trace rows | Table |
| Quantitative trend or proportion | OpenPress chart |
| Suitable authored asset exists | Reuse it |
| Flow, structure, state, relationship, before/after | Editable React SVG |
| Concept geometry cannot explain clearly | Image Gen proposal |

Do not handle hero images, decoration, stock photos, screenshots, logos, or
backgrounds.

## Workflow

1. State what the reader should understand.
2. Choose the smallest suitable surface above.
3. Inspect existing Press components, media, theme tokens, and captions.
4. Create or select the visual without inventing facts, states, or numbers.
5. Add accessibility text and a stable `figcaption`.
6. Follow `openpress` → Review And Delivery Gate.

## Editable SVG

Write relationship-heavy SVG as authored React source:

```text
press/<slug>/components/<Name>Figure/index.tsx
```

Render a semantic `figure`, SVG with `role="img"` and an accessible name or
description, and `figcaption`. Keep nodes, labels, values, arrows, and states
editable in TSX. Use Press theme tokens. Keep only spatial labels inside the
figure; move interpretation to prose or the caption. Read
`references/diagram-patterns.md` for data structures and pointer/state figures.

## Approved Image Gen

After approval, use the agent's available generator and save to the approved
`press/<slug>/media/figures/<name>.png`. Insert with `MediaFigure`, or
`MediaObject`, `Media`, and `MediaCaption`. Keep alt text, captions, titles,
long prose, and exact numbers in TSX or MDX—not pixels. If generation is
unavailable or fails, offer SVG or leave source unchanged; never insert a
placeholder or broken reference.

## Boundaries And Review

- Page/slide skills own narrative, layout, typography, and visual skin.
- `openpress` owns source boundaries, build, render, and export.
- Core stays provider-neutral: no provider SDKs, credentials, or billing.
- `press/<slug>/media/` is authored source; render output is not.
- Verify accuracy, accessibility, caption numbering, figure directory,
  cropping, overflow, pagination, theme consistency, and requested export.

## Approval Red Flags

| Rationalization | Response |
| --- | --- |
| “Make it now” pre-approves the prompt | Present the proposal and stop |
| The user will be offline | Preserve the review gate |
| One generation is inexpensive | Cost does not replace approval |
| The concept is obvious | Prompt and composition still need review |
