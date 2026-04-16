import axios from 'axios';

// Get CSRF token from cookie
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ensure CSRF cookie is set before any state-changing request
let csrfInitialized = false;
let csrfInitPromise: Promise<void> | null = null;

async function ensureCsrfToken(): Promise<void> {
  if (csrfInitialized && getCsrfToken()) return;
  if (csrfInitPromise) return csrfInitPromise;

  csrfInitPromise = apiClient
    .get('/health')
    .then(() => {
      csrfInitialized = true;
    })
    .catch(() => {
      // Even on error, the cookie may have been set
      csrfInitialized = true;
    })
    .finally(() => {
      csrfInitPromise = null;
    });

  return csrfInitPromise;
}

// Initialize CSRF token on page load
ensureCsrfToken();

// Add CSRF token to all state-changing requests
apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Ensure we have a CSRF token before sending
    if (!getCsrfToken()) {
      await ensureCsrfToken();
    }
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Handle 401 responses - redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If CSRF token error, retry once after fetching new token
    if (error.response?.status === 403 && error.response?.data?.error === 'Invalid CSRF token' && !error.config._csrfRetry) {
      csrfInitialized = false;
      await ensureCsrfToken();
      error.config._csrfRetry = true;
      error.config.headers['X-CSRF-Token'] = getCsrfToken();
      return apiClient.request(error.config);
    }

    if (error.response?.status === 401) {
      // Only redirect if we're on a protected school page
      const path = window.location.pathname;
      if (path.startsWith('/school/') && path !== '/school/login') {
        window.location.href = '/school/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};

// Parent API
export const parentApi = {
  activate: (token: string, code: string) =>
    apiClient.post('/parent/activate', { token, code }),
  getCase: () => apiClient.get('/parent/case'),
  updateCase: (data: Record<string, unknown>) =>
    apiClient.put('/parent/case', data),
  submitCase: () => apiClient.post('/parent/case/submit'),
  getStatus: () => apiClient.get('/parent/case/status'),
};

// Cases API (school staff)
export const casesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/cases', { params }),
  get: (id: number | string) =>
    apiClient.get(`/cases/${id}`),
  update: (id: number | string, data: Record<string, unknown>) =>
    apiClient.put(`/cases/${id}`, data),
  approve: (id: number | string) =>
    apiClient.post(`/cases/${id}/approve`),
  return: (id: number | string, note: string) =>
    apiClient.post(`/cases/${id}/return`, { note }),
};

// Invitations API
export const invitationsApi = {
  create: (data: Record<string, unknown>) =>
    apiClient.post('/invitations', data),
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/invitations', { params }),
  revoke: (id: number | string) =>
    apiClient.delete(`/invitations/${id}`),
};

// Admin API
export const adminApi = {
  listUsers: () => apiClient.get('/admin/users'),
  createUser: (data: Record<string, unknown>) =>
    apiClient.post('/admin/users', data),
  updateUser: (id: number | string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/users/${id}`, data),
  getAuditLog: (params?: Record<string, unknown>) =>
    apiClient.get('/admin/audit', { params }),
};

// Documents API
export const documentsApi = {
  download: (caseId: number | string) =>
    apiClient.get(`/documents/${caseId}`, { responseType: 'blob' }),
};

// Parent Letter API
export const parentLetterApi = {
  download: (invitationId: number | string) =>
    apiClient.get(`/parent-letter/${invitationId}`, { responseType: 'blob' }),
};

export default apiClient;
