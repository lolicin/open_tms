import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PackageOpen, Plus } from 'lucide-react';

import { API_URL } from '../api';
import { useFacilities } from '../hooks/useFacilities';
import { FacilitySelect } from '@/components/FacilitySelect';
import { Button } from '@/components/ui/button';
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

import { t as translate } from '@/i18n';

interface ReceivingTask {
  id: string;
  status: string;
  receivingType: string;
  crossDock: boolean;
  shipmentRef: string | null;
  dockDoor: string | null;
  assignedTo: string | null;
  lineCount: number;
  receivedLines: number;
  createdAt: string;
}

type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'secondary' | 'default';

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'pending': return 'secondary';
    case 'in_progress': return 'info';
    case 'inspection': return 'warning';
    case 'completed': return 'success';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
}

function formatStatus(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function VNextWmsReceiving() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ReceivingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const { facilities, facilityId, setFacilityId, loading: facilitiesLoading, error: facilitiesError } = useFacilities();

  useEffect(() => {
    if (!facilityId) { setLoading(false); return; }
    setLoading(true);
    const url = statusFilter !== 'all'
      ? `${API_URL}/api/v1/receiving/tasks?facilityId=${facilityId}&status=${statusFilter}`
      : `${API_URL}/api/v1/receiving/tasks?facilityId=${facilityId}`;
    fetch(url)
      .then(r => r.json())
      .then(res => setTasks((res.data || []).map((t: any) => ({
        ...t,
        shipmentRef: t.inboundShipmentId || null,
        dockDoor: t.dockBinId ? t.dockBinId.slice(0, 8) : null,
        assignedTo: t.assignedToUserId || null,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [facilityId, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{translate('Receiving')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{translate('Inbound goods receiving and inspection')}</p>
        </div>
        <Button variant="gradient" onClick={() => navigate('/wms/receiving/create')}>
          <Plus className="h-4 w-4" />
          {translate('New Receiving Task')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FacilitySelect facilities={facilities} value={facilityId} onChange={setFacilityId} loading={facilitiesLoading} error={facilitiesError} className="w-[260px]" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{translate('All Statuses')}</SelectItem>
            <SelectItem value="pending">{translate('Pending')}</SelectItem>
            <SelectItem value="in_progress">{translate('In Progress')}</SelectItem>
            <SelectItem value="inspection">{translate('Inspection')}</SelectItem>
            <SelectItem value="completed">{translate('Completed')}</SelectItem>
            <SelectItem value="cancelled">{translate('Cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-base font-medium">{translate('No receiving tasks')}</h3>
            <p className="text-sm text-muted-foreground">
              {translate(
                'Receiving tasks are created when inbound shipments arrive, or manually for blind receiving.'
              )}
            </p>
            <Button variant="gradient" onClick={() => navigate('/wms/receiving/create')}>
              {translate('Create Receiving Task')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate('Task')}</TableHead>
                <TableHead>{translate('Type')}</TableHead>
                <TableHead>{translate('Shipment')}</TableHead>
                <TableHead>{translate('Dock')}</TableHead>
                <TableHead>{translate('Progress')}</TableHead>
                <TableHead>{translate('Assigned To')}</TableHead>
                <TableHead>{translate('Status')}</TableHead>
                <TableHead>{translate('Created')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => (
                <TableRow
                  key={task.id}
                  onClick={() => navigate(`/wms/receiving/${task.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-sm font-semibold">{task.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{task.receivingType === 'asn' ? translate('ASN') : translate('Blind')}</Badge>
                      {task.crossDock && <Badge variant="warning">{translate('Cross-Dock')}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{task.shipmentRef || '-'}</TableCell>
                  <TableCell>{task.dockDoor || '-'}</TableCell>
                  <TableCell>{task.receivedLines}/{task.lineCount} {translate('lines')}</TableCell>
                  <TableCell>{task.assignedTo || translate('Unassigned')}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(task.status)}>{formatStatus(task.status)}</Badge>
                  </TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
