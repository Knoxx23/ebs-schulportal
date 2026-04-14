import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

const schema = z.object({
  guardian_name: z.string().min(1, 'Pflichtfeld'),
  guardian_street: z.string().min(1, 'Pflichtfeld'),
  guardian_zip: z.string().min(4, 'Mindestens 4 Zeichen').max(10),
  guardian_city: z.string().min(1, 'Pflichtfeld'),
  phone: z.string().min(1, 'Pflichtfeld'),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Step2Props {
  data: CaseData;
  t: Translation;
  onNext: (data: Partial<CaseData>) => void;
  onBack: () => void;
}

export default function Step2Family({ data, t, onNext, onBack }: Step2Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      guardian_name: data.guardian_name || '',
      guardian_street: data.guardian_street || '',
      guardian_zip: data.guardian_zip || '',
      guardian_city: data.guardian_city || '',
      phone: data.phone || '',
      email: data.email || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Guardian */}
      <div className="form-group">
        <label className="label" htmlFor="guardian_name">
          {t.guardian} <span className="text-red-500">*</span>
        </label>
        <input
          id="guardian_name"
          type="text"
          className={`input ${errors.guardian_name ? 'input-error' : ''}`}
          {...register('guardian_name')}
          placeholder="Vollständiger Name"
          autoCapitalize="words"
        />
        {errors.guardian_name && <p className="error-msg">{errors.guardian_name.message}</p>}
      </div>

      {/* Address section */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700 text-sm border-b border-gray-100 pb-2">{t.addressSection}</h3>

        <div className="form-group">
          <label className="label" htmlFor="guardian_street">
            {t.street} <span className="text-red-500">*</span>
          </label>
          <input
            id="guardian_street"
            type="text"
            className={`input ${errors.guardian_street ? 'input-error' : ''}`}
            {...register('guardian_street')}
            placeholder="Musterstraße 1"
          />
          {errors.guardian_street && <p className="error-msg">{errors.guardian_street.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label" htmlFor="guardian_zip">
              {t.zip} <span className="text-red-500">*</span>
            </label>
            <input
              id="guardian_zip"
              type="text"
              className={`input ${errors.guardian_zip ? 'input-error' : ''}`}
              {...register('guardian_zip')}
              placeholder="12345"
              maxLength={10}
            />
            {errors.guardian_zip && <p className="error-msg">{errors.guardian_zip.message}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="guardian_city">
              {t.city} <span className="text-red-500">*</span>
            </label>
            <input
              id="guardian_city"
              type="text"
              className={`input ${errors.guardian_city ? 'input-error' : ''}`}
              {...register('guardian_city')}
              placeholder="Musterstadt"
            />
            {errors.guardian_city && <p className="error-msg">{errors.guardian_city.message}</p>}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="form-group">
          <label className="label" htmlFor="phone">
            {t.phone} <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            className={`input ${errors.phone ? 'input-error' : ''}`}
            {...register('phone')}
            placeholder="+49 123 456789"
          />
          {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="email">{t.email}</label>
          <input
            id="email"
            type="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            {...register('email')}
            placeholder="beispiel@email.de"
          />
          {errors.email && <p className="error-msg">{errors.email.message}</p>}
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
