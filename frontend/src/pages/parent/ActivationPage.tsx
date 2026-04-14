import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { parentApi } from '../../api/client';
import { useParentStore } from '../../stores/authStore';
import { useTranslation, Language, languageDir } from '../../i18n/translations';

const languages: { code: Language; native: string; flag: string }[] = [
  { code: 'de', native: 'Deutsch', flag: '🇩����' },
  { code: 'en', native: 'English', flag: '🇬🇧' },
  { code: 'tr', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', native: 'العربية', flag: '🇸🇦' },
  { code: 'ua', native: 'Українська', flag: '🇺🇦' },
  { code: 'ru', native: 'Русский', flag: '🇷🇺' },
  { code: 'pl', native: 'Polski', flag: '🇵🇱' },
];

export default function ActivationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setIsAuthenticated, setCaseData, language, setLanguage } = useParentStore();
  const t = useTranslation(language);

  const [step, setStep] = useState<'language' | 'activate'>('language');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  function handleLanguageSelect(lang: Language) {
    setLanguage(lang);
    setStep('activate');
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token.trim() || !code.trim()) {
      setError(t.fieldRequired);
      return;
    }

    setLoading(true);
    try {
      const response = await parentApi.activate(token.trim(), code.trim().toUpperCase());
      setCaseData(response.data.case);
      setIsAuthenticated(true);
      navigate('/form');
    } catch (err: any) {
      const msg = err.response?.data?.error || t.activationError;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const dir = languageDir[language];

  // Step 1: Language selection
  if (step === 'language') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex flex-col">
        <header className="flex items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">EBS</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bitte wählen Sie Ihre Sprache
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                  Please select your language
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className="flex items-center gap-4 w-full px-5 py-4 rounded-xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-lg font-medium text-gray-800 group-hover:text-primary-700">
                      {lang.native}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-white/60 text-sm mt-6">
              Einschulungsblatt Management System
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Token + Code activation
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex flex-col" dir={dir}>
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('language')}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            title={t.back}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-semibold text-lg">EBS</span>
        </div>
        <button
          onClick={() => setStep('language')}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <span className="text-lg">{languages.find(l => l.code === language)?.flag}</span>
          <span className="text-white text-sm font-medium">{languages.find(l => l.code === language)?.native}</span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t.activationTitle}</h1>
              <p className="text-gray-500 text-sm mt-2">{t.activationSubtitle}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              <div className="form-group">
                <label className="label" htmlFor="token">{t.tokenLabel}</label>
                <input
                  id="token"
                  type="text"
                  className="input font-mono text-sm"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="code">{t.codeLabel}</label>
                <input
                  id="code"
                  type="text"
                  className="input font-mono text-lg tracking-widest uppercase text-center"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token.trim() || !code.trim()}
                className="btn-primary w-full mt-6 py-3 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.loading}
                  </span>
                ) : t.activateButton}
              </button>
            </form>
          </div>

          <p className="text-center text-white/60 text-sm mt-6">
            Einschulungsblatt Management System
          </p>
        </div>
      </div>
    </div>
  );
}
