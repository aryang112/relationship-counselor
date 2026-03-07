import { useState, useCallback, useEffect, useRef } from 'react';
import type { InterviewResponse } from '../types/session';
import {
  getInterview,
  submitInterview,
  saveDraft,
  transcribeAudio,
} from '../services/interviews';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface UseInterviewReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isTranscribing: boolean;
  isComplete: boolean;
  sendTextResponse: (text: string) => Promise<void>;
  sendVoiceResponse: (audioUri: string) => Promise<void>;
  exitAndSaveDraft: () => Promise<void>;
}

const INITIAL_QUESTION =
  "Let's start by understanding what's been on your mind. In your own words, what's the topic or situation you'd like to work through?";

export function useInterview(sessionId: string): UseInterviewReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const responsesRef = useRef<InterviewResponse[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const existing = await getInterview(sessionId);
        if (!mounted) return;
        if (existing.completedAt) {
          setIsComplete(true);
          const restored = (existing.responses as InterviewResponse[]).flatMap(
            (r, i) => [
              {
                id: `ai-${i}`,
                role: 'ai' as const,
                text: r.question,
                timestamp: r.timestamp || '',
              },
              {
                id: `user-${i}`,
                role: 'user' as const,
                text: r.answer,
                timestamp: r.timestamp || '',
              },
            ],
          );
          setMessages(restored);
          responsesRef.current = existing.responses as InterviewResponse[];
        } else {
          // Resume from draft
          const draft = existing.responses as InterviewResponse[];
          responsesRef.current = draft;
          const restored = draft.flatMap((r, i) => [
            {
              id: `ai-${i}`,
              role: 'ai' as const,
              text: r.question,
              timestamp: r.timestamp || '',
            },
            {
              id: `user-${i}`,
              role: 'user' as const,
              text: r.answer,
              timestamp: r.timestamp || '',
            },
          ]);
          restored.push({
            id: 'ai-next',
            role: 'ai',
            text: 'Thanks for sharing that. Would you like to add anything else, or shall we continue to the next question?',
            timestamp: new Date().toISOString(),
          });
          setMessages(restored);
        }
      } catch {
        // No existing interview, start fresh
        if (!mounted) return;
        setMessages([
          {
            id: 'ai-0',
            role: 'ai',
            text: INITIAL_QUESTION,
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const addMessage = useCallback((role: 'ai' | 'user', text: string) => {
    const msg: ChatMessage = {
      id: `${role}-${Date.now()}`,
      role,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const handleResponse = useCallback(
    async (text: string) => {
      addMessage('user', text);

      const currentQuestion =
        messages.filter((m) => m.role === 'ai').pop()?.text || INITIAL_QUESTION;

      const response: InterviewResponse = {
        question: currentQuestion,
        answer: text,
        timestamp: new Date().toISOString(),
      };
      responsesRef.current = [...responsesRef.current, response];

      // Save draft after each response
      try {
        await saveDraft(sessionId, { responses: responsesRef.current });
      } catch {
        // Silent fail for draft save
      }

      // After 5 Q&A pairs, finish the interview
      if (responsesRef.current.length >= 5) {
        addMessage(
          'ai',
          'Thank you for sharing so openly. Your responses have been recorded and will be used to generate insights for both of you.',
        );
        try {
          await submitInterview(sessionId, {
            responses: responsesRef.current,
          });
          setIsComplete(true);
        } catch {
          addMessage(
            'ai',
            'There was an issue saving your responses. Please try again.',
          );
        }
        return;
      }

      // Generate next question
      const FOLLOW_UPS = [
        'How did this situation make you feel emotionally?',
        'What do you think your partner was feeling during this?',
        "What would the ideal outcome look like for you?",
        "Is there anything you wish you'd said or done differently?",
      ];
      const nextQ =
        FOLLOW_UPS[responsesRef.current.length - 1] ||
        'Is there anything else you would like to share?';

      // Simulate a slight delay for natural feel
      setTimeout(() => addMessage('ai', nextQ), 800);
    },
    [sessionId, messages, addMessage],
  );

  const sendTextResponse = useCallback(
    async (text: string) => {
      await handleResponse(text);
    },
    [handleResponse],
  );

  const sendVoiceResponse = useCallback(
    async (audioUri: string) => {
      setIsTranscribing(true);
      try {
        const transcription = await transcribeAudio(audioUri);
        await handleResponse(transcription);
      } catch {
        addMessage(
          'ai',
          "Sorry, I couldn't process the audio. Could you try again or type your response?",
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    [handleResponse, addMessage],
  );

  const exitAndSaveDraft = useCallback(async () => {
    if (responsesRef.current.length > 0) {
      await saveDraft(sessionId, { responses: responsesRef.current });
    }
  }, [sessionId]);

  return {
    messages,
    isLoading,
    isTranscribing,
    isComplete,
    sendTextResponse,
    sendVoiceResponse,
    exitAndSaveDraft,
  };
}
