import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CircleAlert,
  CreditCard,
  Loader2,
  Send,
} from 'lucide-react';

import { API_URL } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { cn } from '@/lib/utils';

import { t } from '@/i18n';

interface InvoiceLineItem {
  id: string;
  chargeType: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  shipmentId?: string;
  freightClass?: string;
}

interface Payment {
  id: string;
  amountCents: number;
  paymentMethod?: string;
  referenceNumber?: string;
  receivedDate: string;
  notes?: string;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  customer: { id: string; name: string; billingEmail?: string; contactEmail?: string };
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  currency: string;
  paymentTermsDays: number;
  issueDate: string;
  dueDate: string;
  sentAt?: string;
  paidAt?: string;
  notes?: string;
  internalNotes?: string;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
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
    approved: 'info',
    sent: 'default',
    partial_paid: 'warning',
    paid: 'success',
    overdue: 'destructive',
    void: 'secondary',
    disputed: 'destructive',
  };
  return m[s] || 'secondary';
}

export default function VNextFinanceInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ach');
  const [paymentRef, setPaymentRef] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/invoices/${id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setInvoice(json.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string, body?: any) => {
    setActionLoading(action);
    try {
      const res = await fetch(`${API_URL}/api/v1/invoices/${id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(''); }
  };

  const recordPayment = async () => {
    const cents = Math.round(parseFloat(paymentAmount) * 100);
    if (!cents || cents <= 0) { alert('Enter a valid amount'); return; }
    await doAction('payments', { amountCents: cents, paymentMethod, referenceNumber: paymentRef || undefined });
    setShowPayment(false);
    setPaymentAmount('');
    setPaymentRef('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <h3 className="text-lg font-medium">{t('Loading...')}</h3>
      </div>
    );
  }
  if (error || !invoice) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <CircleAlert className="h-5 w-5" />
        {error || t('Invoice not found')}
      </div>
    );
  }

  const i = invoice;
  const isPastDue = new Date(i.dueDate) < new Date() && !['paid', 'void'].includes(i.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/finance/invoices')}>
          <ArrowLeft className="h-4 w-4" /> {t('Invoices')}
        </Button>
        <span className="text-muted-foreground">/ {i.invoiceNumber}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{i.invoiceNumber}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={statusVariant(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
            {isPastDue && <Badge variant="destructive">{t('OVERDUE')}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {i.status === 'draft' && (
            <Button size="sm" onClick={() => doAction('approve')} disabled={!!actionLoading}>
              {actionLoading === 'approve' ? t('Approving...') : t('Approve')}
            </Button>
          )}
          {['draft', 'approved'].includes(i.status) && (
            <Button size="sm" onClick={() => doAction('send')} disabled={!!actionLoading}>
              <Send className="h-4 w-4" />
              {actionLoading === 'send' ? t('Sending...') : t('Send')}
            </Button>
          )}
          {['sent', 'partial_paid', 'overdue'].includes(i.status) && (
            <Button size="sm" variant="default" onClick={() => setShowPayment(!showPayment)}>
              <CreditCard className="h-4 w-4" /> {t('Record Payment')}
            </Button>
          )}
          {i.paidCents === 0 && !['void', 'paid'].includes(i.status) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (confirm(t('Void this invoice?'))) doAction('void', { reason: 'Voided by user' }); }}
              disabled={!!actionLoading}
            >
              {t('Void')}
            </Button>
          )}
        </div>
      </div>

      {showPayment && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-base font-semibold">{t('Record Payment')}</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">{t('Amount ($)')}</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={i.balanceCents / 100}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder={`Max ${(i.balanceCents / 100).toFixed(2)}`}
                  className="w-[180px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('Method')}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ach">{t('ACH')}</SelectItem>
                    <SelectItem value="wire">{t('Wire')}</SelectItem>
                    <SelectItem value="check">{t('Check')}</SelectItem>
                    <SelectItem value="credit_card">{t('Credit Card')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-ref">{t('Reference #')}</Label>
                <Input
                  id="payment-ref"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder={t('Check #, ACH ref...')}
                  className="w-[200px]"
                />
              </div>
              <Button onClick={recordPayment} disabled={!!actionLoading}>
                {actionLoading === 'payments' ? t('Recording...') : t('Record')}
              </Button>
              <Button variant="ghost" onClick={() => setShowPayment(false)}>{t('Cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between p-5">
              <h2 className="text-lg font-semibold">{t('Line Items')}</h2>
            </div>
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Description')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead className="text-right">{t('Qty')}</TableHead>
                  <TableHead className="text-right">{t('Unit Price')}</TableHead>
                  <TableHead className="text-right">{t('Total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {i.lineItems.map(li => (
                  <TableRow key={li.id}>
                    <TableCell>
                      {li.description}
                      {li.freightClass && <span className="ml-1 text-sm text-muted-foreground">{t('(Class')} {li.freightClass})</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{li.chargeType.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{li.quantity}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatMoney(li.unitPriceCents)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium">{formatMoney(li.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">{t('Subtotal')}</span>
                  <span className="font-mono tabular-nums font-semibold">{formatMoney(i.subtotalCents)}</span>
                </div>
                {i.taxCents > 0 && (
                  <div className="flex justify-between">
                    <span>{t('Tax')}</span>
                    <span className="font-mono tabular-nums">{formatMoney(i.taxCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base">
                  <span className="font-bold">{t('Total')}</span>
                  <span className="font-mono tabular-nums font-bold">{formatMoney(i.totalCents)}</span>
                </div>
                {i.paidCents > 0 && (
                  <div className="flex justify-between text-success">
                    <span>{t('Paid')}</span>
                    <span className="font-mono tabular-nums">-{formatMoney(i.paidCents)}</span>
                  </div>
                )}
                <div className={cn('flex justify-between font-bold', i.balanceCents > 0 ? 'text-destructive' : 'text-success')}>
                  <span>{t('Balance Due')}</span>
                  <span className="font-mono tabular-nums">{formatMoney(i.balanceCents)}</span>
                </div>
              </div>
            </div>
          </Card>

          {i.payments.length > 0 && (
            <Card>
              <div className="p-5">
                <h2 className="text-lg font-semibold">{t('Payment History')}</h2>
              </div>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Method')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead className="text-right">{t('Amount')}</TableHead>
                    <TableHead>{t('Notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {i.payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.receivedDate)}</TableCell>
                      <TableCell>{p.paymentMethod ?? '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.referenceNumber ?? '-'}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium text-success">{formatMoney(p.amountCents)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.notes ?? ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-base font-semibold">{t('Invoice Details')}</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Customer')}</dt>
                  <dd>{i.customer.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Issue Date')}</dt>
                  <dd>{formatDate(i.issueDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Due Date')}</dt>
                  <dd className={cn(isPastDue && 'text-destructive')}>{formatDate(i.dueDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('Payment Terms')}</dt>
                  <dd>{t('Net')} {i.paymentTermsDays}</dd>
                </div>
                {i.sentAt && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Sent')}</dt>
                    <dd>{formatDate(i.sentAt)}</dd>
                  </div>
                )}
                {i.paidAt && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Paid')}</dt>
                    <dd>{formatDate(i.paidAt)}</dd>
                  </div>
                )}
                {i.notes && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Notes')}</dt>
                    <dd>{i.notes}</dd>
                  </div>
                )}
                {i.internalNotes && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Internal Notes')}</dt>
                    <dd className="italic">{i.internalNotes}</dd>
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
