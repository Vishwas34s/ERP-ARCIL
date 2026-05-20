'use client';

import { useMemo, useState } from 'react';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { useVendors } from '@/lib/vendor-store';
import type { Vendor } from '@/lib/types';
import { 
  Building2, 
  CheckCircle2, 
  Eye, 
  Search, 
  ShieldAlert, 
  X, 
  XCircle, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Calendar, 
  Briefcase,
  AlertTriangle,
  Lock,
  UserCheck
} from 'lucide-react';

function DetailField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 break-words font-medium text-slate-200">{value || 'Not Provided'}</div>
    </div>
  );
}

function DocumentRow({ label, status }: { label: string; status: string }) {
  const isVerified = status === 'Verified';
  const isExpired = status === 'Expired';
  const tone = isVerified ? 'emerald' : isExpired ? 'rose' : 'amber';
  
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/45 p-3">
      <span className="text-sm text-slate-300 font-medium">{label}</span>
      <Badge tone={tone}>{status}</Badge>
    </div>
  );
}

interface VendorDetailProps {
  vendor: Vendor;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  canManage: boolean;
}

function VendorDetail({ vendor, onClose, onApprove, onReject, canManage }: VendorDetailProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const submitReject = () => {
    if (!reason.trim()) return;
    onReject(vendor.id, reason);
    setRejecting(false);
    onClose();
  };

  const statusTone = vendor.approvalStatus === 'Approved' ? 'emerald' : vendor.approvalStatus === 'Rejected' ? 'rose' : 'amber';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 p-3 backdrop-blur-sm sm:p-5 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07111f] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone}>{vendor.approvalStatus}</Badge>
              <Badge tone={vendor.blacklistFlag === 'Yes' ? 'rose' : 'cyan'}>
                {vendor.blacklistFlag === 'Yes' ? 'Rejected' : 'Clear KYC'}
              </Badge>
              <Badge tone="slate">{vendor.vendorType}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">{vendor.legalName}</h2>
            <p className="mt-1 text-sm text-slate-400">Vendor ID: <span className="text-slate-200 font-mono">{vendor.id}</span> | Code: {vendor.vendorCode}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10" aria-label="Close details"><X size={17} /></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Left Column: Registration Details */}
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white mb-3">General Information</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Display Name" value={vendor.displayName} />
                  <DetailField label="Entity Type" value={vendor.entity} />
                  <DetailField label="Classification" value={vendor.classification} />
                  <DetailField label="Risk Score (0-100)" value={vendor.riskScore} />
                  <DetailField label="GSTIN" value={vendor.gstin} />
                  <DetailField label="PAN" value={vendor.pan} />
                  <DetailField label="MSME Registered" value={vendor.msmeRegistered} />
                  {vendor.msmeRegistered === 'Yes' && (
                    <DetailField label="MSME Udyam No" value={vendor.msmeUdyamNo} />
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white mb-3">Contact Information</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Contact Name" value={vendor.primaryContactName} />
                  <DetailField label="Contact Email" value={vendor.primaryContactEmail} />
                  <DetailField label="Contact Phone" value={vendor.primaryContactPhone} />
                  <DetailField label="Finance Contact" value={vendor.financeContactName} />
                </div>
                <div className="mt-3">
                  <DetailField label="Full Address" value={`${vendor.city}, ${vendor.state}`} />
                </div>
              </div>
            </div>

            {/* Right Column: Banking & Documents */}
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white mb-3">Banking Credentials</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Bank Name" value={vendor.bankName} />
                  <DetailField label="Account Number" value={vendor.accountNumberMasked} />
                  <DetailField label="IFSC Code" value={vendor.ifsc} />
                  <DetailField label="Bank Branch" value={vendor.bankBranch} />
                  <DetailField label="Preferred Payment" value={vendor.preferredPaymentMode} />
                  <DetailField label="Terms (Days)" value={vendor.paymentTermsDays} />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white mb-3">Verification Documents</div>
                <div className="space-y-2">
                  <DocumentRow label="GST Registration Certificate" status={vendor.gstCertificateStatus} />
                  <DocumentRow label="PAN Card Document" status={vendor.panCardStatus} />
                  <DocumentRow label="Cancelled Cheque Document" status={vendor.cancelledChequeStatus} />
                  <DocumentRow label="Bank Statement / Proof" status={vendor.bankProofStatus} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Logs & Remarks */}
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-semibold text-white mb-2">Remarks & Logs</div>
            <div className="text-sm leading-6 text-slate-300 italic">
              &ldquo;{vendor.remarks || 'No remarks recorded.'}&rdquo;
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-white/10 bg-slate-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-400">
            Created at: {vendor.createdAt} | Source: {vendor.onboardingSource}
          </div>
          
          {canManage && (
            <div className="flex gap-2">
              {rejecting ? (
                <div className="flex flex-1 gap-2 items-center w-full">
                  <input 
                    type="text" 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    placeholder="Enter reason for rejection" 
                    className="rounded-lg border border-rose-500/30 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none w-full"
                  />
                  <button onClick={submitReject} className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition whitespace-nowrap">Confirm Rejection</button>
                  <button onClick={() => setRejecting(false)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition">Cancel</button>
                </div>
              ) : (
                <>
                  {vendor.approvalStatus !== 'Approved' && (
                    <button 
                      onClick={() => { onApprove(vendor.id); onClose(); }} 
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-300 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-emerald-200 transition"
                    >
                      <UserCheck size={14} /> Approve Supplier
                    </button>
                  )}
                  {vendor.blacklistFlag !== 'Yes' && (
                    <button 
                      onClick={() => setRejecting(true)} 
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition"
                    >
                      <Lock size={14} /> Reject Vendor
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorApprovalsPage() {
  const user = useDemoUser();
  const { vendors, approve, reject } = useVendors();
  const toast = useToast();
  
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Vendor | null>(null);

  const canManage = user.key === 'admin' || user.level === 'L3';

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const phrase = `${v.legalName} ${v.vendorCode} ${v.id} ${v.gstin} ${v.pan} ${v.approvalStatus}`.toLowerCase();
      return phrase.includes(query.toLowerCase());
    });
  }, [vendors, query]);

  // Statistics counts
  const stats = useMemo(() => {
    const total = vendors.length;
    const pending = vendors.filter((v) => v.approvalStatus === 'Pending').length;
    const approvedCount = vendors.filter((v) => v.approvalStatus === 'Approved').length;
    const blacklisted = vendors.filter((v) => v.blacklistFlag === 'Yes').length;
    return { total, pending, approvedCount, blacklisted };
  }, [vendors]);

  const handleApprove = (id: string) => {
    approve(id, user.role);
    toast({
      type: 'success',
      title: 'Vendor Approved Successfully',
      description: 'Vendor is now active and approved for invoicing workflows.',
    });
  };

  const handleReject = (id: string, reason: string) => {
    reject(id, user.role, reason);
    toast({
      type: 'error',
      title: 'Vendor Rejected',
      description: 'Supplier was rejected and blocked from invoice workflows.',
    });
  };

  const getStatusTone = (status: string, blacklist: string) => {
    if (blacklist === 'Yes') return 'rose';
    if (status === 'Approved') return 'emerald';
    if (status === 'Rejected') return 'rose';
    return 'amber';
  };

  return (
    <div className="space-y-5">
      {/* Header and Statistics panel */}
      <Panel
        title="Phase 4: Vendor Onboarding & Approval Overview"
        subtitle="Review, approve, or reject supplier KYC registration profiles. Rejected suppliers are blocked from invoice workflows."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
            <Building2 className="text-cyan-300" size={20} />
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Total Applications</div>
            <div className="mt-2 text-2xl font-semibold text-white">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
            <AlertTriangle className="text-amber-300" size={20} />
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-300">Pending Review</div>
            <div className="mt-2 text-2xl font-semibold text-white">{stats.pending}</div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle2 className="text-emerald-300" size={20} />
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-300">Approved Suppliers</div>
            <div className="mt-2 text-2xl font-semibold text-white">{stats.approvedCount}</div>
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
            <ShieldAlert className="text-rose-300" size={20} />
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-rose-300">Rejected Suppliers</div>
            <div className="mt-2 text-2xl font-semibold text-white">{stats.blacklisted}</div>
          </div>
        </div>
      </Panel>

      {/* Main Vendor List Panel */}
      <Panel 
        title="Supplier KYC Onboarding Queue" 
        subtitle="Manage supplier registrations. Action buttons are active only for Finance Head L3 and Admin."
        action={
          <div className="relative flex items-center max-w-[280px]">
            <Search className="absolute left-3 text-slate-400" size={16} />
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 pl-9 pr-4 py-2 text-sm outline-none focus:border-cyan-400/30 text-white placeholder-slate-500" 
              placeholder="Search legal name, GSTIN..." 
            />
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">Vendor details</th>
                <th className="border-b border-white/10 px-3 py-3">Tax details</th>
                <th className="border-b border-white/10 px-3 py-3">Classification</th>
                <th className="border-b border-white/10 px-3 py-3">Contacts</th>
                <th className="border-b border-white/10 px-3 py-3">Bank details</th>
                <th className="border-b border-white/10 px-3 py-3">Status</th>
                <th className="border-b border-white/10 px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const statusTone = getStatusTone(v.approvalStatus, v.blacklistFlag);
                const isBlacklisted = v.blacklistFlag === 'Yes';
                
                return (
                  <tr key={v.id} className="transition hover:bg-white/[0.02]">
                    {/* Legal details */}
                    <td className="border-b border-white/5 px-3 py-4">
                      <div className="font-semibold text-white">{v.legalName}</div>
                      <div className="text-xs text-slate-500">ID: {v.id} | Code: {v.vendorCode}</div>
                    </td>

                    {/* Tax identifiers */}
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>GST: {v.gstin || 'N/A'}</div>
                      <div className="text-xs text-slate-500">PAN: {v.pan || 'N/A'}</div>
                    </td>

                    {/* Category & Risk */}
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>{v.classification}</div>
                      <div className="text-xs text-slate-500">Risk Score: {v.riskScore}</div>
                    </td>

                    {/* Primary Contact info */}
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>{v.primaryContactName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1"><Mail size={10} /> {v.primaryContactEmail}</div>
                    </td>

                    {/* Bank credentials masked */}
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>{v.bankName || 'N/A'}</div>
                      <div className="text-xs text-slate-500">A/C: {v.accountNumberMasked}</div>
                    </td>

                    {/* Current KYC Status */}
                    <td className="border-b border-white/5 px-3 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <Badge tone={statusTone}>{v.approvalStatus}</Badge>
                        {isBlacklisted && <Badge tone="rose">KYC Blocked</Badge>}
                      </div>
                    </td>

                    {/* View detailed profile with Eye icon on the RIGHT */}
                    <td className="border-b border-white/5 px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && v.approvalStatus !== 'Approved' && (
                          <button 
                            onClick={() => handleApprove(v.id)} 
                            className="rounded-lg bg-emerald-300/10 border border-emerald-300/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-300/20 transition"
                          >
                            Approve
                          </button>
                        )}
                        {canManage && !isBlacklisted && (
                          <button 
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:', 'Failed KYC check');
                              if (reason) handleReject(v.id, reason);
                            }} 
                            className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                          >
                            Block
                          </button>
                        )}
                        <button 
                          onClick={() => setSelected(v)} 
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 transition hover:bg-white/10" 
                          title="View detailed onboarding profile"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No supplier KYC profiles found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Profile Detail Drawer Modal */}
      {selected && (
        <VendorDetail 
          vendor={selected} 
          onClose={() => setSelected(null)} 
          onApprove={handleApprove} 
          onReject={handleReject} 
          canManage={canManage}
        />
      )}
    </div>
  );
}
