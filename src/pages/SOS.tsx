import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition } from '@/lib/geolocation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SOS = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [formData, setFormData] = useState({
    type: 'flood_trap',
    severityLevel: 3,
    victimCount: 1,
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Debes iniciar sesión para enviar una señal SOS');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchLocation();
  }, [t]);

  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await getCurrentPosition();
      setUserLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      });
      setLocationLoading(false);
      toast.success('Ubicación adquirida');
    } catch (error: any) {
      console.error('Geolocation error:', error);
      setLocationLoading(false);
      toast.error('Error de ubicación', {
        description: 'Intenta recargar tu ubicación',
        action: {
          label: 'Reintentar',
          onClick: fetchLocation,
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Debes iniciar sesión');
      navigate('/auth');
      return;
    }

    if (!userLocation) {
      toast.error(t('sos.noLocation'));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('sos_signals').insert([{
        user_id: user.id,
        location: `POINT(${userLocation.longitude} ${userLocation.latitude})` as any,
        accuracy_meters: userLocation.accuracy,
        type: formData.type as any,
        severity_level: formData.severityLevel,
        victim_count: formData.victimCount,
        description: formData.description,
        status: 'active' as any,
      }]);

      if (error) throw error;

      toast.success(t('sos.success'));
      navigate('/');
    } catch (error) {
      console.error('Error sending SOS:', error);
      toast.error(t('sos.error'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/30 to-background p-4">
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <Card className="border-2 border-destructive">
          <CardHeader className="bg-destructive text-destructive-foreground">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertTriangle className="h-8 w-8 animate-pulse" />
              {t('sos_emergency')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {userLocation ? (
                  <span>
                    {t('sos.locationAccuracy')}: {Math.round(userLocation.accuracy)}m
                  </span>
                ) : locationLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('sos.acquiringLocation')}
                  </span>
                ) : (
                  <span className="text-destructive">Ubicación no disponible</span>
                )}
              </div>
              {!userLocation && !locationLoading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchLocation}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('sos_type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flood_trap">{t('flood_trap')}</SelectItem>
                  <SelectItem value="medical_emergency">{t('medical_emergency')}</SelectItem>
                  <SelectItem value="food_water">{t('food_water')}</SelectItem>
                  <SelectItem value="evacuation">{t('evacuation')}</SelectItem>
                  <SelectItem value="power_outage">{t('power_outage')}</SelectItem>
                  <SelectItem value="structural_collapse">{t('structural_collapse')}</SelectItem>
                  <SelectItem value="fire">{t('fire')}</SelectItem>
                  <SelectItem value="other">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('sos_severity')} (1-5)</Label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={formData.severityLevel === level ? 'destructive' : 'outline'}
                    onClick={() => setFormData({ ...formData, severityLevel: level })}
                    className="h-14 text-xl font-bold"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('sos_people')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 5, 10, 15, 20, 30].map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={formData.victimCount === count ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, victimCount: count })}
                    className="h-12"
                  >
                    {count}+
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('sos_description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('sos.descriptionPlaceholder')}
                className="min-h-24"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!userLocation || loading || locationLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('sos.sending')}
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  {t('sos.sendSOS')}
                </>
              )}
            </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SOS;
