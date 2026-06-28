import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EARTHQUAKE_EPICENTERS, affectedZoneGeoJSON } from '@/data/earthquake-epicenters';

interface DamageReport {
  id: string;
  location: unknown;
  lng?: number;
  lat?: number;
  address: string | null;
  damage_type: string;
  severity: number;
  description: string | null;
  created_at: string;
}

const DAMAGE_TYPES = ['building_collapse', 'building_damage', 'road_damage', 'bridge_damage', 'other'];

const severityColor = (s: number) => (s >= 5 ? '#7f1d1d' : s >= 4 ? '#dc2626' : s >= 3 ? '#ea580c' : s >= 2 ? '#ca8a04' : '#16a34a');

const osmStyle = {
  version: 8 as const,
  sources: {
    osm: { type: 'raster' as const, tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

const DamageMap = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ damage_type: 'building_damage', severity: '3', description: '', address: '' });

  // Parse "POINT(lng lat)" WKT (or GeoJSON) into coords
  const toLngLat = (loc: unknown): { lng: number; lat: number } | null => {
    if (typeof loc === 'string') {
      const m = loc.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
      if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
    }
    if (loc && typeof loc === 'object' && 'coordinates' in (loc as any)) {
      const c = (loc as any).coordinates;
      if (Array.isArray(c)) return { lng: c[0], lat: c[1] };
    }
    return null;
  };

  const fetchReports = async () => {
    const { data, error } = await (supabase as any)
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const parsed: DamageReport[] = (data || []).map((r: any) => {
      const ll = toLngLat(r.location);
      return { ...r, lng: ll?.lng, lat: ll?.lat };
    });
    setReports(parsed);
  };

  // Init map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: osmStyle,
      center: [-67.0, 10.45],
      zoom: 8,
    });
    m.addControl(new maplibregl.NavigationControl({}), 'top-right');
    m.on('load', () => {
      map.current = m;
      // affected-zone + epicenters context
      m.addSource('affected-zone', { type: 'geojson', data: affectedZoneGeoJSON() as any });
      m.addLayer({ id: 'az-fill', type: 'fill', source: 'affected-zone', paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.05 } });
      m.addLayer({ id: 'az-line', type: 'line', source: 'affected-zone', paint: { 'line-color': '#dc2626', 'line-opacity': 0.2, 'line-width': 1 } });
      EARTHQUAKE_EPICENTERS.forEach((eq) => {
        const el = document.createElement('div');
        el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:rgba(220,38,38,0.3);border:2px solid #dc2626;';
        new maplibregl.Marker({ element: el }).setLngLat([eq.lng, eq.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<strong>Epicentro M${eq.magnitude}</strong>`))
          .addTo(m);
      });
      fetchReports();
    });
    return () => { m.remove(); map.current = null; };
  }, []);

  // Realtime refresh
  useEffect(() => {
    const ch = supabase.channel('damage_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'damage_reports' }, () => fetchReports())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  // Render markers when reports change
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    reports.forEach((r) => {
      if (r.lng === undefined || r.lat === undefined) return;
      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${severityColor(r.severity)};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;`;
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-size:12px"><strong>${t(`damage.types.${r.damage_type}`)}</strong> · ${t('damage.severity')} ${r.severity}/5<br/>${r.address ? r.address + '<br/>' : ''}${r.description ? r.description.replace(/</g, '&lt;') : ''}</div>`
      );
      const mk = new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).setPopup(popup).addTo(map.current!);
      markers.current.push(mk);
    });
  }, [reports, t]);

  const openReport = () => {
    if (!user) {
      toast.error(t('sos.loginRequired'));
      navigate('/auth');
      return;
    }
    setDialogOpen(true);
  };

  const submitReport = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      ).catch(() => null);

      const center = map.current?.getCenter();
      const lng = pos?.coords.longitude ?? center?.lng ?? -67.0;
      const lat = pos?.coords.latitude ?? center?.lat ?? 10.45;

      const { error } = await (supabase as any).from('damage_reports').insert([{
        reporter_id: user.id,
        location: `POINT(${lng} ${lat})`,
        address: form.address || null,
        damage_type: form.damage_type,
        severity: parseInt(form.severity, 10),
        description: form.description || null,
        status: 'reported',
      }]);
      if (error) throw error;
      toast.success(t('damage.reported'));
      setDialogOpen(false);
      setForm({ damage_type: 'building_damage', severity: '3', description: '', address: '' });
      fetchReports();
    } catch (e: any) {
      toast.error(e.message || t('damage.reportError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">{t('damage.title')}</h1>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{reports.length}</span>
      </div>

      <div className="relative flex-1">
        <div ref={mapContainer} className="absolute inset-0" />
        <Button onClick={openReport} className="absolute bottom-24 right-4 shadow-lg gap-2">
          <Plus className="h-4 w-4" /> {t('damage.report')}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>{t('damage.report')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('damage.type')}</Label>
              <Select value={form.damage_type} onValueChange={(v) => setForm({ ...form, damage_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((dt) => (
                    <SelectItem key={dt} value={dt}>{t(`damage.types.${dt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('damage.severity')}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}/5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('damage.address')}</Label>
              <input
                className="w-full h-11 px-3 rounded-md border border-input bg-background"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t('damage.addressPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('damage.description')}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">{t('damage.locationNote')}</p>
          </div>
          <DialogFooter>
            <Button onClick={submitReport} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('damage.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DamageMap;
