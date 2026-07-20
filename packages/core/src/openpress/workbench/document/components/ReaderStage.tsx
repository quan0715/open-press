import { forwardRef, type ReactNode } from "react";
import { cn } from "../../../core/cn";

const READER_STAGE_CLASS = [
  "reader-stage relative flex h-full min-h-0 w-full items-start justify-center overflow-auto overscroll-auto bg-transparent outline-none scroll-smooth",
  "[grid-area:main] [container-type:inline-size] focus:outline-none",
  "[scrollbar-width:thin] [scrollbar-color:rgb(255_255_255_/_0.18)_transparent]",
  "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[rgb(255_255_255_/_0.15)] [&::-webkit-scrollbar-thumb]:bg-clip-padding",
  "[&::-webkit-scrollbar-thumb:hover]:bg-[rgb(255_255_255_/_0.28)] [&::-webkit-scrollbar-corner]:bg-transparent",
].join(" ");

export const ReaderStage = forwardRef<HTMLElement, { children: ReactNode; className?: string }>(function ReaderStage({ children, className }, ref) {
  return (
    <main className={cn(READER_STAGE_CLASS, className)} tabIndex={-1} ref={ref}>
      {children}
    </main>
  );
});
