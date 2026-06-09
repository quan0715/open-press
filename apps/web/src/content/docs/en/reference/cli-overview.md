---
title: "CLI overview"
eyebrow: "@open-press/cli"
description: "The CLI is organized in three tiers — Lifecycle (the everyday build loop), Output targets (PDF / image / deploy), and Tools (utilities for agents and the workbench)."
---
<p>
    OpenPress splits workspace bootstrap and local expansion: <code>npm create @open-press</code>
    creates a workspace, <code>open-press create</code> adds another Press, and
    <code>open-press &lt;command&gt;</code> (plus matching <code>npm run</code> scripts) runs the
    day-to-day workflow from inside a workspace.
  </p>

  <div class="callout">
    <strong>Surface stability.</strong> Tier&nbsp;1 + Tier&nbsp;2 commands are part of the 1.0 contract.
    Tier&nbsp;3 tools are implemented for agents and the workbench; use them through the documented
    command names and npm scripts.
  </div>

  <div class="cli-grid">
    <a class="cli-card" href="/docs/concepts/cli-lifecycle">
      <p class="cli-card__eyebrow">Tier 1</p>
      <h3>Lifecycle</h3>
      <p>The everyday loop. <code>create</code>, <code>dev</code>, <code>build</code>, <code>preview</code>, <code>typecheck</code> — same shape as Vite or Astro.</p>
    </a>

    <a class="cli-card" href="/docs/reference/cli-outputs">
      <p class="cli-card__eyebrow">Tier 2</p>
      <h3>Output targets</h3>
      <p>Producing artifacts other than the standard HTML bundle. <code>openpress:pdf</code>, <code>openpress:image</code>, and <code>openpress:deploy</code>.</p>
    </a>

    <a class="cli-card" href="/docs/reference/cli-tools">
      <p class="cli-card__eyebrow">Tier 3</p>
      <h3>Tools</h3>
      <p>Utilities for AI agents and the workbench — <code>search</code>, <code>replace</code>, <code>inspect</code>, <code>doctor</code>, <code>upgrade</code>, and <code>skills:sync</code>.</p>
    </a>
  </div>

  <h2>How to read each page</h2>

  <ul>
    <li>
      Every command is rendered as an <strong>API entry</strong> with kind badge, invocation form,
      a one-line summary, a props table for flags, and an example.
    </li>
    <li>
      Where a command's invocation differs between <code>open-press</code> and the bundled
      <code>npm run</code> alias, the <em>import line</em> uses whichever form is more natural for that
      command.
    </li>
    <li>
      If a command or adapter is not listed here, agents should report the boundary instead of
      inventing a hidden CLI surface.
    </li>
  </ul>


<style>
  .cli-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--op-space-4);
    margin: var(--op-space-6) 0 var(--op-space-8);
  }
  .cli-card {
    display: grid;
    gap: 0.4rem;
    padding: var(--op-space-5);
    border: 1px solid var(--op-hairline);
    border-radius: 6px;
    background: var(--op-surface);
    color: var(--op-ink);
    text-decoration: none;
    transition:
      border-color 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
  }
  .cli-card:hover {
    border-color: var(--op-accent);
    transform: translateY(-1px);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--op-ink) 6%, transparent);
  }
  .cli-card__eyebrow {
    margin: 0;
    color: var(--op-subdued);
    font-family: var(--op-font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cli-card h3 {
    margin: 0;
    font-family: var(--op-font-body);
    font-size: var(--op-text-lg);
    font-weight: 600;
    color: var(--op-ink-strong);
  }
  .cli-card p {
    margin: 0;
    color: var(--op-subdued-strong);
    font-size: var(--op-text-sm);
    line-height: 1.5;
  }
  .cli-card p code {
    padding: 0.06em 0.3em;
    border-radius: 3px;
    background: color-mix(in srgb, var(--op-ink) 7%, transparent);
    font-family: var(--op-font-mono);
    font-size: 0.85em;
  }
</style>
