import { useId, useState } from "react";
import { Check, Rocket } from "lucide-react";
import { cn } from "../../core/cn";
import type { DeploymentInfo } from "../../document-model";
import { WorkbenchDialog } from "../dialog";
import type { DeployStatus } from "../workbenchTypes";
import {
  deployButtonText,
  deploymentStatusKind,
  deploymentStatusSummary,
  deploymentStatusText,
} from "./deploymentStatusModel";
import { DEPLOY_STATUS_TOOLBAR_CLASS, TOOLBAR_ACTION_CLASS, TOOLBAR_DEPLOY_STATUS_DOT_CLASS } from "../toolbarClasses";

const DEPLOY_DIALOG_CLASS = "openpress-deploy-dialog !w-[min(420px,calc(100vw-56px))] gap-3 !p-4";
const DEPLOY_DIALOG_FOOTER_CLASS = [
  "[&_button]:!h-[30px] [&_button]:!gap-[7px] [&_button]:!px-2.5 [&_button]:!font-[560]",
  "[&_svg]:h-[13px] [&_svg]:w-[13px]",
].join(" ");
const DEPLOY_SOURCE_CLASS = [
  "openpress-deploy-dialog__source inline-flex min-h-[19px] max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap",
  "rounded-full border border-[rgb(110_231_160_/_0.18)] bg-[rgb(110_231_160_/_0.07)] px-[7px]",
  "text-[10px] font-semibold leading-none text-[rgb(144_238_177_/_0.88)]",
].join(" ");
const DEPLOY_DETAILS_CLASS = [
  "grid gap-2 border-y border-[var(--openpress-workbench-border-muted)] py-3",
].join(" ");
const DEPLOY_ROW_CLASS = "grid min-w-0 grid-cols-[78px_minmax(0,1fr)] items-center gap-3";
const DEPLOY_TERM_CLASS = "m-0 min-w-0 text-[11px] leading-[1.35] text-[rgb(150_156_163_/_0.68)]";
const DEPLOY_VALUE_CLASS = "m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[11px] leading-[1.35] text-[var(--openpress-workbench-text-soft)]";
const DEPLOY_LINK_CLASS = "text-[rgb(214_218_222_/_0.92)] no-underline hover:text-[rgb(240_182_76_/_0.94)] hover:underline hover:underline-offset-[3px]";
const DEPLOY_STATUS_CLASS = "openpress-deploy-dialog__status inline-flex items-center justify-start gap-1.5 text-[rgb(198_204_210_/_0.78)]";
const DEPLOY_STATUS_DOT_CLASS = "h-1.5 w-1.5 shrink-0 rounded-full bg-current";
const DEPLOY_STATUS_KIND_CLASS: Record<string, string> = {
  online: "text-[var(--openpress-workbench-success)]",
  dirty: "text-[var(--openpress-workbench-accent)]",
  deploying: "text-[var(--openpress-workbench-accent)]",
  failed: "text-[var(--openpress-workbench-danger)]",
};
const DEPLOY_MESSAGE_CLASS = "openpress-deploy-dialog__message m-0 border-l-2 border-[rgb(248_113_113_/_0.76)] py-1.5 pl-2.5 pr-0 text-xs leading-[1.45] text-[rgb(248_113_113_/_0.88)]";

