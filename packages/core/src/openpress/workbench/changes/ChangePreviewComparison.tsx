import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefCallback,
} from "react";
import { Check, MessageCircleQuestion, X, type LucideIcon } from "lucide-react";
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

const COMPARISON_SPREAD_CLASS = "![grid-template-columns:repeat(2,calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1)))] !gap-x-6 !gap-y-12";
const COMPARISON_STACK_CLASS = "![grid-template-columns:calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1))] !gap-y-12";
const COMPARISON_ROOT_CLASS = [
  "openpress-change-comparison relative",
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
const CHANGE_MARKER_BUTTON_CLASS = "grid h-[22px] w-[22px] cursor-pointer place-items-center rounded-[6px] border border-[rgb(80_179_128)] bg-[rgb(29_31_30)] p-0 font-mono text-[10px] font-extrabold leading-none text-[rgb(125_214_166)] shadow-[0_8px_20px_rgb(0_0_0_/_0.22)] transition-[transform,background-color,border-color,color,box-shadow] duration-150 hover:-translate-y-px hover:bg-[rgb(35_128_88_/_0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(80_179_128)] aria-expanded:scale-110 aria-expanded:bg-[rgb(35_128_88)] aria-expanded:text-white";
const CHANGE_MARKER_CURRENT_CLASS = "!border-[rgb(205_92_82)] !text-[rgb(230_135_126)] aria-expanded:!bg-[rgb(184_62_55)] aria-expanded:!text-white";
const CHANGE_MARKER_FEEDBACK_CLASS: Record<ChangeProposalDecision, string> = {
  accept: "!border-[rgb(80_179_128)] !bg-[rgb(35_128_88)] !text-white !shadow-[0_8px_24px_rgb(35_128_88_/_0.34)]",
  reject: "!border-[rgb(221_101_91)] !bg-[rgb(184_62_55)] !text-white !shadow-[0_8px_24px_rgb(184_62_55_/_0.34)]",
  "more-info": "!border-[rgb(224_177_88)] !bg-[rgb(177_121_33)] !text-white !shadow-[0_8px_24px_rgb(177_121_33_/_0.34)]",
};
const CHANGE_POPOVER_CLASS = "fixed z-[140] w-[min(320px,calc(100vw-24px))] rounded-2xl border border-[rgb(80_179_128_/_0.34)] bg-[rgb(36_37_37_/_0.98)] p-3.5 text-left text-[rgb(245_247_246_/_0.92)] shadow-[0_20px_54px_rgb(0_0_0_/_0.38)] transition-[border-color,box-shadow] duration-150";
const CHANGE_POPOVER_FEEDBACK_CLASS: Record<ChangeProposalDecision, string> = {
  accept: "!border-[rgb(80_179_128_/_0.78)] !shadow-[0_20px_54px_rgb(0_0_0_/_0.38),0_0_0_1px_rgb(80_179_128_/_0.16)]",
  reject: "!border-[rgb(221_101_91_/_0.78)] !shadow-[0_20px_54px_rgb(0_0_0_/_0.38),0_0_0_1px_rgb(221_101_91_/_0.16)]",
  "more-info": "!border-[rgb(224_177_88_/_0.78)] !shadow-[0_20px_54px_rgb(0_0_0_/_0.38),0_0_0_1px_rgb(224_177_88_/_0.16)]",
};
const CHANGE_POPOVER_LABEL_CLASS = "font-mono text-[9px] font-bold uppercase leading-none tracking-[0.12em] text-[rgb(80_179_128)]";
const CHANGE_POPOVER_LABEL_FEEDBACK_CLASS: Record<ChangeProposalDecision, string> = {
  accept: "!text-[rgb(125_214_166)]",
  reject: "!text-[rgb(236_143_135)]",
  "more-info": "!text-[rgb(238_197_119)]",
};
const CHANGE_POPOVER_NOTE_CLASS = "mt-2 text-[13px] font-medium leading-[1.48]";
const CHANGE_FEEDBACK_CHOICES: Array<{
  decision: ChangeProposalDecision;
  tooltip: string;
  summary: string;
  Icon: LucideIcon;
  className: string;
  activeClassName: string;
}> = [
  {
    decision: "accept",
    tooltip: "Accept · 接受",
    summary: "接受這項改動",
    Icon: Check,
    className: "border-[rgb(80_179_128_/_0.32)] text-[rgb(125_214_166)] hover:border-[rgb(80_179_128)] hover:bg-[rgb(35_128_88_/_0.18)]",
    activeClassName: "!border-[rgb(80_179_128)] !bg-[rgb(35_128_88)] !text-white !shadow-[0_0_0_2px_rgb(80_179_128_/_0.16)]",
  },
  {
    decision: "reject",
    tooltip: "Reject · 拒絕",
    summary: "拒絕這項改動",
    Icon: X,
    className: "border-[rgb(221_101_91_/_0.32)] text-[rgb(236_143_135)] hover:border-[rgb(221_101_91)] hover:bg-[rgb(184_62_55_/_0.18)]",
    activeClassName: "!border-[rgb(221_101_91)] !bg-[rgb(184_62_55)] !text-white !shadow-[0_0_0_2px_rgb(221_101_91_/_0.16)]",
  },
  {
    decision: "more-info",
    tooltip: "More info · 需要更多討論",
    summary: "需要更多討論",
    Icon: MessageCircleQuestion,
    className: "border-[rgb(224_177_88_/_0.32)] text-[rgb(238_197_119)] hover:border-[rgb(224_177_88)] hover:bg-[rgb(177_121_33_/_0.18)]",
    activeClassName: "!border-[rgb(224_177_88)] !bg-[rgb(177_121_33)] !text-white !shadow-[0_0_0_2px_rgb(224_177_88_/_0.16)]",
  },
];
const CHANGE_FEEDBACK_CHOICE_CLASS = "group relative grid h-8 w-8 cursor-pointer place-items-center rounded-[10px] border bg-white/[0.025] p-0 transition-[transform,background-color,border-color,color,box-shadow] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:cursor-wait disabled:opacity-45";
const CHANGE_FEEDBACK_TOOLTIP_CLASS = "pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-10 w-max max-w-48 -translate-x-1/2 translate-y-1 rounded-md border border-white/10 bg-[rgb(18_19_19_/_0.98)] px-2 py-1 font-mono text-[9px] font-bold leading-none tracking-[0.02em] text-white/82 opacity-0 shadow-[0_8px_24px_rgb(0_0_0_/_0.3)] transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100";
const CHANGE_FEEDBACK_SUMMARY_CLASS: Record<ChangeProposalDecision, string> = {
  accept: "border-[rgb(80_179_128_/_0.3)] bg-[rgb(35_128_88_/_0.12)] text-[rgb(151_224_184)]",
  reject: "border-[rgb(221_101_91_/_0.3)] bg-[rgb(184_62_55_/_0.12)] text-[rgb(240_164_157)]",
  "more-info": "border-[rgb(224_177_88_/_0.3)] bg-[rgb(177_121_33_/_0.12)] text-[rgb(241_207_141)]",
};
const CHANGE_FEEDBACK_TEXTAREA_CLASS = "mt-2 min-h-20 w-full resize-y rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-[12px] leading-[1.45] text-white outline-none placeholder:text-white/30 focus:border-[rgb(80_179_128_/_0.75)]";
const CHANGE_FEEDBACK_AUTOSAVE_DELAY_MS = 450;
const NARROW_COMPARISON_QUERY = "(max-width: 820px)";

type ChangeReviewSide = "current" | "proposed";

interface ChangeIntent {
  proposalIndex: number;
  proposal: ChangeProposal;
  note: string;
  reviewSides: ChangeReviewSide[];
}

interface OpenChangeIntent {
  proposalIndex: number;
  reviewSide: ChangeReviewSide;
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
  const [openChangeIntent, setOpenChangeIntent] = useState<OpenChangeIntent | null>(null);
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

  useEffect(() => {
    if (!openChangeIntent) return;
    const intent = changeIntents.find((candidate) => candidate.proposalIndex === openChangeIntent.proposalIndex);
    if (!intent?.reviewSides.includes(openChangeIntent.reviewSide)) setOpenChangeIntent(null);
  }, [changeIntents, openChangeIntent]);

  useEffect(() => {
    if (!openChangeIntent) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenChangeIntent(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openChangeIntent]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    clearChangeTones(root);
    markAffectedTargets(root, "current", "before", currentAffectedTargets);
    markAffectedTargets(root, "proposed", "after", proposedAffectedTargets);
    syncFocusedProposal(root, openChangeIntent?.proposalIndex ?? null);

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
  }, [currentAffectedTargets, openChangeIntent, proposedAffectedTargets]);

  const handleClick = () => {
    setOpenChangeIntent(null);
  };

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
      data-openpress-change-focused-proposal={openChangeIntent?.proposalIndex ?? undefined}
      onClick={handleClick}
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
            registerPage={registerPage}
          />
        );
      })}
      {changeIntents.map((intent) => (
        <ChangeIntentMarker
          key={`${intent.proposalIndex}:${intent.proposal.path}:${intent.proposal.before}`}
          intent={intent}
          openSide={openChangeIntent?.proposalIndex === intent.proposalIndex ? openChangeIntent.reviewSide : null}
          onToggle={(reviewSide) => setOpenChangeIntent((current) => (
            current?.proposalIndex === intent.proposalIndex && current.reviewSide === reviewSide
              ? null
              : { proposalIndex: intent.proposalIndex, reviewSide }
          ))}
          onFeedbackChange={onFeedbackChange}
        />
      ))}
    </div>
  );
}

