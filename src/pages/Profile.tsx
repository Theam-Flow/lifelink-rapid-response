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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, Shield, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  country_code: string;
  verified: boolean;
  created_at: string;
  last_active: string | null;
  skills: any;
}

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    country_code: 'TH' as 'TH' | 'VN' | 'MY' | 'ID',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        country_code: data.country_code || 'TH',
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          avatar_url: formData.avatar_url || null,
          country_code: formData.country_code,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(t('profile.updateSuccess'));
      setEditMode(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'rescuer': return 'secondary';
      case 'medical': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('profile.notFound')}</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              {t('common.goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* Header */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <CardTitle className="text-3xl">{t('profile.title')}</CardTitle>
                  <CardDescription className="text-base">{t('profile.subtitle')}</CardDescription>
                </div>
              </div>
              {!editMode && (
                <Button onClick={() => setEditMode(true)}>
                  {t('profile.edit')}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Profile Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{profile.full_name}</h3>
                  <div className="flex flex-col gap-2">
                    <Badge variant={getRoleBadgeVariant(profile.role)}>
                      {t(`roles.${profile.role}`)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(profile.status)}>
                      {t(`profile.status_${profile.status}`)}
                    </Badge>
                    {profile.verified && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {t('profile.verified')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-full pt-4 space-y-2 text-sm">
                  {user?.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="break-all">{user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{t('profile.joined')}: {format(new Date(profile.created_at), 'PP')}</span>
                  </div>
                  {profile.last_active && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{t('profile.lastActive')}: {format(new Date(profile.last_active), 'PPp')}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">{t('profile.information')}</TabsTrigger>
                  <TabsTrigger value="activity">{t('profile.activity')}</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6 mt-6">
                  {editMode ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">{t('auth.fullName')}</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('profile.phone')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar_url">{t('profile.avatarUrl')}</Label>
                        <Input
                          id="avatar_url"
                          type="url"
                          placeholder="https://..."
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">{t('auth.country')}</Label>
                        <Select
                          value={formData.country_code}
                          onValueChange={(value: 'TH' | 'VN' | 'MY' | 'ID') => setFormData({ ...formData, country_code: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TH">Thailand</SelectItem>
                            <SelectItem value="VN">Vietnam</SelectItem>
                            <SelectItem value="MY">Malaysia</SelectItem>
                            <SelectItem value="ID">Indonesia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving} className="flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? t('common.saving') : t('profile.save')}
                        </Button>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t('auth.fullName')}</p>
                          <p className="font-medium">{profile.full_name}</p>
                        </div>
                      </div>
                      {profile.phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">{t('profile.phone')}</p>
                            <p className="font-medium">{profile.phone}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t('auth.country')}</p>
                          <p className="font-medium">
                            {profile.country_code === 'TH' && 'Thailand'}
                            {profile.country_code === 'VN' && 'Vietnam'}
                            {profile.country_code === 'MY' && 'Malaysia'}
                            {profile.country_code === 'ID' && 'Indonesia'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-6">
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('profile.noActivity')}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
