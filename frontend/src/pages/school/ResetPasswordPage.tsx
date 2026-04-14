import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Two modes: request reset (no token) or set new password (with token)
  if (token) {
    return <SetNewPassword token={token} />;
  }
  return <RequestReset />;
}

function RequestReset() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/request-reset', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Geben Sie Ihre E-Mail-Adresse ein
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 text-sm">
                  Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.
                  Bitte prüfen Sie Ihr Postfach.
                </p>
              </div>
              <Link to="/school/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Zurück zum Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="label">E-Mail</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
              </button>

              <div className="text-center">
                <Link to="/school/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Zurück zum Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SetNewPassword({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Neues Passwort setzen</h1>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 text-sm">
                  Ihr Passwort wurde erfolgreich zurückgesetzt.
                </p>
              </div>
              <Link to="/school/login" className="btn-primary inline-block">
                Zum Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="label">Neues Passwort</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label">Passwort bestätigen</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
              </button>

              <div className="text-center">
                <Link to="/school/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Zurück zum Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
