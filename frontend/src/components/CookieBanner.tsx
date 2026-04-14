import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm">
              Diese Website verwendet nur technisch notwendige Cookies, um die Sitzung zu verwalten. Es werden keine Tracking-Cookies gesetzt.
            </p>
            <button
              onClick={() => navigate('/datenschutz')}
              className="text-primary-400 hover:text-primary-300 underline text-sm mt-1 sm:mt-0"
            >
              Weitere Informationen in der Datenschutzerklärung
            </button>
          </div>
          <button
            onClick={handleAccept}
            className="btn-primary px-6 py-2 text-sm font-semibold whitespace-nowrap flex-shrink-0"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
