import type { ReactNode } from "react";
import { FOOTER } from "../copy/en";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="mx-auto w-full max-w-[var(--max)] px-8 py-8 flex-1">{children}</main>
      <footer className="border-t border-border px-8 py-6 text-small text-muted">{FOOTER}</footer>
    </div>
  );
}
