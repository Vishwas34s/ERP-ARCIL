'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MiniBarChart, Ring } from '@/components/charts';
import { Badge, MetricCard, Panel, Progress } from '@/components/ui';
import { useDemoUser } from '@/lib/auth';
import { demoData } from '@/lib/data';
import { usePaymentRecords } from '@/lib/payment-store';
import { usePurchaseOrders } from '@/lib/purchase-order-store';
import { useManagedUsers } from '@/lib/user-store';
import { useVendors } from '@/lib/vendor-store';
import { useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { money } from '@/lib/utils';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  GitBranch,
  Search,
  ShieldCheck,
  Truck,
  UsersRound,
  WalletCards,
} from 'lucide-react';

const phaseLinks = [
  { phase: 'Finance', title: 'Vendor approvals', href: '/vendor-approvals', icon: ShieldCheck },
  { phase: 'Admin', title: 'User management', href: '/users', icon: UsersRound },
  { phase: 'Phase 1', title: 'Vendor PO/GRN/Invoice data', href: '/vendors', icon: Truck },
  { phase: 'Phase 2', title: 'Invoice processing', href: '/invoices', icon: FileText },
  { phase: 'Phase 3', title: '3-way matching', href: '/matching', icon: GitBranch },
  { phase: 'Phase 4', title: 'Approval workflow', href: '/approvals', icon: ShieldCheck },
  { phase: 'Phase 5/6', title: 'Payment and post-payment', href: '/payments', icon: WalletCards },
];

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function sumAmount(items: WorkflowItem[]) {
  return items.reduce((sum, item) => sum + item.invoiceAmount, 0);
}

function statusTone(status: WorkflowItem['status']) {
  if (status === 'Approved' || status === 'Paid' || status === 'Queued for Payment') return 'emerald' as const;
  if (status === 'Rejected' || status === 'Payment Failed') return 'rose' as const;
  if (status === 'On Hold') return 'amber' as const;
  return 'cyan' as const;
}

function paymentTone(status: WorkflowItem['paymentStatus']) {
  if (status === 'Paid' || status === 'Ready') return 'emerald' as const;
  if (status === 'Failed') return 'rose' as const;
  if (status === 'Hold') return 'amber' as const;
  return 'slate' as const;
}

function RouteBar({ label, count, value, total }: { label: string; count: number; value: number; total: number }) {
  const tone = label === 'L1' ? 'cyan' : label === 'L2' ? 'violet' : 'amber';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="text-slate-400">{count} invoices / {money(value)}</span>
      </div>
      <Progress value={percent(value, total)} tone={tone} />
    </div>
  );
}

function InsightRow({ label, value, helper, tone = 'slate' }: { label: string; value: string; helper: string; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{label}</div>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-400">{helper}</div>
    </div>
  );
}

