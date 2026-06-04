import { Frame } from "@open-press/core";
import type { ReactNode } from "react";

export function SocialFrame({
  frameKey,
  variant,
  chip,
  meta,
  children,
}: {
  frameKey: string;
  variant: "cover" | "model" | "workflow";
  chip: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <Frame
      frameKey={frameKey}
      role="canvas.card"
      chrome={false}
      className="reader-page--social-test"
      data-page-title={chip}
    >
      <div className={`social-magazine social-magazine--${variant}`}>
        <div className="social-magazine__grain" aria-hidden="true" />
        {variant === "cover" ? <div className="social-magazine__cover-art" aria-hidden="true" /> : null}
        <header className="social-magazine__header">
          <span className="social-magazine__issue">OpenPress</span>
          <span className="social-magazine__dot" aria-hidden="true" />
          <span>{meta}</span>
        </header>
        <main className="social-magazine__content">{children}</main>
        <footer className="social-magazine__footer">
          <span>{chip}</span>
          <span>hello.openpress</span>
        </footer>
      </div>
    </Frame>
  );
}

export default SocialFrame;
