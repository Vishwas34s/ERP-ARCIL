import type { WorkflowItem } from './workflow-store';

export type MatchStatusLabel = 'Matched' | 'Variance Detected';

export type VarianceDetail = {
  field: 'Quantity' | 'Price' | 'Terms' | 'Vendor' | 'GST' | 'PO Reference' | 'GRN Reference' | 'Date' | 'Amount';
  expected: string;
  actual: string;
  severity: 'warning' | 'critical';
};

export type ManualInvoiceDraft = {
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorGstin: string;
  invoiceAmount: number;
  taxAmount: number;
  gstInformation: string;
  poNumber: string;
  grnNumber: string;
  challanNumber: string;
  itemDetails: string;
  quantity: number;
  price: number;
  terms: string;
  remarks: string;
  paymentMode: WorkflowItem['paymentMode'];
};

export type InvoiceValidationResult = {
  valid: boolean;
  errors: string[];
  status: MatchStatusLabel;
  variances: VarianceDetail[];
  poSource?: WorkflowItem;
  grnSource?: WorkflowItem;
};

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : 'Missing';
}

export function matchStatusLabel(status: WorkflowItem['matchStatus']) {
  return status === 'Variance' ? 'Variance Detected' : status;
}

export function matchBadgeTone(status: WorkflowItem['matchStatus'] | MatchStatusLabel) {
  if (status === 'Matched') return 'emerald' as const;
  if (status === 'Variance' || status === 'Variance Detected') return 'amber' as const;
  return 'slate' as const;
}

export function evaluateWorkflowMatch(item: WorkflowItem): { status: MatchStatusLabel; variances: VarianceDetail[] } {
  const variances: VarianceDetail[] = [];
  const unitPrice = item.poQty > 0 ? item.poAmount / item.poQty : 0;
  const invoicePrice = item.grnQty > 0 ? item.invoiceAmount / item.grnQty : 0;

  if (item.poQty !== item.grnQty) {
    variances.push({ field: 'Quantity', expected: `PO qty ${item.poQty}`, actual: `GRN qty ${item.grnQty}`, severity: 'critical' });
  }

  if (Math.abs(item.poAmount - item.invoiceAmount) > 0.01 || Math.abs(unitPrice - invoicePrice) > 0.01) {
    variances.push({ field: 'Price', expected: `PO amount ${formatNumber(item.poAmount)}`, actual: `Invoice amount ${formatNumber(item.invoiceAmount)}`, severity: 'critical' });
  }

  if (!item.poNumber.trim()) {
    variances.push({ field: 'PO Reference', expected: 'PO reference present', actual: 'Missing', severity: 'critical' });
  }

  if (!item.grnNumber.trim() || !item.challanNumber.trim()) {
    variances.push({ field: 'GRN Reference', expected: 'GRN and challan references present', actual: 'Missing reference', severity: 'critical' });
  }

  return { status: variances.length ? 'Variance Detected' : 'Matched', variances };
}

