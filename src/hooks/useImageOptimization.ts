import { useState, useEffect } from 'react';

interface ImageOptimizationOptions {
  src: string;
  lowQualitySrc?: string;
  highQualitySrc?: string;
}

export const useImageOptimization = ({ src, lowQualitySrc, highQualitySrc }: ImageOptimizationOptions) => {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Start with low quality image
    if (lowQualitySrc) {
      setCurrentSrc(lowQualitySrc);
    }

    // Preload high quality image
    const img = new Image();
    img.src = highQualitySrc || src;
    
    img.onload = () => {
      setCurrentSrc(highQualitySrc || src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };
  }, [src, lowQualitySrc, highQualitySrc]);

  return { currentSrc, isLoading };
};

// Hook para detectar conexión lenta
export const useSlowConnection = () => {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // @ts-ignore - API experimental
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      // @ts-ignore
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const updateConnectionStatus = () => {
        const effectiveType = connection.effectiveType;
        setIsSlowConnection(effectiveType === 'slow-2g' || effectiveType === '2g');
      };

      updateConnectionStatus();
      connection.addEventListener('change', updateConnectionStatus);

      return () => {
        connection.removeEventListener('change', updateConnectionStatus);
      };
    }
  }, []);

  return isSlowConnection;
};
