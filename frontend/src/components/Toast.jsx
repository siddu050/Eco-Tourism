import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, Heart, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  favorite: Heart,
  sparkle: Sparkles,
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const IconComponent = toastIcons[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast-item toast-item--${toast.type || 'info'}`}>
            <div className="toast-item__icon">
              <IconComponent size={18} />
            </div>
            <div className="toast-item__content">
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-item__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
            {toast.duration > 0 && (
              <div
                className="toast-item__progress"
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
