// src/context/ToastContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
}

interface ToastContextType {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);

    // Auto dismiss after 3.2 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Fixed bottom-right toast stack */}
      <div className="fixed left-3 right-3 z-50 flex flex-col space-y-2 pointer-events-none select-none bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className="pointer-events-auto cursor-pointer p-4 rounded-xl border border-border-strong bg-canvas-card text-ink-primary text-xs shadow-xl flex items-center justify-between transition-all animate-in fade-in slide-in-from-bottom-2"
          >
            <span>{t.message}</span>
            <span className="text-ink-muted hover:text-ink-primary ml-3">
              ✕
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
