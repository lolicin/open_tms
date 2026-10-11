import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Truck } from 'lucide-react';

import { API_URL } from '../api';
import { useFacilities } from '../hooks/useFacilities';
import { FacilitySelect } from '@/components/FacilitySelect';
import { Card, CardContent } from '@/components/ui/card';
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

import { t } from '@/i18n';

interface StagingAssignment {
  id: string;
  orderRef: string;
  shipmentRef: string | null;
  stagingBinLabel: string;
  loadSequence: number | null;
  status: string;
  packedAt: string;
}

type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'secondary' | 'default';

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'staged': return 'info';
    case 'loading': return 'warning';
    case 'loaded': return 'success';
    case 'dispatched': return 'default';
    default: return 'secondary';
  }
}

function formatStatus(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function VNextWmsLoading() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<StagingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const { facilities, facilityId, setFacilityId, loading: facilitiesLoading, error: facilitiesError } = useFacilities();

  useEffect(() => {
    if (!facilityId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_URL}/api/v1/staging?facilityId=${facilityId}`)
      .then(r => r.json())
      .then(res => setAssignments((res.data || []).map((a: any) => ({
        ...a,
        orderRef: a.orderId?.slice(0, 8) ?? '',
        shipmentRef: a.shipmentId?.slice(0, 8) ?? null,
        stagingBinLabel: a.stagingBin?.label ?? '',
        packedAt: a.createdAt,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [facilityId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Loading')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('Staging and loading for outbound shipments')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FacilitySelect facilities={facilities} value={facilityId} onChange={setFacilityId} loading={facilitiesLoading} error={facilitiesError} className="w-[260px]" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-base font-medium">{t('No staged orders')}</h3>
            <p className="text-sm text-muted-foreground">
              {t(
                'Packed orders are staged in the shipping dock area before being loaded onto outbound vehicles. Orders appear here after packing is complete.'
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Order')}</TableHead>
                <TableHead>{t('Shipment')}</TableHead>
                <TableHead>{t('Staging Bin')}</TableHead>
                <TableHead>{t('Load Seq')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Packed At')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(a => (
                <TableRow key={a.id} className="cursor-pointer">
                  <TableCell className="font-mono text-sm font-semibold">{a.orderRef}</TableCell>
                  <TableCell>{a.shipmentRef || t('Not assigned')}</TableCell>
                  <TableCell>{a.stagingBinLabel}</TableCell>
                  <TableCell>{a.loadSequence ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(a.status)}>{formatStatus(a.status)}</Badge>
                  </TableCell>
                  <TableCell>{new Date(a.packedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
