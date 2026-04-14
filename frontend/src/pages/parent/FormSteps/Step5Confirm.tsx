import React, { useState } from 'react';
import { Translation } from '../../../i18n/translations';
import { CaseData } from '../../../stores/authStore';

interface Step5Props {
  data: CaseData;
  t: Translation;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500 w-40 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium flex-1">{value}</dd>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="flex-1 h-px bg-gray-100" />
        {title}
        <span className="flex-1 h-px bg-gray-100" />
      </h3>
      <dl className="space-y-0">{children}</dl>
    </div>
  );
}

const genderLabels: Record<string, string> = { m: 'Männlich', f: 'Weiblich', d: 'Divers' };
const pathLabels: Record<string, string> = {
  A: 'A – Weiterführende Schule',
  B: 'B – Berufsausbildung',
  C: 'C – Weiterhin Schule',
  D: 'D – Sonstiges',
};

export default function Step5Confirm({ data, t, onSubmit, onBack, loading }: Step5Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const canSubmit = confirmed && confirmName.trim().length >= 2;

  function formatDate(d?: string) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('de-DE');
    } catch {
      return d;
    }
  }

  return (
    <div className="space-y-6">
      {/* Review */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t.reviewTitle}</h2>

        <ReviewSection title="Angaben zur Person">
          <ReviewRow label={t.lastName} value={data.last_name} />
          <ReviewRow label={t.firstName} value={data.first_name} />
          <ReviewRow label={t.birthDate} value={formatDate(data.birth_date)} />
          <ReviewRow label={t.birthPlace} value={data.birth_place} />
          <ReviewRow label={t.gender} value={data.gender ? genderLabels[data.gender] || data.gender : ''} />
          <ReviewRow label={t.nationality} value={data.nationality} />
        </ReviewSection>

        <ReviewSection title="Familie &amp; Kontakt">
          <ReviewRow label={t.guardian} value={data.guardian_name} />
          <ReviewRow label={t.street} value={data.guardian_street} />
          <ReviewRow label={t.zip + ' / ' + t.city} value={[data.guardian_zip, data.guardian_city].filter(Boolean).join(' ')} />
          <ReviewRow label={t.phone} value={data.phone} />
          <ReviewRow label={t.email} value={data.email} />
        </ReviewSection>

        <ReviewSection title="Schullaufbahn">
          <ReviewRow label={t.kindergarten} value={data.kindergarten} />
          <ReviewRow label={t.enrollmentYear} value={data.enrollment_year} />
          <ReviewRow label={t.enrollmentDate} value={formatDate(data.enrollment_date)} />
        </ReviewSection>

        {data.future_path && (
          <ReviewSection title="Künftige Tätigkeit">
            <ReviewRow label={t.futurePath} value={pathLabels[data.future_path] || data.future_path} />
            <ReviewRow label={t.futureSchool} value={data.future_school} />
            <ReviewRow label={t.futureNotes} value={data.future_notes} />
          </ReviewSection>
        )}
      </div>

      {/* Confirmation */}
      <div className="space-y-4">
        <div className="form-group">
          <label className="label" htmlFor="confirmName">{t.confirmName}</label>
          <input
            id="confirmName"
            type="text"
            className="input"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Vollständiger Name des Erziehungsberechtigten"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            {t.confirmCheckbox}
          </span>
        </label>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary px-6" disabled={loading}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.back}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className="btn-success px-8 font-semibold"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.loading}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t.submit}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
