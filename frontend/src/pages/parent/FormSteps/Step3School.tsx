import React from 'react';
import { useForm } from 'react-hook-form';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

interface FormData {
  kindergarten: string;
  enrollment_year: string;
  enrollment_date: string;
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
