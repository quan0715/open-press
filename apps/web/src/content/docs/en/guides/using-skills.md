---
title: "Skills"
eyebrow: "AI agent integration"
description: "OpenPress exposes the substrate to agents through built-in skills, while external creative skills own intake, taste, examples, starter files, and domain judgment."
---
<div class="callout">
    <strong>Boundary.</strong> OpenPress does not fetch starters, resolve skill layouts, or run a
    template marketplace. Agents install or read skills, then copy or adapt skill-owned
    starter/examples into an OpenPress workspace.
  </div>

  <h2>OpenPress operational skills</h2>

  <div class="skills-grid">
    <article class="skills-card">
      <p class="skills-card__eyebrow">System</p>
      <h3>openpress</h3>
      <p>Shared operating contract: CLI usage, source/generated boundaries, validation, export, upgrade, and owner routing.</p>
    </article>

    <a class="skills-card" href="/docs/guides/create-pages">
      <p class="skills-card__eyebrow">Create</p>
      <h3>openpress-create-pages</h3>
      <p>Create page-based artifacts: workspace bootstrap when needed, MDX source layout, page components, and first theme.</p>
    </a>

    <a class="skills-card" href="/docs/guides/create-slides">
      <p class="skills-card__eyebrow">Create</p>
      <h3>openpress-create-slide</h3>
      <p>Create slide decks: slide Press Tree, DeckSlide, slide layouts, reusable UI primitives, deck structure, assets, and first theme.</p>
    </a>

    <a class="skills-card" href="/docs/guides/apply-comments">
      <p class="skills-card__eyebrow">Review</p>
      <h3>/apply-comments</h3>
      <p>Walk pending <code>@openpress-comment</code> markers, apply edits, remove the markers.</p>
    </a>

    <article class="skills-card">
      <p class="skills-card__eyebrow">Deploy</p>
      <h3>openpress-deploy</h3>
      <p>Prepare deploy config, run dry-run, and publish only after explicit confirmation naming the target project.</p>
    </article>
  </div>

  <h2>Portable helpers</h2>

  <div class="skills-grid">
    <article class="skills-card">
      <p class="skills-card__eyebrow">Writing</p>
      <h3>content helpers</h3>
      <p>Teaching notes, Traditional Chinese polish, and diagram semantics load under the active creation skill.</p>
    </article>
  </div>

  <h2>Starter-bearing skills</h2>

  <p>
    Starter-bearing skills are still normal skills. Their <code>starter/</code> files are material
    for agents to inspect, copy, and adapt. They do not modify OpenPress runtime behavior.
  </p>

  <div class="skills-grid">
    <article class="skills-card">
      <p class="skills-card__eyebrow">Long form</p>
      <h3>editorial-monograph</h3>
      <p>A4 proposals, reports, whitepapers, product specs, and long-form editorial documents.</p>
    </article>

    <article class="skills-card">
      <p class="skills-card__eyebrow">Working document</p>
      <h3>claude-document</h3>
      <p>Warm A4 notes, briefs, specs, research summaries, and learning material.</p>
    </article>

    <article class="skills-card">
      <p class="skills-card__eyebrow">Academic</p>
      <h3>academic-paper</h3>
      <p>Research papers, conference-style articles, abstracts, references, and numbered sections.</p>
    </article>
  </div>

  <h2>External creative skills</h2>

  <p>
    External creative skills own taste, intake, visual recipes, image strategy, examples, and
    starter files. OpenPress owns the fixed page runtime, visible workspace, source management,
    rendering, validation, and output commands.
  </p>

  <div class="skills-grid">
    <article class="skills-card skills-card--wide">
      <p class="skills-card__eyebrow">Social card</p>
      <h3>openpress-social-card-skill</h3>
      <p>
        Installs through <code>npx -y skills@latest add quan0715/openpress-social-card-skill</code>.
        The skill guides the agent to install OpenPress packages, then copies or adapts its own
        social-card starter into the workspace.
      </p>
    </article>
  </div>


<style>
  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--op-space-4);
    margin: var(--op-space-2) 0 var(--op-space-8);
  }
  .skills-card {
    display: grid;
    gap: 0.4rem;
    padding: var(--op-space-5);
    border: 1px solid var(--op-hairline);
    border-radius: 6px;
    background: var(--op-surface);
    color: var(--op-ink);
    text-decoration: none;
    min-width: 0;
    transition:
      border-color 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
  }
  .skills-card:hover {
    border-color: var(--op-accent);
    transform: translateY(-1px);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--op-ink) 6%, transparent);
  }
  .skills-card__eyebrow {
    margin: 0;
    color: var(--op-subdued);
    font-family: var(--op-font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .skills-card h3 {
    margin: 0;
    font-family: var(--op-font-mono);
    font-size: var(--op-text-lg);
    font-weight: 600;
    color: var(--op-ink-strong);
  }
  .skills-card p {
    margin: 0;
    color: var(--op-subdued-strong);
    font-size: var(--op-text-sm);
    line-height: 1.5;
  }
  .skills-card p code {
    padding: 0.06em 0.3em;
    border-radius: 3px;
    background: color-mix(in srgb, var(--op-ink) 7%, transparent);
    font-family: var(--op-font-mono);
    font-size: 0.85em;
  }
  .skills-card--wide {
    grid-column: 1 / -1;
  }
</style>
