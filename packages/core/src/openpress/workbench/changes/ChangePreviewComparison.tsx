import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefCallback,
  type CSSProperties,
} from "react";
import {
  getObjectEntityMap,
  getSourceBlockMap,
  type HtmlPageBlock,
  type ReaderDocument,
  type SourceBlock,
  type SourceLocation,
} from "../../document-model";
import { PageHtmlContent } from "../../reader/PublicReaderPage";
import {
  PUBLIC_HTML_PAGE_CLASS,
  PUBLIC_HTML_PAGE_HTML_CLASS,
  PUBLIC_READER_PAGES_CLASS,
} from "../../reader/publicViewerClasses";
import { cn } from "../../core/cn";
import { groupSourceBlocksByPath } from "../inspector";
import type {
  ChangeProposal,
  ChangeProposalDecision,
  ChangeProposalFeedback,
} from "./changePreviewModel";
import { ChangeReviewDock } from "./ChangeReviewDock";

const COMPARISON_SPREAD_CLASS = "![grid-template-columns:repeat(2,calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1)))] !gap-x-6 !gap-y-12";
const COMPARISON_STACK_CLASS = "![grid-template-columns:calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1))] !gap-y-12";
const COMPARISON_ROOT_CLASS = [
  "openpress-change-comparison relative pb-28",
  "[&_[data-openpress-change-tone=before]]:[box-shadow:-3px_0_0_rgb(184_62_55_/_0.88),0_0_0_1px_rgb(184_62_55_/_0.34)]",
  "[&_[data-openpress-change-tone=before]]:![background-color:rgb(184_62_55_/_0.09)]",
  "[&_[data-openpress-change-tone=after]]:[box-shadow:-3px_0_0_rgb(35_128_88_/_0.92),0_0_0_1px_rgb(35_128_88_/_0.34)]",
  "[&_[data-openpress-change-tone=after]]:![background-color:rgb(35_128_88_/_0.09)]",
  "[&_[data-openpress-change-tone=before][data-openpress-change-active=true]]:![box-shadow:-4px_0_0_rgb(184_62_55),0_0_0_2px_rgb(255_255_255_/_0.72),0_12px_30px_rgb(0_0_0_/_0.12)]",
  "[&_[data-openpress-change-tone=after][data-openpress-change-active=true]]:![box-shadow:-4px_0_0_rgb(35_128_88),0_0_0_2px_rgb(255_255_255_/_0.72),0_12px_30px_rgb(0_0_0_/_0.12)]",
].join(" ");
const PAGE_WRAPPER_CLASS = `${PUBLIC_HTML_PAGE_CLASS} relative`;
const PAGE_LABEL_CLASS = "pointer-events-none absolute -top-6 left-0 z-20 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]";
const CURRENT_LABEL_CLASS = `${PAGE_LABEL_CLASS} text-[rgb(205_92_82)]`;
const PROPOSED_LABEL_CLASS = `${PAGE_LABEL_CLASS} text-[rgb(80_179_128)]`;
const CURRENT_RAIL_CLASS = "pointer-events-none absolute inset-0 z-10 border-l-[3px] border-[rgb(184_62_55_/_0.72)]";
const PROPOSED_RAIL_CLASS = "pointer-events-none absolute inset-0 z-10 border-l-[3px] border-[rgb(35_128_88_/_0.76)]";
const EMPTY_PAGE_CLASS = "grid h-full place-items-center border border-dashed border-[var(--op-workspace-border)] bg-[var(--op-workspace-surface-muted)] font-mono text-[11px] text-[var(--op-workspace-text-muted)]";
const CHANGE_MARKER_WRAPPER_CLASS = "openpress-change-marker pointer-events-auto absolute z-[120]";
const CHANGE_MARKER_BUTTON_CLASS = "grid h-[22px] w-[22px] cursor-pointer place-items-center rounded-[6px] border border-[rgb(80_179_128)] bg-[rgb(29_31_30)] p-0 font-mono text-[10px] font-extrabold leading-none text-[rgb(125_214_166)] shadow-[0_8px_20px_rgb(0_0_0_/_0.22)] transition-[transform,background-color,border-color,color,box-shadow] duration-150 hover:-translate-y-px hover:bg-[rgb(35_128_88_/_0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(80_179_128)]";
const CHANGE_MARKER_CURRENT_CLASS = "!border-[rgb(205_92_82)] !text-[rgb(230_135_126)]";
const CHANGE_MARKER_ACTIVE_CLASS = "scale-115 !ring-2 !ring-white/80 !shadow-[0_10px_28px_rgb(0_0_0_/_0.4)]";
const CHANGE_MARKER_FEEDBACK_CLASS: Record<ChangeProposalDecision, string> = {
  accept: "!border-[rgb(80_179_128)] !bg-[rgb(35_128_88)] !text-white !shadow-[0_8px_24px_rgb(35_128_88_/_0.34)]",
  reject: "!border-[rgb(221_101_91)] !bg-[rgb(184_62_55)] !text-white !shadow-[0_8px_24px_rgb(184_62_55_/_0.34)]",
  "more-info": "!border-[rgb(224_177_88)] !bg-[rgb(177_121_33)] !text-white !shadow-[0_8px_24px_rgb(177_121_33_/_0.34)]",
};
const NARROW_COMPARISON_QUERY = "(max-width: 820px)";

