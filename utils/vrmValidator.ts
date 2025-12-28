// VRM File Validator - Validates and extracts metadata from VRM files

import type { VrmValidationResult } from '../types/enhancementTypes';

/**
 * VRM file magic bytes (glTF binary format)
 * VRM files are glTF 2.0 binary files with VRM extension
 */
const GLTF_MAGIC = 0x46546C67; // 'glTF' in little-endian

/**
 * Check if a file has the correct VRM/glTF magic bytes
 */
function hasGltfMagic(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  return view.getUint32(0, true) === GLTF_MAGIC;
}

/**
 * Parse glTF JSON chunk from binary glTF
 */
function parseGltfJson(buffer: ArrayBuffer): object | null {
  if (buffer.byteLength < 20) return null;
  
  const view = new DataView(buffer);
  
  // Check magic
  if (view.getUint32(0, true) !== GLTF_MAGIC) return null;
  
  // glTF version (should be 2)
  const version = view.getUint32(4, true);
  if (version !== 2) return null;
  
  // Total length
  const totalLength = view.getUint32(8, true);
  if (buffer.byteLength < totalLength) return null;
  
  // First chunk (JSON)
  const chunkLength = view.getUint32(12, true);
  const chunkType = view.getUint32(16, true);
  
  // JSON chunk type is 0x4E4F534A ('JSON' in little-endian)
  if (chunkType !== 0x4E4F534A) return null;
  
  // Extract JSON string
  const jsonBytes = new Uint8Array(buffer, 20, chunkLength);
  const jsonString = new TextDecoder().decode(jsonBytes);
  
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Extract VRM metadata from glTF JSON
 */
function extractVrmMetadata(gltf: any): { name: string; version: string; expressions: string[] } | null {
  // Check for VRM extension (VRM 0.x)
  const vrm0 = gltf.extensions?.VRM;
  if (vrm0) {
    const meta = vrm0.meta || {};
    const blendShapes = vrm0.blendShapeMaster?.blendShapeGroups || [];
    
    return {
      name: meta.title || meta.name || 'Unknown VRM',
      version: '0.x',
      expressions: blendShapes.map((bs: any) => bs.name || bs.presetName).filter(Boolean),
    };
  }
  
  // Check for VRMC_vrm extension (VRM 1.0)
  const vrm1 = gltf.extensions?.VRMC_vrm;
  if (vrm1) {
    const meta = vrm1.meta || {};
    const expressions = gltf.extensions?.VRMC_vrm_expressions?.preset || {};
    const customExpressions = gltf.extensions?.VRMC_vrm_expressions?.custom || {};
    
    return {
      name: meta.name || 'Unknown VRM',
      version: '1.0',
      expressions: [
        ...Object.keys(expressions),
        ...Object.keys(customExpressions),
      ],
    };
  }
  
  return null;
}

/**
 * Validate a VRM file from an ArrayBuffer
 */
export function validateVrmBuffer(buffer: ArrayBuffer): VrmValidationResult {
  // Check minimum size
  if (buffer.byteLength < 20) {
    return {
      valid: false,
      error: 'File is too small to be a valid VRM file',
    };
  }
  
  // Check glTF magic bytes
  if (!hasGltfMagic(buffer)) {
    return {
      valid: false,
      error: 'File is not a valid glTF binary format',
    };
  }
  
  // Parse glTF JSON
  const gltf = parseGltfJson(buffer);
  if (!gltf) {
    return {
      valid: false,
      error: 'Failed to parse glTF JSON data',
    };
  }
  
  // Extract VRM metadata
  const metadata = extractVrmMetadata(gltf);
  if (!metadata) {
    return {
      valid: false,
      error: 'File is a valid glTF but does not contain VRM extension data',
    };
  }
  
  return {
    valid: true,
    metadata,
  };
}

/**
 * Validate a VRM file from a File object
 */
export async function validateVrmFile(file: File): Promise<VrmValidationResult> {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.vrm')) {
    return {
      valid: false,
      error: 'File must have .vrm extension',
    };
  }
  
  // Check file size (max 100MB)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large (max 100MB)',
    };
  }
  
  // Read file as ArrayBuffer
  try {
    const buffer = await file.arrayBuffer();
    return validateVrmBuffer(buffer);
  } catch (e) {
    return {
      valid: false,
      error: `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract metadata from a VRM file without full validation
 * Useful for quick metadata extraction when file is already known to be valid
 */
export async function extractVrmFileMetadata(file: File): Promise<VrmValidationResult> {
  return validateVrmFile(file);
}

/**
 * Create an object URL for a VRM file
 * Remember to revoke the URL when done using URL.revokeObjectURL()
 */
export function createVrmObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Check if a filename looks like a VRM file
 */
export function isVrmFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.vrm');
}
