/**
 * Invert Gesture Bone Rotations Script
 * 
 * This inverts all bone rotation values (x, y, z) in gesture configs
 * to fix coordinate system mismatches for VRM models.
 * 
 * Usage: node tools/invert-gestures.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sidecarsDir = path.join(__dirname, '..', 'public', 'VRM-Models', 'sidecars');

/**
 * Invert a bone rotation object
 */
function invertBoneRotation(bone) {
  return {
    x: -bone.x,
    y: -bone.y,
    z: -bone.z
  };
}

/**
 * Process a gesture file and invert all bone rotations
 */
function invertGestureFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);
    
    if (!config.gestures || !Array.isArray(config.gestures)) {
      console.log(`⏭ Skipping ${path.basename(filePath)} - no gestures array`);
      return false;
    }
    
    let modified = false;
    
    // Invert all bone rotations in all gestures
    for (const gesture of config.gestures) {
      if (gesture.bones && typeof gesture.bones === 'object') {
        for (const [boneName, rotation] of Object.entries(gesture.bones)) {
          if (rotation && typeof rotation === 'object' && 'x' in rotation) {
            gesture.bones[boneName] = invertBoneRotation(rotation);
            modified = true;
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔄 Inverting all gesture bone rotations...\n');

if (!fs.existsSync(sidecarsDir)) {
  console.error(`❌ Sidecars directory not found: ${sidecarsDir}`);
  process.exit(1);
}

// Find all gesture files
const files = fs.readdirSync(sidecarsDir)
  .filter(f => f.endsWith('.vrm.gestures.json'))
  .map(f => path.join(sidecarsDir, f));

console.log(`Found ${files.length} gesture files to process\n`);

let inverted = 0;
let skipped = 0;

for (const file of files) {
  const fileName = path.basename(file);
  const result = invertGestureFile(file);
  
  if (result) {
    console.log(`✅ Inverted: ${fileName}`);
    inverted++;
  } else {
    console.log(`⏭ Skipped: ${fileName}`);
    skipped++;
  }
}

console.log('\n' + '─'.repeat(50));
console.log(`Done! Inverted: ${inverted}, Skipped: ${skipped}`);
console.log('\n💡 Next steps:');
console.log('   1. Clear browser cache: window.clearAllBehaviorCaches()');
console.log('   2. Reload your app');
console.log('   3. Test gestures to verify they now work correctly');
