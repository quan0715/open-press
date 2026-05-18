import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QDocApp } from "./qdoc/QDocApp";
import "./styles/qdoc.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("QDoc renderer requires a #root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <QDocApp />
  </StrictMode>,
);
