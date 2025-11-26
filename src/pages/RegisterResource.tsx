import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, validatePhone } from '@/lib/validation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const RegisterResource = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'boat_small' as const,
    status: 'available' as const,
    capacity: '',
    available_now: true,
    volunteer_operator: '',
    contact_info: '',
    license_plate: '',
    notes: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        toast.error(t('resources.locationError'));
      }
    );
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!currentLocation) {
      toast.error(t('resources.locationRequired'));
      return;
    }

    // Validate and sanitize inputs
    const sanitizedName = sanitizeInput(formData.name.trim());
    const sanitizedVolunteer = formData.volunteer_operator ? sanitizeInput(formData.volunteer_operator.trim()) : null;
    const sanitizedContact = formData.contact_info ? sanitizeInput(formData.contact_info.trim()) : null;
    const sanitizedLicense = formData.license_plate ? sanitizeInput(formData.license_plate.trim()) : null;
    const sanitizedNotes = formData.notes ? sanitizeInput(formData.notes.trim()) : null;

    if (sanitizedName.length < 3) {
      toast.error('Resource name must be at least 3 characters');
      return;
    }

    if (sanitizedContact && !validatePhone(sanitizedContact).isValid) {
      toast.error('Invalid phone number format');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('resources').insert({
        name: sanitizedName,
        type: formData.type,
        status: formData.status,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        available_now: formData.available_now,
        volunteer_operator: sanitizedVolunteer,
        contact_info: sanitizedContact,
        license_plate: sanitizedLicense,
        notes: sanitizedNotes,
        owner_id: user.id,
        current_location: `POINT(${currentLocation.lng} ${currentLocation.lat})`,
      });

      if (error) throw error;

      toast.success(t('resources.registerSuccess'));
      navigate('/resources');
    } catch (error) {
      toast.error(t('resources.registerError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-2 md:p-4 pb-28 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-3 md:space-y-6 py-2 md:py-8">
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/resources')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl md:text-3xl">{t('resources.registerTitle')}</CardTitle>
                <CardDescription className="text-sm md:text-base">{t('resources.registerDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('resources.resourceDetails')}</CardTitle>
            <CardDescription>{t('resources.fillDetails')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('resources.resourceName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('resources.namePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('resources.resourceType')} *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boat_small">{t('resources.types.boat_small')}</SelectItem>
                    <SelectItem value="boat_large">{t('resources.types.boat_large')}</SelectItem>
                    <SelectItem value="4x4_truck">{t('resources.types.4x4_truck')}</SelectItem>
                    <SelectItem value="helicopter">{t('resources.types.helicopter')}</SelectItem>
                    <SelectItem value="drone">{t('resources.types.drone')}</SelectItem>
                    <SelectItem value="generator">{t('resources.types.generator')}</SelectItem>
                    <SelectItem value="food_stock">{t('resources.types.food_stock')}</SelectItem>
                    <SelectItem value="medical_kit">{t('resources.types.medical_kit')}</SelectItem>
                    <SelectItem value="water_supply">{t('resources.types.water_supply')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">{t('resources.capacity')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder={t('resources.capacityPlaceholder')}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_plate">{t('resources.licensePlate')}</Label>
                <Input
                  id="license_plate"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  placeholder={t('resources.licensePlatePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="volunteer_operator">{t('resources.operator')}</Label>
                <Input
                  id="volunteer_operator"
                  value={formData.volunteer_operator}
                  onChange={(e) => setFormData({ ...formData, volunteer_operator: e.target.value })}
                  placeholder={t('resources.operatorPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_info">{t('resources.contactInfo')}</Label>
                <Input
                  id="contact_info"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  placeholder={t('resources.contactPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('resources.status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{t('resources.statuses.available')}</SelectItem>
                    <SelectItem value="busy">{t('resources.statuses.busy')}</SelectItem>
                    <SelectItem value="maintenance">{t('resources.statuses.maintenance')}</SelectItem>
                    <SelectItem value="out_of_fuel">{t('resources.statuses.out_of_fuel')}</SelectItem>
                    <SelectItem value="offline">{t('resources.statuses.offline')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="available_now">{t('resources.availableNow')}</Label>
                <Switch
                  id="available_now"
                  checked={formData.available_now}
                  onCheckedChange={(checked) => setFormData({ ...formData, available_now: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('resources.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('resources.notesPlaceholder')}
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {submitting ? t('common.loading') : t('resources.registerButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterResource;
