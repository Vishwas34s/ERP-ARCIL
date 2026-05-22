'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { Badge, Panel, SegmentedControl } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { useGoodsReceipts, emptyGoodsReceiptDraft } from '@/lib/grn-store';
import { usePurchaseOrders } from '@/lib/purchase-order-store';
import { useVendors } from '@/lib/vendor-store';
import { money } from '@/lib/utils';
import type { GoodsReceipt, PurchaseOrder, Vendor } from '@/lib/types';
import { CheckCircle2, FileText, ListChecks, Plus, RefreshCw, Save, Search, Trash2, XCircle } from 'lucide-react';

type GrnView = 'create' | 'list';

type FieldErrors = Partial<Record<keyof GoodsReceipt, string>>;

function Field({
  label,
  value,
  type = 'text',
  required = true,
  error,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400/30"
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

function cloneDraft(grn: GoodsReceipt) {
  return { ...grn };
}

function emptyDraft() {
  return cloneDraft(emptyGoodsReceiptDraft());
}

function isEmptyValue(value: string | number | undefined) {
  return value === undefined || value === null || String(value).trim() === '';
}

export default function GrnPage() {
  const user = useDemoUser();
  const toast = useToast();
  const { items, save, remove, reset } = useGoodsReceipts();
  const { items: purchaseOrders } = usePurchaseOrders();
  const { vendors } = useVendors();
  const [activeView, setActiveView] = useState<GrnView>('create');
  const [draft, setDraft] = useState<GoodsReceipt>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('procureflow-grn-draft');
      if (saved) return JSON.parse(saved);
    }
    return emptyDraft();
  });

  useEffect(() => {
    localStorage.setItem('procureflow-grn-draft', JSON.stringify(draft));
  }, [draft]);

  const [editingId, setEditingId] = useState<string | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const totalReceived = useMemo(() => items.reduce((sum, item) => sum + item.quantityReceived, 0), [items]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !term || `${item.grnNumber} ${item.poNumber} ${item.vendorName} ${item.deliveryChallanNumber}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All' || item.deliveryStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, query, statusFilter]);

  function patchDraft(patch: Partial<GoodsReceipt>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function selectPo(poNumber: string) {
    const purchaseOrder = purchaseOrders.find((po) => po.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase());
    if (!purchaseOrder) {
      patchDraft({ poNumber, vendorId: '', vendorName: '' });
      return;
    }

    const vendor = vendors.find((entry) => entry.id === purchaseOrder.vendorId);

    patchDraft({
      poNumber: purchaseOrder.poNumber,
      vendorId: purchaseOrder.vendorId,
      vendorName: purchaseOrder.vendorName,
      warehouse: draft.warehouse || 'Central Warehouse',
      deliveryChallanNumber: purchaseOrder.deliveryChallanNumber || draft.deliveryChallanNumber,
      deliveryChallanDate: purchaseOrder.deliveryChallanDate || draft.deliveryChallanDate,
      receiverName: vendor?.primaryContactName || draft.receiverName,
    });
  }

  function handleField(key: keyof GoodsReceipt, value: string) {
    const nextDraft = { ...draft, [key]: value } as GoodsReceipt;
    if (key === 'poNumber') {
      selectPo(value);
    }
    setDraft(nextDraft);
  }

  function validateDraft() {
    const nextErrors: string[] = [];
    const nextFieldErrors: FieldErrors = {};

    if (!draft.grnNumber.trim()) {
      nextErrors.push('GRN number is required.');
      nextFieldErrors.grnNumber = 'GRN number is required.';
    }
    if (!draft.grnDate.trim() || Number.isNaN(new Date(draft.grnDate).getTime())) {
      nextErrors.push('GRN date is invalid.');
      nextFieldErrors.grnDate = 'GRN date is invalid.';
    }
    if (!draft.poNumber.trim()) {
      nextErrors.push('Associated PO reference is required.');
      nextFieldErrors.poNumber = 'Associated PO reference is required.';
    }
    if (!draft.vendorId.trim()) {
      nextErrors.push('Vendor selection is required.');
      nextFieldErrors.vendorId = 'Vendor selection is required.';
    }
    if (draft.quantityReceived <= 0) {
      nextErrors.push('Received quantity must be greater than zero.');
      nextFieldErrors.quantityReceived = 'Quantity must be greater than zero.';
    }
    if (draft.acceptedQuantity == null || draft.acceptedQuantity < 0) {
      nextErrors.push('Accepted quantity must be zero or greater.');
      nextFieldErrors.acceptedQuantity = 'Accepted quantity is required.';
    }
    if (draft.rejectedQuantity == null || draft.rejectedQuantity < 0) {
      nextErrors.push('Rejected quantity must be zero or greater.');
      nextFieldErrors.rejectedQuantity = 'Rejected quantity is required.';
    }
    if ((draft.acceptedQuantity ?? 0) + (draft.rejectedQuantity ?? 0) !== draft.quantityReceived) {
      nextErrors.push('Accepted and rejected quantities must sum to the received quantity.');
      nextFieldErrors.quantityReceived = 'Accepted + rejected must equal received quantity.';
    }
    if (!draft.warehouse.trim()) {
      nextErrors.push('Warehouse location is required.');
      nextFieldErrors.warehouse = 'Warehouse is required.';
    }
    if (!draft.receiverName.trim()) {
      nextErrors.push('Receiver name is required.');
      nextFieldErrors.receiverName = 'Receiver name is required.';
    }
    if (!draft.deliveryChallanNumber.trim()) {
      nextErrors.push('Delivery challan number is required.');
      nextFieldErrors.deliveryChallanNumber = 'Delivery challan number is required.';
    }
    if (!draft.deliveryChallanDate.trim() || Number.isNaN(new Date(draft.deliveryChallanDate).getTime())) {
      nextErrors.push('Delivery challan date is invalid.');
      nextFieldErrors.deliveryChallanDate = 'Delivery challan date is invalid.';
    }
    if (!draft.itemCondition?.trim()) {
      nextErrors.push('Item condition is required.');
      nextFieldErrors.itemCondition = 'Item condition is required.';
    }

    setErrors(nextErrors);
    setFieldErrors(nextFieldErrors);

    toast({
      type: nextErrors.length ? 'error' : 'success',
      title: nextErrors.length ? 'GRN validation failed' : 'GRN validated',
      description: nextErrors.length ? nextErrors[0] : 'Goods receipt information is ready for invoice matching and approval.',
    });

    return nextErrors.length === 0;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateDraft()) return;

    const response = save(draft, editingId);
    if (!response.result.valid) {
      setErrors(response.result.errors);
      toast({ type: 'error', title: 'GRN save failed', description: response.result.errors[0] });
      return;
    }

    toast({
      type: 'success',
      title: editingId ? 'GRN updated' : 'GRN created',
      description: `${response.item.grnNumber} is linked to PO ${response.item.poNumber} and ready for matching.`,
    });
    setDraft(emptyDraft());
    setEditingId(undefined);
    setErrors([]);
    setFieldErrors({});
    setActiveView('list');
  }

  function edit(item: GoodsReceipt) {
    setDraft(cloneDraft(item));
    setEditingId(item.id);
    setActiveView('create');
    setErrors([]);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteReceipt(item: GoodsReceipt) {
    remove(item.id);
    toast({ type: 'warning', title: 'GRN deleted', description: `${item.grnNumber} removed from GRN records.` });
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Goods Receipt / GRN"
        subtitle="Capture goods receipt details for PO-linked deliveries and prepare GRNs for 3-way matching."
        action={
          <SegmentedControl
            value={activeView}
            onChange={setActiveView}
            options={[
              { value: 'create', label: editingId ? 'Edit GRN' : 'Create GRN', icon: <FileText size={14} /> },
              { value: 'list', label: 'GRN register', icon: <ListChecks size={14} /> },
            ]}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoMetric label="GRN records" value={items.length} />
          <InfoMetric label="Total received" value={totalReceived} tone="emerald" />
          <InfoMetric label="Current view" value={activeView === 'create' ? 'Draft entry' : 'Register'} tone="cyan" />
          <InfoMetric label="Signed in" value={user.role} />
        </div>
      </Panel>

      {activeView === 'create' && (
        <Panel title={editingId ? 'Edit GRN' : 'Create GRN'} subtitle="Link the GRN to a PO and vendor, then capture receipt and challan details for matching." >
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Field label="GRN Number" value={draft.grnNumber} error={fieldErrors.grnNumber} onChange={(value) => patchDraft({ grnNumber: value })} />
              <Field label="GRN Date" type="date" value={draft.grnDate} error={fieldErrors.grnDate} onChange={(value) => patchDraft({ grnDate: value })} />
              <label className="text-sm text-slate-300">
                PO Reference
                <select value={draft.poNumber} onChange={(event) => handleField('poNumber', event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
                  <option value="">Select PO</option>
                  {purchaseOrders.map((po) => <option key={po.id} value={po.poNumber}>{po.poNumber} — {po.vendorName}</option>)}
                </select>
              </label>
              <Field label="Vendor Name" value={draft.vendorName} onChange={(value) => patchDraft({ vendorName: value })} />
              <Field label="Vendor ID" value={draft.vendorId} onChange={(value) => patchDraft({ vendorId: value })} />
              <Field label="Received Quantity" type="number" value={draft.quantityReceived} error={fieldErrors.quantityReceived} onChange={(value) => patchDraft({ quantityReceived: Number(value) })} />
              <Field label="Accepted Quantity" type="number" value={draft.acceptedQuantity ?? ''} error={fieldErrors.acceptedQuantity} onChange={(value) => patchDraft({ acceptedQuantity: Number(value) })} />
              <Field label="Rejected Quantity" type="number" value={draft.rejectedQuantity ?? ''} error={fieldErrors.rejectedQuantity} onChange={(value) => patchDraft({ rejectedQuantity: Number(value) })} />
              <Field label="Warehouse" value={draft.warehouse} error={fieldErrors.warehouse} onChange={(value) => patchDraft({ warehouse: value })} />
              <Field label="Receiver Name" value={draft.receiverName} error={fieldErrors.receiverName} onChange={(value) => patchDraft({ receiverName: value })} />
              <Field label="Delivery Challan Number" value={draft.deliveryChallanNumber} error={fieldErrors.deliveryChallanNumber} onChange={(value) => patchDraft({ deliveryChallanNumber: value })} />
              <Field label="Delivery Challan Date" type="date" value={draft.deliveryChallanDate} error={fieldErrors.deliveryChallanDate} onChange={(value) => patchDraft({ deliveryChallanDate: value })} />
              <label className="text-sm text-slate-300">
                Item Condition
                <select value={draft.itemCondition} onChange={(event) => patchDraft({ itemCondition: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
                  <option value="">Select condition</option>
                  <option value="Good">Good</option>
                  <option value="Acceptable">Acceptable</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Pending inspection">Pending inspection</option>
                </select>
              </label>
              <div className="md:col-span-2 xl:col-span-4"><TextArea label="Received items" value={draft.receivedItems} error={fieldErrors.receivedItems} onChange={(value) => patchDraft({ receivedItems: value })} /></div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <InfoMetric label="Delivery status" value={draft.deliveryStatus} tone="cyan" />
              <InfoMetric label="PO reference" value={draft.poNumber || 'Pending'} />
              <InfoMetric label="Challan" value={draft.deliveryChallanNumber || 'Pending'} />
            </div>

            {errors.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{errors.map((error) => <div key={error} className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</div>)}</div>}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={validateDraft} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"><CheckCircle2 size={16} /> Validate GRN</button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><Save size={16} /> {editingId ? 'Update GRN' : 'Save GRN'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(undefined); setDraft(emptyDraft()); setErrors([]); setFieldErrors({}); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"><XCircle size={16} /> Cancel edit</button>}
            </div>
          </form>
        </Panel>
      )}

      {activeView === 'list' && (
        <Panel title={`GRN register (${filtered.length})`} subtitle="Review received goods, challan details, and PO linkage for the whole GRN workflow." action={<button onClick={() => { reset(); setDraft(emptyDraft()); setErrors([]); setFieldErrors({}); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"><RefreshCw size={15} /> Reset GRN data</button>}>
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GRN, PO, vendor, challan..." className="w-full rounded-lg border border-white/10 bg-slate-950/50 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/30" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
              <option>All</option>
              <option>Pending</option>
              <option>Received</option>
              <option>Partially Received</option>
              <option>Rejected</option>
            </select>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{item.grnNumber}</div>
                    <div className="mt-1 text-sm text-slate-400">{item.poNumber}</div>
                  </div>
                  <Badge tone={item.deliveryStatus === 'Received' ? 'emerald' : item.deliveryStatus === 'Partially Received' ? 'amber' : 'cyan'}>{item.deliveryStatus}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Vendor</span>{item.vendorName}</div>
                  <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Received</span>{item.quantityReceived}</div>
                  <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Challan</span>{item.deliveryChallanNumber}</div>
                  <div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Warehouse</span>{item.warehouse}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => edit(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label={`Edit ${item.grnNumber}`}><Save size={16} /></button>
                  <button onClick={() => deleteReceipt(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15" aria-label={`Delete ${item.grnNumber}`}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="border-b border-white/10 px-3 py-3">GRN</th>
                  <th className="border-b border-white/10 px-3 py-3">PO</th>
                  <th className="border-b border-white/10 px-3 py-3">Vendor</th>
                  <th className="border-b border-white/10 px-3 py-3">Received Qty</th>
                  <th className="border-b border-white/10 px-3 py-3">Accepted</th>
                  <th className="border-b border-white/10 px-3 py-3">Rejected</th>
                  <th className="border-b border-white/10 px-3 py-3">Challan</th>
                  <th className="border-b border-white/10 px-3 py-3">Status</th>
                  <th className="border-b border-white/10 px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.03]">
                    <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.grnNumber}</td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.poNumber}</td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.vendorName}</td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.quantityReceived}</td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.acceptedQuantity}</td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.rejectedQuantity}</td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.deliveryChallanNumber}</td>
                    <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.deliveryStatus === 'Received' ? 'emerald' : item.deliveryStatus === 'Partially Received' ? 'amber' : 'cyan'}>{item.deliveryStatus}</Badge></td>
                    <td className="border-b border-white/5 px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => edit(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label={`Edit ${item.grnNumber}`}><Save size={16} /></button>
                        <button onClick={() => deleteReceipt(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15" aria-label={`Delete ${item.grnNumber}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
