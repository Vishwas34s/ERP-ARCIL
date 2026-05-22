'use client';
import { useEffect, useMemo, useState } from 'react';

export type WorkflowStatus = 'Submitted' | 'Approved' | 'Rejected' | 'On Hold' | 'Queued for Payment' | 'Paid' | 'Payment Failed';

export type WorkflowItem = {
  id: string;
  vendorId: string;
  vendorName: string;
  poNumber: string;
  poAmount: number;
  poQty: number;
  grnReference: string;
  grnDate: string;
  grnQty: number;
  deliveryChallanNumber: string;
  deliveryChallanDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  gstAmount: number;
  approvalLevel: 'L1' | 'L2' | 'L3';
  status: WorkflowStatus;
  matchStatus: 'Matched' | 'Variance' | 'Pending';
  paymentMode: 'RTGS' | 'NEFT' | 'Cheque' | 'UPI' | 'Manual Bank Transfer';
  paymentStatus: 'Not Ready' | 'Ready' | 'Paid' | 'Failed' | 'Hold';
  erpSyncStatus: 'Pending' | 'Synced';
  lastActionBy: string;
  updatedAt: string;
};

export const workflowKey = 'procureflow-workflow-items';

export const seedWorkflowItems: WorkflowItem[] = [
  {
    id: 'WF-001',
    vendorId: 'VND-0001',
    vendorName: 'Aster Distributor',
    poNumber: 'PO-1001',
    poAmount: 8500,
    poQty: 10,
    grnReference: 'GRN-5001',
    grnDate: '2026-05-08',
    grnQty: 10,
    deliveryChallanNumber: 'DC-7001',
    deliveryChallanDate: '2026-05-08',
    invoiceNumber: 'INV-AST-001',
    invoiceDate: '2026-05-01',
    invoiceAmount: 8500,
    gstAmount: 1530,
    approvalLevel: 'L1',
    status: 'Submitted',
    matchStatus: 'Matched',
    paymentMode: 'UPI',
    paymentStatus: 'Not Ready',
    erpSyncStatus: 'Pending',
    lastActionBy: 'Vendor',
    updatedAt: '2026-05-13',
  },
  {
    id: 'WF-002',
    vendorId: 'VND-0002',
    vendorName: 'Zenith Consulting',
    poNumber: 'PO-1002',
    poAmount: 68000,
    poQty: 4,
    grnReference: 'GRN-5002',
    grnDate: '2026-05-15',
    grnQty: 4,
    deliveryChallanNumber: 'DC-7002',
    deliveryChallanDate: '2026-05-15',
    invoiceNumber: 'INV-ZEN-014',
    invoiceDate: '2026-05-03',
    invoiceAmount: 68000,
    gstAmount: 12240,
    approvalLevel: 'L2',
    status: 'Submitted',
    matchStatus: 'Matched',
    paymentMode: 'NEFT',
    paymentStatus: 'Not Ready',
    erpSyncStatus: 'Pending',
    lastActionBy: 'Vendor',
    updatedAt: '2026-05-13',
  },
  {
    id: 'WF-003',
    vendorId: 'VND-0003',
    vendorName: 'Orion Manufacturer',
    poNumber: 'PO-1003',
    poAmount: 245000,
    poQty: 25,
    grnReference: 'GRN-5003',
    grnDate: '2026-05-20',
    grnQty: 24,
    deliveryChallanNumber: 'DC-7003',
    deliveryChallanDate: '2026-05-20',
    invoiceNumber: 'INV-ORI-221',
    invoiceDate: '2026-05-05',
    invoiceAmount: 245000,
    gstAmount: 44100,
    approvalLevel: 'L3',
    status: 'On Hold',
    matchStatus: 'Variance',
    paymentMode: 'RTGS',
    paymentStatus: 'Hold',
    erpSyncStatus: 'Pending',
    lastActionBy: 'System Match',
    updatedAt: '2026-05-13',
  },
  {
    id: 'WF-004',
    vendorId: 'VND-0004',
    vendorName: 'Nova Services',
    poNumber: 'PO-1004',
    poAmount: 98000,
    poQty: 8,
    grnReference: 'GRN-5004',
    grnDate: '2026-05-21',
    grnQty: 8,
    deliveryChallanNumber: 'DC-7004',
    deliveryChallanDate: '2026-05-21',
    invoiceNumber: 'INV-NOV-089',
    invoiceDate: '2026-05-07',
    invoiceAmount: 98000,
    gstAmount: 17640,
    approvalLevel: 'L2',
    status: 'Approved',
    matchStatus: 'Matched',
    paymentMode: 'Cheque',
    paymentStatus: 'Ready',
    erpSyncStatus: 'Pending',
    lastActionBy: 'L2 - Account Manager',
    updatedAt: '2026-05-13',
  },
  {
    id: 'WF-005',
    vendorId: 'VND-0005',
    vendorName: 'Delta Logistics',
    poNumber: 'PO-1005',
    poAmount: 320000,
    poQty: 15,
    grnReference: 'GRN-5005',
    grnDate: '2026-05-22',
    grnQty: 15,
    deliveryChallanNumber: 'DC-7005',
    deliveryChallanDate: '2026-05-22',
    invoiceNumber: 'INV-DEL-310',
    invoiceDate: '2026-05-09',
    invoiceAmount: 320000,
    gstAmount: 57600,
    approvalLevel: 'L3',
    status: 'Submitted',
    matchStatus: 'Matched',
    paymentMode: 'RTGS',
    paymentStatus: 'Not Ready',
    erpSyncStatus: 'Pending',
    lastActionBy: 'Vendor',
    updatedAt: '2026-05-13',
  },
  {
    id: 'WF-006',
    vendorId: 'VND-0006',
    vendorName: 'Quick Office Supply',
    poNumber: 'PO-1006',
    poAmount: 4200,
    poQty: 20,
    grnReference: 'GRN-5006',
    grnDate: '2026-05-23',
    grnQty: 20,
    deliveryChallanNumber: 'DC-7006',
    deliveryChallanDate: '2026-05-23',
    invoiceNumber: 'INV-QOS-032',
    invoiceDate: '2026-05-11',
    invoiceAmount: 4200,
    gstAmount: 756,
    approvalLevel: 'L1',
    status: 'Rejected',
    matchStatus: 'Pending',
    paymentMode: 'UPI',
    paymentStatus: 'Not Ready',
    erpSyncStatus: 'Pending',
    lastActionBy: 'L1 - Team Lead',
    updatedAt: '2026-05-13',
  },
];

