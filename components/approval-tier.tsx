import { approvalTier } from '@/lib/data';
import { Badge } from './ui';
import { money } from '@/lib/utils';
export function ApprovalTier({ amount }: { amount: number }) {
  const tier = approvalTier(amount);

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Approver routing</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{money(amount)}</div>
          <div className="text-xs text-slate-400">Auto-routed to {tier.level}</div>
        </div>
        <Badge tone="cyan">{tier.role}</Badge>
      </div>
    </div>
  );
}
