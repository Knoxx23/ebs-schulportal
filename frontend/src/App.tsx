import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { authApi } from './api/client';
import CookieBanner from './components/CookieBanner';
import Footer from './components/Footer';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/school/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/school/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/school/DashboardPage'));
const CaseDetailPage = lazy(() => import('./pages/school/CaseDetailPage'));
const AdminPage = lazy(() => import('./pages/school/AdminPage'));
const ActivationPage = lazy(() => import('./pages/parent/ActivationPage'));
const ParentFormPage = lazy(() => import('./pages/parent/ParentFormPage'));
const StatusPage = lazy(() => import('./pages/parent/StatusPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ImprintPage = lazy(() => import('./pages/ImprintPage'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Laden...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/school/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/school/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/school/dashboard" replace />;
  }
  return <>{children}</>;
}

/** Bootstrap: validate session against server on app load */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If there's a user in localStorage, validate with the server
    if (user) {
      authApi.me()
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          // Session expired or invalid — clear local state
          logout();
        })
        .finally(() => setReady(true));
    } else {
      // No cached user — try to see if there's an active server session
      authApi.me()
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          // Not authenticated — that's fine
        })
        .finally(() => setReady(true));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return <LoadingFallback />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/school/login" replace />} />

            {/* Convenience redirect: /login -> /school/login */}
            <Route path="/login" element={<Navigate to="/school/login" replace />} />

            {/* School staff routes */}
            <Route path="/school/login" element={<LoginPage />} />
            <Route path="/school/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/school/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/school/cases/:id"
              element={
                <ProtectedRoute>
                  <CaseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/school/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* Parent routes */}
            <Route path="/activate" element={<ActivationPage />} />
            <Route path="/form" element={<ParentFormPage />} />
            <Route path="/status" element={<StatusPage />} />

            {/* Legal pages */}
            <Route path="/datenschutz" element={<PrivacyPage />} />
            <Route path="/impressum" element={<ImprintPage />} />

            {/* 404 fallback */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                    <p className="text-gray-500 mb-4">Seite nicht gefunden</p>
                    <a href="/" className="btn-primary btn text-sm">Zur Startseite</a>
                  </div>
                </div>
              }
            />
          </Routes>
          <Footer />
          <CookieBanner />
        </Suspense>
      </AuthBootstrap>
    </BrowserRouter>
  );
}
