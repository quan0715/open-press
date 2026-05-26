import { useCallback, useMemo, useState } from "react";
import { isLocalWorkspaceHost } from "../../shared";
import type { DeploymentInfo } from "../../document-model";
import type { DeployStatus, PdfActionStatus } from "../workbenchTypes";
import { parseDeployError, workbenchPdfButtonText, workbenchPdfStatusMessage } from "./deploymentStatusModel";

export interface UseDeploymentWorkbenchOptions {
  deploymentInfo: DeploymentInfo;
}

export interface DeploymentWorkbench {
  status: DeployStatus;
  pdfActionStatus: PdfActionStatus;
  currentDeploymentInfo: DeploymentInfo;
  staticPdfHref: string | undefined;
  localDeployEnabled: boolean;
  pdfButtonText: string;
  pdfButtonDisabled: boolean;
  pdfStatusMessage: string | null;
  pdfToolbarExpanded: boolean;
  handleDeploy: () => Promise<void>;
  handleOpenWorkbenchPdf: () => void;
}

export function useDeploymentWorkbench({ deploymentInfo }: UseDeploymentWorkbenchOptions): DeploymentWorkbench {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [pdfActionStatus, setPdfActionStatus] = useState<PdfActionStatus>("idle");
  const [currentDeploymentInfo, setCurrentDeploymentInfo] = useState(deploymentInfo);
  const staticPdfHref = currentDeploymentInfo.pdf;

  const localDeployEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isLocalWorkspaceHost(window.location.hostname);
  }, []);

  const pdfButtonText = workbenchPdfButtonText(localDeployEnabled, pdfActionStatus, staticPdfHref);
  const pdfStatusMessage = workbenchPdfStatusMessage(localDeployEnabled, pdfActionStatus);
  const pdfButtonDisabled = localDeployEnabled
    ? pdfActionStatus === "generating" || pdfActionStatus === "opening"
    : !staticPdfHref;
  const pdfToolbarExpanded = pdfActionStatus !== "idle";

  const handleDeploy = useCallback(async () => {
    if (status === "deploying") return;
    if (currentDeploymentInfo.configured === false) {
      setStatus("setup");
      return;
    }
    setStatus("deploying");
    try {
      const response = await fetch("/__openpress/deploy", { method: "POST" });
      if (response.status === 404 || response.status === 405) {
        setStatus("unavailable");
        return;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const result = parseDeployError(text);
        if (result?.deploy_configured === false) {
          setCurrentDeploymentInfo((info) => ({
            ...info,
            configured: false,
            adapter: result.deploy_adapter ?? info.adapter,
            source: result.deploy_source ?? info.source,
            projectName: result.deploy_project_name ?? info.projectName,
            setupMessage: result.message ?? info.setupMessage,
          }));
          setStatus("setup");
          return;
        }
        console.error("OpenPress deploy failed", text);
        setStatus("failed");
        return;
      }
      const result = (await response.json().catch(() => null)) as {
        deployed_at?: string;
        pdf?: string;
        public_url?: string;
      } | null;
      setCurrentDeploymentInfo((info) => ({
        online: true,
        deployedAt: result?.deployed_at ?? new Date().toISOString(),
        pdf: result?.pdf ?? info.pdf ?? __OPENPRESS_PDF_HREF__,
        publicUrl: result?.public_url ?? info.publicUrl,
        dirty: false,
      }));
      setStatus("deployed");
      setTimeout(() => setStatus("idle"), 3200);
    } catch (error) {
      console.error("OpenPress deploy unavailable", error);
      setStatus("unavailable");
    }
  }, [status, currentDeploymentInfo.configured]);

  const handleOpenLatestLocalPdf = useCallback(async () => {
    if (pdfActionStatus === "generating") return;
    setPdfActionStatus("generating");
    try {
      const response = await fetch("/__openpress/local-pdf-export", { method: "POST" });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Local PDF export failed with status ${response.status}`);
      }
      const result = (await response.json().catch(() => null)) as { pdf?: string } | null;
      const pdfHref = result?.pdf ?? "/__openpress/local-pdf-file";
      setPdfActionStatus("opening");
      window.setTimeout(() => window.location.assign(pdfHref), 180);
    } catch (error) {
      console.error("OpenPress local PDF export failed", error);
      setPdfActionStatus("failed");
    }
  }, [pdfActionStatus]);

  const handleOpenWorkbenchPdf = useCallback(() => {
    if (localDeployEnabled) {
      void handleOpenLatestLocalPdf();
      return;
    }
    if (!staticPdfHref) return;
    window.open(staticPdfHref, "_blank", "noopener,noreferrer");
  }, [handleOpenLatestLocalPdf, localDeployEnabled, staticPdfHref]);

  return {
    status,
    pdfActionStatus,
    currentDeploymentInfo,
    staticPdfHref,
    localDeployEnabled,
    pdfButtonText,
    pdfButtonDisabled,
    pdfStatusMessage,
    pdfToolbarExpanded,
    handleDeploy,
    handleOpenWorkbenchPdf,
  };
}