function ChangePagePair({
  pageIndex,
  currentPageIndex,
  currentPage,
  proposedPage,
  registerPage,
}: {
  pageIndex: number;
  currentPageIndex: number;
  currentPage?: HtmlPageBlock;
  proposedPage?: HtmlPageBlock;
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
          ? <PageHtmlContent html={currentPage.html} className={PUBLIC_HTML_PAGE_HTML_CLASS} />
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
          ? <PageHtmlContent html={proposedPage.html} className={PUBLIC_HTML_PAGE_HTML_CLASS} />
          : <div className={EMPTY_PAGE_CLASS}>Page removed</div>}
      </div>
    </>
  );
}

function ChangeIntentMarker({
  intent,
  openSide,
  onToggle,
  onFeedbackChange,
}: {
  intent: ChangeIntent;
  openSide: ChangeReviewSide | null;
  onToggle: (reviewSide: ChangeReviewSide) => void;
  onFeedbackChange: (proposal: ChangeProposal, feedback?: ChangeProposalFeedback) => Promise<void>;
}) {
  const markerNumber = intent.proposalIndex + 1;
  const [decision, setDecision] = useState<ChangeProposalDecision | undefined>(intent.proposal.feedback?.decision);
  const [comment, setComment] = useState(intent.proposal.feedback?.comment ?? "");
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const commentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);
  const commentRef = useRef(comment);
  const decisionRef = useRef(decision);
  const storedFeedbackRef = useRef(intent.proposal.feedback);
  const localFeedbackPendingRef = useRef(false);
  const selectedChoice = CHANGE_FEEDBACK_CHOICES.find((choice) => choice.decision === decision);
  storedFeedbackRef.current = intent.proposal.feedback;

  useEffect(() => {
    if (localFeedbackPendingRef.current) return;
    setDecision(intent.proposal.feedback?.decision);
    setComment(intent.proposal.feedback?.comment ?? "");
    decisionRef.current = intent.proposal.feedback?.decision;
    commentRef.current = intent.proposal.feedback?.comment ?? "";
    setSaveState(intent.proposal.feedback?.decision || intent.proposal.feedback?.comment ? "saved" : "idle");
    setSaveError("");
  }, [intent.proposal.feedback?.comment, intent.proposal.feedback?.decision]);

  useEffect(() => () => {
    if (commentSaveTimerRef.current) clearTimeout(commentSaveTimerRef.current);
  }, []);

  const clearPendingCommentSave = () => {
    if (!commentSaveTimerRef.current) return;
    clearTimeout(commentSaveTimerRef.current);
    commentSaveTimerRef.current = null;
  };

  const persistFeedback = (nextDecision: ChangeProposalDecision | undefined, nextComment: string) => {
    const saveVersion = ++saveVersionRef.current;
    localFeedbackPendingRef.current = true;
    setSaveState("saving");
    setSaveError("");
    const request = saveQueueRef.current
      .catch(() => undefined)
      .then(() => onFeedbackChange(intent.proposal, {
        ...(nextDecision ? { decision: nextDecision } : {}),
        ...(nextComment.trim() ? { comment: nextComment.trim() } : {}),
      }));
    saveQueueRef.current = request;
    void request.then(() => {
      if (
        saveVersionRef.current === saveVersion
        && commentRef.current === nextComment
        && decisionRef.current === nextDecision
      ) {
        localFeedbackPendingRef.current = false;
        setSaveState("saved");
      }
    }, (error) => {
      if (
        saveVersionRef.current === saveVersion
        && commentRef.current === nextComment
        && decisionRef.current === nextDecision
      ) {
        localFeedbackPendingRef.current = false;
        setDecision(storedFeedbackRef.current?.decision);
        decisionRef.current = storedFeedbackRef.current?.decision;
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    });
  };

  const chooseDecision = (nextDecision: ChangeProposalDecision) => {
    clearPendingCommentSave();
    const value = decision === nextDecision ? undefined : nextDecision;
    setDecision(value);
    decisionRef.current = value;
    persistFeedback(value, commentRef.current);
  };

  const scheduleCommentSave = (nextComment: string) => {
    clearPendingCommentSave();
    setComment(nextComment);
    commentRef.current = nextComment;
    localFeedbackPendingRef.current = true;
    setSaveState("pending");
    setSaveError("");
    commentSaveTimerRef.current = setTimeout(() => {
      commentSaveTimerRef.current = null;
      persistFeedback(decisionRef.current, nextComment);
    }, CHANGE_FEEDBACK_AUTOSAVE_DELAY_MS);
  };

  const flushCommentSave = () => {
    if (!commentSaveTimerRef.current) return;
    clearPendingCommentSave();
    persistFeedback(decisionRef.current, commentRef.current);
  };

  return (
    <>
      {intent.reviewSides.map((reviewSide) => {
        const open = openSide === reviewSide;
        const sideLabel = reviewSide === "current" ? "Current" : "Proposed";
        const popoverId = `openpress-change-intent-${markerNumber}-${reviewSide}`;
        return (
          <div
            key={reviewSide}
            className={cn(CHANGE_MARKER_WRAPPER_CLASS, open && "!z-[130]")}
            data-openpress-change-marker-wrapper
            data-openpress-change-proposal-index={intent.proposalIndex}
            data-openpress-change-review-side={reviewSide}
            data-openpress-change-marker-open={open ? "true" : "false"}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={cn(
                CHANGE_MARKER_BUTTON_CLASS,
                reviewSide === "current" && !decision && CHANGE_MARKER_CURRENT_CLASS,
                decision && CHANGE_MARKER_FEEDBACK_CLASS[decision],
              )}
              aria-label={`Change ${markerNumber} on ${sideLabel}: ${intent.note}`}
              aria-expanded={open}
              aria-controls={open ? popoverId : undefined}
              data-openpress-change-marker
              data-openpress-change-feedback={decision ?? (intent.proposal.feedback?.comment ? "comment" : undefined)}
              onClick={() => onToggle(reviewSide)}
            >
              {markerNumber}
            </button>
            {open ? (
              <div
                id={popoverId}
                role="dialog"
                aria-label={`Change ${markerNumber} intent`}
                className={cn(CHANGE_POPOVER_CLASS, decision && CHANGE_POPOVER_FEEDBACK_CLASS[decision])}
                data-openpress-change-intent-popover
                data-openpress-change-feedback-decision={decision}
              >
                <p className={cn(CHANGE_POPOVER_LABEL_CLASS, decision && CHANGE_POPOVER_LABEL_FEEDBACK_CLASS[decision])}>
                  改動意圖 · {markerNumber}
                </p>
                <p className={CHANGE_POPOVER_NOTE_CLASS}>{intent.note}</p>
                <div className="mt-3 border-t border-white/10 pt-3" data-openpress-change-feedback-form>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">你的回應</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHANGE_FEEDBACK_CHOICES.map((choice) => (
                      <button
                        key={choice.decision}
                        type="button"
                        className={cn(
                          CHANGE_FEEDBACK_CHOICE_CLASS,
                          choice.className,
                          decision === choice.decision && choice.activeClassName,
                        )}
                        aria-label={choice.tooltip}
                        aria-pressed={decision === choice.decision}
                        data-openpress-change-feedback-action={choice.decision}
                        disabled={saveState === "saving"}
                        onClick={() => chooseDecision(choice.decision)}
                      >
                        <choice.Icon className="h-[15px] w-[15px] stroke-[2.35]" aria-hidden="true" />
                        <span
                          className={CHANGE_FEEDBACK_TOOLTIP_CLASS}
                          data-openpress-change-feedback-tooltip={choice.decision}
                          aria-hidden="true"
                        >
                          {choice.tooltip}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedChoice ? (
                    <div
                      className={cn(
                        "mt-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold",
                        CHANGE_FEEDBACK_SUMMARY_CLASS[selectedChoice.decision],
                      )}
                      data-openpress-change-feedback-summary={selectedChoice.decision}
                    >
                      <selectedChoice.Icon className="h-3.5 w-3.5 stroke-[2.4]" aria-hidden="true" />
                      <span>{selectedChoice.summary}</span>
                    </div>
                  ) : null}
                  <textarea
                    className={CHANGE_FEEDBACK_TEXTAREA_CLASS}
                    aria-label={`Comment for change ${markerNumber}`}
                    placeholder="補一句方向，讓 Agent 下一輪讀取…"
                    value={comment}
                    onChange={(event) => scheduleCommentSave(event.target.value)}
                    onBlur={flushCommentSave}
                  />
                  <div className="mt-2 flex min-h-5 items-center">
                    <span
                      className={cn(
                        "text-[10px] leading-tight",
                        saveState === "error" ? "text-[rgb(230_135_126)]" : "text-white/38",
                      )}
                      role={saveState === "error" ? "alert" : undefined}
                    >
                      {saveState === "saving"
                        ? "儲存中…"
                        : saveState === "pending"
                          ? "即將自動儲存…"
                        : saveState === "saved"
                          ? "已自動儲存，留給下一輪"
                          : saveError || "變更會自動儲存至目前 Preview"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
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

    const popover = wrapper.querySelector<HTMLElement>("[data-openpress-change-intent-popover]");
    const marker = wrapper.querySelector<HTMLElement>("[data-openpress-change-marker]");
    if (!popover || !marker) return;
    const markerRect = marker.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth || 280;
    const popoverHeight = popover.offsetHeight || 160;
    const preferredLeft = markerRect.right + 10;
    const left = preferredLeft + popoverWidth <= window.innerWidth - 12
      ? preferredLeft
      : Math.max(12, markerRect.left - popoverWidth - 10);
    const top = Math.min(
      Math.max(52, markerRect.top - 4),
      Math.max(52, window.innerHeight - popoverHeight - 12),
    );
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
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
