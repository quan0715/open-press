import type { DeploymentInfo } from "../../document-model";
import type { DeployStatus, PdfActionStatus } from "../workbenchTypes";

export function deployButtonText(info: DeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "設定部署";
  if (status === "deploying") return "部署中";
  if (status === "failed") return "重試部署";
  if (status === "unavailable") return "本機限定";
  if (isDeploymentDirty(info, status)) return "重新部署";
  return "部署";
}

export function workbenchPdfButtonText(localPdfEnabled: boolean, status: PdfActionStatus, staticPdfHref?: string) {
  if (localPdfEnabled) {
    if (status === "generating") return "產生中";
    if (status === "opening") return "正在開啟";
    if (status === "failed") return "重試 PDF";
    return "產生 PDF";
  }
  return !staticPdfHref ? "PDF 未部署" : "開啟 PDF";
}

export function workbenchPdfStatusMessage(localPdfEnabled: boolean, status: PdfActionStatus) {
  if (!localPdfEnabled) return null;
  if (status === "generating") return "正在產生 PDF";
  if (status === "opening") return "PDF 已完成，正在開啟";
  if (status === "failed") return "PDF 產生失敗，請重試";
  return null;
}

export function deploymentStatusKind(info: DeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "failed";
  if (status === "deploying") return "deploying";
  if (status === "failed") return "failed";
  if (status === "unavailable") return "unavailable";
  if (isDeploymentDirty(info, status)) return "dirty";
  if (status === "deployed" || hasOnlineDeployment(info)) return "online";
  return "offline";
}

export function deploymentStatusSummary(info: DeploymentInfo, status: DeployStatus) {
  const label = deploymentStatusLabel(info, status);
  if ((status === "deployed" || hasOnlineDeployment(info)) && info.deployedAt) {
    return `${label} · ${formatDeployTime(info.deployedAt)}`;
  }
  return label;
}

export function deploymentStatusText(info: DeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") {
    return info.setupMessage ?? "部署設定尚未完成，請先設定 deploy.projectName";
  }
  if (status === "deploying") return "部署中";
  if (status === "failed") return "部署失敗，請查看終端機";
  if (status === "unavailable") return "目前環境沒有本地部署服務";
  if (isDeploymentDirty(info, status)) return "已上線但內容有更動，點擊重新部署";
  if (status === "deployed" || hasOnlineDeployment(info)) {
    return `已上線${info.deployedAt ? `，更新：${formatDeployTime(info.deployedAt)}` : ""}`;
  }
  return "未上線";
}

export function parseDeployError(text: string): {
  message?: string;
  deploy_configured?: boolean;
  deploy_adapter?: string;
  deploy_source?: string;
  deploy_project_name?: string;
} | null {
  try {
    return JSON.parse(text) as {
      message?: string;
      deploy_configured?: boolean;
      deploy_adapter?: string;
      deploy_source?: string;
      deploy_project_name?: string;
    };
  } catch {
    return null;
  }
}

function deploymentStatusLabel(info: DeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "缺少設定";
  if (status === "deploying") return "正在部署";
  if (status === "failed") return "部署失敗";
  if (status === "unavailable") return "本機限定";
  if (isDeploymentDirty(info, status)) return "有更新";
  if (status === "deployed" || hasOnlineDeployment(info)) return "已上線";
  return "未上線";
}

function hasOnlineDeployment(info: DeploymentInfo) {
  if (info.configured === false) return false;
  return Boolean(info.online || info.deployedAt || info.publicUrl || (info.pdf && /^https?:\/\//i.test(info.pdf)));
}

function isDeploymentDirty(info: DeploymentInfo, status: DeployStatus) {
  return status === "idle" && hasOnlineDeployment(info) && info.dirty === true;
}

function formatDeployTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時間未知";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
