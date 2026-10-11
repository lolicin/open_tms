import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { API_URL } from '../../api';
import { customerFetch } from './CustomerDashboard';
import { Card } from '@/components/ui/card';
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

import { t } from '@/i18n';

interface Shipment {
  id: string; reference: string; status: string;
  originCity?: string; originState?: string; destinationCity?: string; destinationState?: string;
  carrierName?: string; pickupDate?: string; deliveryDate?: string; updatedAt: string;
}

type StatusVariant = 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'secondary';

function statusVariant(s: string): StatusVariant {
  const m: Record<string, StatusVariant> = {
    in_transit: 'info',
    delivered: 'success',
    booked: 'warning',
    exception: 'destructive',
    at_pickup: 'warning',
    at_delivery: 'warning',
  };
  return m[s] || 'secondary';
}

export default function CustomerShipments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const statusFilter = searchParams.get('status') || 'all';
  const [loading, setLoading] = useState(true);

  const setStatusFilter = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status'); else params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    customerFetch(`${API_URL}/api/v1/customer-portal/shipments?${params}`)
      .then(r => r.json())
      .then(json => setShipments(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('Shipments')}</h1>
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All statuses')}</SelectItem>
              <SelectItem value="active">{t('Active (in flight)')}</SelectItem>
              <SelectItem value="booked">{t('Booked')}</SelectItem>
              <SelectItem value="in_transit">{t('In transit')}</SelectItem>
              <SelectItem value="at_pickup">{t('At pickup')}</SelectItem>
              <SelectItem value="at_delivery">{t('At delivery')}</SelectItem>
              <SelectItem value="delivered">{t('Delivered')}</SelectItem>
              <SelectItem value="exception">{t('Exception')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">{t('Loading shipments...')}</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Reference')}</TableHead>
                <TableHead>{t('Origin')}</TableHead>
                <TableHead>{t('Destination')}</TableHead>
                <TableHead>{t('Carrier')}</TableHead>
                <TableHead>{t('Pickup')}</TableHead>
                <TableHead>{t('Delivery')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link to={`/customer-portal/shipments/${s.id}`} className="font-semibold text-primary hover:underline">
                      {s.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{s.originCity ? `${s.originCity}, ${s.originState}` : '-'}</TableCell>
                  <TableCell className="text-sm">{s.destinationCity ? `${s.destinationCity}, ${s.destinationState}` : '-'}</TableCell>
                  <TableCell className="text-sm">{s.carrierName || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {s.pickupDate ? new Date(s.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {shipments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    {t('No shipments found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
