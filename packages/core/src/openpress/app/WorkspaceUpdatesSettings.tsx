import { useState } from "react";
import {
  Check,
  Copy,
  RefreshCw,
} from "lucide-react";
import { cn } from "../core/cn";
import { useToast } from "../shared";
import type { WorkspaceUpdatesInfo } from "./workspaceUpdatesModel";

const SETTINGS_MAIN_CLASS = "openpress-workspace-settings mx-auto grid w-full max-w-[760px] content-start gap-9 py-1";
const SETTINGS_HEADER_CLASS = "grid gap-2 border-b border-[var(--op-workspace-border)] pb-5";
const SETTINGS_EYEBROW_CLASS = "m-0 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--op-workspace-text-muted)]";
const SETTINGS_TITLE_CLASS = "m-0 text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--op-workspace-text)]";
const SETTINGS_DESCRIPTION_CLASS = "m-0 max-w-[580px] text-[0.82rem] leading-relaxed text-[var(--op-workspace-text-muted)]";

interface Props {
  updates: WorkspaceUpdatesInfo | null;
}

export function WorkspaceUpdatesSettings({ updates }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { showToast } = useToast();

  const copyPrompt = (key: string, promptText?: string) => {
    if (!promptText || typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(promptText).then(() => {
      setCopiedKey(key);
      showToast("Prompt copied. Paste it into Claude or Codex to continue.");
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2200);
    });
  };

  if (!updates) {
    return <UpdatesSettingsSkeleton />;
  }

  const { openpress, builtInSkills, plugins } = updates;

  return (
    <section
      className={SETTINGS_MAIN_CLASS}
      aria-labelledby="workspace-updates-heading"
      data-openpress-workspace-updates
    >
      {/* Header */}
      <header className={SETTINGS_HEADER_CLASS}>
        <p className={SETTINGS_EYEBROW_CLASS}>
          Capability & Updates
        </p>
        <h2 id="workspace-updates-heading" className={SETTINGS_TITLE_CLASS}>
          Updates & Agent Handoff
        </h2>
        <p className={SETTINGS_DESCRIPTION_CLASS}>
          Local capability status only. Copy a prompt and continue the update with Claude or Codex.
        </p>
      </header>

      <div className="grid gap-8">
        {/* 1. OpenPress Core Section */}
        <div
          className="grid gap-3 border-b border-[var(--op-workspace-border-muted)] pb-6"
          data-openpress-updates-core
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="m-0 text-[0.92rem] font-semibold text-[var(--op-workspace-text)]">
              OpenPress Core
            </h3>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.86rem] font-medium text-[var(--op-workspace-text)]">
                  @open-press/core
                </span>
                <span className="font-mono text-[0.66rem] uppercase text-[var(--op-workspace-text-muted)] opacity-80">
                  · FRAMEWORK
                </span>
              </div>
              <p className="m-0 pt-1 text-[0.76rem] leading-relaxed text-[var(--op-workspace-text-muted)]">
                OpenPress runtime, rendering engine, and workspace settings system.
              </p>
              <p className="m-0 pt-0.5 font-mono text-[0.68rem] text-[var(--op-workspace-text-muted)] opacity-70">
                {openpress.isLocalDev
                  ? "Source: local monorepo development"
                  : openpress.coreVersion
                  ? `Current version: v${openpress.coreVersion}`
                  : "Current version: package not detected"}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              {openpress.isLocalDev ? (
                <span className="inline-flex items-center gap-1 font-mono text-[0.66rem] text-[var(--op-workspace-accent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--op-workspace-accent)]" />
                  Local Source
                </span>
              ) : openpress.prompts.update ? (
                <button
                  type="button"
                  className="inline-flex h-7.5 items-center gap-1.5 rounded-[var(--op-workspace-radius-sm,6px)] border border-[var(--op-workspace-border-muted)] bg-transparent px-3 text-[0.72rem] font-medium text-[var(--op-workspace-text)] transition-colors hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]"
                  onClick={() => copyPrompt("core-update", openpress.prompts.update)}
                  data-openpress-copy-core-update
                >
                  {copiedKey === "core-update" ? (
                    <>
                      <Check className="h-3 w-3 text-[var(--op-workspace-accent)]" />
                      <span className="text-[var(--op-workspace-accent)]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 opacity-60" />
                      <span>Copy update prompt</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* 2. Built-in Skills Section (Unified with Plugins layout) */}
        <div
          className="grid gap-3 border-b border-[var(--op-workspace-border-muted)] pb-6"
          data-openpress-updates-builtin
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-[0.92rem] font-semibold text-[var(--op-workspace-text)]">
                Built-in Skills
              </h3>
              <span className="font-mono text-[0.72rem] text-[var(--op-workspace-text-muted)]">
                ({builtInSkills.installedCount}/{builtInSkills.expected.length})
              </span>
              {builtInSkills.missing.length === 0 ? (
                <span className="font-mono text-[0.7rem] text-[var(--op-workspace-accent)]">
                  ✓ All installed
                </span>
              ) : (
                <span className="font-mono text-[0.7rem] text-[var(--op-workspace-danger,#e05252)]">
                  {builtInSkills.missing.length} missing
                </span>
              )}
            </div>

            {builtInSkills.prompts.sync && (
              <button
                type="button"
                className="inline-flex h-7.5 items-center gap-1.5 rounded-[var(--op-workspace-radius-sm,6px)] border border-[var(--op-workspace-border-muted)] bg-transparent px-3 text-[0.72rem] font-medium text-[var(--op-workspace-text)] transition-colors hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]"
                onClick={() => copyPrompt("builtin-sync", builtInSkills.prompts.sync)}
                data-openpress-copy-builtin-sync
              >
                {copiedKey === "builtin-sync" ? (
                  <>
                    <Check className="h-3 w-3 text-[var(--op-workspace-accent)]" />
                    <span className="text-[var(--op-workspace-accent)]">Copied</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 opacity-60" />
                    <span>Copy sync prompt</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Unified Flat Rows for Built-in Skills */}
          <div className="grid gap-1 pt-1">
            {(builtInSkills.items || []).map((skill) => {
              const syncKey = `sync-${skill.name}`;

              return (
                <div
                  key={skill.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-[var(--op-workspace-border-muted)] py-3.5 last:border-b-0"
                  data-openpress-builtin-skill-row={skill.name}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.86rem] font-medium text-[var(--op-workspace-text)]">
                        {skill.displayName}
                      </span>
                      <span className="font-mono text-[0.7rem] text-[var(--op-workspace-text-muted)]">
                        ({skill.name})
                      </span>
                      <span className="font-mono text-[0.66rem] uppercase text-[var(--op-workspace-text-muted)] opacity-80">
                        · CORE
                      </span>
                    </div>

                    <p className="m-0 pt-1 text-[0.76rem] leading-relaxed text-[var(--op-workspace-text-muted)]">
                      {skill.description}
                    </p>

                    <p className="m-0 pt-0.5 font-mono text-[0.68rem] text-[var(--op-workspace-text-muted)] opacity-70">
                      Path: .agents/skills/{skill.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    {skill.isInstalled ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[0.66rem] text-[var(--op-workspace-accent)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--op-workspace-accent)]" />
                        Ready
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-7.5 items-center gap-1.5 rounded-[var(--op-workspace-radius-sm,6px)] border border-[var(--op-workspace-border-muted)] bg-transparent px-3 text-[0.72rem] font-medium text-[var(--op-workspace-text)] transition-colors hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]"
                        onClick={() => copyPrompt(syncKey, builtInSkills.prompts.sync)}
                      >
                        {copiedKey === syncKey ? (
                          <>
                            <Check className="h-3 w-3 text-[var(--op-workspace-accent)]" />
                            <span className="text-[var(--op-workspace-accent)]">Copied</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 opacity-60" />
                            <span>Copy sync prompt</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Companion Plugins Section */}
        <div
          className="grid gap-3"
          data-openpress-updates-plugins
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-[0.92rem] font-semibold text-[var(--op-workspace-text)]">
                Companion Plugins
              </h3>
              <span className="font-mono text-[0.72rem] text-[var(--op-workspace-text-muted)]">
                ({plugins.installedCount}/{plugins.totalCatalogCount})
              </span>
            </div>

            {plugins.installedCount > 0 && plugins.prompts.updateAll && (
              <button
                type="button"
                className="inline-flex h-7.5 items-center gap-1.5 rounded-[var(--op-workspace-radius-sm,6px)] border border-[var(--op-workspace-border-muted)] bg-transparent px-3 text-[0.72rem] font-medium text-[var(--op-workspace-text)] transition-colors hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]"
                onClick={() => copyPrompt("plugins-all", plugins.prompts.updateAll)}
                data-openpress-copy-plugins-all
              >
                {copiedKey === "plugins-all" ? (
                  <>
                    <Check className="h-3 w-3 text-[var(--op-workspace-accent)]" />
                    <span className="text-[var(--op-workspace-accent)]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 opacity-60" />
                    <span>Copy all update prompts</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Unified Flat Rows for Plugins */}
          <div className="grid gap-1 pt-1">
            {plugins.items.map((plugin) => {
              const checkKey = `check-${plugin.name}`;
              const updateKey = `update-${plugin.name}`;

              return (
                <div
                  key={plugin.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-[var(--op-workspace-border-muted)] py-3.5 last:border-b-0"
                  data-openpress-plugin-row={plugin.name}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.86rem] font-medium text-[var(--op-workspace-text)]">
                        {plugin.displayName}
                      </span>
                      <span className="font-mono text-[0.7rem] text-[var(--op-workspace-text-muted)]">
                        ({plugin.name})
                      </span>
                      <span className="font-mono text-[0.66rem] uppercase text-[var(--op-workspace-text-muted)] opacity-80">
                        · {plugin.category}
                      </span>
                    </div>

                    <p className="m-0 pt-1 text-[0.76rem] leading-relaxed text-[var(--op-workspace-text-muted)]">
                      {plugin.description}
                    </p>

                    <p className="m-0 pt-0.5 font-mono text-[0.68rem] text-[var(--op-workspace-text-muted)] opacity-70">
                      Source: {plugin.source}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    {plugin.isInstalled ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex h-7.5 items-center gap-1.5 rounded-[var(--op-workspace-radius-sm,6px)] border border-[var(--op-workspace-border-muted)] bg-transparent px-3 text-[0.72rem] font-medium text-[var(--op-workspace-text)] transition-colors hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]"
                          onClick={() => copyPrompt(checkKey, plugin.prompts.check)}
                          data-openpress-copy-plugin-check={plugin.name}
                        >
                          {copiedKey === checkKey ? (
                            <>
                              <Check className="h-3 w-3 text-[var(--op-workspace-accent)]" />
                              <span className="text-[var(--op-workspace-accent)]">Copied</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 opacity-60" />
                              <span>Copy check prompt</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7.5 items-center gap-1.5 rounded-[var(--op-workspace-radius-sm,6px)] border border-[var(--op-workspace-border-muted)] bg-transparent px-3 text-[0.72rem] font-medium text-[var(--op-workspace-text)] transition-colors hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]"
                          onClick={() => copyPrompt(updateKey, plugin.prompts.update)}
                          data-openpress-copy-plugin-update={plugin.name}
                        >
                          {copiedKey === updateKey ? (
                            <>
                              <Check className="h-3 w-3 text-[var(--op-workspace-accent)]" />
                              <span className="text-[var(--op-workspace-accent)]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 opacity-60" />
                              <span>Copy update prompt</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="font-mono text-[0.66rem] text-[var(--op-workspace-text-muted)]">
                        Not installed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function UpdatesSettingsSkeleton() {
  return (
    <section
      className={cn(SETTINGS_MAIN_CLASS, "animate-pulse")}
      aria-hidden="true"
    >
      {/* Header Skeleton */}
      <div className={SETTINGS_HEADER_CLASS}>
        <div className="h-2.5 w-28 rounded bg-[var(--op-workspace-surface-hover)]" />
        <div className="h-6 w-52 rounded bg-[var(--op-workspace-surface-hover)]" />
        <div className="h-3.5 w-80 max-w-full rounded bg-[var(--op-workspace-surface-hover)]" />
      </div>

      <div className="grid gap-8">
        {/* Core Row Skeleton */}
        <div className="grid gap-3 border-b border-[var(--op-workspace-border-muted)] pb-6">
          <div className="h-4 w-32 rounded bg-[var(--op-workspace-surface-hover)]" />
          <div className="flex items-center justify-between py-2">
            <div className="grid gap-1.5">
              <div className="h-3.5 w-40 rounded bg-[var(--op-workspace-surface-hover)]" />
              <div className="h-3 w-64 rounded bg-[var(--op-workspace-surface-hover)]" />
            </div>
            <div className="h-7 w-20 rounded bg-[var(--op-workspace-surface-hover)]" />
          </div>
        </div>

        {/* Built-in Skills Skeleton */}
        <div className="grid gap-3 border-b border-[var(--op-workspace-border-muted)] pb-6">
          <div className="h-4 w-36 rounded bg-[var(--op-workspace-surface-hover)]" />
          <div className="grid gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--op-workspace-border-muted)] py-3.5 last:border-b-0">
                <div className="grid gap-1.5">
                  <div className="h-3.5 w-44 rounded bg-[var(--op-workspace-surface-hover)]" />
                  <div className="h-3 w-64 rounded bg-[var(--op-workspace-surface-hover)]" />
                </div>
                <div className="h-4 w-12 rounded bg-[var(--op-workspace-surface-hover)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Plugins Skeleton */}
        <div className="grid gap-3">
          <div className="h-4 w-40 rounded bg-[var(--op-workspace-surface-hover)]" />
          <div className="grid gap-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--op-workspace-border-muted)] py-3.5 last:border-b-0">
                <div className="grid gap-1.5">
                  <div className="h-3.5 w-44 rounded bg-[var(--op-workspace-surface-hover)]" />
                  <div className="h-3 w-64 rounded bg-[var(--op-workspace-surface-hover)]" />
                </div>
                <div className="h-7.5 w-28 rounded bg-[var(--op-workspace-surface-hover)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
