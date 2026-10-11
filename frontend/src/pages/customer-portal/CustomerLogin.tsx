import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { API_URL } from '../../api';
import { saveCustomerSession } from './customerSession';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { t } from '@/i18n';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/customer-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      saveCustomerSession(json.data.token, json.data.user);
      navigate('/customer-portal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background bg-shell-gradient px-4 py-12 font-sans text-foreground">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex flex-col items-center gap-4">
            <Logo size="lg" showWordmark={false} />
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              {t('For customers & shippers')}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('Customer')} <span className="text-primary">{t('Portal')}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                'Track shipments, place & manage orders, download invoices and documents for your account.'
              )}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-email">{t('Email')}</Label>
              <Input
                id="customer-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder={t('you@company.com')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-password">{t('Password')}</Label>
              <Input
                id="customer-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder={t('Enter your password')}
              />
            </div>
            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              disabled={loading || !email || !password}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t('Signing in...') : t('Sign in')}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            {t('Wrong portal?')}{' '}
            <Link to="/carrier-portal/login" className="font-medium text-primary hover:underline">
              {t('Carrier sign in')}
            </Link>
            {' · '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t('Staff sign in')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
