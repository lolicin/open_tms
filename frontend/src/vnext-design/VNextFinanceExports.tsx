import React, { useState } from 'react';
import {
  BarChart3,
  CreditCard,
  DollarSign,
  Download,
  Receipt,
  Truck,
} from 'lucide-react';

import { API_URL } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { t } from '@/i18n';

interface ExportOption {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  endpoint: string;
  supportsDateRange: boolean;
  extraParams?: { key: string; label: string; options: { value: string; label: string }[] }[];
}

const EXPORTS: ExportOption[] = [
  {
    key: 'invoices',
    label: t('Invoice Register'),
    description: t(
      'All customer invoices with line item detail - totals, payment status, balances'
    ),
    icon: Receipt,
    endpoint: '/api/v1/reports/export/invoices',
    supportsDateRange: true,
    extraParams: [{ key: 'status', label: t('Status'), options: [
      { value: 'all', label: t('All') }, { value: 'draft', label: t('Draft') }, { value: 'sent', label: t('Sent') },
      { value: 'paid', label: t('Paid') }, { value: 'overdue', label: t('Overdue') }, { value: 'void', label: t('Void') },
    ]}],
  },
  {
    key: 'carrier-invoices',
    label: t('Carrier Invoice Register'),
    description: t(
      'All carrier invoices with freight audit results - match status, variance, line items'
    ),
    icon: Truck,
    endpoint: '/api/v1/reports/export/carrier-invoices',
    supportsDateRange: true,
    extraParams: [{ key: 'status', label: t('Status'), options: [
      { value: 'all', label: t('All') }, { value: 'received', label: t('Received') }, { value: 'approved', label: t('Approved') },
      { value: 'paid', label: t('Paid') }, { value: 'discrepancy', label: t('Discrepancy') },
    ]}],
  },
  {
    key: 'payments',
    label: t('Payment Ledger'),
    description: t(
      'All customer payments received - date, invoice, amount, method, reference'
    ),
    icon: CreditCard,
    endpoint: '/api/v1/reports/export/payments',
    supportsDateRange: true,
  },
  {
    key: 'charges',
    label: t('Charge Detail'),
    description: t(
      'All revenue and cost charges across shipments - for margin analysis and reconciliation'
    ),
    icon: DollarSign,
    endpoint: '/api/v1/reports/export/charges',
    supportsDateRange: true,
    extraParams: [{ key: 'chargeCategory', label: t('Category'), options: [
      { value: 'all', label: t('All') }, { value: 'revenue', label: t('Revenue') }, { value: 'cost', label: t('Cost') },
    ]}],
  },
  {
    key: 'ar-aging',
    label: t('AR Aging'),
    description: t('Outstanding invoices bucketed by days past due per customer'),
    icon: BarChart3,
    endpoint: '/api/v1/reports/ar-aging/csv',
    supportsDateRange: false,
  },
];

export default function VNextFinanceExports() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});

  const download = (exp: ExportOption) => {
    const params = new URLSearchParams();
    if (exp.supportsDateRange) {
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
    }
    if (exp.extraParams) {
      for (const p of exp.extraParams) {
        const val = extraFilters[`${exp.key}-${p.key}`];
        if (val && val !== 'all') params.set(p.key, val);
      }
    }
    const qs = params.toString();
    window.open(`${API_URL}${exp.endpoint}${qs ? '?' + qs : ''}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Financial Exports')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('Download CSV files for your accounting system')}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-base font-semibold">{t('Date Range')}</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from">{t('From')}</Label>
              <DatePicker id="from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[170px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">{t('To')}</Label>
              <DatePicker id="to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[170px]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() - 30);
                  setDateFrom(d.toISOString().slice(0, 10)); setDateTo(today);
                }}
              >
                {t('Last 30 days')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() - 90);
                  setDateFrom(d.toISOString().slice(0, 10)); setDateTo(today);
                }}
              >
                {t('Last 90 days')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFrom(`${new Date().getFullYear()}-01-01`); setDateTo(today);
                }}
              >
                {t('Year to date')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.map(exp => {
          const Icon = exp.icon;
          return (
            <Card key={exp.key} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', 'bg-primary/10 text-primary')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">{exp.label}</h3>
                </div>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{exp.description}</p>

                {exp.extraParams && (
                  <div className="mb-3 space-y-2">
                    {exp.extraParams.map(p => (
                      <Select
                        key={p.key}
                        value={extraFilters[`${exp.key}-${p.key}`] || 'all'}
                        onValueChange={v => setExtraFilters(prev => ({ ...prev, [`${exp.key}-${p.key}`]: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {p.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => download(exp)}>
                  <Download className="h-4 w-4" />
                  {t('Download CSV')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
