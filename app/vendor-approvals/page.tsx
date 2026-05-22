'use client';

import { useMemo, useState } from 'react';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { useVendors } from '@/lib/vendor-store';
import type { Vendor } from '@/lib/types';
import { AlertTriangle, Building2, CheckCircle2, Eye, Search, ShieldAlert, X } from 'lucide-react';

function statusTone(vendor: Vendor) {
  if (vendor.blacklistFlag === 'Yes' || vendor.approvalStatus === 'Rejected') return 'rose' as const;
  if (vendor.approvalStatus === 'Approved') return 'emerald' as const;
  return 'amber' as const;
}

function DetailField({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 break-words font-medium text-slate-200">{value || 'Not provided'}</div>
    </div>
  );
}

function DocumentRow({ label, status, file }: { label: string; status: string | undefined; file?: string }) {
  const verified = status === 'Verified';
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <Badge tone={verified ? 'emerald' : 'amber'}>{status || 'Pending'}</Badge>
      </div>
      <div className="mt-2 truncate text-xs text-slate-500">{file || 'No file reference'}</div>
    </div>
  );
}

function VendorDetail({ vendor, canManage, onClose, onApprove, onReject }: { vendor: Vendor; canManage: boolean; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string, reason: string) => void }) {
  const [reason, setReason] = useState('');
  const fields: Array<[string, string | number | undefined]> = [
    ['Legal name', vendor.legalName],
    ['Display name', vendor.displayName],
    ['Vendor type', vendor.vendorType],
    ['Category', vendor.vendorCategory || vendor.classification],
    ['Entity', vendor.entity],
    ['Classification', vendor.classification],
    ['GSTIN', vendor.gstin],
    ['PAN', vendor.pan],
    ['Aadhaar', vendor.aadhaarMasked],
    ['MSME', vendor.msmeRegistered === 'Yes' ? vendor.msmeUdyamNo || 'Registered' : 'No'],
    ['Tax treatment', vendor.taxTreatment],
    ['TDS section', vendor.tdsSection],
    ['Address', `${vendor.addressLine1 || ''} ${vendor.city}, ${vendor.state} ${vendor.pinCode || ''}`.trim()],
    ['Primary contact', `${vendor.primaryContactName} | ${vendor.primaryContactEmail} | ${vendor.primaryContactPhone}`],
    ['Finance contact', `${vendor.financeContactName} | ${vendor.financeContactEmail}`],
    ['Bank', `${vendor.bankName} | ${vendor.accountNumberMasked} | ${vendor.ifsc}`],
    ['Bank branch', vendor.bankBranch],
    ['Payment terms', `${vendor.paymentTermsDays} days`],
    ['Preferred mode', vendor.preferredPaymentMode],
    ['Created by', vendor.createdBy],
    ['Remarks', vendor.remarks],
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07111f] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(vendor)}>{vendor.approvalStatus}</Badge>
              <Badge tone={vendor.blacklistFlag === 'Yes' ? 'rose' : 'slate'}>{vendor.blacklistFlag === 'Yes' ? 'Blocked' : vendor.onboardingStage || vendor.status}</Badge>
              <Badge tone="slate">{vendor.vendorCode}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">{vendor.legalName}</h2>
            <p className="mt-1 text-sm text-slate-400">Finance review with all KYC, tax, bank, and document data.</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300"><X size={17} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fields.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <DocumentRow label="GST certificate" status={vendor.gstCertificateStatus} file={vendor.gstCertificateFile} />
            <DocumentRow label="PAN card" status={vendor.panCardStatus} file={vendor.panCardFile} />
            <DocumentRow label="Aadhaar card" status={vendor.aadhaarCardStatus} file={vendor.aadhaarCardFile} />
            <DocumentRow label="Bank proof" status={vendor.bankProofStatus} file={vendor.bankProofFile} />
            <DocumentRow label="Cancelled cheque" status={vendor.cancelledChequeStatus} file={vendor.cancelledChequeFile} />
          </div>
        </div>

        {canManage && (
          <div className="border-t border-white/10 bg-slate-950/45 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Rejection reason, if rejecting"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30"
              />
              <div className="flex gap-2">
                {vendor.approvalStatus !== 'Approved' && <button onClick={() => { onApprove(vendor.id); onClose(); }} className="rounded-lg bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-200">Approve Vendor</button>}
                {vendor.blacklistFlag !== 'Yes' && <button onClick={() => { onReject(vendor.id, reason || 'Finance Head rejected KYC profile'); onClose(); }} className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-400/15">Reject Vendor</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VendorApprovalsPage() {
  const user = useDemoUser();
  const toast = useToast();
  const { vendors, approve, reject } = useVendors();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const pageSize = 8;
  const canManage = user.key === 'finance';

  const stats = useMemo(() => ({
    total: vendors.length,
    pending: vendors.filter((vendor) => vendor.approvalStatus === 'Pending').length,
    approved: vendors.filter((vendor) => vendor.approvalStatus === 'Approved').length,
    rejected: vendors.filter((vendor) => vendor.approvalStatus === 'Rejected' || vendor.blacklistFlag === 'Yes').length,
  }), [vendors]);

  const vendorTypes = ['All', ...Array.from(new Set(vendors.map((vendor) => vendor.vendorType).filter(Boolean)))];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const byStatus =
        statusFilter === 'All' ? true :
        statusFilter === 'Rejected' ? vendor.approvalStatus === 'Rejected' || vendor.blacklistFlag === 'Yes' :
        vendor.approvalStatus === statusFilter;
      const byType = typeFilter === 'All' || vendor.vendorType === typeFilter;
      const phrase = `${vendor.legalName} ${vendor.displayName} ${vendor.vendorCode} ${vendor.gstin} ${vendor.pan} ${vendor.bankName} ${vendor.primaryContactEmail}`.toLowerCase();
      return byStatus && byType && (!q || phrase.includes(q));
    });
  }, [vendors, query, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleApprove(id: string) {
    approve(id, user.role);
    toast({ type: 'success', title: 'Vendor approved', description: 'Vendor status updated and documents marked verified.' });
  }

  function handleReject(id: string, reason: string) {
    reject(id, user.role, reason);
    toast({ type: 'error', title: 'Vendor rejected', description: 'Vendor is blocked and will appear in rejected vendors.' });
  }

  return (
    <div className="space-y-5">
      <Panel title="Finance Head vendor Details" subtitle="Vendor Details actions are reserved for Finance Head. Admin can monitor the same register without taking finance decisions.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><Building2 className="text-cyan-300" size={20} /><div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Total applications</div><div className="mt-2 text-2xl font-semibold text-white">{stats.total}</div></div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4"><AlertTriangle className="text-amber-300" size={20} /><div className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-300">Pending review</div><div className="mt-2 text-2xl font-semibold text-white">{stats.pending}</div></div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4"><CheckCircle2 className="text-emerald-300" size={20} /><div className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-300">Approved</div><div className="mt-2 text-2xl font-semibold text-white">{stats.approved}</div></div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4"><ShieldAlert className="text-rose-300" size={20} /><div className="mt-2 text-xs uppercase tracking-[0.18em] text-rose-300">Rejected</div><div className="mt-2 text-2xl font-semibold text-white">{stats.rejected}</div></div>
        </div>
      </Panel>

      <Panel
        title={`Vendor Details (${filtered.length})`}
        subtitle="Use search, status filter, type filter, and pagination for finance review."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search vendor, GST, PAN, bank..." className="w-72 rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/30" />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {['All', 'Pending', 'Approved', 'Rejected'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {vendorTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">Vendor</th>
                <th className="border-b border-white/10 px-3 py-3">Tax details</th>
                <th className="border-b border-white/10 px-3 py-3">Documents</th>
                <th className="border-b border-white/10 px-3 py-3">Contact</th>
                <th className="border-b border-white/10 px-3 py-3">Bank details</th>
                <th className="border-b border-white/10 px-3 py-3">Status</th>
                <th className="border-b border-white/10 px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((vendor) => (
                <tr key={vendor.id} className="transition hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4"><div className="font-semibold text-white">{vendor.legalName}</div><div className="text-xs text-slate-500">{vendor.vendorCode} | {vendor.vendorType}</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">GST {vendor.gstin || 'N/A'}<div className="text-xs text-slate-500">PAN {vendor.pan || 'N/A'} | Aadhaar {vendor.aadhaarMasked || 'N/A'}</div></td>
                  <td className="border-b border-white/5 px-3 py-4"><div className="flex flex-wrap gap-1.5"><Badge tone={vendor.gstCertificateStatus === 'Verified' ? 'emerald' : 'amber'}>GST</Badge><Badge tone={vendor.panCardStatus === 'Verified' ? 'emerald' : 'amber'}>PAN</Badge><Badge tone={(vendor.aadhaarCardStatus || 'Pending') === 'Verified' ? 'emerald' : 'amber'}>Aadhaar</Badge><Badge tone={vendor.bankProofStatus === 'Verified' ? 'emerald' : 'amber'}>Bank</Badge><Badge tone={vendor.cancelledChequeStatus === 'Verified' ? 'emerald' : 'amber'}>Cheque</Badge></div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{vendor.primaryContactName}<div className="text-xs text-slate-500">{vendor.primaryContactEmail}</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{vendor.bankName || 'N/A'}<div className="text-xs text-slate-500">{vendor.accountNumberMasked} | {vendor.ifsc}</div></td>
                  <td className="border-b border-white/5 px-3 py-4"><div className="flex flex-col items-start gap-1.5"><Badge tone={statusTone(vendor)}>{vendor.approvalStatus}</Badge><Badge tone={vendor.blacklistFlag === 'Yes' ? 'rose' : 'slate'}>{vendor.blacklistFlag === 'Yes' ? 'Blocked' : vendor.onboardingStage || vendor.status}</Badge></div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {canManage && vendor.approvalStatus !== 'Approved' && <button onClick={() => handleApprove(vendor.id)} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200">Approve</button>}
                      {canManage && vendor.blacklistFlag !== 'Yes' && <button onClick={() => handleReject(vendor.id, 'Finance Head rejected KYC profile')} className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/15">Reject</button>}
                      <button onClick={() => setSelected(vendor)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 hover:bg-white/10" title="View all vendor data"><Eye size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-500">No vendor approvals found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-400">Page {currentPage} of {totalPages}</div>
          <div className="flex gap-2">
            <button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Previous</button>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </Panel>

      {selected && <VendorDetail vendor={selected} canManage={canManage} onClose={() => setSelected(null)} onApprove={handleApprove} onReject={handleReject} />}
    </div>
  );
}
