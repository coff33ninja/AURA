// FPS Counter - Tracks frame rate and provides color-coded status
// Useful for debugging and performance monitoring

/**
 * FPS color coding based on performance
 */
export type FpsColor = 'green' | 'yellow' | 'red';

/**
 * FPS state containing current metrics
 */
export interface FpsState {
  fps: number;
  frameTime: number; // milliseconds
  color: FpsColor;
}

/**
 * FPS counter configuration
 */
export interface FpsCounterConfig {
  sampleSize?: number; // Number of frames to average (default 60)
  greenThreshold?: number; // FPS above this is green (default 50)
  yellowThreshold?: number; // FPS above this is yellow (default 30)
}

/**
 * FPS counter instance
 */
export interface FpsCounter {
  update: (deltaTime: number) => void;
  getState: () => FpsState;
  reset: () => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<FpsCounterConfig> = {
  sampleSize: 60,
  greenThreshold: 50,
  yellowThreshold: 30,
};

/**
 * Get the color coding for a given FPS value
 * 
 * @param fps - Current frames per second
 * @param greenThreshold - FPS above this is green (default 50)
 * @param yellowThreshold - FPS above this is yellow (default 30)
 * @returns Color code: 'green', 'yellow', or 'red'
 */
export function getFpsColor(
  fps: number,
  greenThreshold: number = 50,
  yellowThreshold: number = 30
): FpsColor {
  if (fps > greenThreshold) {
    return 'green';
  } else if (fps >= yellowThreshold) {
    return 'yellow';
  }
  return 'red';
}

/**
 * Create an FPS counter instance
 * 
 * @param config - Optional configuration
 * @returns FPS counter with update and getState methods
 */
export function createFpsCounter(config: FpsCounterConfig = {}): FpsCounter {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Rolling buffer for frame times
  const frameTimes: number[] = [];
  let currentFps = 60;
  let currentFrameTime = 16.67;
  
  /**
   * Update the FPS counter with a new frame
   * 
   * @param deltaTime - Time since last frame in seconds
   */
  function update(deltaTime: number): void {
    // Convert to milliseconds
    const frameTimeMs = deltaTime * 1000;
    
    // Add to rolling buffer
    frameTimes.push(frameTimeMs);
    
    // Keep buffer at sample size
    while (frameTimes.length > cfg.sampleSize) {
      frameTimes.shift();
    }
    
    // Calculate average frame time
    if (frameTimes.length > 0) {
      const sum = frameTimes.reduce((a, b) => a + b, 0);
      currentFrameTime = sum / frameTimes.length;
      currentFps = currentFrameTime > 0 ? 1000 / currentFrameTime : 0;
    }
  }
  
  /**
   * Get the current FPS state
   * 
   * @returns Current FPS metrics and color
   */
  function getState(): FpsState {
    return {
      fps: Math.round(currentFps),
      frameTime: Math.round(currentFrameTime * 100) / 100, // 2 decimal places
      color: getFpsColor(currentFps, cfg.greenThreshold, cfg.yellowThreshold),
    };
  }
  
  /**
   * Reset the FPS counter
   */
  function reset(): void {
    frameTimes.length = 0;
    currentFps = 60;
    currentFrameTime = 16.67;
  }
  
  return {
    update,
    getState,
    reset,
  };
}

/**
 * Format FPS state as a display string
 * 
 * @param state - FPS state to format
 * @returns Formatted string like "60 FPS (16.67ms)"
 */
export function formatFpsState(state: FpsState): string {
  return `${state.fps} FPS (${state.frameTime.toFixed(2)}ms)`;
}

/**
 * Get CSS color value for FPS color
 * 
 * @param color - FPS color code
 * @returns CSS color string
 */
export function getFpsColorCss(color: FpsColor): string {
  switch (color) {
    case 'green':
      return '#22c55e'; // Tailwind green-500
    case 'yellow':
      return '#eab308'; // Tailwind yellow-500
    case 'red':
      return '#ef4444'; // Tailwind red-500
    default:
      return '#ffffff';
  }
}
