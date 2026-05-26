import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OpenPressApp } from "./openpress/app";
import "./styles/openpress.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("OpenPress renderer requires a #root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <OpenPressApp />
  </StrictMode>,
);
