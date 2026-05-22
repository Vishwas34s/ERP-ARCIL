'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GoodsReceipt } from './types';

export const goodsReceiptStorageKey = 'procureflow-goods-receipts';

export const seedGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'GRNREC-001',
    grnNumber: 'GRN-5001',
    grnDate: '2026-05-08',
    poNumber: 'PO-1001',
    vendorId: 'VND-0001',
    vendorName: 'Aster Distributor',
    receivedItems: 'Packaging material batch',
    quantityReceived: 10,
    acceptedQuantity: 10,
    rejectedQuantity: 0,
    itemCondition: 'Good',
    warehouse: 'Bhiwandi Warehouse',
    receiverName: 'Rajesh Sharma',
    deliveryStatus: 'Received',
    deliveryChallanNumber: 'DC-7001',
    deliveryChallanDate: '2026-05-08',
    notes: 'Verified against PO line items and quality checklist.',
    createdAt: '2026-05-08',
    updatedAt: '2026-05-08',
  },
  {
    id: 'GRNREC-002',
    grnNumber: 'GRN-5002',
    grnDate: '2026-05-15',
    poNumber: 'PO-1002',
    vendorId: 'VND-0002',
    vendorName: 'Zenith Consulting',
    receivedItems: 'Implementation consulting sprint',
    quantityReceived: 4,
    acceptedQuantity: 4,
    rejectedQuantity: 0,
    itemCondition: 'Acceptable',
    warehouse: 'Bengaluru Delivery Hub',
    receiverName: 'Sonal Joshi',
    deliveryStatus: 'Received',
    deliveryChallanNumber: 'DC-7002',
    deliveryChallanDate: '2026-05-15',
    notes: 'Service milestone acceptance documented.',
    createdAt: '2026-05-15',
    updatedAt: '2026-05-15',
  },
  {
    id: 'GRNREC-003',
    grnNumber: 'GRN-5003',
    grnDate: '2026-05-20',
    poNumber: 'PO-1003',
    vendorId: 'VND-0003',
    vendorName: 'Orion Manufacturer',
    receivedItems: 'Industrial component assembly',
    quantityReceived: 24,
    acceptedQuantity: 24,
    rejectedQuantity: 0,
    itemCondition: 'Damaged items identified',
    warehouse: 'North Plant Warehouse',
    receiverName: 'Amit Desai',
    deliveryStatus: 'Partially Received',
    deliveryChallanNumber: 'DC-7003',
    deliveryChallanDate: '2026-05-20',
    notes: 'Short shipment flagged for vendor follow-up.',
    createdAt: '2026-05-20',
    updatedAt: '2026-05-20',
  },
];

function readGoodsReceipts() {
  if (typeof window === 'undefined') return seedGoodsReceipts;
  const saved = window.localStorage.getItem(goodsReceiptStorageKey);
  if (!saved) return seedGoodsReceipts;
  try {
    return JSON.parse(saved) as GoodsReceipt[];
  } catch {
    return seedGoodsReceipts;
  }
}

function publishGoodsReceipts(items: GoodsReceipt[]) {
  window.localStorage.setItem(goodsReceiptStorageKey, JSON.stringify(items));
  window.dispatchEvent(new Event('procureflow-goods-receipts-updated'));
}

export function emptyGoodsReceiptDraft() {
  return {
    id: '',
    grnNumber: '',
    grnDate: new Date().toISOString().slice(0, 10),
    poNumber: '',
    vendorId: '',
    vendorName: '',
    receivedItems: '',
    quantityReceived: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    itemCondition: '',
    warehouse: '',
    receiverName: '',
    deliveryStatus: 'Pending',
    deliveryChallanNumber: '',
    deliveryChallanDate: new Date().toISOString().slice(0, 10),
    notes: '',
    createdAt: '',
    updatedAt: '',
  } as GoodsReceipt;
}

