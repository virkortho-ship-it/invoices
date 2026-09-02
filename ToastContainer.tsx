import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let borderClass = 'border-slate-200 bg-white text-slate-800';
        let icon = <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-200 bg-white text-slate-800';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-200 bg-white text-slate-800';
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-200 bg-white text-slate-800';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-150 ${borderClass}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
