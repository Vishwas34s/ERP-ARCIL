// components/invoice-summary-sheet.tsx
'use client';

import { formatDate, money } from '@/lib/utils';
import type { PurchaseOrder } from '@/lib/types';

export function InvoiceSummarySheet({ po }: { po: PurchaseOrder }) {
  return (
    <div className="print:block hidden mb-8 p-6 border border-white/20 bg-slate-950/30 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center text-white mb-4">Invoice Summary Sheet</h1>
      <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
        {/* Left Column - Vendor / Company Details */}
        <div className="space-y-2">
          <h2 className="font-semibold text-white">Vendor Details</h2>
          <p><span className="font-medium">Name:</span> {po.vendorName}</p>
          <p><span className="font-medium">GST:</span> {po.vendorGstDetails}</p>
          <p><span className="font-medium">Contact:</span> {po.vendorContactNumber}</p>
          <p><span className="font-medium">Email:</span> {po.vendorEmail}</p>
          <p><span className="font-medium">Address:</span> {po.vendorAddress}</p>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold text-white">Company Details</h2>
          <p><span className="font-medium">Company:</span> {po.companyName}</p>
          <p><span className="font-medium">Department:</span> {po.departmentName}</p>
          <p><span className="font-medium">Billing Address:</span> {po.billingAddress}</p>
          <p><span className="font-medium">Shipping Address:</span> {po.shippingAddress}</p>
        </div>
        {/* Invoice Meta */}
        <div className="space-y-2 col-span-2">
          <h2 className="font-semibold text-white">Invoice Information</h2>
          <div className="grid grid-cols-2 gap-2">
            <p><span className="font-medium">Invoice No.:</span> {po.poNumber}</p>
            <p><span className="font-medium">Invoice Date:</span> {formatDate(po.poDate)}</p>
            <p><span className="font-medium">Place of Supply:</span> {po.placeOfSupply ?? 'N/A'}</p>
            <p><span className="font-medium">Client Type:</span> {po.clientType ?? 'N/A'}</p>
            <p><span className="font-medium">GST Details:</span> {po.gstDetails}</p>
            <p><span className="font-medium">SAC Code:</span> {po.sacCode ?? 'N/A'}</p>
          </div>
        </div>
        {/* Amounts Table */}
        <div className="col-span-2 mt-4">
          <table className="w-full border border-white/20 text-left text-sm">
            <thead className="bg-slate-800/60">
              <tr className="text-xs uppercase text-slate-400">
                <th className="border-b border-white/20 px-3 py-2">Description</th>
                <th className="border-b border-white/20 px-3 py-2 text-right">Taxable Value</th>
                <th className="border-b border-white/20 px-3 py-2 text-right">CGST</th>
                <th className="border-b border-white/20 px-3 py-2 text-right">SGST</th>
                <th className="border-b border-white/20 px-3 py-2 text-right">IGST</th>
                <th className="border-b border-white/20 px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900/30">
              <tr className="border-b border-white/10">
                <td className="px-3 py-2">Taxable Amount</td>
                <td className="px-3 py-2 text-right">{money(po.subtotal, po.currency)}</td>
                <td className="px-3 py-2 text-right">{money(po.cgst ?? 0, po.currency)}</td>
                <td className="px-3 py-2 text-right">{money(po.sgst ?? 0, po.currency)}</td>
                <td className="px-3 py-2 text-right">{money(po.igst ?? 0, po.currency)}</td>
                <td className="px-3 py-2 text-right">{money(po.taxAmount, po.currency)}</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-3 py-2">Discount</td>
                <td className="px-3 py-2 text-right">{money(po.discount, po.currency)}</td>
                <td colSpan={4}></td>
              </tr>
              <tr className="font-semibold text-white">
                <td className="px-3 py-2">Final Total</td>
                <td colSpan={5} className="px-3 py-2 text-right">{money(po.finalTotalAmount, po.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Footer Amounts */}
        <div className="col-span-2 mt-4 space-y-1 text-right text-slate-200">
          <p><span className="font-medium">Amount Payable:</span> {money(po.finalTotalAmount, po.currency)}</p>
          <p><span className="font-medium">Rounded Off:</span> {money(po.roundedOffAmount ?? 0, po.currency)}</p>
          <p><span className="font-medium">Amount in Words:</span> {po.amountInWords ?? 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
