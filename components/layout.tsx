'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  GitBranch,
  KeyRound,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sun,
  UsersRound,
  UserRoundCheck,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from './ui';
import { useToast } from './toast';
import { cn } from '@/lib/utils';
import { canAccess, demoUsers, findDemoUserByKey, storageKey, type DemoRoleKey, type DemoUser } from '@/lib/auth';

const themeKey = 'procureflow-theme-v2';

type NavChild = { href: string; label: string; icon?: LucideIcon };
type NavGroup = { id: string; label: string; icon: LucideIcon; children: NavChild[] };

const navGroups: NavGroup[] = [
  {
    id: 'vendors',
    label: 'Vendor master',
    icon: Building2,
    children: [
      { href: '/vendors?view=add', label: 'Create Vendor', icon: Building2 },
      { href: '/vendors?view=all', label: 'Vendor List', icon: ClipboardList },
      { href: '/vendors?view=pending', label: 'Pending Review', icon: ShieldCheck },
      { href: '/vendors?view=approved', label: 'Approved Vendors', icon: UserRoundCheck },
      { href: '/vendors?view=rejected', label: 'Rejected Vendors', icon: X },
      { href: '/vendor-approvals', label: 'Vendor Details', icon: ShieldCheck },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    children: [
      { href: '/purchase-orders', label: 'Purchase orders', icon: ClipboardList },
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/matching', label: '3-Way Matching', icon: GitBranch },
    ],
  },
  {
    id: 'approvals',
    label: 'Approvals and payment',
    icon: ListChecks,
    children: [
      { href: '/approvals', label: 'Approval queue', icon: ListChecks },
      { href: '/payments', label: 'Payment queue', icon: WalletCards },
      { href: '/payments/create', label: 'Create payment', icon: PlusCircle },
    ],
  },
  {
    id: 'control',
    label: 'Control',
    icon: ShieldCheck,
    children: [
      { href: '/audit', label: 'Audit Trail', icon: ShieldCheck },
      { href: '/users', label: 'Users', icon: UsersRound },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function hrefPath(href: string) {
  return href.split('?')[0];
}

function groupHasAccess(group: NavGroup, user: DemoUser) {
  return group.children.some((child) => canAccess(user, hrefPath(child.href)));
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
}

function ThemeButton({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
      title="Switch theme"
    >
      {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'light' ? 'Light' : 'Dark'}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [activeUser, setActiveUser] = useState<DemoUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<DemoRoleKey>(demoUsers[0].key);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vendors: true,
    documents: true,
    approvals: true,
    control: false,
  });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(themeKey);
    const nextTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);

    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const user = demoUsers.find((entry) => entry.key === saved || entry.email === saved);
      if (user) {
        setActiveUser(user);
        setSelectedRole(user.key);
      }
    }
  }, []);

  // Redirect from overview/root to invoices as the default workspace
  useEffect(() => {
    if (activeUser && pathname === '/') {
      router.push('/invoices');
    }
  }, [activeUser, pathname, router]);

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(themeKey, nextTheme);
  }

  function login(roleKey = selectedRole) {
    const user = findDemoUserByKey(roleKey);
    if (!user) {
      toast({ type: 'error', title: 'Role not found', description: 'Choose a valid role from the dropdown.' });
      return;
    }
    window.localStorage.setItem(storageKey, user.key);
    setActiveUser(user);
    setSelectedRole(user.key);
    toast({ type: 'success', title: 'Role selected', description: `Signed in as ${user.role}.` });
  }

  function logout() {
    window.localStorage.removeItem(storageKey);
    setActiveUser(null);
    toast({ type: 'info', title: 'Role switched', description: 'Choose a role to continue the walkthrough.' });
  }

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

  if (!activeUser) {
    const previewUser = findDemoUserByKey(selectedRole) ?? demoUsers[0];

    return (
      <main className="min-h-screen px-4 py-6 text-slate-100">
        <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                <KeyRound size={14} /> Role access
              </div>
              <ThemeButton theme={theme} onToggle={toggleTheme} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">VMS-ARCIL</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Choose a role and enter the AP workflow. No demo credentials are exposed on screen.
            </p>
            <div className="mt-6 grid gap-3">
              <label className="text-sm font-medium text-slate-300">
                Role
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value as DemoRoleKey)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm outline-none focus:border-cyan-400/30"
                >
                  {demoUsers.map((user) => (
                    <option key={user.key} value={user.key}>
                      {user.role}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => login()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                <UserRoundCheck size={17} /> Go to workspace
              </button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-950/45 p-5 shadow-glow">
              <Badge tone={previewUser.accent}>{previewUser.level}</Badge>
              <div className="mt-4 text-lg font-semibold text-white">{previewUser.role}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{previewUser.scope}</p>
            </div>
            {demoUsers
              .filter((user) => user.key !== previewUser.key)
              .slice(0, 5)
              .map((user) => (
                <button
                  key={user.key}
                  onClick={() => {
                    setSelectedRole(user.key);
                    login(user.key);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950/45 p-5 text-left shadow-glow transition hover:border-cyan-400/25 hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{user.role}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{user.level}</div>
                    </div>
                    <Badge tone={user.accent}>{user.level}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{user.title}</p>
                </button>
              ))}
          </section>
        </div>
      </main>
    );
  }

  const allowedChildren = canAccess(activeUser, pathname) ? (
    children
  ) : (
    <section className="rounded-lg border border-white/10 bg-white/5 p-8 shadow-glow">
      <Badge tone={activeUser.accent}>{activeUser.role}</Badge>
      <h1 className="mt-4 text-2xl font-semibold text-white">This page is not in this role workspace.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
        This role only has the pages needed for its approval or payment responsibility.
      </p>
    </section>
  );

  return (
    <div className="min-h-screen text-slate-100 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto w-full max-w-[1680px] lg:h-screen">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-3 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-300 via-cyan-300 to-emerald-300 text-slate-950 font-black">PX</div>
<div>
                  <div className="text-sm font-semibold text-white">VMS-ARCIL</div>
                  <div className="text-xs text-slate-400">{activeUser.role}</div>
                </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeButton theme={theme} onToggle={toggleTheme} />
            <button onClick={() => setMenuOpen((current) => !current)} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200">
              <span className="sr-only">Toggle navigation</span>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && <div className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />}
        <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:min-h-0 lg:grid-cols-[280px_1fr]">
          <aside
            className={cn(
              'border-b border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4',
              menuOpen
                ? 'fixed inset-y-0 left-0 z-30 w-[calc(100%-1rem)] max-w-sm border-r border-white/10 bg-slate-950/95 shadow-2xl lg:relative lg:w-auto lg:max-w-full'
                : 'hidden lg:block',
            )}
          >
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-glow">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-300 via-cyan-300 to-emerald-300 text-slate-950 font-black">PX</div>
<div>
                  <div className="text-base font-semibold">VMS-ARCIL</div>
                  <div className="text-xs text-slate-400">Vendor AP automation</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={activeUser.accent}>{activeUser.level}</Badge>
                <Badge tone="emerald">Live workspace</Badge>
              </div>
            </div>

            <nav className="mt-4 space-y-3">
              {navGroups.filter((group) => groupHasAccess(group, activeUser)).map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups[group.id] ?? true;

                return (
                  <div key={group.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <button
                      type="button"
                      onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !isOpen }))}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      <span className="flex items-center gap-2">
                        <GroupIcon size={15} />
                        {group.label}
                      </span>
                      <ChevronDown size={15} className={cn('transition', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <div className="mt-1 space-y-1">
                        {group.children.filter((child) => canAccess(activeUser, hrefPath(child.href))).map((child) => {
                          const childPath = hrefPath(child.href);
                          const active = pathname === childPath || (childPath !== '/' && childPath !== '/payments' && pathname.startsWith(`${childPath}/`));
                          const Icon = child.icon;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                                active ? `${accentClass} ring-1` : 'text-slate-300 hover:bg-white/5 hover:text-white',
                              )}
                            >
                              {Icon ? <Icon size={17} /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

<div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Signed in as</div>
                  <div className="mt-2 text-base font-semibold">{activeUser.name}</div>
                </div>
                <Badge tone={activeUser.accent}>{activeUser.level}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-300">{activeUser.role}</div>
              <div className="mt-2 text-xs leading-5 text-slate-400">{activeUser.scope}</div>
              <div className="mt-4 flex gap-2">
                <ThemeButton theme={theme} onToggle={toggleTheme} />
                <button onClick={logout} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10">
                  <LogOut size={16} /> Switch
                </button>
              </div>
            </div>
          </aside>

          <main className="w-full px-3 py-4 sm:px-4 lg:h-screen lg:overflow-y-auto lg:px-6" onClick={() => setMenuOpen(false)}>
            {allowedChildren}
          </main>
        </div>
      </div>
    </div>
  );
}
