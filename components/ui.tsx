'use client';
import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
export function Panel({ id, title, subtitle, action, children, className }: { id?: string; title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section id={id} className={cn('rounded-lg border border-white/10 bg-white/5 p-4 shadow-glow backdrop-blur-xl sm:p-5', className)}>{(title || subtitle || action) && <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4"><div>{title && <h2 className="text-base font-semibold text-slate-100 sm:text-lg">{title}</h2>}{subtitle && <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>}</div>{action}</div>}{children}</section>;
}
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' }) {
  const tones: Record<string, string> = { slate: 'border-white/10 bg-white/5 text-slate-200', emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300', rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300', cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300', violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300' };
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', tones[tone])}>{children}</span>;
}
export function StatCard({ label, value, delta, icon }: { label: string; value: string; delta?: string; icon?: ReactNode }) { return <div className="rounded-lg border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl"><div className="flex items-center justify-between gap-3 text-slate-300">{icon}<span className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span></div><div className="mt-4 text-2xl font-semibold text-white sm:text-3xl">{value}</div>{delta && <div className="mt-2 text-sm text-cyan-300">{delta}</div>}</div>; }
export function Progress({ value, tone = 'cyan' }: { value: number; tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' }) {
  const colors = { cyan: 'from-cyan-300 to-sky-400', emerald: 'from-emerald-300 to-teal-400', amber: 'from-amber-300 to-orange-400', rose: 'from-rose-300 to-red-400', violet: 'from-violet-300 to-fuchsia-400' };
  return <div className="h-2 w-full overflow-hidden rounded-full bg-white/10"><div className={cn('h-2 rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out', colors[tone])} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} /></div>;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Clear Data',
  cancelText = 'Cancel',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { e.key === 'Escape' && onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm transition-all duration-300" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-white"><AlertTriangle size={18} className="text-rose-400" /> {title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={20} /></button>
        </div>
        <div className="p-6">
          <p className="text-sm leading-7 text-slate-400">{description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10">{cancelText}</button>
            <button onClick={() => { onConfirm(); onClose(); }} className="rounded-lg bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600 active:scale-95">{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
