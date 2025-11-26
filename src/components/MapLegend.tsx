import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <Card className="p-2 bg-background/95 backdrop-blur">
      <Button
        variant="ghost"
        size="sm"
        className="w-full flex items-center justify-between h-8"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-xs font-semibold">{t('map.legend')}</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="space-y-1 mt-2 px-1">
          {severityLevels.map((item) => (
            <div key={item.level} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs">
                {item.level} - {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
