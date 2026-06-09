import { Text, type TextProps } from "../core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { DeckSlide, type DeckSlideVariant } from "./DeckSlide";

type SlideRootProps = {
  id: string;
  children: ReactNode;
  title?: string;
  brand?: string;
  footerLabel?: string;
} & Omit<ComponentPropsWithoutRef<"section">, "id" | "children">;

type SlotProps = TextProps & {
  children?: ReactNode;
};

type BoxEl = "div" | "ol" | "li" | "figure" | "figcaption" | "article";
type BoxProps<T extends BoxEl = "div"> = ComponentPropsWithoutRef<T> & {
  children?: ReactNode;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const TITLE_LAYOUT_CLASS =
  "op-slide-title-layout grid h-full items-end gap-op-xl px-op-xl pb-op-xl pt-op-lg [grid-template-columns:minmax(0,1fr)_500px]";
const TITLE_COPY_CLASS = "op-slide-title-copy max-w-[960px] pb-op-xs";
const TITLE_MEDIA_CLASS =
  "op-slide-title-media relative h-[660px] w-[500px] self-center overflow-hidden rounded-op-panel border border-border bg-surface-muted shadow-op-card";
const TITLE_MEDIA_IMAGE_CLASS = "h-full w-full object-cover object-[58%_50%]";
const TITLE_MEDIA_CAPTION_CLASS =
  "op-slide-title-media-caption absolute bottom-op-sm left-op-sm inline-flex items-center rounded-op-pill border border-text-muted bg-surface-inverse px-op-sm py-op-xs text-op-caption font-medium text-text-inverse";
const TWO_COLUMN_LAYOUT_CLASS =
  "op-slide-two-column-layout grid h-full items-start gap-op-xl px-op-xl py-op-xl [grid-template-columns:470px_minmax(0,1fr)]";
const TWO_COLUMN_LIST_CLASS =
  "op-slide-two-column-list m-0 grid list-none gap-op-sm p-0";
const TWO_COLUMN_LIST_ITEM_CLASS =
  "op-slide-two-column-list-item grid gap-op-sm border-t border-border py-op-sm [grid-template-columns:96px_minmax(0,1fr)]";
const TWO_COLUMN_ITEM_NUMBER_CLASS =
  "op-slide-two-column-item-number font-heading text-op-title text-accent";
const STATEMENT_LAYOUT_CLASS =
  "op-slide-statement-layout grid h-full content-center gap-op-xl px-op-lg py-op-lg [grid-template-columns:minmax(0,1fr)_520px]";
const BLANK_LAYOUT_CLASS =
  "op-slide-blank-layout grid h-full place-items-center bg-bg px-op-xl py-op-xl text-center text-text";
const BLANK_COPY_CLASS = "op-slide-blank-copy max-w-[900px]";
const CARD_GRID_LAYOUT_CLASS = "op-slide-card-grid-layout h-full px-op-xl py-op-xl";
const CARD_GRID_HEADING_CLASS = "op-slide-card-grid-heading max-w-[1120px]";
const CARD_GRID_CLASS = "op-slide-card-grid mt-op-lg grid grid-cols-3 gap-op-sm";
const PROCESS_LAYOUT_CLASS =
  "op-slide-process-layout grid h-full gap-op-lg px-op-lg py-op-lg [grid-template-rows:auto_minmax(0,1fr)]";
const PROCESS_HEADING_CLASS = "op-slide-process-heading max-w-[980px]";
const PROCESS_MAP_CLASS =
  "op-slide-process-map grid grid-cols-4 items-start gap-op-sm bg-surface-muted p-op-lg";
const PROCESS_STEP_CLASS =
  "op-slide-process-step min-h-[286px] rounded-op-card border border-border bg-surface-muted p-op-sm shadow-op-none";

function SlotText({ as = "p", className, children, ...rest }: SlotProps) {
  return (
    <Text {...rest} as={as} className={className}>
      {children}
    </Text>
  );
}

function ProtocolSlide({
  id,
  variant,
  title,
  brand,
  footerLabel,
  children,
}: SlideRootProps & { variant: DeckSlideVariant }) {
  return (
    <DeckSlide id={id} variant={variant} title={title} brand={brand} footerLabel={footerLabel}>
      {children}
    </DeckSlide>
  );
}

// ─── TitleSlide ───────────────────────────────────────────────────────────────

function TitleSlideRoot({ id, className, title, brand, footerLabel, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="cover" title={title} brand={brand} footerLabel={footerLabel}>
      <section {...rest} className={cx(TITLE_LAYOUT_CLASS, className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function TitleSlideContent({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx(TITLE_COPY_CLASS, className)}>
      {children}
    </div>
  );
}

function TitleSlideTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h1" className={cx("op-display max-w-[960px]", className)}>
      {children}
    </SlotText>
  );
}

function TitleSlideSubtitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-lead mt-op-sm max-w-[900px] font-semibold", className)}>
      {children}
    </SlotText>
  );
}

