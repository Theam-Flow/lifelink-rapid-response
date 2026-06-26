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
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, Shield, Save, Plus, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  line_id: string | null;
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
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    line_id: '',
    country_code: 'VE' as 'VE' | 'TH' | 'VN' | 'MY' | 'ID',
  });
  const [uploading, setUploading] = useState(false);

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
        line_id: data.line_id || '',
        country_code: data.country_code || 'TH',
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    
    setUploading(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(t('profile.updateSuccess'));
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
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
          line_id: formData.line_id || null,
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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('profile.signOutSuccess'));
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-24">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Modern Header with Gradient */}
        <div className="relative h-48 md:h-56 bg-gradient-to-r from-primary to-primary/60 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
          
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 bg-background/10 backdrop-blur-sm hover:bg-background/20 text-primary-foreground z-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Edit Button */}
          {!editMode && (
            <Button 
              onClick={() => setEditMode(true)}
              className="absolute top-4 right-4 bg-background/10 backdrop-blur-sm hover:bg-background/20 text-primary-foreground z-10"
              size="sm"
            >
              {t('profile.edit')}
            </Button>
          )}
        </div>

        {/* Profile Avatar - Overlapping Header */}
        <div className="px-4 md:px-6 -mt-20 relative z-20">
          <div className="animate-scale-in">
            <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4">
              <Avatar className="w-full h-full border-4 border-background shadow-2xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-4xl md:text-5xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {profile.verified && (
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                  <Shield className="h-5 w-5" />
                </div>
              )}
              <label className="absolute bottom-0 left-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Plus className="h-5 w-5" />
              </label>
            </div>
          </div>

          {/* Name and Badges */}
          <div className="text-center space-y-3 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold animate-fade-in">{profile.full_name}</h1>
            
            <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-in">
              <Badge 
                variant={getRoleBadgeVariant(profile.role)} 
                className="text-sm px-3 py-1"
              >
                {t(`roles.${profile.role}`)}
              </Badge>
              <Badge 
                variant={getStatusBadgeVariant(profile.status)}
                className="text-sm px-3 py-1"
              >
                {t(`profile.status_${profile.status}`)}
              </Badge>
            </div>

            {user?.email && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-in">
                <Mail className="h-4 w-4" />
                <span className="break-all">{user.email}</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover-scale">
              <CardContent className="pt-4 pb-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">{t('profile.joined')}</p>
                <p className="text-sm font-semibold">{format(new Date(profile.created_at), 'PP')}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover-scale">
              <CardContent className="pt-4 pb-4 text-center">
                <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">{t('auth.country')}</p>
                <p className="text-sm font-semibold">
                  {profile.country_code === 'VE' && '🇻🇪 Venezuela'}
                  {profile.country_code === 'TH' && '🇹🇭 Thailand'}
                  {profile.country_code === 'VN' && '🇻🇳 Vietnam'}
                  {profile.country_code === 'MY' && '🇲🇾 Malaysia'}
                  {profile.country_code === 'ID' && '🇮🇩 Indonesia'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Card */}
          <Card className="mb-6 animate-fade-in border-border/50">
            <CardContent className="p-4 md:p-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <User className="h-4 w-4 mr-2" />
                    {t('profile.information')}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('profile.activity')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-0">
                  {editMode ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="full_name" className="text-base">
                          {t('auth.fullName')}
                        </Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-base">
                          <Phone className="h-4 w-4 inline mr-2" />
                          {t('profile.phone')}
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-12"
                          placeholder="+66 XXX XXX XXX"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="line_id" className="text-base">
                          <Mail className="h-4 w-4 inline mr-2" />
                          {t('profile.lineId')}
                        </Label>
                        <Input
                          id="line_id"
                          type="text"
                          value={formData.line_id}
                          onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                          className="h-12"
                          placeholder="@yourlineid"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-base">
                          <MapPin className="h-4 w-4 inline mr-2" />
                          {t('auth.country')}
                        </Label>
                        <Select
                          value={formData.country_code}
                          onValueChange={(value: 'VE' | 'TH' | 'VN' | 'MY' | 'ID') => setFormData({ ...formData, country_code: value })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VE">🇻🇪 Venezuela</SelectItem>
                            <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                            <SelectItem value="VN">🇻🇳 Vietnam</SelectItem>
                            <SelectItem value="MY">🇲🇾 Malaysia</SelectItem>
                            <SelectItem value="ID">🇮🇩 Indonesia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          onClick={handleSave} 
                          disabled={saving} 
                          className="flex-1 h-12"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? t('common.saving') : t('profile.save')}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditMode(false)}
                          className="h-12"
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      <Card className="bg-muted/50 border-none">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground mb-1">{t('auth.fullName')}</p>
                              <p className="font-semibold">{profile.full_name}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {profile.phone && (
                        <Card className="bg-muted/50 border-none">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <Phone className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground mb-1">{t('profile.phone')}</p>
                                <p className="font-semibold">{profile.phone}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`tel:${profile.phone}`, '_self')}
                                className="shrink-0"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {profile.line_id && (
                        <Card className="bg-muted/50 border-none">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-[#06C755]/10 p-2 rounded-lg">
                                <Mail className="h-5 w-5 text-[#06C755]" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground mb-1">{t('profile.lineId')}</p>
                                <p className="font-semibold">{profile.line_id}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`https://line.me/ti/p/${profile.line_id}`, '_blank')}
                                className="shrink-0 border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card className="bg-muted/50 border-none">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground mb-1">{t('auth.country')}</p>
                              <p className="font-semibold">
                                {profile.country_code === 'VE' && '🇻🇪 Venezuela'}
                                {profile.country_code === 'TH' && '🇹🇭 Thailand'}
                                {profile.country_code === 'VN' && '🇻🇳 Vietnam'}
                                {profile.country_code === 'MY' && '🇲🇾 Malaysia'}
                                {profile.country_code === 'ID' && '🇮🇩 Indonesia'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {profile.last_active && (
                        <Card className="bg-muted/50 border-none">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground mb-1">{t('profile.lastActive')}</p>
                                <p className="font-semibold">{format(new Date(profile.last_active), 'PPp')}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-0">
                  <div className="text-center py-16 animate-fade-in">
                    <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('profile.noActivity')}</h3>
                    <p className="text-sm text-muted-foreground">{t('profile.activityDescription')}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Sign Out Section */}
          <Card className="mb-6 animate-fade-in border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 md:p-6">
              <Button
                variant="destructive"
                className="w-full h-12"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-2" />
                {t('profile.signOut')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
