import { ExternalLink } from "lucide-react";
import { Button } from "@/openpress/ui/button";
import { TOOLBAR_ACTION_CLASS, TOOLBAR_ACTION_LABEL_CLASS } from "../toolbarClasses";

export interface ReaderPreviewControlProps {
  pressSlug?: string | null;
}

export function ReaderPreviewControl({ pressSlug }: ReaderPreviewControlProps) {
  const previewUrl = typeof window === "undefined"
    ? undefined
    : resolveReaderPreviewUrl(window.location, pressSlug);
  const label = previewUrl ? "以公開閱讀模式預覽目前內容" : "目前沒有可預覽的 Press";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={`${TOOLBAR_ACTION_CLASS} disabled:!cursor-not-allowed`}
      data-openpress-reader-preview
      data-openpress-toolbar-active="false"
      disabled={!previewUrl}
      onClick={() => previewUrl && window.open(previewUrl, "_blank", "noopener,noreferrer")}
      title={label}
      aria-label={label}
    >
      <ExternalLink aria-hidden="true" />
      <span className={TOOLBAR_ACTION_LABEL_CLASS}>Reader preview</span>
    </Button>
  );
}

export function resolveReaderPreviewUrl(
  location: Pick<Location, "origin" | "hash">,
  pressSlug: string | null | undefined,
): string | undefined {
  const normalizedPressSlug = pressSlug?.trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedPressSlug) return undefined;

  try {
    const encodedSlug = normalizedPressSlug
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const url = new URL(`/${encodedSlug}/preview`, location.origin);
    url.searchParams.set("reader", "1");
    url.hash = location.hash;
    return url.toString();
  } catch {
    return undefined;
  }
}
