import React, { useEffect } from 'react';
import { useStoreConfig } from '../hooks/useStoreConfig';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: store, isLoading } = useStoreConfig();

  useEffect(() => {
    if (!store?.config) return;
    
    const config = store.config;
    const root = document.documentElement;
    
    if (config.themeColor) {
      root.style.setProperty('--color-primary', config.themeColor);
    }
    if (config.secondaryColor) {
      root.style.setProperty('--color-secondary', config.secondaryColor);
    }
    if (config.backgroundColor) {
      root.style.setProperty('--color-background', config.backgroundColor);
    }
    if (config.textColor) {
      root.style.setProperty('--color-text', config.textColor);
    }
    if (config.buttonColor) {
      root.style.setProperty('--color-button', config.buttonColor);
    } else if (config.themeColor) {
      root.style.setProperty('--color-button', config.themeColor);
    }

    // Load font dynamically
    if (config.fontFamily) {
      const fontName = config.fontFamily;
      root.style.setProperty('--font-primary', `"${fontName}", sans-serif`);
      
      const linkId = 'dynamic-google-font';
      let link = document.getElementById(linkId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    }
  }, [store?.config]);

  // We could show a loading state, but it might flash. 
  // We can just render children immediately and the styles will apply when config loads.
  return <>{children}</>;
};