type ChangeReviewSide = "current" | "proposed";

interface ChangeIntent {
  proposalIndex: number;
  proposal: ChangeProposal;
  note: string;
  reviewSides: ChangeReviewSide[];
}

interface ChangeSourceTarget {
  attribute: "data-openpress-block-id" | "data-openpress-object-id";
  id: string;
  path: string;
  pageIndex?: number;
  source?: SourceLocation;
}

interface AffectedChangeTarget {
  target: ChangeSourceTarget;
  proposalIndex: number;
}

export function useChangeComparisonStacked(active: boolean) {
  const [stacked, setStacked] = useState(() => active && isNarrowComparisonViewport());
  useEffect(() => {
    if (!active || typeof window === "undefined") {
      setStacked(false);
      return undefined;
    }
    const media = window.matchMedia(NARROW_COMPARISON_QUERY);
    const sync = () => setStacked(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [active]);
  return stacked;
}

export function ChangePreviewComparison({
  currentDocument,
  documentStyle,
  currentPages,
  proposedDocument,
  proposals,
  currentPageIndex,
  sourceBlocksByPath,
  sourceContainerRef,
  registerPage,
  onFeedbackChange,
  stacked,
}: {
  currentDocument: ReaderDocument;
  documentStyle?: CSSProperties;
  currentPages: HtmlPageBlock[];
  proposedDocument: ReaderDocument;
  proposals: ChangeProposal[];
  currentPageIndex: number;
  sourceBlocksByPath: Record<string, SourceBlock[]>;
  sourceContainerRef: Ref<HTMLDivElement>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
  onFeedbackChange: (proposal: ChangeProposal, feedback?: ChangeProposalFeedback) => Promise<void>;
  stacked: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeProposalIndex, setActiveProposalIndex] = useState(0);

  const proposedPages = proposedDocument.blocks;
  const proposedSourceBlocksByPath = useMemo(
    () => groupSourceBlocksByPath(getSourceBlockMap(proposedDocument)),
    [proposedDocument],
  );
  const currentSourceTargets = useMemo(
    () => collectSourceTargets(currentDocument, sourceBlocksByPath),
    [currentDocument, sourceBlocksByPath],
  );
  const proposedSourceTargets = useMemo(
    () => collectSourceTargets(proposedDocument, proposedSourceBlocksByPath),
    [proposedDocument, proposedSourceBlocksByPath],
  );
  const currentAffectedTargets = useMemo(
    () => collectAffectedTargets(proposals, currentSourceTargets, "before"),
    [currentSourceTargets, proposals],
  );
  const proposedAffectedTargets = useMemo(
    () => collectAffectedTargets(proposals, proposedSourceTargets, "after"),
    [proposals, proposedSourceTargets],
  );
  const changeIntents = useMemo(
    () => collectChangeIntents(proposals, currentAffectedTargets, proposedAffectedTargets),
    [currentAffectedTargets, proposals, proposedAffectedTargets],
  );
  const pageCount = Math.max(currentPages.length, proposedPages.length);

  const setRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    assignRef(sourceContainerRef, node);
  }, [sourceContainerRef]);

  // Keep activeProposalIndex bounded
  useEffect(() => {
    if (proposals.length === 0) {
      setActiveProposalIndex(0);
    } else if (activeProposalIndex >= proposals.length) {
      setActiveProposalIndex(proposals.length - 1);
    }
  }, [proposals.length, activeProposalIndex]);

  const scrollToProposal = useCallback((proposalIndex: number) => {
    const root = rootRef.current;
    if (!root) return;
    const label = String(proposalIndex + 1);
    const target = root.querySelector<HTMLElement>(
      `[data-openpress-change-proposed="true"] [data-openpress-change-labels~="${label}"], [data-openpress-change-current="true"] [data-openpress-change-labels~="${label}"], [data-openpress-change-proposal-index="${proposalIndex}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSelectProposal = useCallback((index: number) => {
    setActiveProposalIndex(index);
    scrollToProposal(index);
  }, [scrollToProposal]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    clearChangeTones(root);
    markAffectedTargets(root, "current", "before", currentAffectedTargets);
    markAffectedTargets(root, "proposed", "after", proposedAffectedTargets);
    syncFocusedProposal(root, activeProposalIndex);

    let frame = 0;
    const syncMarkerPositions = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => positionChangeIntentMarkers(root));
    };
    syncMarkerPositions();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(syncMarkerPositions) : null;
    observer?.observe(root);
    window.addEventListener("resize", syncMarkerPositions);
    window.addEventListener("scroll", syncMarkerPositions, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", syncMarkerPositions);
      window.removeEventListener("scroll", syncMarkerPositions, true);
      clearChangeTones(root);
    };
  }, [activeProposalIndex, currentAffectedTargets, proposedAffectedTargets]);

  return (
    <div
      ref={setRoot}
      className={cn(
        PUBLIC_READER_PAGES_CLASS,
        COMPARISON_ROOT_CLASS,
        stacked ? COMPARISON_STACK_CLASS : COMPARISON_SPREAD_CLASS,
      )}
      data-openpress-public-page="true"
      data-openpress-change-comparison="true"
      data-openpress-change-comparison-layout={stacked ? "stack" : "spread"}
      data-openpress-change-focused-proposal={activeProposalIndex}
    >
      {Array.from({ length: pageCount }, (_, pageIndex) => {
        const currentPage = currentPages[pageIndex];
        const proposedPage = proposedPages[pageIndex];
        return (
          <ChangePagePair
            key={`change-page-pair:${pageIndex}`}
            pageIndex={pageIndex}
            currentPageIndex={currentPageIndex}
            currentPage={currentPage}
            proposedPage={proposedPage}
            documentStyle={documentStyle}
            registerPage={registerPage}
          />
        );
      })}
      {changeIntents.map((intent) => (
        <ChangeIntentMarker
          key={`${intent.proposalIndex}:${intent.proposal.path}:${intent.proposal.before}`}
          intent={intent}
          isActive={activeProposalIndex === intent.proposalIndex}
          onSelect={() => handleSelectProposal(intent.proposalIndex)}
        />
      ))}

      {proposals.length > 0 && (
        <ChangeReviewDock
          proposals={proposals}
          activeProposalIndex={activeProposalIndex}
          onSelectProposal={handleSelectProposal}
          onFeedbackChange={onFeedbackChange}
        />
      )}
    </div>
  );
}

function ChangePagePair({
  pageIndex,
  currentPageIndex,
  currentPage,
  proposedPage,
  documentStyle,
  registerPage,
}: {
  pageIndex: number;
  currentPageIndex: number;
  currentPage?: HtmlPageBlock;
  proposedPage?: HtmlPageBlock;
  documentStyle?: CSSProperties;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
}) {
  const pageNumber = pageIndex + 1;
  return (
    <>
      <div
        ref={registerPage(pageIndex)}
        id={`page-${String(pageNumber).padStart(2, "0")}`}
        className={PAGE_WRAPPER_CLASS}
        data-openpress-page-index={pageIndex}
        data-openpress-active={currentPageIndex === pageIndex ? "true" : "false"}
        data-openpress-change-current="true"
      >
        <span className={CURRENT_LABEL_CLASS} aria-hidden="true">− Current · {pageNumber}</span>
        <span className={CURRENT_RAIL_CLASS} aria-hidden="true" />
        {currentPage
          ? <PageHtmlContent html={currentPage.html} className={PUBLIC_HTML_PAGE_HTML_CLASS} style={documentStyle} />
          : <div className={EMPTY_PAGE_CLASS}>No current page</div>}
      </div>
      <div
        className={PAGE_WRAPPER_CLASS}
        data-openpress-change-proposed="true"
        aria-label={`Proposed page ${pageNumber}`}
      >
        <span className={PROPOSED_LABEL_CLASS} aria-hidden="true">+ Proposed · {pageNumber}</span>
        <span className={PROPOSED_RAIL_CLASS} aria-hidden="true" />
        {proposedPage
          ? <PageHtmlContent html={proposedPage.html} className={PUBLIC_HTML_PAGE_HTML_CLASS} style={documentStyle} />
          : <div className={EMPTY_PAGE_CLASS}>Page removed</div>}
      </div>
    </>
  );
}

function ChangeIntentMarker({
  intent,
  isActive,
  onSelect,
}: {
  intent: ChangeIntent;
  isActive: boolean;
  onSelect: () => void;
}) {
  const markerNumber = intent.proposalIndex + 1;
  const decision = intent.proposal.feedback?.decision;

  return (
    <>
      {intent.reviewSides.map((reviewSide) => {
        const sideLabel = reviewSide === "current" ? "Current" : "Proposed";
        return (
          <div
            key={reviewSide}
            className={cn(CHANGE_MARKER_WRAPPER_CLASS, isActive && "!z-[130]")}
            data-openpress-change-marker-wrapper
            data-openpress-change-proposal-index={intent.proposalIndex}
            data-openpress-change-review-side={reviewSide}
            data-openpress-change-marker-active={isActive ? "true" : "false"}
          >
            <button
              type="button"
              className={cn(
                CHANGE_MARKER_BUTTON_CLASS,
                reviewSide === "current" && !decision && CHANGE_MARKER_CURRENT_CLASS,
                decision && CHANGE_MARKER_FEEDBACK_CLASS[decision],
                isActive && CHANGE_MARKER_ACTIVE_CLASS,
              )}
              title={`變更 ${markerNumber}: ${intent.note}`}
              aria-label={`變更 ${markerNumber} on ${sideLabel}: ${intent.note}`}
              aria-pressed={isActive}
              data-openpress-change-marker
              data-openpress-change-feedback={decision ?? (intent.proposal.feedback?.comment ? "comment" : undefined)}
              onClick={onSelect}
            >
              {markerNumber}
            </button>
          </div>
        );
      })}
    </>
  );
}

export function firstChangePageIndex(
  proposals: ChangeProposal[],
  sourceBlocksByPath: Record<string, SourceBlock[]>,
  document?: ReaderDocument,
) {
  const targets = collectAffectedTargets(
    proposals,
    collectSourceTargets(document, sourceBlocksByPath),
    "before",
  );
  const pageIndexes = targets
    .map(({ target }) => target.pageIndex)
    .filter((pageIndex): pageIndex is number => typeof pageIndex === "number");
  return pageIndexes.length ? Math.min(...pageIndexes) : null;
}

function collectSourceTargets(
  document: ReaderDocument | undefined,
  sourceBlocksByPath: Record<string, SourceBlock[]>,
) {
  const targets: ChangeSourceTarget[] = Object.values(sourceBlocksByPath).flatMap((blocks) => (
    blocks.map((block) => ({
      attribute: "data-openpress-block-id" as const,
      id: block.id,
      path: block.path,
      pageIndex: block.pageIndex,
      source: block.source,
    }))
  ));
  if (!document) return targets;

  const pageIndexByFrameKey = new Map<string, number>();
  document.blocks.forEach((block, pageIndex) => {
    if (block.frameKey) pageIndexByFrameKey.set(block.frameKey, pageIndex);
  });
  for (const entity of Object.values(getObjectEntityMap(document))) {
    if (entity.blockId || !entity.source?.path) continue;
    const source = entity.source.source ?? sourceLocationFromEditableSource(entity.source);
    if (!source) continue;
    targets.push({
      attribute: "data-openpress-object-id",
      id: entity.id,
      path: entity.source.path,
      pageIndex: entity.frameKey ? pageIndexByFrameKey.get(entity.frameKey) : undefined,
      source,
    });
  }
  return targets;
}

function sourceLocationFromEditableSource(source: { line?: number; column?: number }) {
  if (!source.line) return undefined;
  return { line: source.line, column: source.column ?? 1 };
}

function collectAffectedTargets(
  proposals: ChangeProposal[],
  sourceTargets: ChangeSourceTarget[],
  tone: "before" | "after",
) {
  const affected: AffectedChangeTarget[] = [];
  for (const proposal of proposals) {
    const startLine = tone === "before" ? proposal.line : proposal.afterLine;
    const endLine = tone === "before"
      ? proposal.endLine ?? proposal.line
      : proposal.afterEndLine ?? proposal.afterLine;
    if (!startLine || !endLine) continue;
    for (const target of sourceTargetsForPath(sourceTargets, proposal.path)) {
      const targetStart = target.source?.line;
      const targetEnd = target.source?.endLine ?? targetStart;
      if (!targetStart || !targetEnd || targetEnd < startLine || targetStart > endLine) continue;
      affected.push({ target, proposalIndex: proposal.index });
    }
  }
  return affected;
}

function collectChangeIntents(
  proposals: ChangeProposal[],
  currentAffected: AffectedChangeTarget[],
  proposedAffected: AffectedChangeTarget[],
) {
  const intents: ChangeIntent[] = [];
  for (const proposal of proposals) {
    const proposedTarget = proposedAffected.find((item) => item.proposalIndex === proposal.index);
    const currentTarget = currentAffected.find((item) => item.proposalIndex === proposal.index);
    const reviewSides: ChangeReviewSide[] = [
      ...(currentTarget ? ["current" as const] : []),
      ...(proposedTarget ? ["proposed" as const] : []),
    ];
    if (!reviewSides.length) continue;
    intents.push({
      proposalIndex: proposal.index,
      proposal,
      note: proposal.note?.trim() || "未提供改動意圖。",
      reviewSides,
    });
  }
  return intents;
}

function sourceTargetsForPath(sourceTargets: ChangeSourceTarget[], proposalPath: string) {
  const normalizedProposalPath = normalizeSourcePath(proposalPath);
  return sourceTargets.filter((target) => {
    const normalizedSourcePath = normalizeSourcePath(target.path);
    return normalizedSourcePath === normalizedProposalPath
      || normalizedProposalPath.endsWith(`/${normalizedSourcePath}`)
      || normalizedSourcePath.endsWith(`/${normalizedProposalPath}`);
  });
}

function markAffectedTargets(
  root: HTMLElement,
  side: "current" | "proposed",
  tone: "before" | "after",
  affected: AffectedChangeTarget[],
) {
  for (const { target, proposalIndex } of affected) {
    const elements = Array.from(root.querySelectorAll<HTMLElement>(
      `[data-openpress-change-${side}="true"] [${target.attribute}="${cssEscape(target.id)}"]`,
    )).filter((element) => (
      target.attribute !== "data-openpress-block-id"
      || !element.parentElement?.closest(`[data-openpress-block-id="${cssEscape(target.id)}"]`)
    ));
    for (const element of elements) {
      element.dataset.openpressChangeTone = tone;
      const labels = new Set((element.dataset.openpressChangeLabels ?? "").split(" ").filter(Boolean));
      labels.add(String(proposalIndex + 1));
      element.dataset.openpressChangeLabels = Array.from(labels).join(" ");
    }
  }
}

function clearChangeTones(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-openpress-change-tone]").forEach((element) => {
    delete element.dataset.openpressChangeTone;
    delete element.dataset.openpressChangeLabels;
    delete element.dataset.openpressChangeActive;
  });
}

function syncFocusedProposal(root: HTMLElement, proposalIndex: number | null) {
  root.querySelectorAll<HTMLElement>("[data-openpress-change-active]").forEach((element) => {
    delete element.dataset.openpressChangeActive;
  });
  if (proposalIndex === null) return;
  root.querySelectorAll<HTMLElement>(
    `[data-openpress-change-labels~="${proposalIndex + 1}"]`,
  ).forEach((element) => {
    element.dataset.openpressChangeActive = "true";
  });
}

function positionChangeIntentMarkers(root: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  root.querySelectorAll<HTMLElement>("[data-openpress-change-marker-wrapper]").forEach((wrapper) => {
    const proposalIndex = Number(wrapper.dataset.openpressChangeProposalIndex);
    if (!Number.isInteger(proposalIndex)) return;
    const reviewSide = wrapper.dataset.openpressChangeReviewSide;
    if (reviewSide !== "current" && reviewSide !== "proposed") return;
    const label = String(proposalIndex + 1);
    const target = root.querySelector<HTMLElement>(
      `[data-openpress-change-${reviewSide}="true"] [data-openpress-change-labels~="${label}"]`,
    );
    if (!target) return;
    const targetRect = target.getBoundingClientRect();
    const page = target.closest<HTMLElement>(`[data-openpress-change-${reviewSide}="true"]`);
    const pageRect = page?.getBoundingClientRect();
    if (!pageRect) return;
    const markerLeft = reviewSide === "current"
      ? pageRect.right - rootRect.left - 28
      : pageRect.left - rootRect.left + 6;
    const targetLabels = (target.dataset.openpressChangeLabels ?? "").split(" ").filter(Boolean);
    const markerOffset = Math.max(targetLabels.indexOf(label), 0) * 26;
    wrapper.style.left = `${Math.round(markerLeft)}px`;
    wrapper.style.top = `${Math.round(targetRect.top - rootRect.top + 2 + markerOffset)}px`;
  });
}

function normalizeSourcePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/^document\//, "");
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function assignRef<T>(ref: Ref<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function isNarrowComparisonViewport() {
  return typeof window !== "undefined" && window.matchMedia(NARROW_COMPARISON_QUERY).matches;
}