function TitleSlideKicker({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>
      {children}
    </SlotText>
  );
}

function TitleSlideMedia({ className, children, ...rest }: BoxProps<"figure">) {
  return (
    <figure {...rest} className={cx(TITLE_MEDIA_CLASS, className)}>
      {children}
    </figure>
  );
}

function TitleSlideImage({ className, ...rest }: ComponentPropsWithoutRef<"img">) {
  return <img {...rest} className={cx(TITLE_MEDIA_IMAGE_CLASS, className)} />;
}

function TitleSlideMediaCaption({ className, children, ...rest }: BoxProps<"figcaption">) {
  return (
    <figcaption {...rest} className={cx(TITLE_MEDIA_CAPTION_CLASS, className)}>
      {children}
    </figcaption>
  );
}

// ─── StatementSlide ───────────────────────────────────────────────────────────

function StatementSlideRoot({ id, className, title, brand, footerLabel, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="closing" title={title} brand={brand} footerLabel={footerLabel}>
      <section {...rest} className={cx(STATEMENT_LAYOUT_CLASS, className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function StatementSlideStatement({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h2" className={cx("op-section max-w-[850px]", className)}>
      {children}
    </SlotText>
  );
}

function StatementSlideKicker({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-kicker col-span-2", className)}>
      {children}
    </SlotText>
  );
}

function StatementSlideSupport({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx("op-card-muted grid self-center gap-op-sm", className)}>
      {children}
    </div>
  );
}

function StatementSlideSupportText({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-body font-bold", className)}>
      {children}
    </SlotText>
  );
}

// ─── BlankSlide ───────────────────────────────────────────────────────────────

function BlankSlideRoot({ id, className, title, brand, footerLabel, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="content" title={title} brand={brand} footerLabel={footerLabel}>
      <section {...rest} className={cx(BLANK_LAYOUT_CLASS, className)}>
        <div className={BLANK_COPY_CLASS}>{children}</div>
      </section>
    </ProtocolSlide>
  );
}

function BlankSlideKicker({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>
      {children}
    </SlotText>
  );
}

function BlankSlideTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h1" className={cx("op-display", className)}>
      {children}
    </SlotText>
  );
}

function BlankSlideBody({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-lead mt-op-sm", className)}>
      {children}
    </SlotText>
  );
}

// ─── TwoColumnSlide ───────────────────────────────────────────────────────────

function TwoColumnSlideRoot({ id, className, title, brand, footerLabel, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="agenda" title={title} brand={brand} footerLabel={footerLabel}>
      <section {...rest} className={cx(TWO_COLUMN_LAYOUT_CLASS, className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function TwoColumnSlideTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h2" className={cx("op-section", className)}>
      {children}
    </SlotText>
  );
}

function TwoColumnSlideKicker({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>
      {children}
    </SlotText>
  );
}

function TwoColumnSlideLeft({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx("min-w-0", className)}>
      {children}
    </div>
  );
}

function TwoColumnSlideRight({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx("min-w-0", className)}>
      {children}
    </div>
  );
}

function TwoColumnSlideList({ className, children, ...rest }: BoxProps<"ol">) {
  return (
    <ol {...rest} className={cx(TWO_COLUMN_LIST_CLASS, className)}>
      {children}
    </ol>
  );
}

function TwoColumnSlideItem({ className, children, ...rest }: BoxProps<"li">) {
  return (
    <li {...rest} className={cx(TWO_COLUMN_LIST_ITEM_CLASS, className)}>
      {children}
    </li>
  );
}

function TwoColumnSlideItemNumber({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="span" className={cx(TWO_COLUMN_ITEM_NUMBER_CLASS, className)}>
      {children}
    </SlotText>
  );
}

function TwoColumnSlideItemCopy({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={className}>
      {children}
    </div>
  );
}

function TwoColumnSlideItemTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h3" className={cx("op-lead font-bold text-text", className)}>
      {children}
    </SlotText>
  );
}

function TwoColumnSlideItemBody({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-body mt-op-xs", className)}>
      {children}
    </SlotText>
  );
}

// ─── CardGridSlide ────────────────────────────────────────────────────────────

function CardGridSlideRoot({ id, className, title, brand, footerLabel, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="content" title={title} brand={brand} footerLabel={footerLabel}>
      <section {...rest} className={cx(CARD_GRID_LAYOUT_CLASS, className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function CardGridSlideHeading({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx(CARD_GRID_HEADING_CLASS, className)}>
      {children}
    </div>
  );
}

function CardGridSlideKicker({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>
      {children}
    </SlotText>
  );
}

function CardGridSlideTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h2" className={cx("op-section", className)}>
      {children}
    </SlotText>
  );
}

function CardGridSlideGrid({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx(CARD_GRID_CLASS, className)}>
      {children}
    </div>
  );
}

