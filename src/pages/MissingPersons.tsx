import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Plus, MapPin, Clock, Phone, User, ArrowLeft, X, Upload, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface MissingPerson {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  description: string | null;
  last_seen_address: string | null;
  last_seen_at: string | null;
  photo_urls: string[] | null;
  contact_phone: string | null;
  distinctive_features: string | null;
  status: string;
  created_at: string;
}

const MissingPersons = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [persons, setPersons] = useState<MissingPerson[]>([]);
  const [filteredPersons, setFilteredPersons] = useState<MissingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    description: '',
    last_seen_address: '',
    last_seen_at: '',
    contact_phone: '',
    distinctive_features: '',
  });

  useEffect(() => {
    fetchMissingPersons();
    
    const channel = supabase
      .channel('missing_persons_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missing_persons' }, () => {
        fetchMissingPersons();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = persons.filter(person =>
        person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.last_seen_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.distinctive_features?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPersons(filtered);
    } else {
      setFilteredPersons(persons);
    }
  }, [searchTerm, persons]);

  const fetchMissingPersons = async () => {
    try {
      const { data, error } = await supabase
        .from('missing_persons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPersons(data || []);
      setFilteredPersons(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > 8) {
      toast.error(t('missing.maxPhotos'));
      return;
    }

    const newFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(t('missing.onlyImages'));
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('missing.maxFileSize'));
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user || selectedFiles.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('missing-persons-photos')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('missing-persons-photos')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);

    try {
      const photoUrls = await uploadPhotos();

      const { error } = await supabase.from('missing_persons').insert({
        reporter_id: user.id,
        full_name: formData.full_name,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        description: formData.description || null,
        last_seen_address: formData.last_seen_address || null,
        last_seen_at: formData.last_seen_at || null,
        photo_urls: photoUrls,
        contact_phone: formData.contact_phone || null,
        distinctive_features: formData.distinctive_features || null,
        status: 'missing',
      });

      if (error) throw error;

      toast.success(t('missing.reportSuccess'));
      setDialogOpen(false);
      setFormData({
        full_name: '',
        age: '',
        gender: '',
        description: '',
        last_seen_address: '',
        last_seen_at: '',
        contact_phone: '',
        distinctive_features: '',
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'missing': return 'destructive';
      case 'safe': return 'default';
      case 'danger': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-2 md:p-4 pb-28 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-3 md:space-y-6 py-2 md:py-8">
        {/* Header */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{t('missing.title')}</CardTitle>
                  <CardDescription className="text-sm md:text-base">{t('missing.subtitle')}</CardDescription>
                </div>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2 w-full sm:w-auto sm:self-end">
                    <Plus className="h-5 w-5" />
                    {t('missing.reportMissing')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('missing.reportForm')}</DialogTitle>
                    <DialogDescription>{t('missing.subtitle')}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">{t('missing.fullName')} *</Label>
                      <Input
                        id="full_name"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">{t('missing.age')}</Label>
                        <Input
                          id="age"
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">{t('missing.gender')}</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('missing.selectGender')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t('missing.male')}</SelectItem>
                            <SelectItem value="female">{t('missing.female')}</SelectItem>
                            <SelectItem value="other">{t('missing.other')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">{t('missing.description')}</Label>
                      <Textarea
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="distinctive_features">{t('missing.distinctiveFeatures')}</Label>
                      <Textarea
                        id="distinctive_features"
                        rows={2}
                        placeholder={t('missing.distinctivePlaceholder')}
                        value={formData.distinctive_features}
                        onChange={(e) => setFormData({ ...formData, distinctive_features: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_seen_address">{t('missing.lastSeenAddress')}</Label>
                      <Input
                        id="last_seen_address"
                        value={formData.last_seen_address}
                        onChange={(e) => setFormData({ ...formData, last_seen_address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_seen_at">{t('missing.lastSeenTime')}</Label>
                      <Input
                        id="last_seen_at"
                        type="datetime-local"
                        value={formData.last_seen_at}
                        onChange={(e) => setFormData({ ...formData, last_seen_at: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">{t('missing.contactPhone')}</Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="photos">{t('missing.photos')} ({selectedFiles.length}/8)</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <input
                          id="photos"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label htmlFor="photos" className="cursor-pointer">
                          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            {t('missing.uploadPhotos')}
                          </p>
                          <Button type="button" variant="outline" size="sm">
                            {t('missing.selectFiles')}
                          </Button>
                        </label>
                      </div>
                      
                      {previewUrls.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={uploading}>
                      {uploading ? t('missing.uploading') : t('missing.submitReport')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('missing.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Missing Persons List */}
        <div className="grid gap-3 md:gap-6">
          {filteredPersons.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t('missing.noResults')}</p>
              </CardContent>
            </Card>
          ) : (
            filteredPersons.map((person) => (
              <Card key={person.id} className="overflow-hidden">
                <CardContent className="p-3 md:p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {person.photo_urls && person.photo_urls.length > 0 && (
                      <div className="flex-shrink-0">
                        <div className="grid grid-cols-2 gap-2 w-full md:w-64">
                          {person.photo_urls.slice(0, 4).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`${person.full_name} ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                        {person.photo_urls.length > 4 && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            +{person.photo_urls.length - 4} {t('missing.morePhotos')}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-2xl font-bold">{person.full_name}</h3>
                          {person.age && person.gender && (
                            <p className="text-muted-foreground">
                              {person.age} {t('missing.yearsOld')} • {person.gender}
                            </p>
                          )}
                        </div>
                        <Badge variant={getStatusColor(person.status)}>
                          {t(`missing.status_${person.status}`)}
                        </Badge>
                      </div>
                      
                      {person.description && (
                        <p className="text-foreground">{person.description}</p>
                      )}
                      
                      {person.distinctive_features && (
                        <div className="bg-accent/50 p-3 rounded-lg">
                          <p className="text-sm font-semibold mb-1">{t('missing.distinctiveFeatures')}:</p>
                          <p className="text-sm">{person.distinctive_features}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {person.last_seen_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{person.last_seen_address}</span>
                          </div>
                        )}
                        {person.last_seen_at && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(person.last_seen_at), 'PPp')}</span>
                          </div>
                        )}
                        {person.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{person.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MissingPersons;
