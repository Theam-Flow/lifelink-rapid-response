import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Upload, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange?: (photos: string[]) => void;
  maxPhotos?: number;
  readOnly?: boolean;
}

export const PhotoGallery = ({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 6,
  readOnly = false 
}: PhotoGalleryProps) => {
  const { t } = useTranslation();
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const addPhoto = () => {
    if (!newPhotoUrl) {
      toast.error(t('photos.enterUrl'));
      return;
    }

    if (photos.length >= maxPhotos) {
      toast.error(t('photos.maxReached', { max: maxPhotos }));
      return;
    }

    try {
      new URL(newPhotoUrl);
      onPhotosChange?.([...photos, newPhotoUrl]);
      setNewPhotoUrl('');
      toast.success(t('photos.added'));
    } catch {
      toast.error(t('photos.invalidUrl'));
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange?.(newPhotos);
    toast.success(t('photos.removed'));
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="space-y-2">
          <Label htmlFor="photo_url">{t('photos.addPhoto')}</Label>
          <div className="flex gap-2">
            <Input
              id="photo_url"
              type="url"
              placeholder="https://..."
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
            />
            <Button 
              type="button" 
              onClick={addPhoto}
              disabled={photos.length >= maxPhotos}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('photos.add')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('photos.count', { current: photos.length, max: maxPhotos })}
          </p>
        </div>
      )}

      {photos.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {readOnly ? t('photos.noPhotos') : t('photos.addFirst')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
