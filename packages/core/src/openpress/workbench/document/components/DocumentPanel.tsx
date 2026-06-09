import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { FolderKanban, MessageSquareText, type LucideIcon } from "lucide-react";

type DocumentPanelProps = {
  children: ReactNode;
};

type DocumentPanelTabValue = "comments" | "project" | "notes";

type DocumentPanelContextValue = {
  activeTab: DocumentPanelTabValue;
  setActiveTab: (tab: DocumentPanelTabValue) => void;
  baseId: string;
};

const DocumentPanelContext = createContext<DocumentPanelContextValue | null>(null);

const PANEL_TABS: Array<{ value: DocumentPanelTabValue; label: string; icon: LucideIcon }> = [
  { value: "comments", label: "註解", icon: MessageSquareText },
  { value: "notes", label: "Notes", icon: MessageSquareText },
  { value: "project", label: "Project", icon: FolderKanban },
];

function useDocumentPanel() {
  const value = useContext(DocumentPanelContext);
  if (!value) throw new Error("DocumentPanel compound components must be rendered inside <DocumentPanel>.");
  return value;
}

function DocumentPanelRoot({ children }: DocumentPanelProps) {
  const reactId = useId();
  const [activeTab, setActiveTab] = useState<DocumentPanelTabValue>("comments");
  const baseId = `openpress-document-panel-${reactId.replaceAll(":", "")}`;

  return (
    <DocumentPanelContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <section
        className="openpress-document-panel"
        data-openpress-document-panel
        data-openpress-document-panel-tab={activeTab}
      >
        {children}
      </section>
    </DocumentPanelContext.Provider>
  );
}

function DocumentPanelTabs() {
  const { activeTab, setActiveTab, baseId } = useDocumentPanel();

  return (
    <div className="openpress-dev-control-tabs openpress-document-panel-tabs" role="tablist" aria-label="側邊面板">
      {PANEL_TABS.map((item) => {
        const Icon = item.icon;
        const selected = activeTab === item.value;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${baseId}-${item.value}`}
            id={`${baseId}-${item.value}-tab`}
            className={selected ? "is-active" : undefined}
            key={item.value}
            onClick={() => setActiveTab(item.value)}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DocumentPanelTabPanel({
  value,
  className,
  children,
}: DocumentPanelProps & {
  value: DocumentPanelTabValue;
  className?: string;
}) {
  const { activeTab, baseId } = useDocumentPanel();
  const active = activeTab === value;

  return (
    <section
      id={`${baseId}-${value}`}
      className={className}
      role="tabpanel"
      aria-labelledby={`${baseId}-${value}-tab`}
      data-openpress-document-panel-tab-panel={value}
      data-active={active ? "true" : "false"}
      hidden={!active}
    >
      {children}
    </section>
  );
}

function DocumentPanelProject({ children }: DocumentPanelProps) {
  return (
    <DocumentPanelTabPanel value="project" className="openpress-document-panel__project">
      {children}
    </DocumentPanelTabPanel>
  );
}

function DocumentPanelPendingComments({ children }: DocumentPanelProps) {
  return (
    <DocumentPanelTabPanel value="comments" className="openpress-document-panel__comments">
      {children}
    </DocumentPanelTabPanel>
  );
}

function DocumentPanelNotes({ children }: DocumentPanelProps) {
  return (
    <DocumentPanelTabPanel value="notes" className="openpress-document-panel__notes">
      {children}
    </DocumentPanelTabPanel>
  );
}

function DocumentPanelSlot({ children }: DocumentPanelProps) {
  return <>{children}</>;
}

export const DocumentPanel = Object.assign(DocumentPanelRoot, {
  Tabs: DocumentPanelTabs,
  Project: DocumentPanelProject,
  PendingComments: DocumentPanelPendingComments,
  Notes: DocumentPanelNotes,
  Actions: DocumentPanelSlot,
  CurrentPage: DocumentPanelSlot,
});
