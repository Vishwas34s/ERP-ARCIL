import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = { title: 'VMS-ACRIL', description: 'Vendor Management and AP automation platform demo' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><ToastProvider><AppShell>{children}</AppShell></ToastProvider></body></html>;
}
