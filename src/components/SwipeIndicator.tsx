import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export const SwipeIndicator = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Hide after 3 seconds
    const timer = setTimeout(() => {
      setShow(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-32 left-0 right-0 flex justify-center items-center gap-4 z-30 pointer-events-none"
    >
      <motion.div
        animate={{ x: [-10, 0, -10] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Desliza</span>
      </motion.div>
      
      <motion.div
        animate={{ x: [10, 0, 10] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg"
      >
        <span className="text-xs text-muted-foreground">Desliza</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </motion.div>
    </motion.div>
  );
};
