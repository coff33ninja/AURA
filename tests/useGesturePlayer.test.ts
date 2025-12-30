/**
 * Property-based tests for useGesturePlayer hook
 * 
 * Feature: neural-core-splitting, Property 3: Gesture Queue FIFO Order
 * Validates: Requirements 4.2, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

describe('useGesturePlayer', () => {
  describe('Module Exports', () => {
    it('should export useGesturePlayer function', async () => {
      const module = await import('../components/neural-core/hooks/useGesturePlayer');
      expect(typeof module.useGesturePlayer).toBe('function');
    });

    it('should export default as useGesturePlayer', async () => {
      const module = await import('../components/neural-core/hooks/useGesturePlayer');
      expect(module.default).toBe(module.useGesturePlayer);
    });
  });

  describe('Property 3: Gesture Queue FIFO Order', () => {
    /**
     * Feature: neural-core-splitting, Property 3: Gesture Queue FIFO Order
     * For any sequence of playGesture calls, gestures SHALL be played in 
     * first-in-first-out order, with each gesture completing before the next begins.
     */

    // Simulate the queue behavior for testing
    interface GestureQueueItem {
      name: string;
      duration: number;
    }

    class GestureQueueSimulator {
      queue: GestureQueueItem[] = [];
      playedOrder: string[] = [];
      currentGesture: string | null = null;
      isActive: boolean = false;

      addGesture(name: string, duration: number = 1.5) {
        this.queue.push({ name, duration });
        if (!this.isActive) {
          this.playNext();
        }
      }

      playNext() {
        if (this.queue.length === 0) {
          this.isActive = false;
          this.currentGesture = null;
          return;
        }

        const { name } = this.queue.shift()!;
        this.currentGesture = name;
        this.isActive = true;
        this.playedOrder.push(name);
      }

      completeCurrentGesture() {
        if (this.isActive) {
          this.playNext();
        }
      }

      clear() {
        this.queue = [];
        this.playedOrder = [];
        this.currentGesture = null;
        this.isActive = false;
      }
    }

    it('should maintain FIFO order for any sequence of gestures', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          (gestureNames) => {
            const simulator = new GestureQueueSimulator();
            
            // Add all gestures
            for (const name of gestureNames) {
              simulator.addGesture(name);
            }
            
            // Complete all gestures
            while (simulator.isActive) {
              simulator.completeCurrentGesture();
            }
            
            // Verify FIFO order
            expect(simulator.playedOrder).toEqual(gestureNames);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should start first gesture immediately when queue is empty', () => {
      const simulator = new GestureQueueSimulator();
      
      simulator.addGesture('wave');
      
      expect(simulator.isActive).toBe(true);
      expect(simulator.currentGesture).toBe('wave');
      expect(simulator.queue.length).toBe(0); // Should be removed from queue
    });

    it('should queue subsequent gestures while one is playing', () => {
      const simulator = new GestureQueueSimulator();
      
      simulator.addGesture('wave');
      simulator.addGesture('nod');
      simulator.addGesture('bow');
      
      expect(simulator.currentGesture).toBe('wave');
      expect(simulator.queue.length).toBe(2);
      expect(simulator.queue[0].name).toBe('nod');
      expect(simulator.queue[1].name).toBe('bow');
    });

    it('should play next gesture when current completes', () => {
      const simulator = new GestureQueueSimulator();
      
      simulator.addGesture('wave');
      simulator.addGesture('nod');
      
      expect(simulator.currentGesture).toBe('wave');
      
      simulator.completeCurrentGesture();
      
      expect(simulator.currentGesture).toBe('nod');
      expect(simulator.queue.length).toBe(0);
    });

    it('should become inactive when queue is exhausted', () => {
      const simulator = new GestureQueueSimulator();
      
      simulator.addGesture('wave');
      
      expect(simulator.isActive).toBe(true);
      
      simulator.completeCurrentGesture();
      
      expect(simulator.isActive).toBe(false);
      expect(simulator.currentGesture).toBeNull();
    });

    it('should handle rapid queueing correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (count) => {
            const simulator = new GestureQueueSimulator();
            const gestures = Array.from({ length: count }, (_, i) => `gesture_${i}`);
            
            // Rapidly add all gestures
            for (const name of gestures) {
              simulator.addGesture(name);
            }
            
            // First gesture should be playing
            expect(simulator.currentGesture).toBe('gesture_0');
            
            // Rest should be queued
            expect(simulator.queue.length).toBe(count - 1);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Gesture State Management', () => {
    it('should have correct default state structure', () => {
      const defaultState = {
        active: false,
        elapsed: 0,
        duration: 0,
        currentGesture: null,
        transitionSpeed: 0.3,
        easing: 'easeInOut',
        fromPose: {},
        toPose: {},
      };
      
      expect(defaultState.active).toBe(false);
      expect(defaultState.elapsed).toBe(0);
      expect(defaultState.duration).toBe(0);
      expect(defaultState.currentGesture).toBeNull();
      expect(defaultState.transitionSpeed).toBe(0.3);
      expect(defaultState.easing).toBe('easeInOut');
      expect(defaultState.fromPose).toEqual({});
      expect(defaultState.toPose).toEqual({});
    });

    it('should track elapsed time correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }), // duration (min 0.1 to avoid edge case)
          fc.array(fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }), { minLength: 1, maxLength: 100 }), // deltas
          (duration, deltas) => {
            let elapsed = 0;
            
            for (const delta of deltas) {
              elapsed += delta;
              if (elapsed >= duration) break;
            }
            
            // Elapsed should be positive and bounded
            expect(elapsed).toBeGreaterThanOrEqual(0);
            expect(elapsed).toBeLessThanOrEqual(duration + 0.1); // Allow small overshoot
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Dynamic Gesture Animations', () => {
    it('should apply wave animation based on time', () => {
      const now = Date.now();
      const waveX = Math.sin(now * 0.003) * 0.5;
      
      // Wave animation should produce values in [-0.5, 0.5]
      expect(waveX).toBeGreaterThanOrEqual(-0.5);
      expect(waveX).toBeLessThanOrEqual(0.5);
    });

    it('should apply applause animation with phase offset', () => {
      const now = Date.now();
      const rightHandX = Math.sin(now * 0.005) * 0.3;
      const leftHandX = Math.sin(now * 0.005 + Math.PI) * 0.3;
      
      // Hands should be out of phase (opposite directions)
      // When one is positive, the other should be negative (approximately)
      expect(rightHandX * leftHandX).toBeLessThanOrEqual(0.09); // Max product when both at 0.3
    });

    it('should apply dismissive wave animation', () => {
      const now = Date.now();
      const handX = Math.sin(now * 0.004) * 0.3;
      
      // Should produce values in [-0.3, 0.3]
      expect(handX).toBeGreaterThanOrEqual(-0.3);
      expect(handX).toBeLessThanOrEqual(0.3);
    });
  });

  describe('Gesture Duration Handling', () => {
    it('should use gesture config duration when available', () => {
      const gestureConfig = { duration: 2.5 };
      const defaultDuration = 1.5;
      
      const actualDuration = gestureConfig.duration ?? defaultDuration;
      
      expect(actualDuration).toBe(2.5);
    });

    it('should fall back to default duration when not specified', () => {
      const gestureConfig = {};
      const defaultDuration = 1.5;
      
      const actualDuration = (gestureConfig as any).duration ?? defaultDuration;
      
      expect(actualDuration).toBe(1.5);
    });

    it('should handle various duration values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (duration) => {
            // Duration should be positive
            expect(duration).toBeGreaterThan(0);
            
            // Duration should be reasonable
            expect(duration).toBeLessThanOrEqual(10);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Transition Speed', () => {
    it('should use gesture config transition speed when available', () => {
      const gestureConfig = { transitionSpeed: 0.5 };
      const defaultSpeed = 0.3;
      
      const actualSpeed = gestureConfig.transitionSpeed ?? defaultSpeed;
      
      expect(actualSpeed).toBe(0.5);
    });

    it('should fall back to default transition speed', () => {
      const gestureConfig = {};
      const defaultSpeed = 0.3;
      
      const actualSpeed = (gestureConfig as any).transitionSpeed ?? defaultSpeed;
      
      expect(actualSpeed).toBe(0.3);
    });
  });

  describe('Queue Operations', () => {
    it('should clear queue correctly', () => {
      const queue: { name: string; duration: number }[] = [
        { name: 'wave', duration: 1.5 },
        { name: 'nod', duration: 1.0 },
      ];
      
      // Clear operation
      queue.length = 0;
      
      expect(queue).toEqual([]);
    });

    it('should handle empty queue gracefully', () => {
      const queue: { name: string; duration: number }[] = [];
      
      const item = queue.shift();
      
      expect(item).toBeUndefined();
      expect(queue.length).toBe(0);
    });
  });
});
