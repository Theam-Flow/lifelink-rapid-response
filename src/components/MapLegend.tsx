import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

export function MapLegend() {
  const { t } = useTranslation();

  const severityLevels = [
    { level: 1, color: '#FFA500', label: t('map.severityLow') },
    { level: 2, color: '#FF6347', label: t('map.severityMedium') },
    { level: 3, color: '#FF4500', label: t('map.severityHigh') },
    { level: 4, color: '#DC143C', label: t('map.severityCritical') },
    { level: 5, color: '#FF0000', label: t('map.severityExtreme') },
  ];

  return (
    <Card className="p-2 bg-background/95 backdrop-blur">
      <div className="text-[10px] font-semibold mb-1.5">{t('map.legend')}</div>
      <div className="space-y-1">
        {severityLevels.map((item) => (
          <div key={item.level} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px]">
              {item.level} - {item.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
