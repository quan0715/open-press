import { forwardRef, type ReactNode } from "react";
import { cn } from "../../../core/cn";

const READER_STAGE_CLASS = [
  "reader-stage relative flex h-full min-h-0 w-full items-start justify-center overflow-auto overscroll-auto bg-transparent outline-none scroll-smooth",
  "[grid-area:main] [container-type:inline-size] focus:outline-none",
  "![scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");

export const ReaderStage = forwardRef<HTMLElement, { children: ReactNode; className?: string }>(function ReaderStage({ children, className }, ref) {
  return (
    <main className={cn(READER_STAGE_CLASS, className)} tabIndex={-1} ref={ref}>
      {children}
    </main>
  );
});
