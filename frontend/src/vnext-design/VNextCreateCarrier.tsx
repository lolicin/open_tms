import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Hash,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  User,
} from 'lucide-react';

import { API_URL } from '../api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

import { t } from '@/i18n';

const EQUIPMENT_TYPES = [
  { key: 'dryVan', label: t('Dry van') },
  { key: 'reefer', label: t('Reefer') },
  { key: 'flatbed', label: t('Flatbed') },
  { key: 'tanker', label: t('Tanker') },
  { key: 'intermodal', label: t('Intermodal') },
];

export default function VNextCreateCarrier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [mcNumber, setMcNumber] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [scacCode, setScacCode] = useState('');
  const [proNumberPrefix, setProNumberPrefix] = useState('');
  const [proNumberMinLength, setProNumberMinLength] = useState('');
  const [proNumberMaxLength, setProNumberMaxLength] = useState('');
  const [proNumberNumericOnly, setProNumberNumericOnly] = useState(false);
  const [equipment, setEquipment] = useState<Record<string, boolean>>({
    dryVan: false, reefer: false, flatbed: false, tanker: false, intermodal: false,
  });
  const [serviceMode, setServiceMode] = useState('FTL');
  const [insuranceAmount, setInsuranceAmount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState('30');
  const [carrierCurrency, setCarrierCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [archived, setArchived] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const { hasPermission } = useCurrentUser();
  const canWrite = hasPermission('carriers:write');
  const canDelete = hasPermission('carriers:delete');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/api/v1/carriers/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(json => {
        const c = json?.data;
        if (!c) return;
        setArchived(!!c.archived);
        setName(c.name || '');
        setMcNumber(c.mcNumber || '');
        setDotNumber(c.dotNumber || '');
        setContactName(c.contactName || '');
        setEmail(c.contactEmail || '');
        setPhone(c.contactPhone || '');
        setAddress1(c.address1 || '');
        setAddress2(c.address2 || '');
        setCity(c.city || '');
        setState(c.state || '');
        setPostalCode(c.postalCode || '');
        setCountry(c.country || 'US');
        setScacCode(c.scacCode || '');
        setProNumberPrefix(c.proNumberPrefix || '');
        setProNumberMinLength(c.proNumberMinLength != null ? String(c.proNumberMinLength) : '');
        setProNumberMaxLength(c.proNumberMaxLength != null ? String(c.proNumberMaxLength) : '');
        setProNumberNumericOnly(!!c.proNumberNumericOnly);
        setPaymentTermsDays(c.paymentTermsDays ? String(c.paymentTermsDays) : '30');
        setCarrierCurrency(c.currency || 'USD');
      })
      .catch(err => setSubmitError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitError('');
    if (!name.trim()) {
      setSubmitError(t('Carrier name is required.'));
      return;
    }
    setSubmitting(true);
    try {
      // Only send fields that have a value — blank optional fields (e.g. no
      // email) must be omitted, not sent as "" (which fails format validation).
      const raw: Record<string, any> = {
        mcNumber, dotNumber, contactName, contactEmail: email, contactPhone: phone,
        address1, address2, city, state, postalCode, country,
        currency: carrierCurrency,
        scacCode,
        proNumberPrefix,
        proNumberMinLength: (() => {
          const n = parseInt(proNumberMinLength, 10);
          return Number.isFinite(n) && n > 0 ? n : undefined;
        })(),
        proNumberMaxLength: (() => {
          const n = parseInt(proNumberMaxLength, 10);
          return Number.isFinite(n) && n > 0 ? n : undefined;
        })(),
        proNumberNumericOnly,
      };
      const body: any = { name: name.trim(), paymentTermsDays: parseInt(paymentTermsDays) || 30 };
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string' ? v.trim() !== '' : v != null) body[k] = v;
      }
      const url = isEdit ? `${API_URL}/api/v1/carriers/${id}` : `${API_URL}/api/v1/carriers`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || `Failed to save carrier (HTTP ${res.status})`);
      }
      const newId = json.data?.id ?? id;
      const label = json.data?.name || name || newId?.slice(0, 8);
      if (isEdit) {
        toast.success(`Carrier ${label} updated`);
      } else {
        toast.success(`Carrier ${label} created`, {
          action: newId ? { label: t('View'), onClick: () => navigate(`/carriers/${newId}/edit`) } : undefined,
        });
      }
      navigate('/carriers');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Lifecycle actions (archive / unarchive / delete). The POST endpoints need a
  // JSON body, so send {} to satisfy the content-type parser.
  const lifecycleAction = async (
    verb: 'archive' | 'unarchive' | 'delete',
    successMsg: string,
  ) => {
    setSubmitError('');
    setActionBusy(true);
    try {
      const isDelete = verb === 'delete';
      const res = await fetch(`${API_URL}/api/v1/carriers/${id}${isDelete ? '' : `/${verb}`}`, {
        method: isDelete ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isDelete ? undefined : '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || `Action failed (HTTP ${res.status})`);
      }
      toast.success(successMsg);
      if (verb === 'unarchive') {
        setArchived(false);
      } else {
        navigate('/carriers');
      }
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleArchive = () => lifecycleAction('archive', 'Carrier archived');
  const handleUnarchive = () => lifecycleAction('unarchive', 'Carrier restored');
  const handleDelete = () => {
    if (!window.confirm('Delete this carrier? This removes it from everywhere. Carriers assigned to lanes cannot be deleted (archive instead).')) return;
    lifecycleAction('delete', 'Carrier deleted');
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
        <CircleAlert className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">{t('Carrier not found')}</h2>
        <p>{t('This carrier may have been deleted.')}</p>
        <Button variant="outline" asChild><Link to="/carriers">{t('Back to carriers')}</Link></Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const toggleEquipment = (key: string) => setEquipment(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/carriers" className="hover:text-foreground">
          <ArrowLeft className="inline h-4 w-4" /> {t('Carriers')}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{isEdit ? t('Edit carrier') : t('New carrier')}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{isEdit ? t('Edit carrier') : t('New carrier')}</h1>
        {isEdit && (canWrite || canDelete) && (
          <div className="flex items-center gap-2">
            {canWrite && (archived ? (
              <Button variant="outline" onClick={handleUnarchive} disabled={actionBusy}>
                <ArchiveRestore className="h-4 w-4" /> {t('Unarchive')}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleArchive} disabled={actionBusy}>
                <Archive className="h-4 w-4" /> {t('Archive')}
              </Button>
            ))}
            {canDelete && (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={actionBusy}>
                <Trash2 className="h-4 w-4" /> {t('Delete')}
              </Button>
            )}
          </div>
        )}
      </div>

      {archived && (
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <Archive className="h-4 w-4" />
          {t(
            'This carrier is archived. It can\'t be selected for new work or used by its portal users until restored.'
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {t('Company information')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label>{t('Name')} <span className="text-destructive">*</span></Label>
            <Input type="text" placeholder={t('Carrier name')} value={name} onChange={e => setName(e.target.value)} required aria-required />
            <p className="text-xs text-muted-foreground">{t('Name is the only required field. Everything else is optional.')}</p>
          </div>
          <div className="space-y-2">
            <Label>{t('MC number')}</Label>
            <Input type="text" placeholder={t('MC-000000')} value={mcNumber} onChange={e => setMcNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('DOT number')}</Label>
            <Input type="text" placeholder="0000000" value={dotNumber} onChange={e => setDotNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('SCAC code')}</Label>
            <Input
              type="text"
              placeholder={t('e.g. ODFL')}
              maxLength={4}
              value={scacCode}
              onChange={e => setScacCode(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'Standard Carrier Alpha Code — required for EDI 204/214/210 with this carrier.'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            {t('PRO number format')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('Starting characters')}</Label>
            <Input type="text" placeholder={t('e.g. RPL-')} value={proNumberPrefix} onChange={e => setProNumberPrefix(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {t(
                'Pre-fills into the PRO number field when this carrier is assigned to a shipment.'
              )}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t('Usual min length')}</Label>
            <Input type="number" min={1} placeholder={t('e.g. 7')} value={proNumberMinLength} onChange={e => setProNumberMinLength(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Usual max length')}</Label>
            <Input type="number" min={1} placeholder={t('e.g. 10')} value={proNumberMaxLength} onChange={e => setProNumberMaxLength(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={proNumberNumericOnly}
                onChange={e => setProNumberNumericOnly(e.target.checked)}
                className="h-4 w-4 rounded border border-input bg-background accent-primary"
              />
              {t('Digits only')}
            </label>
            <p className="text-xs text-muted-foreground">
              {t(
                'Shown as a warning, not enforced — a PRO number that doesn\'t match can still be saved.'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {t('Contact')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('Contact name')}</Label>
            <Input type="text" placeholder={t('Full name')} value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Email')}</Label>
            <Input type="email" placeholder={t('email@example.com')} value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Phone')}</Label>
            <Input type="tel" placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('Address')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>{t('Address 1')}</Label>
            <Input type="text" placeholder={t('Street address')} value={address1} onChange={e => setAddress1(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t('Address 2')}</Label>
            <Input type="text" placeholder={t('Suite, unit, etc.')} value={address2} onChange={e => setAddress2(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('City')}</Label>
            <Input type="text" placeholder={t('City')} value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('State')}</Label>
            <Input type="text" placeholder={t('State / Province')} value={state} onChange={e => setState(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Postal code')}</Label>
            <Input type="text" placeholder="00000" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Country')}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">{t('United States')}</SelectItem>
                <SelectItem value="CA">{t('Canada')}</SelectItem>
                <SelectItem value="MX">{t('Mexico')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            {t('Equipment & capabilities')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('Equipment types')}</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {EQUIPMENT_TYPES.map(eq => (
                <label key={eq.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={equipment[eq.key]}
                    onChange={() => toggleEquipment(eq.key)}
                    className="h-4 w-4 rounded border border-input bg-background accent-primary"
                  />
                  {eq.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('Service mode')}</Label>
            <div className="mt-2 flex gap-4">
              {['FTL', 'LTL', 'Both'].map(mode => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="serviceMode"
                    value={mode}
                    checked={serviceMode === mode}
                    onChange={e => setServiceMode(e.target.value)}
                    className="h-4 w-4 border border-input bg-background accent-primary"
                  />
                  {mode}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            {t('Payment terms')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('Payment terms (days)')}</Label>
            <Select value={paymentTermsDays} onValueChange={setPaymentTermsDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">{t('Net 15')}</SelectItem>
                <SelectItem value="30">{t('Net 30')}</SelectItem>
                <SelectItem value="45">{t('Net 45')}</SelectItem>
                <SelectItem value="60">{t('Net 60')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('Currency')}</Label>
            <Select value={carrierCurrency} onValueChange={setCarrierCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">{t('USD')}</SelectItem>
                <SelectItem value="EUR">{t('EUR')}</SelectItem>
                <SelectItem value="GBP">{t('GBP')}</SelectItem>
                <SelectItem value="CAD">{t('CAD')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('Insurance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('Insurance amount')}</Label>
            <Input type="number" placeholder="1000000" value={insuranceAmount} onChange={e => setInsuranceAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Expiry date')}</Label>
            <DatePicker type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t('Notes')}</Label>
            <textarea
              rows={3}
              placeholder={t('Additional insurance notes...')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <CircleAlert className="h-5 w-5" />
          {submitError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/carriers">{t('Cancel')}</Link>
        </Button>
        <Button variant="gradient" onClick={handleSubmit} disabled={submitting}>
          <Save className="h-4 w-4" />
          {submitting ? t('Saving...') : isEdit ? 'Update carrier' : 'Save carrier'}
        </Button>
      </div>
    </div>
  );
}
