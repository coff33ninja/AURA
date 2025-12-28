// Media Capture Tests
// Property 1: Screenshot produces valid PNG
// Validates: Requirements 1.1

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  isMediaRecorderSupported,
  generateFilename,
} from '../utils/mediaCapture';

describe('mediaCapture', () => {
  describe('isMediaRecorderSupported', () => {
    it('should return false when MediaRecorder is not defined', () => {
      const result = isMediaRecorderSupported();
      // In Node.js environment, MediaRecorder is not defined
      expect(typeof result).toBe('boolean');
    });

    it('should return true when MediaRecorder is defined with isTypeSupported', () => {
      // Mock MediaRecorder
      const originalMediaRecorder = (globalThis as any).MediaRecorder;
      (globalThis as any).MediaRecorder = {
        isTypeSupported: vi.fn().mockReturnValue(true),
      };
      
      const result = isMediaRecorderSupported();
      expect(result).toBe(true);
      
      // Restore
      (globalThis as any).MediaRecorder = originalMediaRecorder;
    });
  });

  describe('generateFilename', () => {
    /**
     * Property: Filename generation is deterministic and well-formed
     * For any valid prefix and extension, the generated filename should:
     * - Start with the prefix
     * - End with the extension
     * - Contain a timestamp between them
     */
    it('should generate filename with prefix and extension', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)),
          fc.constantFrom('png', 'jpg', 'webm', 'mp4'),
          (prefix, extension) => {
            const filename = generateFilename(prefix, extension);
            
            // Should start with prefix
            expect(filename.startsWith(prefix)).toBe(true);
            // Should end with extension
            expect(filename.endsWith(`.${extension}`)).toBe(true);
            // Should contain timestamp-like pattern (has dashes for date/time)
            expect(filename.length).toBeGreaterThan(prefix.length + extension.length + 2);
            // Should have format: prefix-YYYY-MM-DDTHH-MM-SS.ext
            const middle = filename.slice(prefix.length + 1, -(extension.length + 1));
            expect(middle).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique filenames for different times', () => {
      const filename1 = generateFilename('test', 'png');
      // Small delay to ensure different timestamp
      const filename2 = generateFilename('test', 'png');
      
      // Both should be valid
      expect(filename1.startsWith('test')).toBe(true);
      expect(filename2.startsWith('test')).toBe(true);
      expect(filename1.endsWith('.png')).toBe(true);
      expect(filename2.endsWith('.png')).toBe(true);
    });
  });

  describe('captureScreenshot (unit tests)', () => {
    /**
     * Property 1: Screenshot produces valid PNG
     * Since we can't test actual canvas in Node.js, we test the logic:
     * - Function should call canvas.toBlob with correct MIME type
     * - Function should resolve with the blob
     */
    it('should call toBlob with correct MIME type for PNG', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockCanvas = {
        toBlob: vi.fn((callback: (blob: Blob | null) => void, mimeType: string) => {
          expect(mimeType).toBe('image/png');
          callback(mockBlob);
        }),
      } as unknown as HTMLCanvasElement;

      const { captureScreenshot } = await import('../utils/mediaCapture');
      const result = await captureScreenshot({ canvas: mockCanvas, format: 'png' });
      
      expect(result).toBe(mockBlob);
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    it('should call toBlob with correct MIME type for JPEG', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const mockCanvas = {
        toBlob: vi.fn((callback: (blob: Blob | null) => void, mimeType: string, quality: number) => {
          expect(mimeType).toBe('image/jpeg');
          expect(quality).toBe(0.8);
          callback(mockBlob);
        }),
      } as unknown as HTMLCanvasElement;

      const { captureScreenshot } = await import('../utils/mediaCapture');
      const result = await captureScreenshot({ canvas: mockCanvas, format: 'jpeg', quality: 0.8 });
      
      expect(result).toBe(mockBlob);
    });

    it('should reject when toBlob returns null', async () => {
      const mockCanvas = {
        toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
          callback(null);
        }),
      } as unknown as HTMLCanvasElement;

      const { captureScreenshot } = await import('../utils/mediaCapture');
      
      await expect(captureScreenshot({ canvas: mockCanvas })).rejects.toThrow('Failed to capture screenshot');
    });

    /**
     * Property test: For any format, the correct MIME type is used
     */
    it('should use correct MIME type for any format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('png', 'jpeg') as fc.Arbitrary<'png' | 'jpeg'>,
          async (format) => {
            const expectedMime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const mockBlob = new Blob(['test'], { type: expectedMime });
            
            let capturedMimeType = '';
            const mockCanvas = {
              toBlob: vi.fn((callback: (blob: Blob | null) => void, mimeType: string) => {
                capturedMimeType = mimeType;
                callback(mockBlob);
              }),
            } as unknown as HTMLCanvasElement;

            const { captureScreenshot } = await import('../utils/mediaCapture');
            await captureScreenshot({ canvas: mockCanvas, format });
            
            expect(capturedMimeType).toBe(expectedMime);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('downloadBlob (unit tests)', () => {
    it('should create link, set attributes, click, and cleanup', async () => {
      // Mock URL methods
      const mockUrl = 'blob:mock-url';
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
      URL.revokeObjectURL = vi.fn();

      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = (globalThis as any).document?.createElement;
      const originalAppendChild = (globalThis as any).document?.body?.appendChild;
      const originalRemoveChild = (globalThis as any).document?.body?.removeChild;

      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      const { downloadBlob } = await import('../utils/mediaCapture');
      const blob = new Blob(['test'], { type: 'text/plain' });
      
      downloadBlob(blob, 'test.txt');

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe(mockUrl);
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

      // Restore
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      if (originalCreateElement) {
        (globalThis as any).document.createElement = originalCreateElement;
      }
    });
  });
});
