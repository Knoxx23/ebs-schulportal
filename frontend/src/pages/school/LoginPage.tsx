import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/school/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // If user is logged in, show loading while redirect happens
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Weiterleitung...</p>
        </div>
      </div>
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email.trim().toLowerCase(), password);
      setUser(res.data.user);
      navigate('/school/dashboard');
    } catch (err: any) {
      if (err.response?.status === 423) {
        setError(err.response.data.error || 'Konto gesperrt. Bitte warten Sie 15 Minuten.');
      } else if (err.response?.status === 429) {
        setError('Zu viele Anfragen. Bitte warten Sie.');
      } else {
        setError(err.response?.data?.error || 'Ungültige E-Mail oder Passwort');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">EBS Schulportal</h1>
          <p className="text-white/60 text-sm mt-1">Einschulungsblatt Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">Anmelden</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="form-group">
              <label className="label" htmlFor="email">E-Mail-Adresse</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@schule.de"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="password">Passwort</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full py-2.5 font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Anmelden...
                </span>
              ) : 'Anmelden'}
            </button>

            <div className="text-center mt-3">
              <Link
                to="/school/reset-password"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Passwort vergessen?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          EBS v1.0 · Nur für Schulpersonal
        </p>
      </div>
    </div>
  );
}
