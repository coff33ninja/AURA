/**
 * PhonemeDetector - Analyzes audio frequency data to detect phonemes
 * 
 * Uses formant analysis to estimate vowel sounds from FFT frequency data.
 * Formants are resonant frequencies of the vocal tract that characterize vowels.
 * 
 * F1 (first formant): Related to tongue height (low F1 = high tongue, high F1 = low tongue)
 * F2 (second formant): Related to tongue position (low F2 = back, high F2 = front)
 */

import {
  Phoneme,
  PhonemeResult,
  PhonemeDetectorConfig,
  DEFAULT_PHONEME_DETECTOR_CONFIG,
} from '../types/phonemeLipSync';

/**
 * Formant frequency ranges for vowel classification (in Hz)
 * Based on average adult vocal tract characteristics
 */
interface FormantRange {
  f1Min: number;
  f1Max: number;
  f2Min: number;
  f2Max: number;
}

const VOWEL_FORMANTS: Record<string, FormantRange> = {
  // Open vowels (high F1)
  'AA': { f1Min: 600, f1Max: 900, f2Min: 1000, f2Max: 1400 },  // "father"
  'AE': { f1Min: 550, f1Max: 800, f2Min: 1600, f2Max: 2100 },  // "cat"
  'AH': { f1Min: 500, f1Max: 750, f2Min: 1100, f2Max: 1500 },  // "but"
  
  // Back vowels (low F2)
  'AO': { f1Min: 500, f1Max: 700, f2Min: 800, f2Max: 1100 },   // "caught"
  'UH': { f1Min: 400, f1Max: 550, f2Min: 900, f2Max: 1200 },   // "book"
  'UW': { f1Min: 280, f1Max: 400, f2Min: 700, f2Max: 1000 },   // "boot"
  
  // Front vowels (high F2)
  'IY': { f1Min: 250, f1Max: 400, f2Min: 2100, f2Max: 2800 },  // "beat"
  'IH': { f1Min: 350, f1Max: 500, f2Min: 1800, f2Max: 2300 },  // "bit"
  'EH': { f1Min: 450, f1Max: 650, f2Min: 1700, f2Max: 2100 },  // "bet"
  'EY': { f1Min: 400, f1Max: 550, f2Min: 1900, f2Max: 2400 },  // "bait"
  'ER': { f1Min: 450, f1Max: 600, f2Min: 1200, f2Max: 1600 },  // "bird"
  
  // Diphthongs (approximate with primary vowel)
  'OW': { f1Min: 400, f1Max: 600, f2Min: 700, f2Max: 1100 },   // "boat"
  'OY': { f1Min: 400, f1Max: 600, f2Min: 800, f2Max: 1200 },   // "boy"
  'AW': { f1Min: 600, f1Max: 800, f2Min: 1000, f2Max: 1400 },  // "bout"
  'AY': { f1Min: 600, f1Max: 850, f2Min: 1200, f2Max: 1600 },  // "bite"
};

/**
 * PhonemeDetector class
 * Analyzes FFT frequency data to detect phonemes
 */
export class PhonemeDetector {
  private config: PhonemeDetectorConfig;
  private lastPhoneme: Phoneme = 'SIL';
  private smoothedConfidence: number = 0;
  private energyHistory: number[] = [];
  private readonly ENERGY_HISTORY_SIZE = 5;
  private readonly SILENCE_THRESHOLD = 0.05;

  constructor(config: Partial<PhonemeDetectorConfig> = {}) {
    this.config = { ...DEFAULT_PHONEME_DETECTOR_CONFIG, ...config };
  }

  /**
   * Analyze FFT frequency data and return detected phoneme
   * @param frequencyData Uint8Array from AnalyserNode.getByteFrequencyData()
   * @returns PhonemeResult with detected phoneme and confidence
   */
  analyzeFrequencyData(frequencyData: Uint8Array): PhonemeResult {
    const timestamp = performance.now();
    
    // Handle empty or invalid input
    if (!frequencyData || frequencyData.length === 0) {
      return this.createResult('SIL', 0, timestamp);
    }

    // Calculate overall energy
    const energy = this.calculateEnergy(frequencyData);
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.ENERGY_HISTORY_SIZE) {
      this.energyHistory.shift();
    }

    // Check for silence
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    if (avgEnergy < this.SILENCE_THRESHOLD) {
      return this.createResult('SIL', 1.0 - avgEnergy / this.SILENCE_THRESHOLD, timestamp);
    }

    // Extract formant estimates
    const { f1, f2, confidence: formantConfidence } = this.extractFormants(frequencyData);
    
    // Classify phoneme based on formants
    const { phoneme, confidence } = this.classifyPhoneme(f1, f2, formantConfidence, energy);
    
    // Apply temporal smoothing
    const smoothedResult = this.applySmoothing(phoneme, confidence);
    
