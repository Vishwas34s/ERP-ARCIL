'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { demoData } from '@/lib/data';
import { matchBadgeTone, validateManualInvoice, type InvoiceValidationResult, type ManualInvoiceDraft } from '@/lib/matching';
import { approvalLevelFor, useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { money } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, FileText, Save, Wallet, XCircle } from 'lucide-react';

const emptyDraft: ManualInvoiceDraft = {
  invoiceNumber: '',
  invoiceDate: '2026-05-18',
  vendorName: '',
  vendorGstin: '',
  invoiceAmount: 0,
  taxAmount: 0,
  gstInformation: '',
  poNumber: '',
  grnNumber: '',
  challanNumber: '',
  itemDetails: '',
  quantity: 0,
  price: 0,
  terms: 'Net 30',
  remarks: '',
  paymentMode: 'NEFT',
};

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function invoiceOutcome(invoice: (typeof demoData.invoices)[number]) {
  if (invoice.validationStatus === 'Pass' && invoice.erpSyncStatus === 'Synced') {
    return { tone: 'emerald' as const, label: 'Success', message: 'Invoice validated and synced successfully.' };
  }
  if (invoice.validationStatus === 'Fail' || invoice.erpSyncStatus === 'Failed') {
    return { tone: 'rose' as const, label: 'Failure', message: invoice.holdReason || 'Validation or ERP sync failed.' };
  }
  return { tone: 'amber' as const, label: 'Warning', message: 'Invoice needs review before final posting.' };
}

function Field({ label, value, type = 'text', onChange, required = true, placeholder }: { label: string; value: string | number; type?: string; required?: boolean; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30"
      />
    </label>
  );
}

