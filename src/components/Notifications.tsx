import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, AlertCircle, MessageSquare, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'sos' | 'message' | 'rescuer' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Subscribe to SOS signals
    const sosChannel = supabase
      .channel('sos_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sos_signals'
      }, (payload) => {
        const newNotification: Notification = {
          id: `sos-${payload.new.id}`,
          type: 'sos',
          title: t('notifications.newSOS'),
          message: t('notifications.sosMessage', { type: payload.new.type }),
          read: false,
          created_at: payload.new.created_at,
          link: '/rescue-map'
        };
        addNotification(newNotification);
      })
      .subscribe();

    // Subscribe to messages
    const messagesChannel = supabase
      .channel('message_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sos_id=neq.null`
      }, (payload) => {
        if (payload.new.user_id !== user.id) {
          const newNotification: Notification = {
            id: `msg-${payload.new.id}`,
            type: 'message',
            title: t('notifications.newMessage'),
            message: payload.new.content,
            read: false,
            created_at: payload.new.created_at,
          };
          addNotification(newNotification);
        }
      })
      .subscribe();

    // Subscribe to rescuer activity
    const rescuerChannel = supabase
      .channel('rescuer_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rescuer_activity'
      }, (payload) => {
        const newNotification: Notification = {
          id: `rescuer-${payload.new.id}`,
          type: 'rescuer',
          title: t('notifications.rescuerUpdate'),
          message: t('notifications.rescuerMessage'),
          read: false,
          created_at: payload.new.timestamp || new Date().toISOString(),
          link: '/rescue-map'
        };
        addNotification(newNotification);
      })
      .subscribe();

    return () => {
      sosChannel.unsubscribe();
      messagesChannel.unsubscribe();
      rescuerChannel.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Show toast
    toast(notification.title, {
      description: notification.message,
      action: notification.link ? {
        label: t('notifications.view'),
        onClick: () => window.location.href = notification.link!
      } : undefined
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sos': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'message': return <MessageSquare className="h-5 w-5 text-primary" />;
      case 'rescuer': return <Users className="h-5 w-5 text-secondary" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('notifications.title')}
            </SheetTitle>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    {t('notifications.markAllRead')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearAll}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all ${
                    !notification.read ? 'border-primary' : 'opacity-60'
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{notification.title}</p>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