export function normalizeGoodsReceipt(grn: GoodsReceipt) {
  return {
    ...grn,
    quantityReceived: Number(grn.quantityReceived) || 0,
    grnNumber: String(grn.grnNumber || '').trim(),
    deliveryChallanNumber: String(grn.deliveryChallanNumber || '').trim(),
    vendorName: String(grn.vendorName || '').trim(),
    warehouse: String(grn.warehouse || '').trim(),
    receiverName: String(grn.receiverName || '').trim(),
    deliveryStatus: String(grn.deliveryStatus || 'Pending'),
  } as GoodsReceipt;
}

export type GoodsReceiptValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateGoodsReceipt(draft: GoodsReceipt, existing: GoodsReceipt[] = [], editingId?: string): GoodsReceiptValidationResult {
  const grn = normalizeGoodsReceipt(draft);
  const errors: string[] = [];

  if (!grn.grnNumber.trim()) errors.push('GRN number is required.');
  if (!grn.grnDate.trim() || Number.isNaN(new Date(grn.grnDate).getTime())) errors.push('GRN date is invalid.');
  if (!grn.poNumber.trim()) errors.push('Associated PO number is required.');
  if (!grn.vendorId.trim()) errors.push('Vendor reference is required.');
  if (!grn.receivedItems.trim()) errors.push('Received items description is required.');
  if (grn.quantityReceived <= 0) errors.push('Quantity received must be greater than zero.');
  if (grn.acceptedQuantity == null || grn.acceptedQuantity < 0) errors.push('Accepted quantity must be zero or greater.');
  if (grn.rejectedQuantity == null || grn.rejectedQuantity < 0) errors.push('Rejected quantity must be zero or greater.');
  if ((grn.acceptedQuantity ?? 0) + (grn.rejectedQuantity ?? 0) !== grn.quantityReceived) errors.push('Accepted and rejected quantities must sum to the received quantity.');
  if (!grn.itemCondition?.trim()) errors.push('Item condition is required.');
  if (!grn.warehouse.trim()) errors.push('Warehouse is required.');
  if (!grn.receiverName.trim()) errors.push('Receiver name is required.');
  if (!grn.deliveryChallanNumber.trim()) errors.push('Delivery challan number is required.');
  if (!grn.deliveryChallanDate.trim() || Number.isNaN(new Date(grn.deliveryChallanDate).getTime())) errors.push('Delivery challan date is invalid.');

  if (grn.grnNumber.trim() && existing.some((entry) => entry.id !== editingId && entry.grnNumber.trim().toLowerCase() === grn.grnNumber.trim().toLowerCase())) {
    errors.push('GRN number must be unique.');
  }

  return { valid: errors.length === 0, errors };
}

export function useGoodsReceipts() {
  const [items, setItems] = useState<GoodsReceipt[]>(seedGoodsReceipts);

  useEffect(() => {
    const sync = () => setItems(readGoodsReceipts());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-goods-receipts-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-goods-receipts-updated', sync);
    };
  }, []);

  const actions = useMemo(() => ({
    save(draft: GoodsReceipt, editingId?: string) {
      const current = readGoodsReceipts();
      const normalized = normalizeGoodsReceipt(draft);
      const result = validateGoodsReceipt(normalized, current, editingId);
      if (!result.valid) return { result, item: normalized };

      const today = new Date().toISOString().slice(0, 10);
      const nextItem: GoodsReceipt = {
        ...normalized,
        id: editingId || normalized.id || `GRNREC-${String(Date.now()).slice(-6)}`,
        createdAt: editingId ? normalized.createdAt : today,
        updatedAt: today,
      };
      const nextItems = editingId ? current.map((item) => item.id === editingId ? nextItem : item) : [nextItem, ...current];
      publishGoodsReceipts(nextItems);
      setItems(nextItems);
      return { result, item: nextItem };
    },
    remove(id: string) {
      const nextItems = readGoodsReceipts().filter((item) => item.id !== id);
      publishGoodsReceipts(nextItems);
      setItems(nextItems);
    },
    reset() {
      publishGoodsReceipts(seedGoodsReceipts);
      setItems(seedGoodsReceipts);
    },
  }), []);

  return { items, ...actions };
}
