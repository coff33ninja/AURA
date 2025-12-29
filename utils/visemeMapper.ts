/**
 * VisemeMapper - Maps phonemes to VRM viseme blend shape weights
 * 
 * Converts detected phonemes to the 5 standard VRM viseme weights (a, i, u, e, o)
 * that match the existing LipSyncConfig.visemeWeights structure.
 */

import {
  Phoneme,
  PhonemeResult,
  VisemeWeights,
  VisemeMapperConfig,
  DEFAULT_VISEME_MAPPER_CONFIG,
  ALL_PHONEMES,
  createNeutralWeights,
} from '../types/phonemeLipSync';

/**
 * Default phoneme-to-viseme mapping table
 * Maps each phoneme to relative weights for each viseme (a, i, u, e, o)
 * Values are relative intensities that will be scaled by baseWeights
 */
const DEFAULT_PHONEME_MAP: Record<Phoneme, Partial<VisemeWeights>> = {
  // Open vowels - primarily 'a' viseme
  'AA': { a: 1.0, o: 0.2 },           // "father" - wide open
  'AE': { a: 0.8, e: 0.3 },           // "cat" - open with slight spread
  'AH': { a: 0.7, o: 0.2 },           // "but" - neutral open
  'AO': { a: 0.6, o: 0.5 },           // "caught" - open rounded
  
  // Back/rounded vowels - primarily 'o' and 'u' visemes
  'OW': { o: 0.9, u: 0.3 },           // "boat" - rounded
  'OY': { o: 0.7, i: 0.2 },           // "boy" - rounded to spread
  'UH': { u: 0.6, o: 0.3 },           // "book" - slightly rounded
  'UW': { u: 1.0, o: 0.2 },           // "boot" - fully rounded
  
  // Front vowels - primarily 'i' and 'e' visemes
  'IY': { i: 1.0, e: 0.3 },           // "beat" - spread/narrow
  'IH': { i: 0.7, e: 0.2 },           // "bit" - slightly spread
  'EH': { e: 0.8, a: 0.2 },           // "bet" - mid spread
  'EY': { e: 0.9, i: 0.3 },           // "bait" - spread
  'ER': { e: 0.5, a: 0.3, u: 0.2 },   // "bird" - mid with rounding
  
  // Diphthongs
  'AW': { a: 0.7, u: 0.4 },           // "bout" - open to rounded
  'AY': { a: 0.7, i: 0.3 },           // "bite" - open to spread
  
  // Bilabial consonants - lips together then release
  'B': { u: 0.3 },                     // lips together
  'P': { u: 0.3 },                     // lips together
  'M': { u: 0.4 },                     // lips together, nasal
  
  // Labiodental consonants - lower lip to upper teeth
  'F': { i: 0.2, u: 0.1 },            // slight lip tuck
  'V': { i: 0.2, u: 0.1 },            // slight lip tuck
  
  // Dental/alveolar consonants - tongue to teeth/ridge
  'TH': { i: 0.2, e: 0.1 },           // tongue visible
  'DH': { i: 0.2, e: 0.1 },           // tongue visible
  'T': { i: 0.1 },                     // minimal lip movement
  'D': { i: 0.1 },                     // minimal lip movement
  'N': { i: 0.1 },                     // minimal lip movement
  'S': { i: 0.3, e: 0.2 },            // slight spread
  'Z': { i: 0.3, e: 0.2 },            // slight spread
  'L': { i: 0.2, a: 0.1 },            // tongue up, slight open
  
  // Palatal/postalveolar consonants
  'SH': { u: 0.4, i: 0.2 },           // rounded and spread
  'ZH': { u: 0.4, i: 0.2 },           // rounded and spread
  'CH': { u: 0.3, i: 0.2 },           // rounded then spread
  'JH': { u: 0.3, i: 0.2 },           // rounded then spread
  'Y': { i: 0.5, e: 0.3 },            // spread
  
  // Velar consonants - back of tongue
  'K': { a: 0.2 },                     // slight open
  'G': { a: 0.2 },                     // slight open
  'NG': { a: 0.2 },                    // slight open, nasal
  
  // Glottal
  'HH': { a: 0.3 },                    // open for airflow
  
  // Approximants
  'R': { u: 0.4, o: 0.2 },            // slight rounding
  'W': { u: 0.7, o: 0.3 },            // strong rounding
  
  // Silence - neutral position
  'SIL': {},                           // no viseme activation
};

