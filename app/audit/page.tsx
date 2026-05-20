'use client';

import { useMemo, useState } from 'react';
import { demoData } from '@/lib/data';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useAuditTrail } from '@/lib/audit-store';
import { Search, RefreshCw, ShieldCheck, ChevronRight, FilterX } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function AuditPage() {
  const { records: rows } = useAuditTrail();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(rows[0] ?? demoData.audit[0]);
  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || row.module === filter || row.outcome === filter || row.severity === filter)), [query, filter, rows]);

  function clearFilters() {
    setQuery('');
    setFilter('All');
    toast({ type: 'info', title: 'Filters Reset', description: 'Showing all audit logs.' });
  }

  return (
    <div className="space-y-6">
      <Panel title="Audit Trail" subtitle="Immutable event logging across vendor, invoice, approval, payment, and ERP sync actions.">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action, actor, role, module, source system, compliance ref..." className="w-full rounded-lg border border-white/10 bg-slate-950/50 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/30" /></div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none"><option>All</option><option>Vendor</option><option>Invoice</option><option>Matching</option><option>Approval</option><option>Payment</option><option>Audit</option><option>Success</option><option>Warning</option><option>Failure</option></select>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"><FilterX size={16} /> Clear</button>
            <button onClick={() => toast({ type: 'info', title: 'Audit Export Queued', description: `${filtered.length} filtered audit records are ready for review.` })} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"><RefreshCw size={16} /> Export logs</button>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title={`Audit entries (${filtered.length})`} subtitle="Traceability, compliance, and timeline fidelity">
          <div className="max-h-[720px] space-y-3 overflow-auto pr-1">
            {filtered.slice(0, 20).map((row) => (
              <button key={row.id} onClick={() => setSelected(row)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/40 p-4 text-left transition hover:border-cyan-400/25 hover:bg-white/5">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><ShieldCheck size={16} className="text-cyan-300" /><span className="font-medium text-white">{row.action}</span><Badge tone={row.outcome === 'Success' ? 'emerald' : row.outcome === 'Warning' ? 'amber' : 'rose'}>{row.outcome}</Badge><Badge tone={row.severity === 'High' ? 'rose' : row.severity === 'Medium' ? 'amber' : 'emerald'}>{row.severity}</Badge></div><div className="mt-1 truncate text-sm text-slate-400">{row.actor} - {row.module} - {row.actorRole} - {row.sourceSystem}</div></div>
                <ChevronRight className="shrink-0 text-slate-500" size={18} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Audit detail" subtitle="Record-level forensics and compliance context">
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Entry</div><div className="mt-2 text-lg font-semibold text-white">{selected.action}</div><div className="mt-1 text-sm text-slate-400">{selected.actor} - {selected.module}</div></div>
            {[
              ['Timestamp', formatDateTime(selected.timestamp)],
              ['Role', selected.actorRole],
              ['Entity', `${selected.entityType} / ${selected.entityId}`],
              ['Before', selected.beforeStatus],
              ['After', selected.afterStatus],
              ['Device', selected.device],
              ['IP', selected.ipAddress],
              ['Tenant', selected.tenant],
              ['Branch', selected.branch],
              ['Region', selected.region],
              ['Compliance', selected.complianceRef],
              ['Correlation', selected.correlationId],
              ['Session', selected.sessionId],
              ['Payload hash', selected.payloadHash],
              ['Notes', selected.notes],
              ['Tags', selected.tags],
            ].map(([label, value]) => <div key={label as string} className="rounded-lg border border-white/10 bg-slate-950/40 p-3 text-sm"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-1 break-words text-slate-200">{String(value)}</div></div>)}
          </div>
        </Panel>
      </section>
    </div>
  );
}
