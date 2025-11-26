import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Phone, Users, Home, CheckCircle, AlertTriangle } from 'lucide-react';

interface Shelter {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_phone: string | null;
  capacity_max: number | null;
  capacity_current: number | null;
  is_verified: boolean;
  supplies_status: any;
  created_at: string;
}

const Shelters = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShelters();
    
    const channel = supabase
      .channel('shelters_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shelters' }, () => {
        fetchShelters();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchShelters = async () => {
    try {
      const { data, error } = await supabase
        .from('shelters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShelters(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getShelterTypeIcon = (type: string) => {
    switch (type) {
      case 'temple': return '🛕';
      case 'school': return '🏫';
      case 'hospital': return '🏥';
      case 'community_center': return '🏛️';
      case 'sports_complex': return '🏟️';
      default: return '🏠';
    }
  };

  const getCapacityPercentage = (current: number | null, max: number | null) => {
    if (!current || !max) return 0;
    return (current / max) * 100;
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 pb-28 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        {/* Header */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <CardTitle className="text-3xl">{t('shelters.title')}</CardTitle>
                  <CardDescription className="text-base">{t('shelters.subtitle')}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Home className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{shelters.length}</p>
                  <p className="text-sm text-muted-foreground">{t('shelters.totalShelters')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {shelters.filter(s => s.is_verified).length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('shelters.verified')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">
                    {shelters.reduce((sum, s) => sum + (s.capacity_current || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('shelters.totalOccupants')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shelters List */}
        <div className="grid gap-6">
          {shelters.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t('shelters.noShelters')}</p>
              </CardContent>
            </Card>
          ) : (
            shelters.map((shelter) => {
              const capacityPercentage = getCapacityPercentage(
                shelter.capacity_current,
                shelter.capacity_max
              );
              
              return (
                <Card key={shelter.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-4xl">
                            {getShelterTypeIcon(shelter.type)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-2xl font-bold">{shelter.name}</h3>
                              {shelter.is_verified && (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {t('shelters.verified')}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="mt-1">
                              {t(`shelters.type_${shelter.type}`)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Capacity */}
                      {shelter.capacity_max && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('shelters.capacity')}</span>
                            <span className={`font-semibold ${getCapacityColor(capacityPercentage)}`}>
                              {shelter.capacity_current || 0} / {shelter.capacity_max}
                            </span>
                          </div>
                          <Progress value={capacityPercentage} className="h-2" />
                          {capacityPercentage >= 90 && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <span>{t('shelters.nearCapacity')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {shelter.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{shelter.address}</span>
                          </div>
                        )}
                        {shelter.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{shelter.contact_phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Supplies Status */}
                      {shelter.supplies_status && Object.keys(shelter.supplies_status).length > 0 && (
                        <div className="bg-accent/50 p-3 rounded-lg">
                          <p className="text-sm font-semibold mb-2">{t('shelters.supplies')}:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(shelter.supplies_status).map(([key, value]: [string, any]) => (
                              <Badge key={key} variant="outline">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Shelters;
