import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { API_URL } from '../api';
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
import { cn } from '@/lib/utils';

import { t } from '@/i18n';

interface PackAudit {
  id: string;
  verdict: string;
  expectedWeightGrams: number;
  actualWeightGrams: number;
  weightVariancePercent: string | number | null;
  dimWeightVariancePercent: string | number | null;
  weightTolerancePercent: string | number;
  issueId: string | null;
  createdAt: string;
  packTask: { id: string; orderId: string; locationId: string };
}

interface Stats {
  windowDays: number;
  total: number;
  pass: number;
  warning: number;
  fail: number;
  passRatePercent: number | null;
}

type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'secondary' | 'default';

function variantForVerdict(v: string): BadgeVariant {
  if (v === 'pass') return 'success';
  if (v === 'warning') return 'warning';
  return 'destructive';
}

export default function VNextWmsPackAudits() {
  const [audits, setAudits] = useState<PackAudit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (verdictFilter !== 'all') params.set('verdict', verdictFilter);
    params.set('limit', '200');
    Promise.all([
      fetch(`${API_URL}/api/v1/pack-audits?${params}`).then(r => r.json()),
      fetch(`${API_URL}/api/v1/pack-audits/stats`).then(r => r.json()),
    ])
      .then(([list, s]) => {
        setAudits(list.data || []);
        setStats(s.data);
      })
      .finally(() => setLoading(false));
  }, [verdictFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Pack Audits')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            'Scale and dim-weight variance checks at pack stations. Verdict beyond tolerance auto-raises a quality issue.'
          )}
        </p>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{t('Last')} {stats.windowDays} {t('days')}</div>
              <div className="mt-1 text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">{t('audits recorded')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{t('Pass rate')}</div>
              <div className="mt-1 text-2xl font-bold text-success">{stats.passRatePercent != null ? `${stats.passRatePercent}%` : '-'}</div>
              <div className="text-xs text-muted-foreground">{stats.pass}/ {stats.total} {t('passed')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{t('Warnings')}</div>
              <div className="mt-1 text-2xl font-bold text-warning">{stats.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{t('Failures')}</div>
              <div className="mt-1 text-2xl font-bold text-destructive">{stats.fail}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Select value={verdictFilter} onValueChange={setVerdictFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All verdicts')}</SelectItem>
              <SelectItem value="pass">{t('Pass')}</SelectItem>
              <SelectItem value="warning">{t('Warning')}</SelectItem>
              <SelectItem value="fail">{t('Fail')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Pack Task')}</TableHead>
              <TableHead>{t('Verdict')}</TableHead>
              <TableHead>{t('Expected')}</TableHead>
              <TableHead>{t('Actual')}</TableHead>
              <TableHead>{t('Weight variance')}</TableHead>
              <TableHead>{t('Dim variance')}</TableHead>
              <TableHead>{t('Tolerance')}</TableHead>
              <TableHead>{t('Issue')}</TableHead>
              <TableHead>{t('Recorded')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && audits.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  {t('No pack audits recorded yet.')}
                </TableCell>
              </TableRow>
            )}
            {audits.map(a => {
              const wv = Number(a.weightVariancePercent ?? 0);
              const dv = a.dimWeightVariancePercent != null ? Number(a.dimWeightVariancePercent) : null;
              return (
                <TableRow key={a.id}>
                  <TableCell><code className="text-xs">{a.packTask.id.slice(0, 8)}</code></TableCell>
                  <TableCell>
                    <Badge variant={variantForVerdict(a.verdict)}>{a.verdict}</Badge>
                  </TableCell>
                  <TableCell>{(a.expectedWeightGrams / 1000).toFixed(2)} {t('kg')}</TableCell>
                  <TableCell>{(a.actualWeightGrams / 1000).toFixed(2)} {t('kg')}</TableCell>
                  <TableCell
                    className={cn(
                      'font-semibold',
                      a.verdict === 'pass' && 'text-success',
                      a.verdict === 'warning' && 'text-warning',
                      a.verdict === 'fail' && 'text-destructive'
                    )}
                  >
                    {wv > 0 ? '+' : ''}{wv.toFixed(1)}%
                  </TableCell>
                  <TableCell>{dv != null ? `${dv > 0 ? '+' : ''}${dv.toFixed(1)}%` : <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell><span className="text-muted-foreground">+/-{Number(a.weightTolerancePercent).toFixed(0)}%</span></TableCell>
                  <TableCell>
                    {a.issueId
                      ? <Link to={`/issues/${a.issueId}`} className="font-mono text-sm text-primary hover:underline">{t('View issue')}</Link>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
