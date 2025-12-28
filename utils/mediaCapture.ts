// Media Capture Utilities - Screenshot and Video Recording

import type { MediaCaptureOptions, RecordingOptions } from '../types/enhancementTypes';

/**
 * Check if MediaRecorder API is supported
 */
export function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function';
}

/**
 * Get supported video MIME type
 */
export function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
}

/**
 * Capture a screenshot from a canvas element
 * Returns a Blob with the image data
 */
export async function captureScreenshot(options: MediaCaptureOptions): Promise<Blob> {
  const { canvas, format = 'png', quality = 0.92 } = options;
  
  return new Promise((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to capture screenshot - canvas.toBlob returned null'));
        }
      },
      mimeType,
      format === 'jpeg' ? quality : undefined
    );
  });
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Capture and download a screenshot
 */
export async function captureAndDownloadScreenshot(options: MediaCaptureOptions): Promise<void> {
  const { filename = `aura-screenshot-${Date.now()}`, format = 'png' } = options;
  const blob = await captureScreenshot(options);
  const extension = format === 'jpeg' ? 'jpg' : 'png';
  downloadBlob(blob, `${filename}.${extension}`);
}

/**
 * Start recording from a canvas element
 * Returns the MediaRecorder instance
 */
export function startRecording(options: RecordingOptions): MediaRecorder {
  const { canvas, mimeType, videoBitsPerSecond = 2500000 } = options;
  
  if (!isMediaRecorderSupported()) {
    throw new Error('MediaRecorder is not supported in this browser');
  }
  
  const supportedMimeType = mimeType || getSupportedMimeType();
  if (!supportedMimeType) {
    throw new Error('No supported video MIME type found');
  }
  
  // Get stream from canvas
  const stream = canvas.captureStream(30); // 30 FPS
  
  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMimeType,
    videoBitsPerSecond,
  });
  
  return recorder;
}

/**
 * Stop recording and return the video blob
 */
export function stopRecording(recorder: MediaRecorder, chunks: Blob[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      if (chunks.length === 0) {
        reject(new Error('No video data recorded'));
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType });
      resolve(blob);
    };
    
    recorder.onerror = (event) => {
      reject(new Error(`Recording error: ${event}`));
    };
    
    if (recorder.state === 'recording') {
      recorder.stop();
    } else {
      reject(new Error('Recorder is not in recording state'));
    }
  });
}

/**
 * Create a recording session with all necessary state management
 */
export function createRecordingSession(canvas: HTMLCanvasElement) {
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startTime: number | null = null;
  
  return {
    start(): void {
      if (recorder && recorder.state === 'recording') {
        throw new Error('Already recording');
      }
      
      chunks = [];
      recorder = startRecording({ canvas });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.start(100); // Collect data every 100ms
      startTime = Date.now();
    },
    
    async stop(): Promise<Blob> {
      if (!recorder) {
        throw new Error('No recording in progress');
      }
      
      const blob = await stopRecording(recorder, chunks);
      recorder = null;
      startTime = null;
      return blob;
    },
    
    isRecording(): boolean {
      return recorder !== null && recorder.state === 'recording';
    },
    
    getDuration(): number {
      if (!startTime) return 0;
      return (Date.now() - startTime) / 1000;
    },
  };
}

/**
 * Generate a timestamp-based filename
 */
export function generateFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.${extension}`;
}
