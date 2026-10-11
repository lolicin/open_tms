import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { API_URL } from '../api';
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

import { t } from '@/i18n';

interface AtRiskShipment {
  id: string;
  reference: string;
  status: string;
  lastCutoffRiskSeverity: string | null;
  lastCutoffRiskAt: string | null;
  lastCutoffRiskIssueId: string | null;
  carrier: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
}

export default function VNextCutoffDashboard() {
  const [shipments, setShipments] = useState<AtRiskShipment[]>([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    fetch(`${API_URL}/api/v1/cutoff-monitor/at-risk?${params}`)
      .then(r => r.json())
      .then(json => setShipments(json.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [severityFilter]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/cutoff-monitor/run`, { method: 'POST' });
      const json = await res.json();
      if (json.data) {
        alert(`Scan complete: evaluated ${json.data.evaluated} shipments, ${json.data.atRisk} at risk (${json.data.critical} critical, ${json.data.warning} warning), ${json.data.notified} notified.`);
      }
      load();
    } finally { setRunning(false); }
  };

  const critical = shipments.filter(s => s.lastCutoffRiskSeverity === 'critical').length;
  const warning = shipments.filter(s => s.lastCutoffRiskSeverity === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Cutoff At Risk')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              'Shipments projected to miss a carrier cutoff. Warning and critical severities auto-raise triage issues.'
            )}
          </p>
        </div>
        <Button variant="outline" onClick={handleRunNow} disabled={running}>
          {running ? t('Scanning...') : t('Run scan now')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{t('At risk')}</div>
            <div className="mt-1 text-3xl font-bold">{shipments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{t('Critical')}</div>
            <div className="mt-1 text-3xl font-bold text-destructive">{critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{t('Warning')}</div>
            <div className="mt-1 text-3xl font-bold text-warning">{warning}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All at-risk')}</SelectItem>
              <SelectItem value="critical">{t('Critical only')}</SelectItem>
              <SelectItem value="warning">{t('Warning only')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Shipment')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Carrier')}</TableHead>
              <TableHead>{t('Customer')}</TableHead>
              <TableHead>{t('Severity')}</TableHead>
              <TableHead>{t('Flagged')}</TableHead>
              <TableHead>{t('Issue')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && shipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {t('No shipments at risk. Scans run automatically every 5 minutes.')}
                </TableCell>
              </TableRow>
            )}
            {shipments.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link to={`/shipments/${s.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                    {s.reference}
                  </Link>
                </TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell>{s.carrier?.name ?? '-'}</TableCell>
                <TableCell>{s.customer?.name ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={s.lastCutoffRiskSeverity === 'critical' ? 'destructive' : 'warning'}>
                    {s.lastCutoffRiskSeverity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.lastCutoffRiskAt ? new Date(s.lastCutoffRiskAt).toLocaleString() : '-'}
                </TableCell>
                <TableCell>
                  {s.lastCutoffRiskIssueId
                    ? <Link to={`/issues/${s.lastCutoffRiskIssueId}`} className="font-mono text-sm text-primary hover:underline">{t('View issue')}</Link>
                    : <span className="text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
