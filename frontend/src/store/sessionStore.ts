import { create } from 'zustand';
import type { Session, Interview } from '../types/session';

interface SessionState {
  sessions: Session[];
  activeSession: Session | null;
  currentInterview: Interview | null;

  setSessions: (sessions: Session[]) => void;
  setActiveSession: (session: Session | null) => void;
  setCurrentInterview: (interview: Interview | null) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSession: null,
  currentInterview: null,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (activeSession) => set({ activeSession }),
  setCurrentInterview: (currentInterview) => set({ currentInterview }),
  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
      activeSession:
        state.activeSession?.id === id
          ? { ...state.activeSession, ...updates }
          : state.activeSession,
    })),
  reset: () => set({ sessions: [], activeSession: null, currentInterview: null }),
}));
