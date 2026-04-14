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
  // Step 1 - Personal
  last_name?: string;
  first_name?: string;
  birth_date?: string;
  birth_place?: string;
  birth_country?: string;
  gender?: string;
  nationality?: string;
  immigration_year?: string;
  confession?: string;
  mother_tongue?: string;
  aussiedler?: string;
  // Step 2 - Family & Contact
  guardian_name?: string;
  guardian_street?: string;
  guardian_zip?: string;
  guardian_city?: string;
  phone?: string;
  email?: string;
  emergency_phone?: string;
  guardian_1_last_name?: string;
  guardian_1_first_name?: string;
  guardian_1_birth_country?: string;
  guardian_2_last_name?: string;
  guardian_2_first_name?: string;
  guardian_2_birth_country?: string;
  // Step 3 - School history
  kindergarten?: string;
  enrollment_year?: string;
  enrollment_date?: string;
  last_school_type?: string;
  last_school_name?: string;
  graduation_expected?: string;
  graduation_class?: string;
  // Step 4 - Future
  future_path?: string;
  future_school?: string;
  future_notes?: string;
  future_company_name?: string;
  future_company_phone?: string;
  future_company_address?: string;
  future_job_title?: string;
  future_duration_from?: string;
  future_duration_to?: string;
  future_school_address?: string;
  future_school_class?: string;
  future_berufsfeld?: string;
  future_measure_name?: string;
  future_measure_org?: string;
  future_measure_from?: string;
  future_measure_to?: string;
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
