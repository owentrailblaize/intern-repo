'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++idRef.current;
    setToast({ id, message, type });
    timerRef.current = setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`crm-toast crm-toast-${toast.type} crm-toast-enter`} key={toast.id}>
          <span className="crm-toast-text">{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
