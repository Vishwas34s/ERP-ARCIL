'use client';

import { Badge, Panel } from '@/components/ui';
import { formatDate, money } from '@/lib/utils';
import { statusTone } from '@/lib/purchase-orders';
import type { PurchaseOrder } from '@/lib/types';
import { InvoiceSummarySheet } from '@/components/invoice-summary-sheet';
import { Download, Printer } from 'lucide-react';

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-200">{value || 'Not provided'}</div>
    </div>
  );
}

export function PurchaseOrderDetail({ po, actions = true }: { po: PurchaseOrder; actions?: boolean }) {
  return (
    <div className="space-y-5">
      <InvoiceSummarySheet po={po} />
      <Panel
        title={`${po.poNumber} details`}
        subtitle="Matching-ready purchase order record for PO, GRN, and invoice comparison."
        action={actions && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"><Printer size={16} /> Print</button>
            <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"><Download size={16} /> Export PDF</button>
          </div>
        )}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <DetailBlock label="PO date" value={formatDate(po.poDate)} />
          <DetailBlock label="Delivery date" value={formatDate(po.intendedDeliveryDate)} />
          <DetailBlock label="Department" value={po.departmentName} />
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone={statusTone(po.status)}>{po.status}</Badge><Badge tone={po.matchingStatus === 'Matched' ? 'emerald' : 'cyan'}>{po.matchingStatus}</Badge></div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Vendor details" subtitle="Validated supplier data used during invoice checks.">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailBlock label="Vendor name" value={po.vendorName} />
            <DetailBlock label="GST details" value={po.vendorGstDetails} />
            <DetailBlock label="Contact number" value={po.vendorContactNumber} />
            <DetailBlock label="Email" value={po.vendorEmail} />
            <div className="sm:col-span-2"><DetailBlock label="Address" value={po.vendorAddress} /></div>
          </div>
        </Panel>

        <Panel title="Company details" subtitle="Buyer and delivery information for receiving teams.">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailBlock label="Company" value={po.companyName} />
            <DetailBlock label="Department" value={po.departmentName} />
            <DetailBlock label="Billing address" value={po.billingAddress} />
            <DetailBlock label="Shipping address" value={po.shippingAddress} />
          </div>
        </Panel>
      </div>

      <Panel title="Itemized details" subtitle="Line items preserve quantity and unit price for future 3-way matching.">
        <div className="overflow-auto">
          <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">Item</th>
                <th className="border-b border-white/10 px-3 py-3">SKU</th>
                <th className="border-b border-white/10 px-3 py-3">Description</th>
                <th className="border-b border-white/10 px-3 py-3">Qty</th>
                <th className="border-b border-white/10 px-3 py-3">Unit price</th>
                <th className="border-b border-white/10 px-3 py-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} className="transition hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4 font-medium text-white">{item.itemNumber}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.skuCode}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.itemDescription}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{item.quantityOrdered}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{money(item.unitPrice, po.currency)}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-right font-medium text-white">{money(item.totalPrice, po.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel title="Payment terms" subtitle="Terms are retained for invoice validation and variance checks.">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4 text-sm leading-6 text-slate-200">{po.paymentTerms}</div>
        </Panel>
        <Panel title="Pricing summary" subtitle={po.gstDetails}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 text-slate-300"><span>Subtotal</span><span>{money(po.subtotal, po.currency)}</span></div>
            <div className="flex items-center justify-between gap-4 text-slate-300"><span>Tax amount</span><span>{money(po.taxAmount, po.currency)}</span></div>
            <div className="flex items-center justify-between gap-4 text-slate-300"><span>Discount</span><span>{money(po.discount, po.currency)}</span></div>
            <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-4 text-base font-semibold text-white"><span>Final total</span><span>{money(po.finalTotalAmount, po.currency)}</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
