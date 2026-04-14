import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'teacher' | 'secretary' | 'principal' | 'admin';
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'ebs-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Parent form state (not persisted in localStorage - session-based)
export interface CaseData {
  id?: number;
  status?: string;
  last_name?: string;
  first_name?: string;
  birth_date?: string;
  birth_place?: string;
  gender?: string;
  nationality?: string;
  guardian_name?: string;
  guardian_street?: string;
  guardian_zip?: string;
  guardian_city?: string;
  phone?: string;
  email?: string;
  kindergarten?: string;
  enrollment_year?: string;
  enrollment_date?: string;
  future_path?: string;
  future_school?: string;
  future_notes?: string;
  language?: string;
  updated_at?: string;
  submitted_at?: string;
  return_note?: string;
}

interface ParentState {
  caseData: CaseData | null;
  currentStep: number;
  language: 'de' | 'en' | 'tr' | 'ar' | 'ua' | 'ru' | 'pl';
  isAuthenticated: boolean;
  setCaseData: (data: CaseData | null) => void;
  updateCaseData: (data: Partial<CaseData>) => void;
  setCurrentStep: (step: number) => void;
  setLanguage: (lang: 'de' | 'en' | 'tr' | 'ar' | 'ua' | 'ru' | 'pl') => void;
  setIsAuthenticated: (val: boolean) => void;
  reset: () => void;
}

export const useParentStore = create<ParentState>((set) => ({
  caseData: null,
  currentStep: 1,
  language: 'de',
  isAuthenticated: false,
  setCaseData: (data) => set({ caseData: data }),
  updateCaseData: (data) => set((state) => ({
    caseData: state.caseData ? { ...state.caseData, ...data } : data,
  })),
  setCurrentStep: (step) => set({ currentStep: step }),
  setLanguage: (lang) => set({ language: lang }),
  setIsAuthenticated: (val) => set({ isAuthenticated: val }),
  reset: () => set({ caseData: null, currentStep: 1, isAuthenticated: false }),
}));
