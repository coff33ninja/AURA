#!/usr/bin/env node
/**
 * VRM Config Generator
 * Generates behavior config files for all VRM models in public/VRM-Models/
 * 
 * Usage: node tools/generate-vrm-configs.mjs [options]
 * Options:
 *   --force    Overwrite existing config files
 *   --model=X  Only generate for specific model (without .vrm extension)
 *   --type=X   Only generate specific config type
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vrmDir = path.join(__dirname, '..', 'public', 'VRM-Models');
const sidecarsDir = path.join(vrmDir, 'sidecars');

// Config types to generate (excluding 'config' and 'expressions' which are handled by extract-all)
const CONFIG_TYPES = ['transform', 'body', 'hands', 'facial', 'gestures', 'idle', 'lipsync', 'reactions'];

// Default configs matching types/behaviorTypes.ts
const DEFAULTS = {
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: 180,
    scale: 1.0,
    cameraDistance: 2.0,
    cameraHeight: 1.3,
    cameraLookAtHeight: 1.2
  },
  body: {
    leftUpperArm: { x: 0, y: 0, z: 30 },
    rightUpperArm: { x: 0, y: 0, z: -30 },
    leftLowerArm: { x: 0, y: 0, z: 0 },
    rightLowerArm: { x: 0, y: 0, z: 0 },
    leftHand: { x: 0, y: 0, z: 0 },
    rightHand: { x: 0, y: 0, z: 0 },
    spine: { x: 0, y: 0, z: 0 },
    chest: { x: 0, y: 0, z: 0 },
    eyeTracking: { enabled: true, intensity: 0.7 }
  },
  hands: {
    leftThumbProximal: { x: 0, y: 0, z: 0 },
    leftThumbDistal: { x: 0, y: 0, z: 0 },
    leftIndexProximal: { x: 0, y: 0, z: 0 },
    leftIndexIntermediate: { x: 0, y: 0, z: 0 },
    leftIndexDistal: { x: 0, y: 0, z: 0 },
    leftMiddleProximal: { x: 0, y: 0, z: 0 },
    leftMiddleIntermediate: { x: 0, y: 0, z: 0 },
    leftMiddleDistal: { x: 0, y: 0, z: 0 },
    leftRingProximal: { x: 0, y: 0, z: 0 },
    leftRingIntermediate: { x: 0, y: 0, z: 0 },
    leftRingDistal: { x: 0, y: 0, z: 0 },
    leftLittleProximal: { x: 0, y: 0, z: 0 },
    leftLittleIntermediate: { x: 0, y: 0, z: 0 },
    leftLittleDistal: { x: 0, y: 0, z: 0 },
    rightThumbProximal: { x: 0, y: 0, z: 0 },
    rightThumbDistal: { x: 0, y: 0, z: 0 },
    rightIndexProximal: { x: 0, y: 0, z: 0 },
    rightIndexIntermediate: { x: 0, y: 0, z: 0 },
    rightIndexDistal: { x: 0, y: 0, z: 0 },
    rightMiddleProximal: { x: 0, y: 0, z: 0 },
    rightMiddleIntermediate: { x: 0, y: 0, z: 0 },
    rightMiddleDistal: { x: 0, y: 0, z: 0 },
    rightRingProximal: { x: 0, y: 0, z: 0 },
    rightRingIntermediate: { x: 0, y: 0, z: 0 },
    rightRingDistal: { x: 0, y: 0, z: 0 },
    rightLittleProximal: { x: 0, y: 0, z: 0 },
    rightLittleIntermediate: { x: 0, y: 0, z: 0 },
    rightLittleDistal: { x: 0, y: 0, z: 0 }
  },
  facial: {
    expressions: { joy: 0, angry: 0, sorrow: 0, fun: 0, surprised: 0 },
    mouth: { a: 0, i: 0, u: 0, e: 0, o: 0 },
    eyes: { blink: 0, lookUp: 0, lookDown: 0, lookLeft: 0, lookRight: 0 },
    customPresets: []
  },
  gestures: { gestures: [] },
  idle: {
    breathing: { enabled: true, speed: 0.8, intensity: 0.02 },
    blinking: { enabled: true, interval: 4.0, duration: 0.15 },
    sway: { enabled: true, amount: 0.1, speed: 0.6 },
    headMovement: { enabled: true, amount: 0.1 },
    preset: 'calm'
  },
  lipsync: {
    sensitivity: 4.0,
    smoothing: 0.3,
    visemeWeights: { a: 0.8, i: 0.3, u: 0.25, e: 0.3, o: 0.6 },
    preset: 'normal'
  },
  reactions: { reactions: [] }
};

// Parse command line args
const args = process.argv.slice(2);
const force = args.includes('--force');
const modelArg = args.find(a => a.startsWith('--model='));
const typeArg = args.find(a => a.startsWith('--type='));
const targetModel = modelArg ? modelArg.split('=')[1] : null;
const targetType = typeArg ? typeArg.split('=')[1] : null;

// Ensure sidecars directory exists
if (!fs.existsSync(sidecarsDir)) {
  fs.mkdirSync(sidecarsDir, { recursive: true });
}

// Find all VRM files
const vrmFiles = fs.readdirSync(vrmDir).filter(f => f.endsWith('.vrm'));
console.log(`Found ${vrmFiles.length} VRM models\n`);

let created = 0;
let skipped = 0;
let errors = 0;

for (const vrmFile of vrmFiles) {
  const modelName = vrmFile.replace('.vrm', '');
  
  // Skip if targeting specific model
  if (targetModel && modelName !== targetModel) continue;
  
  console.log(`Processing: ${modelName}`);
  
  const typesToGenerate = targetType ? [targetType] : CONFIG_TYPES;
  
  for (const type of typesToGenerate) {
    const configPath = path.join(sidecarsDir, `${modelName}.vrm.${type}.json`);
    
    // Check if file exists
    if (fs.existsSync(configPath) && !force) {
      console.log(`  ⏭ ${type} (exists)`);
      skipped++;
      continue;
    }
    
    try {
      // Try to load from default template first
      const defaultPath = path.join(sidecarsDir, `_default.vrm.${type}.json`);
      let config;
      
      if (fs.existsSync(defaultPath)) {
        config = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
      } else {
        config = DEFAULTS[type];
      }
      
      if (!config) {
        console.log(`  ✗ ${type} (no default found)`);
        errors++;
        continue;
      }
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`  ✓ ${type}`);
      created++;
    } catch (err) {
      console.log(`  ✗ ${type} (${err.message})`);
      errors++;
    }
  }
  console.log('');
}

console.log('─'.repeat(40));
console.log(`Done! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);

if (errors > 0) process.exit(1);
