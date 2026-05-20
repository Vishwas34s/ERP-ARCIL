'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Panel, ConfirmationModal } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { demoData } from '@/lib/data';
import { createEmptyLineItem, normalizePurchaseOrder, statusTone, validatePurchaseOrder } from '@/lib/purchase-orders';
import { usePersistentFormState } from '@/lib/form-store';
import { newPurchaseOrderDraft, usePurchaseOrders } from '@/lib/purchase-order-store';
import { money } from '@/lib/utils';
import type { PurchaseOrder, PurchaseOrderLineItem, Vendor } from '@/lib/types';
import { CheckCircle2, Eye, FileDown, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Search, Trash2, XCircle } from 'lucide-react';

type FieldErrors = Partial<Record<keyof PurchaseOrder | 'items', string>>;

const statusOptions: PurchaseOrder['status'][] = ['Draft', 'Issued', 'Approved', 'Partially Received', 'Closed', 'Cancelled'];
const paymentTermOptions = ['Net 30', 'Net 45', 'Advance Payment', 'Partial Payment'];

function cloneDraft(po: PurchaseOrder): PurchaseOrder {
  return {
    ...po,
    items: po.items.map((item) => ({ ...item })),
  };
}

function emptyDraft() {
  return cloneDraft(newPurchaseOrderDraft());
}

