import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ExternalLink, ShieldAlert, AlertTriangle,
  UserSearch, Building2, LifeBuoy, HardHat, PackageOpen, ClipboardList,
  Utensils, Home, HeartPulse, PawPrint, Truck, Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RELIEF_DIRECTORY } from '@/data/relief-directory';

const ICONS: Record<string, typeof UserSearch> = {
  UserSearch, Building2, LifeBuoy, HardHat, PackageOpen, ClipboardList,
  Utensils, Home, HeartPulse, PawPrint, Truck, Stethoscope,
};

const ReliefDirectory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 pb-28">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t('relief.title')}</h1>
        </div>

        {/* Earthquake context banner */}
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('relief.quakeTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('relief.quakeDesc')}</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground mb-6">{t('relief.disclaimer')}</p>

        <div className="space-y-4">
          {RELIEF_DIRECTORY.map((cat) => {
            const Icon = ICONS[cat.icon] ?? LifeBuoy;
            return (
              <Card key={cat.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {t(`relief.categories.${cat.key}`)}
                  </CardTitle>
                  {cat.sensitive && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {t('relief.sensitiveNote')}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {cat.resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                    >
                      <span className="font-medium text-sm">{r.name}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">{t('relief.openSource')}</p>
      </div>
    </div>
  );
};

export default ReliefDirectory;