    return this.createResult(smoothedResult.phoneme, smoothedResult.confidence, timestamp);
  }

  /**
   * Calculate overall energy from frequency data
   */
  private calculateEnergy(frequencyData: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      sum += frequencyData[i];
    }
    return sum / (frequencyData.length * 255);
  }

  /**
   * Extract F1 and F2 formant estimates from frequency data
   * Uses peak detection in relevant frequency bands
   */
  private extractFormants(frequencyData: Uint8Array): { f1: number; f2: number; confidence: number } {
    const binCount = frequencyData.length;
    const nyquist = this.config.sampleRate / 2;
    const binWidth = nyquist / binCount;

    // F1 range: 200-1000 Hz
    const f1StartBin = Math.floor(200 / binWidth);
    const f1EndBin = Math.min(Math.floor(1000 / binWidth), binCount - 1);
    
    // F2 range: 800-3000 Hz
    const f2StartBin = Math.floor(800 / binWidth);
    const f2EndBin = Math.min(Math.floor(3000 / binWidth), binCount - 1);

    // Find peak in F1 range
    let f1Peak = 0;
    let f1PeakBin = f1StartBin;
    for (let i = f1StartBin; i <= f1EndBin; i++) {
      if (frequencyData[i] > f1Peak) {
        f1Peak = frequencyData[i];
        f1PeakBin = i;
      }
    }

    // Find peak in F2 range (excluding F1 region overlap)
    let f2Peak = 0;
    let f2PeakBin = f2StartBin;
    for (let i = Math.max(f2StartBin, f1PeakBin + 3); i <= f2EndBin; i++) {
      if (frequencyData[i] > f2Peak) {
        f2Peak = frequencyData[i];
        f2PeakBin = i;
      }
    }

    const f1 = f1PeakBin * binWidth;
    const f2 = f2PeakBin * binWidth;
    
    // Confidence based on peak prominence
    const avgLevel = this.calculateEnergy(frequencyData) * 255;
    const prominence = Math.min(1, ((f1Peak + f2Peak) / 2 - avgLevel) / 128);
    const confidence = Math.max(0, prominence);

    return { f1, f2, confidence };
  }

  /**
   * Classify phoneme based on formant frequencies
   */
  private classifyPhoneme(
    f1: number, 
    f2: number, 
    formantConfidence: number,
    energy: number
  ): { phoneme: Phoneme; confidence: number } {
    let bestMatch: Phoneme = 'AH'; // Default to neutral vowel
    let bestScore = 0;

    for (const [vowel, range] of Object.entries(VOWEL_FORMANTS)) {
      // Calculate how well the formants match this vowel
      const f1Score = this.gaussianScore(f1, (range.f1Min + range.f1Max) / 2, (range.f1Max - range.f1Min) / 2);
      const f2Score = this.gaussianScore(f2, (range.f2Min + range.f2Max) / 2, (range.f2Max - range.f2Min) / 2);
      const score = f1Score * f2Score;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = vowel as Phoneme;
      }
    }

    // Detect consonants based on energy patterns and spectral characteristics
    const consonantResult = this.detectConsonant(f1, f2, energy);
    if (consonantResult.confidence > bestScore && consonantResult.confidence > 0.3) {
      return consonantResult;
    }

    // Combine formant confidence with match score
    const finalConfidence = Math.min(1, bestScore * formantConfidence * 2);
    
    return { 
      phoneme: finalConfidence >= this.config.minConfidence ? bestMatch : 'SIL',
      confidence: finalConfidence 
    };
  }

  /**
   * Detect consonant sounds based on spectral characteristics
   */
  private detectConsonant(f1: number, f2: number, energy: number): { phoneme: Phoneme; confidence: number } {
    // High frequency energy suggests fricatives (S, SH, F, etc.)
    if (f2 > 2500 && energy > 0.2) {
      if (f2 > 4000) {
        return { phoneme: 'S', confidence: 0.5 };
      }
      return { phoneme: 'SH', confidence: 0.4 };
    }

    // Very low energy with some high frequency = unvoiced stops
    if (energy < 0.15 && f2 > 1500) {
      return { phoneme: 'T', confidence: 0.3 };
    }

    // Nasal consonants have low F1 and specific F2 patterns
    if (f1 < 400 && f2 < 1500 && energy > 0.1) {
      return { phoneme: 'M', confidence: 0.35 };
    }

    return { phoneme: 'SIL', confidence: 0 };
  }

  /**
   * Gaussian scoring function for formant matching
   */
  private gaussianScore(value: number, mean: number, stdDev: number): number {
    const diff = value - mean;
    return Math.exp(-(diff * diff) / (2 * stdDev * stdDev));
  }

  /**
   * Apply temporal smoothing to reduce jitter
   */
  private applySmoothing(phoneme: Phoneme, confidence: number): { phoneme: Phoneme; confidence: number } {
    // Smooth confidence
    this.smoothedConfidence = this.smoothedConfidence * this.config.smoothingFactor + 
                              confidence * (1 - this.config.smoothingFactor);

    // Only change phoneme if confidence is high enough
    if (confidence > this.config.minConfidence && confidence > this.smoothedConfidence * 0.8) {
      this.lastPhoneme = phoneme;
    }

    return { 
      phoneme: this.lastPhoneme, 
      confidence: this.smoothedConfidence 
    };
  }

  /**
   * Create a PhonemeResult object
   */
  private createResult(phoneme: Phoneme, confidence: number, timestamp: number): PhonemeResult {
    return {
      phoneme,
      confidence: Math.max(0, Math.min(1, confidence)),
      timestamp,
    };
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.lastPhoneme = 'SIL';
    this.smoothedConfidence = 0;
    this.energyHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PhonemeDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PhonemeDetectorConfig {
    return { ...this.config };
  }
}
