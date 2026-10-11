import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  Info,
  Loader2,
  Map as MapIcon,
  MapPin,
  Plus,
  Route,
  Save,
  Trash2,
} from 'lucide-react';

import { API_URL } from '../api';
import RouteEditor from '../components/RouteEditor';
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

import { t } from '@/i18n';

interface Stop {
  id: number;
  location: string;
  order: number;
  purpose: string;
}

// Informational only — doesn't affect routing/rating, just labels what a
// hub-and-spoke stop is for.
const STOP_PURPOSES = [
  { key: 'pickup', label: t('Pickup') },
  { key: 'dropoff', label: t('Dropoff') },
  { key: 'cross_dock', label: t('Cross-dock') },
  { key: 'fuel', label: t('Fuel') },
  { key: 'rest', label: t('Rest') },
  { key: 'hub', label: t('Hub') },
  { key: 'customs', label: t('Customs') },
  { key: 'other', label: t('Other') },
];

interface RouteData {
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
  summary: string;
  waypoints: Array<{ lat: number; lng: number }>;
  /** 'google' follows the road network; 'manual' follows the line the planner drew. */
  provider: 'google' | 'manual';
}

let stopIdCounter = 0;

export default function VNextCreateLane() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('mi');
  const [targetRate, setTargetRate] = useState('');
  const [rateCurrency, setRateCurrency] = useState('USD');
  const [serviceLevel, setServiceLevel] = useState('FTL');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);

  const [apiLocations, setApiLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [corridorMeters, setCorridorMeters] = useState(5000);
  const [existingRoute, setExistingRoute] = useState<any>(null);
  const [savingRoute, setSavingRoute] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/locations`).then(r => r.json())
      .then(json => setApiLocations(json.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/api/v1/lanes/${id}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(json => {
        const l = json.data;
        if (!l) return;
        setOrigin(l.originId || '');
        setDestination(l.destinationId || '');
        setDistance(l.distance != null ? String(l.distance) : '');
        setNotes(l.notes || '');
        setServiceLevel(l.serviceLevel || 'FTL');
        if (l.stops && l.stops.length > 0) {
          setStops(l.stops.map((s: any, i: number) => {
            stopIdCounter += 1;
            return { id: stopIdCounter, location: s.locationId || '', order: s.order || i + 1, purpose: s.purpose || '' };
          }));
        }
        if (l.route) {
          setExistingRoute(l.route);
          setCorridorMeters(l.route.corridorMeters || 5000);
        }
      })
      .catch(err => setSubmitError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const body: any = {
        originId: origin, destinationId: destination,
        distance: distance ? parseFloat(distance) : undefined,
        notes, serviceLevel,
        stops: stops.filter(s => s.location).map(s => ({ locationId: s.location, order: s.order, purpose: s.purpose || undefined })),
      };
      const url = isEdit ? `${API_URL}/api/v1/lanes/${id}` : `${API_URL}/api/v1/lanes`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save lane');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const savedLaneId = json.data?.id || id;

      if (routeData && savedLaneId) {
        setSavingRoute(true);
        try {
          await fetch(`${API_URL}/api/v1/lanes/${savedLaneId}/route`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encodedPolyline: routeData.encodedPolyline,
              distanceMeters: routeData.distanceMeters,
              durationSeconds: routeData.durationSeconds,
              summary: routeData.summary,
              corridorMeters,
              waypoints: routeData.waypoints,
              provider: routeData.provider,
            }),
          });
        } catch {
          console.warn('Failed to save route data');
        }
        setSavingRoute(false);
      }

      const label = json.data?.name || savedLaneId?.slice(0, 8) || 'lane';
      if (isEdit) {
        toast.success(`Lane ${label} updated`);
      } else {
        toast.success(`Lane ${label} created`, {
          action: savedLaneId
            ? { label: t('View'), onClick: () => navigate(`/lanes/${savedLaneId}`) }
            : undefined,
        });
      }
      navigate('/lanes');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const originLoc = apiLocations.find(l => l.id === origin);
  const destLoc = apiLocations.find(l => l.id === destination);
  const originLabel = originLoc?.name || '';
  const destLabel = destLoc?.name || '';

  const originLatLng = originLoc?.lat && originLoc?.lng
    ? { lat: originLoc.lat, lng: originLoc.lng }
    : null;
  const destLatLng = destLoc?.lat && destLoc?.lng
    ? { lat: destLoc.lat, lng: destLoc.lng }
    : null;

  const stopLatLngs = stops
    .filter(s => s.location)
    .map(s => {
      const loc = apiLocations.find(l => l.id === s.location);
      return loc?.lat && loc?.lng ? { lat: loc.lat, lng: loc.lng } : null;
    })
    .filter(Boolean) as Array<{ lat: number; lng: number }>;

  const addStop = () => {
    stopIdCounter += 1;
    setStops(prev => [...prev, { id: stopIdCounter, location: '', order: prev.length + 1, purpose: '' }]);
  };

  const updateStop = (sid: number, field: keyof Stop, value: string | number) => {
    setStops(prev => prev.map(s => s.id === sid ? { ...s, [field]: value } : s));
  };

  const removeStop = (sid: number) => {
    setStops(prev => prev.filter(s => s.id !== sid).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleRouteChange = (route: RouteData) => {
    setRouteData(route);
    const distanceMiles = (route.distanceMeters / 1609.34).toFixed(1);
    setDistance(distanceMiles);
    setDistanceUnit('mi');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/lanes" className="hover:text-foreground">
          <ArrowLeft className="inline h-4 w-4" /> {t('Lanes')}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{isEdit ? t('Edit lane') : t('New lane')}</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">{isEdit ? t('Edit lane') : t('New lane')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            {t('Route')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('Origin location')}</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select origin...')} />
                </SelectTrigger>
                <SelectContent>
                  {apiLocations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name} - {loc.city}, {loc.state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Destination location')}</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select destination...')} />
                </SelectTrigger>
                <SelectContent>
                  {apiLocations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name} - {loc.city}, {loc.state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(origin || destination) && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-sm font-medium">{originLabel || t('Origin')}</span>
              </div>
              <div className="h-px flex-1 bg-border" />
              {stops.length > 0 && stops.map((stop, i) => {
                const stopLabel = apiLocations.find(l => l.id === stop.location)?.name || `Stop ${i + 1}`;
                const purposeLabel = STOP_PURPOSES.find(p => p.key === stop.purpose)?.label;
                return (
                  <React.Fragment key={stop.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                      <span className="text-xs text-muted-foreground">
                        {stopLabel}{purposeLabel ? ` (${purposeLabel})` : ''}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                  </React.Fragment>
                );
              })}
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                <span className="text-sm font-medium">{destLabel || t('Destination')}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" />
            {t('Planned route')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              'The planned route is used for deviation detection. Select origin and destination locations with coordinates to auto-calculate the route.'
            )}
            {originLatLng && destLatLng && ' Drag the blue route line on the map to adjust the planned path.'}
          </p>

          <RouteEditor
            origin={originLatLng}
            destination={destLatLng}
            stops={stopLatLngs}
            existingPolyline={existingRoute?.encodedPolyline}
            corridorMeters={corridorMeters}
            onRouteChange={handleRouteChange}
            height={400}
            editable={true}
          />

          {(routeData || existingRoute) && (
            <div className="max-w-md space-y-2">
              <Label>{t('Deviation corridor (meters)')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={100}
                  max={50000}
                  step={500}
                  value={corridorMeters}
                  onChange={e => setCorridorMeters(parseInt(e.target.value) || 5000)}
                />
                <span className="whitespace-nowrap text-xs text-muted-foreground">({(corridorMeters / 1000).toFixed(1)} {t('km /')} {(corridorMeters / 1609.34).toFixed(1)} {t('mi)')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Alerts trigger when a shipment moves further than this distance from the planned route'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {t('Details')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('Distance')}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                className="flex-1"
              />
              <Select value={distanceUnit} onValueChange={setDistanceUnit}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mi">{t('mi')}</SelectItem>
                  <SelectItem value="km">{t('km')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {routeData && (
              <p className="text-xs text-success">{t('Auto-calculated from route')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('Target rate')}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={targetRate}
                onChange={e => setTargetRate(e.target.value)}
                className="flex-1"
              />
              <Select value={rateCurrency} onValueChange={setRateCurrency}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">{t('USD')}</SelectItem>
                  <SelectItem value="EUR">{t('EUR')}</SelectItem>
                  <SelectItem value="GBP">{t('GBP')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Service level')}</Label>
            <Select value={serviceLevel} onValueChange={setServiceLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FTL">{t('FTL')}</SelectItem>
                <SelectItem value="LTL">{t('LTL')}</SelectItem>
                <SelectItem value="Both">{t('Both')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t('Notes')}</Label>
            <textarea
              rows={3}
              placeholder={t('Additional lane notes...')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('Stops (hub & spoke)')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t(
              'Add intermediate stops for hub-and-spoke routing. These become waypoints in the planned route.'
            )}
          </p>

          {stops.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('No intermediate stops added. Click below to add one.')}
            </p>
          )}

          {stops.map((stop) => (
            <div key={stop.id} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>{t('Location')}</Label>
                <Select value={stop.location} onValueChange={v => updateStop(stop.id, 'location', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select location...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {apiLocations.map((loc: any) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name} - {loc.city}, {loc.state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-2">
                <Label>{t('Order')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={stop.order}
                  onChange={e => updateStop(stop.id, 'order', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="w-40 space-y-2">
                <Label>{t('Tag')}</Label>
                <Select value={stop.purpose} onValueChange={v => updateStop(stop.id, 'purpose', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('No tag')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STOP_PURPOSES.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeStop(stop.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div>
            <Button variant="outline" onClick={addStop}>
              <Plus className="h-4 w-4" />
              {t('Add stop')}
            </Button>
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
          <Link to="/lanes">{t('Cancel')}</Link>
        </Button>
        <Button variant="gradient" onClick={handleSubmit} disabled={submitting || savingRoute}>
          <Save className="h-4 w-4" />
          {submitting || savingRoute ? t('Saving...') : isEdit ? 'Update lane' : 'Create lane'}
        </Button>
      </div>
    </div>
  );
}