function normalizeWorkflowItem(item: WorkflowItem & { grnNumber?: string; challanNumber?: string }): WorkflowItem {
  const grnReference = item.grnReference || item.grnNumber || '';
  const grnDate = item.grnDate || item.invoiceDate;
  return {
    ...item,
    grnReference,
    grnDate,
    deliveryChallanNumber: item.deliveryChallanNumber || item.challanNumber || '',
    deliveryChallanDate: item.deliveryChallanDate || grnDate,
  };
}

function getStoredItems() {
  if (typeof window === 'undefined') return seedWorkflowItems;
  const saved = window.localStorage.getItem(workflowKey);
  if (!saved) return seedWorkflowItems;
  try {
    return (JSON.parse(saved) as Array<WorkflowItem & { grnNumber?: string; challanNumber?: string }>).map(normalizeWorkflowItem);
  } catch {
    return seedWorkflowItems;
  }
}

function publish(items: WorkflowItem[]) {
  window.localStorage.setItem(workflowKey, JSON.stringify(items.map(normalizeWorkflowItem)));
  window.dispatchEvent(new Event('procureflow-workflow-updated'));
}

export function approvalLevelFor(amount: number): WorkflowItem['approvalLevel'] {
  if (amount <= 10000) return 'L1';
  if (amount <= 100000) return 'L2';
  return 'L3';
}

export function useWorkflowItems() {
  const [items, setItems] = useState<WorkflowItem[]>(seedWorkflowItems);

  useEffect(() => {
    const sync = () => setItems(getStoredItems());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-workflow-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-workflow-updated', sync);
    };
  }, []);

  const actions = useMemo(() => ({
    save(nextItems: WorkflowItem[]) {
      publish(nextItems);
      setItems(nextItems);
    },
    update(id: string, patch: Partial<WorkflowItem>, actor: string) {
      const nextItems = getStoredItems().map((item) => item.id === id ? { ...item, ...patch, lastActionBy: actor, updatedAt: new Date().toISOString().slice(0, 10) } : item);
      publish(nextItems);
      setItems(nextItems);
    },
    add(item: Omit<WorkflowItem, 'id' | 'approvalLevel' | 'status' | 'paymentStatus' | 'erpSyncStatus' | 'lastActionBy' | 'updatedAt'>, actor: string) {
      const amount = Number(item.invoiceAmount);
      const nextItem: WorkflowItem = {
        ...item,
        id: `WF-${String(Date.now()).slice(-6)}`,
        approvalLevel: approvalLevelFor(amount),
        status: 'Submitted',
        paymentStatus: 'Not Ready',
        erpSyncStatus: 'Pending',
        lastActionBy: actor,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      const nextItems = [nextItem, ...getStoredItems()];
      publish(nextItems);
      setItems(nextItems);
    },
    remove(id: string) {
      const nextItems = getStoredItems().filter((item) => item.id !== id);
      publish(nextItems);
      setItems(nextItems);
    },
    reset() {
      publish(seedWorkflowItems);
      setItems(seedWorkflowItems);
    },
  }), []);

  return { items, ...actions };
}
