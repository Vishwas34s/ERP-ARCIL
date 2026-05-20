'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoData } from '@/lib/data';
import type { AuditRecord } from '@/lib/types';

const auditKey = 'procureflow-audit-records';

function readAuditRecords(): AuditRecord[] {
  if (typeof window === 'undefined') return demoData.audit;
  const raw = window.localStorage.getItem(auditKey);
  if (!raw) return demoData.audit;
  try {
    return JSON.parse(raw) as AuditRecord[];
  } catch {
    return demoData.audit;
  }
}

function publishAuditRecords(records: AuditRecord[]) {
  window.localStorage.setItem(auditKey, JSON.stringify(records));
  window.dispatchEvent(new Event('procureflow-audit-updated'));
}

export function addAuditEntry(entry: Omit<AuditRecord, 'id' | 'timestamp'>) {
  const nextRecord: AuditRecord = {
    ...entry,
    id: `AUD-${String(Date.now()).slice(-6)}`,
    timestamp: new Date().toISOString(),
  };
  const nextRecords = [nextRecord, ...readAuditRecords()];
  publishAuditRecords(nextRecords);
}

export function useAuditTrail() {
  const [records, setRecords] = useState<AuditRecord[]>(demoData.audit);

  useEffect(() => {
    const sync = () => setRecords(readAuditRecords());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-audit-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-audit-updated', sync);
    };
  }, []);

  const actions = useMemo(
    () => ({
      add: addAuditEntry,
      reset() {
        publishAuditRecords(demoData.audit);
        setRecords(demoData.audit);
      },
    }),
    [],
  );

  return { records, ...actions };
}
