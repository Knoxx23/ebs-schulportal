import React, { useState, useRef, useEffect } from 'react';
import { Language, languageNames } from '../i18n/translations';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'light' | 'dark';
}

const languageFlags: Record<Language, string> = {
  de: '🇩🇪',
  en: '🇬🇧',
  tr: '🇹🇷',
  ar: '🇸🇦',
  ua: '🇺🇦',
  ru: '🇷🇺',
  pl: '🇵🇱',
};

export default function LanguageSelector({ currentLanguage, onLanguageChange, variant = 'light' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonClasses = variant === 'dark'
    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${buttonClasses}`}
        aria-label="Language selector"
      >
        <span>{languageFlags[currentLanguage]}</span>
        <span>{languageNames[currentLanguage]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {(Object.keys(languageNames) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onLanguageChange(lang);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors
                ${lang === currentLanguage ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}
              `}
            >
              <span className="text-base">{languageFlags[lang]}</span>
              <span>{languageNames[lang]}</span>
              {lang === currentLanguage && (
                <svg className="w-4 h-4 ml-auto text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
