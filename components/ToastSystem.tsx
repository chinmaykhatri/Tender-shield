'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'ai' | 'blockchain';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: Toast = { ...toast, id, timestamp: new Date() };
    setToasts(prev => [...prev, newToast]);
    const duration = toast.duration ?? 6000;
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

const typeConfig: Record<ToastType, { icon: string; gradient: string; border: string; glow: string }> = {
  success:    { icon: '✅', gradient: 'linear-gradient(135deg, #059669, #10b981)', border: '#22c55e', glow: 'rgba(34,197,94,0.3)' },
  error:      { icon: '❌', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', border: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
  warning:    { icon: '⚠️', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', border: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  info:       { icon: 'ℹ️', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  ai:         { icon: '🧠', gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  blockchain: { icon: '⛓️', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: '#6366f1', glow: 'rgba(99,102,241,0.4)' },
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 12,
      pointerEvents: 'none', maxWidth: 420,
    }}>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastGlow {
          0%, 100% { box-shadow: 0 4px 20px var(--glow-color); }
          50% { box-shadow: 0 4px 35px var(--glow-color), 0 0 60px var(--glow-color); }
        }
        .toast-progress {
          position: absolute; bottom: 0; left: 0; height: 3px;
          border-radius: 0 0 16px 16px;
          animation: toastProgress var(--duration) linear forwards;
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {toasts.map(toast => {
        const cfg = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1), toastGlow 2s ease-in-out 3',
              ['--glow-color' as string]: cfg.glow,
              ['--duration' as string]: `${(toast.duration ?? 6000)}ms`,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${cfg.border}44`,
              borderRadius: 16,
              padding: '14px 18px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${cfg.glow}`,
            }}
            onClick={() => removeToast(toast.id)}
          >
            {/* Left accent bar */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
              background: cfg.gradient, borderRadius: '16px 0 0 16px',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginLeft: 8 }}>
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${cfg.border}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 13, color: '#f1f5f9',
                  marginBottom: 2,
                }}>{toast.title}</div>
                <div style={{
                  fontSize: 12, color: '#94a3b8', lineHeight: 1.4,
                }}>{toast.message}</div>
                <div style={{
                  fontSize: 10, color: '#475569', marginTop: 4,
                }}>{toast.timestamp.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
              </div>

              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                style={{
                  background: 'none', border: 'none', color: '#475569',
                  cursor: 'pointer', fontSize: 16, padding: 4,
                  borderRadius: 8, flexShrink: 0,
                }}
              >×</button>
            </div>

            {/* Progress bar */}
            <div className="toast-progress" style={{ background: cfg.gradient }} />
          </div>
        );
      })}
    </div>
  );
}
