'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoUsers } from './auth';

export type ManagedUserRole = 'Admin' | 'User' | 'L1' | 'L2' | 'L3' | 'Finance Head';
export type ManagedUserStatus = 'Active' | 'Pending' | 'Inactive' | 'Locked';
export type ManagedUserAccess = 'Standard' | 'Approver' | 'Finance' | 'Administrator';
export type YesNo = 'Yes' | 'No';

export type ManagedUser = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  role: ManagedUserRole;
  designation: string;
  department: string;
  manager: string;
  approvalLimit: number;
  entity: string;
  branch: string;
  region: string;
  costCenter: string;
  status: ManagedUserStatus;
  accessLevel: ManagedUserAccess;
  vendorApprovalAccess: YesNo;
  invoiceAccess: YesNo;
  poAccess: YesNo;
  approvalAccess: YesNo;
  paymentAccess: YesNo;
  auditAccess: YesNo;
  financeApprovalAccess: YesNo;
  twoFactorEnabled: YesNo;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  shift: string;
  timezone: string;
  deviceTrust: string;
  ipRestriction: string;
  comments: string;
};

export type ManagedUserDraft = Omit<ManagedUser, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'createdBy'> & {
  lastLogin?: string;
};

export const userDirectoryKey = 'procureflow-managed-users';

const today = () => new Date().toISOString().slice(0, 10);

export function roleDefaults(role: ManagedUserRole) {
  if (role === 'Admin') {
    return {
      approvalLimit: 999999999,
      accessLevel: 'Administrator' as ManagedUserAccess,
      vendorApprovalAccess: 'Yes' as YesNo,
      invoiceAccess: 'Yes' as YesNo,
      poAccess: 'Yes' as YesNo,
      approvalAccess: 'Yes' as YesNo,
      paymentAccess: 'Yes' as YesNo,
      auditAccess: 'Yes' as YesNo,
      financeApprovalAccess: 'Yes' as YesNo,
    };
  }

  if (role === 'Finance Head') {
    return {
      approvalLimit: 999999999,
      accessLevel: 'Finance' as ManagedUserAccess,
      vendorApprovalAccess: 'Yes' as YesNo,
      invoiceAccess: 'Yes' as YesNo,
      poAccess: 'No' as YesNo,
      approvalAccess: 'No' as YesNo,
      paymentAccess: 'Yes' as YesNo,
      auditAccess: 'Yes' as YesNo,
      financeApprovalAccess: 'Yes' as YesNo,
    };
  }

  if (role === 'L1' || role === 'L2' || role === 'L3') {
    return {
      approvalLimit: role === 'L1' ? 10000 : role === 'L2' ? 100000 : 999999999,
      accessLevel: 'Approver' as ManagedUserAccess,
      vendorApprovalAccess: 'No' as YesNo,
      invoiceAccess: 'Yes' as YesNo,
      poAccess: 'No' as YesNo,
      approvalAccess: 'Yes' as YesNo,
      paymentAccess: 'No' as YesNo,
      auditAccess: 'No' as YesNo,
      financeApprovalAccess: 'No' as YesNo,
    };
  }

  return {
    approvalLimit: 0,
    accessLevel: 'Standard' as ManagedUserAccess,
    vendorApprovalAccess: 'No' as YesNo,
    invoiceAccess: 'Yes' as YesNo,
    poAccess: 'Yes' as YesNo,
    approvalAccess: 'No' as YesNo,
    paymentAccess: 'No' as YesNo,
    auditAccess: 'No' as YesNo,
    financeApprovalAccess: 'No' as YesNo,
  };
}

function roleFromDemo(level: string): ManagedUserRole {
  if (level === 'Admin') return 'Admin';
  if (level === 'Finance') return 'Finance Head';
  if (level === 'L1' || level === 'L2' || level === 'L3') return level;
  return 'User';
}

