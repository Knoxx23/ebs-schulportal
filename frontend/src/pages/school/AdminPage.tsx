import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: number;
  created_at: string;
  last_login: string;
  failed_attempts: number;
  locked_until: string;
}

interface AuditEntry {
  id: number;
  event_type: string;
  actor_type: string;
  actor_id: string;
  staff_name: string;
  case_id: number;
  details: any;
  ip_address: string;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  principal: 'Schulleitung',
  secretary: 'Sekretariat',
  teacher: 'Lehrer/in',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newUser, setNewUser] = useState({
    email: '', password: '', name: '', role: 'teacher'
  });

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else loadAudit();
  }, [activeTab]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminApi.listUsers();
      setUsers(res.data.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLog({ limit: 100 });
      setAuditEntries(res.data.entries);
    } catch {
      setError('Fehler beim Laden des Protokolls');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await adminApi.createUser(newUser as Record<string, unknown>);
      setSuccess('Benutzer erstellt');
      setShowCreateUser(false);
      setNewUser({ email: '', password: '', name: '', role: 'teacher' });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    }
  }

  async function handleToggleActive(u: User) {
    try {
      await adminApi.updateUser(u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler');
    }
  }

  async function handleUpdateRole(u: User, role: string) {
    try {
      await adminApi.updateUser(u.id, { role });
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler');
    }
  }

  async function handleUnlock(u: User) {
    try {
      await adminApi.updateUser(u.id, {});
      loadUsers();
      setSuccess('Konto entsperrt');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/school/dashboard')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </button>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-gray-900">Administration</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600 ml-4">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
          {(['users', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'users' ? 'Benutzer' : 'Protokoll'}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {activeTab === 'users' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-900">
                Schulpersonal
                <span className="ml-2 text-sm font-normal text-gray-400">{users.length} Benutzer</span>
              </h2>
              <button
                onClick={() => setShowCreateUser(true)}
                className="btn-primary text-sm"
              >
                + Benutzer erstellen
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">E-Mail</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolle</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Letzte Anmeldung</th>
                      <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-primary-700">{u.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                              {u.id === user?.id && <span className="text-xs text-primary-600 font-medium">Ich</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3">
                          {editingUser?.id === u.id ? (
                            <select
                              className="input text-sm py-1 px-2"
                              value={editingUser?.role || u.role}
                              onChange={(e) => setEditingUser({ ...u, role: e.target.value })}
                              onBlur={() => handleUpdateRole(editingUser!, editingUser!.role)}
                            >
                              <option value="teacher">Lehrer/in</option>
                              <option value="secretary">Sekretariat</option>
                              <option value="principal">Schulleitung</option>
                              <option value="admin">Administrator</option>
                            </select>
                          ) : (
                            <span
                              className="text-sm text-gray-700 cursor-pointer hover:text-primary-600"
                              onClick={() => setEditingUser(u)}
                            >
                              {roleLabels[u.role] || u.role}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                              {u.is_active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                            {u.locked_until && new Date(u.locked_until) > new Date() && (
                              <span className="text-xs text-red-600 font-medium">Gesperrt</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-xs text-gray-400 hidden md:table-cell">
                          {u.last_login ? new Date(u.last_login).toLocaleDateString('de-DE') : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {u.locked_until && new Date(u.locked_until) > new Date() && (
                              <button onClick={() => handleUnlock(u)} className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                                Entsperren
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleToggleActive(u)}
                                className={`text-xs font-medium ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                              >
                                {u.is_active ? 'Deaktivieren' : 'Aktivieren'}
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
        )}

        {/* Audit tab */}
        {activeTab === 'audit' && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-6">
              Systemprotokoll
              <span className="ml-2 text-sm font-normal text-gray-400">{auditEntries.length} Einträge</span>
            </h2>

            {loading ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ereignis</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Akteur</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fall</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">IP-Adresse</th>
                      <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Zeitpunkt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {auditEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-800 text-xs">
                          {formatEventType(entry.event_type)}
                        </td>
                        <td className="py-2.5 text-gray-600 text-xs">
                          {entry.staff_name || entry.actor_type}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs hidden md:table-cell">
                          {entry.case_id ? `#${entry.case_id}` : '—'}
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs hidden lg:table-cell font-mono">
                          {entry.ip_address || '—'}
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {new Date(entry.created_at).toLocaleString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Neuen Benutzer erstellen</h2>
              <button onClick={() => setShowCreateUser(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="form-group">
                <label className="label">Name *</label>
                <input type="text" className="input" required value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Vorname Nachname" />
              </div>
              <div className="form-group">
                <label className="label">E-Mail *</label>
                <input type="email" className="input" required value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="name@schule.de" />
              </div>
              <div className="form-group">
                <label className="label">Passwort * (mind. 8 Zeichen)</label>
                <input type="password" className="input" required minLength={8} value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="label">Rolle *</label>
                <select className="input" value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="teacher">Lehrer/in</option>
                  <option value="secretary">Sekretariat</option>
                  <option value="principal">Schulleitung</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary flex-1">Abbrechen</button>
                <button type="submit" className="btn-primary flex-1">Erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    invitation_activated: 'Einladung aktiviert',
    invitation_created: 'Einladung erstellt',
    invitation_revoked: 'Einladung widerrufen',
    case_submitted: 'Formular eingereicht',
    case_updated_by_staff: 'Von Personal bearbeitet',
    case_approved: 'Genehmigt',
    case_returned: 'Zurückgegeben',
    document_downloaded: 'Dokument heruntergeladen',
    login_success: 'Anmeldung',
    login_failed: 'Anmeldefehler',
    logout: 'Abmeldung',
    activation_failed: 'Aktivierung fehlgeschlagen',
    user_created: 'Benutzer erstellt',
    user_updated: 'Benutzer aktualisiert',
    reminder_sent: 'Erinnerung gesendet',
  };
  return labels[type] || type.replace(/_/g, ' ');
}
