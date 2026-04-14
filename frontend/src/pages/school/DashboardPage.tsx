import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesApi, invitationsApi, authApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import StatusBadge from '../../components/StatusBadge';

interface Case {
  id: number;
  status: string;
  last_name: string;
  first_name: string;
  birth_date: string;
  gender: string;
  guardian_name: string;
  phone: string;
  email: string;
  enrollment_year: string;
  submitted_at: string;
  updated_at: string;
  class_ref: string;
  return_note: string;
}

interface Invitation {
  id: number;
  token: string;
  code: string;
  child_last_name: string;
  child_first_name: string;
  class_ref: string;
  status: string;
  created_by_name: string;
  created_at: string;
  expires_at: string;
  activated_at: string;
  activationUrl: string;
  case_id: number | null;
  case_status: string | null;
}

interface StatusCounts {
  draft?: number;
  submitted?: number;
  returned?: number;
  approved?: number;
  archived?: number;
}

const inviteStatusLabel: Record<string, string> = {
  pending: 'Ausstehend',
  activated: 'Aktiviert',
  completed: 'Abgeschlossen',
  expired: 'Abgelaufen',
};

const inviteStatusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  activated: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<'cases' | 'invitations'>('cases');

  // Cases state
  const [cases, setCases] = useState<Case[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [search, setSearch] = useState('');

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invFilterClass, setInvFilterClass] = useState('');
  const [invFilterStatus, setInvFilterStatus] = useState('');
  const [invSearch, setInvSearch] = useState('');

  // Create invitation state
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    child_last_name: '', child_first_name: '', class_ref: '', expires_hours: 168
  });
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterClass) params.class_ref = filterClass;
      if (search) params.search = search;
      const res = await casesApi.list(params);
      setCases(res.data.cases || []);
      setStatusCounts(res.data.statusCounts || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterClass, search]);

  const loadInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 200 };
      if (invFilterStatus) params.status = invFilterStatus;
      if (invFilterClass) params.class_ref = invFilterClass;
      const res = await invitationsApi.list(params);
      setInvitations(res.data.invitations);
    } catch (err) {
      console.error(err);
    } finally {
      setInvitationsLoading(false);
    }
  }, [invFilterStatus, invFilterClass]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (activeTab === 'invitations') {
      loadInvitations();
    }
  }, [activeTab, loadInvitations]);

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/school/login');
  }

  async function createInvitation() {
    setInviteLoading(true);
    try {
      const res = await invitationsApi.create(inviteForm as Record<string, unknown>);
      setInviteResult(res.data.invitation);
      loadInvitations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRevokeInvitation(id: number) {
    if (!confirm('Einladung wirklich widerrufen?')) return;
    try {
      await invitationsApi.revoke(id);
      loadInvitations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Widerrufen');
    }
  }

  // Filter invitations by search term (client-side)
  const filteredInvitations = invitations.filter((inv) => {
    if (!invSearch) return true;
    const term = invSearch.toLowerCase();
    return (
      (inv.child_last_name || '').toLowerCase().includes(term) ||
      (inv.child_first_name || '').toLowerCase().includes(term) ||
      (inv.class_ref || '').toLowerCase().includes(term)
    );
  });

  // Compute invitation stats
  const invStats = {
    total: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    activated: invitations.filter(i => i.status === 'activated').length,
    completed: invitations.filter(i => i.status === 'completed').length,
    expired: invitations.filter(i => i.status === 'expired').length,
  };

  // Get unique classes from invitations
  const uniqueClasses = [...new Set(invitations.map(i => i.class_ref).filter(Boolean))].sort();

  const statusCards = [
    { key: 'submitted', label: 'Eingereicht', count: statusCounts.submitted || 0, color: 'border-blue-200 bg-blue-50', textColor: 'text-blue-700', dot: 'bg-blue-500' },
    { key: 'returned', label: 'Zurückgegeben', count: statusCounts.returned || 0, color: 'border-red-200 bg-red-50', textColor: 'text-red-700', dot: 'bg-red-500' },
    { key: 'draft', label: 'In Bearbeitung', count: statusCounts.draft || 0, color: 'border-yellow-200 bg-yellow-50', textColor: 'text-yellow-700', dot: 'bg-yellow-500' },
    { key: 'approved', label: 'Genehmigt', count: statusCounts.approved || 0, color: 'border-green-200 bg-green-50', textColor: 'text-green-700', dot: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900">EBS Schulportal</span>
            </div>

            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/school/admin')}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-700">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="btn-secondary text-sm px-3 py-1.5">
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statusCards.map((card) => (
            <button
              key={card.key}
              onClick={() => { setActiveTab('cases'); setFilterStatus(filterStatus === card.key ? '' : card.key); }}
              className={`card transition-all text-left ${filterStatus === card.key && activeTab === 'cases' ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color} border`}>
                  <span className={`w-3 h-3 rounded-full ${card.dot}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${card.textColor}`}>{card.count}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'cases'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Einschulungsblätter
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'invitations'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Einladungen
            <span className="ml-1.5 bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {invStats.total}
            </span>
          </button>
        </div>

        {/* ====== CASES TAB ====== */}
        {activeTab === 'cases' && (
          <>
            {/* Actions bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    className="input pl-9 w-full"
                    placeholder="Name suchen..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  className="input text-sm py-2"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Alle Status</option>
                  <option value="draft">In Bearbeitung</option>
                  <option value="submitted">Eingereicht</option>
                  <option value="returned">Zurückgegeben</option>
                  <option value="approved">Genehmigt</option>
                  <option value="archived">Archiviert</option>
                </select>

                <input
                  type="text"
                  className="input text-sm py-2 w-28"
                  placeholder="Klasse..."
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                />
              </div>

              <button
                onClick={() => { setShowCreateInvite(true); setInviteResult(null); }}
                className="btn-primary text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Einladung erstellen
              </button>
            </div>

            {/* Cases table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">
                  Einschulungsblätter
                  <span className="ml-2 text-sm font-normal text-gray-400">{cases.length} Einträge</span>
                </h2>
              </div>

              {loading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Laden...</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Keine Einträge gefunden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Klasse</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Erziehungsberechtigt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Kontakt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Aktualisiert</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cases.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 text-sm">
                              {c.last_name}, {c.first_name}
                            </div>
                            {c.birth_date && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(c.birth_date).toLocaleDateString('de-DE')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className="text-sm text-gray-600">{c.class_ref || '—'}</span>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <span className="text-sm text-gray-600">{c.guardian_name || '—'}</span>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <div className="text-xs text-gray-500">{c.phone || '—'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className="text-xs text-gray-400">
                              {new Date(c.updated_at).toLocaleDateString('de-DE')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => navigate(`/school/cases/${c.id}`)}
                              className="text-primary-600 hover:text-primary-800 text-sm font-medium transition-colors"
                            >
                              Öffnen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ====== INVITATIONS TAB ====== */}
        {activeTab === 'invitations' && (
          <>
            {/* Invitation stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-lg border border-yellow-200 px-4 py-3">
                <div className="text-xl font-bold text-yellow-700">{invStats.pending}</div>
                <div className="text-xs text-gray-500">Ausstehend</div>
              </div>
              <div className="bg-white rounded-lg border border-blue-200 px-4 py-3">
                <div className="text-xl font-bold text-blue-700">{invStats.activated}</div>
                <div className="text-xs text-gray-500">Aktiviert</div>
              </div>
              <div className="bg-white rounded-lg border border-green-200 px-4 py-3">
                <div className="text-xl font-bold text-green-700">{invStats.completed}</div>
                <div className="text-xs text-gray-500">Abgeschlossen</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <div className="text-xl font-bold text-gray-500">{invStats.expired}</div>
                <div className="text-xs text-gray-500">Abgelaufen</div>
              </div>
            </div>

            {/* Filters + actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    className="input pl-9 w-full"
                    placeholder="Kind suchen..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  className="input text-sm py-2"
                  value={invFilterStatus}
                  onChange={(e) => setInvFilterStatus(e.target.value)}
                >
                  <option value="">Alle Status</option>
                  <option value="pending">Ausstehend</option>
                  <option value="activated">Aktiviert</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="expired">Abgelaufen</option>
                </select>

                <select
                  className="input text-sm py-2"
                  value={invFilterClass}
                  onChange={(e) => setInvFilterClass(e.target.value)}
                >
                  <option value="">Alle Klassen</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => { setShowCreateInvite(true); setInviteResult(null); }}
                className="btn-primary text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Einladung erstellen
              </button>
            </div>

            {/* Invitations table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">
                  Versendete Einladungen
                  <span className="ml-2 text-sm font-normal text-gray-400">{filteredInvitations.length} Einträge</span>
                </h2>
              </div>

              {invitationsLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Laden...</p>
                </div>
              ) : filteredInvitations.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Keine Einladungen gefunden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kind</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Klasse</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Einladungsstatus</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Formularstatus</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Erstellt von</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Gültig bis</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredInvitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 text-sm">
                              {inv.child_last_name || inv.child_first_name
                                ? `${inv.child_last_name || ''}${inv.child_last_name && inv.child_first_name ? ', ' : ''}${inv.child_first_name || ''}`
                                : <span className="text-gray-400 italic">Kein Name</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-600">{inv.class_ref || '—'}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded font-medium tracking-wider">{inv.code}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${inviteStatusColor[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                              {inviteStatusLabel[inv.status] || inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            {inv.case_status ? (
                              <StatusBadge status={inv.case_status} />
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <span className="text-xs text-gray-500">{inv.created_by_name || '—'}</span>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className={`text-xs ${new Date(inv.expires_at) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                              {new Date(inv.expires_at).toLocaleDateString('de-DE', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {inv.case_id && (
                                <button
                                  onClick={() => navigate(`/school/cases/${inv.case_id}`)}
                                  className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                                >
                                  Fall öffnen
                                </button>
                              )}
                              {(inv.status === 'pending' || inv.status === 'activated') && (
                                <button
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                                >
                                  Widerrufen
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Create Invitation Modal */}
      {showCreateInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Neue Einladung erstellen</h2>
              <button
                onClick={() => { setShowCreateInvite(false); setInviteResult(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!inviteResult ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="label">Nachname</label>
                      <input
                        type="text"
                        className="input"
                        value={inviteForm.child_last_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, child_last_name: e.target.value })}
                        placeholder="Muster"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Vorname</label>
                      <input
                        type="text"
                        className="input"
                        value={inviteForm.child_first_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, child_first_name: e.target.value })}
                        placeholder="Max"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">Klasse</label>
                    <input
                      type="text"
                      className="input"
                      value={inviteForm.class_ref}
                      onChange={(e) => setInviteForm({ ...inviteForm, class_ref: e.target.value })}
                      placeholder="z.B. 1a"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Gültig für</label>
                    <select
                      className="input"
                      value={inviteForm.expires_hours}
                      onChange={(e) => setInviteForm({ ...inviteForm, expires_hours: Number(e.target.value) })}
                    >
                      <option value={24}>24 Stunden</option>
                      <option value={72}>3 Tage</option>
                      <option value={168}>7 Tage (Standard)</option>
                      <option value={336}>14 Tage</option>
                      <option value={720}>30 Tage</option>
                    </select>
                  </div>
                  <button
                    onClick={createInvitation}
                    disabled={inviteLoading}
                    className="btn-primary w-full"
                  >
                    {inviteLoading ? 'Erstellen...' : 'Einladung erstellen'}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-700 font-semibold text-sm mb-1">Einladung erstellt!</p>
                    <p className="text-green-600 text-xs">Senden Sie folgende Informationen an die Eltern:</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktivierungslink</label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteResult.activationUrl}
                          className="input text-xs flex-1 bg-gray-50"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(inviteResult.activationUrl)}
                          className="btn-secondary text-xs px-3"
                        >
                          Kopieren
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zugangscode</label>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-3xl font-mono font-bold tracking-widest text-primary-700 bg-primary-50 px-4 py-2 rounded-lg">
                          {inviteResult.code}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(inviteResult.code)}
                          className="btn-secondary text-xs px-3"
                        >
                          Kopieren
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowCreateInvite(false); setInviteResult(null); loadCases(); loadInvitations(); }}
                    className="btn-primary w-full"
                  >
                    Schließen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
