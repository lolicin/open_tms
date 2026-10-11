/**
 * VNextSlaPolicies - Admin page for managing SLA policies and rules.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Reply,
  CheckCircle2,
  Hourglass,
  ArrowLeftRight,
  Sparkles,
  Building2,
  Sun,
  Lock,
  Thermometer,
  Activity,
  Plus,
  Trash2,
  Copy,
  Users,
  Loader2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

import { API_URL } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { t as translate } from '@/i18n';

interface SlaRule {
  ruleType: string;
  name: string;
  description?: string;
  active?: boolean;
  warningThresholdMinutes?: number | null;
  breachThresholdMinutes?: number | null;
  criticalThresholdMinutes?: number | null;
  issuePriority?: string | null;
  issueCategory?: string | null;
  maxDeliveryMinutes?: number | null;
  maxDwellMinutes?: number | null;
  dwellLocationType?: string | null;
  maxOccurrences?: number | null;
  maxExcursionMinutes?: number | null;
  locationType?: string | null;
  autoCreateIssue?: boolean;
  issuePriorityOnBreach?: string;
}

interface SlaPolicy {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  active: boolean;
  rules: (SlaRule & { id?: string })[];
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
}

const RULE_TYPES: { value: string; label: string; Icon: LucideIcon; description: string }[] = [
  { value: 'eta_delivery', label: translate('ETA Delivery'), Icon: Clock, description: translate('Shipment must arrive within X minutes of pickup') },
  { value: 'issue_response', label: translate('Issue Response'), Icon: Reply, description: translate('Issue must be acknowledged within X minutes') },
  { value: 'issue_resolution', label: translate('Issue Resolution'), Icon: CheckCircle2, description: translate('Issue must be resolved within X minutes') },
  { value: 'dwell_time', label: translate('Dwell Time'), Icon: Hourglass, description: translate('Max time a shipment can be stationary at a location') },
  { value: 'dock_turnaround', label: translate('Dock Turnaround'), Icon: ArrowLeftRight, description: translate('Max time from arrival to departure at a dock') },
  { value: 'sort_to_dispatch', label: translate('Sort to Dispatch'), Icon: Sparkles, description: translate('Max time from inbound arrival to outbound dispatch at cross-docks') },
  { value: 'facility_dwell', label: translate('Facility Dwell'), Icon: Building2, description: translate('Max time at a specific facility type') },
  { value: 'light_event', label: translate('Light Sensor Event'), Icon: Sun, description: translate('Light detection outside known locations (tampering)') },
  { value: 'seal_event', label: translate('Security Seal Event'), Icon: Lock, description: translate('Seal break detected outside known locations') },
  { value: 'temperature_excursion', label: translate('Temperature Excursion'), Icon: Thermometer, description: translate('Single excursion duration limit') },
  { value: 'temperature_out_of_range', label: translate('Cumulative Out-of-Range'), Icon: Activity, description: translate('Total time out of acceptable temperature range') },
];

const LOCATION_TYPES = [
  { value: 'warehouse', label: translate('Warehouse') },
  { value: 'distribution_centre', label: translate('Distribution Centre') },
  { value: 'cross_dock', label: translate('Cross Dock') },
  { value: 'terminal', label: translate('Terminal') },
  { value: 'port', label: translate('Port') },
  { value: 'rail_yard', label: translate('Rail Yard') },
  { value: 'customer', label: translate('Customer') },
  { value: 'store', label: translate('Store') },
  { value: 'manufacturing', label: translate('Manufacturing') },
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['exception', 'delay', 'damage', 'compliance', 'other'];
const DWELL_LOCATION_TYPES = ['any', 'origin', 'intermediate', 'destination'];

function emptyRule(ruleType: string): SlaRule {
  const meta = RULE_TYPES.find(r => r.value === ruleType);
  return {
    ruleType,
    name: meta?.label || ruleType,
    active: true,
    autoCreateIssue: true,
    issuePriorityOnBreach: 'high',
  };
}

function RuleEditor({ rule, onChange, onRemove }: { rule: SlaRule; onChange: (r: SlaRule) => void; onRemove: () => void }) {
  const meta = RULE_TYPES.find(r => r.value === rule.ruleType);
  const Icon = meta?.Icon;
  const isTimeThreshold = ['issue_response', 'issue_resolution', 'dwell_time', 'temperature_excursion', 'temperature_out_of_range', 'dock_turnaround', 'sort_to_dispatch', 'facility_dwell'].includes(rule.ruleType);
  const isEta = rule.ruleType === 'eta_delivery';
  const isOccurrence = ['light_event', 'seal_event'].includes(rule.ruleType);
  const isDwell = rule.ruleType === 'dwell_time';
  const isIssue = ['issue_response', 'issue_resolution'].includes(rule.ruleType);
  const isLocationSpecific = ['dock_turnaround', 'sort_to_dispatch', 'facility_dwell', 'dwell_time'].includes(rule.ruleType);

  const set = (field: string, value: any) => onChange({ ...rule, [field]: value });
  const setNum = (field: string, v: string) => set(field, v === '' ? null : parseInt(v, 10));

  return (
    <Card className={cn('mb-3 border-l-4', rule.active !== false ? 'border-l-primary' : 'border-l-border')}>
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            <div>
              <div className="text-sm font-semibold">{meta?.label || rule.ruleType}</div>
              <div className="text-xs text-muted-foreground">{meta?.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={rule.active !== false}
                onChange={e => set('active', e.target.checked)}
                className="h-4 w-4 rounded border border-input bg-background accent-primary"
              />
              {translate('Active')}
            </label>
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>{translate('Rule name')}</Label>
            <Input value={rule.name} onChange={e => set('name', e.target.value)} />
          </div>

          {isEta && (
            <div className="space-y-1">
              <Label>{translate('Max delivery time (minutes)')}</Label>
              <Input type="number" value={rule.maxDeliveryMinutes ?? ''} onChange={e => setNum('maxDeliveryMinutes', e.target.value)} placeholder={translate('e.g. 1440 (24 hours)')} />
            </div>
          )}

          {(isTimeThreshold || isEta) && (
            <>
              <div className="space-y-1">
                <Label>{translate('Warning threshold (min)')}</Label>
                <Input type="number" value={rule.warningThresholdMinutes ?? ''} onChange={e => setNum('warningThresholdMinutes', e.target.value)} placeholder={translate('e.g. 60')} />
              </div>
              <div className="space-y-1">
                <Label>{translate('Breach threshold (min)')}</Label>
                <Input type="number" value={rule.breachThresholdMinutes ?? ''} onChange={e => setNum('breachThresholdMinutes', e.target.value)} placeholder={translate('e.g. 120')} />
              </div>
            </>
          )}

          {isDwell && (
            <>
              <div className="space-y-1">
                <Label>{translate('Max dwell time (min)')}</Label>
                <Input type="number" value={rule.maxDwellMinutes ?? ''} onChange={e => setNum('maxDwellMinutes', e.target.value)} placeholder={translate('e.g. 240')} />
              </div>
              <div className="space-y-1">
                <Label>{translate('Location type')}</Label>
                <Select value={rule.dwellLocationType ?? 'any'} onValueChange={v => set('dwellLocationType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DWELL_LOCATION_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isLocationSpecific && (
            <div className="space-y-1">
              <Label>{translate('Facility type filter')}</Label>
              <Select value={rule.locationType ?? 'all'} onValueChange={v => set('locationType', v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{translate('All location types')}</SelectItem>
                  {LOCATION_TYPES.map(lt => (
                    <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {['dock_turnaround', 'sort_to_dispatch', 'facility_dwell'].includes(rule.ruleType) && (
            <div className="space-y-1">
              <Label>{translate('Max time (minutes)')}</Label>
              <Input type="number" value={rule.maxDwellMinutes ?? ''} onChange={e => setNum('maxDwellMinutes', e.target.value)} placeholder={translate('e.g. 120')} />
            </div>
          )}

          {isIssue && (
            <>
              <div className="space-y-1">
                <Label>{translate('Issue priority filter')}</Label>
                <Select value={rule.issuePriority ?? 'all'} onValueChange={v => set('issuePriority', v === 'all' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{translate('All priorities')}</SelectItem>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{translate('Issue category filter')}</Label>
                <Select value={rule.issueCategory ?? 'all'} onValueChange={v => set('issueCategory', v === 'all' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{translate('All categories')}</SelectItem>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isOccurrence && (
            <div className="space-y-1">
              <Label>{translate('Max occurrences before breach')}</Label>
              <Input type="number" value={rule.maxOccurrences ?? ''} onChange={e => setNum('maxOccurrences', e.target.value)} placeholder={translate('0 = any occurrence')} />
            </div>
          )}

          {(rule.ruleType === 'temperature_excursion' || rule.ruleType === 'temperature_out_of_range') && (
            <div className="space-y-1">
              <Label>{translate('Max excursion duration (min)')}</Label>
              <Input type="number" value={rule.maxExcursionMinutes ?? ''} onChange={e => setNum('maxExcursionMinutes', e.target.value)} placeholder={translate('e.g. 30')} />
            </div>
          )}

          <div className="space-y-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rule.autoCreateIssue !== false}
                onChange={e => set('autoCreateIssue', e.target.checked)}
                className="h-4 w-4 rounded border border-input bg-background accent-primary"
              />
              {translate('Auto-create issue on breach')}
            </label>
          </div>
          {rule.autoCreateIssue !== false && (
            <div className="space-y-1">
              <Label>{translate('Issue priority on breach')}</Label>
              <Select value={rule.issuePriorityOnBreach ?? 'high'} onValueChange={v => set('issuePriorityOnBreach', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyEditor({ policy, onSave, saving }: { policy: SlaPolicy | null; onSave: (data: any) => void; saving: boolean }) {
  const [name, setName] = useState(policy?.name || '');
  const [description, setDescription] = useState(policy?.description || '');
  const [rules, setRules] = useState<SlaRule[]>(policy?.rules || []);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    setName(policy?.name || '');
    setDescription(policy?.description || '');
    setRules(policy?.rules || []);
  }, [policy]);

  const addRule = (ruleType: string) => {
    setRules(prev => [...prev, emptyRule(ruleType)]);
    setShowAddMenu(false);
  };

  const updateRule = (idx: number, updated: SlaRule) => {
    setRules(prev => prev.map((r, i) => (i === idx ? updated : r)));
  };

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ name, description, rules });
  };

  const usedTypes = new Set(rules.map(r => r.ruleType));
  const availableTypes = RULE_TYPES.filter(rt => !usedTypes.has(rt.value));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{translate('Policy name')}</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={translate('e.g. Standard SLA')} />
        </div>
        <div className="space-y-1">
          <Label>{translate('Description')}</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={translate('Optional description')} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{translate('Rules (')}{rules.length})</h3>
        <div className="relative">
          <Button variant="outline" onClick={() => setShowAddMenu(!showAddMenu)} disabled={availableTypes.length === 0}>
            <Plus className="h-4 w-4" />
            {translate('Add rule')}
          </Button>
          {showAddMenu && availableTypes.length > 0 && (
            <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border bg-popover shadow-lg">
              {availableTypes.map(rt => {
                const Icon = rt.Icon;
                return (
                  <button
                    key={rt.value}
                    onClick={() => addRule(rt.value)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">{rt.label}</div>
                      <div className="text-xs text-muted-foreground">{rt.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {rules.length === 0 && (
        <div className="rounded-md border-2 border-dashed border-input bg-background p-8 text-center text-sm text-muted-foreground">
          {translate('No rules configured. Click "Add rule" to define SLA thresholds.')}
        </div>
      )}

      {rules.map((rule, idx) => (
        <RuleEditor key={`${rule.ruleType}-${idx}`} rule={rule} onChange={r => updateRule(idx, r)} onRemove={() => removeRule(idx)} />
      ))}

      <div className="flex justify-end">
        <Button variant="gradient" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {policy?.id ? translate('Save changes') : translate('Create policy')}
        </Button>
      </div>
    </div>
  );
}

function Banner({ variant, message, onClose }: { variant: 'success' | 'error'; message: string; onClose?: () => void }) {
  const tone =
    variant === 'success'
      ? 'border-success/30 bg-success/10 text-success'
      : 'border-destructive/30 bg-destructive/10 text-destructive';
  return (
    <div className={`flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${tone}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-xs underline opacity-70 hover:opacity-100">{translate('Dismiss')}</button>
      )}
    </div>
  );
}

export default function VNextSlaPolicies() {
  const [tab, setTab] = useState<'org' | 'customer'>('org');
  const [orgPolicy, setOrgPolicy] = useState<SlaPolicy | null>(null);
  const [customerPolicies, setCustomerPolicies] = useState<SlaPolicy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneCustomerId, setCloneCustomerId] = useState('');

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, custRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/sla/policies`),
        fetch(`${API_URL}/api/v1/customers`),
      ]);
      if (polRes.ok) {
        const policies = (await polRes.json()).data || [];
        setOrgPolicy(policies.find((p: SlaPolicy) => !p.customerId) || null);
        setCustomerPolicies(policies.filter((p: SlaPolicy) => p.customerId));
      }
      if (custRes.ok) {
        setCustomers((await custRes.json()).data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const saveOrgPolicy = async (data: any) => {
    setSaving(true);
    setMessage(null);
    try {
      const url = orgPolicy?.id ? `${API_URL}/api/v1/sla/policies/${orgPolicy.id}` : `${API_URL}/api/v1/sla/policies`;
      const method = orgPolicy?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setMessage({ type: 'success', text: orgPolicy?.id ? 'Policy updated' : 'Policy created' });
      await fetchPolicies();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const saveCustomerPolicy = async (customerId: string, data: any) => {
    setSaving(true);
    setMessage(null);
    try {
      const existing = customerPolicies.find(p => p.customerId === customerId);
      const url = existing?.id ? `${API_URL}/api/v1/sla/policies/${existing.id}` : `${API_URL}/api/v1/sla/policies`;
      const method = existing?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, customerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setMessage({ type: 'success', text: 'Customer SLA policy saved' });
      await fetchPolicies();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const cloneOrgPolicy = async () => {
    if (!orgPolicy?.id || !cloneCustomerId) return;
    setSaving(true);
    setMessage(null);
    try {
      const customer = customers.find(c => c.id === cloneCustomerId);
      const res = await fetch(`${API_URL}/api/v1/sla/policies/${orgPolicy.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: cloneCustomerId, name: `${orgPolicy.name} - ${customer?.name || cloneCustomerId}` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to clone');
      setMessage({ type: 'success', text: `Policy cloned for ${customer?.name}` });
      setShowCloneModal(false);
      setCloneCustomerId('');
      setTab('customer');
      setSelectedCustomerId(cloneCustomerId);
      await fetchPolicies();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const deactivatePolicy = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/v1/sla/policies/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Policy deactivated' });
      await fetchPolicies();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const customersWithoutPolicy = customers.filter(c => !customerPolicies.some(p => p.customerId === c.id));
  const selectedCustomerPolicy = selectedCustomerId
    ? customerPolicies.find(p => p.customerId === selectedCustomerId) || null
    : null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{translate('SLA policies')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {translate(
            'Configure service level agreements. The organization default applies to all entities unless a customer-specific override exists.'
          )}
        </p>
      </div>

      {message && (
        <Banner variant={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <Tabs value={tab} onValueChange={v => setTab(v as 'org' | 'customer')}>
        <TabsList>
          <TabsTrigger value="org">
            <Building2 className="mr-1 h-4 w-4" />
            {translate('Organization default')}
          </TabsTrigger>
          <TabsTrigger value="customer">
            <Users className="mr-1 h-4 w-4" />
            {translate('Customer overrides (')}{customerPolicies.length})
                      </TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="mt-4 space-y-4">
          <PolicyEditor policy={orgPolicy} onSave={saveOrgPolicy} saving={saving} />
          {orgPolicy?.id && (
            <Button variant="outline" onClick={() => setShowCloneModal(true)}>
              <Copy className="h-4 w-4" />
              {translate('Clone for customer')}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="customer" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1 md:max-w-md">
              <Label>{translate('Customer')}</Label>
              <Select value={selectedCustomerId || ''} onValueChange={v => setSelectedCustomerId(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder={translate('Select a customer...')} />
                </SelectTrigger>
                <SelectContent>
                  {customerPolicies.map(p => (
                    <SelectItem key={p.customerId} value={p.customerId!}>
                      {p.customer?.name || p.customerId} - {p.name}
                    </SelectItem>
                  ))}
                  {customersWithoutPolicy.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} {translate('(no override)')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCustomerPolicy && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedCustomerPolicy?.id && confirm(translate('Deactivate this customer SLA policy?'))) {
                    deactivatePolicy(selectedCustomerPolicy.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {translate('Deactivate')}
              </Button>
            )}
          </div>

          {!selectedCustomerId && (
            <div className="rounded-md border-2 border-dashed border-input bg-background p-10 text-center text-sm text-muted-foreground">
              <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
              <p>{translate(
                'Select a customer above to edit their SLA override, or choose a customer without an override to create one.'
              )}</p>
              {orgPolicy?.id && (
                <p className="mt-1 text-xs">
                  {translate(
                    'Tip: Use "Clone for customer" on the Organization tab to copy the default policy as a starting point.'
                  )}
                </p>
              )}
            </div>
          )}

          {selectedCustomerId && (
            <PolicyEditor
              policy={selectedCustomerPolicy}
              onSave={data => saveCustomerPolicy(selectedCustomerId, data)}
              saving={saving}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCloneModal} onOpenChange={setShowCloneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate('Clone policy for customer')}</DialogTitle>
            <DialogDescription>
              {translate(
                'This will create a customer-specific SLA policy based on the organization default.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{translate('Customer')}</Label>
            <Select value={cloneCustomerId} onValueChange={setCloneCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder={translate('Select customer...')} />
              </SelectTrigger>
              <SelectContent>
                {customersWithoutPolicy.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneModal(false)}>{translate('Cancel')}</Button>
            <Button variant="gradient" onClick={cloneOrgPolicy} disabled={!cloneCustomerId || saving}>
              {saving ? translate('Cloning...') : translate('Clone policy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