export default function Dashboard() {
  const user = useDemoUser();
  const { items } = useWorkflowItems();
  const { vendors } = useVendors();
  const { records: payments } = usePaymentRecords();
  const { items: purchaseOrders } = usePurchaseOrders();
  const { users } = useManagedUsers();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const financeItems = useMemo(
    () => items.filter((item) => ['Queued for Payment', 'Paid', 'Payment Failed'].includes(item.status) || ['Ready', 'Paid', 'Failed'].includes(item.paymentStatus)),
    [items],
  );
  const visibleItems = useMemo(() => {
    if (user.key === 'admin') return items;
    if (user.key === 'finance') return financeItems;
    return items.filter((item) => item.approvalLevel === user.level);
  }, [financeItems, items, user.key, user.level]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleItems.filter((item) => {
      const byStatus = statusFilter === 'All' || item.status === statusFilter || item.paymentStatus === statusFilter || item.matchStatus === statusFilter;
      const phrase = `${item.invoiceNumber} ${item.vendorName} ${item.poNumber} ${item.grnReference} ${item.approvalLevel} ${item.status} ${item.paymentStatus}`.toLowerCase();
      return byStatus && (!q || phrase.includes(q));
    });
  }, [query, statusFilter, visibleItems]);

  const totalValue = sumAmount(visibleItems);
  const approved = items.filter((item) => item.status === 'Approved' || item.status === 'Queued for Payment').length;
  const paid = items.filter((item) => item.status === 'Paid' || item.paymentStatus === 'Paid').length;
  const hold = visibleItems.filter((item) => item.status === 'On Hold' || item.paymentStatus === 'Hold').length;
  const matchedRate = percent(items.filter((item) => item.matchStatus === 'Matched').length, items.length);
  const paymentCompletion = percent(financeItems.filter((item) => item.paymentStatus === 'Paid').length, financeItems.length);
  const vendorApprovalRate = percent(vendors.filter((vendor) => vendor.approvalStatus === 'Approved').length, vendors.length);
  const visibleExposure = sumAmount(visibleItems.filter((item) => item.status === 'Submitted' || item.status === 'On Hold'));
  const readyCash = sumAmount(financeItems.filter((item) => item.paymentStatus === 'Ready'));
  const paymentValue = payments.reduce((sum, payment) => sum + payment.netPaid, 0);
  const exceptionCount = items.filter((item) => item.matchStatus === 'Variance' || item.status === 'On Hold' || item.paymentStatus === 'Failed').length;
  const auditWarnings = demoData.audit.filter((entry) => entry.outcome !== 'Success' || entry.severity === 'High').length;

  const routeStats = (['L1', 'L2', 'L3'] as const).map((level) => {
    const routeItems = items.filter((item) => item.approvalLevel === level);
    return { level, count: routeItems.length, value: sumAmount(routeItems) };
  });
  const maxRouteValue = Math.max(...routeStats.map((entry) => entry.value), 1);

  const statusMix = [
    { label: 'Submitted', count: items.filter((item) => item.status === 'Submitted').length, tone: 'cyan' as const },
    { label: 'Approved', count: approved, tone: 'emerald' as const },
    { label: 'Hold', count: items.filter((item) => item.status === 'On Hold').length, tone: 'amber' as const },
    { label: 'Rejected/failed', count: items.filter((item) => item.status === 'Rejected' || item.status === 'Payment Failed').length, tone: 'rose' as const },
  ];

  const roleCards = user.key === 'admin'
    ? [
        { label: 'Vendors', value: String(vendors.length), helper: `${vendors.filter((vendor) => vendor.approvalStatus === 'Pending').length} waiting for finance`, tone: 'cyan' as const },
        { label: 'Purchase orders', value: String(purchaseOrders.length), helper: `${purchaseOrders.filter((po) => po.matchingStatus.includes('Ready')).length} ready for matching`, tone: 'violet' as const },
        { label: 'Managed users', value: String(users.length), helper: 'Admin, users, approvers, and finance head directory', tone: 'emerald' as const },
      ]
    : user.key === 'finance'
      ? [
          { label: 'Ready cash', value: money(readyCash), helper: 'Approved by L1/L2/L3 and waiting for payment', tone: 'cyan' as const },
          { label: 'Vendor approval', value: `${vendorApprovalRate}%`, helper: 'Approved vendor master coverage', tone: 'emerald' as const },
          { label: 'Payment ledger', value: money(paymentValue), helper: `${payments.length} created payment instructions`, tone: 'violet' as const },
        ]
      : [
          { label: 'My queue', value: String(visibleItems.length), helper: `${hold} records on hold in this approval lane`, tone: 'cyan' as const },
          { label: 'My exposure', value: money(totalValue), helper: 'Invoice value routed to this level', tone: 'amber' as const },
          { label: 'Match quality', value: `${percent(visibleItems.filter((item) => item.matchStatus === 'Matched').length, visibleItems.length)}%`, helper: 'Matched before approval action', tone: 'emerald' as const },
        ];

  const barValues = [
    vendors.length,
    demoData.invoices.length + items.length,
    items.filter((item) => item.matchStatus === 'Matched').length,
    approved,
    financeItems.length,
    paid,
  ];

  return (
    <div className="space-y-5">
      <Panel title={`Overview for ${user.role}`} subtitle={user.scope}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={user.key === 'finance' ? 'Payment records' : 'Visible records'} value={visibleItems.length} icon={<BarChart3 size={18} />} tone="cyan" />
          <MetricCard label="Visible value" value={money(totalValue)} icon={<WalletCards size={18} />} tone="amber" />
          <MetricCard label={user.key === 'finance' ? 'Ready to pay' : 'Approved'} value={user.key === 'finance' ? visibleItems.filter((item) => item.paymentStatus === 'Ready').length : approved} icon={<CheckCircle2 size={18} />} tone="emerald" />
          <MetricCard label="Exceptions" value={exceptionCount} icon={<AlertTriangle size={18} />} tone={exceptionCount ? 'rose' : 'emerald'} helper={`${auditWarnings} audit signal${auditWarnings === 1 ? '' : 's'}`} />
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Role analytics" subtitle="Live operational signals scoped to the current role.">
          <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-slate-950/45 p-4">
              <Ring value={user.key === 'finance' ? paymentCompletion : matchedRate} />
              <div className="mt-2 text-center text-xs uppercase tracking-[0.16em] text-slate-500">{user.key === 'finance' ? 'Paid rate' : 'Match rate'}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {roleCards.map((card) => <InsightRow key={card.label} label={card.label} value={card.value} helper={card.helper} tone={card.tone} />)}
            </div>
          </div>
        </Panel>

        <Panel title="Pipeline analytics" subtitle="Vendor to payment movement across the P2P flow.">
          <MiniBarChart values={barValues} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-3">
            {['Vendors', 'Invoices', 'Matched', 'Approved', 'Payments', 'Paid'].map((label, index) => (
              <div key={label} className="rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2">
                <div className="text-slate-500">{label}</div>
                <div className="mt-1 font-semibold text-slate-200">{barValues[index]}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Approval route load" subtitle="Volume and value by approval tier.">
          <div className="space-y-4">
            {routeStats.map((entry) => <RouteBar key={entry.level} label={entry.level} count={entry.count} value={entry.value} total={maxRouteValue} />)}
          </div>
        </Panel>

        <Panel title="Workflow status mix" subtitle="Approval and payment state distribution.">
          <div className="space-y-3">
            {statusMix.map((entry) => (
              <div key={entry.label} className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">{entry.label}</span>
                  <Badge tone={entry.tone}>{entry.count}</Badge>
                </div>
                <Progress value={percent(entry.count, Math.max(items.length, 1))} tone={entry.tone} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Cash and risk view" subtitle="High-signal amounts for decision making.">
          <div className="grid gap-3">
            <InsightRow label="Open exposure" value={money(visibleExposure)} helper="Submitted or held invoice value inside this role scope." tone={visibleExposure ? 'amber' : 'emerald'} />
            <InsightRow label="Ready cash" value={money(readyCash)} helper="Approved invoices that Finance Head can turn into payments." tone="cyan" />
            <InsightRow label="Payment history" value={money(paymentValue)} helper={`${payments.length} payment ledger records stored locally.`} tone="emerald" />
          </div>
        </Panel>
      </section>

      <Panel title="Role workspace" subtitle="Only pages allowed for this role are shown.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {phaseLinks.filter((phase) => user.nav.includes(phase.href)).map((phase) => {
            const Icon = phase.icon;
            return (
              <Link key={phase.href} href={phase.href} className="rounded-lg border border-white/10 bg-slate-950/45 p-4 transition hover:border-cyan-400/25 hover:bg-white/5">
                <Icon size={20} className="text-cyan-300" />
                <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">{phase.phase}</div>
                <div className="mt-1 text-sm font-semibold text-white">{phase.title}</div>
              </Link>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={user.key === 'finance' ? 'Finance payment queue' : 'Live workflow table'}
        subtitle={user.key === 'finance' ? 'Only approved invoices appear here for payment handling.' : 'Operational data scoped to this role, with search and status filtering.'}
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, vendor, PO..." className="w-72 rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/30" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {['All', 'Submitted', 'Matched', 'Variance', 'Approved', 'Queued for Payment', 'Ready', 'Paid', 'Hold', 'Failed', 'Rejected'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-[1050px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">Invoice</th>
                <th className="border-b border-white/10 px-3 py-3">Vendor</th>
                <th className="border-b border-white/10 px-3 py-3">Amount</th>
                <th className="border-b border-white/10 px-3 py-3">Route</th>
                <th className="border-b border-white/10 px-3 py-3">Match</th>
                <th className="border-b border-white/10 px-3 py-3">Approval</th>
                <th className="border-b border-white/10 px-3 py-3">Payment</th>
                <th className="border-b border-white/10 px-3 py-3">ERP</th>
                <th className="border-b border-white/10 px-3 py-3">Last action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.invoiceNumber}<div className="text-xs text-slate-500">{item.poNumber} / {item.grnReference}</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.vendorName}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(item.invoiceAmount)}<div className="text-xs text-slate-500">GST {money(item.gstAmount)}</div></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.matchStatus === 'Matched' ? 'emerald' : item.matchStatus === 'Variance' ? 'amber' : 'slate'}>{item.matchStatus}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={statusTone(item.status)}>{item.status}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={paymentTone(item.paymentStatus)}>{item.paymentStatus}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4">{item.erpSyncStatus === 'Synced' ? <CheckCircle2 size={17} className="text-emerald-300" /> : <span className="text-slate-500">Pending</span>}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-400">{item.lastActionBy}</td>
                </tr>
              ))}
              {filteredItems.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-500">No workflow records match this overview filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
