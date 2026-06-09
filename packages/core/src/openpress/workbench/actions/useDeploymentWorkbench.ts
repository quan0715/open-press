import { useCallback, useMemo, useState } from "react";
import { isLocalWorkspaceHost } from "../../shared";
import type { DeploymentInfo } from "../../document-model";
import type { DeployStatus, PdfActionStatus } from "../workbenchTypes";
import { parseDeployError, workbenchPdfButtonText, workbenchPdfStatusMessage } from "./deploymentStatusModel";

export interface UseDeploymentWorkbenchOptions {
  deploymentInfo: DeploymentInfo;
  // Active Press slug — when present the local PDF export endpoint
  // tells the CLI to export this Press (open-press pdf . --press <slug>)
  // instead of defaulting to the first Press. Empty / null means the
  // workspace has only one Press, or the workbench is at the gallery
  // root, and the CLI default is correct.
  pressSlug?: string | null;
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
  handleOpenWorkbenchPdf: (pageIndexes?: number[]) => void;
}

export function useDeploymentWorkbench({ deploymentInfo, pressSlug = null }: UseDeploymentWorkbenchOptions): DeploymentWorkbench {
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
      const requestBody = pressSlug ? { press: pressSlug } : {};
      const response = await fetch("/__openpress/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
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
  }, [status, currentDeploymentInfo.configured, pressSlug]);

  const handleOpenLatestLocalPdf = useCallback(async (pageIndexes?: number[]) => {
    if (pdfActionStatus === "generating") return;
    setPdfActionStatus("generating");
    try {
      const requestBody: Record<string, unknown> = pressSlug ? { press: pressSlug } : {};
      if (pageIndexes && pageIndexes.length > 0) requestBody.pages = pageIndexes;
      const response = await fetch("/__openpress/local-pdf-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
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
  }, [pdfActionStatus, pressSlug]);

  const handleOpenWorkbenchPdf = useCallback((pageIndexes?: number[]) => {
    if (localDeployEnabled) {
      void handleOpenLatestLocalPdf(pageIndexes);
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
