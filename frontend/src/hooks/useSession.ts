import { useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';
import {
  getSessions,
  getSession,
  getSessionStatus,
} from '../services/sessions';

const POLL_INTERVAL = 15000; // 15 seconds

export function useSessionList() {
  const { sessions, setSessions } = useSessionStore();

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      // silent fail
    }
  }, [setSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, refresh: fetchSessions };
}

export function useActiveSession(sessionId: string | null) {
  const { activeSession, setActiveSession } = useSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getSession(sessionId);
      setActiveSession(data);
    } catch {
      // silent fail
    }
  }, [sessionId, setActiveSession]);

  const pollStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { status } = await getSessionStatus(sessionId);
      if (activeSession && status !== activeSession.status) {
        fetchSession();
      }
    } catch {
      // silent fail
    }
  }, [sessionId, activeSession, fetchSession]);

  useEffect(() => {
    fetchSession();
    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSession, pollStatus]);

  return { session: activeSession, refresh: fetchSession };
}
