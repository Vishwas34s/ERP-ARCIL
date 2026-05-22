import purchaseOrders from '@/data/purchase-orders.json';
import type { PurchaseOrder, PurchaseOrderLineItem } from './types';

export type PurchaseOrderValidationResult = {
  valid: boolean;
  errors: string[];
  fieldErrors: Partial<Record<keyof PurchaseOrder | 'items', string>>;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const gstPattern = /^[0-9]{2}[A-Z0-9]{13}$/;

export const seedPurchaseOrders = purchaseOrders as PurchaseOrder[];

export function createEmptyLineItem(index = 1): PurchaseOrderLineItem {
  return {
    id: `POL-${Date.now()}-${index}`,
    itemNumber: String(index),
    hsnSac: '',
    skuCode: '',
    itemDescription: '',
    quantityOrdered: 1,
    unitPrice: 0,
    totalPrice: 0,
  };
}

export const emptyPurchaseOrderDraft: PurchaseOrder = {
  id: '',
  poNumber: '',
  poDate: '2026-05-18',
  intendedDeliveryDate: '2026-05-18',
  expectedDeliveryDate: '2026-05-18',
  vendorId: '',
  vendorName: '',
  vendorAddress: '',
  vendorContactNumber: '',
  vendorEmail: '',
  vendorGstDetails: '',
  companyName: 'ProcureFlow X Pvt Ltd',
  billingAddress: 'Finance Tower, Mumbai, Maharashtra 400001',
  shippingAddress: 'Central Warehouse, Bhiwandi, Maharashtra 421302',
  departmentName: '',
  costCenter: '',
  gstRate: 18,
  items: [createEmptyLineItem()],
  subtotal: 0,
  taxAmount: 0,
  gstDetails: 'GST 18%',
  discount: 0,
  finalTotalAmount: 0,
  paymentTerms: 'Net 30',
  status: 'Draft',
  currency: 'INR',
  matchingStatus: 'Ready for 3-Way Match',
  createdAt: '',
  updatedAt: '',
  deliveryChallanNumber: '',
  deliveryChallanDate: '2026-05-18',
  grnReference: '',
  grnDate: '',
  receivedQuantity: 0,
  acceptedQuantity: 0,
  rejectedQuantity: 0,
  vendorReferenceId: '',
};

export function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  const items = po.items.map((item, index) => {
    const quantityOrdered = Number(item.quantityOrdered) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return {
      ...item,
      itemNumber: item.itemNumber || String(index + 1),
      quantityOrdered,
      unitPrice,
      totalPrice: Number((quantityOrdered * unitPrice).toFixed(2)),
    };
  });
  const subtotal = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
  const discount = Math.max(0, Number(po.discount) || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const extractedGst = Number(String(po.gstDetails).match(/(\d+(?:\.\d+)?)/)?.[1]) || 18;
  const gstRate = Number(po.gstRate) || extractedGst;
  const taxAmount = Number((taxableAmount * (gstRate / 100)).toFixed(2));
  const expectedDeliveryDate = po.expectedDeliveryDate || po.intendedDeliveryDate;

  return {
    ...po,
    items,
    subtotal,
    taxAmount,
    discount,
    gstRate,
    expectedDeliveryDate,
    deliveryChallanNumber: String(po.deliveryChallanNumber || '').trim(),
    deliveryChallanDate: po.deliveryChallanDate || po.poDate,
    grnReference: String(po.grnReference || '').trim(),
    grnDate: po.grnDate || po.poDate,
    finalTotalAmount: Number((taxableAmount + taxAmount).toFixed(2)),
  };
}

export function samePurchaseOrderNumber(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function validatePurchaseOrder(draft: PurchaseOrder, existing: PurchaseOrder[] = [], editingId?: string): PurchaseOrderValidationResult {
  const po = normalizePurchaseOrder(draft);
  const errors: string[] = [];
  const fieldErrors: PurchaseOrderValidationResult['fieldErrors'] = {};

  const required: Array<[keyof PurchaseOrder, string]> = [
    ['poNumber', 'PO number'],
    ['poDate', 'PO date'],
    ['intendedDeliveryDate', 'Intended delivery date'],
    ['expectedDeliveryDate', 'Expected delivery date'],
    ['vendorName', 'Vendor name'],
    ['vendorAddress', 'Vendor address'],
    ['vendorContactNumber', 'Vendor contact number'],
    ['vendorEmail', 'Vendor email'],
    ['companyName', 'Company name'],
    ['billingAddress', 'Billing address'],
    ['shippingAddress', 'Shipping address'],
    ['departmentName', 'Department name'],
    ['costCenter', 'Cost center'],
    ['paymentTerms', 'Payment terms'],
    ['deliveryChallanNumber', 'Delivery challan number'],
    ['deliveryChallanDate', 'Delivery challan date'],
    ['grnReference', 'GRN reference'],
    ['grnDate', 'GRN date'],
  ];

  required.forEach(([key, label]) => {
    if (!String(po[key] ?? '').trim()) {
      const message = `${label} is required.`;
      errors.push(message);
      fieldErrors[key] = message;
    }
  });

  if (po.poNumber.trim() && existing.some((entry) => entry.id !== editingId && samePurchaseOrderNumber(entry.poNumber, po.poNumber))) {
    const message = 'PO number must be unique.';
    errors.push(message);
    fieldErrors.poNumber = message;
  }

  const poDate = new Date(po.poDate);
  const deliveryDate = new Date(po.intendedDeliveryDate);
  if (!po.poDate || Number.isNaN(poDate.getTime())) {
    const message = 'PO date is invalid.';
    errors.push(message);
    fieldErrors.poDate = message;
  }
  if (!po.intendedDeliveryDate || Number.isNaN(deliveryDate.getTime())) {
    const message = 'Delivery date is invalid.';
    errors.push(message);
    fieldErrors.intendedDeliveryDate = message;
  }
  if (!Number.isNaN(poDate.getTime()) && !Number.isNaN(deliveryDate.getTime()) && deliveryDate < poDate) {
    const message = 'Delivery date cannot be before PO date.';
    errors.push(message);
    fieldErrors.intendedDeliveryDate = message;
  }

  if (po.vendorEmail.trim() && !emailPattern.test(po.vendorEmail.trim())) {
    const message = 'Vendor email format is invalid.';
    errors.push(message);
    fieldErrors.vendorEmail = message;
  }

  if (po.vendorGstDetails.trim() && !gstPattern.test(po.vendorGstDetails.trim().toUpperCase())) {
    const message = 'Vendor GSTIN format is invalid.';
    errors.push(message);
    fieldErrors.vendorGstDetails = message;
  }

  if (!Number.isFinite(po.gstRate ?? NaN) || (po.gstRate ?? 0) <= 0) {
    const message = 'GST rate is required and must be greater than zero.';
    errors.push(message);
    fieldErrors.gstRate = message;
  }

  const expectedDeliveryDate = new Date(po.expectedDeliveryDate || po.intendedDeliveryDate);
  if (!po.expectedDeliveryDate || Number.isNaN(expectedDeliveryDate.getTime())) {
    const message = 'Expected delivery date is invalid.';
    errors.push(message);
    fieldErrors.expectedDeliveryDate = message;
  }

  if (!po.items.length) {
    const message = 'At least one PO item is required.';
    errors.push(message);
    fieldErrors.items = message;
  }

  po.items.forEach((item, index) => {
    const row = index + 1;
    if (!item.skuCode.trim()) errors.push(`Row ${row}: SKU code is required.`);
    if (!item.itemDescription.trim()) errors.push(`Row ${row}: item description is required.`);
    if (item.quantityOrdered <= 0) errors.push(`Row ${row}: quantity must be greater than zero.`);
    if (item.unitPrice <= 0) errors.push(`Row ${row}: unit price must be greater than zero.`);
  });

  if (po.taxAmount < 0) errors.push('Tax amount cannot be negative.');
  if (po.discount < 0) errors.push('Discount cannot be negative.');
  if (po.discount > po.subtotal + po.taxAmount) errors.push('Discount cannot exceed subtotal plus tax.');

  return { valid: errors.length === 0, errors, fieldErrors };
}

export function statusTone(status: PurchaseOrder['status']) {
  if (status === 'Approved' || status === 'Closed') return 'emerald' as const;
  if (status === 'Cancelled') return 'rose' as const;
  if (status === 'Partially Received') return 'amber' as const;
  if (status === 'Issued') return 'cyan' as const;
  return 'slate' as const;
}
