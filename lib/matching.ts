import type { PurchaseOrder, Vendor } from './types';
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
  taxAmount: number;
  gstInformation: string;
  gstRate: number;
  poNumber: string;
  grnReference: string;
  grnDate: string;
  deliveryChallanNumber?: string;
  deliveryChallanDate?: string;
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
  checks: {
    vendorVerified: boolean;
    poMatched: boolean;
    grnMatched: boolean;
    taxValidated: boolean;
    amountMatched: boolean;
  };
};

export function normalizeKey(value: string | number | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function sameText(left: string | number | null | undefined, right: string | number | null | undefined) {
  return normalizeKey(left) === normalizeKey(right);
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
  const grossInvoice = item.invoiceAmount + item.gstAmount;

  if (Math.abs(item.poQty - item.grnQty) > 0.5) {
    variances.push({ field: 'Quantity', expected: String(item.poQty), actual: String(item.grnQty), severity: 'critical' });
  }

  if (Math.abs(item.poAmount - grossInvoice) > 0.5) {
    variances.push({ field: 'Amount', expected: formatNumber(item.poAmount), actual: formatNumber(grossInvoice), severity: 'critical' });
  }

  if (!item.poNumber.trim()) {
    variances.push({ field: 'PO Reference', expected: 'PO reference present', actual: 'Missing', severity: 'critical' });
  }

  if (!item.grnReference.trim()) {
    variances.push({ field: 'GRN Reference', expected: 'GRN reference present', actual: 'Missing reference', severity: 'critical' });
  }

  return { status: variances.length ? 'Variance Detected' : 'Matched', variances };
}

export function validateManualInvoice(
  draft: ManualInvoiceDraft,
  records: WorkflowItem[],
  existingInvoiceNumbers: string[] = [],
  vendors: Vendor[] = [],
  purchaseOrders: PurchaseOrder[] = [],
): InvoiceValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const variances: VarianceDetail[] = [];

  const checks = {
    vendorVerified: false,
    poMatched: false,
    grnMatched: false,
    taxValidated: false,
    amountMatched: false,
  };

  const required: Array<[keyof ManualInvoiceDraft, string]> = [
    ['invoiceNumber', 'Invoice number'],
    ['vendorName', 'Vendor name'],
    ['vendorCode', 'Vendor code'],
    ['vendorGstin', 'Vendor GSTIN'],
    ['invoiceDate', 'Invoice date'],
    ['dueDate', 'Due date'],
    ['poNumber', 'PO Number'],
    ['grnReference', 'GRN Reference'],
    ['deliveryChallanNumber', 'Delivery Challan Number'],
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
    variances.push({ field: 'Vendor', expected: 'Approved Vendor in master', actual: draft.vendorName || 'Not selected', severity: 'critical' });
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

  // Rule 1: Purchase Order is Mandatory
  if (!poSource) {
    errors.push('Purchase Order (PO) selection is mandatory.');
    if (draft.poNumber) {
      fieldErrors.poNumber = 'PO number not found in master records.';
    }
    checks.poMatched = false;
  } else {
    checks.poMatched = true;
    if (!sameText(poSource.vendorName, draft.vendorName)) {
      variances.push({ field: 'Vendor', expected: poSource.vendorName, actual: draft.vendorName, severity: 'critical' });
      fieldErrors.vendorName = 'Vendor mismatch against selected PO.';
      checks.poMatched = false;
    }

    const amountDiff = Math.abs(poSource.finalTotalAmount - draft.grossAmount);
    if (amountDiff > 0.5) {
      variances.push({ field: 'Amount', expected: poSource.finalTotalAmount.toFixed(2), actual: draft.grossAmount.toFixed(2), severity: 'critical' });
      fieldErrors.grossAmount = `Total mismatch. PO total is ${poSource.finalTotalAmount.toFixed(2)}.`;
      checks.amountMatched = false;
    } else {
      checks.amountMatched = true;
    }
  }

  // Rule 2: Receipt/GRN validation
  if (poSource) {
    const poReceiptFields: Array<[keyof ManualInvoiceDraft, keyof PurchaseOrder, string]> = [
      ['grnReference', 'grnReference', 'GRN Reference'],
      ['grnDate', 'grnDate', 'GRN Date'],
      ['deliveryChallanNumber', 'deliveryChallanNumber', 'Delivery Challan Number'],
      ['deliveryChallanDate', 'deliveryChallanDate', 'Delivery Challan Date'],
    ];
    const missingPoReceiptFields = poReceiptFields.filter(([draftKey]) => !String(draft[draftKey] ?? '').trim());

    if (missingPoReceiptFields.length > 0) {
      missingPoReceiptFields.forEach(([draftKey, , label]) => {
        fieldErrors[draftKey] = `${label} is required for matching.`;
      });
    }

    if (poSource.grnReference) {
      checks.grnMatched = true;
      poReceiptFields.forEach(([draftKey, poKey, label]) => {
        const poValue = String(poSource[poKey] ?? '');
        const draftValue = draft[draftKey];
        if (!sameText(poValue, draftValue)) {
          variances.push({ field: label.includes('GRN') ? 'GRN Reference' : 'PO Reference', expected: poValue, actual: String(draftValue || 'Not matched'), severity: 'critical' });
          fieldErrors[draftKey] = `Value mismatch vs PO master.`;
          checks.grnMatched = false;
        }
      });

      const maxReceived = poSource.receivedQuantity && poSource.receivedQuantity > 0
        ? poSource.receivedQuantity
        : poSource.items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
      if (draft.quantity > maxReceived) {
        variances.push({ field: 'Quantity', expected: `${maxReceived} (Max)`, actual: String(draft.quantity), severity: 'critical' });
        fieldErrors.quantity = `Quantity exceeds GRN physically received.`;
        checks.grnMatched = false;
      }

      if (poSource.grnDate && draft.invoiceDate) {
        const gDate = new Date(String(poSource.grnDate));
        if (!Number.isNaN(gDate.getTime()) && !Number.isNaN(invDate.getTime()) && gDate > invDate) {
          variances.push({ field: 'Date', expected: `GRN Date <= Invoice Date`, actual: `${poSource.grnDate} > ${draft.invoiceDate}`, severity: 'warning' });
        }
      }
    }
    
    const poGst = Number(poSource.gstRate) || 18;
    const draftGst = Number(draft.gstRate) || 0;
    if (Math.abs(poGst - draftGst) > 0.01) {
       variances.push({ field: 'GST', expected: `${poGst}%`, actual: `${draftGst}%`, severity: 'critical' });
       fieldErrors.gstRate = `GST Rate mismatch. PO uses ${poGst}%.`;
       checks.taxValidated = false;
    } else {
       checks.taxValidated = true;
    }
  }

  const hasCritical = variances.some(v => v.severity === 'critical') || errors.length > 0;
  let status: MatchStatusLabel = 'Matched';
  if (errors.length > 0 || variances.some(v => v.severity === 'critical')) status = 'Failed';
  else if (variances.length > 0) status = 'Warning';
  else status = 'Matched';

  return {
    valid: !hasCritical && errors.length === 0 && checks.poMatched && checks.amountMatched,
    errors,
    fieldErrors,
    status,
    variances,
    poSource: poSource && 'items' in poSource ? poSource : undefined,
    checks,
  };
}
