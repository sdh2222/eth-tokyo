import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ToastApi = { show: (text: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const api = useMemo<ToastApi>(
    () => ({
      show(next: string) {
        setText(next);
        window.setTimeout(() => setText(null), 5000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {text ? (
        <div className="fixed bottom-6 right-6 rounded-control bg-text px-4 py-3 text-body text-onfocus" role="status">
          {text}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("toast missing");
  }
  return api;
}
