'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Badge, MetricCard, Panel, SegmentedControl } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useVendors } from '@/lib/vendor-store';
import { useDemoUser } from '@/lib/auth';
import { matchBadgeTone, normalizeKey, validateManualInvoice, type InvoiceValidationResult, type ManualInvoiceDraft } from '@/lib/matching';
import { clearDraft, readDraft, useFormDraftAutoSave, writeDraft } from '@/lib/form-draft-store';

import { approvalLevelFor, useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { usePurchaseOrders } from '@/lib/purchase-order-store';
import { money } from '@/lib/utils';
import type { Vendor, PurchaseOrder } from '@/lib/types';
import { AlertTriangle, CheckCircle2, Download, Eye, FileImage, FileText, ListChecks, RotateCcw, Save, Search, Upload, X, XCircle } from 'lucide-react';

type IntakeMode = 'OCR' | 'Manual';
type InvoiceView = 'create' | 'register';

type InvoiceDraft = {
  vendorId: string;
  grnReference: string;
  grnDate: string;
  deliveryChallanNumber: string;
  deliveryChallanDate: string;
  [key: string]: string;
};

type FieldDef = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
};

const today = new Date().toISOString().slice(0, 10);

const invoiceGroups: Array<{ title: string; fields: FieldDef[] }> = [
  {
    title: 'Invoice header',
    fields: [
      { key: 'invoiceNumber', label: 'Invoice number' },
      { key: 'invoiceDate', label: 'Invoice date', type: 'date' },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'receiptDate', label: 'Receipt date', type: 'date' },
      { key: 'invoiceType', label: 'Invoice type', options: ['Tax Invoice', 'Debit Note', 'Credit Note', 'Proforma'] },
      { key: 'sourceFileName', label: 'Source file name', required: false },
      { key: 'ocrConfidence', label: 'OCR confidence', type: 'number', required: false },
      { key: 'priority', label: 'Priority', options: ['Low', 'Medium', 'High'] },
    ],
  },
  {
    title: 'Vendor and tax',
    fields: [
      { key: 'vendorName', label: 'Vendor name' },
      { key: 'vendorCode', label: 'Vendor code', required: false },
      { key: 'vendorGstin', label: 'Vendor GSTIN' },
      { key: 'vendorPan', label: 'Vendor PAN' },
      { key: 'vendorAddress', label: 'Vendor address' },
      { key: 'placeOfSupply', label: 'Place of supply' },
      { key: 'reverseCharge', label: 'Reverse charge', options: ['No', 'Yes'] },
      { key: 'taxRegime', label: 'Tax regime', options: ['Regular', 'Composition', 'SEZ', 'Exempt'] },
    ],
  },
  {
    title: 'Bank and payment',
    fields: [
      { key: 'bankName', label: 'Bank name' },
      { key: 'bankAccountMasked', label: 'Bank account masked' },
      { key: 'ifsc', label: 'IFSC' },
      { key: 'bankBranch', label: 'Bank branch' },
      { key: 'paymentMode', label: 'Payment mode', options: ['RTGS', 'NEFT', 'UPI', 'Cheque', 'Manual Bank Transfer'] },
      { key: 'paymentTerms', label: 'Payment terms' },
      { key: 'beneficiaryName', label: 'Beneficiary name' },
      { key: 'currency', label: 'Currency', options: ['INR', 'USD', 'EUR'] },
    ],
  },
  {
    title: 'Purchase and receipt match',
    fields: [
      { key: 'poNumber', label: 'PO Number' },
      { key: 'poDate', label: 'PO Date', type: 'date', required: false },
      { key: 'grnReference', label: 'GRN Reference' },
      { key: 'grnDate', label: 'GRN Date', type: 'date', required: false },
      { key: 'deliveryChallanNumber', label: 'Delivery Challan Number' },
      { key: 'deliveryChallanDate', label: 'Delivery Challan Date', type: 'date', required: false },
      { key: 'department', label: 'Department' },
      { key: 'costCenter', label: 'Cost center' },
    ],
  },
  {
    title: 'Line and amounts',
    fields: [
      { key: 'lineItemCode', label: 'Line item code' },
      { key: 'itemDescription', label: 'Item details' },
      { key: 'hsnSac', label: 'HSN / SAC' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit', label: 'Unit' },
      { key: 'unitPrice', label: 'Unit price', type: 'number' },
      { key: 'subtotal', label: 'Subtotal', type: 'number' },
      { key: 'discount', label: 'Discount', type: 'number', required: false },
      { key: 'taxableAmount', label: 'Taxable amount', type: 'number' },
      { key: 'gstRate', label: 'GST rate %', type: 'number' },
      { key: 'cgstAmount', label: 'CGST amount', type: 'number', required: false },
      { key: 'sgstAmount', label: 'SGST amount', type: 'number', required: false },
      { key: 'igstAmount', label: 'IGST amount', type: 'number', required: false },
      { key: 'tdsAmount', label: 'TDS amount', type: 'number', required: false },
      { key: 'freightAmount', label: 'Freight amount', type: 'number', required: false },
      { key: 'roundOff', label: 'Round off', type: 'number', required: false },
      { key: 'grossAmount', label: 'Gross amount', type: 'number' },
    ],
  },
  {
    title: 'Controls and references',
    fields: [
      { key: 'billToName', label: 'Bill to name' },
      { key: 'billToGstin', label: 'Bill to GSTIN' },
      { key: 'shipToName', label: 'Ship to name' },
      { key: 'shipToAddress', label: 'Ship to address' },
      { key: 'projectCode', label: 'Project code', required: false },
      { key: 'glCode', label: 'GL code' },
      { key: 'irn', label: 'IRN', required: false },
      { key: 'ewayBill', label: 'E-way bill', required: false },
      { key: 'validationOwner', label: 'Validation owner' },
      { key: 'remarks', label: 'Remarks', required: false },
    ],
  },
];

