'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, MetricCard, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import { useVendors } from '@/lib/vendor-store';
import type { Vendor } from '@/lib/types';
import { Building2, CheckCircle2, Eye, FileCheck2, RefreshCw, Search, ShieldAlert, Upload } from 'lucide-react';

type VendorDraft = {
  legalName: string;
  displayName: string;
  vendorType: string;
  vendorCategory: string;
  entity: string;
  classification: string;
  gstin: string;
  pan: string;
  aadhaar: string;
  msmeRegistered: string;
  msmeUdyamNo: string;
  taxTreatment: string;
  tdsSection: string;
  addressLine1: string;
  city: string;
  state: string;
  pinCode: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  financeContactName: string;
  financeContactEmail: string;
  bankAccountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  bankBranch: string;
  paymentTermsDays: string;
  preferredPaymentMode: string;
  complianceOwner: string;
  gstCertificateFile: string;
  panCardFile: string;
  aadhaarCardFile: string;
  cancelledChequeFile: string;
  bankProofFile: string;
  remarks: string;
};

const emptyDraft: VendorDraft = {
  legalName: '',
  displayName: '',
  vendorType: 'Supplier',
  vendorCategory: 'Goods',
  entity: 'Private Limited',
  classification: 'Standard',
  gstin: '',
  pan: '',
  aadhaar: '',
  msmeRegistered: 'No',
  msmeUdyamNo: '',
  taxTreatment: 'Regular',
  tdsSection: '194C',
  addressLine1: '',
  city: '',
  state: 'Maharashtra',
  pinCode: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  financeContactName: '',
  financeContactEmail: '',
  bankAccountHolder: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  bankBranch: '',
  paymentTermsDays: '30',
  preferredPaymentMode: 'NEFT',
  complianceOwner: 'Finance Head',
  gstCertificateFile: '',
  panCardFile: '',
  aadhaarCardFile: '',
  cancelledChequeFile: '',
  bankProofFile: '',
  remarks: '',
};

const viewLabels: Record<string, string> = {
  add: 'Add Vendor',
  all: 'All Vendors',
  approved: 'Approved Vendors',
  rejected: 'Rejected Vendors',
  pending: 'Pending Finance Approval',
};

