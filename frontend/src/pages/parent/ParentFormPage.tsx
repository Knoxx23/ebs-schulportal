import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parentApi } from '../../api/client';
import { useParentStore, CaseData } from '../../stores/authStore';
import { useTranslation, languageDir, Language } from '../../i18n/translations';
import ProgressBar from '../../components/ProgressBar';
import LanguageSelector from '../../components/LanguageSelector';
import Step1Person from './FormSteps/Step1Person';
import Step2Family from './FormSteps/Step2Family';
import Step3School from './FormSteps/Step3School';
import Step4Future from './FormSteps/Step4Future';
import Step5Confirm from './FormSteps/Step5Confirm';

const TOTAL_STEPS = 5;
const AUTO_SAVE_DELAY = 1500; // ms

export default function ParentFormPage() {
  const navigate = useNavigate();
  const {
    caseData, setCaseData, updateCaseData,
    currentStep, setCurrentStep,
    language, setLanguage,
    isAuthenticated,
  } = useParentStore();

  const t = useTranslation(language);
  const dir = languageDir[language];

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/activate');
      return;
    }
    // Load case data from server on mount
    loadCase();
  }, []);

  async function loadCase() {
    try {
      const res = await parentApi.getCase();
      setCaseData(res.data.case);
      // If already submitted, redirect to status
      if (res.data.case.status === 'submitted' || res.data.case.status === 'approved') {
        navigate('/status');
      }
    } catch {
      navigate('/activate');
    }
  }

  const saveData = useCallback(async (data: Partial<CaseData>) => {
    try {
      setSaving(true);
      setSaveError('');
      await parentApi.updateCase(data as Record<string, unknown>);
    } catch {
      setSaveError('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }, []);

  function scheduleAutoSave(data: Partial<CaseData>) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => saveData(data), AUTO_SAVE_DELAY);
    setAutoSaveTimer(timer);
  }

  async function handleStepNext(stepData: Partial<CaseData>) {
    updateCaseData(stepData);
    const merged = { ...caseData, ...stepData };

    // Add consent data on first step
    if (currentStep === 1 && (stepData as any).consent_given) {
      (merged as any).consent_timestamp = new Date().toISOString();
    }

    await saveData(merged);
    setCurrentStep(Math.min(currentStep + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleStepBack() {
    setCurrentStep(Math.max(currentStep - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    setSubmitLoading(true);
    try {
      await parentApi.submitCase();
      setSubmitted(true);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Einreichen fehlgeschlagen');
    } finally {
      setSubmitLoading(false);
    }
  }

  const stepTitles = [t.step1Title, t.step2Title, t.step3Title, t.step4Title, t.step5Title];

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.success}!</h2>
          <p className="text-gray-600 leading-relaxed">{t.submitSuccess}</p>
          <button
            onClick={() => navigate('/status')}
            className="btn-primary mt-8 px-8 py-3 text-base font-semibold w-full"
          >
            Status anzeigen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-sm hidden sm:block">Einschulungsblatt</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {saving ? (
                  <>
                    <span className="w-3 h-3 border border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                    <span>Speichern...</span>
                  </>
                ) : saveError ? (
                  <span className="text-red-500">{saveError}</span>
                ) : (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Gespeichert</span>
                  </>
                )}
              </div>
              <LanguageSelector
                currentLanguage={language}
                onLanguageChange={(lang: Language) => setLanguage(lang)}
              />
            </div>
          </div>

          <ProgressBar
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            stepTitles={stepTitles}
          />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">
              {t.step} {currentStep} {t.of} {TOTAL_STEPS}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{stepTitles[currentStep - 1]}</h1>
          </div>

          {caseData && (
            <>
              {currentStep === 1 && (
                <Step1Person data={caseData} t={t} onNext={handleStepNext} />
              )}
              {currentStep === 2 && (
                <Step2Family data={caseData} t={t} onNext={handleStepNext} onBack={handleStepBack} />
              )}
              {currentStep === 3 && (
                <Step3School data={caseData} t={t} onNext={handleStepNext} onBack={handleStepBack} />
              )}
              {currentStep === 4 && (
                <Step4Future data={caseData} t={t} onNext={handleStepNext} onBack={handleStepBack} />
              )}
              {currentStep === 5 && (
                <Step5Confirm
                  data={caseData}
                  t={t}
                  onSubmit={handleSubmit}
                  onBack={handleStepBack}
                  loading={submitLoading}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