function CardGridSlideCard({ className, children, ...rest }: BoxProps<"article">) {
  return (
    <article
      {...rest}
      className={cx("op-card-muted min-h-[230px] border-t-4 border-t-text", className)}
    >
      {children}
    </article>
  );
}

function CardGridSlideLabel({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="span" className={cx("op-kicker mb-op-sm block", className)}>
      {children}
    </SlotText>
  );
}

function CardGridSlideCardTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h3" className={cx("op-lead font-bold text-text", className)}>
      {children}
    </SlotText>
  );
}

function CardGridSlideCardBody({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-body mt-op-xs", className)}>
      {children}
    </SlotText>
  );
}

// ─── ProcessSlide ─────────────────────────────────────────────────────────────

function ProcessSlideRoot({ id, className, title, brand, footerLabel, children, ...rest }: SlideRootProps) {
  return (
    <ProtocolSlide id={id} variant="process" title={title} brand={brand} footerLabel={footerLabel}>
      <section {...rest} className={cx(PROCESS_LAYOUT_CLASS, className)}>
        {children}
      </section>
    </ProtocolSlide>
  );
}

function ProcessSlideHeading({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx(PROCESS_HEADING_CLASS, className)}>
      {children}
    </div>
  );
}

function ProcessSlideKicker({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-kicker mb-op-sm", className)}>
      {children}
    </SlotText>
  );
}

function ProcessSlideTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h2" className={cx("op-section", className)}>
      {children}
    </SlotText>
  );
}

function ProcessSlideMap({ className, children, ...rest }: BoxProps) {
  return (
    <div {...rest} className={cx(PROCESS_MAP_CLASS, className)}>
      {children}
    </div>
  );
}

function ProcessSlideStep({ className, children, ...rest }: BoxProps<"article">) {
  return (
    <article {...rest} className={cx(PROCESS_STEP_CLASS, className)}>
      {children}
    </article>
  );
}

function ProcessSlideStepNumber({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="span" className={cx("op-title text-accent italic", className)}>
      {children}
    </SlotText>
  );
}

function ProcessSlideStepTitle({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="h3" className={cx("op-lead mt-op-sm font-bold text-text", className)}>
      {children}
    </SlotText>
  );
}

function ProcessSlideStepBody({ className, children, ...rest }: SlotProps) {
  return (
    <SlotText {...rest} as="p" className={cx("op-body mt-op-xs", className)}>
      {children}
    </SlotText>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const TitleSlide = Object.assign(TitleSlideRoot, {
  Content: TitleSlideContent,
  Image: TitleSlideImage,
  Kicker: TitleSlideKicker,
  Media: TitleSlideMedia,
  MediaCaption: TitleSlideMediaCaption,
  Subtitle: TitleSlideSubtitle,
  Title: TitleSlideTitle,
});

export const StatementSlide = Object.assign(StatementSlideRoot, {
  Kicker: StatementSlideKicker,
  Statement: StatementSlideStatement,
  Support: StatementSlideSupport,
  SupportText: StatementSlideSupportText,
});

export const BlankSlide = Object.assign(BlankSlideRoot, {
  Body: BlankSlideBody,
  Kicker: BlankSlideKicker,
  Title: BlankSlideTitle,
});

export const TwoColumnSlide = Object.assign(TwoColumnSlideRoot, {
  Item: TwoColumnSlideItem,
  ItemBody: TwoColumnSlideItemBody,
  ItemCopy: TwoColumnSlideItemCopy,
  ItemNumber: TwoColumnSlideItemNumber,
  ItemTitle: TwoColumnSlideItemTitle,
  Kicker: TwoColumnSlideKicker,
  Left: TwoColumnSlideLeft,
  List: TwoColumnSlideList,
  Right: TwoColumnSlideRight,
  Title: TwoColumnSlideTitle,
});

export const CardGridSlide = Object.assign(CardGridSlideRoot, {
  Body: CardGridSlideCardBody,
  Card: CardGridSlideCard,
  CardTitle: CardGridSlideCardTitle,
  Grid: CardGridSlideGrid,
  Heading: CardGridSlideHeading,
  Kicker: CardGridSlideKicker,
  Label: CardGridSlideLabel,
  Title: CardGridSlideTitle,
});

export const ProcessSlide = Object.assign(ProcessSlideRoot, {
  Body: ProcessSlideStepBody,
  Heading: ProcessSlideHeading,
  Kicker: ProcessSlideKicker,
  Map: ProcessSlideMap,
  Step: ProcessSlideStep,
  StepNumber: ProcessSlideStepNumber,
  StepTitle: ProcessSlideStepTitle,
  Title: ProcessSlideTitle,
});
