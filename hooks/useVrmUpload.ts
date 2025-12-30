import { useState, useRef, useCallback } from 'react';
import { validateVrmFile, createVrmObjectUrl } from '../utils/vrmValidator';
import type { CustomVrmEntry } from '../types/enhancementTypes';

export interface UseVrmUploadReturn {
  customVrms: CustomVrmEntry[];
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleVrmUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  triggerFileInput: () => void;
  removeCustomVrm: (name: string) => void;
  clearUploadError: () => void;
}

export function useVrmUpload(): UseVrmUploadReturn {
  const [customVrms, setCustomVrms] = useState<CustomVrmEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVrmUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      // Validate the VRM file
      const validation = await validateVrmFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid VRM file');
        return;
      }

      // Create object URL for the VRM
      const objectUrl = createVrmObjectUrl(file);
      const customName = `custom:${file.name}`;

      // Store the object URL in window for NeuralCore to access
      if (!(window as any).__customVrmUrls) {
        (window as any).__customVrmUrls = {};
      }
      (window as any).__customVrmUrls[file.name] = objectUrl;

      // Add to custom VRMs list
      const newEntry: CustomVrmEntry = {
        name: customName,
        objectUrl,
        expressions: validation.metadata?.expressions || [],
        addedAt: Date.now(),
      };

      setCustomVrms((prev) => {
        // Remove existing entry with same name if exists
        const filtered = prev.filter((v) => v.name !== customName);
        return [...filtered, newEntry];
      });

      console.log('[VrmUpload] Custom VRM uploaded:', file.name);
    } catch (error) {
      console.error('[VrmUpload] Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeCustomVrm = useCallback((name: string) => {
    setCustomVrms((prev) => {
      const entry = prev.find((v) => v.name === name);
      if (entry?.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
        // Clean up window storage
        const fileName = name.replace('custom:', '');
        if ((window as any).__customVrmUrls) {
          delete (window as any).__customVrmUrls[fileName];
        }
      }
      return prev.filter((v) => v.name !== name);
    });
  }, []);

  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  return {
    customVrms,
    uploadError,
    fileInputRef,
    handleVrmUpload,
    triggerFileInput,
    removeCustomVrm,
    clearUploadError,
  };
}
