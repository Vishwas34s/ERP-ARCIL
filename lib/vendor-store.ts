'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Vendor } from './types';
import vendorsSeed from '@/data/vendors.json';

const vendorStorageKey = 'procureflow-vendors-master';
const legacyAdminVendorKey = 'procureflow-admin-vendors';

// Helper to load and initialize master vendor list
function getStoredVendors(): Vendor[] {
  if (typeof window === 'undefined') return vendorsSeed as Vendor[];
  
  const saved = window.localStorage.getItem(vendorStorageKey);
  if (saved) {
    try {
      return JSON.parse(saved) as Vendor[];
    } catch {
      return vendorsSeed as Vendor[];
    }
  }

  // If no master store, initialize it and check for legacy admin onboarding items to merge
  let legacyOnboarded: any[] = [];
  const legacySaved = window.localStorage.getItem(legacyAdminVendorKey);
  if (legacySaved) {
    try {
      legacyOnboarded = JSON.parse(legacySaved);
    } catch {}
  }

  const mappedLegacy: Vendor[] = legacyOnboarded.map((v) => ({
    id: v.id || `ADM-VND-${String(Date.now()).slice(-6)}`,
    vendorCode: `VC-${String(Date.now()).slice(-4)}`,
    legalName: v.legalName || '',
    displayName: v.displayName || v.legalName || '',
    vendorType: v.vendorType || 'Supplier',
    status: 'Pending Approval',
    approvalStatus: 'Pending',
    msmeRegistered: 'No',
    msmeUdyamNo: '',
    gstin: v.gstin || '',
    pan: v.pan || '',
    state: 'Maharashtra',
    city: 'Mumbai',
    entity: v.legalName || '',
    classification: 'Standard',
    riskScore: 30,
    paymentTermsDays: 30,
    currency: 'INR',
    primaryContactName: v.primaryContactName || '',
    primaryContactEmail: v.primaryContactEmail || '',
    primaryContactPhone: v.primaryContactPhone || '',
    financeContactName: v.primaryContactName || '',
    financeContactEmail: v.primaryContactEmail || '',
    bankName: v.bankName || '',
    accountNumberMasked: v.accountNumber ? `XXXXXX${v.accountNumber.slice(-4)}` : 'XXXXXXXXXX',
    ifsc: v.ifsc || '',
    bankBranch: 'Main Branch',
    documentStatus: 'Complete',
    gstCertificateStatus: v.gstCertificateDocument ? 'Verified' : 'Pending',
    panCardStatus: v.panCardDocument ? 'Verified' : 'Pending',
    bankProofStatus: v.cancelledChequeDocument ? 'Verified' : 'Pending',
    cancelledChequeStatus: v.cancelledChequeDocument ? 'Verified' : 'Pending',
    onboardingSource: 'Portal',
    activatedAt: '',
    lastInvoiceDate: '',
    createdAt: v.createdAt || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    createdBy: 'Admin',
    remarks: 'Imported legacy onboarded profile',
    taxTreatment: 'Regular',
    tdsSection: '194C',
    preferredPaymentMode: 'NEFT',
    bankingEnabled: 'Yes',
    blacklistFlag: 'No',
    kycExpiringInDays: 365,
    supportedDocCount: 4,
    aadhaarMasked: v.aadhaar ? `XXXX-XXXX-${String(v.aadhaar).slice(-4)}` : '',
    aadhaarCardStatus: v.aadhaarCardDocument ? 'Verified' : 'Pending',
    aadhaarCardFile: v.aadhaarCardDocument || '',
    panCardFile: v.panCardDocument || '',
    gstCertificateFile: v.gstCertificateDocument || '',
    cancelledChequeFile: v.cancelledChequeDocument || '',
    bankProofFile: v.cancelledChequeDocument || '',
    bankAccountHolder: v.legalName || '',
    addressLine1: v.addressLine1 || '',
    pinCode: v.pinCode || '',
    complianceOwner: 'Finance Head',
    vendorCategory: v.vendorType || 'Supplier',
    onboardingStage: 'Finance Review',
  }));

  const combined = [...mappedLegacy, ...(vendorsSeed as Vendor[])];
  window.localStorage.setItem(vendorStorageKey, JSON.stringify(combined));
  return combined;
}

