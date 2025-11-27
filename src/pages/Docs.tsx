import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { FileText, BookOpen, Globe, Heart, Shield, Code, TrendingUp, Users, ExternalLink } from 'lucide-react';

const Docs = () => {
  const { t } = useTranslation();

  const docSections = [
    {
      title: t('docs.gettingStarted'),
      icon: BookOpen,
      docs: [
        { name: 'README', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/README.md', description: t('docs.readmeDesc') },
        { name: 'DEVELOPMENT', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/DEVELOPMENT.md', description: t('docs.devDesc') },
        { name: 'DEPLOYMENT', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/DEPLOYMENT.md', description: t('docs.deployDesc') },
      ]
    },
    {
      title: t('docs.technical'),
      icon: Code,
      docs: [
        { name: 'ARCHITECTURE', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/ARCHITECTURE.md', description: t('docs.architectureDesc') },
        { name: 'DATABASE', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/DATABASE.md', description: t('docs.databaseDesc') },
        { name: 'API', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/API.md', description: t('docs.apiDesc') },
      ]
    },
    {
      title: t('docs.humanitarian'),
      icon: Heart,
      docs: [
        { name: 'HUMANITARIAN USE', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/HUMANITARIAN_USE.md', description: t('docs.humanitarianDesc') },
        { name: 'CODE OF CONDUCT', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/CODE_OF_CONDUCT.md', description: t('docs.conductDesc') },
        { name: 'CONTRIBUTING', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/CONTRIBUTING.md', description: t('docs.contributingDesc') },
      ]
    },
    {
      title: t('docs.projectInfo'),
      icon: TrendingUp,
      docs: [
        { name: 'PUBLIC ROADMAP', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/PUBLIC_ROADMAP.md', description: t('docs.roadmapDesc') },
        { name: 'SECURITY', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/SECURITY.md', description: t('docs.securityDesc') },
        { name: 'PRODUCTION READY', url: 'https://github.com/withkevinm/lifelink-asia/blob/main/PRODUCTION_READY.md', description: t('docs.productionDesc') },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 pb-28 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-6 py-8">
        {/* Header */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl">{t('docs.title')}</CardTitle>
                <CardDescription className="text-base">
                  {t('docs.subtitle')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* GitHub Link */}
        <Card className="bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">{t('docs.githubTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('docs.githubDesc')}</p>
                </div>
              </div>
              <Button asChild>
                <a href="https://github.com/withkevinm/lifelink-asia" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  GitHub
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Sections */}
        {docSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Icon className="h-6 w-6 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.docs.map((doc) => (
                    <div key={doc.name} className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold">{doc.name}</h4>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Footer with Creator Credit */}
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold mb-2">
              {t('docs.openSource')}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('docs.openSourceDesc')}
            </p>
            <div className="flex items-center justify-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-destructive animate-pulse" />
              <span className="font-semibold">Free by: @withkevinm</span>
              <Heart className="h-5 w-5 text-destructive animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Docs;
