import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parentApi } from '../../api/client';
import { useParentStore } from '../../stores/authStore';
import { useTranslation, languageDir } from '../../i18n/translations';
import LanguageSelector from '../../components/LanguageSelector';

export default function StatusPage() {
  const navigate = useNavigate();
  const { language, setLanguage, isAuthenticated } = useParentStore();
  const t = useTranslation(language);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const dir = languageDir[language];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/activate');
      return;
    }
    fetchStatus();
  }, [isAuthenticated]);

  async function fetchStatus() {
    try {
      const res = await parentApi.getStatus();
      setStatus(res.data);
    } catch {
      setError('Sitzung abgelaufen. Bitte neu aktivieren.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData() {
    try {
      setExporting(true);
      const response = await fetch('/api/parent/case/export');
      if (!response.ok) {
        throw new Error('Export fehlgeschlagen');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meine-daten-dsgvo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Datenexport fehlgeschlagen. Bitte später versuchen.');
    } finally {
      setExporting(false);
    }
  }

  const statusMessages: Record<string, string> = {
    draft: t.statusDraftMsg,
    submitted: t.statusSubmittedMsg,
    returned: t.statusReturnedMsg,
    approved: t.statusApprovedMsg,
  };

  const statusIcons: Record<string, { icon: string; bg: string; text: string }> = {
    draft: { icon: '✏️', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    submitted: { icon: '📬', bg: 'bg-blue-50', text: 'text-blue-700' },
    returned: { icon: '↩️', bg: 'bg-red-50', text: 'text-red-700' },
    approved: { icon: '✅', bg: 'bg-green-50', text: 'text-green-700' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">EBS</span>
          </div>
          <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t.statusPageTitle}</h1>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">{error}</div>
        )}

        {status && (
          <div className="space-y-4">
            {/* Status card */}
            <div className={`card ${statusIcons[status.status]?.bg || 'bg-white'}`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{statusIcons[status.status]?.icon || '📄'}</span>
                <div>
                  <p className={`text-lg font-semibold ${statusIcons[status.status]?.text || 'text-gray-900'}`}>
                    {statusMessages[status.status] || status.status}
                  </p>
                  {status.submittedAt && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Eingereicht: {new Date(status.submittedAt).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Return note */}
            {status.status === 'returned' && status.returnNote && (
              <div className="card border-l-4 border-red-400">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.returnNote}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">{status.returnNote}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {(status.status === 'draft' || status.status === 'returned') && (
                <button
                  onClick={() => navigate('/form')}
                  className="btn-primary w-full py-3 text-base font-semibold"
                >
                  {t.continueForm}
                </button>
              )}

              {/* Data Export Button */}
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exporting ? 'Exportieren...' : 'Meine Daten exportieren (DSGVO)'}
              </button>

              {/* Privacy Links */}
              <div className="flex gap-2 text-xs">
                <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline flex-1">
                  Datenschutzerklärung
                </a>
                <a href="/impressum" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline flex-1">
                  Impressum
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
