'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Badge, MetricCard, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useDemoUser } from '@/lib/auth';
import {
  newManagedUserDraft,
  roleDefaults,
  useManagedUsers,
  type ManagedUser,
  type ManagedUserAccess,
  type ManagedUserDraft,
  type ManagedUserRole,
  type ManagedUserStatus,
  type YesNo,
} from '@/lib/user-store';
import { money } from '@/lib/utils';
import { Filter, RefreshCw, Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';

const roleOptions: ManagedUserRole[] = ['User', 'L1', 'L2', 'L3', 'Finance Head'];
const statusOptions: ManagedUserStatus[] = ['Active', 'Pending', 'Inactive', 'Locked'];
const yesNoOptions: YesNo[] = ['Yes', 'No'];
const accessOptions: ManagedUserAccess[] = ['Standard', 'Approver', 'Finance', 'Administrator'];

function roleTone(role: ManagedUserRole) {
  if (role === 'Admin' || role === 'Finance Head') return 'emerald' as const;
  if (role === 'L1') return 'cyan' as const;
  if (role === 'L2') return 'violet' as const;
  if (role === 'L3') return 'amber' as const;
  return 'slate' as const;
}

function statusTone(status: ManagedUserStatus) {
  if (status === 'Active') return 'emerald' as const;
  if (status === 'Pending') return 'amber' as const;
  if (status === 'Locked') return 'rose' as const;
  return 'slate' as const;
}

function displayLimit(value: number) {
  if (value >= 999999999) return 'Unlimited';
  if (!value) return 'No approval';
  return money(value);
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400/30"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm outline-none focus:border-cyan-400/30">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function matchesUser(user: ManagedUser, query: string) {
  if (!query.trim()) return true;
  return JSON.stringify(user).toLowerCase().includes(query.trim().toLowerCase());
}

export default function UsersPage() {
  const currentUser = useDemoUser();
  const toast = useToast();
  const { users, add, reset } = useManagedUsers();
  const [draft, setDraft] = useState<ManagedUserDraft>(() => newManagedUserDraft());
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<ManagedUserRole | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<ManagedUserStatus | 'All'>('All');

  const stats = useMemo(() => ({
    total: users.length,
    approvers: users.filter((user) => ['L1', 'L2', 'L3'].includes(user.role)).length,
    finance: users.filter((user) => user.role === 'Finance Head').length,
    active: users.filter((user) => user.status === 'Active').length,
  }), [users]);

  const filteredUsers = useMemo(() => users.filter((entry) => {
    const byRole = roleFilter === 'All' || entry.role === roleFilter;
    const byStatus = statusFilter === 'All' || entry.status === statusFilter;
    return byRole && byStatus && matchesUser(entry, query);
  }), [users, roleFilter, statusFilter, query]);

  function patchDraft(patch: Partial<ManagedUserDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function changeRole(role: ManagedUserRole) {
    patchDraft({
      role,
      designation: role === 'User' ? 'AP Executive' : role === 'Finance Head' ? 'Finance Head' : `${role} Approver`,
      department: role === 'Finance Head' ? 'Finance' : role === 'User' ? 'Accounts Payable' : 'Approval Desk',
      ...roleDefaults(role),
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (currentUser.key !== 'admin') {
      toast({ type: 'error', title: 'Admin only', description: 'Only Admin can add users to this directory.' });
      return;
    }

    const created = add(draft, currentUser.role);
    setDraft(newManagedUserDraft());
    toast({ type: 'success', title: 'User added', description: `${created.fullName} was added as ${created.role}.` });
  }

  return (
    <div className="space-y-5">
      <Panel title="Admin user management" subtitle="Create users for AP work, L1/L2/L3 approval routing, and Finance Head payment or vendor approval access.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="All users" value={stats.total} icon={<UsersRound size={18} />} tone="cyan" />
          <MetricCard label="Approvers" value={stats.approvers} icon={<ShieldCheck size={18} />} tone="violet" />
          <MetricCard label="Finance heads" value={stats.finance} icon={<ShieldCheck size={18} />} tone="emerald" />
          <MetricCard label="Active accounts" value={stats.active} icon={<UsersRound size={18} />} tone="amber" />
        </div>
      </Panel>

      <Panel title="Add user" subtitle="Admin can add a User, L1, L2, L3, or Finance Head profile with access flags, reporting details, approval limit, and comments.">
        {currentUser.key !== 'admin' && <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">Switch to Admin to create user records.</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <TextField label="Employee ID" value={draft.employeeId} onChange={(value) => patchDraft({ employeeId: value })} />
            <TextField label="Full name" value={draft.fullName} onChange={(value) => patchDraft({ fullName: value })} />
            <TextField label="Email" type="email" value={draft.email} onChange={(value) => patchDraft({ email: value })} />
            <TextField label="Phone" value={draft.phone} onChange={(value) => patchDraft({ phone: value })} />
            <TextField label="Alternate phone" required={false} value={draft.alternatePhone} onChange={(value) => patchDraft({ alternatePhone: value })} />
            <SelectField label="Role" value={draft.role} options={roleOptions} onChange={changeRole} />
            <TextField label="Designation" value={draft.designation} onChange={(value) => patchDraft({ designation: value })} />
            <TextField label="Department" value={draft.department} onChange={(value) => patchDraft({ department: value })} />
            <TextField label="Manager" value={draft.manager} onChange={(value) => patchDraft({ manager: value })} />
            <TextField label="Approval limit" type="number" value={draft.approvalLimit} onChange={(value) => patchDraft({ approvalLimit: Number(value) || 0 })} />
            <TextField label="Entity" value={draft.entity} onChange={(value) => patchDraft({ entity: value })} />
            <TextField label="Branch" value={draft.branch} onChange={(value) => patchDraft({ branch: value })} />
            <TextField label="Region" value={draft.region} onChange={(value) => patchDraft({ region: value })} />
            <TextField label="Cost center" value={draft.costCenter} onChange={(value) => patchDraft({ costCenter: value })} />
            <SelectField label="Status" value={draft.status} options={statusOptions} onChange={(value) => patchDraft({ status: value })} />
            <SelectField label="Access level" value={draft.accessLevel} options={accessOptions} onChange={(value) => patchDraft({ accessLevel: value })} />
            <SelectField label="Vendor approval" value={draft.vendorApprovalAccess} options={yesNoOptions} onChange={(value) => patchDraft({ vendorApprovalAccess: value })} />
            <SelectField label="Invoice access" value={draft.invoiceAccess} options={yesNoOptions} onChange={(value) => patchDraft({ invoiceAccess: value })} />
            <SelectField label="PO access" value={draft.poAccess} options={yesNoOptions} onChange={(value) => patchDraft({ poAccess: value })} />
            <SelectField label="Approval access" value={draft.approvalAccess} options={yesNoOptions} onChange={(value) => patchDraft({ approvalAccess: value })} />
            <SelectField label="Payment access" value={draft.paymentAccess} options={yesNoOptions} onChange={(value) => patchDraft({ paymentAccess: value })} />
            <SelectField label="Audit access" value={draft.auditAccess} options={yesNoOptions} onChange={(value) => patchDraft({ auditAccess: value })} />
            <SelectField label="Vendor approval" value={draft.financeApprovalAccess} options={yesNoOptions} onChange={(value) => patchDraft({ financeApprovalAccess: value })} />
            <SelectField label="2FA enabled" value={draft.twoFactorEnabled} options={yesNoOptions} onChange={(value) => patchDraft({ twoFactorEnabled: value })} />
            <TextField label="Shift" value={draft.shift} onChange={(value) => patchDraft({ shift: value })} />
            <TextField label="Timezone" value={draft.timezone} onChange={(value) => patchDraft({ timezone: value })} />
            <TextField label="Device trust" value={draft.deviceTrust} onChange={(value) => patchDraft({ deviceTrust: value })} />
            <TextField label="IP restriction" value={draft.ipRestriction} onChange={(value) => patchDraft({ ipRestriction: value })} />
          </div>

          <label className="block text-sm text-slate-300">
            Comments
            <textarea
              value={draft.comments}
              onChange={(event) => patchDraft({ comments: event.target.value })}
              className="mt-2 min-h-[86px] w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm outline-none focus:border-cyan-400/30"
              placeholder="Role notes, approval context, temporary access, or onboarding comments"
            />
          </label>

          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
            <UserPlus size={16} /> Add user
          </button>
        </form>
      </Panel>

      <Panel
        title={`All users (${filteredUsers.length})`}
        subtitle="Full user directory table with more than 20 fields, comments, search, role filter, and status filter."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search user, role, email, department..."
                className="w-72 rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400/30"
              />
            </div>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as ManagedUserRole | 'All')} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {(['All', 'Admin', ...roleOptions] as Array<ManagedUserRole | 'All'>).map((role) => <option key={role}>{role}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ManagedUserStatus | 'All')} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm outline-none">
              {(['All', ...statusOptions] as Array<ManagedUserStatus | 'All'>).map((status) => <option key={status}>{status}</option>)}
            </select>
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"><RefreshCw size={14} />Reset</button>
          </div>
        }
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-xs text-slate-400">
          <Filter size={14} /> Showing a 28-column user register. Scroll horizontally to inspect every field.
        </div>
        <div className="overflow-auto">
          <table className="min-w-[2380px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                {['User', 'Employee ID', 'Email', 'Phone', 'Alt phone', 'Role', 'Designation', 'Department', 'Manager', 'Approval limit', 'Entity', 'Branch', 'Region', 'Cost center', 'Status', 'Access level', 'Vendor approval', 'Invoice', 'PO', 'Approval', 'Payment', 'Audit', 'Vendor approval', '2FA', 'Last login', 'Created / updated', 'Device / IP', 'Comments'].map((heading) => (
                  <th key={heading} className="border-b border-white/10 px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((entry) => (
                <tr key={entry.id} className="transition hover:bg-white/[0.03]">
                  <td className="border-b border-white/5 px-3 py-4 font-semibold text-white">{entry.fullName}<div className="text-xs font-normal text-slate-500">{entry.id}</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.employeeId}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.email}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.phone}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.alternatePhone || 'N/A'}</td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={roleTone(entry.role)}>{entry.role}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.designation}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.department}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.manager}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{displayLimit(entry.approvalLimit)}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.entity}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.branch}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.region}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.costCenter}</td>
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={statusTone(entry.status)}>{entry.status}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.accessLevel}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.vendorApprovalAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.invoiceAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.poAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.approvalAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.paymentAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.auditAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.financeApprovalAccess}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.twoFactorEnabled}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.lastLogin}</td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.createdBy}<div className="text-xs text-slate-500">{entry.createdAt} / {entry.updatedAt}</div></td>
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">{entry.deviceTrust}<div className="text-xs text-slate-500">{entry.ipRestriction}</div></td>
                  <td className="max-w-[360px] border-b border-white/5 px-3 py-4 text-slate-300">{entry.comments || 'No comments'}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={28} className="px-3 py-10 text-center text-slate-500">No users match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
