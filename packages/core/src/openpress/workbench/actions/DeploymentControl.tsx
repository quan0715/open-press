import { useId, useState } from "react";
import { Check, Rocket } from "lucide-react";
import type { DeploymentInfo } from "../../document-model";
import { WorkbenchDialog } from "../dialog";
import type { DeployStatus } from "../workbenchTypes";
import {
  deployButtonText,
  deploymentStatusKind,
  deploymentStatusSummary,
  deploymentStatusText,
} from "./deploymentStatusModel";

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
      titleMeta={<span className="openpress-deploy-dialog__source">{sourceLabel}</span>}
      className="openpress-deploy-dialog"
      backdropClassName="openpress-deploy-dialog-backdrop"
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
      <dl data-openpress-deploy-align="left-values">
        <DeployStatusRow label="狀態" value={summary} kind={kind} />
        <DeployLinkRow label="公開頁面" url={info.publicUrl} />
        <DeployLinkRow label="PDF" url={info.pdf} />
      </dl>
      {info.configured === false ? (
        <p className="openpress-deploy-dialog__message" role="status">
          {info.setupMessage ?? "部署設定尚未完成。"}
        </p>
      ) : null}
    </WorkbenchDialog>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="openpress-workbench-toolbar-action"
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
          className="openpress-dev-deploy-status openpress-dev-deploy-status--toolbar"
          data-openpress-deploy-status={kind}
          role="status"
          aria-live="polite"
        >
          <span className="openpress-dev-deploy-status__dot" aria-hidden="true" />
          <span>部署中</span>
        </span>
      ) : null}
      {dialog}
    </>
  );
}

function DeployStatusRow({ label, value, kind }: { label: string; value: string; kind: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <span className="openpress-deploy-dialog__status" data-openpress-deploy-status={kind}>
          {value}
        </span>
      </dd>
    </div>
  );
}

function DeployLinkRow({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
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
