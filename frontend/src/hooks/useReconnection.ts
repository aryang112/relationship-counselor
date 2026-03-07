import { useCallback, useState } from 'react';
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
  messages: ReconnectionMessage[];
  sendMessage: (text: string) => Promise<void>;
  completeReconnection: () => Promise<void>;
}

const AI_PROMPTS = [
  'Pause for a breath. Reflect back what you heard before adding your point.',
  'Try naming one need instead of one complaint in your next message.',
  'Keep it specific: one moment, one feeling, one request.',
];

function buildId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useReconnection(
  sessionId: string,
  partnerName: string,
): UseReconnectionReturn {
  const [loading, setLoading] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [messages, setMessages] = useState<ReconnectionMessage[]>([
    {
      id: buildId(),
      role: 'ai',
      text: 'Share one concrete moment and how it landed for you. Keep it short and kind.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!isMyTurn || !text.trim()) {
        return;
      }

      const nextMessages: ReconnectionMessage[] = [
        ...messages,
        {
          id: buildId(),
          role: 'me',
          text: text.trim(),
          timestamp: new Date().toISOString(),
        },
      ];

      const aiPrompt = AI_PROMPTS[nextMessages.length % AI_PROMPTS.length];
      nextMessages.push({
        id: buildId(),
        role: 'ai',
        text: aiPrompt,
        timestamp: new Date().toISOString(),
      });

      setMessages(nextMessages);
      setIsMyTurn(false);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: buildId(),
            role: 'partner',
            text: `${partnerName}: I hear you. I want us to improve this together.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsMyTurn(true);
      }, 1000);
    },
    [isMyTurn, messages, partnerName],
  );

  const completeReconnection = useCallback(async () => {
    setLoading(true);
    try {
      await updateSessionStatus(sessionId, 'resolved');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return {
    isMyTurn,
    partnerName,
    loading,
    messages,
    sendMessage,
    completeReconnection,
  };
}
