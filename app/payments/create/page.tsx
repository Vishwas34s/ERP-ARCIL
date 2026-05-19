'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { usePaymentRecords } from '@/lib/payment-store';
import { useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { money } from '@/lib/utils';
import { ArrowLeft, Banknote, CheckCircle2, FileText, Save } from 'lucide-react';

const paymentMethods = ['RTGS', 'NEFT', 'UPI', 'Cheque', 'Manual Bank Transfer'] as const;

type PaymentMethod = (typeof paymentMethods)[number];

type PaymentForm = {
  invoiceId: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  beneficiaryName: string;
  amount: number;
  currency: string;
  paymentMode: PaymentMethod;
  bankName: string;
  bankAccountMasked: string;
  ifsc: string;
  utrNo: string;
  clearingChannel: string;
  failureReason: string;
  retryCount: number;
  initiatedBy: string;
  approvedBy: string;
  remittanceNote: string;
  taxDeduction: number;
  bankCharge: number;
  netPaid: number;
  ledgerStatus: string;
  erpSyncStatus: string;
  holdFlag: string;
  holdReason: string;
  priority: 'Low' | 'Medium' | 'High';
  paymentGateway: string;
  remarks: string;
  status: 'Pending' | 'Ready' | 'Processing' | 'Success' | 'Failed' | 'Hold' | 'Cancelled';
};

const emptyForm: PaymentForm = {
  invoiceId: '',
  invoiceNumber: '',
  vendorId: '',
  vendorName: '',
  beneficiaryName: '',
  amount: 0,
  currency: 'INR',
  paymentMode: 'NEFT',
  bankName: '',
  bankAccountMasked: '',
  ifsc: '',
  utrNo: '',
  clearingChannel: 'NPCI',
  failureReason: '',
  retryCount: 0,
  initiatedBy: 'Treasury Desk',
  approvedBy: '',
  remittanceNote: 'Invoice settlement',
  taxDeduction: 0,
  bankCharge: 0,
  netPaid: 0,
  ledgerStatus: 'Pending',
  erpSyncStatus: 'Pending',
  holdFlag: 'No',
  holdReason: '',
  priority: 'Medium',
  paymentGateway: 'Core Banking',
  remarks: '',
  status: 'Pending',
};

function InputField({ label, value, onChange, type = 'text', required = true, help }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean; help?: string }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400/30"
      />
      {help && <div className="mt-2 text-xs text-slate-500">{help}</div>}
    </label>
  );
}

