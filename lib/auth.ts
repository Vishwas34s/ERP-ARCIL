'use client';
import { useEffect, useState } from 'react';

export type DemoRoleKey = 'admin' | 'finance' | 'l1' | 'l2' | 'l3';

export type DemoUser = {
  key: DemoRoleKey;
  name: string;
  email: string;
  password: string;
  role: string;
  level: string;
  title: string;
  scope: string;
  nav: string[];
  accent: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
};

export const demoUsers: DemoUser[] = [
  {
    key: 'admin',
    name: 'Admin Control',
    email: 'admin@procureflow.test',
    password: 'Admin@2026',
    role: 'Admin',
    level: 'Admin',
    title: 'Full P2P operations owner',
    scope: 'Can see all operational data, monitor every phase, execute payments, and complete post-payment processing.',
    nav: ['/vendors', '/vendor-approvals', '/purchase-orders', '/invoices', '/matching', '/approvals', '/payments', '/audit', '/users', '/settings'],
    accent: 'emerald',
  },
  {
    key: 'finance',
    name: 'Ananya Rao',
    email: 'finance.head@procureflow.test',
    password: 'Finance@2026',
    role: 'Finance Head',
    level: 'Finance',
    title: 'Vendor approvals and payment creation only',
    scope: 'Can approve vendor onboarding and create payments only after L1, L2, or L3 approval.',
    nav: ['/vendor-approvals', '/payments'],
    accent: 'emerald',
  },
  {
    key: 'l1',
    name: 'Rohan Shah',
    email: 'l1@procureflow.test',
    password: 'L1@2026',
    role: 'L1 - Team Lead',
    level: 'L1',
    title: 'Approves invoices up to INR 10,000',
    scope: 'Can approve, reject, or hold invoices routed to L1 only.',
    nav: ['/', '/approvals'],
    accent: 'cyan',
  },
  {
    key: 'l2',
    name: 'Priya Verma',
    email: 'l2@procureflow.test',
    password: 'L2@2026',
    role: 'L2 - Account Manager',
    level: 'L2',
    title: 'Approves invoices from INR 10,001 to INR 1,00,000',
    scope: 'Can approve, reject, or hold invoices routed to L2 only.',
    nav: ['/', '/approvals'],
    accent: 'violet',
  },
  {
    key: 'l3',
    name: 'Meera Nair',
    email: 'l3@procureflow.test',
    password: 'L3@2026',
    role: 'L3 - Senior Approver',
    level: 'L3',
    title: 'Approves invoices above INR 1,00,000',
    scope: 'Can approve, reject, or hold high-value invoices routed to L3 only.',
    nav: ['/', '/approvals'],
    accent: 'amber',
  },
];

export const defaultDemoUser = demoUsers[0];
export const storageKey = 'procureflow-demo-user';

export function findDemoUser(email: string, password: string) {
  return demoUsers.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password.trim(),
  );
}

export function findDemoUserByKey(key: DemoRoleKey | string) {
  return demoUsers.find((user) => user.key === key);
}

export function canAccess(user: DemoUser, path: string) {
  return user.nav.some((entry) => entry === path || (entry !== '/' && path.startsWith(`${entry}/`)));
}

export function useDemoUser() {
  const [user, setUser] = useState<DemoUser>(defaultDemoUser);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const nextUser = demoUsers.find((entry) => entry.key === saved || entry.email === saved);
    if (nextUser) setUser(nextUser);
  }, []);

  return user;
}