const defaultDraft: InvoiceDraft = {
  invoiceNumber: '',
  invoiceDate: today,
  dueDate: today,
  receiptDate: today,
  invoiceType: 'Tax Invoice',
  sourceFileName: '',
  ocrConfidence: '',
  priority: 'Medium',
  vendorId: '',
  vendorName: '',
  vendorCode: '',
  vendorGstin: '',
  vendorPan: '',
  vendorAddress: '',
  placeOfSupply: 'Maharashtra',
  reverseCharge: 'No',
  taxRegime: 'Regular',
  bankName: '',
  bankAccountMasked: '',
  ifsc: '',
  bankBranch: '',
  paymentMode: 'NEFT',
  paymentTerms: 'Net 30',
  beneficiaryName: '',
  currency: 'INR',
  poNumber: '',
  poDate: '',
  grnReference: '',
  grnDate: '',
  deliveryChallanNumber: '',
  deliveryChallanDate: '',
  department: 'Operations',
  costCenter: 'CC-AP-001',
  lineItemCode: 'ITEM-001',
  itemDescription: '',
  hsnSac: '998399',
  quantity: '',
  unit: 'Nos',
  unitPrice: '',
  subtotal: '',
  discount: '0',
  taxableAmount: '',
  gstRate: '18',
  cgstAmount: '0',
  sgstAmount: '0',
  igstAmount: '0',
  tdsAmount: '0',
  freightAmount: '0',
  roundOff: '0',
  grossAmount: '',
  billToName: 'ProcureFlow Demo Pvt Ltd',
  billToGstin: '27AAECP1234F1Z7',
  shipToName: 'ProcureFlow Warehouse',
  shipToAddress: 'Bhiwandi, Maharashtra',
  projectCode: 'PRJ-P2P',
  glCode: 'GL-AP-5001',
  irn: '',
  ewayBill: '',
  validationOwner: 'AP Validator',
  remarks: '',
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function totalTax(draft: InvoiceDraft) {
  return numberValue(draft.cgstAmount) + numberValue(draft.sgstAmount) + numberValue(draft.igstAmount);
}

function mapVendorAddress(vendor: any) {
  return [vendor.addressLine1, vendor.city, vendor.state].filter(Boolean).join(', ');
}

function findVendor(vendors: any[], query: string) {
  const normalized = normalizeKey(query);
  return vendors.find((vendor) => {
    return [vendor.displayName, vendor.legalName, vendor.vendorCode, vendor.gstin, vendor.pan]
      .filter(Boolean)
      .some((candidate) => normalizeKey(candidate).includes(normalized));
  });
}

function findPurchaseOrder(purchaseOrders: PurchaseOrder[], query: string) {
  const normalized = normalizeKey(query);
  return purchaseOrders.find((po) => normalizeKey(po.poNumber) === normalized);
}

function deriveDraftFromVendor(draft: InvoiceDraft, vendor: any) {
  return {
    ...draft,
    vendorId: vendor.id,
    vendorName: vendor.displayName || vendor.legalName || draft.vendorName,
    vendorCode: vendor.vendorCode || draft.vendorCode,
    vendorGstin: vendor.gstin || draft.vendorGstin,
    vendorPan: vendor.pan || draft.vendorPan,
    vendorAddress: mapVendorAddress(vendor) || draft.vendorAddress,
    placeOfSupply: vendor.state || draft.placeOfSupply,
    taxRegime: vendor.taxTreatment || draft.taxRegime,
    beneficiaryName: vendor.displayName || vendor.legalName || draft.beneficiaryName,
    bankName: vendor.bankName || draft.bankName,
    bankAccountMasked: vendor.accountNumberMasked || draft.bankAccountMasked,
    ifsc: vendor.ifsc || draft.ifsc,
    bankBranch: vendor.bankBranch || draft.bankBranch,
    paymentTerms: vendor.paymentTermsDays ? `Net ${vendor.paymentTermsDays}` : draft.paymentTerms,
    paymentMode: vendor.preferredPaymentMode || draft.paymentMode,
  };
}

function deriveDraftFromPurchaseOrder(draft: InvoiceDraft, po: PurchaseOrder): InvoiceDraft {
  const totalQuantity = po.items.reduce((sum, item) => sum + (Number(item.quantityOrdered) || 0), 0);
  const lineItem = po.items[0] || { itemDescription: draft.itemDescription, unitPrice: 0, skuCode: draft.lineItemCode, hsnSac: '998399' };
  const extractedGst = Number(String(po.gstDetails).match(/(\d+(?:\.\d+)?)/)?.[1]) || 18;
  const gstRate = po.gstRate ?? extractedGst;
  const taxableAmount = po.subtotal - (po.discount || 0);
  const avgPrice = totalQuantity > 0 ? (po.subtotal / totalQuantity) : (lineItem.unitPrice || 0);

  const cgst = Number((po.taxAmount / 2).toFixed(2));
  const sgst = Number((po.taxAmount - cgst).toFixed(2));

  return {
    ...draft,
    vendorId: po.vendorId,
    vendorName: po.vendorName,
    vendorCode: po.vendorReferenceId || draft.vendorCode,
    vendorGstin: po.vendorGstDetails,
    vendorPan: draft.vendorPan,
    vendorAddress: po.vendorAddress || draft.vendorAddress,
    paymentTerms: po.paymentTerms,
    currency: po.currency || draft.currency,
    department: po.departmentName || draft.department,
    costCenter: po.costCenter || draft.costCenter,
    projectCode: po.projectCode || draft.projectCode,
    glCode: po.glCode || draft.glCode,
    lineItemCode: lineItem.skuCode || draft.lineItemCode,
    itemDescription: lineItem.itemDescription || draft.itemDescription,
    hsnSac: lineItem.hsnSac || po.sacCode || draft.hsnSac,
    unit: po.unit || draft.unit,
    unitPrice: avgPrice.toFixed(2),
    gstRate: String(gstRate),
    quantity: String(totalQuantity),
    subtotal: po.subtotal.toFixed(2),
    discount: String(po.discount || 0),
    taxableAmount: taxableAmount.toFixed(2),
    cgstAmount: cgst.toFixed(2),
    sgstAmount: sgst.toFixed(2),
    igstAmount: '0.00',
    tdsAmount: '0.00',
    freightAmount: '0.00',
    roundOff: '0.00',
    grossAmount: po.finalTotalAmount.toFixed(2),
    poDate: po.poDate,
    grnReference: po.grnReference || '',
    grnDate: po.grnDate || '',
    deliveryChallanNumber: po.deliveryChallanNumber || '',
    deliveryChallanDate: po.deliveryChallanDate || '',
  };
}

function evaluateDraft(
  draft: InvoiceDraft,
  items: WorkflowItem[],
  vendors: Vendor[],
  purchaseOrders: PurchaseOrder[],
): InvoiceValidationResult {
  return validateManualInvoice(
    toManualDraft(draft),
    items,
    items.map((item) => item.invoiceNumber),
    vendors,
    purchaseOrders,
  );
}

function toManualDraft(draft: InvoiceDraft): ManualInvoiceDraft {
  return {
    invoiceNumber: draft.invoiceNumber,
    invoiceDate: draft.invoiceDate,
    dueDate: draft.dueDate,
    vendorId: draft.vendorId,
    vendorName: draft.vendorName,
    vendorCode: draft.vendorCode,
    vendorGstin: draft.vendorGstin,
    vendorPan: draft.vendorPan,
    taxAmount: totalTax(draft),
    gstInformation: `GST ${draft.gstRate}%`,
    gstRate: numberValue(draft.gstRate),
    poNumber: draft.poNumber,
    grnReference: draft.grnReference,
    grnDate: draft.grnDate,
    deliveryChallanNumber: draft.deliveryChallanNumber,
    deliveryChallanDate: draft.deliveryChallanDate,
    itemDetails: draft.itemDescription,
    quantity: numberValue(draft.quantity),
    price: numberValue(draft.unitPrice),
    subtotal: numberValue(draft.subtotal),
    taxableAmount: numberValue(draft.taxableAmount),
    cgstAmount: numberValue(draft.cgstAmount),
    sgstAmount: numberValue(draft.sgstAmount),
    igstAmount: numberValue(draft.igstAmount),
    tdsAmount: numberValue(draft.tdsAmount),
    freightAmount: numberValue(draft.freightAmount),
    roundOff: numberValue(draft.roundOff),
    grossAmount: numberValue(draft.grossAmount),
    terms: draft.paymentTerms,
    remarks: draft.remarks,
    paymentMode: draft.paymentMode as WorkflowItem['paymentMode'],
  };
}

function badgeForStatus(status: WorkflowItem['status']) {
  if (status === 'Approved' || status === 'Queued for Payment' || status === 'Paid') return 'emerald' as const;
  if (status === 'Rejected' || status === 'Payment Failed') return 'rose' as const;
  if (status === 'On Hold') return 'amber' as const;
  return 'cyan' as const;
}

function Field({ field, value, onChange, error }: { field: FieldDef; value: string; onChange: (value: string) => void; error?: string }) {
  const isSearchable = field.options && ['vendorName', 'poNumber'].includes(field.key);
  if (field.options && isSearchable) {
    const datalistId = `${field.key}-options`;
    return (
      <label className="text-sm text-slate-300">
        {field.label}
        <input
          required={field.required !== false}
          type={field.type || 'text'}
          list={datalistId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Search or select ${field.label.toLowerCase()}`}
          className={`mt-2 w-full rounded-lg border bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30 ${error ? 'border-rose-500/50' : 'border-white/10'}`}
        />
        <datalist id={datalistId}>
          {field.options.map((option) => <option key={option} value={option} />)}
        </datalist>
        {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
      </label>
    );
  }

  if (field.options) {
    return (
      <label className="text-sm text-slate-300">
        {field.label}
        <select value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 w-full rounded-lg border bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30 ${error ? 'border-rose-500/50' : 'border-white/10'}`}>
          {field.options.map((option) => <option key={option}>{option}</option>)}
        </select>
        {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
      </label>
    );
  }

  return (
    <label className="text-sm text-slate-300">
      {field.label}
      <input
        required={field.required !== false}
        type={field.type || 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full rounded-lg border bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30 ${error ? 'border-rose-500/50' : 'border-white/10'}`}
      />
      {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
    </label>
  );
}

function ValidationResult({ result }: { result: InvoiceValidationResult }) {
  const CheckItem = ({ label, passed, warning }: { label: string; passed: boolean; warning?: boolean }) => (
    <div className="flex items-center gap-2 text-xs">
      {passed ? (
        <span className="text-emerald-400">✓</span>
      ) : warning ? (
        <span className="text-amber-400">⚠</span>
      ) : (
        <span className="text-rose-400">✗</span>
      )}
      <span className={passed ? 'text-slate-300' : 'text-slate-100'}>{label}</span>
    </div>
  );

  return (
    <div className={`rounded-lg border p-4 shadow-glow ${result.valid ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          {result.valid ? <CheckCircle2 size={18} className="text-emerald-400" /> : <XCircle size={18} className="text-rose-400" />}
          <div className="font-semibold text-white">Validation {result.status}</div>
          <Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          {result.errors.length} Errors • {result.variances.length} Variances
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <CheckItem label="Vendor verified" passed={result.checks.vendorVerified} />
          <CheckItem label="PO matched" passed={result.checks.poMatched} />
          <CheckItem label="GRN matched" passed={result.checks.grnMatched} />
          <CheckItem label="Tax validated" passed={result.checks.taxValidated} />
          <CheckItem label="Amount matched" passed={result.checks.amountMatched} />
        </div>

        <div className="rounded-lg bg-slate-950/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Approval Readiness</div>
          <div className="text-sm font-medium text-slate-200">
            {result.valid ? 'Ready for approval workflow submission.' : 'Submission blocked. Fix critical errors.'}
          </div>
        </div>
      </div>

      {result.errors.length > 0 && <div className="mt-4 grid gap-2">{result.errors.map((error) => <div key={error} className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">{error}</div>)}</div>}

      {result.variances.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
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

function escapeHtml(value: string | number) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function TraditionalInvoicePreview({ draft, item, onClose }: { draft?: InvoiceDraft; item?: WorkflowItem; onClose: () => void }) {
  const invoice = draft ? {
    invoiceNumber: draft.invoiceNumber,
    invoiceDate: draft.invoiceDate,
    vendorName: draft.vendorName,
    vendorGstin: draft.vendorGstin,
    vendorPan: draft.vendorPan,
    vendorAddress: draft.vendorAddress,
    bankName: draft.bankName,
    ifsc: draft.ifsc,
    account: draft.bankAccountMasked,
    poNumber: draft.poNumber,
    itemDescription: draft.itemDescription,
    quantity: numberValue(draft.quantity),
    unitPrice: numberValue(draft.unitPrice),
    taxableAmount: numberValue(draft.taxableAmount),
    gst: totalTax(draft),
    gross: (numberValue(draft.grossAmount) || (numberValue(draft.taxableAmount) + totalTax(draft))),
    paymentTerms: draft.paymentTerms,
  } : {
    invoiceNumber: item?.invoiceNumber || '',
    invoiceDate: item?.invoiceDate || today,
    vendorName: item?.vendorName || '',
    vendorGstin: '',
    vendorPan: '',
    vendorAddress: '',
    bankName: '',
    ifsc: '',
    account: '',
    poNumber: item?.poNumber || '',
    itemDescription: 'Goods / service as per PO',
    quantity: item?.grnQty || 0,
    unitPrice: item && item.grnQty ? item.invoiceAmount / item.grnQty : 0,
    taxableAmount: item?.invoiceAmount || 0,
    gst: item?.gstAmount || 0,
    gross: (item?.invoiceAmount || 0) + (item?.gstAmount || 0),
    paymentTerms: 'Net 30',
  };
  const detailGroups = draft ? invoiceGroups.map((group) => ({
    title: group.title,
    rows: group.fields.map((field) => [field.label, draft[field.key] || '-'] as const),
  })) : [
    {
      title: 'Workflow invoice record',
      rows: [
        ['Invoice number', invoice.invoiceNumber],
        ['Invoice date', invoice.invoiceDate],
        ['Vendor name', invoice.vendorName],
        ['PO reference number', invoice.poNumber],
        ['Quantity', invoice.quantity],
        ['Unit price', money(invoice.unitPrice)],
        ['Taxable amount', money(invoice.taxableAmount)],
        ['GST amount', money(invoice.gst)],
        ['Gross amount', money(invoice.gross)],
        ['Payment terms', invoice.paymentTerms],
      ] as Array<readonly [string, string | number]>,
    },
  ];

  function printPdf() {
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) return;
    const fullFieldRows = detailGroups.map((group) => `
      <section class="section">
        <h2>${escapeHtml(group.title)}</h2>
        <table>
          <tbody>
            ${group.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}
          </tbody>
        </table>
      </section>
    `).join('');
    win.document.write(`
      <html>
        <head>
          <title>${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; }
            .top { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 18px; }
            h1 { margin: 0; font-size: 28px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #fff7ed; }
            h2 { margin: 22px 0 0; font-size: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 22px; }
            .box { border: 1px solid #d1d5db; padding: 12px; min-height: 96px; }
            .totals { width: 360px; margin-left: auto; }
            .right { text-align: right; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Download / Save as PDF</button>
          <div class="top">
            <div><h1>Tax Invoice</h1><div>ProcureFlow Demo Pvt Ltd</div><div>GSTIN: 27AAECP1234F1Z7</div></div>
            <div class="right"><strong>${invoice.invoiceNumber}</strong><div>Date: ${invoice.invoiceDate}</div><div>PO: ${invoice.poNumber}</div></div>
          </div>
          <div class="grid">
            <div class="box"><strong>Vendor</strong><br>${invoice.vendorName}<br>GSTIN: ${invoice.vendorGstin || '-'}<br>PAN: ${invoice.vendorPan || '-'}<br>${invoice.vendorAddress || ''}</div>
            <div class="box"><strong>Bank</strong><br>${invoice.bankName || '-'}<br>A/C: ${invoice.account || '-'}<br>IFSC: ${invoice.ifsc || '-'}<br>Terms: ${invoice.paymentTerms}</div>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
            <tbody><tr><td>${invoice.itemDescription}</td><td>${invoice.quantity}</td><td>${money(invoice.unitPrice)}</td><td>${money(invoice.taxableAmount)}</td><td>${money(invoice.gst)}</td><td>${money(invoice.gross)}</td></tr></tbody>
          </table>
          <table class="totals">
            <tr><th>Taxable amount</th><td class="right">${money(invoice.taxableAmount)}</td></tr>
            <tr><th>GST</th><td class="right">${money(invoice.gst)}</td></tr>
            <tr><th>Gross total</th><td class="right"><strong>${money(invoice.gross)}</strong></td></tr>
          </table>
          ${fullFieldRows}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07111f] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Tax Invoice Preview</h2>
            <p className="text-sm text-slate-400">{invoice.invoiceNumber} | {invoice.vendorName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={printPdf} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"><Download size={15} /> PDF</button>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300"><X size={17} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="rounded-lg border border-white/10 bg-white p-6 text-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div><div className="text-2xl font-bold">Tax Invoice</div><div className="mt-1 text-sm">ProcureFlow Demo Pvt Ltd</div><div className="text-sm">GSTIN: 27AAECP1234F1Z7</div></div>
              <div className="text-right text-sm"><div className="font-bold">{invoice.invoiceNumber}</div><div>Date: {invoice.invoiceDate}</div><div>PO: {invoice.poNumber}</div></div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded border border-slate-200 p-3 text-sm"><div className="font-bold">Vendor</div><div>{invoice.vendorName}</div><div>GSTIN: {invoice.vendorGstin || '-'}</div><div>PAN: {invoice.vendorPan || '-'}</div><div>{invoice.vendorAddress}</div></div>
              <div className="rounded border border-slate-200 p-3 text-sm"><div className="font-bold">Bank</div><div>{invoice.bankName || '-'}</div><div>A/C: {invoice.account || '-'}</div><div>IFSC: {invoice.ifsc || '-'}</div><div>Terms: {invoice.paymentTerms}</div></div>
            </div>
            <div className="mt-5 overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead><tr className="bg-orange-50"><th className="border border-slate-200 p-2 text-left">Description</th><th className="border border-slate-200 p-2 text-right">Qty</th><th className="border border-slate-200 p-2 text-right">Unit Price</th><th className="border border-slate-200 p-2 text-right">Taxable</th><th className="border border-slate-200 p-2 text-right">GST</th><th className="border border-slate-200 p-2 text-right">Total</th></tr></thead>
                <tbody><tr><td className="border border-slate-200 p-2">{invoice.itemDescription}</td><td className="border border-slate-200 p-2 text-right">{invoice.quantity}</td><td className="border border-slate-200 p-2 text-right">{money(invoice.unitPrice)}</td><td className="border border-slate-200 p-2 text-right">{money(invoice.taxableAmount)}</td><td className="border border-slate-200 p-2 text-right">{money(invoice.gst)}</td><td className="border border-slate-200 p-2 text-right font-bold">{money(invoice.gross)}</td></tr></tbody>
              </table>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {detailGroups.map((group) => (
                <section key={group.title} className="rounded border border-slate-200 p-3">
                  <div className="text-sm font-bold">{group.title}</div>
                  <div className="mt-2 grid gap-1 text-xs">
                    {group.rows.map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[150px_1fr] gap-2 border-b border-slate-100 py-1">
                        <span className="text-slate-500">{label}</span>
                        <span className="break-words font-medium">{value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const user = useDemoUser();
  const toast = useToast();
  const { vendors } = useVendors();
  const { items, save } = useWorkflowItems();
  const { items: purchaseOrders } = usePurchaseOrders();
  const [activeView, setActiveView] = useState<InvoiceView>('create');
  const [mode, setMode] = useState<IntakeMode>('OCR');
  const [draft, setDraft] = useState<InvoiceDraft>(defaultDraft);
  const invoiceDraftKey = useMemo(() => `invoice:auto-save:create`, []);

  const [result, setResult] = useState<InvoiceValidationResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ocrDiscrepancies, setOcrDiscrepancies] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [previewDraft, setPreviewDraft] = useState<InvoiceDraft | null>(null);
  const [previewItem, setPreviewItem] = useState<WorkflowItem | null>(null);
  const pageSize = 8;

  const rows = useMemo(() => items.map((item, index) => ({
    ...item,
    arrivalDate: index < 3 ? today : item.updatedAt,
    intakeMode: item.lastActionBy.toLowerCase().includes('ocr') ? 'OCR' : 'Manual',
  })), [items]);
  const todayRows = rows.filter((row) => row.arrivalDate === today);

  useEffect(() => {
    // Restore auto-saved invoice form state.
    const saved = readDraft<{
      draft: InvoiceDraft;
      activeView: InvoiceView;
      mode: IntakeMode;
      ocrDiscrepancies: string[];
    }>(invoiceDraftKey);

    if (!saved) return;

    setDraft(saved.draft);
    setActiveView(saved.activeView);
    setMode(saved.mode);
    setOcrDiscrepancies(saved.ocrDiscrepancies ?? []);
  }, [invoiceDraftKey]);

  useFormDraftAutoSave({
    draftKey: invoiceDraftKey,
    enabled: true,
    debounceMs: 450,
    draft: { draft, activeView, mode, ocrDiscrepancies },
  });

  const filteredRows = useMemo(() => {

    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const byStatus = statusFilter === 'All' || row.status === statusFilter || row.matchStatus === statusFilter || row.paymentStatus === statusFilter;
      const bySource = sourceFilter === 'All' || row.intakeMode === sourceFilter;
      const phrase = `${row.invoiceNumber} ${row.vendorName} ${row.poNumber} ${row.grnReference} ${row.deliveryChallanNumber} ${row.status} ${row.matchStatus}`.toLowerCase();
      return byStatus && bySource && (!q || phrase.includes(q));
    });
  }, [rows, query, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const vendorOptions = useMemo(() => ['Select vendor', ...vendors.map(v => v.displayName || v.legalName)], [vendors]);
  const poOptions = useMemo(() => ['Select PO', ...purchaseOrders.map(p => p.poNumber)], [purchaseOrders]);


  function calculateAutoTotals(nextDraft: InvoiceDraft): Partial<InvoiceDraft> {
    const quantity = numberValue(nextDraft.quantity);
    const price = numberValue(nextDraft.unitPrice);
    const subtotal = Number((quantity * price).toFixed(2));
    const discount = numberValue(nextDraft.discount);
    const taxableAmount = Number((subtotal - discount).toFixed(2));
    const gstRate = numberValue(nextDraft.gstRate);
    const totalTax = Number((taxableAmount * (gstRate / 100)).toFixed(2));
    const halfTax = Number((totalTax / 2).toFixed(2));
    const grossAmount = Number((taxableAmount + totalTax + numberValue(nextDraft.freightAmount) + numberValue(nextDraft.roundOff) - numberValue(nextDraft.tdsAmount)).toFixed(2));

    return {
      subtotal: subtotal.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      cgstAmount: halfTax.toFixed(2),
      sgstAmount: (totalTax - halfTax).toFixed(2),
      igstAmount: '0.00',
      grossAmount: grossAmount.toFixed(2),
    };
  }

  function handleField(key: string, value: string | 'Select vendor' | 'Select PO' | 'Select GRN') {
    if (value === 'Select vendor' || value === 'Select PO' || value === 'Select GRN') return;
    const rawValue = String(value).trim();
    let nextDraft = { ...draft, [key]: rawValue };

    if (key === 'vendorName') {
      const vendor = findVendor(vendors, rawValue);
      if (vendor) nextDraft = deriveDraftFromVendor(nextDraft, vendor);
    }

    if (key === 'poNumber') {
      if (!rawValue) {
        nextDraft = { ...nextDraft, grnReference: '', grnDate: '', deliveryChallanNumber: '', deliveryChallanDate: '' };
      }

      const po = findPurchaseOrder(purchaseOrders, rawValue);
      if (po) {
        const vendor = vendors.find(v => v.id === po.vendorId || v.vendorCode === po.vendorReferenceId) || findVendor(vendors, po.vendorName);
        if (vendor) nextDraft = deriveDraftFromVendor(nextDraft, vendor);

        nextDraft = deriveDraftFromPurchaseOrder(nextDraft, po);
      }
    }

    // if (['poNumber', 'quantity', 'unitPrice', 'discount', 'gstRate', 'freightAmount', 'roundOff', 'tdsAmount'].includes(key)) {
      // nextDraft = { ...nextDraft, ...calculateAutoTotals(nextDraft) };
    // }

    setDraft(nextDraft);
    setFieldErrors({});
    if (['vendorName', 'poNumber', 'grnReference', 'quantity', 'unitPrice', 'gstRate'].includes(key)) {
      setResult(evaluateDraft(nextDraft, items, vendors, purchaseOrders));
    }
  }

  function runOcr(fileName?: string) {
    const po = findPurchaseOrder(purchaseOrders, 'PO-1002') || purchaseOrders[0];
    const vendor = po ? vendors.find((entry) => entry.id === po.vendorId) || findVendor(vendors, po.vendorName) : vendors.find((entry) => entry.approvalStatus === 'Approved') || vendors[0];
    const subtotal = po?.subtotal ?? 68000;
    const gst = po?.taxAmount ?? Math.round(subtotal * 0.18);
    let nextDraft: InvoiceDraft = {
      ...defaultDraft,
      invoiceNumber: `OCR-${String(Date.now()).slice(-6)}`,
      invoiceDate: today,
      dueDate: today,
      receiptDate: today,
      sourceFileName: fileName || 'vendor-invoice-upload.pdf',
      ocrConfidence: '87',
      vendorId: vendor?.id || '',
      vendorName: vendor?.displayName || vendor?.legalName || 'Aster Distributor',
      vendorCode: vendor?.vendorCode || '',
      vendorGstin: vendor?.gstin || '27ABCDE1234F1Z5',
      vendorPan: vendor?.pan || 'ABCDE1234F',
      vendorAddress: `${vendor?.city || 'Pune'}, ${vendor?.state || 'Maharashtra'}`,
      bankName: vendor?.bankName || 'HDFC Bank',
      bankAccountMasked: vendor?.accountNumberMasked || 'XXXXXX1234',
      ifsc: vendor?.ifsc || 'HDFC0000123',
      bankBranch: vendor?.bankBranch || 'Main Branch',
      beneficiaryName: vendor?.displayName || vendor?.legalName || 'Aster Distributor',
      poNumber: po?.poNumber || 'PO-1002',
      poDate: po?.poDate || today,
      grnReference: po?.grnReference || '',
      grnDate: po?.grnDate || today,
      deliveryChallanNumber: po?.deliveryChallanNumber || '',
      deliveryChallanDate: po?.deliveryChallanDate || today,
      itemDescription: po?.items[0]?.itemDescription || 'Implementation consulting sprint',
      quantity: String(po?.receivedQuantity || po?.items[0]?.quantityOrdered || 4),
      unitPrice: String(po?.items[0]?.unitPrice || 17000),
      subtotal: String(subtotal),
      taxableAmount: String(subtotal),
      cgstAmount: (gst / 2).toFixed(2),
      sgstAmount: (gst / 2).toFixed(2),
      grossAmount: (subtotal + gst).toFixed(2),
      remarks: 'OCR extracted draft. Verify mismatch cards before sending to approval.',
    };
    if (po) {
      nextDraft = deriveDraftFromPurchaseOrder(nextDraft, po);
    }
    // nextDraft = { ...nextDraft, ...calculateAutoTotals(nextDraft) };
    setDraft(nextDraft);
    setMode('OCR');
    setOcrDiscrepancies(['OCR confidence below 90%', 'Bank account masked value needs vendor master check', 'GST split requires manual confirmation']);
    setResult(null);
    toast({ type: 'info', title: 'OCR extracted', description: 'Invoice fields were filled from the uploaded file.' });
  }

  function validateCurrent(): InvoiceValidationResult {
    const currentTotals = calculateAutoTotals(draft);
    const updatedDraft = { ...draft, ...currentTotals } as InvoiceDraft;
    setDraft(updatedDraft);

    const validation = evaluateDraft(updatedDraft, items, vendors, purchaseOrders);
    setResult(validation);
    setFieldErrors(validation.fieldErrors);

    toast({
      type: validation.valid ? 'success' : 'error',
      title: validation.valid ? `Validation Result: ${validation.status}` : 'Validation Failed',
      description: validation.valid ? 'Date, amount, GST, bank, vendor, PO, GRN, and challan checks finished.' : validation.errors[0] || 'Fix required invoice fields.',
    });
    return validation;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateCurrent(); // This ensures totals are synced and result is updated

    setResult(validation);
    setFieldErrors(validation.fieldErrors);

    if (!validation.valid) {
      toast({ type: 'error', title: 'Submission Blocked', description: 'Resolve critical validation errors highlighted below before submitting.' });
      return;
    }

    const manualDraft = toManualDraft(draft);
    const nextItem: WorkflowItem = {
      id: `WF-${String(Date.now()).slice(-6)}`,
      vendorId: manualDraft.vendorId || validation.poSource?.vendorId || '',
      vendorName: manualDraft.vendorName,
      poNumber: manualDraft.poNumber,
      poAmount: validation.poSource?.finalTotalAmount ?? manualDraft.grossAmount,
      poQty: validation.poSource ? (validation.poSource.items ? validation.poSource.items.reduce((s, it) => s + (it.quantityOrdered || 0), 0) : manualDraft.quantity) : manualDraft.quantity,
      grnReference: manualDraft.grnReference,
      grnDate: manualDraft.grnDate,
      grnQty: manualDraft.quantity,
      deliveryChallanNumber: manualDraft.deliveryChallanNumber || '',
      deliveryChallanDate: manualDraft.deliveryChallanDate || '',
      invoiceNumber: manualDraft.invoiceNumber,
      invoiceDate: manualDraft.invoiceDate,
      invoiceAmount: manualDraft.taxableAmount,
      gstAmount: manualDraft.taxAmount,
      approvalLevel: approvalLevelFor(manualDraft.grossAmount),
      status: validation.status === 'Matched' ? 'Submitted' : 'On Hold',
      matchStatus: validation.status === 'Matched' ? 'Matched' : 'Variance',
      paymentMode: manualDraft.paymentMode,
      paymentStatus: validation.status === 'Matched' ? 'Not Ready' : 'Hold',
      erpSyncStatus: 'Pending',
      lastActionBy: `${mode} Invoice Intake (Validated)`,
      updatedAt: today,
    };
    save([nextItem, ...items]);
    toast({
      type: validation.status === 'Matched' ? 'success' : 'warning',
      title: validation.status === 'Matched' ? 'Invoice sent to approval' : 'Invoice held for discrepancy',
      description: `${draft.invoiceNumber} is synced across invoice, matching, approval, and payment pages.`,
    });
    clearDraft(invoiceDraftKey);

    setDraft(defaultDraft);
    setResult(null);
    setOcrDiscrepancies([]);
    setActiveView('register');

  }

  function flagException() {
    setOcrDiscrepancies((current) => current.length ? current : ['AP exception flagged for internal review']);
    toast({ type: 'warning', title: 'Exception flagged', description: `${draft.invoiceNumber || 'Invoice'} stays in AP review until the fields are corrected.` });
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Invoice intake"
        subtitle="AP users either upload an invoice for OCR extraction or create it manually. Registers are shown separately so forms and data do not fight for space."
        action={
          <SegmentedControl
            value={activeView}
            onChange={setActiveView}
            options={[
              { value: 'create', label: 'Create invoice', icon: <FileText size={14} /> },
              { value: 'register', label: 'Invoice register', icon: <ListChecks size={14} /> },
            ]}
          />
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Arrived today" value={todayRows.length} icon={<FileText size={18} />} tone="cyan" />
          <MetricCard label="Matched" value={items.filter((item) => item.matchStatus === 'Matched').length} icon={<CheckCircle2 size={18} />} tone="emerald" />
          <MetricCard label="Variance / hold" value={items.filter((item) => item.matchStatus === 'Variance' || item.status === 'On Hold').length} icon={<AlertTriangle size={18} />} tone="amber" />
          <MetricCard label="Signed in" value={user.role} helper={`${mode === 'OCR' ? 'Upload + OCR' : 'Manual'} intake mode`} />
        </div>
      </Panel>

      {activeView === 'create' && <Panel title="Create invoice" subtitle="Choose Upload + OCR for extracted data, or Manual for direct AP entry. Both routes create a workflow invoice after validation.">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-white/10 bg-slate-950/45 p-1">
              {(['OCR', 'Manual'] as IntakeMode[]).map((entry) => (
                <button key={entry} type="button" onClick={() => setMode(entry)} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${mode === entry ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}>
                  {entry === 'OCR' ? <FileImage size={16} /> : <FileText size={16} />}
                  {entry === 'OCR' ? 'Upload + OCR' : 'Manual'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
                <Upload size={15} /> Upload invoice
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => runOcr(event.target.files?.[0]?.name)} />
              </label>
              <button type="button" onClick={() => runOcr()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"><RotateCcw size={15} /> Demo OCR</button>
            </div>
          </div>

          {ocrDiscrepancies.length > 0 && (
            <div className="grid gap-2 md:grid-cols-3">
              {ocrDiscrepancies.map((message) => <div key={message} className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{message}</div>)}
            </div>
          )}

          {invoiceGroups.map((group) => (
            <section key={group.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">{group.title}</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                {group.fields.map((field) => {
                  const enhancedField = { ...field };
                  if (field.key === 'vendorName') enhancedField.options = vendorOptions;
                  if (field.key === 'poNumber') enhancedField.options = poOptions;
                  
                  return (
                    <Field key={field.key} field={enhancedField} value={draft[field.key] || ''} onChange={(value) => handleField(field.key, value)} error={fieldErrors[field.key]} />
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={validateCurrent} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"><CheckCircle2 size={16} /> Validate</button>
            <button type="button" onClick={flagException} className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-400/15"><AlertTriangle size={16} /> Flag exception</button>
            <button type="button" onClick={() => setPreviewDraft(draft)} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/15"><Eye size={16} /> Preview invoice</button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"><Save size={16} /> Submit workflow</button>
          </div>
          {result && <ValidationResult result={result} />}
        </form>
      </Panel>}

      {activeView === 'register' && <>
      <Panel title="Invoices arrived today" subtitle="Current-day invoices use the same shared workflow records.">
        <div className="overflow-auto">
          <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">Purchase Order</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Match</th><th className="border-b border-white/10 px-3 py-3">Status</th><th className="border-b border-white/10 px-3 py-3">Action</th></tr></thead>
            <tbody>{todayRows.map((row) => <tr key={row.id} className="hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{row.invoiceNumber}<div className="text-xs text-slate-500">{row.intakeMode} | {row.arrivalDate}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{row.vendorName}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{row.poNumber}</td><td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(row.invoiceAmount)}<div className="text-xs text-slate-500">GST {money(row.gstAmount)}</div></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={row.matchStatus === 'Matched' ? 'emerald' : row.matchStatus === 'Variance' ? 'amber' : 'slate'}>{row.matchStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={badgeForStatus(row.status)}>{row.status}</Badge></td><td className="border-b border-white/5 px-3 py-4"><button onClick={() => setPreviewItem(row)} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200"><Eye size={14} />View</button></td></tr>)}</tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title={`Invoice history (${filteredRows.length})`}
        subtitle="Search and filter all invoice history. Status updates stay synced across matching, approvals, and payments."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search invoice, vendor, PO..." className="w-72 rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/30" />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {['All', 'Submitted', 'Matched', 'Variance', 'On Hold', 'Queued for Payment', 'Paid', 'Rejected'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {['All', 'OCR', 'Manual'].map((source) => <option key={source}>{source}</option>)}
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-[1280px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-[0.14em] text-slate-500"><th className="border-b border-white/10 px-3 py-3">Invoice</th><th className="border-b border-white/10 px-3 py-3">Vendor</th><th className="border-b border-white/10 px-3 py-3">Documents</th><th className="border-b border-white/10 px-3 py-3">Amount</th><th className="border-b border-white/10 px-3 py-3">Route</th><th className="border-b border-white/10 px-3 py-3">Match</th><th className="border-b border-white/10 px-3 py-3">Approval</th><th className="border-b border-white/10 px-3 py-3">Payment</th><th className="border-b border-white/10 px-3 py-3">Action</th></tr></thead>
            <tbody>{pageRows.map((row) => <tr key={row.id} className="hover:bg-white/[0.03]"><td className="border-b border-white/5 px-3 py-4 font-medium text-white">{row.invoiceNumber}<div className="text-xs text-slate-500">{row.invoiceDate} | {row.intakeMode}</div></td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{row.vendorName}</td><td className="border-b border-white/5 px-3 py-4 text-slate-300">{row.poNumber}</td><td className="border-b border-white/5 px-3 py-4 text-slate-200">{money(row.invoiceAmount)}<div className="text-xs text-slate-500">GST {money(row.gstAmount)}</div></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={row.approvalLevel === 'L1' ? 'cyan' : row.approvalLevel === 'L2' ? 'violet' : 'amber'}>{row.approvalLevel}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={row.matchStatus === 'Matched' ? 'emerald' : row.matchStatus === 'Variance' ? 'amber' : 'slate'}>{row.matchStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={badgeForStatus(row.status)}>{row.status}</Badge></td><td className="border-b border-white/5 px-3 py-4"><Badge tone={row.paymentStatus === 'Ready' || row.paymentStatus === 'Paid' ? 'emerald' : row.paymentStatus === 'Hold' ? 'amber' : row.paymentStatus === 'Failed' ? 'rose' : 'slate'}>{row.paymentStatus}</Badge></td><td className="border-b border-white/5 px-3 py-4"><button onClick={() => setPreviewItem(row)} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200">Preview</button></td></tr>)}</tbody>
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
      </>}

      {previewDraft && <TraditionalInvoicePreview draft={previewDraft} onClose={() => setPreviewDraft(null)} />}
      {previewItem && <TraditionalInvoicePreview item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}
