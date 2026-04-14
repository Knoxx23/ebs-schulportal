import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

interface FormData {
  future_path: string;
  future_school: string;
  future_notes: string;
  future_company_name: string;
  future_company_phone: string;
  future_company_address: string;
  future_job_title: string;
  future_duration_from: string;
  future_duration_to: string;
  future_school_address: string;
  future_school_class: string;
  future_berufsfeld: string;
  future_measure_name: string;
  future_measure_org: string;
  future_measure_from: string;
  future_measure_to: string;
}

interface Step4Props {
  data: CaseData;
  t: Translation;
  onNext: (data: Partial<CaseData>) => void;
  onBack: () => void;
}

const pathOptions = [
  { value: 'A', label: 'A', desc: 'Weiterführende Schule', icon: '🏢' },
  { value: 'B', label: 'B', desc: 'Berufsausbildung / Betrieb', icon: '🔧' },
  { value: 'C', label: 'C', desc: 'Weiterhin Schule (BVB/BVJ)', icon: '📚' },
  { value: 'D', label: 'D', desc: 'Sonstige Maßnahme', icon: '📝' },
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
      future_company_name: data.future_company_name || '',
      future_company_phone: data.future_company_phone || '',
      future_company_address: data.future_company_address || '',
      future_job_title: data.future_job_title || '',
      future_duration_from: data.future_duration_from || '',
      future_duration_to: data.future_duration_to || '',
      future_school_address: data.future_school_address || '',
      future_school_class: data.future_school_class || '',
      future_berufsfeld: data.future_berufsfeld || '',
      future_measure_name: data.future_measure_name || '',
      future_measure_org: data.future_measure_org || '',
      future_measure_from: data.future_measure_from || '',
      future_measure_to: data.future_measure_to || '',
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

      {/* A: Weiterführende Schule */}
      {selectedPath === 'A' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="font-medium text-gray-700 text-sm">Angaben zur weiterführenden Schule</h3>
          <div className="form-group">
            <label className="label" htmlFor="future_school">Name der Schule</label>
            <input id="future_school" type="text" className="input" {...register('future_school')} placeholder="z.B. Muster-Gymnasium" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_school_address">Anschrift der Schule</label>
            <input id="future_school_address" type="text" className="input" {...register('future_school_address')} placeholder="Straße, PLZ, Ort" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_school_class">Aufgenommen in Klasse</label>
            <input id="future_school_class" type="text" className="input" {...register('future_school_class')} placeholder="z.B. 5a" />
          </div>
        </div>
      )}

      {/* B: Berufsausbildung / Betrieb */}
      {selectedPath === 'B' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="font-medium text-gray-700 text-sm">Angaben zum Ausbildungsbetrieb</h3>
          <div className="form-group">
            <label className="label" htmlFor="future_company_name">Name des Betriebs</label>
            <input id="future_company_name" type="text" className="input" {...register('future_company_name')} placeholder="Firmenname" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_company_address">Anschrift des Betriebs</label>
            <input id="future_company_address" type="text" className="input" {...register('future_company_address')} placeholder="Straße, PLZ, Ort" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_company_phone">Telefon des Betriebs</label>
            <input id="future_company_phone" type="tel" className="input" {...register('future_company_phone')} placeholder="+49 123 456789" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_job_title">Ausbildungsberuf</label>
            <input id="future_job_title" type="text" className="input" {...register('future_job_title')} placeholder="z.B. Kaufmann/-frau für Büromanagement" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_berufsfeld">Berufsfeld</label>
            <input id="future_berufsfeld" type="text" className="input" {...register('future_berufsfeld')} placeholder="z.B. Wirtschaft und Verwaltung" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label" htmlFor="future_duration_from">Ausbildungsbeginn</label>
              <input id="future_duration_from" type="date" className="input" {...register('future_duration_from')} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="future_duration_to">Ausbildungsende</label>
              <input id="future_duration_to" type="date" className="input" {...register('future_duration_to')} />
            </div>
          </div>
        </div>
      )}

      {/* C: Weiterhin Schule (BVB/BVJ) */}
      {selectedPath === 'C' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="font-medium text-gray-700 text-sm">Angaben zur Schule (BVB/BVJ)</h3>
          <div className="form-group">
            <label className="label" htmlFor="future_school">Name der Schule</label>
            <input id="future_school" type="text" className="input" {...register('future_school')} placeholder="z.B. Berufskolleg Muster" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_school_address">Anschrift der Schule</label>
            <input id="future_school_address" type="text" className="input" {...register('future_school_address')} placeholder="Straße, PLZ, Ort" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_school_class">Klasse / Bildungsgang</label>
            <input id="future_school_class" type="text" className="input" {...register('future_school_class')} placeholder="z.B. BVJ, BVB" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_berufsfeld">Berufsfeld</label>
            <input id="future_berufsfeld" type="text" className="input" {...register('future_berufsfeld')} placeholder="z.B. Wirtschaft und Verwaltung" />
          </div>
        </div>
      )}

      {/* D: Sonstige Maßnahme */}
      {selectedPath === 'D' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="font-medium text-gray-700 text-sm">Angaben zur Maßnahme</h3>
          <div className="form-group">
            <label className="label" htmlFor="future_measure_name">Bezeichnung der Maßnahme</label>
            <input id="future_measure_name" type="text" className="input" {...register('future_measure_name')} placeholder="z.B. Berufsvorbereitende Bildungsmaßnahme" />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="future_measure_org">Maßnahmeträger</label>
            <input id="future_measure_org" type="text" className="input" {...register('future_measure_org')} placeholder="Name der Organisation / des Trägers" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label" htmlFor="future_measure_from">Beginn</label>
              <input id="future_measure_from" type="date" className="input" {...register('future_measure_from')} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="future_measure_to">Ende</label>
              <input id="future_measure_to" type="date" className="input" {...register('future_measure_to')} />
            </div>
          </div>
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
