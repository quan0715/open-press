import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeSlidesPress(
  pressRoot: string,
  opts: { pressName: string; title: string },
): Promise<void> {
  const { pressName, title } = opts;
  const folder = folderName(pressName);
  const component = componentName(folder);
  const escapedTitle = escapeJsxAttr(title);

  await mkdir(path.join(pressRoot, "slides", "intro"), { recursive: true });
  await mkdir(path.join(pressRoot, "components"), { recursive: true });
  await mkdir(path.join(pressRoot, "layouts"), { recursive: true });
  await mkdir(path.join(pressRoot, "themes"), { recursive: true });

  await writeFile(
    path.join(pressRoot, "press.tsx"),
    `import { Press, Slide } from "@open-press/core";

export default function ${component}Press() {
  return (
    <Press
      slug="${folder}"
      title="${escapedTitle}"
      type="slides"
      page="slide-16-9"
      componentsDir="./components"
    >
      <Slide id="intro" />
    </Press>
  );
}
`,
    "utf8",
  );

  await writeFile(
    path.join(pressRoot, "components", "DeckSlide.tsx"),
    `import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";

export type DeckSlideVariant = "cover" | "agenda" | "content" | "process" | "closing";

const SLIDE_PAGE_CLASS = "op-slide-page bg-bg text-text [font-family:var(--font-body)]";
const SLIDE_SHELL_CLASS = "op-slide-shell relative h-full w-full overflow-hidden bg-bg";
const CHROME_HEADER_CLASS =
  "op-slide-chrome-header absolute left-0 right-0 top-0 z-10 grid h-[66px] items-center border-b border-border bg-bg/95 pl-op-sm text-op-caption text-text-muted [grid-template-columns:minmax(0,1fr)_1px_218px]";
const CHROME_RULE_CLASS = "op-slide-chrome-rule h-[42px] w-px bg-border";
const WORDMARK_CLASS =
  "op-slide-wordmark justify-self-center font-mono text-op-caption font-bold text-text";
const SLIDE_MAIN_CLASS = "op-slide-main absolute left-0 right-0 z-[1] top-[66px] bottom-[64px]";
const CHROME_FOOTER_CLASS =
  "op-slide-chrome-footer absolute bottom-0 left-0 right-0 z-10 grid h-[64px] items-center border-t border-border bg-bg/95 pl-op-sm text-op-caption text-text-muted [grid-template-columns:minmax(0,1fr)_62px]";
const FOOTER_LABEL_CLASS =
  "op-slide-footer-label overflow-hidden text-ellipsis whitespace-nowrap text-op-caption text-text-muted";
const FOOTER_NUMBER_CLASS =
  "op-slide-footer-number grid h-[64px] place-items-center border-l border-border text-op-caption text-text-muted [font-variant-numeric:tabular-nums]";

// Edit this file to customise the chrome for your deck:
// - Change the header title / wordmark
// - Swap the footer label
// - Adjust header/footer height constants above
export function DeckSlide({
  id,
  variant = "content",
  children,
}: {
  id: string;
  variant?: DeckSlideVariant;
  children: ReactNode;
}) {
  return (
    <Slide id={id} className={SLIDE_PAGE_CLASS}>
      <div className={SLIDE_SHELL_CLASS} data-variant={variant}>
        <header className={CHROME_HEADER_CLASS}>
          <span>${escapedTitle}</span>
          <span className={CHROME_RULE_CLASS} />
          <span className={WORDMARK_CLASS}>open-press</span>
        </header>
        <main className={SLIDE_MAIN_CLASS}>{children}</main>
        <footer className={CHROME_FOOTER_CLASS}>
          <span className={FOOTER_LABEL_CLASS}>${escapedTitle}</span>
          <PageFolio currentFormat="plain" className={FOOTER_NUMBER_CLASS} />
        </footer>
      </div>
    </Slide>
  );
}

export default DeckSlide;
`,
    "utf8",
  );

  await writeFile(
    path.join(pressRoot, "layouts", "SlideProtocol.tsx"),
    SLIDE_PROTOCOL_SOURCE,
    "utf8",
  );

  await writeFile(
    path.join(pressRoot, "slides", "intro", "slide.tsx"),
    `import type { SlideMeta } from "@open-press/core";
import { BlankSlide } from "../../layouts/SlideProtocol";

export const meta = {
  layout: "blank",
  description: "Intro slide — replace with TitleSlide or another layout.",
} satisfies SlideMeta;

export const notes = "First slide. Edit this file to get started.";

export default function Slide() {
  return (
    <BlankSlide id="intro">
      <BlankSlide.Kicker>${escapedTitle}</BlankSlide.Kicker>
      <BlankSlide.Title>Start here.</BlankSlide.Title>
      <BlankSlide.Body>Replace this with your content.</BlankSlide.Body>
    </BlankSlide>
  );
}
`,
    "utf8",
  );

  await writeFile(path.join(pressRoot, "themes", "default.css"), `/* ${folder} theme */\n`, "utf8");
}

