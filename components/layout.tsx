'use client';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from './ui';
import { useToast } from './toast';
import { BarChart3, Building2, ClipboardList, FileText, GitBranch, ListChecks, Settings, WalletCards, ShieldCheck, LogOut, KeyRound, UserRoundCheck, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccess, demoUsers, findDemoUser, storageKey, type DemoUser } from '@/lib/auth';
const nav = [
  { href: '/', label: 'Overview', icon: BarChart3 },
  { href: '/vendors', label: 'Vendors', icon: Building2 },
  { href: '/purchase-orders', label: 'Purchase Order', icon: ClipboardList },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/matching', label: '3-Way Match', icon: GitBranch },
  { href: '/approvals', label: 'Approvals', icon: ListChecks },
  { href: '/payments', label: 'Payments', icon: WalletCards },
  { href: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();
  const [activeUser, setActiveUser] = useState<DemoUser | null>(null);
  const [email, setEmail] = useState(demoUsers[0].email);
  const [password, setPassword] = useState(demoUsers[0].password);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const accentClass = useMemo(() => {
    const tone = activeUser?.accent ?? 'cyan';
    return {
      cyan: 'bg-cyan-400/15 text-cyan-300 ring-cyan-400/20',
      emerald: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/20',
      amber: 'bg-amber-400/15 text-amber-300 ring-amber-400/20',
      rose: 'bg-rose-400/15 text-rose-300 ring-rose-400/20',
      violet: 'bg-violet-400/15 text-violet-300 ring-violet-400/20',
      slate: 'bg-slate-400/15 text-slate-200 ring-slate-400/20',
    }[tone];
  }, [activeUser]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const user = demoUsers.find((entry) => entry.email === saved);
      if (user) setActiveUser(user);
    }
  }, []);

  function login(nextEmail = email, nextPassword = password) {
    const user = findDemoUser(nextEmail, nextPassword);
    if (!user) {
      setError('Use one of the demo credentials shown below.');
      toast({ type: 'error', title: 'Login failed', description: 'Use one of the demo credentials shown below.' });
      return;
    }
    window.localStorage.setItem(storageKey, user.email);
    setActiveUser(user);
    setError('');
    toast({ type: 'success', title: 'Login successful', description: `Signed in as ${user.role}.` });
  }

  function logout() {
    window.localStorage.removeItem(storageKey);
    setActiveUser(null);
    toast({ type: 'info', title: 'Logged out', description: 'Choose another role to continue the walkthrough.' });
  }

  if (!activeUser) {
    return <main className="min-h-screen px-4 py-6 text-slate-100"><div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]"><section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300"><KeyRound size={14} /> Demo login</div><h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">ProcureFlow X</h1><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Sign in as a real AP persona. Each role changes the active authority, approval context, and sidebar profile so client walkthroughs feel closer to an enterprise P2P system.</p><div className="mt-6 space-y-3"><input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-cyan-400/30" placeholder="Email" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-cyan-400/30" placeholder="Password" /><button onClick={() => login()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"><UserRoundCheck size={17} /> Sign in</button>{error && <div className="text-sm text-rose-300">{error}</div>}</div></section><section className="grid gap-3 md:grid-cols-2">{demoUsers.map((user) => <button key={user.email} onClick={() => { setEmail(user.email); setPassword(user.password); login(user.email, user.password); }} className="min-h-[178px] rounded-3xl border border-white/10 bg-slate-950/45 p-5 text-left shadow-glow transition hover:border-cyan-400/25 hover:bg-white/5"><div className="flex items-start justify-between gap-3"><div><div className="text-base font-semibold text-white">{user.role}</div><div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{user.level} authority</div></div><Badge tone={user.accent}>{user.level}</Badge></div><p className="mt-3 text-sm text-slate-300">{user.title}</p><div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 font-mono text-[11px] leading-5 text-slate-400"><div>{user.email}</div><div>{user.password}</div></div></button>)}</section></div></main>;
  }

  const allowedChildren = canAccess(activeUser, pathname) ? children : <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-glow"><Badge tone={activeUser.accent}>{activeUser.role}</Badge><h1 className="mt-4 text-2xl font-semibold text-white">This page is not needed for this role.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Only Admin sees all pages. Approvers see their approval workbench. Vendor sees PO, GRN, and invoice submission screens.</p></section>;

  return <div className="min-h-screen text-slate-100"><div className="mx-auto w-full max-w-[1600px]"><div className="flex items-center justify-between border-b border-white/10 bg-slate-950/75 px-3 py-3 backdrop-blur-xl lg:hidden"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 font-black">AP</div><div><div className="text-base font-semibold text-white">ProcureFlow X</div><div className="text-xs text-slate-400">Role-based P2P Demo</div></div></div><button onClick={() => setMenuOpen((current) => !current)} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200"><span className="sr-only">Toggle navigation</span>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>{menuOpen && <div className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />}
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
      <aside className={cn('border-b border-white/10 bg-slate-950/65 p-3 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-4 lg:translate-x-0 lg:shadow-none transition-transform duration-300 ease-out', menuOpen ? 'fixed inset-y-0 left-0 z-30 w-[calc(100%-1rem)] max-w-xs border-r border-white/10 bg-slate-950/95 shadow-2xl lg:relative lg:w-auto lg:max-w-full' : 'hidden lg:block')}>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-glow"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 font-black">AP</div><div><div className="text-base font-semibold sm:text-lg">ProcureFlow X</div><div className="text-xs text-slate-400">Role-based P2P Demo</div></div></div><div className="mt-4 flex flex-wrap gap-2"><Badge tone={activeUser.accent}>{activeUser.level}</Badge><Badge tone="emerald">Shared Data</Badge></div></div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:mt-4 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">{nav.filter((item) => activeUser.nav.includes(item.href)).map((item) => { const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition lg:gap-3 lg:px-4 lg:py-3', active ? `${accentClass} ring-1` : 'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon size={18} />{item.label}</Link>; })}</nav>
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 lg:mt-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Signed in as</div><div className="mt-2 text-base font-semibold sm:text-lg">{activeUser.name}</div></div><Badge tone={activeUser.accent}>{activeUser.level}</Badge></div><div className="mt-1 text-sm text-slate-300">{activeUser.role}</div><div className="mt-2 text-sm leading-6 text-slate-400">{activeUser.scope}</div><button onClick={logout} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"><LogOut size={16} /> Switch role</button></div>
      </aside>
      <main className="w-full px-3 py-4 sm:px-4 lg:px-6" onClick={() => setMenuOpen(false)}>{allowedChildren}</main>
    </div>
  </div></div>;
}
