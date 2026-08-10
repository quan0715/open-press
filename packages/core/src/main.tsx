import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OpenPressApp } from "./openpress/app";
import { HotkeyProvider } from "./openpress/hotkeys";
import { WorkspaceAppearanceProvider } from "./openpress/app/workspaceAppearance";
import "./styles/openpress.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("OpenPress renderer requires a #root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <HotkeyProvider>
      <WorkspaceAppearanceProvider>
        <OpenPressApp />
      </WorkspaceAppearanceProvider>
    </HotkeyProvider>
  </StrictMode>,
);
