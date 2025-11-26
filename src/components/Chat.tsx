import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  profile?: {
    full_name: string;
  };
}

interface ChatProps {
  sosId?: string;
  onClose?: () => void;
}

export const Chat = ({ sosId, onClose }: ChatProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sosId) return;

    const fetchMessages = async () => {
      const query = supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('sos_id', sosId)
        .order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data) {
        setMessages(data as any);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${sosId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sos_id=eq.${sosId}`,
        },
        async (payload) => {
          // Fetch the full message with profile data
          const { data: newMessageData, error } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:user_id (full_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && newMessageData) {
            setMessages(prev => [...prev, newMessageData as any]);
          } else {
            // Fallback to fetching all messages
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sosId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !sosId) return;

    setLoading(true);

    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      sos_id: sosId,
      content: newMessage.trim(),
      type: 'text',
    });

    if (error) {
      toast.error(t('chat.sendError'));
      console.error(error);
    } else {
      setNewMessage('');
    }

    setLoading(false);
  };

  if (!sosId) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{t('chat.selectSOS')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('chat.title')}
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('chat.noMessages')}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      message.user_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.user_id !== user?.id && (
                      <p className="text-xs font-semibold mb-1">
                        {message.profile?.full_name || t('chat.unknown')}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('chat.placeholder')}
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
