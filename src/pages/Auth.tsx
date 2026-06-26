import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const Auth = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'victim' | 'rescuer' | 'shelter_manager'>('victim');
  const [countryCode, setCountryCode] = useState<'VE' | 'TH' | 'VN' | 'MY' | 'ID'>('VE');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFullName = isSignUp ? sanitizeInput(fullName.trim()) : '';
    
    if (isSignUp) {
      if (sanitizedFullName.length < 2) {
        toast.error('Name must be at least 2 characters');
        return;
      }
      if (password.length < 6) {
        toast.error(t('auth.passwordMinLength'));
        return;
      }
    }
    
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            data: {
              full_name: sanitizedFullName,
              role: role,
              country_code: countryCode,
            },
          },
        });
        if (error) throw error;
        toast.success(t('auth.signupSuccess'));
        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        });
        if (error) throw error;
        toast.success(t('auth.signinSuccess'));
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <CardTitle className="text-2xl font-bold">LifeLink Asia</CardTitle>
            </div>
            <LanguageSwitcher />
          </div>
          <CardDescription>{t('auth.welcome')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('auth.role')}</Label>
                  <Select
                    value={role}
                    onValueChange={(value: 'victim' | 'rescuer' | 'shelter_manager') => setRole(value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="victim">{t('roles.victim')}</SelectItem>
                      <SelectItem value="rescuer">{t('roles.rescuer')}</SelectItem>
                      <SelectItem value="shelter_manager">{t('roles.shelter_manager')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t('auth.country')}</Label>
                  <Select
                    value={countryCode}
                    onValueChange={(value: 'VE' | 'TH' | 'VN' | 'MY' | 'ID') => setCountryCode(value)}
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  {t('auth.passwordMinLength')}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold"
              disabled={loading}
              variant={isSignUp ? 'default' : 'secondary'}
            >
              {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
