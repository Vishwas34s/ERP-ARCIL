import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = { title: 'ProcureFlow X', description: 'Vendor Management and AP automation platform demo' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" className="scroll-smooth h-full"> <body className="antialiased selection:bg-cyan-500/30 [scrollbar-gutter:stable] overflow-hidden h-full flex flex-col"> <ToastProvider><AppShell>{children}</AppShell></ToastProvider></body></html>;
}