function Field({
  label,
  value,
  type = 'text',
  error,
  required = true,
  placeholder,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
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
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <textarea
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[88px] w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400/30"
      />
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}

function InfoMetric({ label, value, tone = 'slate' }: { label: string; value: string | number; tone?: 'slate' | 'emerald' | 'cyan' | 'amber' }) {
  const classes = {
    slate: 'border-white/10 bg-slate-950/45 text-slate-500',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="text-xs uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function matchingTone(status: PurchaseOrder['matchingStatus']) {
  if (status === 'Matched' || status === 'Ready for 3-Way Match') return 'emerald' as const;
  if (status === 'Variance Review') return 'amber' as const;
  return 'cyan' as const;
}

function vendorAddress(vendor: Vendor) {
  return [vendor.city, vendor.state].filter(Boolean).join(', ');
}

export default function PurchaseOrdersPage() {
  const user = useDemoUser();
  const toast = useToast();
  const { items, save, remove, reset } = usePurchaseOrders();
  const [draft, setDraft, clearDraft] = usePersistentFormState<PurchaseOrder>('po-creation-form', emptyDraft());
  const [editingId, setEditingId] = useState<string | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showClearModal, setShowClearModal] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState('Newest');

  const isAdmin = user.key === 'admin';
  const normalizedDraft = useMemo(() => normalizePurchaseOrder(draft), [draft]);
  const totalValue = useMemo(() => items.reduce((sum, po) => sum + po.finalTotalAmount, 0), [items]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const searched = items.filter((po) => {
      const matchesSearch = !search || JSON.stringify(po).toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...searched].sort((a, b) => {
      if (sort === 'Total high') return b.finalTotalAmount - a.finalTotalAmount;
      if (sort === 'Vendor') return a.vendorName.localeCompare(b.vendorName);
      if (sort === 'Delivery') return new Date(a.intendedDeliveryDate).getTime() - new Date(b.intendedDeliveryDate).getTime();
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [items, query, sort, statusFilter]);

  function patchDraft(patch: Partial<PurchaseOrder>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateLine(id: string, patch: Partial<PurchaseOrderLineItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        const quantityOrdered = Number(next.quantityOrdered || 0);
        const unitPrice = Number(next.unitPrice || 0);
        return { ...next, quantityOrdered, unitPrice, totalPrice: quantityOrdered * unitPrice };
      }),
    }));
  }

  function addLine() {
    setDraft((current) => ({ ...current, items: [...current.items, createEmptyLineItem(current.items.length + 1)] }));
  }

  function removeLine(id: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
    }));
  }

  function selectVendor(vendorId: string) {
    const vendor = demoData.vendors.find((entry) => entry.id === vendorId);
    if (!vendor) {
      patchDraft({ vendorId: '', vendorName: '' });
      return;
    }

    patchDraft({
      vendorId: vendor.id,
      vendorName: vendor.displayName || vendor.legalName,
      vendorAddress: vendorAddress(vendor),
      vendorContactNumber: vendor.primaryContactPhone,
      vendorEmail: vendor.primaryContactEmail,
      vendorGstDetails: vendor.gstin,
      paymentTerms: vendor.paymentTermsDays ? `Net ${vendor.paymentTermsDays}` : draft.paymentTerms,
    });
  }

  function validateDraft() {
    const result = validatePurchaseOrder(draft, items, editingId);
    setErrors(result.errors);
    setFieldErrors(result.fieldErrors);
    toast({
      type: result.valid ? 'success' : 'error',
      title: result.valid ? 'PO Validated' : 'PO Validation Failed',
      description: result.errors[0] ?? 'Purchase order is ready for invoice and GRN matching.',
    });
    return result;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateDraft();
    if (!result.valid) return;

    const response = save(normalizedDraft, editingId);
    if (!response.result.valid) {
      setErrors(response.result.errors);
      setFieldErrors(response.result.fieldErrors);
      toast({ type: 'error', title: 'PO Save Failed', description: response.result.errors[0] ?? 'Please correct the PO data.' });
      return;
    }

    toast({
      type: 'success',
      title: editingId ? 'PO Updated' : 'PO Created',
      description: `${response.item.poNumber} is stored with matching-ready quantity, price, GST, and terms fields.`,
    });
    clearDraft();
    setEditingId(undefined);
    setErrors([]);
    setFieldErrors({});
  }

  function edit(po: PurchaseOrder) {
    setEditingId(po.id);
    setDraft(cloneDraft(po));
    setErrors([]);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleClearForm() {
    clearDraft();
    setEditingId(undefined);
    setErrors([]);
    setFieldErrors({});
    toast({ type: 'info', title: 'Form Reset', description: 'Purchase order workspace has been cleared.' });
  }

  function deletePo(po: PurchaseOrder) {
    remove(po.id);
    toast({ type: 'warning', title: 'PO Deleted', description: `${po.poNumber} was removed from PO management.` });
  }

  function resetData() {
    reset();
    clearDraft();
    setEditingId(undefined);
    setErrors([]);
    setFieldErrors({});
    toast({ type: 'info', title: 'PO Data Reset', description: 'Purchase orders were restored to seeded records.' });
  }

  return (
    <div className="space-y-5">
      <Panel title="Purchase Order Management" subtitle="Create, validate, view, edit, and manage purchase orders using the matching-ready PO schema.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoMetric label="PO records" value={items.length} />
          <InfoMetric label="Ready for match" value={items.filter((po) => po.matchingStatus === 'Ready for 3-Way Match').length} tone="emerald" />
          <InfoMetric label="Issued or approved" value={items.filter((po) => po.status === 'Issued' || po.status === 'Approved').length} tone="cyan" />
          <InfoMetric label="Total PO value" value={money(totalValue)} tone="amber" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#create-po" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">Create PO</a>
          <a href="#po-list" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">PO List</a>
          <button onClick={resetData} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"><RefreshCw size={16} /> Reset PO data</button>
        </div>
      </Panel>

      <Panel id="create-po" title={editingId ? 'Edit PO' : 'Create PO'} subtitle="Required PO, vendor, buyer, item, pricing, and payment fields are validated before saving.">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Field label="PO Number" value={draft.poNumber} error={fieldErrors.poNumber} onChange={(value) => patchDraft({ poNumber: value })} placeholder="PO-2001" />
            <Field label="PO Date" type="date" value={draft.poDate} error={fieldErrors.poDate} onChange={(value) => patchDraft({ poDate: value })} />
            <Field label="Intended Delivery Date" type="date" value={draft.intendedDeliveryDate} error={fieldErrors.intendedDeliveryDate} onChange={(value) => patchDraft({ intendedDeliveryDate: value })} />
            <label className="text-sm text-slate-300">
              Vendor Master
              <select value={draft.vendorId} onChange={(event) => selectVendor(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
                <option value="">Select vendor</option>
                {demoData.vendors.slice(0, 30).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.displayName}</option>)}
              </select>
            </label>
            <Field label="Vendor Name" value={draft.vendorName} error={fieldErrors.vendorName} onChange={(value) => patchDraft({ vendorName: value })} />
            <Field label="Vendor Contact Number" value={draft.vendorContactNumber} error={fieldErrors.vendorContactNumber} onChange={(value) => patchDraft({ vendorContactNumber: value })} />
            <Field label="Vendor Email" type="email" value={draft.vendorEmail} error={fieldErrors.vendorEmail} onChange={(value) => patchDraft({ vendorEmail: value })} />
            <Field label="Vendor GST Details" required={false} value={draft.vendorGstDetails} error={fieldErrors.vendorGstDetails} onChange={(value) => patchDraft({ vendorGstDetails: value.toUpperCase() })} />
            <div className="md:col-span-2"><TextArea label="Vendor Address" value={draft.vendorAddress} error={fieldErrors.vendorAddress} onChange={(value) => patchDraft({ vendorAddress: value })} /></div>
            <Field label="Company Name" value={draft.companyName} error={fieldErrors.companyName} onChange={(value) => patchDraft({ companyName: value })} />
            <Field label="Department Name" value={draft.departmentName} error={fieldErrors.departmentName} onChange={(value) => patchDraft({ departmentName: value })} />
            <div className="md:col-span-2"><TextArea label="Billing Address" value={draft.billingAddress} error={fieldErrors.billingAddress} onChange={(value) => patchDraft({ billingAddress: value })} /></div>
            <div className="md:col-span-2"><TextArea label="Shipping Address" value={draft.shippingAddress} error={fieldErrors.shippingAddress} onChange={(value) => patchDraft({ shippingAddress: value })} /></div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-sm font-semibold text-white">Itemized Details</div>
                <div className="mt-1 text-xs text-slate-500">Line quantities and prices are retained for future PO, GRN, and invoice comparison.</div>
              </div>
              <button type="button" onClick={addLine} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"><Plus size={14} /> Add item</button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="border-b border-white/10 px-3 py-2">Item No.</th>
                    <th className="border-b border-white/10 px-3 py-2">SKU</th>
                    <th className="border-b border-white/10 px-3 py-2">Description</th>
                    <th className="border-b border-white/10 px-3 py-2">Qty</th>
                    <th className="border-b border-white/10 px-3 py-2">Unit Price</th>
                    <th className="border-b border-white/10 px-3 py-2">Total</th>
                    <th className="border-b border-white/10 px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border-b border-white/5 px-3 py-3"><input value={item.itemNumber} onChange={(event) => updateLine(item.id, { itemNumber: event.target.value })} className="w-24 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 outline-none focus:border-cyan-400/30" /></td>
                      <td className="border-b border-white/5 px-3 py-3"><input value={item.skuCode} onChange={(event) => updateLine(item.id, { skuCode: event.target.value })} className="w-36 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 outline-none focus:border-cyan-400/30" /></td>
                      <td className="border-b border-white/5 px-3 py-3"><input value={item.itemDescription} onChange={(event) => updateLine(item.id, { itemDescription: event.target.value })} className="w-72 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 outline-none focus:border-cyan-400/30" /></td>
                      <td className="border-b border-white/5 px-3 py-3"><input type="number" min={1} value={item.quantityOrdered} onChange={(event) => updateLine(item.id, { quantityOrdered: Number(event.target.value) })} className="w-24 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 outline-none focus:border-cyan-400/30" /></td>
                      <td className="border-b border-white/5 px-3 py-3"><input type="number" min={0} value={item.unitPrice} onChange={(event) => updateLine(item.id, { unitPrice: Number(event.target.value) })} className="w-32 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 outline-none focus:border-cyan-400/30" /></td>
                      <td className="border-b border-white/5 px-3 py-3 text-slate-200">{money(Number(item.quantityOrdered || 0) * Number(item.unitPrice || 0), draft.currency)}</td>
                      <td className="border-b border-white/5 px-3 py-3"><button type="button" onClick={() => removeLine(item.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15" aria-label={`Remove PO item ${index + 1}`}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fieldErrors.items && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{fieldErrors.items}</div>}
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Tax Amount" type="number" value={draft.taxAmount} onChange={(value) => patchDraft({ taxAmount: Number(value) })} />
            <Field label="GST Details" value={draft.gstDetails} onChange={(value) => patchDraft({ gstDetails: value })} />
            <Field label="Discount" type="number" value={draft.discount} onChange={(value) => patchDraft({ discount: Number(value) })} />
            <label className="text-sm text-slate-300">
              Payment Terms
              <select value={paymentTermOptions.includes(draft.paymentTerms) ? draft.paymentTerms : 'Manual'} onChange={(event) => event.target.value !== 'Manual' && patchDraft({ paymentTerms: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
                {paymentTermOptions.map((term) => <option key={term}>{term}</option>)}
                <option>Manual</option>
              </select>
            </label>
            <Field label="Payment Terms Text" value={draft.paymentTerms} error={fieldErrors.paymentTerms} onChange={(value) => patchDraft({ paymentTerms: value })} />
            <label className="text-sm text-slate-300">
              Status
              <select value={draft.status} onChange={(event) => patchDraft({ status: event.target.value as PurchaseOrder['status'] })} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoMetric label="Subtotal" value={money(normalizedDraft.subtotal, draft.currency)} />
            <InfoMetric label="Tax less discount" value={money(Number(draft.taxAmount || 0) - Number(draft.discount || 0), draft.currency)} />
            <InfoMetric label="Final total" value={money(normalizedDraft.finalTotalAmount, draft.currency)} tone="emerald" />
          </div>

          {errors.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{errors.map((error) => <div key={error} className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</div>)}</div>}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={validateDraft} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"><CheckCircle2 size={16} /> Validate PO</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><Save size={16} /> {editingId ? 'Update PO' : 'Save PO'}</button>
            <button type="button" onClick={handleClearForm} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"><RotateCcw size={16} /> Clear data</button>
            {editingId && <button type="button" onClick={() => { setEditingId(undefined); clearDraft(); setErrors([]); setFieldErrors({}); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"><XCircle size={16} /> Cancel edit</button>}
          </div>
        </form>
        <ConfirmationModal isOpen={showClearModal} onClose={() => setShowClearModal(false)} onConfirm={handleClearForm} title="Clear PO Workspace?" description="This will remove all current form data and reset the purchase order workspace. This action cannot be undone." />
      </Panel>

      <Panel id="po-list" title={`PO List (${filtered.length})`} subtitle="Search, filter, sort, view details, edit, and delete purchase orders.">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PO number, vendor, department, SKU..." className="w-full rounded-lg border border-white/10 bg-slate-950/50 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/30" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
            <option>All</option>
            {statusOptions.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
            <option>Newest</option>
            <option>Total high</option>
            <option>Vendor</option>
            <option>Delivery</option>
          </select>
        </div>

        <div className="grid gap-3 md:hidden">
          {filtered.map((po) => (
            <article key={po.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{po.poNumber}</div>
                  <div className="mt-1 text-sm text-slate-400">{po.vendorName}</div>
                </div>
                <Badge tone={statusTone(po.status)}>{po.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">PO Date</span>{po.poDate}</div>
                <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Delivery</span>{po.intendedDeliveryDate}</div>
                <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Total</span>{money(po.finalTotalAmount, po.currency)}</div>
                <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Rows</span>{po.items.length}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/purchase-orders/${encodeURIComponent(po.id)}`} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 transition hover:bg-white/10" aria-label={`View ${po.poNumber}`}><Eye size={16} /></Link>
                <button onClick={() => edit(po)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label={`Edit ${po.poNumber}`}><Pencil size={16} /></button>
                {isAdmin && <button onClick={() => deletePo(po)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15" aria-label={`Delete ${po.poNumber}`}><Trash2 size={16} /></button>}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-auto md:block">
          <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">PO Number</th>
                <th className="border-b border-white/10 px-3 py-3">Vendor</th>
                <th className="border-b border-white/10 px-3 py-3">PO Date</th>
                <th className="border-b border-white/10 px-3 py-3">Delivery Date</th>
                <th className="border-b border-white/10 px-3 py-3">Total Amount</th>
                <th className="border-b border-white/10 px-3 py-3">Status</th>
                <th className="border-b border-white/10 px-3 py-3">Matching</th>
                <th className="border-b border-white/10 px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => (
                <tr key={po.id} className="transition hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{po.poNumber}<div className="text-xs text-slate-500">{po.items.length} item rows</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{po.vendorName}<div className="text-xs text-slate-500">{po.vendorEmail}</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{po.poDate}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{po.intendedDeliveryDate}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(po.finalTotalAmount, po.currency)}</td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={statusTone(po.status)}>{po.status}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={matchingTone(po.matchingStatus)}>{po.matchingStatus}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/purchase-orders/${encodeURIComponent(po.id)}`} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 transition hover:bg-white/10" aria-label={`View ${po.poNumber}`}><Eye size={16} /></Link>
                      <button onClick={() => edit(po)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label={`Edit ${po.poNumber}`}><Pencil size={16} /></button>
                      <button onClick={() => window.print()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label={`Print ${po.poNumber}`}><Printer size={16} /></button>
                      <button onClick={() => window.print()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label={`Export ${po.poNumber}`}><FileDown size={16} /></button>
                      {isAdmin && <button onClick={() => deletePo(po)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15" aria-label={`Delete ${po.poNumber}`}><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
