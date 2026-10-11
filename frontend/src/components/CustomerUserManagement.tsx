import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, Lock, LockOpen, Plus, UserCog, Users, UserX } from 'lucide-react';

import { API_URL } from '../api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { t } from '@/i18n';

interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
}

interface CustomerUser {
  id: string;
  customerId: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  lockoutStatus?: LockoutStatus;
}

interface Props {
  customerId: string;
  customerName: string;
}

export default function CustomerUserManagement({ customerId, customerName }: Props) {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch(`${API_URL}/api/v1/customers/${customerId}/users`);
    const json = await res.json();
    setUsers(json.data || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const res = await fetch(`${API_URL}/api/v1/customers/${customerId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole }),
    });
    const json = await res.json();

    if (json.error) {
      setError(json.error);
    } else {
      setSuccess(`User ${newEmail} created successfully`);
      setShowCreate(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('viewer');
      await fetchUsers();
    }
  }

  async function handleToggleActive(user: CustomerUser) {
    const res = await fetch(`${API_URL}/api/v1/customers/${customerId}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    });
    const json = await res.json();
    if (!json.error) {
      setSuccess(`User ${user.email} ${user.active ? 'deactivated' : 'activated'}`);
      await fetchUsers();
    }
  }

  async function handleResetPassword(userId: string) {
    setError('');
    setSuccess('');

    const res = await fetch(`${API_URL}/api/v1/customers/${customerId}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: resetPassword }),
    });
    const json = await res.json();

    if (json.error) {
      setError(json.error);
    } else {
      setSuccess('Password reset successfully');
      setShowResetPassword(null);
      setResetPassword('');
      await fetchUsers();
    }
  }

  async function handleUnlock(user: CustomerUser) {
    setError('');
    setSuccess('');
    const res = await fetch(`${API_URL}/api/v1/customers/${customerId}/users/${user.id}/unlock`, {
      method: 'POST',
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
    } else {
      setSuccess(`Cleared lockout for ${user.email}`);
      await fetchUsers();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5" />
          {t('Portal users')}
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {t('Add user')}
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">{t('Loading...')}</span>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <UserX className="h-10 w-10 opacity-50" />
          <p className="max-w-md text-center text-sm">
            {t(
              'No portal users yet. Create one so the customer can log in to track shipments.'
            )}
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Email')}</TableHead>
                <TableHead>{t('Role')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Last login')}</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'muted'}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={u.active ? 'success' : 'destructive'}>
                        {u.active ? t('Active') : t('Inactive')}
                      </Badge>
                      {u.lockoutStatus?.isLocked && (
                        <Badge variant="destructive" className="gap-1">
                          <Lock className="h-3 w-3" />
                          {t('Locked')}
                        </Badge>
                      )}
                      {!u.lockoutStatus?.isLocked && (u.lockoutStatus?.failedAttempts ?? 0) > 0 && (
                        <Badge variant="warning" title={`${u.lockoutStatus?.failedAttempts} failed attempt(s) since last success`}>
                          {u.lockoutStatus?.failedAttempts} {t('failed')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : t('Never')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.lockoutStatus?.isLocked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('Unlock account')}
                          onClick={() => handleUnlock(u)}
                        >
                          <LockOpen className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={u.active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActive(u)}
                      >
                        <UserCog className={u.active ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-success'} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t('Reset password')}
                        onClick={() => {
                          setShowResetPassword(u.id);
                          setResetPassword('');
                          setError('');
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Create portal user')}</DialogTitle>
            <DialogDescription>
              {t('Create a login for')} <strong>{customerName}</strong> {t('so they can access the customer\n              portal.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">{t('Full name *')}</Label>
              <Input
                id="cust-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                placeholder={t('John Doe')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">{t('Email *')}</Label>
              <Input
                id="cust-email"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
                placeholder={t('user@customer.com')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-password">{t('Password *')}</Label>
              <Input
                id="cust-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t('Min 8 chars, upper, lower, number')}
              />
              <p className="text-xs text-muted-foreground">
                {t('Must contain uppercase, lowercase, and a number')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-role">{t('Role')}</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="cust-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t('Viewer')}</SelectItem>
                  <SelectItem value="admin">{t('Admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="gradient">{t('Create user')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetPassword !== null} onOpenChange={open => !open && setShowResetPassword(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Reset password')}</DialogTitle>
            <DialogDescription>
              {t('Set a new password for')} <strong>{users.find(u => u.id === showResetPassword)?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cust-reset">{t('New password')}</Label>
            <Input
              id="cust-reset"
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              minLength={8}
              placeholder={t('Min 8 chars, upper, lower, number')}
            />
            <p className="text-xs text-muted-foreground">
              {t('Must contain uppercase, lowercase, and a number')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(null)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="gradient"
              onClick={() => showResetPassword && handleResetPassword(showResetPassword)}
              disabled={resetPassword.length < 8}
            >
              {t('Reset password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