export const seedManagedUsers: ManagedUser[] = [
  ...demoUsers.map((user, index) => {
    const role = roleFromDemo(user.level);
    const defaults = roleDefaults(role);
    return {
      id: `USR-SEED-${index + 1}`,
      employeeId: `EMP-${String(index + 1).padStart(4, '0')}`,
      fullName: user.name,
      email: user.email,
      phone: index === 0 ? '+91 98765 10000' : `+91 98765 10${String(index + 1).padStart(3, '0')}`,
      alternatePhone: `+91 91234 50${String(index + 1).padStart(3, '0')}`,
      role,
      designation: user.role,
      department: role === 'Finance Head' ? 'Finance' : role === 'Admin' ? 'Operations Control' : 'Accounts Payable',
      manager: role === 'Admin' ? 'Board Office' : 'Admin Control',
      entity: 'ProcureFlow Demo Pvt Ltd',
      branch: index % 2 === 0 ? 'Mumbai HQ' : 'Pune Shared Services',
      region: index % 2 === 0 ? 'West' : 'South',
      costCenter: role === 'Finance Head' ? 'CC-FIN-001' : role === 'Admin' ? 'CC-ADM-001' : 'CC-AP-001',
      status: 'Active' as ManagedUserStatus,
      twoFactorEnabled: 'Yes' as YesNo,
      lastLogin: `2026-05-${String(18 - index).padStart(2, '0')}`,
      createdAt: '2026-05-01',
      updatedAt: '2026-05-13',
      createdBy: 'System seed',
      shift: '09:30 - 18:30',
      timezone: 'Asia/Kolkata',
      deviceTrust: 'Managed laptop',
      ipRestriction: 'Office/VPN',
      comments: user.scope,
      ...defaults,
    };
  }),
  {
    id: 'USR-SEED-6',
    employeeId: 'EMP-0006',
    fullName: 'Kavya Iyer',
    email: 'ap.user@procureflow.test',
    phone: '+91 98765 10606',
    alternatePhone: '+91 91234 50606',
    role: 'User',
    designation: 'AP Executive',
    department: 'Accounts Payable',
    manager: 'Ananya Rao',
    approvalLimit: 0,
    entity: 'ProcureFlow Demo Pvt Ltd',
    branch: 'Bengaluru AP Hub',
    region: 'South',
    costCenter: 'CC-AP-002',
    status: 'Active',
    accessLevel: 'Standard',
    vendorApprovalAccess: 'No',
    invoiceAccess: 'Yes',
    poAccess: 'Yes',
    approvalAccess: 'No',
    paymentAccess: 'No',
    auditAccess: 'No',
    financeApprovalAccess: 'No',
    twoFactorEnabled: 'Yes',
    lastLogin: '2026-05-18',
    createdAt: '2026-05-03',
    updatedAt: '2026-05-13',
    createdBy: 'Admin Control',
    shift: '10:00 - 19:00',
    timezone: 'Asia/Kolkata',
    deviceTrust: 'Managed laptop',
    ipRestriction: 'Office/VPN',
    comments: 'Standard AP user for invoice intake, PO review, and vendor data preparation.',
  },
];

function readUsers() {
  if (typeof window === 'undefined') return seedManagedUsers;
  const saved = window.localStorage.getItem(userDirectoryKey);
  if (!saved) return seedManagedUsers;
  try {
    return JSON.parse(saved) as ManagedUser[];
  } catch {
    return seedManagedUsers;
  }
}

function publish(users: ManagedUser[]) {
  window.localStorage.setItem(userDirectoryKey, JSON.stringify(users));
  window.dispatchEvent(new Event('procureflow-users-updated'));
}

export function newManagedUserDraft(): ManagedUserDraft {
  const defaults = roleDefaults('User');
  return {
    employeeId: `EMP-${String(Date.now()).slice(-4)}`,
    fullName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    role: 'User',
    designation: 'AP Executive',
    department: 'Accounts Payable',
    manager: 'Finance Head',
    entity: 'ProcureFlow Demo Pvt Ltd',
    branch: 'Mumbai HQ',
    region: 'West',
    costCenter: 'CC-AP-001',
    status: 'Pending',
    twoFactorEnabled: 'Yes',
    shift: '09:30 - 18:30',
    timezone: 'Asia/Kolkata',
    deviceTrust: 'Pending device enrollment',
    ipRestriction: 'Office/VPN',
    comments: '',
    ...defaults,
  };
}

export function useManagedUsers() {
  const [users, setUsers] = useState<ManagedUser[]>(seedManagedUsers);

  useEffect(() => {
    const sync = () => setUsers(readUsers());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('procureflow-users-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('procureflow-users-updated', sync);
    };
  }, []);

  const actions = useMemo(
    () => ({
      add(draft: ManagedUserDraft, actor: string) {
        const nextUser: ManagedUser = {
          ...draft,
          id: `USR-${String(Date.now()).slice(-6)}`,
          employeeId: draft.employeeId || `EMP-${String(Date.now()).slice(-4)}`,
          lastLogin: draft.lastLogin || 'Never',
          createdAt: today(),
          updatedAt: today(),
          createdBy: actor,
        };
        const nextUsers = [nextUser, ...readUsers()];
        publish(nextUsers);
        setUsers(nextUsers);
        return nextUser;
      },
      update(id: string, patch: Partial<ManagedUser>) {
        const nextUsers = readUsers().map((user) => (user.id === id ? { ...user, ...patch, updatedAt: today() } : user));
        publish(nextUsers);
        setUsers(nextUsers);
      },
      reset() {
        publish(seedManagedUsers);
        setUsers(seedManagedUsers);
      },
    }),
    [],
  );

  return { users, ...actions };
}
