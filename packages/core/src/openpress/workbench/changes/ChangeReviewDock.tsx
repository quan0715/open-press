import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MessageCircleQuestion,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/openpress/core/cn";
import type {
  ChangeProposal,
  ChangeProposalDecision,
  ChangeProposalFeedback,
} from "./changePreviewModel";
import {
  computeChangeReviewProgress,
  getAdjacentProposalIndex,
} from "./changeReviewUtils";

const CHANGE_FEEDBACK_AUTOSAVE_DELAY_MS = 450;
const MAX_STEP_PILLS_COUNT = 6;

const DECISION_BUTTON_CONFIG: Array<{
  decision: ChangeProposalDecision;
  label: string;
  keyHint: string;
  Icon: LucideIcon;
  baseClass: string;
  activeClass: string;
}> = [
  {
    decision: "accept",
    label: "接受",
    keyHint: "A",
    Icon: Check,
    baseClass: "bg-white/[0.04] text-[rgb(125_214_166)] hover:bg-[rgb(35_128_88_/_0.22)] hover:text-white",
    activeClass: "!bg-[rgb(35_128_88)] !text-white !shadow-[0_2px_10px_rgb(35_128_88_/_0.4)]",
  },
  {
    decision: "reject",
    label: "拒絕",
    keyHint: "R",
    Icon: X,
    baseClass: "bg-white/[0.04] text-[rgb(236_143_135)] hover:bg-[rgb(184_62_55_/_0.22)] hover:text-white",
    activeClass: "!bg-[rgb(184_62_55)] !text-white !shadow-[0_2px_10px_rgb(184_62_55_/_0.4)]",
  },
  {
    decision: "more-info",
    label: "討論",
    keyHint: "M",
    Icon: MessageCircleQuestion,
    baseClass: "bg-white/[0.04] text-[rgb(238_197_119)] hover:bg-[rgb(177_121_33_/_0.22)] hover:text-white",
    activeClass: "!bg-[rgb(177_121_33)] !text-white !shadow-[0_2px_10px_rgb(177_121_33_/_0.4)]",
  },
];

export interface ChangeReviewDockProps {
  proposals: ChangeProposal[];
  activeProposalIndex: number;
  onSelectProposal: (index: number) => void;
  onFeedbackChange: (proposal: ChangeProposal, feedback?: ChangeProposalFeedback) => Promise<void>;
}

