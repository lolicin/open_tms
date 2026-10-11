import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  DollarSign,
  Loader2,
  Pencil,
  Rocket,
  TrendingUp,
  Truck,
} from 'lucide-react';

import { API_URL } from '../api';
import { useOrgContext } from '../hooks/useOrgContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { t } from '@/i18n';

interface QuoteLineItem {
  id: string;
  chargeType: string;
  description: string;
  amountCents: number;
  quantity: number;
  accessorialCode?: string;
  freightClass?: string;
  ratePerCwt?: number;
}

interface QuoteData {
  id: string;
  quoteNumber: string;
  version: number;
  status: string;
  customer: { id: string; name: string };
  parentQuote?: { id: string; quoteNumber: string; version: number } | null;
  revisions?: { id: string; quoteNumber: string; version: number; status: string }[];
  serviceLevel: string;
  equipmentType?: string;
  totalRevenueCents: number;
  totalCostCents: number;
  marginCents: number;
  marginPercent: string;
  currency: string;
  validFrom: string;
  validUntil: string;
  orderId?: string;
  notes?: string;
  lineItems: QuoteLineItem[];
  createdAt: string;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(d?: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'muted';

function statusVariant(s: string): BadgeVariant {
  const m: Record<string, BadgeVariant> = {
    draft: 'secondary',
    sent: 'info',
    accepted: 'success',
    declined: 'destructive',
    expired: 'warning',
    superseded: 'secondary',
  };
  return m[s] || 'secondary';
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/15 text-warning',
  success: 'bg-success/15 text-success',
} as const;

export default function VNextFinanceQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const { isBroker } = useOrgContext();

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/quotes/${id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setQuote(json.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string, body?: any) => {
    setActionLoading(action);
    try {
      const res = await fetch(`${API_URL}/api/v1/quotes/${id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (action === 'accept' && json.data?.shipmentId) {
        navigate(`/shipments/${json.data.shipmentId}`);
        return;
      }
      if (action === 'accept' && json.data?.orderId) {
        navigate(`/orders/${json.data.orderId}`);
        return;
      }
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(''); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <h3 className="text-lg font-medium">{t('Loading...')}</h3>
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <CircleAlert className="h-5 w-5" />
        {error || t('Not found')}
      </div>
    );
  }

  const q = quote;
  const isExpired = new Date(q.validUntil) < new Date() && !['accepted', 'expired', 'superseded'].includes(q.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/finance/quotes')}>
          <ArrowLeft className="h-4 w-4" /> {t('Quotes')}
        </Button>
        <span className="text-muted-foreground">/ {q.quoteNumber}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{q.quoteNumber}</h1>
          <div className="mt-2 flex items-center gap-2">
            {q.version > 1 && <Badge variant="info">{t('v')}{q.version}</Badge>}
            <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
            {isExpired && <Badge variant="destructive">{t('EXPIRED')}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['draft', 'sent'].includes(q.status) && !isExpired && (
            <>
              {isBroker && (
                <Button size="sm" onClick={() => doAction('accept', { createShipment: true })} disabled={!!actionLoading}>
                  <Rocket className="h-4 w-4" />
                  {actionLoading === 'accept' ? t('Booking...') : t('Accept & Book')}
                </Button>
              )}
              <Button size="sm" variant="default" onClick={() => doAction('accept')} disabled={!!actionLoading}>
                <Check className="h-4 w-4" />
                {actionLoading === 'accept' ? t('Accepting...') : t('Accept')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => doAction('decline', { reason: 'Declined by user' })} disabled={!!actionLoading}>
                {t('Decline')}
              </Button>
            </>
          )}
          {!['accepted', 'expired'].includes(q.status) && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/finance/quotes/${q.id}/revise`)}>
              <Pencil className="h-4 w-4" /> {t('Revise')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES.primary)}>
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight font-mono tabular-nums">{formatMoney(q.totalRevenueCents)}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('Revenue (Customer Pays)')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES.warning)}>
              <Truck className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight font-mono tabular-nums">{formatMoney(q.totalCostCents)}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('Cost (Carrier)')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES.success)}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className={cn('mt-3 text-2xl font-bold tracking-tight font-mono tabular-nums', q.marginCents >= 0 ? 'text-success' : 'text-destructive')}>
              {formatMoney(q.marginCents)} ({q.marginPercent}%)
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{t('Margin')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <div className="p-5">
              <h2 className="text-lg font-semibold">{t('Line Items')}</h2>
            </div>
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Description')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead className="text-right">{t('Qty')}</TableHead>
                  <TableHead className="text-right">{t('Amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.lineItems.map(li => (
                  <TableRow key={li.id}>
                    <TableCell>
                      {li.description}
                      {li.freightClass && <span className="ml-1 text-sm text-muted-foreground">{t('(Class')} {li.freightClass})</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{li.chargeType.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{li.quantity}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium">{formatMoney(li.amountCents * li.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t p-5">
              <div className="flex justify-between text-sm font-bold">
                <span>{t('Total (Cost Basis)')}</span>
                <span className="font-mono tabular-nums">{formatMoney(q.totalCostCents)}</span>
              </div>
            </div>
          </Card>

          {q.parentQuote && (
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-2 text-base font-semibold">{t('Revision History')}</h3>
                <p className="text-sm">
                  {t('This is a revision of')}{' '}
                  <Link to={`/finance/quotes/${q.parentQuote.id}`} className="text-primary hover:underline">
                    {q.parentQuote.quoteNumber}
                  </Link>{' '}
                  {t('(v')}{q.parentQuote.version})
                                  </p>
              </CardContent>
            </Card>
          )}

          {q.orderId && (
            <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                {t('Quote accepted -')}{' '}
                <Link to={`/orders/${q.orderId}`} className="font-semibold hover:underline">
                  {t('View Order')}
                </Link>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-base font-semibold">{t('Quote Details')}</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Customer')}</dt>
                  <dd>{q.customer.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Service Level')}</dt>
                  <dd>{q.serviceLevel}</dd>
                </div>
                {q.equipmentType && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Equipment')}</dt>
                    <dd>{q.equipmentType}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Valid From')}</dt>
                  <dd>{formatDate(q.validFrom)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Valid Until')}</dt>
                  <dd className={cn(isExpired && 'text-destructive')}>{formatDate(q.validUntil)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Created')}</dt>
                  <dd>{formatDate(q.createdAt)}</dd>
                </div>
                {q.notes && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Notes')}</dt>
                    <dd>{q.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