export function DeploymentControl({
  info,
  status,
  onDeploy,
}: {
  info: DeploymentInfo;
  status: DeployStatus;
  onDeploy: () => void | Promise<void>;
}) {
  const titleId = useId();
  const [dialogOpen, setDialogOpen] = useState(false);
  const kind = deploymentStatusKind(info, status);
  const buttonText = deployButtonText(info, status);
  const description = deploymentStatusText(info, status);
  const summary = deploymentStatusSummary(info, status);
  const sourceLabel = deploymentSourceLabel(info);
  const busy = status === "deploying";
  const confirmDisabled = busy || status === "unavailable" || info.configured === false;

  const confirmDeploy = () => {
    if (confirmDisabled) return;
    setDialogOpen(false);
    void onDeploy();
  };

  const dialog = dialogOpen ? (
    <WorkbenchDialog
      titleId={titleId}
      title="部署資訊"
      eyebrow="Deployment"
      titleMeta={<span className={DEPLOY_SOURCE_CLASS}>{sourceLabel}</span>}
      className={DEPLOY_DIALOG_CLASS}
      backdropClassName="openpress-deploy-dialog-backdrop"
      footerClassName={DEPLOY_DIALOG_FOOTER_CLASS}
      closeLabel="關閉部署資訊"
      onClose={() => setDialogOpen(false)}
      footer={(
        <>
          <button type="button" onClick={() => setDialogOpen(false)}>取消</button>
          <button type="button" disabled={confirmDisabled} onClick={confirmDeploy}>
            <Check aria-hidden="true" />
            <span>{busy ? "部署中" : "確認部署"}</span>
          </button>
        </>
      )}
    >
      <dl className={DEPLOY_DETAILS_CLASS} data-openpress-deploy-align="left-values">
        <DeployStatusRow label="狀態" value={summary} kind={kind} />
        <DeployLinkRow label="公開頁面" url={info.publicUrl} />
        <DeployLinkRow label="PDF" url={info.pdf} />
      </dl>
      {info.configured === false ? (
        <p className={DEPLOY_MESSAGE_CLASS} role="status">
          {info.setupMessage ?? "部署設定尚未完成。"}
        </p>
      ) : null}
    </WorkbenchDialog>
  ) : null;

  return (
    <>
      <button
        type="button"
        className={TOOLBAR_ACTION_CLASS}
        data-openpress-deploy
        data-openpress-deploy-status={kind}
        data-openpress-deploy-state={status}
        data-openpress-toolbar-expanded="false"
        data-openpress-toolbar-active="false"
        aria-busy={busy ? "true" : "false"}
        aria-label={buttonText}
        title={description}
        onClick={() => setDialogOpen(true)}
      >
        <Rocket aria-hidden="true" />
      </button>
      {busy ? (
        <span
          className={DEPLOY_STATUS_TOOLBAR_CLASS}
          data-openpress-deploy-status={kind}
          role="status"
          aria-live="polite"
        >
          <span className={TOOLBAR_DEPLOY_STATUS_DOT_CLASS} aria-hidden="true" />
          <span>部署中</span>
        </span>
      ) : null}
      {dialog}
    </>
  );
}

function DeployStatusRow({ label, value, kind }: { label: string; value: string; kind: string }) {
  return (
    <div className={DEPLOY_ROW_CLASS}>
      <dt className={DEPLOY_TERM_CLASS}>{label}</dt>
      <dd className={DEPLOY_VALUE_CLASS}>
        <span className={cn(DEPLOY_STATUS_CLASS, DEPLOY_STATUS_KIND_CLASS[kind])} data-openpress-deploy-status={kind}>
          <span className={DEPLOY_STATUS_DOT_CLASS} aria-hidden="true" />
          {value}
        </span>
      </dd>
    </div>
  );
}

function DeployLinkRow({ label, url }: { label: string; url?: string }) {
  return (
    <div className={DEPLOY_ROW_CLASS}>
      <dt className={DEPLOY_TERM_CLASS}>{label}</dt>
      <dd className={DEPLOY_VALUE_CLASS}>
        {url ? (
          <a className={DEPLOY_LINK_CLASS} href={url} target="_blank" rel="noreferrer">
            {formatDeployUrl(url)}
          </a>
        ) : (
          "尚未產生"
        )}
      </dd>
    </div>
  );
}

function deploymentSourceLabel(info: DeploymentInfo) {
  const adapter = info.adapter?.trim().toLowerCase();

  if (adapter === "cloudflare-pages" || adapter === "cloudflare") return "Cloudflare Pages";
  if (adapter === "github-pages" || adapter === "github") return "GitHub Pages";
  if (adapter === "zeabur" || adapter === "zebur") return "Zeabur";

  return info.projectName?.trim() || info.source?.trim() || info.adapter?.trim() || "本機工作區";
}

function formatDeployUrl(value: string) {
  try {
    const url = new URL(value);
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return shortenDeployUrl(`${url.host}${pathname}`);
  } catch {
    return shortenDeployUrl(value);
  }
}

function shortenDeployUrl(value: string) {
  if (value.length <= 48) return value;
  return `${value.slice(0, 30)}...${value.slice(-14)}`;
}
