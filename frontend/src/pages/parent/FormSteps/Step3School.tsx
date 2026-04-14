import React from 'react';
import { useForm } from 'react-hook-form';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

interface FormData {
  kindergarten: string;
  enrollment_year: string;
  enrollment_date: string;
  last_school_type: string;
  last_school_name: string;
  graduation_expected: string;
  graduation_class: string;
}

interface Step3Props {
  data: CaseData;
  t: Translation;
  onNext: (data: Partial<CaseData>) => void;
  onBack: () => void;
}

// Generate year options
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear + 2; y >= currentYear - 2; y--) {
    years.push(y.toString());
  }
  return years;
}

export default function Step3School({ data, t, onNext, onBack }: Step3Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      kindergarten: data.kindergarten || '',
      enrollment_year: data.enrollment_year || '',
      enrollment_date: data.enrollment_date || '',
      last_school_type: data.last_school_type || '',
      last_school_name: data.last_school_name || '',
      graduation_expected: data.graduation_expected || '',
      graduation_class: data.graduation_class || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="form-group">
        <label className="label" htmlFor="kindergarten">{t.kindergarten}</label>
        <input
          id="kindergarten"
          type="text"
          className="input"
          {...register('kindergarten')}
          placeholder="Name des Kindergartens / der Kita"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="enrollment_year">{t.enrollmentYear}</label>
          <select
            id="enrollment_year"
            className="input"
            {...register('enrollment_year')}
          >
            <option value="">— Bitte wählen —</option>
            {getYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label" htmlFor="enrollment_date">{t.enrollmentDate}</label>
          <input
            id="enrollment_date"
            type="date"
            className="input"
            {...register('enrollment_date')}
          />
        </div>
      </div>

      {/* Last school */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700 text-sm border-b border-gray-100 pb-2">Zuletzt besuchte Schule</h3>
        <div className="form-group">
          <label className="label" htmlFor="last_school_type">Schultyp</label>
          <select id="last_school_type" className="input" {...register('last_school_type')}>
            <option value="">— Bitte wählen —</option>
            <option value="HS">Hauptschule (HS)</option>
            <option value="RS">Realschule (RS)</option>
            <option value="GE">Gesamtschule (GE)</option>
            <option value="GY">Gymnasium (GY)</option>
            <option value="sonstige">Sonstige Schule</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label" htmlFor="last_school_name">Name / Anschrift der Schule</label>
          <input id="last_school_name" type="text" className="input"
            {...register('last_school_name')} placeholder="z.B. Muster-Gymnasium, Musterstraße 1, 12345 Stadt" />
        </div>
      </div>

      {/* Graduation */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700 text-sm border-b border-gray-100 pb-2">Schulabschluss</h3>
        <div className="form-group">
          <label className="label" htmlFor="graduation_expected">Erwarteter Abschluss</label>
          <select id="graduation_expected" className="input" {...register('graduation_expected')}>
            <option value="">— Bitte wählen —</option>
            <option value="ohne">Ohne Abschluss</option>
            <option value="foerder_l">Förderschule L</option>
            <option value="hs_kl9">Hauptschulabschluss Kl. 9</option>
            <option value="sek1_hs_kl10">SEK I / Hauptschulabschluss Kl. 10</option>
            <option value="mittl_o_q">Mittlerer Abschluss ohne Qualifikation</option>
            <option value="mittl_m_q">Mittlerer Abschluss mit Qualifikation</option>
            <option value="sonstiger">Sonstiger Abschluss</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label" htmlFor="graduation_class">Entlassung aus Klasse</label>
          <select id="graduation_class" className="input" {...register('graduation_class')}>
            <option value="">— Bitte wählen —</option>
            {['7','8','9','10','11','12','13'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
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
