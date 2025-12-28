// AudioWorklet processor for microphone input
// Replaces deprecated ScriptProcessorNode

class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputChannel = input[0];
    
    // Accumulate samples into buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];
      
      // When buffer is full, send it to main thread
      if (this.bufferIndex >= this.bufferSize) {
        // Calculate RMS for volume
        let sum = 0;
        for (let j = 0; j < this.bufferSize; j++) {
          sum += this.buffer[j] * this.buffer[j];
        }
        const rms = Math.sqrt(sum / this.bufferSize);
        
        // Send buffer and RMS to main thread
        this.port.postMessage({
          buffer: this.buffer.slice(), // Copy the buffer
          rms: rms
        });
        
        this.bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('mic-processor', MicProcessor);