function maskAccount(value: string) {
  const clean = value.replace(/\D/g, '');
  if (!clean) return 'XXXXXXXXXX';
  return `${'X'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function maskAadhaar(value: string) {
  const clean = value.replace(/\D/g, '');
  return clean ? `XXXX-XXXX-${clean.slice(-4)}` : '';
}

function statusTone(vendor: Vendor) {
  if (vendor.blacklistFlag === 'Yes' || vendor.approvalStatus === 'Rejected') return 'rose' as const;
  if (vendor.approvalStatus === 'Approved') return 'emerald' as const;
  return 'amber' as const;
}

function Field({ label, value, onChange, type = 'text', required = true, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-400/30"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function FileField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <span className="mt-2 flex min-h-[46px] items-center gap-2 rounded-lg border border-dashed border-white/15 bg-slate-950/40 px-3 text-sm text-slate-400">
        <Upload size={15} />
        <input
          type="file"
          className="w-full cursor-pointer text-xs file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950"
          onChange={(event) => onChange(event.target.files?.[0]?.name ?? value)}
        />
      </span>
      {value && <span className="mt-1 block truncate text-xs text-slate-500">{value}</span>}
    </label>
  );
}

function VendorPreview({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const fields = [
    ['Legal name', vendor.legalName],
    ['Display name', vendor.displayName],
    ['Vendor type', vendor.vendorType],
    ['Category', vendor.vendorCategory || vendor.vendorType],
    ['Entity', vendor.entity],
    ['Classification', vendor.classification],
    ['GSTIN', vendor.gstin],
    ['PAN', vendor.pan],
    ['Aadhaar', vendor.aadhaarMasked || 'Not stored'],
    ['MSME', vendor.msmeRegistered === 'Yes' ? vendor.msmeUdyamNo || 'Registered' : 'No'],
    ['Tax treatment', vendor.taxTreatment],
    ['TDS section', vendor.tdsSection],
    ['Address', `${vendor.addressLine1 || ''} ${vendor.city}, ${vendor.state} ${vendor.pinCode || ''}`.trim()],
    ['Primary contact', `${vendor.primaryContactName} | ${vendor.primaryContactEmail} | ${vendor.primaryContactPhone}`],
    ['Finance contact', `${vendor.financeContactName} | ${vendor.financeContactEmail}`],
    ['Bank', `${vendor.bankName} | ${vendor.accountNumberMasked} | ${vendor.ifsc}`],
    ['Branch', vendor.bankBranch],
    ['Payment mode', vendor.preferredPaymentMode],
    ['Payment terms', `${vendor.paymentTermsDays} days`],
    ['Remarks', vendor.remarks],
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#07111f] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(vendor)}>{vendor.approvalStatus}</Badge>
              <Badge tone="slate">{vendor.documentStatus}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">{vendor.legalName}</h2>
            <p className="mt-1 text-sm text-slate-400">{vendor.vendorCode} | {vendor.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">Close</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
                <div className="mt-1 break-words text-sm font-medium text-slate-200">{value || 'Not provided'}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              ['GST certificate', vendor.gstCertificateStatus, vendor.gstCertificateFile],
              ['PAN card', vendor.panCardStatus, vendor.panCardFile],
              ['Aadhaar card', vendor.aadhaarCardStatus || 'Pending', vendor.aadhaarCardFile],
              ['Bank proof', vendor.bankProofStatus, vendor.bankProofFile],
              ['Cancelled cheque', vendor.cancelledChequeStatus, vendor.cancelledChequeFile],
            ].map(([label, status, file]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="mt-2"><Badge tone={status === 'Verified' ? 'emerald' : 'amber'}>{status}</Badge></div>
                <div className="mt-2 truncate text-xs text-slate-500">{file || 'No file reference'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const user = useDemoUser();
  const toast = useToast();
  const params = useSearchParams();
  const requestedView = params?.get('view') || 'all';
  const view = ['add', 'all', 'approved', 'rejected', 'pending'].includes(requestedView) ? requestedView : 'all';
  const { vendors, add, reset } = useVendors();
  const [draft, setDraft] = useState<VendorDraft>(emptyDraft);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const pageSize = 8;
  const canCreate = user.key === 'admin';

  const stats = useMemo(() => ({
    total: vendors.length,
    pending: vendors.filter((vendor) => vendor.approvalStatus === 'Pending').length,
    approved: vendors.filter((vendor) => vendor.approvalStatus === 'Approved').length,
    rejected: vendors.filter((vendor) => vendor.approvalStatus === 'Rejected' || vendor.blacklistFlag === 'Yes').length,
  }), [vendors]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const byView =
        view === 'approved' ? vendor.approvalStatus === 'Approved' :
        view === 'rejected' ? vendor.approvalStatus === 'Rejected' || vendor.blacklistFlag === 'Yes' :
        view === 'pending' ? vendor.approvalStatus === 'Pending' :
        true;
      const byType = typeFilter === 'All' || vendor.vendorType === typeFilter || vendor.vendorCategory === typeFilter;
      const phrase = `${vendor.legalName} ${vendor.displayName} ${vendor.vendorCode} ${vendor.gstin} ${vendor.pan} ${vendor.primaryContactEmail} ${vendor.bankName}`.toLowerCase();
      return byView && byType && (!normalized || phrase.includes(normalized));
    });
  }, [vendors, query, typeFilter, view]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);
  const vendorTypes = ['All', ...Array.from(new Set(vendors.flatMap((vendor) => [vendor.vendorType, vendor.vendorCategory || '']).filter(Boolean)))];

  function patchDraft(patch: Partial<VendorDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) {
      toast({ type: 'error', title: 'Admin only', description: 'Only Admin can add vendor onboarding records.' });
      return;
    }

    const requiredDocs = [draft.gstCertificateFile, draft.panCardFile, draft.aadhaarCardFile, draft.cancelledChequeFile, draft.bankProofFile];
    if (draft.pan.trim().length !== 10 || draft.aadhaar.replace(/\D/g, '').length !== 12 || requiredDocs.some((doc) => !doc.trim())) {
      toast({ type: 'error', title: 'KYC incomplete', description: 'PAN, 12-digit Aadhaar, GST certificate, PAN card, Aadhaar, bank proof, and cancelled cheque are required.' });
      return;
    }

    const newVendor = add({
      legalName: draft.legalName,
      displayName: draft.displayName || draft.legalName,
      vendorType: draft.vendorType,
      vendorCategory: draft.vendorCategory,
      status: 'Pending Approval',
      approvalStatus: 'Pending',
      msmeRegistered: draft.msmeRegistered,
      msmeUdyamNo: draft.msmeUdyamNo,
      gstin: draft.gstin.toUpperCase(),
      pan: draft.pan.toUpperCase(),
      state: draft.state,
      city: draft.city,
      entity: draft.entity,
      classification: draft.classification,
      riskScore: draft.classification === 'Strategic' ? 42 : 30,
      paymentTermsDays: Number(draft.paymentTermsDays) || 30,
      primaryContactName: draft.primaryContactName,
      primaryContactEmail: draft.primaryContactEmail,
      primaryContactPhone: draft.primaryContactPhone,
      financeContactName: draft.financeContactName || draft.primaryContactName,
      financeContactEmail: draft.financeContactEmail || draft.primaryContactEmail,
      bankName: draft.bankName,
      accountNumberMasked: maskAccount(draft.accountNumber),
      ifsc: draft.ifsc.toUpperCase(),
      bankBranch: draft.bankBranch,
      documentStatus: 'Pending Finance Review',
      gstCertificateStatus: 'Pending',
      panCardStatus: 'Pending',
      aadhaarCardStatus: 'Pending',
      bankProofStatus: 'Pending',
      cancelledChequeStatus: 'Pending',
      onboardingSource: 'Admin Portal',
      remarks: draft.remarks || 'Submitted by Admin for Finance Head approval.',
      taxTreatment: draft.taxTreatment,
      tdsSection: draft.tdsSection,
      preferredPaymentMode: draft.preferredPaymentMode,
      supportedDocCount: 5,
      aadhaarMasked: maskAadhaar(draft.aadhaar),
      aadhaarCardFile: draft.aadhaarCardFile,
      panCardFile: draft.panCardFile,
      gstCertificateFile: draft.gstCertificateFile,
      cancelledChequeFile: draft.cancelledChequeFile,
      bankProofFile: draft.bankProofFile,
      bankAccountHolder: draft.bankAccountHolder || draft.legalName,
      addressLine1: draft.addressLine1,
      pinCode: draft.pinCode,
      complianceOwner: draft.complianceOwner,
      onboardingStage: 'Finance Review',
    }, user.role);

    setDraft(emptyDraft);
    toast({ type: 'success', title: 'Vendor submitted', description: `${newVendor.displayName} is now in Finance Head approval.` });
  }

  return (
    <div className="space-y-5">
      <Panel title="Vendor management" subtitle="Admin creates vendor KYC records. Finance Head handles approvals from the sidebar Finance Approval page.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total vendors" value={stats.total} icon={<Building2 size={18} />} tone="cyan" />
          <MetricCard label="Pending" value={stats.pending} icon={<FileCheck2 size={18} />} tone="amber" />
          <MetricCard label="Approved" value={stats.approved} icon={<CheckCircle2 size={18} />} tone="emerald" />
          <MetricCard label="Rejected" value={stats.rejected} icon={<ShieldAlert size={18} />} tone="rose" />
        </div>
      </Panel>

      {view === 'add' && (
        <Panel title="Add vendor with KYC documents" subtitle="This form captures more than 20 onboarding fields plus required Aadhaar, PAN, GST, bank proof, and cancelled cheque document references.">
          {!canCreate && <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">Only Admin can create Vendor records. Use Admin role to add vendors.</div>}
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Field label="Legal name" value={draft.legalName} onChange={(value) => patchDraft({ legalName: value })} />
              <Field label="Display name" value={draft.displayName} onChange={(value) => patchDraft({ displayName: value })} />
              <SelectField label="Vendor type" value={draft.vendorType} options={['Supplier', 'Manufacturer', 'Service Provider', 'Distributor', 'Freight Partner', 'Consultant']} onChange={(value) => patchDraft({ vendorType: value })} />
              <SelectField label="Vendor category" value={draft.vendorCategory} options={['Goods', 'Services', 'Capital Goods', 'Logistics', 'IT', 'Consulting']} onChange={(value) => patchDraft({ vendorCategory: value })} />
              <SelectField label="Entity type" value={draft.entity} options={['Private Limited', 'LLP', 'Partnership', 'Proprietorship', 'Public Limited', 'Trust']} onChange={(value) => patchDraft({ entity: value })} />
              <SelectField label="Classification" value={draft.classification} options={['Standard', 'Strategic', 'Preferred', 'High Risk', 'MSME']} onChange={(value) => patchDraft({ classification: value })} />
              <Field label="GSTIN" value={draft.gstin} onChange={(value) => patchDraft({ gstin: value.toUpperCase() })} />
              <Field label="PAN card number" value={draft.pan} onChange={(value) => patchDraft({ pan: value.toUpperCase().slice(0, 10) })} />
              <Field label="Aadhaar card number" value={draft.aadhaar} onChange={(value) => patchDraft({ aadhaar: value.replace(/\D/g, '').slice(0, 12) })} />
              <SelectField label="MSME registered" value={draft.msmeRegistered} options={['No', 'Yes']} onChange={(value) => patchDraft({ msmeRegistered: value })} />
              <Field label="MSME Udyam number" required={false} value={draft.msmeUdyamNo} onChange={(value) => patchDraft({ msmeUdyamNo: value.toUpperCase() })} />
              <SelectField label="Tax treatment" value={draft.taxTreatment} options={['Regular', 'Composition', 'SEZ', 'Exempt', 'Reverse Charge']} onChange={(value) => patchDraft({ taxTreatment: value })} />
              <SelectField label="TDS section" value={draft.tdsSection} options={['194C', '194J', '194Q', '194H', 'None']} onChange={(value) => patchDraft({ tdsSection: value })} />
              <Field label="Address line" value={draft.addressLine1} onChange={(value) => patchDraft({ addressLine1: value })} />
              <Field label="City" value={draft.city} onChange={(value) => patchDraft({ city: value })} />
              <Field label="State" value={draft.state} onChange={(value) => patchDraft({ state: value })} />
              <Field label="PIN code" value={draft.pinCode} onChange={(value) => patchDraft({ pinCode: value.replace(/\D/g, '').slice(0, 6) })} />
              <Field label="Primary contact" value={draft.primaryContactName} onChange={(value) => patchDraft({ primaryContactName: value })} />
              <Field label="Primary email" type="email" value={draft.primaryContactEmail} onChange={(value) => patchDraft({ primaryContactEmail: value })} />
              <Field label="Primary phone" value={draft.primaryContactPhone} onChange={(value) => patchDraft({ primaryContactPhone: value })} />
              <Field label="Finance contact" value={draft.financeContactName} onChange={(value) => patchDraft({ financeContactName: value })} />
              <Field label="Finance email" type="email" value={draft.financeContactEmail} onChange={(value) => patchDraft({ financeContactEmail: value })} />
              <Field label="Account holder" value={draft.bankAccountHolder} onChange={(value) => patchDraft({ bankAccountHolder: value })} />
              <Field label="Bank name" value={draft.bankName} onChange={(value) => patchDraft({ bankName: value })} />
              <Field label="Account number" value={draft.accountNumber} onChange={(value) => patchDraft({ accountNumber: value })} />
              <Field label="IFSC" value={draft.ifsc} onChange={(value) => patchDraft({ ifsc: value.toUpperCase() })} />
              <Field label="Bank branch" value={draft.bankBranch} onChange={(value) => patchDraft({ bankBranch: value })} />
              <Field label="Payment terms days" type="number" value={draft.paymentTermsDays} onChange={(value) => patchDraft({ paymentTermsDays: value })} />
              <SelectField label="Preferred payment mode" value={draft.preferredPaymentMode} options={['NEFT', 'RTGS', 'UPI', 'Cheque', 'Manual Bank Transfer']} onChange={(value) => patchDraft({ preferredPaymentMode: value })} />
              <Field label="Compliance owner" value={draft.complianceOwner} onChange={(value) => patchDraft({ complianceOwner: value })} />
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <FileField label="GST certificate" value={draft.gstCertificateFile} onChange={(value) => patchDraft({ gstCertificateFile: value })} />
              <FileField label="PAN card" value={draft.panCardFile} onChange={(value) => patchDraft({ panCardFile: value })} />
              <FileField label="Aadhaar card" value={draft.aadhaarCardFile} onChange={(value) => patchDraft({ aadhaarCardFile: value })} />
              <FileField label="Bank proof" value={draft.bankProofFile} onChange={(value) => patchDraft({ bankProofFile: value })} />
              <FileField label="Cancelled cheque" value={draft.cancelledChequeFile} onChange={(value) => patchDraft({ cancelledChequeFile: value })} />
            </div>

            <label className="block text-sm text-slate-300">
              Remarks
              <textarea value={draft.remarks} onChange={(event) => patchDraft({ remarks: event.target.value })} className="mt-2 min-h-[92px] w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400/30" />
            </label>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
              <FileCheck2 size={16} /> Submit to Finance Head
            </button>
          </form>
        </Panel>
      )}

      {view !== 'add' && (
        <Panel
          title={`${viewLabels[view]} (${filtered.length})`}
          subtitle="Search, filter, paginate, and view the same records that Finance Head will approve."
          action={
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search vendor, GST, PAN, bank..." className="w-72 rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/30" />
              </div>
              <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
                {vendorTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"><RefreshCw size={14} />Reset</button>
            </div>
          }
        >
          <div className="overflow-auto">
            <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="border-b border-white/10 px-3 py-3">Vendor</th>
                  <th className="border-b border-white/10 px-3 py-3">Tax / KYC</th>
                  <th className="border-b border-white/10 px-3 py-3">Documents</th>
                  <th className="border-b border-white/10 px-3 py-3">Contact</th>
                  <th className="border-b border-white/10 px-3 py-3">Bank</th>
                  <th className="border-b border-white/10 px-3 py-3">Status</th>
                  <th className="border-b border-white/10 px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((vendor) => (
                  <tr key={vendor.id} className="transition hover:bg-white/[0.03]">
                    <td className="border-b border-white/5 px-3 py-4">
                      <div className="font-semibold text-white">{vendor.displayName || vendor.legalName}</div>
                      <div className="text-xs text-slate-500">{vendor.legalName} | {vendor.vendorCode}</div>
                      <div className="mt-1 text-xs text-slate-500">{vendor.vendorType} / {vendor.vendorCategory || vendor.classification}</div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>GSTIN: {vendor.gstin || 'N/A'}</div>
                      <div className="text-xs text-slate-500">PAN: {vendor.pan || 'N/A'} | Aadhaar: {vendor.aadhaarMasked || 'N/A'}</div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={vendor.gstCertificateStatus === 'Verified' ? 'emerald' : 'amber'}>GST</Badge>
                        <Badge tone={vendor.panCardStatus === 'Verified' ? 'emerald' : 'amber'}>PAN</Badge>
                        <Badge tone={(vendor.aadhaarCardStatus || 'Pending') === 'Verified' ? 'emerald' : 'amber'}>Aadhaar</Badge>
                        <Badge tone={vendor.cancelledChequeStatus === 'Verified' ? 'emerald' : 'amber'}>Cheque</Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{vendor.supportedDocCount || 5} document fields</div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>{vendor.primaryContactName}</div>
                      <div className="text-xs text-slate-500">{vendor.primaryContactEmail}</div>
                      <div className="text-xs text-slate-500">{vendor.city}, {vendor.state}</div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                      <div>{vendor.bankName || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{vendor.accountNumberMasked} | {vendor.ifsc}</div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone={statusTone(vendor)}>{vendor.approvalStatus}</Badge>
                        <Badge tone={vendor.blacklistFlag === 'Yes' ? 'rose' : 'slate'}>{vendor.blacklistFlag === 'Yes' ? 'Blocked' : vendor.onboardingStage || vendor.status}</Badge>
                      </div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href="/vendor-approvals" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/15">Finance review</Link>
                        <button onClick={() => setSelected(vendor)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 hover:bg-white/10" title="View vendor">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-500">No vendors found for this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-400">Page {Math.min(page, totalPages)} of {totalPages}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Next</button>
            </div>
          </div>
        </Panel>
      )}

      {selected && <VendorPreview vendor={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
