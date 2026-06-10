import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { FolderKanban, MessageSquareText, type LucideIcon } from "lucide-react";
import { cn } from "../../../core/cn";

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
const DOCUMENT_PANEL_CLASS = "openpress-document-panel grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden";
const DOCUMENT_PANEL_TABS_CLASS = [
  "openpress-dev-control-tabs openpress-document-panel-tabs",
  "mx-[22px] grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[18px] border-b border-white/[0.08] pt-0.5",
].join(" ");
const DOCUMENT_PANEL_TAB_CLASS = [
  "relative inline-flex min-w-0 cursor-pointer items-center justify-start gap-1.5 border-0 bg-transparent pb-2.5",
  "text-left text-xs font-medium leading-[1.2] text-[rgb(180_186_193_/_0.72)] [font:inherit]",
  "hover:text-[rgb(242_242_240_/_0.94)]",
  "after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-px after:bg-transparent after:content-['']",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current [&_svg]:opacity-[0.78]",
  "[&_span]:max-w-full [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap",
].join(" ");
const DOCUMENT_PANEL_TAB_ACTIVE_CLASS = "is-active text-[rgb(242_242_240_/_0.94)] after:bg-[rgb(242_242_240_/_0.78)]";
const DOCUMENT_PANEL_TAB_PANEL_CLASS = "min-h-0 overflow-hidden";
const DOCUMENT_PANEL_SLOT_CLASS = "min-h-0 overflow-hidden";

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
        className={DOCUMENT_PANEL_CLASS}
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
    <div className={DOCUMENT_PANEL_TABS_CLASS} role="tablist" aria-label="側邊面板">
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
            className={cn(DOCUMENT_PANEL_TAB_CLASS, selected ? DOCUMENT_PANEL_TAB_ACTIVE_CLASS : undefined)}
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
      className={cn(DOCUMENT_PANEL_TAB_PANEL_CLASS, active ? "grid" : "hidden", className)}
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
    <DocumentPanelTabPanel value="project" className={cn("openpress-document-panel__project", DOCUMENT_PANEL_SLOT_CLASS)}>
      {children}
    </DocumentPanelTabPanel>
  );
}

function DocumentPanelPendingComments({ children }: DocumentPanelProps) {
  return (
    <DocumentPanelTabPanel value="comments" className={cn("openpress-document-panel__comments", DOCUMENT_PANEL_SLOT_CLASS)}>
      {children}
    </DocumentPanelTabPanel>
  );
}

function DocumentPanelNotes({ children }: DocumentPanelProps) {
  return (
    <DocumentPanelTabPanel value="notes" className={cn("openpress-document-panel__notes", DOCUMENT_PANEL_SLOT_CLASS)}>
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
