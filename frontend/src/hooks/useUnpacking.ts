import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getUnpacking,
  setUnpackingChoice,
  submitFeedback,
  unlockUnpacking,
} from '../services/unpacking';
import type { SubmitFeedbackRequest, Unpacking } from '../types/session';

interface UnpackingLockedState {
  locked: true;
  lockType?: 'waiting_for_partner' | 'both_waiting';
  message: string;
  canUnlock?: boolean;
  autoUnlockAt?: string;
}

interface UnpackingReadyState {
  locked: false;
  unpacking: Unpacking;
  autoUnlocked?: boolean;
  message?: string;
}

type UnpackingState = UnpackingLockedState | UnpackingReadyState;

interface UseUnpackingReturn {
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  state: UnpackingState | null;
  unpacking: Unpacking | null;
  refresh: () => Promise<void>;
  chooseWait: () => Promise<void>;
  chooseView: () => Promise<void>;
  unlockNow: () => Promise<void>;
  sendFeedback: (payload: SubmitFeedbackRequest) => Promise<void>;
}

function normalizeUnpackingResponse(payload: unknown): UnpackingState {
  const parsed = payload as Partial<UnpackingState>;

  if (parsed.locked === true) {
    return {
      locked: true,
      lockType: parsed.lockType,
      message: parsed.message || 'Waiting for your partner.',
      canUnlock: parsed.canUnlock,
      autoUnlockAt: parsed.autoUnlockAt,
    };
  }

  return {
    locked: false,
    unpacking: (parsed as UnpackingReadyState).unpacking,
    autoUnlocked: (parsed as UnpackingReadyState).autoUnlocked,
    message: parsed.message,
  };
}

export function useUnpacking(sessionId: string): UseUnpackingReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UnpackingState | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const response = await getUnpacking(sessionId);
    setState(normalizeUnpackingResponse(response));
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await getUnpacking(sessionId);
        if (!mounted) {
          return;
        }
        setState(normalizeUnpackingResponse(response));
      } catch (err: any) {
        if (!mounted) {
          return;
        }
        const message = err?.response?.data?.message;
        setError(Array.isArray(message) ? message[0] : message || 'Could not load unpacking.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const chooseWait = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      await setUnpackingChoice(sessionId, 'wait');
      await refresh();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || 'Could not save your choice.');
    } finally {
      setIsMutating(false);
    }
  }, [refresh, sessionId]);

  const chooseView = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      await setUnpackingChoice(sessionId, 'view');
      await refresh();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || 'Could not save your choice.');
    } finally {
      setIsMutating(false);
    }
  }, [refresh, sessionId]);

  const unlockNow = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      await unlockUnpacking(sessionId);
      await refresh();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || 'Could not unlock unpacking.');
    } finally {
      setIsMutating(false);
    }
  }, [refresh, sessionId]);

  const sendFeedback = useCallback(
    async (payload: SubmitFeedbackRequest) => {
      setIsMutating(true);
      setError(null);
      try {
        await submitFeedback(sessionId, payload);
        await refresh();
      } catch (err: any) {
        const message = err?.response?.data?.message;
        setError(Array.isArray(message) ? message[0] : message || 'Could not submit feedback.');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [refresh, sessionId],
  );

  const unpacking = useMemo(() => {
    if (!state || state.locked) {
      return null;
    }
    return state.unpacking;
  }, [state]);

  return {
    isLoading,
    isMutating,
    error,
    state,
    unpacking,
    refresh,
    chooseWait,
    chooseView,
    unlockNow,
    sendFeedback,
  };
}
