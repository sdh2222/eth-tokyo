import { useState, type ReactNode } from "react";

export function ShowRaw({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="text-body">{summary}</p>
      <button type="button" className="text-body text-muted" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide raw" : "Show raw"}
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
