import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentPosition } from '@/lib/geolocation';
import { validateSOSSignal, sanitizeInput } from '@/lib/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, AlertTriangle, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';

const SOS = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [formData, setFormData] = useState({
    type: 'flood_trap',
    severityLevel: 3,
    victimCount: 1,
    description: '',
    contact_phone: '',
    contact_line_id: '',
  });

  // Fetch user profile to pre-populate contact info
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('phone, line_id')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        setFormData(prev => ({
          ...prev,
          contact_phone: data.phone || '',
          contact_line_id: data.line_id || '',
        }));
      }
    };
    
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error(t('sos.loginRequired'));
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
      toast.success(t('sos.locationAcquired'));
    } catch (error: any) {
      setLocationLoading(false);
      toast.error(t('sos.locationError'), {
        description: t('sos.tryReloadLocation'),
        action: {
          label: t('sos.retry'),
          onClick: fetchLocation,
        },
      });
    }
  };

  const sendQuickSOS = async () => {
    if (!user) {
      toast.error(t('sos.loginRequired'));
      navigate('/auth');
      return;
    }

    if (!userLocation) {
      toast.error(t('sos.noLocation'));
      return;
    }

    // Validate data
    const validation = validateSOSSignal({
      severity_level: 5,
      type: 'flood_trap',
      location: { lng: userLocation.longitude, lat: userLocation.latitude },
      description: 'Quick Emergency SOS'
    });

    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setLoading(true);

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    try {
      const { error } = await supabase.from('sos_signals').insert([{
        user_id: user.id,
        location: `POINT(${userLocation.longitude} ${userLocation.latitude})` as any,
        accuracy_meters: userLocation.accuracy,
        type: 'flood_trap',
        severity_level: 5,
        victim_count: 1,
        description: 'Quick Emergency SOS',
        status: 'active' as any,
      }]);

      if (error) throw error;

      toast.success(t('sos.success'));
      setTimeout(() => navigate('/rescue-map'), 1500);
    } catch (error) {
      toast.error(t('sos.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(t('sos.loginRequired'));
      navigate('/auth');
      return;
    }

    if (!userLocation) {
      toast.error(t('sos.noLocation'));
      return;
    }

    // Validate and sanitize input
    const sanitizedDescription = sanitizeInput(formData.description);
    
    const validation = validateSOSSignal({
      severity_level: formData.severityLevel,
      type: formData.type,
      location: { lng: userLocation.longitude, lat: userLocation.latitude },
      description: sanitizedDescription
    });

    if (!validation.isValid) {
      toast.error(validation.error);
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
        description: sanitizedDescription,
        contact_phone: formData.contact_phone || null,
        contact_line_id: formData.contact_line_id || null,
        status: 'active' as any,
      }]);

      if (error) throw error;

      toast.success(t('sos.success'));
      navigate('/');
    } catch (error) {
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

  // Mobile-first quick SOS view
  if (isMobile && !showDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/30 to-background flex flex-col p-4 pb-28 overflow-y-auto">
          <Button variant="ghost" onClick={() => navigate('/')} className="self-start mb-4">
          <ArrowLeft className="mr-2 h-5 w-5" />
          {t('common.back')}
        </Button>

        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          {/* Giant Quick Emergency Button */}
          <button
            onClick={sendQuickSOS}
            disabled={!userLocation || loading || locationLoading}
            className="w-72 h-72 rounded-full bg-destructive text-destructive-foreground shadow-2xl animate-pulse-sos disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform"
          >
            <AlertTriangle className="w-32 h-32 animate-pulse" />
            <span className="text-3xl font-bold uppercase">{t('mobileSOS.quickEmergency')}</span>
          </button>

          {/* Location Status */}
          <div className="text-center space-y-2">
            {userLocation ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                <MapPin className="h-5 w-5 text-primary" />
                {t('sos.locationAccuracy')}: {Math.round(userLocation.accuracy)}m
              </p>
            ) : locationLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('sos.acquiringLocation')}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{t('sos.noLocation')}</p>
                <Button onClick={fetchLocation} variant="outline" size="lg">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  {t('sos.retry')}
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-base text-muted-foreground max-w-xs">
            {t('mobileSOS.tapToSend')}
          </p>

          {/* Add Details Option - Now more prominent */}
          <Card className="w-full max-w-md bg-primary/10 border-2 border-primary">
            <CardContent className="pt-6 pb-6">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-primary">{t('profile.addContactDetails')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('profile.contactDetailsDesc')}
                </p>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setShowDetails(true)}
                  className="w-full"
                >
                  <ChevronDown className="mr-2 h-5 w-5" />
                  {t('mobileSOS.moreDetails')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Desktop or detailed form view
  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/30 to-background p-4 pb-28 md:pb-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <Button variant="ghost" onClick={() => isMobile && showDetails ? setShowDetails(false) : navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isMobile && showDetails ? t('common.back') : t('common.back')}
        </Button>

        <Card className="border-2 border-destructive">
          <CardHeader className="bg-destructive text-destructive-foreground">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertTriangle className="h-8 w-8 animate-pulse" />
              {t('sos.emergency')}
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
                  <span className="text-destructive">{t('sos.noLocation')}</span>
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
                  {t('sos.retry')}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('sos.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flood_trap">{t('emergencyTypes.flood_trap')}</SelectItem>
                  <SelectItem value="medical_emergency">{t('emergencyTypes.medical_emergency')}</SelectItem>
                  <SelectItem value="food_water">{t('emergencyTypes.food_water')}</SelectItem>
                  <SelectItem value="evacuation">{t('emergencyTypes.evacuation')}</SelectItem>
                  <SelectItem value="power_outage">{t('emergencyTypes.power_outage')}</SelectItem>
                  <SelectItem value="structural_collapse">{t('emergencyTypes.structural_collapse')}</SelectItem>
                  <SelectItem value="fire">{t('emergencyTypes.fire')}</SelectItem>
                  <SelectItem value="other">{t('emergencyTypes.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('sos.severity')} (1-5)</Label>
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
              <Label className="text-base font-semibold">{t('sos.people')}</Label>
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
              <Label className="text-base font-semibold">{t('sos.description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('sos.descriptionPlaceholder')}
                className="min-h-24"
              />
            </div>

            {/* Contact Information Section - Prominent */}
            <Card className="bg-primary/5 border-2 border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {t('profile.contactInfo')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('profile.contactDetailsDesc')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{t('profile.phone')}</Label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+66 XXX XXX XXX"
                    className="w-full h-12 px-3 rounded-md border border-input bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <span className="text-[#06C755]">LINE</span> ID
                  </Label>
                  <input
                    type="text"
                    value={formData.contact_line_id}
                    onChange={(e) => setFormData({ ...formData, contact_line_id: e.target.value })}
                    placeholder="@yourlineid"
                    className="w-full h-12 px-3 rounded-md border border-input bg-background"
                  />
                </div>
              </CardContent>
            </Card>

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
