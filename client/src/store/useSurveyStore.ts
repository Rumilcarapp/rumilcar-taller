import { create } from 'zustand';

export type SurveyQuestionType =
  | 'RATING_STARS'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TEXT'
  | 'BOOLEAN';

export interface SurveyQuestion {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  type: SurveyQuestionType;
  options: string[];
  isRequired: boolean;
  isActive: boolean;
  category: string;
}

export interface PendingSurveyData {
  shouldShow: boolean;
  requestId?: string;
  reason?: string;
  requestedBy?: string;
  questions: SurveyQuestion[];
  workshop?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
}

interface SurveyState {
  pendingSurvey: PendingSurveyData | null;
  loading: boolean;
  submitting: boolean;
  isDismissed: boolean;
  isSubmitted: boolean;

  fetchPendingSurvey: () => Promise<void>;
  submitSurvey: (
    answers: Record<string, any>,
    rating?: number,
    userPhone?: string,
    userName?: string
  ) => Promise<boolean>;
  dismissSurvey: () => Promise<void>;
  resetSurveyState: () => void;
}

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
};

const getAuthToken = () => {
  return localStorage.getItem('rumilcar_token') || '';
};

export const useSurveyStore = create<SurveyState>((set, get) => ({
  pendingSurvey: null,
  loading: false,
  submitting: false,
  isDismissed: false,
  isSubmitted: false,

  fetchPendingSurvey: async () => {
    // Si ya lo descartó en esta sesión local o ya lo envió, omitir
    if (get().isDismissed || get().isSubmitted) return;

    const token = getAuthToken();
    if (!token) return;

    // Verificar si el usuario lo pospuso en las últimas 12 horas en este navegador
    const snoozeUntil = localStorage.getItem('rumilcar_survey_snooze');
    if (snoozeUntil && Date.now() < Number(snoozeUntil)) {
      return;
    }

    try {
      set({ loading: true });
      const res = await fetch(`${getApiUrl()}/surveys/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        set({ loading: false });
        return;
      }

      const data: PendingSurveyData = await res.json();
      if (data.shouldShow && data.questions && data.questions.length > 0) {
        set({ pendingSurvey: data, loading: false });
      } else {
        set({ pendingSurvey: null, loading: false });
      }
    } catch (err) {
      console.error('Error verificando encuestas pendientes:', err);
      set({ loading: false });
    }
  },

  submitSurvey: async (answers, rating, userPhone, userName) => {
    const { pendingSurvey } = get();
    const token = getAuthToken();
    if (!token) return false;

    try {
      set({ submitting: true });
      const res = await fetch(`${getApiUrl()}/surveys/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: pendingSurvey?.requestId,
          answers,
          rating,
          userPhone,
          userName,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al enviar respuestas');
      }

      // Marcar como enviado permanentemente
      localStorage.setItem('rumilcar_survey_completed', 'true');
      localStorage.removeItem('rumilcar_survey_snooze');
      set({ isSubmitted: true, pendingSurvey: null, submitting: false });
      return true;
    } catch (err) {
      console.error('Error enviando respuestas:', err);
      set({ submitting: false });
      return false;
    }
  },

  dismissSurvey: async () => {
    const { pendingSurvey } = get();
    const token = getAuthToken();

    // Posponer por 12 horas para no ser invasivo
    const twelveHours = 12 * 60 * 60 * 1000;
    localStorage.setItem('rumilcar_survey_snooze', String(Date.now() + twelveHours));

    set({ isDismissed: true, pendingSurvey: null });

    if (token && pendingSurvey?.requestId) {
      try {
        await fetch(`${getApiUrl()}/surveys/dismiss`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestId: pendingSurvey.requestId }),
        });
      } catch (err) {
        // Silencioso
      }
    }
  },

  resetSurveyState: () => {
    set({
      pendingSurvey: null,
      loading: false,
      submitting: false,
      isDismissed: false,
      isSubmitted: false,
    });
  },
}));
