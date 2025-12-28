export interface AudioQueueItem {
    buffer: AudioBuffer;
}

export interface VisualizerData {
    volume: number; // 0.0 to 1.0
    isSpeaking: boolean;
}

export enum ConnectionState {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    ERROR = 'ERROR'
}

// Helper types for raw PCM handling
export interface PcmAudio {
    data: string; // Base64 encoded
    mimeType: string;
}
