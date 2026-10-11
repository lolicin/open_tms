import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, FileText, Loader2, Plus } from 'lucide-react';

import { API_URL } from '../api';
import { useFacilities } from '../hooks/useFacilities';
import { FacilitySelect } from '@/components/FacilitySelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface WaveTemplate {
  id: string;
  name: string;
  pickStrategy: string;
  cutoffTime: string | null;
  minOrders: number | null;
  maxOrders: number | null;
  priority: number;
  releaseSchedule: string | null;
  autoRelease: boolean;
  active: boolean;
  groupingRules: Record<string, unknown> | null;
  _count: { waves: number };
}

function formatStatus(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function VNextWmsWaveTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WaveTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { facilities, facilityId, setFacilityId, facility, loading: facilitiesLoading, error: facilitiesError } = useFacilities();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState<{
    name: string; pickStrategy: string; cutoffTime: string;
    minOrders: string; maxOrders: string; priority: string;
    releaseSchedule: string; autoRelease: boolean; zonePickMode?: string;
  }>({
    name: '', pickStrategy: 'discrete', cutoffTime: '',
    minOrders: '', maxOrders: '', priority: '50',
    releaseSchedule: '', autoRelease: false,
  });

  const loadData = () => {
    if (!facilityId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_URL}/api/v1/wave-templates?facilityId=${facilityId}`)
      .then(r => r.json())
      .then(res => setTemplates(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [facilityId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/wave-templates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          name: form.name.trim(),
          pickStrategy: form.pickStrategy,
          cutoffTime: form.cutoffTime || null,
          minOrders: form.minOrders ? parseInt(form.minOrders) : null,
          maxOrders: form.maxOrders ? parseInt(form.maxOrders) : null,
          priority: parseInt(form.priority) || 50,
          releaseSchedule: form.releaseSchedule || null,
          autoRelease: form.autoRelease,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setShowCreate(false); setForm({ name: '', pickStrategy: 'discrete', cutoffTime: '', minOrders: '', maxOrders: '', priority: '50', releaseSchedule: '', autoRelease: false }); loadData(); }
    } catch { setError('Failed to create'); }
    finally { setCreating(false); }
  };

  const handleApply = async (templateId: string) => {
    setError('');
    setApplying(templateId);
    setApplyResult(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/wave-templates/${templateId}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setApplyResult(data.data);
    } catch { setError('Failed to apply'); }
    finally { setApplying(null); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`${API_URL}/api/v1/wave-templates/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{translate('Wave Templates')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{translate('Automate wave creation with reusable templates')}</p>
        </div>
        <Button variant="gradient" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {translate('New Template')}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <CircleAlert className="h-5 w-5" />
          {error}
        </div>
      )}

      {applyResult && (
        <div className={`flex items-center gap-3 rounded-md border p-4 text-sm ${applyResult.skipped ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success'}`}>
          <CircleAlert className="h-5 w-5" />
          <span className="flex-1">
            {applyResult.skipped
              ? `Skipped: ${applyResult.skipReason}`
              : `Created wave ${applyResult.waveNumber} with ${applyResult.orderCount} orders`}
          </span>
          {applyResult.waveId && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/wms/waves/${applyResult.waveId}`)}>
              {translate('View Wave')}
            </Button>
          )}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{translate('New Wave Template')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>{translate('Template Name *')}</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={translate('e.g. "Daily FedEx 14:00 cutoff"')} required />
              </div>
              <div className="space-y-2">
                <Label>{translate('Pick Strategy *')}</Label>
                <Select value={form.pickStrategy} onValueChange={v => setForm({ ...form, pickStrategy: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discrete">{translate('Discrete')}</SelectItem>
                    <SelectItem value="batch">{translate('Batch')}</SelectItem>
                    <SelectItem value="zone">{translate('Zone')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.pickStrategy === 'zone' && (
                <div className="space-y-2">
                  <Label>{translate('Zone Pick Mode *')}</Label>
                  <Select value={form.zonePickMode || 'parallel'} onValueChange={v => setForm({ ...form, zonePickMode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parallel">{translate('Parallel (all zones simultaneously)')}</SelectItem>
                      <SelectItem value="sequential">{translate('Sequential (pick-and-pass)')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{translate('Cutoff Time')}</Label>
                <Input type="time" value={form.cutoffTime} onChange={e => setForm({ ...form, cutoffTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{translate('Min Orders')}</Label>
                <Input type="number" min="1" value={form.minOrders} onChange={e => setForm({ ...form, minOrders: e.target.value })} placeholder={translate('Optional')} />
              </div>
              <div className="space-y-2">
                <Label>{translate('Max Orders')}</Label>
                <Input type="number" min="1" value={form.maxOrders} onChange={e => setForm({ ...form, maxOrders: e.target.value })} placeholder={translate('Optional')} />
              </div>
              <div className="space-y-2">
                <Label>{translate('Priority (1-100)')}</Label>
                <Input type="number" min="1" max="100" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{translate('Auto-Release Schedule')}</Label>
                <Input value={form.releaseSchedule} onChange={e => setForm({ ...form, releaseSchedule: e.target.value })} placeholder={translate('Cron e.g. 0 14 * * *')} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.autoRelease}
                    onChange={e => setForm({ ...form, autoRelease: e.target.checked })}
                    className="h-4 w-4 rounded border border-input bg-background accent-primary"
                  />
                  {translate('Auto-release waves (allocate inventory + generate picks immediately)')}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>{translate('Cancel')}</Button>
              <Button variant="gradient" type="submit" disabled={creating}>{creating ? translate('Creating...') : translate('Create Template')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2">
        <FacilitySelect facilities={facilities} value={facilityId} onChange={setFacilityId} loading={facilitiesLoading} error={facilitiesError} className="w-[260px]" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-base font-medium">{translate('No wave templates')}</h3>
            <p className="text-sm text-muted-foreground">{translate(
              'Templates automate wave creation based on carrier cutoffs, order grouping, and schedules.'
            )}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate('Name')}</TableHead>
                <TableHead>{translate('Strategy')}</TableHead>
                <TableHead>{translate('Cutoff')}</TableHead>
                <TableHead>{translate('Orders')}</TableHead>
                <TableHead>{translate('Schedule')}</TableHead>
                <TableHead>{translate('Waves')}</TableHead>
                <TableHead>{translate('Active')}</TableHead>
                <TableHead>{translate('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold">{t.name}</TableCell>
                  <TableCell>
                    <Badge variant="default">{formatStatus(t.pickStrategy)}</Badge>
                  </TableCell>
                  <TableCell>{t.cutoffTime || '-'}</TableCell>
                  <TableCell>{t.minOrders || '-'} - {t.maxOrders || '-'}</TableCell>
                  <TableCell className={t.releaseSchedule ? 'font-mono text-xs' : ''}>{t.releaseSchedule || translate('Manual')}</TableCell>
                  <TableCell>{t._count.waves}</TableCell>
                  <TableCell>
                    <button type="button" onClick={() => handleToggle(t.id, t.active)}>
                      <Badge variant={t.active ? 'success' : 'muted'} className="cursor-pointer">
                        {t.active ? translate('Active') : translate('Inactive')}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="gradient" size="sm" disabled={applying === t.id || !t.active} onClick={() => handleApply(t.id)}>
                      {applying === t.id ? translate('Running...') : translate('Run Now')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