export function validateManualInvoice(draft: ManualInvoiceDraft, records: WorkflowItem[], existingInvoiceNumbers: string[] = [], vendors: import('./types').Vendor[] = []): InvoiceValidationResult {
  const errors: string[] = [];
  const variances: VarianceDetail[] = [];
  const required: Array<[keyof ManualInvoiceDraft, string]> = [
    ['invoiceNumber', 'Invoice number'],
    ['invoiceDate', 'Invoice date'],
    ['vendorName', 'Vendor name'],
    ['vendorGstin', 'Vendor GST details'],
    ['poNumber', 'PO reference number'],
    ['grnNumber', 'GRN/delivery challan reference'],
    ['itemDetails', 'Item details'],
    ['terms', 'Terms/conditions'],
  ];

  required.forEach(([key, label]) => {
    if (!String(draft[key] ?? '').trim()) errors.push(`${label} is required.`);
  });

  if (!draft.invoiceDate || Number.isNaN(new Date(draft.invoiceDate).getTime())) {
    errors.push('Invoice date is invalid.');
  } else if (new Date(draft.invoiceDate) > new Date()) {
    errors.push('Invoice date cannot be in the future.');
  }

  if (draft.invoiceAmount <= 0) errors.push('Invoice amount must be greater than zero.');
  if (draft.taxAmount < 0) errors.push('Tax amount cannot be negative.');
  if (draft.quantity <= 0) errors.push('Quantity must be greater than zero.');
  if (draft.price <= 0) errors.push('Price must be greater than zero.');

  const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (draft.vendorGstin.trim() && !gstPattern.test(draft.vendorGstin.trim().toUpperCase())) {
    errors.push('Vendor GSTIN format is invalid.');
  }

  if (existingInvoiceNumbers.some((invoice) => sameText(invoice, draft.invoiceNumber))) {
    errors.push('Duplicate invoice number detected.');
  }

  const matchingVendor = vendors.find(v => sameText(v.legalName, draft.vendorName) || sameText(v.displayName, draft.vendorName));
  if (matchingVendor) {
    if (matchingVendor.blacklistFlag === 'Yes') {
      errors.push('Vendor is blacklisted and not allowed to submit invoices.');
    } else if (matchingVendor.approvalStatus !== 'Approved') {
      errors.push('Vendor onboarding is incomplete. Approval required before invoicing.');
    }
  }

  const poSource = records.find((item) => sameText(item.poNumber, draft.poNumber));
  const grnSource = records.find((item) => sameText(item.grnNumber, draft.grnNumber) || sameText(item.challanNumber, draft.grnNumber) || sameText(item.challanNumber, draft.challanNumber));

  if (!poSource) {
    variances.push({ field: 'PO Reference', expected: 'Existing PO record', actual: draft.poNumber || 'Missing', severity: 'critical' });
  }

  if (!grnSource) {
    variances.push({ field: 'GRN Reference', expected: 'Existing GRN or delivery challan', actual: draft.grnNumber || draft.challanNumber || 'Missing', severity: 'critical' });
  }

  if (poSource && !sameText(poSource.vendorName, draft.vendorName)) {
    variances.push({ field: 'Vendor', expected: poSource.vendorName, actual: draft.vendorName, severity: 'critical' });
  }

  if (poSource && poSource.poQty !== draft.quantity) {
    variances.push({ field: 'Quantity', expected: `PO qty ${poSource.poQty}`, actual: `Invoice qty ${formatNumber(draft.quantity)}`, severity: 'critical' });
  }

  if (grnSource && grnSource.grnQty !== draft.quantity) {
    variances.push({ field: 'Quantity', expected: `GRN qty ${grnSource.grnQty}`, actual: `Invoice qty ${formatNumber(draft.quantity)}`, severity: 'critical' });
  }

  if (poSource) {
    const expectedUnitPrice = poSource.poQty > 0 ? poSource.poAmount / poSource.poQty : 0;
    if (Math.abs(expectedUnitPrice - draft.price) > 0.01 || Math.abs(poSource.poAmount - draft.invoiceAmount) > 0.01) {
      variances.push({ field: 'Price', expected: `PO unit ${formatNumber(expectedUnitPrice)} / amount ${formatNumber(poSource.poAmount)}`, actual: `Invoice unit ${formatNumber(draft.price)} / amount ${formatNumber(draft.invoiceAmount)}`, severity: 'critical' });
    }
  }

  if (draft.gstInformation.trim() && !draft.gstInformation.toLowerCase().includes('gst')) {
    variances.push({ field: 'GST', expected: 'GST information describing applicable GST', actual: draft.gstInformation, severity: 'warning' });
  }

  if (draft.taxAmount > draft.invoiceAmount * 0.28) {
    variances.push({ field: 'GST', expected: 'Tax within configured tolerance', actual: formatNumber(draft.taxAmount), severity: 'warning' });
  }

  if (draft.terms.trim() && !draft.terms.toLowerCase().includes('net 30')) {
    variances.push({ field: 'Terms', expected: 'Net 30 standard PO terms', actual: draft.terms, severity: 'warning' });
  }

  return {
    valid: errors.length === 0,
    errors,
    status: variances.length ? 'Variance Detected' : 'Matched',
    variances,
    poSource,
    grnSource,
  };
}
