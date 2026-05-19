'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { evaluateWorkflowMatch, matchBadgeTone } from '@/lib/matching';
import { useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { money } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Eye, PauseCircle, Search, X, XCircle, Wallet } from 'lucide-react';

function toneForStatus(status: WorkflowItem['status']) {
  if (status === 'Approved' || status === 'Queued for Payment' || status === 'Paid') return 'emerald';
  if (status === 'Rejected' || status === 'Payment Failed') return 'rose';
  if (status === 'On Hold') return 'amber';
  return 'cyan';
}

function DetailField({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-1 break-words text-slate-200">{value}</div></div>;
}

function ApprovalDetail({ item, onClose }: { item: WorkflowItem; onClose: () => void }) {
  const result = evaluateWorkflowMatch(item);
  const feeDetails = [
    ['PO base amount', money(item.poAmount)],
    ['Invoice amount', money(item.invoiceAmount)],
    ['GST amount', money(item.gstAmount)],
    ['Gross with GST', money(item.invoiceAmount + item.gstAmount)],
    ['Amount variance', money(item.invoiceAmount - item.poAmount)],
    ['Quantity variance', item.grnQty - item.poQty],
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07111f] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge>
              <Badge tone={toneForStatus(item.status)}>{item.status}</Badge>
              <Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">{item.invoiceNumber}</h2>
            <p className="mt-1 text-sm text-slate-400">{item.vendorName} - {item.poNumber} / {item.grnNumber}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10" aria-label="Close approval detail"><X size={17} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
            <section className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">Invoice summary</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailField label="Invoice date" value={item.invoiceDate} />
                  <DetailField label="Payment mode" value={item.paymentMode} />
                  <DetailField label="Approval route" value={item.approvalLevel} />
                  <DetailField label="Payment status" value={item.paymentStatus} />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="text-sm font-semibold text-white">3-way comparison result</div>
                  <Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {result.variances.length ? result.variances.map((variance, index) => (
                    <div key={`${variance.field}-${index}`} className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-100"><AlertTriangle size={16} />{variance.field} mismatch</div>
                      <div className="mt-2 text-xs leading-5 text-slate-300">Expected: {variance.expected}</div>
                      <div className="text-xs leading-5 text-slate-300">Actual: {variance.actual}</div>
                    </div>
                  )) : <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">PO, GRN, and invoice values are consistent.</div>}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">PO / GRN / Invoice details</div>
                <div className="mt-4 overflow-auto">
                  <table className="min-w-[640px] w-full border-separate border-spacing-0 text-left text-sm">
                    <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-2">Document</th><th className="border-b border-white/10 px-3 py-2">Reference</th><th className="border-b border-white/10 px-3 py-2">Amount</th><th className="border-b border-white/10 px-3 py-2">Qty</th></tr></thead>
                    <tbody>
                      <tr><td className="border-b border-white/5 px-3 py-3 text-slate-300">Purchase order</td><td className="border-b border-white/5 px-3 py-3 text-white">{item.poNumber}</td><td className="border-b border-white/5 px-3 py-3 text-slate-300">{money(item.poAmount)}</td><td className="border-b border-white/5 px-3 py-3 text-slate-300">{item.poQty}</td></tr>
                      <tr><td className="border-b border-white/5 px-3 py-3 text-slate-300">GRN / challan</td><td className="border-b border-white/5 px-3 py-3 text-white">{item.grnNumber} / {item.challanNumber}</td><td className="border-b border-white/5 px-3 py-3 text-slate-300">-</td><td className="border-b border-white/5 px-3 py-3 text-slate-300">{item.grnQty}</td></tr>
                      <tr><td className="border-b border-white/5 px-3 py-3 text-slate-300">Invoice</td><td className="border-b border-white/5 px-3 py-3 text-white">{item.invoiceNumber}</td><td className="border-b border-white/5 px-3 py-3 text-slate-300">{money(item.invoiceAmount)}</td><td className="border-b border-white/5 px-3 py-3 text-slate-300">{item.grnQty}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">Vendor details</div>
                <div className="mt-4 grid gap-3">
                  <DetailField label="Vendor name" value={item.vendorName} />
                  <DetailField label="Last action by" value={item.lastActionBy} />
                  <DetailField label="Updated at" value={item.updatedAt} />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">Fee details</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {feeDetails.map(([label, value]) => <DetailField key={label as string} label={label as string} value={value} />)}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">Approval metadata</div>
                <div className="mt-4 grid gap-3">
                  <DetailField label="Workflow ID" value={item.id} />
                  <DetailField label="ERP sync" value={item.erpSyncStatus} />
                  <DetailField label="Review required" value={result.status === 'Variance Detected' ? 'Yes' : 'No'} />
                  {item.paymentStatus === 'Ready' && (
                    <div className="mt-3 flex items-center gap-2">
                      <Link href={`/payments/create?invoiceId=${encodeURIComponent(item.id)}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200"><Wallet size={14} />Create payment</Link>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const user = useDemoUser();
  const { items, update } = useWorkflowItems();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WorkflowItem | null>(null);
  const isAdmin = user.key === 'admin';
  const myRows = useMemo(() => {
    const base = isAdmin ? items : items.filter((item) => item.approvalLevel === user.level);
    return base.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  }, [items, query, user.level, isAdmin]);
  const counts = ['L1', 'L2', 'L3'].map((level) => ({ level, count: items.filter((item) => item.approvalLevel === level).length }));

  function decide(item: WorkflowItem, status: WorkflowItem['status']) {
    const result = evaluateWorkflowMatch(item);
    if (status === 'Approved' && result.status === 'Variance Detected') {
      toast({ type: 'warning', title: 'Review Required', description: `${item.invoiceNumber} has variance details. Place it on hold or review before approval.` });
      return;
    }

    const queueStatus = status === 'Approved' ? 'Queued for Payment' : status;
    const paymentStatus = status === 'Approved' ? 'Ready' : status === 'On Hold' ? 'Hold' : 'Not Ready';
    update(item.id, { status: queueStatus, paymentStatus }, user.role);
    toast({
      type: status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'warning',
      title: status === 'Approved' ? 'Approval Submitted' : status === 'Rejected' ? 'Approval Rejected' : 'Approval On Hold',
      description: `${item.invoiceNumber} updated by ${user.role}.`,
    });
  }

  return (
    <div className="space-y-5">
      <Panel title="Phase 4: Approval workflow" subtitle="Amount-based routing with live approve, reject, hold, and detailed comparison actions.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Logged in</div><div className="mt-2 text-lg font-semibold text-white">{user.role}</div><div className="mt-1 text-sm text-slate-400">{isAdmin ? 'All queues visible' : `${user.level} queue only`}</div></div>
          {counts.map((entry) => <div key={entry.level} className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.level} invoices</div><div className="mt-2 text-2xl font-semibold text-white">{entry.count}</div><div className="mt-1 text-sm text-slate-400">{entry.level === 'L1' ? '<= INR 10,000' : entry.level === 'L2' ? 'INR 10,001 - 1,00,000' : '> INR 1,00,000'}</div></div>)}
        </div>
      </Panel>

      <Panel>
        <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, vendor, PO, GRN, level, status..." className="w-full rounded-lg border border-white/10 bg-slate-950/50 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/30" /></div>
      </Panel>

      <Panel title={`Approval table (${myRows.length})`} subtitle="The eye action opens PO, GRN, invoice, and variance details for the selected approval item.">
        <div className="overflow-auto">
          <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">View</th><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">PO / GRN</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Level</th><th className="border-b border-white/10 px-3 py-3">Match</th><th className="border-b border-white/10 px-3 py-3">Status</th><th className="border-b border-white/10 px-3 py-3">Last action</th><th className="border-b border-white/10 px-3 py-3">Action</th></tr></thead>
            <tbody>{myRows.map((item) => {
              const result = evaluateWorkflowMatch(item);
              return (
                <tr key={item.id} className="transition hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4"><button onClick={() => setSelected(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 transition hover:bg-white/10" aria-label={`View details for ${item.invoiceNumber}`}><Eye size={17} /></button></td>
                  <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.invoiceNumber}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.vendorName}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.poNumber} / {item.grnNumber}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(item.invoiceAmount)}</td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><div className="flex flex-wrap gap-2"><Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>{result.variances.slice(0, 2).map((variance, index) => <Badge key={`${variance.field}-${index}`} tone={variance.severity === 'critical' ? 'rose' : 'amber'}>{variance.field}</Badge>)}</div></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={toneForStatus(item.status)}>{item.status}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-400">{item.lastActionBy}</td>
                  <td className="border-b border-white/5 px-3 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => decide(item, 'Approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-200"><CheckCircle2 size={14} />Approve</button><button onClick={() => decide(item, 'Rejected')} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15"><XCircle size={14} />Reject</button><button onClick={() => decide(item, 'On Hold')} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/15"><PauseCircle size={14} />Hold</button>{item.paymentStatus === 'Ready' && <Link href={`/payments/create?invoiceId=${encodeURIComponent(item.id)}`} className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/15"><Wallet size={14} />Pay</Link>}</div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </Panel>
      {selected && <ApprovalDetail item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
