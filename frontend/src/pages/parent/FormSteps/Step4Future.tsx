import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

interface FormData {
  future_path: string;
  future_school: string;
  future_notes: string;
}

interface Step4Props {
  data: CaseData;
  t: Translation;
  onNext: (data: Partial<CaseData>) => void;
  onBack: () => void;
}

const pathOptions = [
  { value: 'A', label: 'A', desc: 'Weiterführende Schule', icon: '🏫' },
  { value: 'B', label: 'B', desc: 'Berufsausbildung', icon: '🔧' },
  { value: 'C', label: 'C', desc: 'Weiterhin Schule', icon: '📚' },
  { value: 'D', label: 'D', desc: 'Sonstiges', icon: '📝' },
];

export default function Step4Future({ data, t, onNext, onBack }: Step4Props) {
  const [selectedPath, setSelectedPath] = useState(data.future_path || '');

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      future_path: data.future_path || '',
      future_school: data.future_school || '',
      future_notes: data.future_notes || '',
    },
  });

  function selectPath(val: string) {
    setSelectedPath(val);
    setValue('future_path', val);
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div>
        <label className="label mb-3">{t.futurePath}</label>
        <div className="grid grid-cols-2 gap-3">
          {pathOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectPath(opt.value)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-150
                ${selectedPath === opt.value
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{opt.icon}</span>
                <div>
                  <div className={`font-semibold text-sm ${selectedPath === opt.value ? 'text-primary-700' : 'text-gray-900'}`}>
                    {opt.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${selectedPath === opt.value ? 'text-primary-600' : 'text-gray-500'}`}>
                    {opt.desc}
                  </div>
                </div>
              </div>
              {selectedPath === opt.value && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        <input type="hidden" {...register('future_path')} />
      </div>

      {/* Show school name for A or C */}
      {(selectedPath === 'A' || selectedPath === 'C') && (
        <div className="form-group">
          <label className="label" htmlFor="future_school">{t.futureSchool}</label>
          <input
            id="future_school"
            type="text"
            className="input"
            {...register('future_school')}
            placeholder="Name der Schule"
          />
        </div>
      )}

      <div className="form-group">
        <label className="label" htmlFor="future_notes">{t.futureNotes}</label>
        <textarea
          id="future_notes"
          className="input min-h-[80px] resize-y"
          {...register('future_notes')}
          placeholder="Optionale Bemerkungen..."
          rows={3}
        />
      </div>

      <div className="pt-4 flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary px-6">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.back}
        </button>
        <button type="submit" className="btn-primary px-8">
          {t.next}
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
}
