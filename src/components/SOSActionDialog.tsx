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
import { MessageSquare, FileText, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_line_id?: string | null;
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
      <AlertDialogContent className="bg-background max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('map.sosOptions')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`emergencyTypes.${signal.type}`)} - {t('sos.severity')}: {signal.severity_level}/5
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Quick Contact Buttons */}
        {(signal.contact_phone || signal.contact_whatsapp || signal.contact_line_id) && (
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold text-muted-foreground">{t('profile.contactInfo')}</h4>
            <div className="flex gap-2">
              {signal.contact_phone && (
                <Button
                  onClick={() => {
                    window.open(`tel:${signal.contact_phone}`, '_self');
                    onOpenChange(false);
                  }}
                  variant="outline"
                  className="flex-1 h-auto py-3 flex-col gap-1"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{t('profile.callPhone')}</span>
                </Button>
              )}
              {signal.contact_whatsapp && (
                <Button
                  onClick={() => {
                    window.open(`https://wa.me/${signal.contact_whatsapp?.replace(/\D/g, '')}`, '_blank');
                    onOpenChange(false);
                  }}
                  className="flex-1 h-auto py-3 flex-col gap-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('profile.openWhatsapp')}</span>
                </Button>
              )}
              {signal.contact_line_id && (
                <Button
                  onClick={() => {
                    window.open(`https://line.me/ti/p/${signal.contact_line_id}`, '_blank');
                    onOpenChange(false);
                  }}
                  className="flex-1 h-auto py-3 flex-col gap-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-xs font-medium">{t('profile.openLine')}</span>
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 py-2">
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
