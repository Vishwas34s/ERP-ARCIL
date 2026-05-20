'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { demoData } from '@/lib/data';
import { approvalLevelFor, useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { money } from '@/lib/utils';
import { FileCheck2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

type Draft = Pick<WorkflowItem, 'vendorName' | 'poNumber' | 'poAmount' | 'poQty' | 'grnNumber' | 'grnQty' | 'challanNumber' | 'invoiceNumber' | 'invoiceDate' | 'invoiceAmount' | 'gstAmount' | 'matchStatus' | 'paymentMode'>;

type AdminVendorDraft = {
  legalName: string;
  displayName: string;
  vendorType: string;
  gstin: string;
  pan: string;
  aadhaar: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  panCardDocument: string;
  aadhaarCardDocument: string;
  gstCertificateDocument: string;
  cancelledChequeDocument: string;
};

type AdminVendor = AdminVendorDraft & {
  id: string;
  status: 'Ready for KYC' | 'Document Failed';
  createdAt: string;
};

const emptyDraft: Draft = {
  vendorName: 'Aster Distributor',
  poNumber: '',
  poAmount: 0,
  poQty: 0,
  grnNumber: '',
  grnQty: 0,
  challanNumber: '',
  invoiceNumber: '',
  invoiceDate: '2026-05-13',
  invoiceAmount: 0,
  gstAmount: 0,
  matchStatus: 'Matched',
  paymentMode: 'NEFT',
};

const emptyAdminVendor: AdminVendorDraft = {
  legalName: '',
  displayName: '',
  vendorType: 'Supplier',
  gstin: '',
  pan: '',
  aadhaar: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  panCardDocument: '',
  aadhaarCardDocument: '',
  gstCertificateDocument: '',
  cancelledChequeDocument: '',
};

const adminVendorKey = 'procureflow-admin-vendors';

function readAdminVendors() {
  if (typeof window === 'undefined') return [] as AdminVendor[];
  const saved = window.localStorage.getItem(adminVendorKey);
  if (!saved) return [] as AdminVendor[];
  try {
    return JSON.parse(saved) as AdminVendor[];
  } catch {
    return [] as AdminVendor[];
  }
}

function Field({ label, value, type = 'text', onChange, required = true }: { label: string; value: string | number; type?: string; required?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30"
      />
    </label>
  );
}

export default function VendorsPage() {
  const user = useDemoUser();
  const { items, add, update, remove, reset } = useWorkflowItems();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [adminVendor, setAdminVendor] = useState<AdminVendorDraft>(emptyAdminVendor);
  const [createdVendors, setCreatedVendors] = useState<AdminVendor[]>(() => readAdminVendors());
  const isVendor = false;
  const isAdmin = user.key === 'admin';
  const rows = useMemo(() => items, [items]);
  const latestDirectory = useMemo(() => demoData.vendors.slice(0, 8), []);

  function edit(item: WorkflowItem) {
    setEditingId(item.id);
    setDraft({
      vendorName: item.vendorName,
      poNumber: item.poNumber,
      poAmount: item.poAmount,
      poQty: item.poQty,
      grnNumber: item.grnNumber,
      grnQty: item.grnQty,
      challanNumber: item.challanNumber,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      invoiceAmount: item.invoiceAmount,
      gstAmount: item.gstAmount,
      matchStatus: item.matchStatus,
      paymentMode: item.paymentMode,
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      update(editingId, { ...draft, approvalLevel: approvalLevelFor(Number(draft.invoiceAmount)), status: 'Submitted', paymentStatus: 'Not Ready' }, user.role);
      toast({ type: 'success', title: 'Invoice Updated', description: `${draft.invoiceNumber || 'Invoice'} was moved back to submitted status.` });
    } else {
      add(draft, user.role);
      toast({ type: 'success', title: 'Record Added Successfully', description: `${draft.invoiceNumber || 'Invoice'} is ready for matching and approval.` });
    }
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function submitAdminVendor(event: FormEvent) {
    event.preventDefault();
    const requiredDocs = [
      adminVendor.panCardDocument,
      adminVendor.aadhaarCardDocument,
      adminVendor.gstCertificateDocument,
      adminVendor.cancelledChequeDocument,
    ];

    if (adminVendor.pan.trim().length !== 10 || adminVendor.aadhaar.replace(/\D/g, '').length !== 12 || requiredDocs.some((doc) => !doc.trim())) {
      toast({ type: 'error', title: 'Error While Saving', description: 'Check PAN, 12-digit Aadhaar, and all required documents.' });
      return;
    }

    const nextVendor: AdminVendor = {
      ...adminVendor,
      id: `ADM-VND-${String(Date.now()).slice(-6)}`,
      status: 'Ready for KYC',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const nextVendors = [nextVendor, ...createdVendors];
    window.localStorage.setItem(adminVendorKey, JSON.stringify(nextVendors));
    setCreatedVendors(nextVendors);
    setAdminVendor(emptyAdminVendor);
    toast({ type: 'success', title: 'Vendor Added Successfully', description: `${nextVendor.displayName || nextVendor.legalName} is ready for KYC review.` });
  }

  function removeRecord(item: WorkflowItem) {
    remove(item.id);
    toast({ type: 'warning', title: 'Record Deleted', description: `${item.invoiceNumber} was removed from the workflow.` });
  }

  function resetRecords() {
    reset();
    toast({ type: 'info', title: 'Dummy Data Reset', description: 'Workflow data was restored to the default demo records.' });
  }

  return (
    <div className="space-y-5">
      <Panel title="Vendor PO / GRN / Invoice workspace" subtitle="Admin view of vendor onboarding, submitted PO, GRN, delivery challan, and invoice records.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Role</div><div className="mt-2 text-lg font-semibold text-white">{user.role}</div></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Rows</div><div className="mt-2 text-2xl font-semibold text-white">{rows.length}</div></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Approved</div><div className="mt-2 text-2xl font-semibold text-white">{items.filter((item) => item.status === 'Approved').length}</div></div>
          <button onClick={resetRecords} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"><RefreshCw size={16} /> Reset dummy data</button>
        </div>
      </Panel>

      {isAdmin && (
        <Panel title="Admin add vendor" subtitle="Create a vendor profile with KYC documents before PO and invoice activity starts.">
          <form onSubmit={submitAdminVendor} className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Field label="Legal name" value={adminVendor.legalName} onChange={(value) => setAdminVendor((current) => ({ ...current, legalName: value }))} />
            <Field label="Display name" value={adminVendor.displayName} onChange={(value) => setAdminVendor((current) => ({ ...current, displayName: value }))} />
            <label className="text-sm text-slate-300">Vendor type<select value={adminVendor.vendorType} onChange={(event) => setAdminVendor((current) => ({ ...current, vendorType: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none"><option>Supplier</option><option>Service Provider</option><option>Distributor</option><option>Freight Partner</option><option>Consulting Firm</option></select></label>
            <Field label="GSTIN" value={adminVendor.gstin} onChange={(value) => setAdminVendor((current) => ({ ...current, gstin: value.toUpperCase() }))} />
            <Field label="PAN card number" value={adminVendor.pan} onChange={(value) => setAdminVendor((current) => ({ ...current, pan: value.toUpperCase().slice(0, 10) }))} />
            <Field label="Aadhaar card number" value={adminVendor.aadhaar} onChange={(value) => setAdminVendor((current) => ({ ...current, aadhaar: value.replace(/\D/g, '').slice(0, 12) }))} />
            <Field label="Contact name" value={adminVendor.primaryContactName} onChange={(value) => setAdminVendor((current) => ({ ...current, primaryContactName: value }))} />
            <Field label="Contact email" type="email" value={adminVendor.primaryContactEmail} onChange={(value) => setAdminVendor((current) => ({ ...current, primaryContactEmail: value }))} />
            <Field label="Contact phone" value={adminVendor.primaryContactPhone} onChange={(value) => setAdminVendor((current) => ({ ...current, primaryContactPhone: value }))} />
            <Field label="Bank name" value={adminVendor.bankName} onChange={(value) => setAdminVendor((current) => ({ ...current, bankName: value }))} />
            <Field label="Account number" value={adminVendor.accountNumber} onChange={(value) => setAdminVendor((current) => ({ ...current, accountNumber: value }))} />
            <Field label="IFSC" value={adminVendor.ifsc} onChange={(value) => setAdminVendor((current) => ({ ...current, ifsc: value.toUpperCase() }))} />
            <Field label="PAN card document" value={adminVendor.panCardDocument} onChange={(value) => setAdminVendor((current) => ({ ...current, panCardDocument: value }))} />
            <Field label="Aadhaar card document" value={adminVendor.aadhaarCardDocument} onChange={(value) => setAdminVendor((current) => ({ ...current, aadhaarCardDocument: value }))} />
            <Field label="GST certificate document" value={adminVendor.gstCertificateDocument} onChange={(value) => setAdminVendor((current) => ({ ...current, gstCertificateDocument: value }))} />
            <Field label="Cancelled cheque document" value={adminVendor.cancelledChequeDocument} onChange={(value) => setAdminVendor((current) => ({ ...current, cancelledChequeDocument: value }))} />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 md:self-end"><FileCheck2 size={16} /> Add vendor</button>
          </form>
        </Panel>
      )}

      {isAdmin && (
        <Panel title="Admin vendor directory" subtitle="Newly added vendors appear first, followed by existing seeded vendor master records.">
          <div className="overflow-auto">
            <table className="min-w-[1050px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">KYC</th><th className="border-b border-white/10 px-3 py-3">Documents</th><th className="border-b border-white/10 px-3 py-3">Contact</th><th className="border-b border-white/10 px-3 py-3">Bank</th><th className="border-b border-white/10 px-3 py-3">Status</th></tr></thead>
              <tbody>
                {createdVendors.map((vendor) => <tr key={vendor.id} className="hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{vendor.displayName || vendor.legalName}<div className="text-xs text-slate-500">{vendor.legalName}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">PAN {vendor.pan}<div className="text-xs text-slate-500">Aadhaar {vendor.aadhaar}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">PAN, Aadhaar, GST<div className="text-xs text-slate-500">Cancelled cheque attached</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{vendor.primaryContactName}<div className="text-xs text-slate-500">{vendor.primaryContactEmail}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{vendor.bankName}<div className="text-xs text-slate-500">{vendor.ifsc}</div></td><td className="border-b border-white/5 px-3 py-4"><Badge tone="emerald">{vendor.status}</Badge></td></tr>)}
                {latestDirectory.map((vendor) => <tr key={vendor.id} className="hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{vendor.displayName}<div className="text-xs text-slate-500">{vendor.vendorCode}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">PAN {vendor.pan}<div className="text-xs text-slate-500">GSTIN {vendor.gstin}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">PAN {vendor.panCardStatus}<div className="text-xs text-slate-500">GST {vendor.gstCertificateStatus} | Bank {vendor.bankProofStatus}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{vendor.primaryContactName}<div className="text-xs text-slate-500">{vendor.primaryContactEmail}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{vendor.bankName}<div className="text-xs text-slate-500">{vendor.ifsc}</div></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={vendor.status === 'Active' ? 'emerald' : vendor.status === 'Failed' ? 'rose' : 'amber'}>{vendor.status}</Badge></td></tr>)}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      
      <Panel title="Submitted operational data" subtitle="This is the shared source for PO, GRN, invoice, approvals, and payments.">
        <div className="overflow-auto">
          <table className="min-w-[1250px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">PO</th><th className="border-b border-white/10 px-3 py-3">GRN / DC</th><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Route</th><th className="border-b border-white/10 px-3 py-3">Match</th><th className="border-b border-white/10 px-3 py-3">Approval</th><th className="border-b border-white/10 px-3 py-3">Payment</th><th className="border-b border-white/10 px-3 py-3">Actions</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id} className="transition hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.vendorName}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.poNumber}<div className="text-xs text-slate-500">{money(item.poAmount)} | Qty {item.poQty}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.grnNumber}<div className="text-xs text-slate-500">{item.challanNumber} | Qty {item.grnQty}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.invoiceNumber}<div className="text-xs text-slate-500">{item.invoiceDate}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(item.invoiceAmount)}</td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.matchStatus === 'Matched' ? 'emerald' : item.matchStatus === 'Variance' ? 'amber' : 'slate'}>{item.matchStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.status === 'Approved' ? 'emerald' : item.status === 'Rejected' ? 'rose' : item.status === 'On Hold' ? 'amber' : 'cyan'}>{item.status}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={item.paymentStatus === 'Ready' || item.paymentStatus === 'Paid' ? 'emerald' : item.paymentStatus === 'Hold' ? 'amber' : 'slate'}>{item.paymentStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4"><div className="flex gap-2"></div></td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
