import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Return type for the useUnpacking hook.
 * Includes `isRegenerating` to indicate background polling after feedback submission.
 */
interface UseUnpackingReturn {
  isLoading: boolean;
  isMutating: boolean;
  /** True while polling for updated unpacking after feedback submission. */
  isRegenerating: boolean;
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UnpackingState | null>(null);

  /** Ref to track active polling interval so it can be cleaned up on unmount. */
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingAttemptsRef = useRef(0);

  const refresh = useCallback(async () => {
    setError(null);
    const response = await getUnpacking(sessionId);
    setState(normalizeUnpackingResponse(response));
  }, [sessionId]);

  /** Stop any active regeneration polling. */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingAttemptsRef.current = 0;
  }, []);

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

  /** Clean up polling on unmount. */
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

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

  /**
   * Submit feedback and begin background polling for regenerated unpacking.
   * The polling runs asynchronously — the promise resolves as soon as the
   * API call succeeds, so the caller can close modals / show toasts immediately.
   */
  const sendFeedback = useCallback(
    async (payload: SubmitFeedbackRequest) => {
      setIsMutating(true);
      setError(null);

      // Capture the current updatedAt before submitting feedback
      const previousUpdatedAt = state && !state.locked
        ? (state as UnpackingReadyState).unpacking?.updatedAt
        : undefined;

      try {
        await submitFeedback(sessionId, payload);
      } catch (err: any) {
        const message = err?.response?.data?.message;
        setError(Array.isArray(message) ? message[0] : message || 'Could not submit feedback.');
        setIsMutating(false);
        throw err;
      }

      setIsMutating(false);
      setIsRegenerating(true);

      // Stop any existing polling before starting a new one
      stopPolling();
      pollingAttemptsRef.current = 0;

      const MAX_ATTEMPTS = 10;
      const POLL_INTERVAL_MS = 3000;

      pollingRef.current = setInterval(async () => {
        pollingAttemptsRef.current += 1;

        try {
          const response = await getUnpacking(sessionId);
          const normalized = normalizeUnpackingResponse(response);

          if (!normalized.locked) {
            const newUpdatedAt = (normalized as UnpackingReadyState).unpacking?.updatedAt;
            if (newUpdatedAt && newUpdatedAt !== previousUpdatedAt) {
              // New data arrived — update state and stop polling
              setState(normalized);
              setIsRegenerating(false);
              stopPolling();
              return;
            }
          }
        } catch {
          // Ignore poll errors — we'll retry on the next interval
        }

        if (pollingAttemptsRef.current >= MAX_ATTEMPTS) {
          // Timeout — stop gracefully
          setIsRegenerating(false);
          stopPolling();
        }
      }, POLL_INTERVAL_MS);
    },
    [sessionId, state, stopPolling],
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
    isRegenerating,
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
