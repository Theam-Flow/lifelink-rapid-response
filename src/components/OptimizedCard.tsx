import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { ReactNode } from 'react';

interface OptimizedCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export const OptimizedCard = ({ 
  children, 
  onClick, 
  className = '',
  delay = 0 
}: OptimizedCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card 
        className={`cursor-pointer hover:shadow-lg transition-all ${className}`}
        onClick={onClick}
      >
        {children}
      </Card>
    </motion.div>
  );
};