function publishVendors(items: Vendor[]) {
  window.localStorage.setItem(vendorStorageKey, JSON.stringify(items));
  window.dispatchEvent(new Event('procureflow-vendors-updated'));
}

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    const sync = () => setVendors(getStoredVendors());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-vendors-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-vendors-updated', sync);
    };
  }, []);

  const actions = useMemo(() => ({
    save(nextVendors: Vendor[]) {
      publishVendors(nextVendors);
      setVendors(nextVendors);
    },
    approve(id: string, actor: string) {
      const nextVendors = getStoredVendors().map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'Active',
              approvalStatus: 'Approved',
              blacklistFlag: 'No',
              documentStatus: 'Verified',
              gstCertificateStatus: 'Verified',
              panCardStatus: 'Verified',
              aadhaarCardStatus: 'Verified',
              bankProofStatus: 'Verified',
              cancelledChequeStatus: 'Verified',
              activatedAt: new Date().toISOString().slice(0, 10),
              updatedAt: new Date().toISOString().slice(0, 10),
              remarks: `Approved by ${actor} on ${new Date().toISOString().slice(0, 10)}`,
              onboardingStage: 'Approved',
            }
          : v
      );
      publishVendors(nextVendors);
      setVendors(nextVendors);
    },
    reject(id: string, actor: string, reason: string = 'KYC criteria not met') {
      const nextVendors = getStoredVendors().map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'Suspended',
              approvalStatus: 'Rejected',
              blacklistFlag: 'Yes',
              updatedAt: new Date().toISOString().slice(0, 10),
              remarks: `Rejected by ${actor}: ${reason}`,
              onboardingStage: 'Rejected',
            }
          : v
      );
      publishVendors(nextVendors);
      setVendors(nextVendors);
    },
    add(draft: Partial<Vendor>, actor: string) {
      const newId = `VND-${String(Date.now()).slice(-4)}`;
      const nextVendor: Vendor = {
        id: newId,
        vendorCode: draft.vendorCode || `VC-${String(Date.now()).slice(-4)}`,
        legalName: draft.legalName || '',
        displayName: draft.displayName || draft.legalName || '',
        vendorType: draft.vendorType || 'Supplier',
        status: 'Pending Approval',
        approvalStatus: 'Pending',
        msmeRegistered: draft.msmeRegistered || 'No',
        msmeUdyamNo: draft.msmeUdyamNo || '',
        gstin: draft.gstin || '',
        pan: draft.pan || '',
        state: draft.state || 'Maharashtra',
        city: draft.city || 'Mumbai',
        entity: draft.entity || draft.legalName || '',
        classification: draft.classification || 'Standard',
        riskScore: draft.riskScore || 30,
        paymentTermsDays: draft.paymentTermsDays || 30,
        currency: draft.currency || 'INR',
        primaryContactName: draft.primaryContactName || '',
        primaryContactEmail: draft.primaryContactEmail || '',
        primaryContactPhone: draft.primaryContactPhone || '',
        financeContactName: draft.financeContactName || draft.primaryContactName || '',
        financeContactEmail: draft.financeContactEmail || draft.primaryContactEmail || '',
        bankName: draft.bankName || '',
        accountNumberMasked: draft.accountNumberMasked || 'XXXXXXXXXX',
        ifsc: draft.ifsc || '',
        bankBranch: draft.bankBranch || 'Main Branch',
        documentStatus: draft.documentStatus || 'Pending',
        gstCertificateStatus: draft.gstCertificateStatus || 'Pending',
        panCardStatus: draft.panCardStatus || 'Pending',
        bankProofStatus: draft.bankProofStatus || 'Pending',
        cancelledChequeStatus: draft.cancelledChequeStatus || 'Pending',
        onboardingSource: draft.onboardingSource || 'Portal',
        activatedAt: '',
        lastInvoiceDate: '',
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        createdBy: actor,
        remarks: draft.remarks || 'Onboarded via administrative panel',
        taxTreatment: draft.taxTreatment || 'Regular',
        tdsSection: draft.tdsSection || '194C',
        preferredPaymentMode: draft.preferredPaymentMode || 'NEFT',
        bankingEnabled: draft.bankingEnabled || 'Yes',
        blacklistFlag: 'No',
        kycExpiringInDays: 365,
        supportedDocCount: draft.supportedDocCount || 4,
        aadhaarMasked: draft.aadhaarMasked || '',
        aadhaarCardStatus: draft.aadhaarCardStatus || 'Pending',
        aadhaarCardFile: draft.aadhaarCardFile || '',
        panCardFile: draft.panCardFile || '',
        gstCertificateFile: draft.gstCertificateFile || '',
        cancelledChequeFile: draft.cancelledChequeFile || '',
        bankProofFile: draft.bankProofFile || '',
        bankAccountHolder: draft.bankAccountHolder || draft.legalName || '',
        addressLine1: draft.addressLine1 || '',
        pinCode: draft.pinCode || '',
        complianceOwner: draft.complianceOwner || 'Finance Head',
        vendorCategory: draft.vendorCategory || draft.vendorType || 'Supplier',
        onboardingStage: draft.onboardingStage || 'Finance Review',
      };

      const nextVendors = [nextVendor, ...getStoredVendors()];
      publishVendors(nextVendors);
      setVendors(nextVendors);
      return nextVendor;
    },
    reset() {
      window.localStorage.removeItem(vendorStorageKey);
      setVendors(getStoredVendors());
    },
  }), []);

  return { vendors, ...actions };
}
