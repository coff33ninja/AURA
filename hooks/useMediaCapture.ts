import { useState, useRef, useCallback } from 'react';
import {
  captureAndDownloadScreenshot,
  createRecordingSession,
  isMediaRecorderSupported,
  downloadBlob,
  generateFilename,
} from '../utils/mediaCapture';

export interface UseMediaCaptureReturn {
  isRecording: boolean;
  recordingDuration: number;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  handleScreenshot: () => Promise<void>;
  handleStartRecording: () => Promise<void>;
  handleStopRecording: () => Promise<void>;
  isRecordingSupported: boolean;
}

export function useMediaCapture(): UseMediaCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingSessionRef = useRef<ReturnType<typeof createRecordingSession> | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleScreenshot = useCallback(async () => {
    // Find the canvas element from NeuralCore
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.error('No canvas found for screenshot');
      return;
    }
    canvasRef.current = canvas;
    await captureAndDownloadScreenshot({ canvas });
  }, []);

  const handleStartRecording = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.error('No canvas found for recording');
      return;
    }
    canvasRef.current = canvas;

    if (!isMediaRecorderSupported()) {
      console.error('MediaRecorder not supported');
      return;
    }

    try {
      const session = createRecordingSession(canvas);
      recordingSessionRef.current = session;
      session.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recordingSessionRef.current) return;

    try {
      const blob = await recordingSessionRef.current.stop();
      downloadBlob(blob, generateFilename('aura-recording', 'webm'));
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      recordingSessionRef.current = null;
    }
  }, []);

  return {
    isRecording,
    recordingDuration,
    canvasRef,
    handleScreenshot,
    handleStartRecording,
    handleStopRecording,
    isRecordingSupported: isMediaRecorderSupported(),
  };
}
