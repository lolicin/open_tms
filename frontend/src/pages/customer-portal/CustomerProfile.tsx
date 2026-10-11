import React, { useState } from 'react';

import { API_URL } from '../../api';
import { customerFetch, getCustomerUser } from './CustomerDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { t } from '@/i18n';

export default function CustomerProfile() {
  const user = getCustomerUser();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPw !== confirmPw) { setMessage({ text: 'Passwords do not match', type: 'error' }); return; }
    setSaving(true);
    try {
      const res = await customerFetch(`${API_URL}/api/v1/customer-portal/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMessage({ text: 'Password changed successfully', type: 'success' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('Profile')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('Account information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">{t('Name')}</div>
              <div className="font-semibold">{user.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('Email')}</div>
              <div className="font-semibold">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('Company')}</div>
              <div className="font-semibold">{user.customerName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('Role')}</div>
              <div className="font-semibold">{user.role}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Change password')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            {message && (
              <div
                className={cn(
                  'rounded-md border px-3 py-2 text-sm',
                  message.type === 'success'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive',
                )}
              >
                {message.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-pw">{t('Current password')}</Label>
              <Input id="current-pw" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">{t('New password')}</Label>
              <Input id="new-pw" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required />
              <div className="text-xs text-muted-foreground">{t('8+ characters, uppercase, lowercase, number')}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">{t('Confirm new password')}</Label>
              <Input id="confirm-pw" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
            </div>
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? t('Changing...') : t('Change password')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
