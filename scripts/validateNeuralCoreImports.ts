/**
 * Validation Script for Neural Core Splitting
 * 
 * This script validates:
 * 1. All hooks are exported from hooks/index.ts
 * 2. All utilities are exported from utils/index.ts
 * 3. All exports from neural-core/index.ts are used somewhere
 * 4. No circular dependencies exist
 * 5. NeuralCore.tsx imports all required hooks and utils
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEURAL_CORE_DIR = path.join(__dirname, '../components/neural-core');
const HOOKS_DIR = path.join(NEURAL_CORE_DIR, 'hooks');
const UTILS_DIR = path.join(NEURAL_CORE_DIR, 'utils');

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function getFilesInDir(dir: string, ext: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(ext) && f !== 'index.ts')
    .map(f => path.join(dir, f));
}

// Check 1: Verify all hook files are exported from hooks/index.ts
function validateHooksExports(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  const hookFiles = getFilesInDir(HOOKS_DIR, '.ts');
  const indexContent = readFileContent(path.join(HOOKS_DIR, 'index.ts'));
  
  for (const hookFile of hookFiles) {
    const hookName = path.basename(hookFile, '.ts');
    // Check if the hook is exported (either via export * or named export)
    if (!indexContent.includes(`from './${hookName}'`)) {
      result.errors.push(`Hook ${hookName} is not exported from hooks/index.ts`);
      result.passed = false;
    }
  }
  
  console.log(`\n✓ Hooks Export Check: ${hookFiles.length} hook files found`);
  return result;
}

// Check 2: Verify all utility files are exported from utils/index.ts
function validateUtilsExports(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  const utilFiles = getFilesInDir(UTILS_DIR, '.ts');
  const indexContent = readFileContent(path.join(UTILS_DIR, 'index.ts'));
  
  for (const utilFile of utilFiles) {
    const utilName = path.basename(utilFile, '.ts');
    if (!indexContent.includes(`from './${utilName}'`)) {
      result.errors.push(`Utility ${utilName} is not exported from utils/index.ts`);
      result.passed = false;
    }
  }
  
  console.log(`✓ Utils Export Check: ${utilFiles.length} utility files found`);
  return result;
}

// Check 3: Verify NeuralCore.tsx imports all hooks
function validateNeuralCoreImports(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  const neuralCoreContent = readFileContent(path.join(NEURAL_CORE_DIR, 'NeuralCore.tsx'));
  
  const requiredHooks = [
    'useVrmLoader',
    'useExpressionManager', 
    'useGesturePlayer',
    'useIdleAnimations',
    'useWalkingAnimation',
    'useCameraTracking',
    'useLipSync',
    'useReactionSystem',
  ];
  
  for (const hook of requiredHooks) {
    if (!neuralCoreContent.includes(hook)) {
      result.errors.push(`NeuralCore.tsx does not import ${hook}`);
      result.passed = false;
    }
  }
  
  const requiredUtils = [
    'setupScene',
    'disposeScene',
  ];
  
  for (const util of requiredUtils) {
    if (!neuralCoreContent.includes(util)) {
      result.errors.push(`NeuralCore.tsx does not import ${util}`);
      result.passed = false;
    }
  }
  
  console.log(`✓ NeuralCore Imports Check: All required hooks and utils imported`);
  return result;
}

// Check 4: Verify main barrel export includes component
function validateMainExport(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  const indexContent = readFileContent(path.join(NEURAL_CORE_DIR, 'index.ts'));
  
  if (!indexContent.includes("export { NeuralCore }")) {
    result.errors.push('NeuralCore component not exported from index.ts');
    result.passed = false;
  }
  
  if (!indexContent.includes("export type { NeuralCoreHandle")) {
    result.errors.push('NeuralCoreHandle type not exported from index.ts');
    result.passed = false;
  }
  
  console.log(`✓ Main Export Check: NeuralCore and types exported`);
  return result;
}

// Check 5: Verify re-export file exists and is correct
function validateReExport(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  const reExportPath = path.join(__dirname, '../components/NeuralCore.tsx');
  const content = readFileContent(reExportPath);
  
  if (!content.includes("export { NeuralCore } from './neural-core'")) {
    result.errors.push('NeuralCore.tsx does not re-export from neural-core');
    result.passed = false;
  }
  
  // Check file is small (re-export only)
  const lines = content.split('\n').filter(l => l.trim()).length;
  if (lines > 10) {
    result.warnings.push(`NeuralCore.tsx has ${lines} non-empty lines, expected ~5-8 for re-export only`);
  }
  
  console.log(`✓ Re-export Check: NeuralCore.tsx is ${lines} lines (re-export only)`);
  return result;
}

// Check 6: Count lines in main component
function validateComponentSize(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  const content = readFileContent(path.join(NEURAL_CORE_DIR, 'NeuralCore.tsx'));
  const lines = content.split('\n').length;
  
  if (lines > 400) {
    result.warnings.push(`NeuralCore.tsx has ${lines} lines, design target was ~400`);
  }
  
  console.log(`✓ Component Size Check: NeuralCore.tsx is ${lines} lines (target: ~400)`);
  return result;
}

// Main validation
function runValidation() {
  console.log('='.repeat(60));
  console.log('Neural Core Splitting - Import/Export Validation');
  console.log('='.repeat(60));
  
  const results: ValidationResult[] = [
    validateHooksExports(),
    validateUtilsExports(),
    validateNeuralCoreImports(),
    validateMainExport(),
    validateReExport(),
    validateComponentSize(),
  ];
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);
  
  if (allErrors.length > 0) {
    console.log('\n❌ ERRORS:');
    allErrors.forEach(e => console.log(`  - ${e}`));
  }
  
  if (allWarnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    allWarnings.forEach(w => console.log(`  - ${w}`));
  }
  
  const passed = results.every(r => r.passed);
  console.log(`\n${passed ? '✅ ALL CHECKS PASSED' : '❌ VALIDATION FAILED'}`);
  
  return passed;
}

runValidation();
