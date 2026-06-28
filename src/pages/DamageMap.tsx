import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Building2, Loader2, MapPin } from 'lucide-react';
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
  photo_url: string | null;
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
  const pickMarker = useRef<maplibregl.Marker | null>(null);
  const pickModeRef = useRef(false);

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<{ lng: number; lat: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sevFilter, setSevFilter] = useState('all');
  const [form, setForm] = useState({ damage_type: 'building_damage', severity: '3', description: '', address: '' });

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
    setReports((data || []).map((r: any) => ({ ...r, ...(toLngLat(r.location) || {}) })));
  };

  // Init map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const m = new maplibregl.Map({ container: mapContainer.current, style: osmStyle, center: [-67.0, 10.45], zoom: 8 });
    m.addControl(new maplibregl.NavigationControl({}), 'top-right');
    m.on('load', () => {
      map.current = m;
      m.addSource('affected-zone', { type: 'geojson', data: affectedZoneGeoJSON() as any });
      m.addLayer({ id: 'az-fill', type: 'fill', source: 'affected-zone', paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.05 } });
      m.addLayer({ id: 'az-line', type: 'line', source: 'affected-zone', paint: { 'line-color': '#dc2626', 'line-opacity': 0.2, 'line-width': 1 } });
      EARTHQUAKE_EPICENTERS.forEach((eq) => {
        const el = document.createElement('div');
        el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:rgba(220,38,38,0.3);border:2px solid #dc2626;';
        new maplibregl.Marker({ element: el }).setLngLat([eq.lng, eq.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<strong>Epicentro M${eq.magnitude}</strong>`)).addTo(m);
      });
      fetchReports();
    });
    // Tap-to-place handler (reads ref to avoid stale closure)
    m.on('click', (e) => {
      if (!pickModeRef.current) return;
      const ll = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      setPicked(ll);
      if (pickMarker.current) pickMarker.current.remove();
      pickMarker.current = new maplibregl.Marker({ color: '#2563eb' }).setLngLat([ll.lng, ll.lat]).addTo(m);
      pickModeRef.current = false;
      setPickMode(false);
      setDialogOpen(true);
    });
    return () => { m.remove(); map.current = null; };
  }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('damage_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'damage_reports' }, () => fetchReports())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  const filtered = reports.filter(
    (r) => (typeFilter === 'all' || r.damage_type === typeFilter) && (sevFilter === 'all' || r.severity === parseInt(sevFilter, 10))
  );

  // Render markers
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    filtered.forEach((r) => {
      if (r.lng === undefined || r.lat === undefined) return;
      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${severityColor(r.severity)};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;`;
      const img = r.photo_url ? `<img src="${r.photo_url}" style="max-width:200px;border-radius:6px;margin-top:4px"/>` : '';
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-size:12px;max-width:220px"><strong>${t(`damage.types.${r.damage_type}`)}</strong> · ${t('damage.severity')} ${r.severity}/5<br/>${r.address ? r.address + '<br/>' : ''}${r.description ? r.description.replace(/</g, '&lt;') : ''}${img}</div>`
      );
      markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).setPopup(popup).addTo(map.current!));
    });
  }, [filtered, t]);

  const openReport = () => {
    if (!user) {
      toast.error(t('sos.loginRequired'));
      navigate('/auth');
      return;
    }
    setDialogOpen(true);
  };

  const startPick = () => {
    setDialogOpen(false);
    pickModeRef.current = true;
    setPickMode(true);
  };

  const resetForm = () => {
    setForm({ damage_type: 'building_damage', severity: '3', description: '', address: '' });
    setPhotoFile(null);
    setPicked(null);
    if (pickMarker.current) { pickMarker.current.remove(); pickMarker.current = null; }
  };

  const submitReport = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      let lng: number, lat: number;
      if (picked) {
        ({ lng, lat } = picked);
      } else {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        ).catch(() => null);
        const center = map.current?.getCenter();
        lng = pos?.coords.longitude ?? center?.lng ?? -67.0;
        lat = pos?.coords.latitude ?? center?.lat ?? 10.45;
      }

      let photo_url: string | null = null;
      if (photoFile) {
        const path = `${user.id}/${Date.now()}-${photoFile.name.replace(/[^\w.-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('damage-photos').upload(path, photoFile);
        if (!upErr) {
          photo_url = supabase.storage.from('damage-photos').getPublicUrl(path).data.publicUrl;
        }
      }

      const { error } = await (supabase as any).from('damage_reports').insert([{
        reporter_id: user.id,
        location: `POINT(${lng} ${lat})`,
        address: form.address || null,
        damage_type: form.damage_type,
        severity: parseInt(form.severity, 10),
        description: form.description || null,
        photo_url,
        status: 'reported',
      }]);
      if (error) throw error;
      toast.success(t('damage.reported'));
      setDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (e: any) {
      toast.error(e.message || t('damage.reportError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">{t('damage.title')}</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder={t('damage.filterType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('damage.all')}</SelectItem>
              {DAMAGE_TYPES.map((dt) => <SelectItem key={dt} value={dt}>{t(`damage.types.${dt}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sevFilter} onValueChange={setSevFilter}>
            <SelectTrigger className="h-8 w-auto text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('damage.all')}</SelectItem>
              {[1, 2, 3, 4, 5].map((s) => <SelectItem key={s} value={String(s)}>{s}/5</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length}</span>
        </div>
      </div>

      <div className="relative flex-1">
        <div ref={mapContainer} className="absolute inset-0" />
        {pickMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {t('damage.pickInstruction')}
          </div>
        )}
        {!pickMode && (
          <Button onClick={openReport} className="absolute bottom-24 right-4 shadow-lg gap-2">
            <Plus className="h-4 w-4" /> {t('damage.report')}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('damage.report')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('damage.type')}</Label>
              <Select value={form.damage_type} onValueChange={(v) => setForm({ ...form, damage_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAMAGE_TYPES.map((dt) => <SelectItem key={dt} value={dt}>{t(`damage.types.${dt}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('damage.severity')}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((s) => <SelectItem key={s} value={String(s)}>{s}/5</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('damage.address')}</Label>
              <input className="w-full h-11 px-3 rounded-md border border-input bg-background" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('damage.addressPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('damage.description')}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t('damage.photo')}</Label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5" />
            </div>
            <Button type="button" variant="outline" onClick={startPick} className="w-full gap-2">
              <MapPin className="h-4 w-4" /> {picked ? `${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}` : t('damage.pickOnMap')}
            </Button>
            {!picked && <p className="text-xs text-muted-foreground">{t('damage.locationNote')}</p>}
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
