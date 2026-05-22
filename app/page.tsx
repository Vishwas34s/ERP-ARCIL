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
  { phase: 'Finance', title: 'Vendor Details', href: '/vendor-approvals', icon: ShieldCheck },
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
  // Overview removed from workspace for all roles.
  // This route is intentionally blank.
  return null;


}