/**
 * VisemeMapper class
 * Converts phonemes to VRM viseme weights
 */
export class VisemeMapper {
  private config: VisemeMapperConfig;
  private phonemeMap: Record<Phoneme, Partial<VisemeWeights>>;

  constructor(config: Partial<VisemeMapperConfig> = {}) {
    this.config = { ...DEFAULT_VISEME_MAPPER_CONFIG, ...config };
    this.phonemeMap = { ...DEFAULT_PHONEME_MAP };
    
    // Apply custom mappings if provided
    if (config.customMappings) {
      for (const [phoneme, weights] of Object.entries(config.customMappings)) {
        if (ALL_PHONEMES.includes(phoneme as Phoneme)) {
          this.phonemeMap[phoneme as Phoneme] = weights;
        }
      }
    }
  }

  /**
   * Map a phoneme result to viseme weights
   * @param result PhonemeResult from PhonemeDetector
   * @returns VisemeWeights scaled by confidence and config
   */
  mapPhonemeToViseme(result: PhonemeResult): VisemeWeights {
    const mapping = this.phonemeMap[result.phoneme] || {};
    const { baseWeights, intensityMultiplier } = this.config;
    
    // Start with neutral weights
    const weights = createNeutralWeights();
    
    // Apply mapping scaled by confidence and intensity
    const scale = result.confidence * intensityMultiplier;
    
    if (mapping.a !== undefined) {
      weights.a = Math.min(1, mapping.a * baseWeights.a * scale);
    }
    if (mapping.i !== undefined) {
      weights.i = Math.min(1, mapping.i * baseWeights.i * scale);
    }
    if (mapping.u !== undefined) {
      weights.u = Math.min(1, mapping.u * baseWeights.u * scale);
    }
    if (mapping.e !== undefined) {
      weights.e = Math.min(1, mapping.e * baseWeights.e * scale);
    }
    if (mapping.o !== undefined) {
      weights.o = Math.min(1, mapping.o * baseWeights.o * scale);
    }
    
    return weights;
  }

  /**
   * Get the default phoneme-to-viseme mapping table
   */
  static getDefaultMappings(): Record<Phoneme, Partial<VisemeWeights>> {
    return { ...DEFAULT_PHONEME_MAP };
  }

  /**
   * Check if a phoneme has a mapping defined
   */
  hasMapping(phoneme: Phoneme): boolean {
    return phoneme in this.phonemeMap;
  }

  /**
   * Get mapping for a specific phoneme
   */
  getMapping(phoneme: Phoneme): Partial<VisemeWeights> | undefined {
    return this.phonemeMap[phoneme];
  }

  /**
   * Set custom mapping for a phoneme
   */
  setMapping(phoneme: Phoneme, weights: Partial<VisemeWeights>): void {
    this.phonemeMap[phoneme] = weights;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisemeMapperConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Re-apply custom mappings if provided
    if (config.customMappings) {
      for (const [phoneme, weights] of Object.entries(config.customMappings)) {
        if (ALL_PHONEMES.includes(phoneme as Phoneme)) {
          this.phonemeMap[phoneme as Phoneme] = weights;
        }
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): VisemeMapperConfig {
    return { ...this.config };
  }

  /**
   * Reset to default mappings
   */
  resetMappings(): void {
    this.phonemeMap = { ...DEFAULT_PHONEME_MAP };
  }
}
