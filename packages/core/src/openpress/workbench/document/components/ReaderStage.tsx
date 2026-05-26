import { forwardRef, type ReactNode } from "react";

export const ReaderStage = forwardRef<HTMLElement, { children: ReactNode }>(function ReaderStage({ children }, ref) {
  return (
    <main className="reader-stage" tabIndex={-1} ref={ref}>
      {children}
    </main>
  );
});
