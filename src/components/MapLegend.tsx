import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function MapLegend() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const severityLevels = [
    { level: 1, color: '#FFA500', label: t('map.severityLow') },
    { level: 2, color: '#FF6347', label: t('map.severityMedium') },
    { level: 3, color: '#FF4500', label: t('map.severityHigh') },
    { level: 4, color: '#DC143C', label: t('map.severityCritical') },
    { level: 5, color: '#FF0000', label: t('map.severityExtreme') },
  ];

  return (
    <Card className="p-2 bg-background/90 backdrop-blur-sm border-border/50">
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {t('map.legend')}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      
      {isExpanded && (
        <div className="space-y-1 mt-1.5 px-2">
          {severityLevels.map((item) => (
            <div key={item.level} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full border border-white/50 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-foreground/80">
                {item.level} - {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
