import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./openpress/App";
import "./styles/openpress.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("OpenPress renderer requires a #root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
