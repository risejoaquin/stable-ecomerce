import React, { useEffect, useState } from 'react';
import { useStoreConfig } from '../hooks/useStoreConfig';

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const { data: store } = useStoreConfig();
  const themeColor = store?.config?.themeColor || '#6B705C';

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay so it doesn't pop up immediately
      setTimeout(() => setShow(true), 1500);
    }
  }, []);

  if (!show) return null;

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
    // Initialize analytics here if added
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 flex flex-col sm:flex-row items-center gap-6 pointer-events-auto transform transition-transform animate-in slide-in-from-bottom-10">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">We value your privacy</h3>
          <p className="text-sm text-gray-500">
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button 
            onClick={handleDecline}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={handleAccept}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: themeColor }}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
