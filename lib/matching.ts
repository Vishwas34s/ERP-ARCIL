import type { GoodsReceipt, PurchaseOrder } from './types';
import type { WorkflowItem } from './workflow-store';

export type MatchStatusLabel = 
  | 'Success' 
  | 'Warning' 
  | 'Failed' 
  | 'Pending Review' 
  | 'Matched' 
  | 'Partial Match' 
  | 'Quantity Variance' 
  | 'GST Variance' 
  | 'Vendor Mismatch' 
  | 'Hold' 
  | 'Rejected' 
  | 'Variance Detected';

export type VarianceDetail = {
  field: 'Quantity' | 'Price' | 'Terms' | 'Vendor' | 'GST' | 'PO Reference' | 'GRN Reference' | 'Date' | 'Amount';
  expected: string;
  actual: string;
  severity: 'warning' | 'critical';
};

export type ManualInvoiceDraft = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  vendorId?: string;
  vendorName: string;
  vendorCode: string;
  vendorGstin: string;
  vendorPan: string;
  invoiceAmount: number;
  taxAmount: number;
  gstInformation: string;
  gstRate: number;
  poNumber: string;
  grnNumber: string;
  grnDate: string;
  itemDetails: string;
  quantity: number;
  price: number;
  subtotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  tdsAmount: number;
  freightAmount: number;
  roundOff: number;
  grossAmount: number;
  terms: string;
  remarks: string;
  paymentMode: WorkflowItem['paymentMode'];
};

export type InvoiceValidationResult = {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
  status: MatchStatusLabel;
  variances: VarianceDetail[];
  poSource?: PurchaseOrder;
  grnSource?: GoodsReceipt;
  checks: {
    vendorVerified: boolean;
    poMatched: boolean;
    grnMatched: boolean;
    taxValidated: boolean;
    amountValidated: boolean;
  };
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
  if (status === 'Matched' || status === 'Success') return 'emerald' as const;
  if (status === 'Variance' || status === 'Variance Detected' || status === 'Warning' || status === 'Pending Review') return 'amber' as const;
  if (status === 'Failed' || status === 'Rejected') return 'rose' as const;
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

  if (!item.grnNumber.trim()) {
    variances.push({ field: 'GRN Reference', expected: 'GRN reference present', actual: 'Missing reference', severity: 'critical' });
  }

  return { status: variances.length ? 'Variance Detected' : 'Matched', variances };
}

