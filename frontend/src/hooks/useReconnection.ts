/**
 * useReconnection — Real-time reconnection chat hook (Phase 4-5)
 *
 * Replaces the previous fake/hardcoded implementation with real API calls.
 * Handles: message fetching, sending with optimistic updates, polling for
 * partner messages, commitment generation/agreement, and session completion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getReconnection,
  sendReconnectionMessage,
  generateCommitment as generateCommitmentAPI,
  agreeToCommitment as agreeToCommitmentAPI,
  type ReconnectionMessageData,
  type CommitmentData,
} from '../services/reconnection';
import { updateSessionStatus } from '../services/sessions';

export type ReconnectionMessageRole = 'me' | 'partner' | 'ai';

export interface ReconnectionMessage {
  id: string;
  role: ReconnectionMessageRole;
  text: string;
  timestamp: string;
}

interface UseReconnectionReturn {
  isMyTurn: boolean;
  partnerName: string;
  loading: boolean;
  sending: boolean;
  messages: ReconnectionMessage[];
  commitment: CommitmentData | null;
  exchangeCount: number;
  sendMessage: (text: string) => Promise<void>;
  generateCommitment: () => Promise<void>;
  agreeToCommitment: () => Promise<void>;
  completeReconnection: () => Promise<void>;
}

const POLL_INTERVAL = 3000; // Poll for partner messages every 3s

export function useReconnection(
  sessionId: string,
  partnerName: string,
): UseReconnectionReturn {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [messages, setMessages] = useState<ReconnectionMessage[]>([]);
  const [commitment, setCommitment] = useState<CommitmentData | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getReconnection(sessionId);
      setMessages(data.messages);
      setIsMyTurn(data.isMyTurn);
      setCommitment(data.commitment);
      setExchangeCount(data.exchangeCount);
    } catch (err) {
      console.log('[Reconnection] Failed to fetch messages:', err);
    }
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getReconnection(sessionId);
        if (!mounted) return;
        setMessages(data.messages);
        setIsMyTurn(data.isMyTurn);
        setCommitment(data.commitment);
        setExchangeCount(data.exchangeCount);
      } catch (err) {
        if (!mounted) return;
        console.log('[Reconnection] Initial load failed:', err);
        // If endpoint doesn't exist yet, start with empty state and AI welcome
        setMessages([{
          id: 'ai-welcome',
          role: 'ai',
          text: 'Share one concrete moment and how it landed for you. Keep it short and kind.',
          timestamp: new Date().toISOString(),
        }]);
        setIsMyTurn(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  // Always poll for new messages (both partners can send at any time)
  useEffect(() => {
    if (!loading) {
      pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [loading, fetchMessages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);

    // Optimistic update — add user message immediately
    const optimisticMsg: ReconnectionMessage = {
      id: `opt-${Date.now()}`,
      role: 'me',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await sendReconnectionMessage(sessionId, text.trim());
      // Fetch updated messages (includes AI response)
      await fetchMessages();
    } catch (err) {
      console.log('[Reconnection] Failed to send message:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [sessionId, sending, fetchMessages]);

  const handleGenerateCommitment = useCallback(async () => {
    try {
      const result = await generateCommitmentAPI(sessionId);
      setCommitment(result);
    } catch (err) {
      console.log('[Reconnection] Failed to generate commitment:', err);
    }
  }, [sessionId]);

  const handleAgreeToCommitment = useCallback(async () => {
    try {
      const result = await agreeToCommitmentAPI(sessionId);
      setCommitment(result);
    } catch (err) {
      console.log('[Reconnection] Failed to agree:', err);
    }
  }, [sessionId]);

  const completeReconnection = useCallback(async () => {
    try {
      await updateSessionStatus(sessionId, 'resolved');
    } catch (err) {
      console.log('[Reconnection] Failed to complete:', err);
    }
  }, [sessionId]);

  return {
    isMyTurn,
    partnerName,
    loading,
    sending,
    messages,
    commitment,
    exchangeCount,
    sendMessage,
    generateCommitment: handleGenerateCommitment,
    agreeToCommitment: handleAgreeToCommitment,
    completeReconnection,
  };
}
