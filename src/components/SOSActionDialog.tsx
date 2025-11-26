import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { MessageSquare, FileText } from "lucide-react";

interface SOSSignal {
  id: string;
  severity_level: number;
  type: string;
  description?: string | null;
  victim_count?: number | null;
  status?: string;
  created_at?: string;
  user_id: string;
  accuracy_meters?: number | null;
  lng?: number;
  lat?: number;
  distance_meters?: number | null;
}

interface SOSActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signal: SOSSignal | null;
  onViewDetails: () => void;
  onChat: () => void;
}

export function SOSActionDialog({
  open,
  onOpenChange,
  signal,
  onViewDetails,
  onChat,
}: SOSActionDialogProps) {
  const { t } = useTranslation();

  if (!signal) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('map.sosOptions')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`emergencyTypes.${signal.type}`)} - {t('sos.severity')}: {signal.severity_level}/5
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <button
            onClick={() => {
              onViewDetails();
              onOpenChange(false);
            }}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-semibold">{t('map.viewDetails')}</div>
              <div className="text-sm text-muted-foreground">
                {t('sos.description')}
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              onChat();
              onOpenChange(false);
            }}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-semibold">{t('map.chat')}</div>
              <div className="text-sm text-muted-foreground">
                {t('chat.title')}
              </div>
            </div>
          </button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