export function validateManualInvoice(
  draft: ManualInvoiceDraft,
  records: WorkflowItem[],
  existingInvoiceNumbers: string[] = [],
  vendors: import('./types').Vendor[] = [],
  purchaseOrders: PurchaseOrder[] = [],
  goodsReceipts: GoodsReceipt[] = [],
): InvoiceValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const variances: VarianceDetail[] = [];

  const checks = {
    vendorVerified: false,
    poMatched: false,
    grnMatched: false,
    taxValidated: false,
    amountValidated: false,
  };

  const required: Array<[keyof ManualInvoiceDraft, string]> = [
    ['invoiceNumber', 'Invoice number'],
    ['vendorName', 'Vendor name'],
    ['vendorCode', 'Vendor code'],
    ['vendorGstin', 'Vendor GSTIN'],
    ['invoiceDate', 'Invoice date'],
    ['dueDate', 'Due date'],
    ['poNumber', 'PO Number'],
    ['quantity', 'Quantity'],
    ['taxableAmount', 'Taxable amount'],
    ['grossAmount', 'Gross amount'],
  ];

  required.forEach(([key, label]) => {
    const val = draft[key];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (typeof val === 'number' && val === 0 && (key === 'quantity' || key === 'grossAmount'))) {
      const msg = `${label} is required.`;
      errors.push(msg);
      fieldErrors[key] = msg;
    }
  });

  const invDate = new Date(draft.invoiceDate);
  const dueDt = new Date(draft.dueDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (!draft.dueDate || Number.isNaN(dueDt.getTime())) {
    const msg = 'Due date is required.';
    errors.push(msg);
    fieldErrors.dueDate = msg;
  }

  if (!Number.isNaN(invDate.getTime())) {
    if (invDate > today) {
      const msg = 'Invoice date cannot exceed current date.';
      errors.push(msg);
      fieldErrors.invoiceDate = msg;
    }
  }
  if (!Number.isNaN(invDate.getTime()) && !Number.isNaN(dueDt.getTime())) {
    if (dueDt < invDate) {
      const msg = 'Due date cannot be before invoice date.';
      errors.push(msg);
      fieldErrors.dueDate = msg;
    }
  }

  if (existingInvoiceNumbers.some((invoice) => sameText(invoice, draft.invoiceNumber))) {
    const msg = 'Duplicate invoice number detected.';
    errors.push(msg);
    fieldErrors.invoiceNumber = msg;
  }

  const matchingVendor = vendors.find(
    (v) => sameText(v.legalName, draft.vendorName) || sameText(v.displayName, draft.vendorName) || v.vendorCode === draft.vendorCode || (draft.vendorId && v.id === draft.vendorId),
  );

  if (!matchingVendor) {
    variances.push({ field: 'Vendor', expected: 'Approved vendor in master', actual: draft.vendorName || 'Not selected', severity: 'critical' });
  } else {
    checks.vendorVerified = true;
    if (matchingVendor.blacklistFlag === 'Yes') {
      errors.push('Vendor is blacklisted.');
      checks.vendorVerified = false;
    } else if (matchingVendor.approvalStatus !== 'Approved') {
      errors.push('Vendor is not approved in master.');
      checks.vendorVerified = false;
    }

    if (draft.vendorGstin && !sameText(matchingVendor.gstin, draft.vendorGstin)) {
      variances.push({ field: 'GST', expected: matchingVendor.gstin, actual: draft.vendorGstin, severity: 'critical' });
      checks.vendorVerified = false;
    }

    if (draft.vendorPan && matchingVendor.pan && !sameText(matchingVendor.pan, draft.vendorPan)) {
      variances.push({ field: 'Vendor', expected: matchingVendor.pan, actual: draft.vendorPan, severity: 'critical' });
      checks.vendorVerified = false;
    }
  }

  const poSource = purchaseOrders.find((po) => sameText(po.poNumber, draft.poNumber));
  const grnSource = goodsReceipts.find((grn) => sameText(grn.grnNumber, draft.grnNumber) || (draft.challanNumber && sameText(grn.deliveryChallanNumber, draft.challanNumber)));

  // Rule 1: Purchase Order is Mandatory
  if (!poSource) {
    const msg = 'PO selection is mandatory. Invoice must be linked to a valid Purchase Order.';
    errors.push(msg);
    if (draft.poNumber) {
      fieldErrors.poNumber = 'Selected PO Number not found in system.';
    }
    checks.poMatched = false;
  } else {
    checks.poMatched = true;
    if (poSource.status === 'Draft' || poSource.status === 'Cancelled') {
      variances.push({ field: 'PO Reference', expected: 'Issued or Approved status', actual: poSource.status, severity: 'critical' });
      checks.poMatched = false;
    }
    if (!sameText(poSource.vendorName, draft.vendorName)) {
      variances.push({ field: 'Vendor', expected: `PO Vendor: ${poSource.vendorName}`, actual: draft.vendorName, severity: 'critical' });
      checks.poMatched = false;
    }
    if (Math.abs(poSource.finalTotalAmount - draft.grossAmount) > 0.1) {
      variances.push({ field: 'Amount', expected: `PO Total: ${poSource.finalTotalAmount}`, actual: `Inv Total: ${draft.grossAmount}`, severity: 'critical' });
      checks.poMatched = false;
    }
  }

  // Rule 2: Goods Receipt is Mandatory (3-Way Match Requirement)
  if (poSource && (!grnSource || !draft.grnNumber)) {
    const msg = 'GRN missing for selected PO. Invoice cannot be validated until goods are received in warehouse.';
    errors.push(msg);
    fieldErrors.grnNumber = 'Physical receipt record required.';
    checks.grnMatched = false;
  } else {
    checks.grnMatched = true;
    if (!sameText(grnSource.poNumber, draft.poNumber)) {
      variances.push({ field: 'GRN Reference', expected: `Linked to PO ${draft.poNumber}`, actual: `Linked to ${grnSource.poNumber}`, severity: 'critical' });
      checks.grnMatched = false;
    }
    if (draft.quantity > grnSource.quantityReceived) {
      variances.push({ field: 'Quantity', expected: `Max Received: ${grnSource.quantityReceived}`, actual: `Invoiced: ${draft.quantity}`, severity: 'critical' });
      checks.grnMatched = false;
    }
    const gDate = new Date(grnSource.grnDate);
    if (!Number.isNaN(gDate.getTime()) && !Number.isNaN(invDate.getTime()) && gDate > invDate) {
      variances.push({ field: 'Date', expected: `GRN Date <= Invoice Date`, actual: `${grnSource.grnDate} > ${draft.invoiceDate}`, severity: 'warning' });
    }
  }

  // Tax and Amount Validations
  checks.taxValidated = true;
  checks.amountValidated = true;

  const calcSubtotal = draft.quantity * draft.price;
  if (Math.abs(calcSubtotal - draft.subtotal) > 0.1) {
    variances.push({ field: 'Amount', expected: `Subtotal ${calcSubtotal.toFixed(2)}`, actual: String(draft.subtotal), severity: 'critical' });
    checks.amountValidated = false;
  }

  const calcTax = draft.cgstAmount + draft.sgstAmount + draft.igstAmount;
  if (Math.abs(calcTax - draft.taxAmount) > 0.1) {
    variances.push({ field: 'GST', expected: `Total Tax ${calcTax.toFixed(2)}`, actual: String(draft.taxAmount), severity: 'critical' });
    checks.taxValidated = false;
  }

  const expectedGross = draft.taxableAmount + draft.taxAmount + draft.freightAmount + draft.roundOff - draft.tdsAmount;
  if (Math.abs(expectedGross - draft.grossAmount) > 0.1) {
    variances.push({ field: 'Amount', expected: `Gross ${expectedGross.toFixed(2)}`, actual: String(draft.grossAmount), severity: 'critical' });
    checks.amountValidated = false;
  }

  const hasCritical = variances.some(v => v.severity === 'critical') || errors.length > 0;
  let status: MatchStatusLabel = 'Success';
  if (errors.length > 0 || variances.some(v => v.severity === 'critical')) status = 'Failed';
  else if (variances.length > 0) status = 'Warning';

  return {
    valid: !hasCritical,
    errors,
    fieldErrors,
    status,
    variances,
    poSource: poSource && 'items' in poSource ? poSource : undefined,
    grnSource: grnSource && 'deliveryChallanNumber' in grnSource ? grnSource : undefined,
    checks,
  };
}
