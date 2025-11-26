import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

interface LineShareButtonProps {
  text: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function LineShareButton({ text, url, variant = 'default', size = 'default', className }: LineShareButtonProps) {
  const handleShare = () => {
    const shareText = url ? `${text}\n${url}` : text;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank');
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className={`bg-[#06C755] hover:bg-[#06C755]/90 text-white ${className || ''}`}
    >
      <Mail className="h-4 w-4 mr-2" />
      Share on LINE
    </Button>
  );
}