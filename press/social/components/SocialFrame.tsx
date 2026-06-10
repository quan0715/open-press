import { Frame } from "@open-press/core";
import type { ReactNode } from "react";

const SOCIAL_FRAME_CLASS =
  "reader-page--social-test bg-white text-[#08090a] [--social-paper:#ffffff] [--social-paper-2:#f7f8f8] [--social-paper-3:#eff3f8] [--social-ink:#08090a] [--social-muted:#6f7378] [--social-line:rgb(8_9_10_/_10%)] [--social-line-strong:rgb(8_9_10_/_18%)] [--social-accent:#0047ff] [--social-accent-soft:#eef4ff]";

const MAGAZINE_CLASS =
  "relative grid h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-[var(--social-paper)] px-[86px] pb-[62px] pt-[78px] text-[var(--social-ink)] [font-family:var(--openpress-font-serif)]";

const HEADER_CLASS =
  "relative z-[2] flex min-h-[36px] items-center gap-[15px] text-[16px] uppercase tracking-[0.14em] text-[var(--social-muted)] [font-family:var(--openpress-font-mono)]";

const ISSUE_CLASS = "font-medium text-[var(--social-ink)]";
const DOT_CLASS = "h-[6px] w-[6px] rounded-full bg-[var(--social-accent)]";

const CONTENT_CLASS_BY_VARIANT = {
  cover: "relative z-[2] grid min-h-0 grid-cols-[minmax(0,1fr)] content-start items-start gap-[44px] pb-[54px] pt-[54px]",
  model: "relative z-[2] grid min-h-0 grid-cols-[minmax(0,1fr)] content-center gap-[34px] py-[52px] pb-[54px]",
  workflow: "relative z-[2] grid min-h-0 grid-cols-[minmax(0,1fr)] content-center gap-[36px] py-[52px] pb-[54px]",
} as const;

const FOOTER_CLASS =
  "relative z-[2] flex justify-between gap-[24px] border-t border-[var(--social-line-strong)] pt-[18px] text-[16px] uppercase tracking-[0.12em] text-[var(--social-muted)] [font-family:var(--openpress-font-mono)]";

const COVER_ART_CLASS =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[560px] bg-[url('/openpress/media/social-cover-collage.png')] bg-cover bg-bottom bg-center";

export function SocialFrame({
  frameKey,
  variant,
  chip,
  meta,
  children,
}: {
  frameKey: string;
  variant: "cover" | "model" | "workflow";
  chip: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <Frame
      frameKey={frameKey}
      role="canvas.card"
      chrome={false}
      className={SOCIAL_FRAME_CLASS}
      data-page-title={chip}
    >
      <div className={MAGAZINE_CLASS}>
        {variant === "cover" ? <div className={COVER_ART_CLASS} aria-hidden="true" /> : null}
        <header className={HEADER_CLASS}>
          <span className={ISSUE_CLASS}>OpenPress</span>
          <span className={DOT_CLASS} aria-hidden="true" />
          <span>{meta}</span>
        </header>
        <main className={CONTENT_CLASS_BY_VARIANT[variant]}>{children}</main>
        <footer className={FOOTER_CLASS}>
          <span>{chip}</span>
          <span>hello.openpress</span>
        </footer>
      </div>
    </Frame>
  );
}

export default SocialFrame;
