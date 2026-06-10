import { forwardRef, type ReactNode } from "react";

const READER_STAGE_CLASS = [
  "reader-stage relative flex h-full min-h-0 w-full items-start justify-center overflow-auto overscroll-auto bg-transparent outline-none scroll-smooth",
  "[grid-area:main] [container-type:inline-size] focus:outline-none",
  "snap-y snap-mandatory ![scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");

export const ReaderStage = forwardRef<HTMLElement, { children: ReactNode }>(function ReaderStage({ children }, ref) {
  return (
    <main className={READER_STAGE_CLASS} tabIndex={-1} ref={ref}>
      {children}
    </main>
  );
});
