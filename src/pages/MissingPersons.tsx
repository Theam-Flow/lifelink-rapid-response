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
import { Search, Plus, MapPin, Clock, Phone, User, ArrowLeft, X, Upload, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentGalleryPhotos, setCurrentGalleryPhotos] = useState<string[]>([]);
  const [currentPerson, setCurrentPerson] = useState<MissingPerson | null>(null);
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  
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
    let filtered = persons;

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(person =>
        person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.last_seen_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.distinctive_features?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter(person =>
        person.last_seen_address?.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    // Age filter
    if (ageFilter !== 'all' && ageFilter) {
      filtered = filtered.filter(person => {
        if (!person.age) return false;
        const age = person.age;
        switch (ageFilter) {
          case 'child': return age < 18;
          case 'adult': return age >= 18 && age < 60;
          case 'senior': return age >= 60;
          default: return true;
        }
      });
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(person => person.gender === genderFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(person => person.status === statusFilter);
    }

    setFilteredPersons(filtered);
  }, [searchTerm, cityFilter, ageFilter, genderFilter, statusFilter, persons]);

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

  const openGallery = (photos: string[], index: number, person: MissingPerson) => {
    setCurrentGalleryPhotos(photos);
    setCurrentImageIndex(index);
    setCurrentPerson(person);
    setGalleryOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentGalleryPhotos.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + currentGalleryPhotos.length) % currentGalleryPhotos.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') setGalleryOpen(false);
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

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-4 md:pt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <Input
                placeholder={t('missing.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base"
              />
            </div>
            
            {/* Filters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue placeholder={t('missing.filterAge')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('missing.allAges')}</SelectItem>
                  <SelectItem value="child">{t('missing.ageChild')}</SelectItem>
                  <SelectItem value="adult">{t('missing.ageAdult')}</SelectItem>
                  <SelectItem value="senior">{t('missing.ageSenior')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue placeholder={t('missing.filterGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('missing.allGenders')}</SelectItem>
                  <SelectItem value="male">{t('missing.male')}</SelectItem>
                  <SelectItem value="female">{t('missing.female')}</SelectItem>
                  <SelectItem value="other">{t('missing.other')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue placeholder={t('missing.filterStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('missing.allStatuses')}</SelectItem>
                  <SelectItem value="missing">{t('missing.status_missing')}</SelectItem>
                  <SelectItem value="safe">{t('missing.status_safe')}</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder={t('missing.filterCity')}
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-9 md:h-10 text-xs md:text-sm"
              />
            </div>

            {/* Results count */}
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              {filteredPersons.length} {t('missing.resultsFound')}
            </p>
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
                <CardContent className="p-2 md:p-6">
                  <div className="flex gap-2 md:gap-6">
                    {/* Compact photo grid for mobile */}
                    {person.photo_urls && person.photo_urls.length > 0 && (
                      <div className="flex-shrink-0">
                        <div className="grid grid-cols-2 gap-1 md:gap-2 w-24 md:w-64">
                          {person.photo_urls.slice(0, 4).map((url, idx) => (
                            <div
                              key={idx}
                              className="relative group cursor-pointer hover-scale"
                              onClick={() => openGallery(person.photo_urls!, idx, person)}
                            >
                              <img
                                src={url}
                                alt={`${person.full_name} ${idx + 1}`}
                                className="w-full h-12 md:h-32 object-cover rounded md:rounded-lg transition-all"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded md:rounded-lg flex items-center justify-center">
                                <ImageIcon className="h-3 w-3 md:h-6 md:w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                        {person.photo_urls.length > 1 && (
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2 text-center">
                            {person.photo_urls.length} {t('missing.photos')}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Compact info for mobile */}
                    <div className="flex-1 space-y-1 md:space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm md:text-2xl font-bold truncate">{person.full_name}</h3>
                          {person.age && (
                            <p className="text-xs md:text-base text-muted-foreground">
                              {person.age} {t('missing.yearsOld')} {person.gender && `• ${person.gender}`}
                            </p>
                          )}
                        </div>
                        <Badge variant={getStatusColor(person.status)} className="text-[10px] md:text-sm px-1 py-0 md:px-2 md:py-1 flex-shrink-0">
                          {t(`missing.status_${person.status}`)}
                        </Badge>
                      </div>
                      
                      {/* Hide description on mobile, show on desktop */}
                      {person.description && (
                        <p className="hidden md:block text-foreground line-clamp-2">{person.description}</p>
                      )}
                      
                      {/* Compact distinctive features */}
                      {person.distinctive_features && (
                        <div className="bg-accent/50 p-1.5 md:p-3 rounded md:rounded-lg">
                          <p className="text-[10px] md:text-sm font-semibold mb-0.5 md:mb-1">{t('missing.distinctiveFeatures')}:</p>
                          <p className="text-[10px] md:text-sm line-clamp-2">{person.distinctive_features}</p>
                        </div>
                      )}
                      
                      {/* Compact location info */}
                      <div className="flex flex-col md:flex-row md:flex-wrap gap-1 md:gap-4 text-[10px] md:text-sm text-muted-foreground">
                        {person.last_seen_address && (
                          <div className="flex items-center gap-1 md:gap-2 min-w-0">
                            <MapPin className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                            <span className="truncate">{person.last_seen_address}</span>
                          </div>
                        )}
                        {person.last_seen_at && (
                          <div className="flex items-center gap-1 md:gap-2">
                            <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                            <span>{format(new Date(person.last_seen_at), 'PP')}</span>
                          </div>
                        )}
                        {person.contact_phone && (
                          <div className="flex items-center gap-1 md:gap-2">
                            <Phone className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-semibold">{person.contact_phone}</span>
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

        {/* Image Gallery Dialog */}
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent 
            className="max-w-7xl p-0 bg-black border-destructive border-4"
            onKeyDown={handleKeyDown}
          >
            <div className="relative grid md:grid-cols-[300px_1fr_300px] gap-0">
              <button
                onClick={() => setGalleryOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-destructive hover:bg-destructive/80 transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              {/* Left Panel - Person Info */}
              {currentPerson && (
                <div className="hidden md:block bg-destructive/10 border-r border-destructive/30 p-6 text-white overflow-y-auto max-h-[90vh]">
                  <div className="space-y-4">
                    <div className="text-center border-b border-destructive/30 pb-4">
                      <h2 className="text-3xl font-bold text-destructive mb-2">{t('missing.wanted')}</h2>
                      <Badge variant="destructive" className="text-lg px-4 py-1">
                        {t(`missing.status_${currentPerson.status}`)}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-destructive text-sm font-semibold mb-1">{t('missing.fullName')}</p>
                        <p className="text-xl font-bold">{currentPerson.full_name}</p>
                      </div>

                      {currentPerson.age && (
                        <div>
                          <p className="text-destructive text-sm font-semibold mb-1">{t('missing.age')}</p>
                          <p className="text-lg">{currentPerson.age} {t('missing.yearsOld')}</p>
                        </div>
                      )}

                      {currentPerson.gender && (
                        <div>
                          <p className="text-destructive text-sm font-semibold mb-1">{t('missing.gender')}</p>
                          <p className="text-lg capitalize">{currentPerson.gender}</p>
                        </div>
                      )}

                      {currentPerson.description && (
                        <div>
                          <p className="text-destructive text-sm font-semibold mb-1">{t('missing.description')}</p>
                          <p className="text-sm">{currentPerson.description}</p>
                        </div>
                      )}

                      {currentPerson.distinctive_features && (
                        <div className="bg-destructive/20 p-3 rounded border border-destructive/30">
                          <p className="text-destructive text-sm font-semibold mb-1">{t('missing.distinctiveFeatures')}</p>
                          <p className="text-sm">{currentPerson.distinctive_features}</p>
                        </div>
                      )}

                      {currentPerson.last_seen_address && (
                        <div>
                          <p className="text-destructive text-sm font-semibold mb-1 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('missing.lastSeenAddress')}
                          </p>
                          <p className="text-sm">{currentPerson.last_seen_address}</p>
                        </div>
                      )}

                      {currentPerson.last_seen_at && (
                        <div>
                          <p className="text-destructive text-sm font-semibold mb-1 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('missing.lastSeenTime')}
                          </p>
                          <p className="text-sm">{format(new Date(currentPerson.last_seen_at), 'PPp')}</p>
                        </div>
                      )}

                      {currentPerson.contact_phone && (
                        <div className="bg-destructive/30 p-3 rounded border border-destructive">
                          <p className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {t('missing.contactPhone')}
                          </p>
                          <p className="text-lg font-bold">{currentPerson.contact_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Center - Image */}
              <div className="relative bg-black flex items-center justify-center min-h-[70vh] md:min-h-[90vh]">
                {currentGalleryPhotos.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-destructive/80 hover:bg-destructive transition-all hover-scale"
                    >
                      <ChevronLeft className="h-8 w-8 text-white" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-destructive/80 hover:bg-destructive transition-all hover-scale"
                    >
                      <ChevronRight className="h-8 w-8 text-white" />
                    </button>
                  </>
                )}

                <img
                  src={currentGalleryPhotos[currentImageIndex]}
                  alt={`Photo ${currentImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain animate-fade-in p-4"
                />

                {currentGalleryPhotos.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive px-4 py-2 rounded-full">
                    <p className="text-white text-sm font-bold">
                      {currentImageIndex + 1} / {currentGalleryPhotos.length}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Panel - Mobile Info & Thumbnails */}
              {currentPerson && (
                <div className="hidden md:block bg-destructive/10 border-l border-destructive/30 p-6 text-white overflow-y-auto max-h-[90vh]">
                  <div className="space-y-4">
                    <div className="text-center border-b border-destructive/30 pb-4">
                      <h3 className="text-xl font-bold text-destructive mb-2">{t('missing.reportedOn')}</h3>
                      <p className="text-sm">{format(new Date(currentPerson.created_at), 'PPp')}</p>
                    </div>

                    {/* Thumbnails */}
                    {currentGalleryPhotos.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-destructive text-sm font-semibold">{t('missing.allPhotos')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {currentGalleryPhotos.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`rounded overflow-hidden border-2 transition-all hover-scale ${
                                idx === currentImageIndex ? 'border-destructive ring-2 ring-destructive' : 'border-white/20 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={url}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-20 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-destructive/30 p-4 rounded border border-destructive text-center">
                      <p className="text-sm mb-2">{t('missing.helpFind')}</p>
                      <p className="text-xs opacity-80">{t('missing.shareInfo')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Info Panel */}
              {currentPerson && (
                <div className="md:hidden bg-destructive/10 border-t border-destructive/30 p-4 text-white">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-destructive font-semibold">{t('missing.fullName')}</p>
                      <p className="font-bold">{currentPerson.full_name}</p>
                    </div>
                    {currentPerson.age && (
                      <div>
                        <p className="text-destructive font-semibold">{t('missing.age')}</p>
                        <p>{currentPerson.age} {t('missing.yearsOld')}</p>
                      </div>
                    )}
                    {currentPerson.contact_phone && (
                      <div className="col-span-2 bg-destructive/30 p-2 rounded text-center">
                        <p className="text-xs font-semibold mb-1">{t('missing.contactPhone')}</p>
                        <p className="font-bold">{currentPerson.contact_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MissingPersons;
