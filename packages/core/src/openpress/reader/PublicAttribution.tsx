import { isLocalWorkspaceHost } from "../shared";

const PUBLIC_ATTRIBUTION_CLASS = [
  "openpress-public-attribution inline-flex w-fit items-center gap-1.5 text-[10px] leading-none",
  "font-medium tracking-[0.045em] text-[var(--op-workspace-text-muted)] no-underline",
  "transition-colors hover:text-[var(--op-workspace-text-soft)] focus-visible:text-[var(--op-workspace-accent)]",
].join(" ");

export function PublicAttribution({ className = "" }: { className?: string }) {
  if (typeof window === "undefined" || isLocalWorkspaceHost(window.location.hostname)) return null;

  return (
    <a
      className={`${PUBLIC_ATTRIBUTION_CLASS} ${className}`.trim()}
      data-openpress-attribution
      href="https://open-press.dev"
      target="_blank"
      rel="noreferrer"
      aria-label="Built with open-press"
    >
      <span>Built with</span>
      <strong className="font-semibold tracking-[0.02em] text-[var(--op-workspace-text-soft)]">open-press</strong>
      <span aria-hidden="true">↗</span>
    </a>
  );
}
