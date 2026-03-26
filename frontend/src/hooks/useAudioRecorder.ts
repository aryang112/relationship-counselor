import { useState, useRef, useCallback } from 'react';
import { useAudioRecorder as useExpoAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingUri: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  resetRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;

      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!isRecording) return null;
      setIsRecording(false);
      await recorder.stop();
      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      });
      const uri = recorder.uri;
      setRecordingUri(uri);
      return uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      return null;
    }
  }, [isRecording, recorder]);

  const resetRecording = useCallback(() => {
    setRecordingUri(null);
  }, []);

  return { isRecording, recordingUri, startRecording, stopRecording, resetRecording };
}
