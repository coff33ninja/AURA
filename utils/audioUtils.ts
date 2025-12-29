
// Decodes Base64 string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Encodes Uint8Array to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Converts Float32 audio data (Web Audio API default) to Int16 PCM (Live API requirement)
export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

// Downsamples Float32 audio data from inputRate to outputRate
export function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (outputRate >= inputRate) {
        return buffer;
    }
    const sampleRateRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    
    while (offsetResult < result.length) {
        let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        // Use average value of accumulated samples for simple anti-aliasing
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

// Custom manual decoding of raw PCM data from Gemini (24kHz, 1 channel usually)
// Uses a shared AudioContext to avoid memory leaks from creating new contexts per call
let sharedDecodeContext: AudioContext | null = null;

export function decodeAudioData(
    data: Uint8Array,
    sampleRate: number = 24000
): AudioBuffer {
    // Reuse a single AudioContext for decoding to prevent memory leaks
    // The context is only used to create AudioBuffer objects, not for playback
    if (!sharedDecodeContext || sharedDecodeContext.state === 'closed') {
        sharedDecodeContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Ensure data length is even (Int16 = 2 bytes per sample)
    const alignedLength = data.length - (data.length % 2);
    const alignedData = alignedLength < data.length ? data.slice(0, alignedLength) : data;
    
    const dataInt16 = new Int16Array(alignedData.buffer, alignedData.byteOffset, alignedLength / 2);
    // Mono channel assumption for Gemini Live
    const numChannels = 1; 
    const frameCount = dataInt16.length;
    
    if (frameCount === 0) {
        // Return empty buffer if no data
        return sharedDecodeContext.createBuffer(1, 1, sampleRate);
    }
    
    // Create buffer with the specific sample rate of the audio (24kHz)
    const buffer = sharedDecodeContext.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Convert Int16 to Float32 with proper normalization
    for (let i = 0; i < frameCount; i++) {
        // Normalize to -1.0 to 1.0 range
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
}

// Clean up the shared decode context (call on app unmount if needed)
export function closeDecodeContext(): void {
    if (sharedDecodeContext && sharedDecodeContext.state !== 'closed') {
        sharedDecodeContext.close();
        sharedDecodeContext = null;
    }
}

// Calculate RMS (Root Mean Square) for volume visualization
export function calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
}