export default function CreatePaymentPage() {
  const user = useDemoUser();
  const params = useSearchParams();
  const invoiceId = params?.get('invoiceId') ?? '';
  const router = useRouter();
  const toast = useToast();
  const { items, update } = useWorkflowItems();
  const { create } = usePaymentRecords();
  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const selectedItem = useMemo(() => items.find((item) => item.id === invoiceId), [items, invoiceId]);
  const existingPending = items.filter((item) => item.paymentStatus === 'Ready' || item.status === 'Queued for Payment').length;

  useEffect(() => {
    if (selectedItem) {
      setForm((current) => ({
        ...current,
        invoiceId: selectedItem.id,
        invoiceNumber: selectedItem.invoiceNumber,
        vendorId: `VND-${selectedItem.id}`,
        vendorName: selectedItem.vendorName,
        beneficiaryName: selectedItem.vendorName,
        amount: selectedItem.invoiceAmount,
        paymentMode: selectedItem.paymentMode,
        remittanceNote: `Settlement for ${selectedItem.invoiceNumber}`,
        priority: selectedItem.invoiceAmount > 100000 ? 'High' : selectedItem.invoiceAmount > 10000 ? 'Medium' : 'Low',
        paymentGateway: selectedItem.paymentMode === 'UPI' ? 'NPCI UPI' : selectedItem.paymentMode === 'Manual Bank Transfer' ? 'Bank Transfer' : selectedItem.paymentMode,
        netPaid: selectedItem.invoiceAmount - current.taxDeduction - current.bankCharge,
      }));
    }
  }, [selectedItem]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      netPaid: current.amount - current.taxDeduction - current.bankCharge,
    }));
  }, [form.amount, form.taxDeduction, form.bankCharge]);

  function patchForm(patch: Partial<PaymentForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.invoiceNumber || !form.vendorName || form.amount <= 0 || !form.paymentMode || !form.bankName || !form.ifsc) {
      toast({ type: 'error', title: 'Missing details', description: 'Complete invoice, vendor, bank, and payment fields before creating the payment.' });
      return;
    }

    create({
      invoiceId: form.invoiceId || `INV-${String(Date.now()).slice(-6)}`,
      invoiceNumber: form.invoiceNumber,
      vendorId: form.vendorId || `VND-${String(Date.now()).slice(-6)}`,
      vendorName: form.vendorName,
      beneficiaryName: form.beneficiaryName || form.vendorName,
      amount: form.amount,
      currency: form.currency,
      paymentMode: form.paymentMode,
      bankName: form.bankName,
      bankAccountMasked: form.bankAccountMasked || 'XXXXXX0000',
      ifsc: form.ifsc,
      utrNo: form.utrNo,
      clearingChannel: form.clearingChannel,
      status: 'Pending',
      failureReason: form.failureReason,
      retryCount: form.retryCount,
      initiatedAt: new Date().toISOString(),
      initiatedBy: form.initiatedBy || user.role,
      approvedBy: form.approvedBy || user.role,
      remittanceNote: form.remittanceNote,
      taxDeduction: form.taxDeduction,
      bankCharge: form.bankCharge,
      netPaid: form.netPaid,
      ledgerStatus: form.ledgerStatus,
      erpSyncStatus: form.erpSyncStatus,
      holdFlag: form.holdFlag,
      holdReason: form.holdReason,
      priority: form.priority,
      paymentGateway: form.paymentGateway,
      remarks: form.remarks,
    });

    if (selectedItem) {
      update(selectedItem.id, { status: 'Queued for Payment', paymentStatus: 'Ready' }, user.role);
    }

    toast({ type: 'success', title: 'Payment Created', description: `A payment instruction for ${form.invoiceNumber} is now recorded.` });
    router.push('/payments');
  }

  return (
    <div className="space-y-5">
      <Panel title="Create payment instruction" subtitle="Capture payment details for RTGS, NEFT, UPI, Cheque, or manual bank transfer with invoice and vendor linkage.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">{selectedItem ? `Preparing payment for ${selectedItem.invoiceNumber}` : 'Build a new payment instruction from scratch.'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="emerald">{selectedItem ? selectedItem.approvalLevel : 'Payment'}</Badge>
              <Badge tone={selectedItem?.status === 'Queued for Payment' ? 'emerald' : selectedItem?.status === 'Approved' ? 'cyan' : 'slate'}>{selectedItem?.status ?? 'Draft'}</Badge>
            </div>
          </div>
          <Link href="/payments" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"><ArrowLeft size={16} /> Back to payments</Link>
        </div>
      </Panel>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Invoice number" value={form.invoiceNumber} onChange={(value) => patchForm({ invoiceNumber: value })} required type="text" />
              <InputField label="Vendor name" value={form.vendorName} onChange={(value) => patchForm({ vendorName: value })} required type="text" />
              <InputField label="Payment mode" value={form.paymentMode} onChange={(value) => patchForm({ paymentMode: value as PaymentMethod })} type="text" required />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-slate-300">
                Payment method
                <select value={form.paymentMode} onChange={(event) => patchForm({ paymentMode: event.target.value as PaymentMethod })} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
                  {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <InputField label="Invoice amount" value={form.amount} onChange={(value) => patchForm({ amount: Number(value) })} type="number" required />
              <InputField label="Priority" value={form.priority} onChange={(value) => patchForm({ priority: value as PaymentForm['priority'] })} type="text" required />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Beneficiary" value={form.beneficiaryName} onChange={(value) => patchForm({ beneficiaryName: value })} required type="text" />
              <InputField label="Bank name" value={form.bankName} onChange={(value) => patchForm({ bankName: value })} required type="text" />
              <InputField label="Account masked" value={form.bankAccountMasked} onChange={(value) => patchForm({ bankAccountMasked: value })} required type="text" help="Mask the account number for security." />
              <InputField label="IFSC" value={form.ifsc} onChange={(value) => patchForm({ ifsc: value.toUpperCase() })} required type="text" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <InputField label="Tax deduction" value={form.taxDeduction} onChange={(value) => patchForm({ taxDeduction: Number(value) })} type="number" required />
              <InputField label="Bank charge" value={form.bankCharge} onChange={(value) => patchForm({ bankCharge: Number(value) })} type="number" required />
              <InputField label="UTR / Reference" value={form.utrNo} onChange={(value) => patchForm({ utrNo: value })} required={false} type="text" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Net payment</div><div className="mt-2 text-2xl font-semibold text-white">{money(form.netPaid)}</div></div>
                <Badge tone={form.status === 'Pending' ? 'amber' : 'emerald'}>{form.status}</Badge>
              </div>
              <div className="mt-3 text-sm text-slate-400">Net payment is calculated as invoice amount less tax deduction and bank charges.</div>
            </div>
            <InputField label="Clearing channel" value={form.clearingChannel} onChange={(value) => patchForm({ clearingChannel: value })} required type="text" />
            <InputField label="Payment gateway" value={form.paymentGateway} onChange={(value) => patchForm({ paymentGateway: value })} required type="text" />
            <label className="text-sm text-slate-300">
              Remittance note
              <textarea value={form.remittanceNote} onChange={(event) => patchForm({ remittanceNote: event.target.value })} className="mt-2 h-28 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/30" />
            </label>
            <label className="text-sm text-slate-300">
              Remarks
              <textarea value={form.remarks} onChange={(event) => patchForm({ remarks: event.target.value })} className="mt-2 h-24 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/30" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><Save size={16} /> Save payment</button>
              <Link href="/payments" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"><FileText size={16} /> Cancel</Link>
            </div>
          </div>
        </div>
      </form>

      <Panel title="Payment readiness" subtitle="Payments created from approved invoices retain strong linkage to the original AP workflow.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Workflow items ready</div><div className="mt-2 text-2xl font-semibold text-white">{existingPending}</div></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected invoice</div><div className="mt-2 text-2xl font-semibold text-white">{selectedItem?.invoiceNumber ?? 'None'}</div></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Vendor</div><div className="mt-2 text-2xl font-semibold text-white">{selectedItem?.vendorName ?? 'Manual entry'}</div></div>
        </div>
      </Panel>
    </div>
  );
}
