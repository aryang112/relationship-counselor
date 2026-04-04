import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { InterviewResponse } from '../types/session';
import {
  getInterview,
  getNextQuestion,
  submitInterview,
  saveDraft,
  transcribeAudio,
} from '../services/interviews';
import { getGenderCopy } from '../utils/genderCopy';

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
  isThinking: boolean;
  isComplete: boolean;
  crisisDetected: boolean;
  sendTextResponse: (text: string) => Promise<void>;
  sendVoiceResponse: (audioUri: string) => Promise<void>;
  exitAndSaveDraft: () => Promise<void>;
}

const MAX_QUESTIONS = 7;

export function useInterview(sessionId: string, partnerBOpeningMessage?: string, gender?: string | null, userName?: string | null): UseInterviewReturn {
  const copy = useMemo(() => getGenderCopy(gender, userName), [gender, userName]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
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
            text: copy.resumeMessage,
            timestamp: new Date().toISOString(),
          });
          setMessages(restored);
        }
      } catch {
        // No existing interview, start fresh
        if (!mounted) return;
        // Brief delay to simulate AI "thinking" before first message
        setIsThinking(true);
        setTimeout(() => {
          if (!mounted) return;
          setIsThinking(false);
          setMessages([
            {
              id: 'ai-0',
              role: 'ai',
              text: partnerBOpeningMessage || copy.initialQuestion,
              timestamp: new Date().toISOString(),
            },
          ]);
        }, 1500);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, copy]);

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

  /**
   * Build the OpenAI-compatible conversation history from the current
   * Q&A pairs for the next-question endpoint.
   */
  const buildConversationHistory = useCallback(
    (currentResponses: InterviewResponse[], latestAnswer: string) => {
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      // Add all previous Q&A pairs
      for (const r of currentResponses) {
        history.push({ role: 'assistant', content: r.question });
        history.push({ role: 'user', content: r.answer });
      }

      return history;
    },
    [],
  );

  const handleResponse = useCallback(
    async (text: string) => {
      addMessage('user', text);

      const currentQuestion =
        messages.filter((m) => m.role === 'ai').pop()?.text || copy.initialQuestion;

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

      // After MAX_QUESTIONS Q&A pairs, finish the interview
      if (responsesRef.current.length >= MAX_QUESTIONS) {
        addMessage(
          'ai',
          copy.completionMessage,
        );
        try {
          const result = await submitInterview(sessionId, {
            responses: responsesRef.current,
          });
          if (result.crisisDetected) {
            setCrisisDetected(true);
          }
          setIsComplete(true);
        } catch {
          addMessage(
            'ai',
            'There was an issue saving your responses. Please try again.',
          );
        }
        return;
      }

      // Get dynamic AI follow-up question
      setIsThinking(true);
      try {
        // Natural thinking delay — makes the AI feel more human
        const thinkingDelay = 800 + Math.random() * 1200; // 0.8-2.0 seconds
        await new Promise((resolve) => setTimeout(resolve, thinkingDelay));

        const conversationHistory = buildConversationHistory(
          responsesRef.current,
          text,
        );
        const nextQ = await getNextQuestion(sessionId, conversationHistory);

        // Split multi-sentence responses into separate bubbles for natural feel
        const sentences = nextQ.match(/[^.!?]+[.!?]+/g) || [nextQ];
        if (sentences.length >= 2 && sentences.length <= 3) {
          // Split into 2 bubbles: acknowledgment + question
          const splitPoint = 1; // First sentence is acknowledgment
          const firstPart = sentences.slice(0, splitPoint).join(' ').trim();
          const secondPart = sentences.slice(splitPoint).join(' ').trim();

          addMessage('ai', firstPart);
          // Show typing indicator again for second bubble
          setIsThinking(true);
          await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 800));
          setIsThinking(false);
          addMessage('ai', secondPart);
        } else {
          addMessage('ai', nextQ);
        }
      } catch {
        // Fallback if AI call fails
        addMessage(
          'ai',
          copy.fallbackQuestion,
        );
      } finally {
        setIsThinking(false);
      }
    },
    [sessionId, messages, addMessage, buildConversationHistory, copy],
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
    isThinking,
    isComplete,
    crisisDetected,
    sendTextResponse,
    sendVoiceResponse,
    exitAndSaveDraft,
  };
}
