'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge, MetricCard, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { usePaymentRecords } from '@/lib/payment-store';
import { money } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, PauseCircle, Plus, Search, WalletCards } from 'lucide-react';

const pageSize = 7;

function paymentTone(status: string) {
  if (status === 'Paid' || status === 'Ready' || status === 'Success') return 'emerald' as const;
  if (status === 'Failed' || status === 'Payment Failed') return 'rose' as const;
  if (status === 'Hold' || status === 'On Hold') return 'amber' as const;
  return 'slate' as const;
}

export default function PaymentsPage() {
  const user = useDemoUser();
  const { items, update } = useWorkflowItems();
  const { records } = usePaymentRecords();
  const params = useSearchParams();
  const invoiceId = params?.get('invoiceId') ?? '';
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () => items.filter((item) => ['Queued for Payment', 'Paid', 'Payment Failed'].includes(item.status) || ['Ready', 'Paid', 'Failed'].includes(item.paymentStatus)),
    [items],
  );
  const readyRows = rows.filter((item) => item.paymentStatus === 'Ready');
  const paid = rows.filter((item) => item.paymentStatus === 'Paid').length;
  const failedCount = rows.filter((item) => item.paymentStatus === 'Failed').length;
  const heldCount = rows.filter((item) => item.paymentStatus === 'Hold').length;
  const invoiceRecords = useMemo(() => (invoiceId ? records.filter((record) => record.invoiceId === invoiceId) : []), [invoiceId, records]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((item) => {
      const byStatus = statusFilter === 'All' || item.paymentStatus === statusFilter || item.status === statusFilter;
      const phrase = `${item.invoiceNumber} ${item.vendorName} ${item.paymentMode} ${item.status} ${item.paymentStatus}`.toLowerCase();
      return byStatus && (!q || phrase.includes(q));
    });
  }, [query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function execute(item: WorkflowItem, result: 'success' | 'failed' | 'hold') {
    if (result === 'success') {
      update(item.id, { status: 'Paid', paymentStatus: 'Paid', erpSyncStatus: 'Synced' }, user.role);
      toast({ type: 'success', title: 'Payment completed', description: `${item.invoiceNumber} was paid and synced to ERP.` });
    }
    if (result === 'failed') {
      update(item.id, { status: 'Payment Failed', paymentStatus: 'Failed', erpSyncStatus: 'Pending' }, user.role);
      toast({ type: 'error', title: 'Payment failed', description: `${item.invoiceNumber} needs retry or investigation.` });
    }
    if (result === 'hold') {
      update(item.id, { status: 'On Hold', paymentStatus: 'Hold', erpSyncStatus: 'Pending' }, user.role);
      toast({ type: 'warning', title: 'Payment held', description: `${item.invoiceNumber} was placed on hold.` });
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Payment workspace"
        subtitle="Finance Head creates payment instructions only for invoices already approved by L1, L2, or L3."
        action={<Link href="/payments/create" className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><Plus size={16} />Create payment</Link>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Approved ready" value={readyRows.length} icon={<WalletCards size={18} />} tone="cyan" />
          <MetricCard label="Paid and synced" value={paid} icon={<CheckCircle2 size={18} />} tone="emerald" />
          <MetricCard label="Failures" value={failedCount} icon={<AlertTriangle size={18} />} tone="rose" />
          <MetricCard label="Held" value={heldCount} icon={<PauseCircle size={18} />} tone="amber" />
        </div>
      </Panel>

      {invoiceId ? (
        <Panel title={`Payment history for ${invoiceRecords[0]?.invoiceNumber ?? invoiceId}`} subtitle="All payment transactions for the selected invoice.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">{invoiceRecords.length} record{invoiceRecords.length === 1 ? '' : 's'} found.</p>
            <Link href="/payments" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10">View all</Link>
          </div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-[1050px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Payment</th><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Method</th><th className="border-b border-white/10 px-3 py-3">Status</th><th className="border-b border-white/10 px-3 py-3">ERP</th><th className="border-b border-white/10 px-3 py-3">Initiated</th></tr></thead>
              <tbody>{invoiceRecords.map((record) => <tr key={record.id} className="hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{record.id}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{record.invoiceNumber}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{record.vendorName}</td><td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(record.amount)}</td><td className="border-b border-white/5 px-3 py-4"><Badge tone="violet">{record.paymentMode}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={paymentTone(record.status)}>{record.status}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={record.erpSyncStatus === 'Synced' ? 'emerald' : 'amber'}>{record.erpSyncStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4 text-slate-400">{new Date(record.initiatedAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel
        title={`Approved payment queue (${filteredRows.length})`}
        subtitle="Filter and paginate invoices approved by L1/L2/L3 before creating or executing payments."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search invoice, vendor..." className="w-72 rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/30" />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {['All', 'Ready', 'Paid', 'Failed', 'Hold', 'Queued for Payment', 'Payment Failed'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Mode</th><th className="border-b border-white/10 px-3 py-3">Approval status</th><th className="border-b border-white/10 px-3 py-3">Payment status</th><th className="border-b border-white/10 px-3 py-3">ERP</th><th className="border-b border-white/10 px-3 py-3">Action</th></tr></thead>
            <tbody>
              {pageRows.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.invoiceNumber}<div className="text-xs text-slate-500">{item.approvalLevel} approved route</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.vendorName}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(item.invoiceAmount)}<div className="text-xs text-slate-500">GST {money(item.gstAmount)}</div></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone="violet">{item.paymentMode}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.status === 'Payment Failed' ? 'rose' : item.status === 'On Hold' ? 'amber' : 'emerald'}>{item.status}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={paymentTone(item.paymentStatus)}>{item.paymentStatus}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.erpSyncStatus === 'Synced' ? 'emerald' : 'amber'}>{item.erpSyncStatus}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      {item.paymentStatus === 'Ready' && <Link href={`/payments/create?invoiceId=${encodeURIComponent(item.id)}`} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Create</Link>}
                      <button onClick={() => execute(item, 'success')} className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/15">Success</button>
                      <button onClick={() => execute(item, 'failed')} className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/15">Fail</button>
                      <button onClick={() => execute(item, 'hold')} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/15">Hold</button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">No approved payment items match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-400">Page {currentPage} of {totalPages}</div>
          <div className="flex gap-2">
            <button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Previous</button>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </Panel>

      <Panel title={`Payment ledger (${records.length})`} subtitle="Created payment instructions remain searchable from the payment records store.">
        <div className="overflow-auto">
          <table className="min-w-[1050px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Payment</th><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Method</th><th className="border-b border-white/10 px-3 py-3">Status</th><th className="border-b border-white/10 px-3 py-3">Action</th></tr></thead>
            <tbody>{records.slice(0, 8).map((record) => <tr key={record.id} className="hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{record.id}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{record.invoiceNumber}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{record.vendorName}</td><td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(record.amount)}</td><td className="border-b border-white/5 px-3 py-4"><Badge tone="violet">{record.paymentMode}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={paymentTone(record.status)}>{record.status}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Link href={`/payments/create?invoiceId=${encodeURIComponent(record.invoiceId)}`} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15">Open</Link></td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
