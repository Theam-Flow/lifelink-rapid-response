import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Truck, Heart, Wrench, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Resource {
  id: string;
  name: string;
  type: string;
  status: string;
  capacity: number | null;
  available_now: boolean;
  volunteer_operator: string | null;
  owner_id: string;
  profiles: {
    full_name: string;
  };
}

const Resources = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchResources = async () => {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          profiles:owner_id (full_name)
        `)
        .order('available_now', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        toast.error(t('resources.registerError'));
        return;
      }

      if (data) {
        setResources(data as any);
      }
    };

    fetchResources();

    const channel = supabase
      .channel('resources_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resources',
        },
        () => {
          fetchResources();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'boat_small':
      case 'boat_large':
      case '4x4_truck':
        return <Truck className="h-5 w-5" />;
      case 'medical_kit':
        return <Heart className="h-5 w-5" />;
      case 'generator':
        return <Wrench className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string, available: boolean) => {
    if (!available) return 'destructive';
    switch (status) {
      case 'available':
        return 'default';
      case 'busy':
        return 'secondary';
      default:
        return 'outline';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 pb-28 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('resources.title')}</h1>
              <p className="text-muted-foreground">
                {t('resources.registerDescription')}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/resources/register')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('resources.addResource')}
          </Button>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className={resource.available_now ? '' : 'opacity-60'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(resource.type)}
                    <CardTitle className="text-lg">{resource.name}</CardTitle>
                  </div>
                  <Badge variant={getStatusColor(resource.status, resource.available_now)}>
                    {resource.available_now ? t(`resources.statuses.${resource.status}`) : t('resources.statuses.offline')}
                  </Badge>
                </div>
                <CardDescription>
                  {t(`resources.types.${resource.type}`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resource.capacity && (
                  <p className="text-sm">
                    <strong>{t('resources.capacity')}:</strong> {resource.capacity}
                  </p>
                )}
                {resource.volunteer_operator && (
                  <p className="text-sm">
                    <strong>{t('resources.operator')}:</strong> {resource.volunteer_operator}
                  </p>
                )}
                <p className="text-sm">
                  <strong>{t('auth.fullName')}:</strong> {resource.profiles.full_name}
                </p>
                {resource.available_now && resource.status === 'available' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => {
                      toast.success(t('resources.requestSent'), {
                        description: t('resources.ownerNotified')
                      });
                    }}
                  >
                    {t('resources.registerButton')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {resources.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">{t('resources.noResources')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('resources.registerPrompt')}
            </p>
            <Button onClick={() => navigate('/resources/register')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('resources.addResource')}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Resources;