export function ChangeReviewDock({
  proposals,
  activeProposalIndex,
  onSelectProposal,
  onFeedbackChange,
}: ChangeReviewDockProps) {
  // Default to expanded so the full modification reason and feedback are immediately visible
  const [expanded, setExpanded] = useState(true);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const total = proposals.length;
  const activeProposal = proposals[activeProposalIndex] ?? proposals[0];
  const stats = useMemo(() => computeChangeReviewProgress(proposals), [proposals]);

  const [decision, setDecision] = useState<ChangeProposalDecision | undefined>(
    activeProposal?.feedback?.decision,
  );
  const [comment, setComment] = useState(activeProposal?.feedback?.comment ?? "");
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const commentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);
  const commentRef = useRef(comment);
  const decisionRef = useRef(decision);
  const storedFeedbackRef = useRef(activeProposal?.feedback);
  const localFeedbackPendingRef = useRef(false);
  const jumpMenuRef = useRef<HTMLDivElement>(null);
  storedFeedbackRef.current = activeProposal?.feedback;

  useEffect(() => {
    if (localFeedbackPendingRef.current) return;
    setDecision(activeProposal?.feedback?.decision);
    setComment(activeProposal?.feedback?.comment ?? "");
    decisionRef.current = activeProposal?.feedback?.decision;
    commentRef.current = activeProposal?.feedback?.comment ?? "";
    setSaveState(
      activeProposal?.feedback?.decision || activeProposal?.feedback?.comment ? "saved" : "idle",
    );
    setSaveError("");
  }, [activeProposal?.feedback?.comment, activeProposal?.feedback?.decision, activeProposalIndex]);

  useEffect(() => () => {
    if (commentSaveTimerRef.current) clearTimeout(commentSaveTimerRef.current);
  }, []);

  // Close jump menu on outside click
  useEffect(() => {
    if (!jumpMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (jumpMenuRef.current && !jumpMenuRef.current.contains(e.target as Node)) {
        setJumpMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [jumpMenuOpen]);

  const clearPendingCommentSave = () => {
    if (!commentSaveTimerRef.current) return;
    clearTimeout(commentSaveTimerRef.current);
    commentSaveTimerRef.current = null;
  };

  const persistFeedback = useCallback((
    targetProposal: ChangeProposal,
    nextDecision: ChangeProposalDecision | undefined,
    nextComment: string,
  ) => {
    const saveVersion = ++saveVersionRef.current;
    localFeedbackPendingRef.current = true;
    setSaveState("saving");
    setSaveError("");
    const request = saveQueueRef.current
      .catch(() => undefined)
      .then(() => onFeedbackChange(targetProposal, {
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
  }, [onFeedbackChange]);

  const chooseDecision = useCallback((nextDecision: ChangeProposalDecision) => {
    if (!activeProposal) return;
    clearPendingCommentSave();
    const value = decision === nextDecision ? undefined : nextDecision;
    setDecision(value);
    decisionRef.current = value;
    persistFeedback(activeProposal, value, commentRef.current);
  }, [activeProposal, decision, persistFeedback]);

  const scheduleCommentSave = (nextComment: string) => {
    if (!activeProposal) return;
    clearPendingCommentSave();
    setComment(nextComment);
    commentRef.current = nextComment;
    localFeedbackPendingRef.current = true;
    setSaveState("pending");
    setSaveError("");
    commentSaveTimerRef.current = setTimeout(() => {
      commentSaveTimerRef.current = null;
      persistFeedback(activeProposal, decisionRef.current, nextComment);
    }, CHANGE_FEEDBACK_AUTOSAVE_DELAY_MS);
  };

  const flushCommentSave = () => {
    if (!activeProposal || !commentSaveTimerRef.current) return;
    clearPendingCommentSave();
    persistFeedback(activeProposal, decisionRef.current, commentRef.current);
  };

  const handlePrev = useCallback(() => {
    if (total <= 0) return;
    const prevIndex = getAdjacentProposalIndex(activeProposalIndex, total, "prev");
    onSelectProposal(prevIndex);
  }, [activeProposalIndex, onSelectProposal, total]);

  const handleNext = useCallback(() => {
    if (total <= 0) return;
    const nextIndex = getAdjacentProposalIndex(activeProposalIndex, total, "next");
    onSelectProposal(nextIndex);
  }, [activeProposalIndex, onSelectProposal, total]);

  // Global keyboard shortcuts for review dock
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target && (
        target.tagName === "INPUT"
        || target.tagName === "TEXTAREA"
        || target.isContentEditable
      );

      if (event.key === "Escape") {
        if (jumpMenuOpen) {
          event.preventDefault();
          setJumpMenuOpen(false);
          return;
        }
        if (expanded) {
          event.preventDefault();
          setExpanded(false);
        }
        return;
      }

      if (isEditable) return;

      if (event.key === "j" || event.key === "J" || event.key === "ArrowDown" || event.key === "]") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "k" || event.key === "K" || event.key === "ArrowUp" || event.key === "[") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        chooseDecision("accept");
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        chooseDecision("reject");
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        chooseDecision("more-info");
      } else if (event.key === "c" || event.key === "C" || event.key === "Enter") {
        event.preventDefault();
        setExpanded((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chooseDecision, expanded, handleNext, handlePrev, jumpMenuOpen]);

  if (total === 0 || !activeProposal) return null;

  const currentNumber = activeProposalIndex + 1;
  const cleanNote = activeProposal.note?.trim() || "未提供改動說明。";
  const displayPath = activeProposal.path.split("/").slice(-2).join("/");
  const useStepPills = total <= MAX_STEP_PILLS_COUNT;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[140] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 select-none"
      data-openpress-change-review-dock
      data-openpress-review-expanded={expanded ? "true" : "false"}
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-[rgb(18_20_20_/_0.95)] text-[rgb(245_247_246_/_0.94)]",
          "shadow-[0_24px_60px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.07]",
          "backdrop-blur-2xl transition-[box-shadow,height] duration-200",
          decision === "accept" && "ring-[rgb(80_179_128_/_0.4)] shadow-[0_24px_60px_rgba(0,0,0,0.65),0_0_20px_rgb(35_128_88_/_0.15)]",
          decision === "reject" && "ring-[rgb(221_101_91_/_0.4)] shadow-[0_24px_60px_rgba(0,0,0,0.65),0_0_20px_rgb(184_62_55_/_0.15)]",
          decision === "more-info" && "ring-[rgb(224_177_88_/_0.4)] shadow-[0_24px_60px_rgba(0,0,0,0.65),0_0_20px_rgb(177_121_33_/_0.15)]",
        )}
      >
        {/* Top Navigation & Action Header */}
        <div className="flex h-12 items-center justify-between gap-2 px-3">
          {/* Left: Prev / Next + Adaptive Navigation (Step Pills for <=6, Dropdown Selector for >6) */}
          <div className="flex shrink-0 items-center gap-1.5" ref={jumpMenuRef}>
            <button
              type="button"
              className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/[0.04] text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30"
              title="上一個變更 (K / ↑)"
              aria-label="上一個變更 (K / ↑)"
              onClick={handlePrev}
              data-openpress-review-prev
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {useStepPills ? (
              /* Case 1: <= 6 proposals: discrete, beautiful step pills */
              <div className="flex items-center gap-1">
                {proposals.map((proposal, idx) => {
                  const isSelected = idx === activeProposalIndex;
                  const itemDecision = proposal.feedback?.decision;
                  const hasComment = Boolean(proposal.feedback?.comment?.trim());
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectProposal(idx)}
                      title={`變更 #${idx + 1}: ${proposal.note?.trim() || proposal.path}`}
                      className={cn(
                        "group relative inline-flex h-7.5 items-center gap-1 rounded-lg px-2 text-[11px] font-mono transition-[background-color,transform,color,box-shadow]",
                        isSelected
                          ? "bg-white text-black font-bold shadow-[0_2px_8px_rgba(255,255,255,0.25)] scale-105"
                          : "bg-white/[0.05] text-white/60 hover:bg-white/10 hover:text-white",
                      )}
                      data-openpress-review-jump-item={idx}
                      data-openpress-active={isSelected ? "true" : "false"}
                    >
                      <span>{idx + 1}</span>
                      {itemDecision === "accept" && (
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-[rgb(24_138_78)]" : "bg-[rgb(125_214_166)]",
                        )} />
                      )}
                      {itemDecision === "reject" && (
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-[rgb(200_50_40)]" : "bg-[rgb(236_143_135)]",
                        )} />
                      )}
                      {itemDecision === "more-info" && (
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-[rgb(190_125_20)]" : "bg-[rgb(238_197_119)]",
                        )} />
                      )}
                      {!itemDecision && hasComment && (
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-black/50" : "bg-white/50",
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Case 2: > 6 proposals: Compact Dropdown Selector with Search / List */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setJumpMenuOpen((prev) => !prev)}
                  className="inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 font-mono text-[12px] font-bold text-white transition-colors hover:bg-white/12"
                  title="點擊展開全部變更選單"
                  aria-expanded={jumpMenuOpen}
                >
                  <span>{currentNumber}</span>
                  <span className="text-white/35">/</span>
                  <span className="text-white/60">{total}</span>
                  <ChevronDown className="h-3 w-3 text-white/50" />
                </button>

                {jumpMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 max-h-[260px] w-[280px] overflow-y-auto rounded-xl bg-[rgb(24_26_26)] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/10 backdrop-blur-2xl">
                    <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
                      跳至變更 ({total})
                    </div>
                    <div className="space-y-0.5">
                      {proposals.map((proposal, idx) => {
                        const isSelected = idx === activeProposalIndex;
                        const itemDecision = proposal.feedback?.decision;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              onSelectProposal(idx);
                              setJumpMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors",
                              isSelected
                                ? "bg-white text-black font-semibold"
                                : "text-white/80 hover:bg-white/10 hover:text-white",
                            )}
                          >
                            <span className="truncate">
                              <span className="font-mono opacity-50 mr-1.5">{idx + 1}.</span>
                              {proposal.note?.trim() || proposal.path}
                            </span>
                            {itemDecision === "accept" && <span className="text-[rgb(80_179_128)]">✓</span>}
                            {itemDecision === "reject" && <span className="text-[rgb(221_101_91)]">✕</span>}
                            {itemDecision === "more-info" && <span className="text-[rgb(224_177_88)]">?</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/[0.04] text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30"
              title="下一個變更 (J / ↓)"
              aria-label="下一個變更 (J / ↓)"
              onClick={handleNext}
              data-openpress-review-next
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Overall Progress Badge */}
            <span className="ml-0.5 rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] font-medium text-white/60">
              {stats.reviewed}/{total} 已審
            </span>
          </div>

          {/* Right: Quick Action Buttons & Expand Toggle */}
          <div className="flex shrink-0 items-center gap-1.5">
            {DECISION_BUTTON_CONFIG.map((btn) => {
              const active = decision === btn.decision;
              return (
                <button
                  key={btn.decision}
                  type="button"
                  className={cn(
                    "relative inline-flex h-7.5 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition-[transform,background-color,color,box-shadow] duration-150 active:scale-95",
                    btn.baseClass,
                    active && btn.activeClass,
                  )}
                  title={`${btn.label} (${btn.keyHint})`}
                  aria-label={`${btn.label} (${btn.keyHint})`}
                  aria-pressed={active}
                  onClick={() => chooseDecision(btn.decision)}
                  data-openpress-review-action={btn.decision}
                  disabled={saveState === "saving"}
                >
                  <btn.Icon className="h-3.5 w-3.5 stroke-[2.4]" aria-hidden="true" />
                  <span>{btn.label}</span>
                  <span className="font-mono text-[9px] opacity-60">({btn.keyHint})</span>
                </button>
              );
            })}

            <button
              type="button"
              className={cn(
                "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/[0.04] text-white/70 transition-[background-color,color,transform] hover:bg-white/10 hover:text-white active:scale-95",
                expanded && "bg-white/12 text-white",
              )}
              title={expanded ? "收合卡片 (C / Esc)" : "展開卡片 (C / Enter)"}
              aria-label={expanded ? "收合卡片" : "展開卡片"}
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
              data-openpress-review-expand
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Detailed Modification Reason & Feedback Area */}
        {expanded && (
          <div
            className="flex flex-col gap-2.5 bg-[rgb(12_14_14_/_0.98)] p-3 text-left"
            data-openpress-review-drawer
          >
            {/* Full Modification Reason (Clearly displayed in full with high legibility) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-white/40">
                <span className="inline-flex items-center gap-1 font-semibold text-[rgb(125_214_166)]">
                  <Sparkles className="h-3 w-3" />
                  變更 #{currentNumber} 改動意圖
                </span>
                <span className="truncate max-w-[280px]" title={activeProposal.path}>
                  {displayPath}
                </span>
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-white/95 break-words">
                {cleanNote}
              </p>
            </div>

            {/* Comment Input for Agent */}
            <div className="flex flex-col gap-1.5 pt-1">
              <textarea
                className="min-h-[64px] w-full resize-y rounded-xl bg-white/[0.03] px-3 py-2 text-[12px] leading-[1.45] text-white outline-none placeholder:text-white/25 transition-colors hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-white/15"
                placeholder="補一句方向或修改意見，自動儲存給 Agent…"
                value={comment}
                onChange={(event) => scheduleCommentSave(event.target.value)}
                onBlur={flushCommentSave}
                data-openpress-review-comment-textarea
              />

              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span
                  className={cn(
                    saveState === "error" && "text-[rgb(230_135_126)]",
                    saveState === "saved" && "text-[rgb(125_214_166)]",
                  )}
                >
                  {saveState === "saving"
                    ? "儲存中…"
                    : saveState === "pending"
                      ? "即將自動儲存…"
                    : saveState === "saved"
                      ? "✓ 已自動儲存至 Preview"
                      : saveError || "自動儲存至 Preview"}
                </span>
                <span className="font-mono text-[9px] text-white/30">
                  快捷鍵: J/K 切換 · A/R/M 審核 · Esc 收合
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
