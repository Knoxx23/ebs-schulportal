import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casesApi } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';

interface CaseDetail {
  id: number;
  status: string;
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place: string;
  gender: string;
  nationality: string;
  guardian_name: string;
  guardian_street: string;
  guardian_zip: string;
  guardian_city: string;
  phone: string;
  email: string;
  kindergarten: string;
  enrollment_year: string;
  enrollment_date: string;
  future_path: string;
  future_school: string;
  future_notes: string;
  language: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  approved_at: string;
  approved_by_name: string;
  return_note: string;
  document_path: string;
  class_ref: string;
}

interface AuditEntry {
  id: number;
  event_type: string;
  actor_type: string;
  actor_id: string;
  staff_name: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const genderLabels: Record<string, string> = { m: 'Männlich', f: 'Weiblich', d: 'Divers' };
const pathLabels: Record<string, string> = {
  A: 'A – Weiterführende Schule', B: 'B – Berufsausbildung',
  C: 'C – Weiterhin Schule', D: 'D – Sonstiges',
};

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; }
}

function formatDateTime(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('de-DE'); } catch { return d; }
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<CaseDetail>>({});
  const [saving, setSaving] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCase();
  }, [id]);

  async function loadCase() {
    setLoading(true);
    try {
      const res = await casesApi.get(id!);
      setCaseData(res.data.case);
      setEditData(res.data.case);
      setAuditHistory(res.data.auditHistory);
    } catch {
      setError('Fall nicht gefunden');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await casesApi.update(id!, editData as Record<string, unknown>);
      setCaseData(res.data.case);
      setEditMode(false);
      setActionMessage('Gespeichert');
      setTimeout(() => setActionMessage(''), 3000);
      loadCase();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await casesApi.approve(id!);
      setCaseData(res.data.case);
      setActionMessage(res.data.message || 'Genehmigt');
      loadCase();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Genehmigen');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturn() {
    if (!returnNote.trim() || returnNote.trim().length < 5) {
      setError('Bitte einen Rückgabehinweis eingeben (mind. 5 Zeichen)');
      return;
    }
    setActionLoading(true);
    try {
      const res = await casesApi.return(id!, returnNote);
      setCaseData(res.data.case);
      setShowReturnModal(false);
      setReturnNote('');
      setActionMessage('Zurückgegeben');
      loadCase();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Zurückgeben');
    } finally {
      setActionLoading(false);
    }
  }

  function handleDownloadDoc() {
    window.open(`/api/documents/${id}`, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Laden...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Fall nicht gefunden'}</p>
          <button onClick={() => navigate('/school/dashboard')} className="btn-secondary">← Zurück</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/school/dashboard')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </button>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-semibold text-sm">
                Fall #{caseData.id}: {caseData.last_name}, {caseData.first_name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Action messages */}
              {actionMessage && (
                <span className="text-sm text-green-600 font-medium">{actionMessage}</span>
              )}

              {/* Document download */}
              {caseData.status === 'approved' && caseData.document_path && (
                <button onClick={handleDownloadDoc} className="btn-secondary text-sm px-3 py-1.5">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Dokument
                </button>
              )}

              {/* Return */}
              {caseData.status === 'submitted' && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="btn-danger text-sm px-3 py-1.5"
                  disabled={actionLoading}
                >
                  Zurückgeben
                </button>
              )}

              {/* Approve */}
              {caseData.status === 'submitted' && (
                <button
                  onClick={handleApprove}
                  className="btn-success text-sm px-3 py-1.5"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Bitte warten...' : '✓ Genehmigen'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status bar */}
            <div className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <StatusBadge status={caseData.status} size="md" />
                {caseData.class_ref && (
                  <span className="text-sm text-gray-500">Klasse: <strong>{caseData.class_ref}</strong></span>
                )}
              </div>
              <div className="flex gap-2">
                {!editMode && caseData.status !== 'approved' && caseData.status !== 'archived' && (
                  <button onClick={() => setEditMode(true)} className="btn-secondary text-sm px-3 py-1.5">
                    Bearbeiten
                  </button>
                )}
                {editMode && (
                  <>
                    <button onClick={() => { setEditMode(false); setEditData(caseData); }} className="btn-secondary text-sm px-3 py-1.5">
                      Abbrechen
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-1.5">
                      {saving ? 'Speichern...' : 'Speichern'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Return note */}
            {caseData.return_note && (
              <div className="card border-l-4 border-red-400 bg-red-50">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-800 text-sm mb-1">Rückgabehinweis</p>
                    <p className="text-red-700 text-sm">{caseData.return_note}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Person section */}
            <FormSection title="Angaben zur Person">
              <FieldGroup label="Nachname" editMode={editMode}
                value={caseData.last_name}
                editValue={editData.last_name || ''}
                onChange={(v) => setEditData({ ...editData, last_name: v })} />
              <FieldGroup label="Vorname" editMode={editMode}
                value={caseData.first_name}
                editValue={editData.first_name || ''}
                onChange={(v) => setEditData({ ...editData, first_name: v })} />
              <FieldGroup label="Geburtsdatum" editMode={editMode} type="date"
                value={formatDate(caseData.birth_date)}
                editValue={editData.birth_date || ''}
                onChange={(v) => setEditData({ ...editData, birth_date: v })} />
              <FieldGroup label="Geburtsort" editMode={editMode}
                value={caseData.birth_place}
                editValue={editData.birth_place || ''}
                onChange={(v) => setEditData({ ...editData, birth_place: v })} />
              <FieldGroup label="Geschlecht" editMode={editMode} type="select"
                options={[{ value: 'm', label: 'Männlich' }, { value: 'f', label: 'Weiblich' }, { value: 'd', label: 'Divers' }]}
                value={genderLabels[caseData.gender] || caseData.gender}
                editValue={editData.gender || ''}
                onChange={(v) => setEditData({ ...editData, gender: v })} />
              <FieldGroup label="Staatsangehörigkeit" editMode={editMode}
                value={caseData.nationality}
                editValue={editData.nationality || ''}
                onChange={(v) => setEditData({ ...editData, nationality: v })} />
            </FormSection>

            {/* Family section */}
            <FormSection title="Familie &amp; Kontakt">
              <FieldGroup label="Erziehungsberechtigte/r" editMode={editMode}
                value={caseData.guardian_name}
                editValue={editData.guardian_name || ''}
                onChange={(v) => setEditData({ ...editData, guardian_name: v })} />
              <FieldGroup label="Straße" editMode={editMode}
                value={caseData.guardian_street}
                editValue={editData.guardian_street || ''}
                onChange={(v) => setEditData({ ...editData, guardian_street: v })} />
              <FieldGroup label="PLZ" editMode={editMode}
                value={caseData.guardian_zip}
                editValue={editData.guardian_zip || ''}
                onChange={(v) => setEditData({ ...editData, guardian_zip: v })} />
              <FieldGroup label="Ort" editMode={editMode}
                value={caseData.guardian_city}
                editValue={editData.guardian_city || ''}
                onChange={(v) => setEditData({ ...editData, guardian_city: v })} />
              <FieldGroup label="Telefon" editMode={editMode}
                value={caseData.phone}
                editValue={editData.phone || ''}
                onChange={(v) => setEditData({ ...editData, phone: v })} />
              <FieldGroup label="E-Mail" editMode={editMode} type="email"
                value={caseData.email}
                editValue={editData.email || ''}
                onChange={(v) => setEditData({ ...editData, email: v })} />
            </FormSection>

            {/* School section */}
            <FormSection title="Schullaufbahn">
              <FieldGroup label="Kindergarten / Kita" editMode={editMode}
                value={caseData.kindergarten}
                editValue={editData.kindergarten || ''}
                onChange={(v) => setEditData({ ...editData, kindergarten: v })} />
              <FieldGroup label="Einschulungsjahr" editMode={editMode}
                value={caseData.enrollment_year}
                editValue={editData.enrollment_year || ''}
                onChange={(v) => setEditData({ ...editData, enrollment_year: v })} />
              <FieldGroup label="Aufnahmedatum" editMode={editMode} type="date"
                value={formatDate(caseData.enrollment_date)}
                editValue={editData.enrollment_date || ''}
                onChange={(v) => setEditData({ ...editData, enrollment_date: v })} />
            </FormSection>

            {/* Future section */}
            {caseData.future_path && (
              <FormSection title="Künftige Tätigkeit">
                <FieldGroup label="Weg" editMode={editMode} type="select"
                  options={[
                    { value: 'A', label: 'A – Weiterführende Schule' },
                    { value: 'B', label: 'B – Berufsausbildung' },
                    { value: 'C', label: 'C – Weiterhin Schule' },
                    { value: 'D', label: 'D – Sonstiges' },
                  ]}
                  value={pathLabels[caseData.future_path] || caseData.future_path}
                  editValue={editData.future_path || ''}
                  onChange={(v) => setEditData({ ...editData, future_path: v })} />
                <FieldGroup label="Schule" editMode={editMode}
                  value={caseData.future_school}
                  editValue={editData.future_school || ''}
                  onChange={(v) => setEditData({ ...editData, future_school: v })} />
                <FieldGroup label="Bemerkungen" editMode={editMode}
                  value={caseData.future_notes}
                  editValue={editData.future_notes || ''}
                  onChange={(v) => setEditData({ ...editData, future_notes: v })} />
              </FormSection>
            )}
          </div>

          {/* Right: Timeline & audit */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Zeitverlauf</h3>
              <div className="space-y-3">
                <TimelineItem
                  label="Erstellt"
                  date={formatDateTime(caseData.created_at)}
                  icon="created"
                />
                {caseData.submitted_at && (
                  <TimelineItem label="Eingereicht" date={formatDateTime(caseData.submitted_at)} icon="submitted" />
                )}
                {caseData.return_note && (
                  <TimelineItem label="Zurückgegeben" date="—" icon="returned" />
                )}
                {caseData.approved_at && (
                  <TimelineItem
                    label={`Genehmigt${caseData.approved_by_name ? ` von ${caseData.approved_by_name}` : ''}`}
                    date={formatDateTime(caseData.approved_at)}
                    icon="approved"
                  />
                )}
              </div>
            </div>

            {/* Audit trail */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Protokoll</h3>
              {auditHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Kein Protokoll vorhanden</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditHistory.map((entry) => (
                    <div key={entry.id} className="text-xs border-b border-gray-50 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-gray-800">{formatEventType(entry.event_type)}</span>
                        <span className="text-gray-400 whitespace-nowrap">{formatDateTime(entry.created_at).split(',')[0]}</span>
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        {entry.actor_type === 'staff' && entry.staff_name ? entry.staff_name : entry.actor_type}
                        {entry.ip_address && ` · ${entry.ip_address}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Return modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Formular zurückgeben</h2>
              <p className="text-sm text-gray-500 mt-1">Der Erziehungsberechtigte erhält eine Benachrichtigung mit Ihrem Hinweis.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-group">
                <label className="label">Rückgabehinweis für Eltern *</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Bitte erläutern Sie, was korrigiert werden soll..."
                  rows={4}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReturnModal(false); setReturnNote(''); setError(''); }}
                  className="btn-secondary flex-1"
                  disabled={actionLoading}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReturn}
                  className="btn-danger flex-1"
                  disabled={actionLoading || returnNote.trim().length < 5}
                >
                  {actionLoading ? 'Bitte warten...' : 'Zurückgeben'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100"
        dangerouslySetInnerHTML={{ __html: title }} />
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
        {children}
      </dl>
    </div>
  );
}

interface FieldGroupProps {
  label: string;
  value?: string;
  editValue: string;
  editMode: boolean;
  type?: string;
  options?: { value: string; label: string }[];
  onChange: (v: string) => void;
}

function FieldGroup({ label, value, editValue, editMode, type = 'text', options, onChange }: FieldGroupProps) {
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <dt className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</dt>
      {editMode ? (
        type === 'select' ? (
          <select className="input text-sm py-1.5" value={editValue} onChange={(e) => onChange(e.target.value)}>
            <option value="">— Bitte wählen —</option>
            {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={type}
            className="input text-sm py-1.5"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <dd className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</dd>
      )}
    </div>
  );
}

function TimelineItem({ label, date, icon }: { label: string; date: string; icon: string }) {
  const iconClasses: Record<string, string> = {
    created: 'bg-gray-100 text-gray-500',
    submitted: 'bg-blue-100 text-blue-600',
    returned: 'bg-red-100 text-red-600',
    approved: 'bg-green-100 text-green-600',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${iconClasses[icon] || 'bg-gray-100 text-gray-500'}`}>
        <span className="text-xs">
          {icon === 'created' && '📄'}
          {icon === 'submitted' && '📬'}
          {icon === 'returned' && '↩'}
          {icon === 'approved' && '✓'}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{date}</p>
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    invitation_activated: 'Einladung aktiviert',
    case_submitted: 'Formular eingereicht',
    case_updated_by_staff: 'Von Personal bearbeitet',
    case_approved: 'Genehmigt',
    case_returned: 'Zurückgegeben',
    document_downloaded: 'Dokument heruntergeladen',
    login_success: 'Anmeldung',
    login_failed: 'Anmeldefehler',
    logout: 'Abmeldung',
    activation_failed: 'Aktivierung fehlgeschlagen',
  };
  return labels[type] || type.replace(/_/g, ' ');
}
