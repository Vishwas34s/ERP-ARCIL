'use client';

import { useEffect, useMemo, useState } from 'react';
import { emptyPurchaseOrderDraft, normalizePurchaseOrder, seedPurchaseOrders, validatePurchaseOrder } from './purchase-orders';
import type { GoodsReceipt, PurchaseOrder } from './types';

export const purchaseOrderStorageKey = 'procureflow-purchase-orders';

function readPurchaseOrders() {
  if (typeof window === 'undefined') return seedPurchaseOrders;
  const saved = window.localStorage.getItem(purchaseOrderStorageKey);
  if (!saved) return seedPurchaseOrders;
  try {
    return JSON.parse(saved) as PurchaseOrder[];
  } catch {
    return seedPurchaseOrders;
  }
}

function publishPurchaseOrders(items: PurchaseOrder[]) {
  window.localStorage.setItem(purchaseOrderStorageKey, JSON.stringify(items));
  window.dispatchEvent(new Event('procureflow-purchase-orders-updated'));
}

export function newPurchaseOrderDraft() {
  return {
    ...emptyPurchaseOrderDraft,
    items: emptyPurchaseOrderDraft.items.map((item) => ({ ...item, id: `POL-${Date.now()}-1` })),
  };
}

export function usePurchaseOrders() {
  const [items, setItems] = useState<PurchaseOrder[]>(seedPurchaseOrders);

  useEffect(() => {
    const sync = () => setItems(readPurchaseOrders());

    const syncFromGrn = () => {
      const currentPos = readPurchaseOrders();
      const grnsJson = window.localStorage.getItem('procureflow-goods-receipts');
      if (!grnsJson) return;
      
      let currentGrns: GoodsReceipt[] = [];
      try { 
        currentGrns = JSON.parse(grnsJson); 
      } catch (e) { 
        return; 
      }

      let hasChanges = false;
      const updatedPos = currentPos.map(po => {
        const linkedGrn = currentGrns.find(g => 
          g.poNumber.trim().toLowerCase() === po.poNumber.trim().toLowerCase()
        );

        let nextStatus = po.matchingStatus;
        if (linkedGrn) {
          const totalOrdered = po.items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
          nextStatus = linkedGrn.quantityReceived === totalOrdered ? 'Matched' : 'Variance Review';
        } else if (po.matchingStatus === 'Matched' || po.matchingStatus === 'Variance Review') {
          // Revert status if GRN was deleted
          nextStatus = 'Ready for 3-Way Match';
        }

        if (nextStatus !== po.matchingStatus) {
          hasChanges = true;
          return { ...po, matchingStatus: nextStatus as any };
        }
        return po;
      });

      if (hasChanges) {
        publishPurchaseOrders(updatedPos);
      }
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-purchase-orders-updated', sync);
    window.addEventListener('procureflow-goods-receipts-updated', syncFromGrn);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-purchase-orders-updated', sync);
      window.removeEventListener('procureflow-goods-receipts-updated', syncFromGrn);
    };
  }, []);

  const actions = useMemo(() => ({
    save(draft: PurchaseOrder, editingId?: string) {
      const current = readPurchaseOrders();
      const normalized = normalizePurchaseOrder(draft);
      const result = validatePurchaseOrder(normalized, current, editingId);
      if (!result.valid) return { result, item: normalized };

      const today = new Date().toISOString().slice(0, 10);
      const nextItem: PurchaseOrder = {
        ...normalized,
        id: editingId || normalized.id || `POREC-${String(Date.now()).slice(-6)}`,
        createdAt: editingId ? normalized.createdAt : today,
        updatedAt: today,
        matchingStatus: normalized.matchingStatus || 'Ready for 3-Way Match',
      };
      const nextItems = editingId ? current.map((item) => item.id === editingId ? nextItem : item) : [nextItem, ...current];
      publishPurchaseOrders(nextItems);
      setItems(nextItems);
      return { result, item: nextItem };
    },
    remove(id: string) {
      const nextItems = readPurchaseOrders().filter((item) => item.id !== id);
      publishPurchaseOrders(nextItems);
      setItems(nextItems);
    },
    reset() {
      publishPurchaseOrders(seedPurchaseOrders);
      setItems(seedPurchaseOrders);
    },
  }), []);

  return { items, ...actions };
}