function ValidationResult({ result }: { result: InvoiceValidationResult }) {
  return (
    <div className={`rounded-lg border p-4 ${result.valid ? result.status === 'Matched' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}>
      <div className="flex flex-wrap items-center gap-2">
        {result.valid ? result.status === 'Matched' ? <CheckCircle2 size={18} className="text-emerald-300" /> : <AlertTriangle size={18} className="text-amber-300" /> : <XCircle size={18} className="text-rose-300" />}
        <div className="font-semibold text-white">{result.valid ? result.status : 'Validation Failed'}</div>
        {result.valid && <Badge tone={matchBadgeTone(result.status)}>{result.status === 'Matched' ? 'Can move to approval' : 'Review required'}</Badge>}
      </div>
      {result.errors.length > 0 && <div className="mt-3 grid gap-2">{result.errors.map((error) => <div key={error} className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</div>)}</div>}
      {result.variances.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {result.variances.map((variance, index) => (
            <div key={`${variance.field}-${index}`} className="rounded-lg border border-amber-400/20 bg-slate-950/35 p-3 text-sm">
              <div className="font-semibold text-amber-100">{variance.field} mismatch</div>
              <div className="mt-1 text-xs leading-5 text-slate-300">Expected: {variance.expected}</div>
              <div className="text-xs leading-5 text-slate-300">Actual: {variance.actual}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const invoices = demoData.invoices.slice(0, 50);
  const { items, save } = useWorkflowItems();
  const toast = useToast();
  const [draft, setDraft] = useState<ManualInvoiceDraft>(emptyDraft);
  const [result, setResult] = useState<InvoiceValidationResult | null>(null);
  const successCount = invoices.filter((invoice) => invoiceOutcome(invoice).label === 'Success').length;
  const failureCount = invoices.filter((invoice) => invoiceOutcome(invoice).label === 'Failure').length;
  const totalValue = invoices.reduce((sum, invoice) => sum + invoice.grossAmount, 0);
  const existingInvoiceNumbers = useMemo(() => [...items.map((item) => item.invoiceNumber), ...invoices.map((invoice) => invoice.invoiceNumber)], [items, invoices]);

  function patchDraft(patch: Partial<ManualInvoiceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function validateCurrent() {
    const nextResult = validateManualInvoice(draft, items, existingInvoiceNumbers);
    setResult(nextResult);
    toast({
      type: nextResult.valid ? nextResult.status === 'Matched' ? 'success' : 'warning' : 'error',
      title: nextResult.valid ? nextResult.status : 'Validation Failed',
      description: nextResult.valid ? 'Manual invoice validation completed.' : nextResult.errors[0] ?? 'Please correct the invoice data.',
    });
    return nextResult;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextResult = validateCurrent();
    if (!nextResult.valid) return;

    const poSource = nextResult.poSource;
    const grnSource = nextResult.grnSource;
    const nextItem: WorkflowItem = {
      id: `WF-${String(Date.now()).slice(-6)}`,
      vendorName: draft.vendorName,
      poNumber: draft.poNumber,
      poAmount: poSource?.poAmount ?? draft.invoiceAmount,
      poQty: poSource?.poQty ?? draft.quantity,
      grnNumber: draft.grnNumber,
      grnQty: grnSource?.grnQty ?? draft.quantity,
      challanNumber: draft.challanNumber || grnSource?.challanNumber || draft.grnNumber,
      invoiceNumber: draft.invoiceNumber,
      invoiceDate: draft.invoiceDate,
      invoiceAmount: draft.invoiceAmount,
      gstAmount: draft.taxAmount,
      approvalLevel: approvalLevelFor(draft.invoiceAmount),
      status: nextResult.status === 'Matched' ? 'Submitted' : 'On Hold',
      matchStatus: nextResult.status === 'Matched' ? 'Matched' : 'Variance',
      paymentMode: draft.paymentMode,
      paymentStatus: nextResult.status === 'Matched' ? 'Not Ready' : 'Hold',
      erpSyncStatus: 'Pending',
      lastActionBy: 'Manual Invoice Entry',
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    save([nextItem, ...items]);
    toast({
      type: nextResult.status === 'Matched' ? 'success' : 'warning',
      title: nextResult.status === 'Matched' ? 'Invoice Submitted' : 'Variance Detected',
      description: nextResult.status === 'Matched' ? `${draft.invoiceNumber} moved to approval workflow.` : `${draft.invoiceNumber} was saved for review.`,
    });
    setDraft(emptyDraft);
  }

  return (
    <div className="space-y-5">
      <Panel title="Manual invoice entry" subtitle="Stakeholders can enter invoice data manually, validate it, then run 3-way matching against PO and GRN records.">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Field label="Invoice Number" value={draft.invoiceNumber} onChange={(value) => patchDraft({ invoiceNumber: value })} />
            <Field label="Invoice Date" type="date" value={draft.invoiceDate} onChange={(value) => patchDraft({ invoiceDate: value })} />
            <Field label="Vendor Name" value={draft.vendorName} onChange={(value) => patchDraft({ vendorName: value })} placeholder="Aster Distributor" />
            <Field label="Vendor GST Details" value={draft.vendorGstin} onChange={(value) => patchDraft({ vendorGstin: value.toUpperCase() })} placeholder="27ABCDE1234F1Z5" />
            <Field label="Invoice Amount" type="number" value={draft.invoiceAmount} onChange={(value) => patchDraft({ invoiceAmount: Number(value) })} />
            <Field label="Tax Amount" type="number" value={draft.taxAmount} onChange={(value) => patchDraft({ taxAmount: Number(value) })} />
            <Field label="GST Information" value={draft.gstInformation} onChange={(value) => patchDraft({ gstInformation: value })} placeholder="GST 18%" />
            <Field label="PO Reference Number" value={draft.poNumber} onChange={(value) => patchDraft({ poNumber: value })} placeholder="PO-1001" />
            <Field label="GRN / Delivery Challan Reference" value={draft.grnNumber} onChange={(value) => patchDraft({ grnNumber: value })} placeholder="GRN-5001" />
            <Field label="Delivery Challan Number" required={false} value={draft.challanNumber} onChange={(value) => patchDraft({ challanNumber: value })} placeholder="DC-7001" />
            <Field label="Item Details" value={draft.itemDetails} onChange={(value) => patchDraft({ itemDetails: value })} />
            <Field label="Quantity" type="number" value={draft.quantity} onChange={(value) => patchDraft({ quantity: Number(value) })} />
            <Field label="Price" type="number" value={draft.price} onChange={(value) => patchDraft({ price: Number(value) })} />
            <label className="text-sm text-slate-300">Payment Mode<select value={draft.paymentMode} onChange={(event) => patchDraft({ paymentMode: event.target.value as ManualInvoiceDraft['paymentMode'] })} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none"><option>RTGS</option><option>NEFT</option><option>Cheque</option><option>UPI</option></select></label>
            <label className="text-sm text-slate-300 md:col-span-2">Terms / Conditions<textarea required value={draft.terms} onChange={(event) => patchDraft({ terms: event.target.value })} className="mt-2 min-h-[92px] w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30" /></label>
            <label className="text-sm text-slate-300 md:col-span-2">Remarks / Notes<textarea value={draft.remarks} onChange={(event) => patchDraft({ remarks: event.target.value })} className="mt-2 min-h-[92px] w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30" /></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={validateCurrent} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"><FileText size={16} /> Validate invoice</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><Save size={16} /> Submit to workflow</button>
          </div>
          {result && <ValidationResult result={result} />}
        </form>
      </Panel>

      <Panel title="Validation overview" subtitle="Manual entries use the same workflow data shown in matching and approvals.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Manual workflow rows</div><div className="mt-2 text-2xl font-semibold text-white">{items.length}</div></div>
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Seed invoices</div><div className="mt-2 text-2xl font-semibold text-white">{invoices.length}</div></div>
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Gross value</div><div className="mt-2 text-2xl font-semibold text-white">{money(totalValue)}</div></div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4"><div className="text-xs uppercase tracking-[0.18em] text-rose-300">Historical failures</div><div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white"><XCircle size={22} className="text-rose-300" />{failureCount}</div></div>
        </div>
      </Panel>

      <Panel title="Manual invoice workflow records" subtitle="Submitted manual invoices immediately become available to matching and approval views.">
        <div className="overflow-auto">
          <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">PO</th><th className="border-b border-white/10 px-3 py-3">GRN / DC</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Match</th><th className="border-b border-white/10 px-3 py-3">Approval</th><th className="border-b border-white/10 px-3 py-3">Route</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id} className="transition hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.invoiceNumber}<div className="text-xs text-slate-500">{item.invoiceDate}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.vendorName}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.poNumber}<div className="text-xs text-slate-500">{money(item.poAmount)} | Qty {item.poQty}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.grnNumber}<div className="text-xs text-slate-500">{item.challanNumber} | Qty {item.grnQty}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(item.invoiceAmount)}<div className="text-xs text-slate-500">GST {money(item.gstAmount)}</div></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.matchStatus === 'Matched' ? 'emerald' : item.matchStatus === 'Variance' ? 'amber' : 'slate'}>{item.matchStatus === 'Variance' ? 'Variance Detected' : item.matchStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.status === 'Approved' ? 'emerald' : item.status === 'Rejected' ? 'rose' : item.status === 'On Hold' ? 'amber' : 'cyan'}>{item.status}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge></td></tr>)}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Historical invoice validation table" subtitle="Seed invoice records remain available for reference and duplicate checks.">
        <div className="overflow-auto">
          <table className="min-w-[1500px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">Invoice</th>
                <th className="border-b border-white/10 px-3 py-3">Dates</th>
                <th className="border-b border-white/10 px-3 py-3">Vendor</th>
                <th className="border-b border-white/10 px-3 py-3">Amount</th>
                <th className="border-b border-white/10 px-3 py-3">Tax</th>
                <th className="border-b border-white/10 px-3 py-3">PO / GRN</th>
                <th className="border-b border-white/10 px-3 py-3">Department</th>
                <th className="border-b border-white/10 px-3 py-3">Validation</th>
                <th className="border-b border-white/10 px-3 py-3">Approval</th>
                <th className="border-b border-white/10 px-3 py-3">ERP</th>
                <th className="border-b border-white/10 px-3 py-3">Payment</th>
                <th className="border-b border-white/10 px-3 py-3">Result message</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const outcome = invoiceOutcome(invoice);
                return (
                  <tr key={invoice.id} className="transition hover:bg-white/[0.03]">
                    <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{invoice.invoiceNumber}<div className="text-xs text-slate-500">{invoice.invoiceType} | {invoice.source}</div></td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">Issue {dateOnly(invoice.issueDate)}<div className="text-xs text-slate-500">Due {dateOnly(invoice.dueDate)}</div></td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{invoice.vendorName}<div className="text-xs text-slate-500">{invoice.vendorGstin}</div></td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(invoice.grossAmount)}<div className="text-xs text-slate-500">Sub {money(invoice.subtotal)}</div></td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">GST {money(invoice.gstAmount)}<div className="text-xs text-slate-500">TDS {money(invoice.tdsAmount)}</div></td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{invoice.poNumber}<div className="text-xs text-slate-500">{invoice.grnNumber}</div></td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{invoice.department}<div className="text-xs text-slate-500">{invoice.costCenter} | {invoice.glCode}</div></td>
                    <td className="border-b border-white/5 px-3 py-4"><Badge tone={invoice.validationStatus === 'Pass' ? 'emerald' : invoice.validationStatus === 'Fail' ? 'rose' : 'amber'}>{invoice.validationStatus}</Badge><div className="mt-2 text-xs text-slate-500">OCR {invoice.ocrConfidence}%</div></td>
                    <td className="border-b border-white/5 px-3 py-4"><Badge tone={invoice.approvalLevel === 'L1' ? 'cyan' : invoice.approvalLevel === 'L2' ? 'violet' : invoice.approvalLevel === 'L3' ? 'amber' : 'slate'}>{invoice.approvalLevel}</Badge><div className="mt-2 text-xs text-slate-500">{invoice.approvalStatus}</div></td>
                    <td className="border-b border-white/5 px-3 py-4"><Badge tone={invoice.erpSyncStatus === 'Synced' ? 'emerald' : invoice.erpSyncStatus === 'Failed' ? 'rose' : 'slate'}>{invoice.erpSyncStatus}</Badge><div className="mt-2 text-xs text-slate-500">Retries {invoice.retryCount}</div></td>
                    <td className="border-b border-white/5 px-3 py-4"><Link href={`/payments?invoiceId=${encodeURIComponent(invoice.id)}`} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/15"><Wallet size={14} />Payments</Link></td>
                    <td className="border-b border-white/5 px-3 py-4">
                      <div className="flex items-start gap-2">
                        {outcome.label === 'Success' ? <CheckCircle2 size={17} className="mt-0.5 text-emerald-300" /> : outcome.label === 'Failure' ? <XCircle size={17} className="mt-0.5 text-rose-300" /> : <FileText size={17} className="mt-0.5 text-amber-300" />}
                        <div><Badge tone={outcome.tone}>{outcome.label}</Badge><div className="mt-2 max-w-[260px] text-xs text-slate-400">{outcome.message}</div></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
