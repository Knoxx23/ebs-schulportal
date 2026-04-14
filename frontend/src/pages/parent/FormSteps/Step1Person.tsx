import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

const schema = z.object({
  consent_given: z.boolean().refine((val) => val === true, {
    message: 'Sie müssen der Datenschutzerklärung zustimmen',
  }),
  last_name: z.string().min(1, 'Pflichtfeld'),
  first_name: z.string().min(1, 'Pflichtfeld'),
  birth_date: z.string().min(1, 'Pflichtfeld'),
  birth_place: z.string().min(1, 'Pflichtfeld'),
  birth_country: z.string().optional(),
  gender: z.string().min(1, 'Pflichtfeld'),
  nationality: z.string().optional(),
  immigration_year: z.string().optional(),
  aussiedler: z.string().optional(),
  confession: z.string().optional(),
  mother_tongue: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Step1Props {
  data: CaseData;
  t: Translation;
  onNext: (data: Partial<CaseData>) => void;
}

export default function Step1Person({ data, t, onNext }: Step1Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      consent_given: false,
      last_name: data.last_name || '',
      first_name: data.first_name || '',
      birth_date: data.birth_date || '',
      birth_place: data.birth_place || '',
      birth_country: data.birth_country || '',
      gender: data.gender || '',
      nationality: data.nationality || '',
      immigration_year: data.immigration_year || '',
      aussiedler: data.aussiedler || '',
      confession: data.confession || '',
      mother_tongue: data.mother_tongue || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Consent Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('consent_given')}
            className="w-5 h-5 mt-1 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 flex-1">
            Ich habe die{' '}
            <a
              href="/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline font-semibold"
            >
              Datenschutzerklärung
            </a>
            {' '}gelesen und willige in die Verarbeitung meiner Daten und der Daten meines Kindes zum Zweck der Einschulung ein.
          </span>
        </label>
        {errors.consent_given && (
          <p className="error-msg text-sm mt-2 ml-8">{errors.consent_given.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="last_name">
            {t.lastName} <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            type="text"
            className={`input ${errors.last_name ? 'input-error' : ''}`}
            {...register('last_name')}
            autoCapitalize="words"
          />
          {errors.last_name && <p className="error-msg">{errors.last_name.message}</p>}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="first_name">
            {t.firstName} <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            type="text"
            className={`input ${errors.first_name ? 'input-error' : ''}`}
            {...register('first_name')}
            autoCapitalize="words"
          />
          {errors.first_name && <p className="error-msg">{errors.first_name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="birth_date">
            {t.birthDate} <span className="text-red-500">*</span>
          </label>
          <input
            id="birth_date"
            type="date"
            className={`input ${errors.birth_date ? 'input-error' : ''}`}
            {...register('birth_date')}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.birth_date && <p className="error-msg">{errors.birth_date.message}</p>}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="birth_place">
            {t.birthPlace} <span className="text-red-500">*</span>
          </label>
          <input
            id="birth_place"
            type="text"
            className={`input ${errors.birth_place ? 'input-error' : ''}`}
            {...register('birth_place')}
          />
          {errors.birth_place && <p className="error-msg">{errors.birth_place.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="gender">
            {t.gender} <span className="text-red-500">*</span>
          </label>
          <select
            id="gender"
            className={`input ${errors.gender ? 'input-error' : ''}`}
            {...register('gender')}
          >
            <option value="">— Bitte wählen —</option>
            <option value="m">{t.genderMale}</option>
            <option value="f">{t.genderFemale}</option>
            <option value="d">{t.genderDiverse}</option>
          </select>
          {errors.gender && <p className="error-msg">{errors.gender.message}</p>}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="nationality">
            {t.nationality}
          </label>
          <input
            id="nationality"
            type="text"
            className="input"
            {...register('nationality')}
            placeholder="z.B. deutsch"
          />
        </div>
      </div>

      {/* Birth country */}
      <div className="form-group">
        <label className="label" htmlFor="birth_country">{t.birthCountry}</label>
        <input id="birth_country" type="text" className="input"
          {...register('birth_country')} placeholder={t.placeholderCountry} />
      </div>

      {/* Immigration year & Aussiedler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="immigration_year">{t.immigrationYear}</label>
          <input id="immigration_year" type="text" className="input"
            {...register('immigration_year')} placeholder={t.placeholderYear} maxLength={4} />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="aussiedler">{t.aussiedler}</label>
          <select id="aussiedler" className="input" {...register('aussiedler')}>
            <option value="">—</option>
            <option value="ja">{t.aussiedlerYes}</option>
            <option value="nein">{t.aussiedlerNo}</option>
          </select>
        </div>
      </div>

      {/* Confession & Mother tongue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="confession">{t.confession}</label>
          <input id="confession" type="text" className="input"
            {...register('confession')} placeholder="" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="mother_tongue">{t.motherTongue}</label>
          <input id="mother_tongue" type="text" className="input"
            {...register('mother_tongue')} placeholder="" />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
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
