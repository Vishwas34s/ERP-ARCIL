'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoData } from '@/lib/data';
import type { PaymentRecord } from './types';

export const paymentKey = 'procureflow-payment-records';

function getStoredPayments() {
  if (typeof window === 'undefined') return demoData.payments as PaymentRecord[];
  const saved = window.localStorage.getItem(paymentKey);
  if (!saved) return demoData.payments as PaymentRecord[];
  try {
    return JSON.parse(saved) as PaymentRecord[];
  } catch {
    return demoData.payments as PaymentRecord[];
  }
}

function publish(payments: PaymentRecord[]) {
  window.localStorage.setItem(paymentKey, JSON.stringify(payments));
  window.dispatchEvent(new Event('procureflow-payments-updated'));
}

export function usePaymentRecords() {
  const [records, setRecords] = useState<PaymentRecord[]>(demoData.payments as PaymentRecord[]);

  useEffect(() => {
    const sync = () => setRecords(getStoredPayments());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-payments-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-payments-updated', sync);
    };
  }, []);

  const actions = useMemo(
    () => ({
      save(nextRecords: PaymentRecord[]) {
        publish(nextRecords);
        setRecords(nextRecords);
      },
      create(record: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt' | 'settledAt' | 'auditTrailId' | 'paymentBatch' | 'settlementReference'>) {
        const nextRecord: PaymentRecord = {
          ...record,
          id: `PAY-${String(Date.now()).slice(-6)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settledAt: '',
          auditTrailId: `AUD-${String(Date.now()).slice(-6)}`,
          paymentBatch: `PB-${String(Date.now()).slice(-5)}`,
          settlementReference: `SET-${String(Date.now()).slice(-5)}`,
        };
        const nextRecords = [nextRecord, ...getStoredPayments()];
        publish(nextRecords);
        setRecords(nextRecords);
      },
      update(id: string, patch: Partial<PaymentRecord>) {
        const nextRecords = getStoredPayments().map((record) => (record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record));
        publish(nextRecords);
        setRecords(nextRecords);
      },
      remove(id: string) {
        const nextRecords = getStoredPayments().filter((record) => record.id !== id);
        publish(nextRecords);
        setRecords(nextRecords);
      },
      reset() {
        publish(demoData.payments as PaymentRecord[]);
        setRecords(demoData.payments as PaymentRecord[]);
      },
    }),
    [],
  );

  return { records, ...actions };
}
