import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { API_URL } from '../../api';
import { saveCarrierSession } from './carrierSession';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { t } from '@/i18n';

export default function CarrierLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/carrier-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        saveCarrierSession(json.data.token, json.data.user);
        navigate('/carrier-portal');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background bg-shell-gradient px-4 py-12 font-sans text-foreground">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex flex-col items-center gap-4">
            <Logo size="lg" showWordmark={false} />
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              {t('For carriers & brokers')}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('Carrier')} <span className="text-primary">{t('Portal')}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('View load tenders, submit bids, and track your award & bid history.')}
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
              <Label htmlFor="carrier-email">{t('Email')}</Label>
              <Input
                id="carrier-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder={t('your@email.com')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier-password">{t('Password')}</Label>
              <Input
                id="carrier-password"
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
            <Link to="/customer-portal/login" className="font-medium text-primary hover:underline">
              {t('Customer sign in')}
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
