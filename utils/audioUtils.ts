
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
export function decodeAudioData(
    data: Uint8Array,
    sampleRate: number = 24000
): AudioBuffer {
    // Do not force sampleRate on the context itself, as it might fail on some hardware.
    // The AudioBuffer can have a different sample rate than the context.
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dataInt16 = new Int16Array(data.buffer);
    // Mono channel assumption for Gemini Live
    const numChannels = 1; 
    const frameCount = dataInt16.length;
    
    // Create buffer with the specific sample rate of the audio (24kHz)
    const buffer = audioCtx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
}

// Calculate RMS (Root Mean Square) for volume visualization
export function calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
}
