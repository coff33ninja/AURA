// FPS Counter Component - Debug overlay showing frame rate
import React from 'react';
import { getFpsColorCss, type FpsState } from '../utils/fpsCounter';

export interface FpsCounterProps {
  visible: boolean;
  fps: number;
  frameTime: number;
  color?: 'green' | 'yellow' | 'red';
}

/**
 * FPS Counter overlay component
 * Displays current FPS and frame time with color-coded status
 */
export const FpsCounter: React.FC<FpsCounterProps> = ({
  visible,
  fps,
  frameTime,
  color = 'green',
}) => {
  if (!visible) {
    return null;
  }

  const colorCss = getFpsColorCss(color);

  return (
    <div className="fps-counter">
      <div className="fps-counter-value" style={{ color: colorCss }}>
        {fps} FPS
      </div>
      <div className="fps-counter-frametime">
        {frameTime.toFixed(2)}ms
      </div>
    </div>
  );
};

// Add CSS styles to index.css or use inline for simplicity
// The component uses classes that should be defined in CSS:
// .fps-counter { position: fixed; top: 8px; right: 8px; ... }
// .fps-counter-value { font-size: 14px; font-weight: bold; }
// .fps-counter-frametime { font-size: 12px; opacity: 0.7; }

export default FpsCounter;