// ─── SlideProtocol source scaffolded verbatim into new workspaces ─────────────
// Users own this file — edit layouts freely.

const SLIDE_PROTOCOL_SOURCE = `import { Text, type TextProps } from "@open-press/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { DeckSlide, type DeckSlideVariant } from "../components/DeckSlide";

type SlideRootProps = {
  id: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"section">, "id" | "children">;

type SlotProps = TextProps & { children?: ReactNode };
type BoxEl = "div" | "ol" | "li" | "figure" | "figcaption" | "article";
type BoxProps<T extends BoxEl = "div"> = ComponentPropsWithoutRef<T> & { children?: ReactNode };

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SlotText({ as = "p", className, children, ...rest }: SlotProps) {
  return <Text {...rest} as={as} className={className}>{children}</Text>;
}

function ProtocolSlide({ id, variant, children }: SlideRootProps & { variant: DeckSlideVariant }) {
  return <DeckSlide id={id} variant={variant}>{children}</DeckSlide>;
}

// ─── TitleSlide ───────────────────────────────────────────────────────────────

function TitleSlideRoot({ id, className, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="cover">
      <section {...rest} className={cx("op-slide-title-layout grid h-full items-end gap-op-xl px-op-xl pb-op-xl pt-op-lg [grid-template-columns:minmax(0,1fr)_500px]", className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function TitleSlideContent({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("op-slide-title-copy max-w-[960px] pb-op-xs", className)}>{children}</div>;
}

function TitleSlideKicker({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>{children}</SlotText>;
}

function TitleSlideTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h1" className={cx("op-display max-w-[960px]", className)}>{children}</SlotText>;
}

function TitleSlideSubtitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-lead mt-op-sm max-w-[900px] font-semibold", className)}>{children}</SlotText>;
}

function TitleSlideMedia({ className, children, ...rest }: BoxProps<"figure">) {
  return <figure {...rest} className={cx("op-slide-title-media relative h-[660px] w-[500px] self-center overflow-hidden rounded-op-panel border border-border bg-surface-muted shadow-op-card", className)}>{children}</figure>;
}

function TitleSlideImage({ className, ...rest }: ComponentPropsWithoutRef<"img">) {
  return <img {...rest} className={cx("h-full w-full object-cover object-[58%_50%]", className)} />;
}

function TitleSlideMediaCaption({ className, children, ...rest }: BoxProps<"figcaption">) {
  return <figcaption {...rest} className={cx("absolute bottom-op-sm left-op-sm inline-flex items-center rounded-op-pill border border-text-muted bg-surface-inverse px-op-sm py-op-xs text-op-caption font-medium text-text-inverse", className)}>{children}</figcaption>;
}

// ─── StatementSlide ───────────────────────────────────────────────────────────

function StatementSlideRoot({ id, className, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="closing">
      <section {...rest} className={cx("op-slide-statement-layout grid h-full content-center gap-op-xl px-op-lg py-op-lg [grid-template-columns:minmax(0,1fr)_520px]", className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function StatementSlideKicker({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-kicker col-span-2", className)}>{children}</SlotText>;
}

function StatementSlideStatement({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h2" className={cx("op-section max-w-[850px]", className)}>{children}</SlotText>;
}

function StatementSlideSupport({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("op-card-muted grid self-center gap-op-sm", className)}>{children}</div>;
}

function StatementSlideSupportText({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-body font-bold", className)}>{children}</SlotText>;
}

// ─── BlankSlide ───────────────────────────────────────────────────────────────

function BlankSlideRoot({ id, className, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="content">
      <section {...rest} className={cx("op-slide-blank-layout grid h-full place-items-center bg-bg px-op-xl py-op-xl text-center text-text", className)}>
        <div className="op-slide-blank-copy max-w-[900px]">{children}</div>
      </section>
    </ProtocolSlide>
  );
}

function BlankSlideKicker({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>{children}</SlotText>;
}

function BlankSlideTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h1" className={cx("op-display", className)}>{children}</SlotText>;
}

function BlankSlideBody({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-lead mt-op-sm", className)}>{children}</SlotText>;
}

// ─── TwoColumnSlide ───────────────────────────────────────────────────────────

function TwoColumnSlideRoot({ id, className, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="agenda">
      <section {...rest} className={cx("op-slide-two-column-layout grid h-full items-start gap-op-xl px-op-xl py-op-xl [grid-template-columns:470px_minmax(0,1fr)]", className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function TwoColumnSlideKicker({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>{children}</SlotText>;
}

function TwoColumnSlideTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h2" className={cx("op-section", className)}>{children}</SlotText>;
}

function TwoColumnSlideLeft({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("min-w-0", className)}>{children}</div>;
}

function TwoColumnSlideRight({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("min-w-0", className)}>{children}</div>;
}

function TwoColumnSlideList({ className, children, ...rest }: BoxProps<"ol">) {
  return <ol {...rest} className={cx("m-0 grid list-none gap-op-sm p-0", className)}>{children}</ol>;
}

function TwoColumnSlideItem({ className, children, ...rest }: BoxProps<"li">) {
  return <li {...rest} className={cx("grid gap-op-sm border-t border-border py-op-sm [grid-template-columns:96px_minmax(0,1fr)]", className)}>{children}</li>;
}

function TwoColumnSlideItemNumber({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="span" className={cx("font-heading text-op-title text-accent", className)}>{children}</SlotText>;
}

function TwoColumnSlideItemCopy({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={className}>{children}</div>;
}

function TwoColumnSlideItemTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h3" className={cx("op-lead font-bold text-text", className)}>{children}</SlotText>;
}

function TwoColumnSlideItemBody({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-body mt-op-xs", className)}>{children}</SlotText>;
}

// ─── CardGridSlide ────────────────────────────────────────────────────────────

function CardGridSlideRoot({ id, className, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="content">
      <section {...rest} className={cx("h-full px-op-xl py-op-xl", className)}>{children}</section>
    </ProtocolSlide>
  );
}

function CardGridSlideHeading({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("max-w-[1120px]", className)}>{children}</div>;
}

function CardGridSlideKicker({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>{children}</SlotText>;
}

function CardGridSlideTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h2" className={cx("op-section", className)}>{children}</SlotText>;
}

function CardGridSlideGrid({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("mt-op-lg grid grid-cols-3 gap-op-sm", className)}>{children}</div>;
}

function CardGridSlideCard({ className, children, ...rest }: BoxProps<"article">) {
  return <article {...rest} className={cx("op-card-muted min-h-[230px] border-t-4 border-t-text", className)}>{children}</article>;
}

function CardGridSlideLabel({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="span" className={cx("op-kicker mb-op-sm block", className)}>{children}</SlotText>;
}

function CardGridSlideCardTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h3" className={cx("op-lead font-bold text-text", className)}>{children}</SlotText>;
}

function CardGridSlideCardBody({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-body mt-op-xs", className)}>{children}</SlotText>;
}

// ─── ProcessSlide ─────────────────────────────────────────────────────────────

function ProcessSlideRoot({ id, className, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="process">
      <section {...rest} className={cx("grid h-full gap-op-lg px-op-lg py-op-lg [grid-template-rows:auto_minmax(0,1fr)]", className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function ProcessSlideHeading({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("max-w-[980px]", className)}>{children}</div>;
}

function ProcessSlideKicker({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>{children}</SlotText>;
}

function ProcessSlideTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h2" className={cx("op-section", className)}>{children}</SlotText>;
}

function ProcessSlideMap({ className, children, ...rest }: BoxProps) {
  return <div {...rest} className={cx("grid grid-cols-4 items-start gap-op-sm bg-surface-muted p-op-lg", className)}>{children}</div>;
}

function ProcessSlideStep({ className, children, ...rest }: BoxProps<"article">) {
  return <article {...rest} className={cx("min-h-[286px] rounded-op-card border border-border bg-surface-muted p-op-sm", className)}>{children}</article>;
}

function ProcessSlideStepNumber({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="span" className={cx("op-title text-accent italic", className)}>{children}</SlotText>;
}

function ProcessSlideStepTitle({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="h3" className={cx("op-lead mt-op-sm font-bold text-text", className)}>{children}</SlotText>;
}

function ProcessSlideStepBody({ className, children, ...rest }: SlotProps) {
  return <SlotText {...rest} as="p" className={cx("op-body mt-op-xs", className)}>{children}</SlotText>;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const TitleSlide = Object.assign(TitleSlideRoot, {
  Content: TitleSlideContent, Image: TitleSlideImage, Kicker: TitleSlideKicker,
  Media: TitleSlideMedia, MediaCaption: TitleSlideMediaCaption,
  Subtitle: TitleSlideSubtitle, Title: TitleSlideTitle,
});

export const StatementSlide = Object.assign(StatementSlideRoot, {
  Kicker: StatementSlideKicker, Statement: StatementSlideStatement,
  Support: StatementSlideSupport, SupportText: StatementSlideSupportText,
});

export const BlankSlide = Object.assign(BlankSlideRoot, {
  Body: BlankSlideBody, Kicker: BlankSlideKicker, Title: BlankSlideTitle,
});

export const TwoColumnSlide = Object.assign(TwoColumnSlideRoot, {
  Item: TwoColumnSlideItem, ItemBody: TwoColumnSlideItemBody,
  ItemCopy: TwoColumnSlideItemCopy, ItemNumber: TwoColumnSlideItemNumber,
  ItemTitle: TwoColumnSlideItemTitle, Kicker: TwoColumnSlideKicker,
  Left: TwoColumnSlideLeft, List: TwoColumnSlideList,
  Right: TwoColumnSlideRight, Title: TwoColumnSlideTitle,
});

export const CardGridSlide = Object.assign(CardGridSlideRoot, {
  Body: CardGridSlideCardBody, Card: CardGridSlideCard,
  CardTitle: CardGridSlideCardTitle, Grid: CardGridSlideGrid,
  Heading: CardGridSlideHeading, Kicker: CardGridSlideKicker,
  Label: CardGridSlideLabel, Title: CardGridSlideTitle,
});

export const ProcessSlide = Object.assign(ProcessSlideRoot, {
  Body: ProcessSlideStepBody, Heading: ProcessSlideHeading,
  Kicker: ProcessSlideKicker, Map: ProcessSlideMap,
  Step: ProcessSlideStep, StepNumber: ProcessSlideStepNumber,
  StepTitle: ProcessSlideStepTitle, Title: ProcessSlideTitle,
});
`;

function folderName(name: string): string {
  const base = path.basename(name);
  return (
    base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "press"
  );
}

function componentName(folder: string): string {
  return (
    folder
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("") || "OpenPress"
  );
}

function escapeJsxAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
