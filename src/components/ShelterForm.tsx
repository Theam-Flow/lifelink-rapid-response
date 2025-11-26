import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { validateShelter, validatePhone, sanitizeInput } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, X, Loader2, MapPin } from 'lucide-react';

interface ShelterFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shelter?: any;
}

export const ShelterForm = ({ open, onClose, onSuccess, shelter }: ShelterFormProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(shelter?.photo_urls || []);
  const [formData, setFormData] = useState({
    name: shelter?.name || '',
    type: shelter?.type || 'temple',
    address: shelter?.address || '',
    contact_phone: shelter?.contact_phone || '',
    capacity_max: shelter?.capacity_max || '',
    capacity_current: shelter?.capacity_current || 0,
    lat: '',
    lng: '',
    notes: shelter?.notes || '',
  });

  const shelterTypes = [
    'temple',
    'school',
    'hospital',
    'high_ground',
    'community_center',
    'sports_complex',
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('shelter-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('shelter-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }

      setPhotos([...photos, ...uploadedUrls]);
      toast.success(t('shelters.photosUploaded'));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setPhotos(photos.filter((p) => p !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize inputs
    const sanitizedName = sanitizeInput(formData.name.trim());
    const sanitizedAddress = formData.address ? sanitizeInput(formData.address.trim()) : null;
    const sanitizedPhone = formData.contact_phone ? sanitizeInput(formData.contact_phone.trim()) : null;
    const sanitizedNotes = formData.notes ? sanitizeInput(formData.notes.trim()) : null;

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    // Validate shelter data
    const validation = validateShelter({
      name: sanitizedName,
      type: formData.type,
      location: { lng: lng || 0, lat: lat || 0 },
      capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : undefined
    });

    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    if (sanitizedPhone && !validatePhone(sanitizedPhone).isValid) {
      toast.error('Invalid phone number format');
      return;
    }

    setLoading(true);

    try {
      let location = null;
      if (formData.lat && formData.lng) {
        location = `POINT(${lng} ${lat})`;
      }

      const shelterData = {
        name: sanitizedName,
        type: formData.type,
        address: sanitizedAddress,
        contact_phone: sanitizedPhone,
        capacity_max: formData.capacity_max ? parseInt(formData.capacity_max) : null,
        capacity_current: formData.capacity_current,
        notes: sanitizedNotes,
        photo_urls: photos,
        ...(location && { location }),
      };

      if (shelter) {
        const { error } = await supabase
          .from('shelters')
          .update(shelterData)
          .eq('id', shelter.id);

        if (error) throw error;
        toast.success(t('shelters.updated'));
      } else {
        const { error } = await supabase
          .from('shelters')
          .insert([shelterData]);

        if (error) throw error;
        toast.success(t('shelters.created'));
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {shelter ? t('shelters.editShelter') : t('shelters.createShelter')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{t('shelters.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">{t('shelters.type')} *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shelterTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`shelters.type_${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address">{t('shelters.address')}</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">{t('shelters.latitude')}</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="13.7563"
                />
              </div>
              <div>
                <Label htmlFor="lng">{t('shelters.longitude')}</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="100.5018"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact_phone">{t('shelters.contactPhone')}</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity_max">{t('shelters.maxCapacity')}</Label>
                <Input
                  id="capacity_max"
                  type="number"
                  value={formData.capacity_max}
                  onChange={(e) => setFormData({ ...formData, capacity_max: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="capacity_current">{t('shelters.currentCapacity')}</Label>
                <Input
                  id="capacity_current"
                  type="number"
                  value={formData.capacity_current}
                  onChange={(e) => setFormData({ ...formData, capacity_current: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t('shelters.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label>{t('shelters.photos')}</Label>
              <div className="mt-2 space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {t('shelters.uploadPhotos')}
                  </Button>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {photos.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Shelter ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(url)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {shelter ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};