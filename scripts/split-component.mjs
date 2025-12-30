#!/usr/bin/env node
/**
 * Component Splitting Helper Script
 * 
 * Usage:
 *   node scripts/split-component.mjs analyze <file>
 *   node scripts/split-component.mjs analyze-deep <file>
 *   node scripts/split-component.mjs extract-function <source> <functionName> <destFile>
 *   node scripts/split-component.mjs extract-inner <source> <componentName> <innerFuncName> <destFile>
 *   node scripts/split-component.mjs extract-hook <source> <componentName> <hookName> <destFile>
 *   node scripts/split-component.mjs create-barrel <directory>
 * 
 * Examples:
 *   node scripts/split-component.mjs analyze components/BehaviorEditor.tsx
 *   node scripts/split-component.mjs analyze-deep components/NeuralCore.tsx
 *   node scripts/split-component.mjs extract-function components/BehaviorEditor.tsx Slider components/behavior-editor/shared/Slider.tsx
 *   node scripts/split-component.mjs extract-inner components/NeuralCore.tsx NeuralCore resolveExpressionAlias components/neural-core/utils/expressionUtils.ts
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

/**
 * Analyze a file and list all functions/components
 */
function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  log(`\n📊 Analyzing: ${filePath}`, 'cyan');
  log(`   Total lines: ${lines.length}`, 'gray');
  
  // Find function declarations
  const functions = [];
  const functionRegex = /^(export\s+)?(async\s+)?function\s+(\w+)/;
  const constFunctionRegex = /^(export\s+)?const\s+(\w+)\s*[=:]\s*(React\.)?FC|forwardRef|useCallback|useState/;
  const arrowFunctionRegex = /^(export\s+)?const\s+(\w+)\s*=\s*(\([^)]*\)|[^=])*=>/;
  
  let currentFunction = null;
  let braceCount = 0;
  let functionStart = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check for function start
    let match = line.match(functionRegex);
    if (match) {
      if (currentFunction) {
        functions.push({ ...currentFunction, endLine: i, lines: i - currentFunction.startLine });
      }
      currentFunction = { name: match[3], startLine: lineNum, exported: !!match[1] };
      braceCount = 0;
    }
    
    // Check for const component/hook
    if (!currentFunction) {
      match = line.match(/^(export\s+)?const\s+(\w+)\s*[:=]/);
      if (match && (line.includes('function') || line.includes('=>') || line.includes('forwardRef'))) {
        currentFunction = { name: match[2], startLine: lineNum, exported: !!match[1] };
        braceCount = 0;
      }
    }
    
    // Count braces to find function end
    if (currentFunction) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0 && line.includes('}')) {
        functions.push({ ...currentFunction, endLine: lineNum, lines: lineNum - currentFunction.startLine + 1 });
        currentFunction = null;
      }
    }
  }
  
  // Sort by size
  functions.sort((a, b) => b.lines - a.lines);
  
  log(`\n📦 Functions/Components found: ${functions.length}`, 'green');
  log('─'.repeat(60), 'gray');
  
  for (const fn of functions) {
    const exported = fn.exported ? '✓' : ' ';
    const sizeColor = fn.lines > 200 ? 'red' : fn.lines > 100 ? 'yellow' : 'green';
    log(`  ${exported} ${fn.name.padEnd(30)} ${String(fn.lines).padStart(4)} lines  (${fn.startLine}-${fn.endLine})`, sizeColor);
  }
  
  log('─'.repeat(60), 'gray');
  log(`Legend: ✓ = exported, ${colors.red}red${colors.reset} = >200 lines, ${colors.yellow}yellow${colors.reset} = >100 lines`, 'gray');
  
  // Suggest splits
  const largeFunctions = functions.filter(f => f.lines > 150);
  if (largeFunctions.length > 0) {
    log(`\n⚠️  Suggested splits (>150 lines):`, 'yellow');
    for (const fn of largeFunctions) {
      log(`   - ${fn.name} (${fn.lines} lines)`, 'yellow');
    }
  }
  
  return functions;
}

/**
 * Extract a function from source file to destination
 */
function extractFunction(sourcePath, functionName, destPath) {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find the function
  let startLine = -1;
  let endLine = -1;
  let braceCount = 0;
  let inFunction = false;
  let wasExported = false;
  
  const functionStartRegex = new RegExp(`^(export\\s+)?(async\\s+)?function\\s+${functionName}\\b|^(export\\s+)?const\\s+${functionName}\\s*[:=]`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inFunction && functionStartRegex.test(line)) {
      startLine = i;
      inFunction = true;
      braceCount = 0;
      wasExported = line.trimStart().startsWith('export');
    }
    
    if (inFunction) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0 && line.includes('}')) {
        endLine = i;
        break;
      }
    }
  }
  
  if (startLine === -1) {
    log(`Function not found: ${functionName}`, 'red');
    process.exit(1);
  }
  
  // Extract the function code
  let functionCode = lines.slice(startLine, endLine + 1).join('\n');
  
  // Add export if not already exported
  if (!wasExported) {
    functionCode = 'export ' + functionCode;
  }
  
  // Get ONLY import statements from source file (stop at first non-import)
  const imports = [];
  let inImport = false;
  let currentImport = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip comments and empty lines at start
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }
    
    // Check if this is start of import
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      inImport = true;
      currentImport = line;
      
      // Check if import ends on same line (has 'from' and ends with ; or quote)
      if (line.includes(' from ') && (line.endsWith(';') || line.endsWith("';") || line.endsWith('";'))) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (inImport) {
      // Continue multi-line import
      currentImport += '\n' + line;
      
      // Check if import ends (line has 'from' with quotes, or ends with semicolon after quote)
      if ((line.includes("from '") || line.includes('from "')) && line.includes(';')) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (trimmed.startsWith('interface ') || trimmed.startsWith('type ') || trimmed.startsWith('const ') || trimmed.startsWith('function ') || trimmed.startsWith('export ')) {
      // We've hit actual code, stop collecting imports
      break;
    }
  }
  
  // Create destination directory if needed
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    log(`Created directory: ${destDir}`, 'green');
  }
  
  // Adjust import paths - convert relative imports to correct depth for tabs folder
  const adjustedImports = imports.map(imp => {
    return imp
      .replace(/from\s+['"]\.\.\/types\//g, "from '../../../types/")
      .replace(/from\s+['"]\.\.\/utils\//g, "from '../../../utils/")
      .replace(/from\s+['"]\.\.\/services\//g, "from '../../../services/")
      .replace(/from\s+['"]\.\/WalkingEditor['"]/g, "from '../../WalkingEditor'");
  });
  
  // Add React import if not present and function uses JSX
  const hasReactImport = adjustedImports.some(imp => imp.includes("from 'react'") || imp.includes('from "react"'));
  const needsReact = functionCode.includes('<') && functionCode.includes('/>');
  
  let reactImport = '';
  if (needsReact && !hasReactImport) {
    reactImport = "import React, { useState, useCallback } from 'react';\n";
  }
  
  // Build the new file content
  const newContent = `// Extracted from ${sourcePath}
// TODO: Remove unused imports after verification

${reactImport}${adjustedImports.join('\n')}
import { Slider, Toggle, SectionHeader } from '../shared';

${functionCode}
`;
  
  fs.writeFileSync(destPath, newContent);
  log(`\n✅ Extracted ${functionName} to ${destPath}`, 'green');
  log(`   Lines: ${endLine - startLine + 1}`, 'gray');
  log(`   Source lines: ${startLine + 1}-${endLine + 1}`, 'gray');
  log(`   Export added: ${!wasExported}`, 'gray');
  log(`   Imports found: ${imports.length}`, 'gray');
  log(`\n⚠️  Next steps:`, 'yellow');
  log(`   1. Remove unused imports from ${destPath}`, 'gray');
  log(`   2. Update imports in ${sourcePath}`, 'gray');
  log(`   3. Remove original function from ${sourcePath}`, 'gray');
}

/**
 * Create a barrel export file for a directory
 */
function createBarrel(directory) {
  if (!fs.existsSync(directory)) {
    log(`Directory not found: ${directory}`, 'red');
    process.exit(1);
  }
  
  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
    .filter(f => f !== 'index.ts' && f !== 'index.tsx');
  
  const exports = files.map(f => {
    const name = f.replace(/\.(tsx?|ts)$/, '');
    return `export * from './${name}';`;
  });
  
  const barrelContent = `// Auto-generated barrel export
${exports.join('\n')}
`;
  
  const barrelPath = path.join(directory, 'index.ts');
  fs.writeFileSync(barrelPath, barrelContent);
  log(`\n✅ Created barrel export: ${barrelPath}`, 'green');
  log(`   Exports: ${files.length} files`, 'gray');
}

/**
 * Extract a range of lines from a file to a new file
 */
function extractLines(sourcePath, startLine, endLine, destPath, functionName = 'extracted') {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  
  // Validate line numbers
  const start = parseInt(startLine) - 1; // Convert to 0-indexed
  const end = parseInt(endLine) - 1;
  
  if (start < 0 || end >= lines.length || start > end) {
    log(`Invalid line range: ${startLine}-${endLine} (file has ${lines.length} lines)`, 'red');
    process.exit(1);
  }
  
  // Extract the code
  const extractedCode = lines.slice(start, end + 1).join('\n');
  
  // Get imports from source file
  const imports = [];
  let inImport = false;
  let currentImport = '';
  
  for (let i = 0; i < start; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }
    
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      inImport = true;
      currentImport = line;
      
      if (line.includes(' from ') && (line.endsWith(';') || line.endsWith("';") || line.endsWith('";'))) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (inImport) {
      currentImport += '\n' + line;
      
      if ((line.includes("from '") || line.includes('from "')) && line.includes(';')) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (trimmed.startsWith('interface ') || trimmed.startsWith('type ') || trimmed.startsWith('const ') || trimmed.startsWith('function ') || trimmed.startsWith('export ')) {
      break;
    }
  }
  
  // Create destination directory
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    log(`Created directory: ${destDir}`, 'green');
  }
  
  // Calculate relative path depth for import adjustments
  const sourceDir = path.dirname(sourcePath);
  const destDirRel = path.dirname(destPath);
  const depthDiff = destDirRel.split('/').length - sourceDir.split('/').length;
  const prefix = '../'.repeat(Math.max(0, depthDiff + 1));
  
  // Adjust import paths
  const adjustedImports = imports.map(imp => {
    return imp
      .replace(/from\s+['"]\.\.\//g, `from '${prefix}`)
      .replace(/from\s+['"]\.\//g, `from '${prefix}`)
      .replace(/from\s+['"]\.\.\/types\//g, `from '${prefix}types/`)
      .replace(/from\s+['"]\.\.\/utils\//g, `from '${prefix}utils/`)
      .replace(/from\s+['"]\.\.\/services\//g, `from '${prefix}services/`);
  });
  
  // Build the new file content
  const newContent = `// Extracted from ${sourcePath} lines ${startLine}-${endLine}
// Function: ${functionName}
// TODO: Clean up imports and convert to proper module

${adjustedImports.join('\n')}

export ${extractedCode}
`;
  
  fs.writeFileSync(destPath, newContent);
  log(`\n✅ Extracted lines ${startLine}-${endLine} to ${destPath}`, 'green');
  log(`   Lines: ${end - start + 1}`, 'gray');
  log(`   Imports found: ${imports.length}`, 'gray');
}

/**
 * Deep analyze - find ALL functions including inner functions inside components
 */
function analyzeDeep(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  log(`\n📊 Deep Analyzing: ${filePath}`, 'cyan');
  log(`   Total lines: ${lines.length}`, 'gray');
  
  const functions = [];
  
  // Patterns to match various function declarations
  const patterns = [
    // const funcName = useCallback(
    /^\s*const\s+(\w+)\s*=\s*useCallback\s*\(/,
    // const funcName = useMemo(
    /^\s*const\s+(\w+)\s*=\s*useMemo\s*\(/,
    // const funcName = () => {
    /^\s*const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{/,
    // const funcName = async () => {
    /^\s*const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/,
    // function funcName(
    /^\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\(/,
    // const funcName: Type = (
    /^\s*const\s+(\w+)\s*:\s*\w+\s*=\s*\(/,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Get function name (last capture group that's not undefined)
        const name = match.filter(m => m && !m.includes('export') && !m.includes('async') && !m.includes('const')).pop() || match[1];
        if (!name || name.includes('(') || name.includes(')')) continue;
        
        // Find function end by counting braces
        let braceCount = 0;
        let started = false;
        let endLine = i;
        
        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          for (const char of l) {
            if (char === '{') { braceCount++; started = true; }
            if (char === '}') braceCount--;
          }
          if (started && braceCount === 0) {
            endLine = j;
            break;
          }
        }
        
        const lineCount = endLine - i + 1;
        const isHook = line.includes('useCallback') || line.includes('useMemo') || line.includes('useEffect') || line.includes('useRef');
        const isExported = line.trimStart().startsWith('export');
        
        functions.push({
          name,
          startLine: i + 1,
          endLine: endLine + 1,
          lines: lineCount,
          isHook,
          isExported,
          type: isHook ? 'hook' : (line.includes('=>') ? 'arrow' : 'function'),
        });
        break;
      }
    }
  }
  
  // Also find useEffect hooks (anonymous)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('useEffect') && line.includes('(') && !functions.some(f => f.startLine === i + 1)) {
      let braceCount = 0;
      let started = false;
      let endLine = i;
      
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        for (const char of l) {
          if (char === '{') { braceCount++; started = true; }
          if (char === '}') braceCount--;
        }
        if (started && braceCount === 0) {
          endLine = j;
          break;
        }
      }
      
      // Try to find deps array to name the effect
      const depsMatch = lines.slice(i, endLine + 1).join('\n').match(/\},\s*\[([^\]]*)\]/);
      const deps = depsMatch ? depsMatch[1].trim() : '';
      const name = `useEffect[${deps || 'empty'}]`;
      
      functions.push({
        name,
        startLine: i + 1,
        endLine: endLine + 1,
        lines: endLine - i + 1,
        isHook: true,
        isExported: false,
        type: 'effect',
      });
    }
  }
  
  // Sort by line number
  functions.sort((a, b) => a.startLine - b.startLine);
  
  log(`\n📦 All Functions/Hooks found: ${functions.length}`, 'green');
  log('─'.repeat(70), 'gray');
  
  for (const fn of functions) {
    const typeIcon = fn.type === 'effect' ? '⚡' : fn.isHook ? '🪝' : fn.isExported ? '✓' : ' ';
    const sizeColor = fn.lines > 100 ? 'red' : fn.lines > 50 ? 'yellow' : 'green';
    log(`  ${typeIcon} ${fn.name.padEnd(35)} ${String(fn.lines).padStart(4)} lines  (L${fn.startLine}-${fn.endLine})`, sizeColor);
  }
  
  log('─'.repeat(70), 'gray');
  log(`Legend: ✓=exported, 🪝=hook/callback, ⚡=useEffect`, 'gray');
  
  // Group by size for suggestions
  const large = functions.filter(f => f.lines > 50 && f.type !== 'effect');
  if (large.length > 0) {
    log(`\n⚠️  Large functions (>50 lines) - candidates for extraction:`, 'yellow');
    for (const fn of large.sort((a, b) => b.lines - a.lines)) {
      log(`   - ${fn.name} (${fn.lines} lines, L${fn.startLine})`, 'yellow');
    }
  }
  
  return functions;
}

/**
 * Extract an inner function from inside a component
 */
function extractInner(sourcePath, componentName, innerFuncName, destPath) {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  
  // First find the component
  let componentStart = -1;
  let componentEnd = -1;
  let braceCount = 0;
  let inComponent = false;
  
  const componentRegex = new RegExp(`(export\\s+)?(const\\s+${componentName}\\s*=|function\\s+${componentName}\\s*\\()`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inComponent && componentRegex.test(line)) {
      componentStart = i;
      inComponent = true;
      braceCount = 0;
    }
    
    if (inComponent) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0 && line.includes('}') && i > componentStart) {
        componentEnd = i;
        break;
      }
    }
  }
  
  if (componentStart === -1) {
    log(`Component not found: ${componentName}`, 'red');
    process.exit(1);
  }
  
  // Now find the inner function within the component
  let funcStart = -1;
  let funcEnd = -1;
  braceCount = 0;
  let inFunc = false;
  
  const funcPatterns = [
    new RegExp(`^\\s*const\\s+${innerFuncName}\\s*=\\s*useCallback\\s*\\(`),
    new RegExp(`^\\s*const\\s+${innerFuncName}\\s*=\\s*useMemo\\s*\\(`),
    new RegExp(`^\\s*const\\s+${innerFuncName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
    new RegExp(`^\\s*const\\s+${innerFuncName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
    new RegExp(`^\\s*const\\s+${innerFuncName}\\s*=\\s*\\(`),
    new RegExp(`^\\s*function\\s+${innerFuncName}\\s*\\(`),
  ];
  
  for (let i = componentStart; i <= componentEnd; i++) {
    const line = lines[i];
    
    if (!inFunc) {
      for (const pattern of funcPatterns) {
        if (pattern.test(line)) {
          funcStart = i;
          inFunc = true;
          braceCount = 0;
          break;
        }
      }
    }
    
    if (inFunc) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      // For useCallback/useMemo, we need to find the closing ) after the deps array
      if (braceCount === 0 && (line.includes(');') || (line.includes('}') && i > funcStart))) {
        funcEnd = i;
        break;
      }
    }
  }
  
  if (funcStart === -1) {
    log(`Inner function not found: ${innerFuncName} in ${componentName}`, 'red');
    process.exit(1);
  }
  
  // Extract the function code
  let functionCode = lines.slice(funcStart, funcEnd + 1).join('\n');
  
  // Get imports from source file
  const imports = [];
  let inImport = false;
  let currentImport = '';
  
  for (let i = 0; i < componentStart; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }
    
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      inImport = true;
      currentImport = line;
      
      if (line.includes(' from ') && (line.endsWith(';') || line.endsWith("';") || line.endsWith('";'))) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (inImport) {
      currentImport += '\n' + line;
      
      if ((line.includes("from '") || line.includes('from "')) && line.includes(';')) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (trimmed.startsWith('interface ') || trimmed.startsWith('type ') || trimmed.startsWith('const ') || trimmed.startsWith('function ') || trimmed.startsWith('export ')) {
      break;
    }
  }
  
  // Create destination directory
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    log(`Created directory: ${destDir}`, 'green');
  }
  
  // Calculate relative path depth for import adjustments
  const sourceDir = path.dirname(sourcePath);
  const destDirRel = path.dirname(destPath);
  const depthDiff = destDirRel.split('/').length - sourceDir.split('/').length;
  const prefix = '../'.repeat(Math.max(0, depthDiff + 1));
  
  // Adjust import paths
  const adjustedImports = imports.map(imp => {
    return imp
      .replace(/from\s+['"]\.\.\//g, `from '${prefix}`)
      .replace(/from\s+['"]\.\//g, `from '${prefix}`)
      .replace(/from\s+['"]\.\.\/types\//g, `from '${prefix}types/`)
      .replace(/from\s+['"]\.\.\/utils\//g, `from '${prefix}utils/`)
      .replace(/from\s+['"]\.\.\/services\//g, `from '${prefix}services/`);
  });
  
  // Build the new file content
  const newContent = `// Extracted from ${sourcePath} - ${componentName}.${innerFuncName}
// TODO: Remove unused imports and convert to proper hook/utility

${adjustedImports.join('\n')}

${functionCode}
`;
  
  fs.writeFileSync(destPath, newContent);
  log(`\n✅ Extracted ${innerFuncName} from ${componentName} to ${destPath}`, 'green');
  log(`   Lines: ${funcEnd - funcStart + 1}`, 'gray');
  log(`   Source lines: ${funcStart + 1}-${funcEnd + 1}`, 'gray');
  log(`\n⚠️  Next steps:`, 'yellow');
  log(`   1. Convert to proper hook/utility function`, 'gray');
  log(`   2. Remove unused imports`, 'gray');
  log(`   3. Add proper TypeScript types`, 'gray');
  log(`   4. Update ${sourcePath} to import from new location`, 'gray');
}

/**
 * Extract a group of related functions and generate a custom hook
 * Usage: extract-group <source> <componentName> <hookName> <destFile> <func1,func2,func3>
 */
function extractGroup(sourcePath, componentName, hookName, destPath, functionNames) {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  const funcList = functionNames.split(',').map(f => f.trim());
  
  log(`\n📦 Extracting ${funcList.length} functions into ${hookName}`, 'cyan');
  
  // Find the component boundaries
  let componentStart = -1;
  let componentEnd = -1;
  let braceCount = 0;
  let inComponent = false;
  
  const componentRegex = new RegExp(`(export\\s+)?(const\\s+${componentName}\\s*=|function\\s+${componentName}\\s*\\()`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inComponent && componentRegex.test(line)) {
      componentStart = i;
      inComponent = true;
      braceCount = 0;
    }
    if (inComponent) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      if (braceCount === 0 && line.includes('}') && i > componentStart) {
        componentEnd = i;
        break;
      }
    }
  }
  
  if (componentStart === -1) {
    log(`Component not found: ${componentName}`, 'red');
    process.exit(1);
  }
  
  log(`   Component ${componentName} found at lines ${componentStart + 1}-${componentEnd + 1}`, 'gray');
  
  // Extract each function
  const extractedFunctions = [];
  const refsUsed = new Set();
  const statesUsed = new Set();
  
  for (const funcName of funcList) {
    let funcStart = -1;
    let funcEnd = -1;
    braceCount = 0;
    let inFunc = false;
    
    const funcPatterns = [
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*useCallback\\s*\\(`),
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*useMemo\\s*\\(`),
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
      new RegExp(`^\\s*const\\s+${funcName}\\s*=\\s*\\(`),
      new RegExp(`^\\s*function\\s+${funcName}\\s*\\(`),
    ];
    
    for (let i = componentStart; i <= componentEnd; i++) {
      const line = lines[i];
      if (!inFunc) {
        for (const pattern of funcPatterns) {
          if (pattern.test(line)) {
            funcStart = i;
            inFunc = true;
            braceCount = 0;
            break;
          }
        }
      }
      if (inFunc) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        if (braceCount === 0 && (line.includes(');') || (line.includes('}') && i > funcStart))) {
          funcEnd = i;
          break;
        }
      }
    }
    
    if (funcStart === -1) {
      log(`  ⚠️  Function not found: ${funcName}`, 'yellow');
      continue;
    }
    
    const funcCode = lines.slice(funcStart, funcEnd + 1).join('\n');
    extractedFunctions.push({ name: funcName, code: funcCode, start: funcStart + 1, end: funcEnd + 1 });
    log(`  ✓ Found ${funcName} (L${funcStart + 1}-${funcEnd + 1})`, 'green');
    
    // Detect refs used (pattern: xxxRef.current or xxx.current where xxx is a ref)
    const refMatches = funcCode.match(/(\w+Ref)\.current/g) || [];
    refMatches.forEach(m => refsUsed.add(m.replace('.current', '')));
    
    // Also detect refs without 'Ref' suffix that use .current (like expressionTargets.current)
    const otherRefMatches = funcCode.match(/(\w+)\.current/g) || [];
    otherRefMatches.forEach(m => {
      const refName = m.replace('.current', '');
      // Skip if it's already added or if it's a common non-ref pattern
      if (!refName.endsWith('Ref') && !['this', 'window', 'document'].includes(refName)) {
        refsUsed.add(refName);
      }
    });
    
    // Detect state setters used (pattern: setXxx()
    const stateMatches = funcCode.match(/\bset[A-Z]\w+\s*\(/g) || [];
    stateMatches.forEach(m => statesUsed.add(m.replace(/\s*\($/, '')));
  }
  
  if (extractedFunctions.length === 0) {
    log(`No functions found to extract`, 'red');
    process.exit(1);
  }
  
  // Get imports from source file
  const imports = [];
  let inImport = false;
  let currentImport = '';
  
  log(`   Scanning lines 0-${componentStart} for imports...`, 'gray');
  
  for (let i = 0; i < componentStart; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }
    
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      inImport = true;
      currentImport = line;
      // Check if import ends on same line - use trimmed to handle line endings
      if ((trimmed.includes(' from ') || trimmed.includes("from '") || trimmed.includes('from "')) && 
          (trimmed.endsWith(';') || trimmed.endsWith("';"))) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    } else if (inImport) {
      currentImport += '\n' + line;
      // Check if this line ends the import - use trimmed
      if ((trimmed.includes("from '") || trimmed.includes('from "')) && 
          (trimmed.endsWith(';') || trimmed.endsWith("';"))) {
        imports.push(currentImport);
        inImport = false;
        currentImport = '';
      }
    }
    // Don't break early - collect ALL imports before the component
  }
  
  log(`   Collected ${imports.length} imports from source`, 'gray');
  
  // Create destination directory
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    log(`Created directory: ${destDir}`, 'green');
  }
  
  // Calculate relative path depth for import adjustments
  const depthDiff = destPath.split('/').length - sourcePath.split('/').length;
  const prefix = '../'.repeat(Math.max(0, depthDiff + 1));
  
  // Combine all extracted code for import analysis
  const allExtractedCode = extractedFunctions.map(f => f.code).join('\n');
  
  // Detect types used in the code that need to be imported
  // Look for type annotations and generic parameters
  const typePatterns = [
    /:\s*Partial<(\w+)>/g,                    // Partial<Type>
    /:\s*([A-Z]\w*)\s*(?:;|\)|,|\[|\{|$)/gm,  // Type annotations starting with capital letter
    /<([A-Z]\w*)>/g,                          // Generic types like <VRM>
    /as\s+([A-Z]\w*)/g,                       // Type assertions like as VRMHumanBoneName
  ];
  
  const detectedTypes = new Set();
  for (const pattern of typePatterns) {
    let match;
    const codeCopy = allExtractedCode; // Reset for each pattern
    pattern.lastIndex = 0; // Reset regex
    while ((match = pattern.exec(codeCopy)) !== null) {
      const typeName = match[1];
      // Skip primitive types, built-ins, and common non-types
      const skipList = ['string', 'number', 'boolean', 'any', 'void', 'null', 'undefined', 'object', 
                        'never', 'unknown', 'Record', 'Partial', 'Array', 'Promise', 'Map', 'Set', 
                        'RefObject', 'React', 'Object', 'String', 'Number', 'Boolean', 'Function',
                        'Error', 'Date', 'Math', 'JSON', 'console'];
      if (typeName && !skipList.includes(typeName)) {
        detectedTypes.add(typeName);
      }
    }
  }
  
  if (detectedTypes.size > 0) {
    log(`   Types detected: ${Array.from(detectedTypes).join(', ')}`, 'gray');
  }
  
  // Filter imports to only include those actually used in extracted code
  // Exclude type-only imports since we handle those separately
  const filteredImports = imports.filter(imp => {
    // Skip type-only imports - we handle these separately
    if (imp.trim().startsWith('import type ')) {
      return false;
    }
    
    // Extract imported names from the import statement
    const namedImportMatch = imp.match(/import\s*(?:type\s*)?\{([^}]+)\}/);
    const defaultImportMatch = imp.match(/import\s+(\w+)\s+from/);
    const namespaceImportMatch = imp.match(/import\s+\*\s+as\s+(\w+)/);
    
    if (namedImportMatch) {
      // Check if any of the named imports are used
      const names = namedImportMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim());
      return names.some(name => {
        const regex = new RegExp(`\\b${name}\\b`);
        return regex.test(allExtractedCode);
      });
    }
    
    if (defaultImportMatch) {
      const name = defaultImportMatch[1];
      const regex = new RegExp(`\\b${name}\\b`);
      return regex.test(allExtractedCode);
    }
    
    if (namespaceImportMatch) {
      const name = namespaceImportMatch[1];
      const regex = new RegExp(`\\b${name}\\b`);
      return regex.test(allExtractedCode);
    }
    
    // Keep imports we can't parse
    return true;
  });
  
  // Adjust import paths
  const adjustedImports = filteredImports.map(imp => {
    return imp
      .replace(/from\s+['"]\.\.\//g, `from '${prefix}`)
      .replace(/from\s+['"]\.\//g, `from '${prefix}`)
      .replace(/from\s+['"]\.\.\/types\//g, `from '${prefix}types/`)
      .replace(/from\s+['"]\.\.\/utils\//g, `from '${prefix}utils/`)
      .replace(/from\s+['"]\.\.\/services\//g, `from '${prefix}services/`);
  });
  
  // Generate the hook interface
  const refsArray = Array.from(refsUsed);
  const statesArray = Array.from(statesUsed);
  const funcNames = extractedFunctions.map(f => f.name);
  const typesArray = Array.from(detectedTypes);
  
  // Generate type imports if needed
  let typeImports = '';
  if (typesArray.length > 0) {
    log(`   Looking for imports for types: ${typesArray.join(', ')}`, 'gray');
    log(`   Available imports: ${imports.length}`, 'gray');
    // Try to find where these types come from in the original imports
    const typeImportLines = [];
    for (const typeName of typesArray) {
      // Check if any import contains this type
      let found = false;
      for (const imp of imports) {
        // Check if this import includes the type name (case-sensitive word match)
        const typeRegex = new RegExp(`\\b${typeName}\\b`);
        if (typeRegex.test(imp)) {
          // Extract the 'from' path
          const fromMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            let importPath = fromMatch[1];
            // Adjust the path based on destination depth
            if (importPath.startsWith('../')) {
              importPath = importPath.replace(/^\.\.\//, prefix);
            } else if (importPath.startsWith('./')) {
              importPath = importPath.replace(/^\.\//, prefix);
            }
            typeImportLines.push(`import type { ${typeName} } from '${importPath}';`);
            found = true;
            log(`   ✓ Found import for ${typeName}: ${importPath}`, 'green');
            break; // Found the import, move to next type
          }
        }
      }
      if (!found) {
        log(`   ⚠️  Could not find import for type: ${typeName}`, 'yellow');
      }
    }
    // Dedupe and join
    typeImports = [...new Set(typeImportLines)].join('\n');
    if (typeImports) {
      log(`   Generated type imports: ${typeImportLines.length}`, 'gray');
    }
  }
  
  // Build the hook file content
  const hookContent = `// Extracted from ${sourcePath} - ${hookName}
// Functions: ${funcNames.join(', ')}
// 
// TODO: 
// 1. Review and fix TypeScript types
// 2. Wire up refs from parent component

import type { RefObject } from 'react';
${typeImports}
${adjustedImports.join('\n')}

// Refs this hook needs from parent component:
// ${refsArray.length > 0 ? refsArray.join(', ') : 'none detected'}

interface ${hookName.charAt(0).toUpperCase() + hookName.slice(1)}Refs {
${refsArray.map(r => `  ${r}: RefObject<any>;`).join('\n')}
}

export function ${hookName}(refs: ${hookName.charAt(0).toUpperCase() + hookName.slice(1)}Refs) {
  // Destructure refs for easier access
${refsArray.map(r => `  const ${r} = refs.${r};`).join('\n')}

${extractedFunctions.map(f => f.code).join('\n\n')}

  return {
${funcNames.map(n => `    ${n},`).join('\n')}
  };
}
`;
  
  fs.writeFileSync(destPath, hookContent);
  log(`\n✅ Created ${hookName} at ${destPath}`, 'green');
  log(`   Functions: ${funcNames.length}`, 'gray');
  log(`   Refs detected: ${refsArray.join(', ') || 'none'}`, 'gray');
  log(`   State setters: ${statesArray.join(', ') || 'none'}`, 'gray');
  log(`\n⚠️  Next steps:`, 'yellow');
  log(`   1. Clean up imports in ${destPath}`, 'gray');
  log(`   2. Fix TypeScript types for refs`, 'gray');
  log(`   3. Update ${sourcePath} to use the new hook`, 'gray');
  log(`   4. Remove extracted functions from ${sourcePath}`, 'gray');
}

/**
 * Show help
 */
function showHelp() {
  log(`
${colors.cyan}Component Splitting Helper${colors.reset}

${colors.bright}Commands:${colors.reset}
  analyze <file>
    Analyze a file and list top-level functions/components
    
  analyze-deep <file>
    Deep analyze - find ALL functions including inner functions, hooks, effects
    
  extract-function <source> <functionName> <destFile>
    Extract a top-level function from source file to destination
    
  extract-inner <source> <componentName> <innerFuncName> <destFile>
    Extract an inner function from inside a component
    
  extract-group <source> <componentName> <hookName> <destFile> <func1,func2,...>
    Extract multiple functions and generate a custom hook
    
  create-barrel <directory>
    Create an index.ts barrel export for all files in directory

${colors.bright}Examples:${colors.reset}
  ${colors.gray}# Analyze BehaviorEditor${colors.reset}
  node scripts/split-component.mjs analyze components/BehaviorEditor.tsx
  
  ${colors.gray}# Deep analyze NeuralCore to see all inner functions${colors.reset}
  node scripts/split-component.mjs analyze-deep components/NeuralCore.tsx
  
  ${colors.gray}# Extract top-level Slider component${colors.reset}
  node scripts/split-component.mjs extract-function components/BehaviorEditor.tsx Slider components/behavior-editor/shared/Slider.tsx
  
  ${colors.gray}# Extract inner function from NeuralCore${colors.reset}
  node scripts/split-component.mjs extract-inner components/NeuralCore.tsx NeuralCore resolveExpressionAlias components/neural-core/utils/expressionUtils.ts
  
  ${colors.gray}# Extract group of functions into a hook${colors.reset}
  node scripts/split-component.mjs extract-group components/NeuralCore.tsx NeuralCore useExpressionSystem components/neural-core/hooks/useExpressionSystem.ts resolveExpressionAlias,addExpressionTarget,setExpressionValue
  
  ${colors.gray}# Create barrel export${colors.reset}
  node scripts/split-component.mjs create-barrel components/behavior-editor/tabs
`);
}

// Main
switch (command) {
  case 'analyze':
    if (!args[1]) {
      log('Usage: analyze <file>', 'red');
      process.exit(1);
    }
    analyzeFile(args[1]);
    break;
    
  case 'analyze-deep':
    if (!args[1]) {
      log('Usage: analyze-deep <file>', 'red');
      process.exit(1);
    }
    analyzeDeep(args[1]);
    break;
    
  case 'extract-function':
    if (!args[1] || !args[2] || !args[3]) {
      log('Usage: extract-function <source> <functionName> <destFile>', 'red');
      process.exit(1);
    }
    extractFunction(args[1], args[2], args[3]);
    break;
    
  case 'extract-inner':
    if (!args[1] || !args[2] || !args[3] || !args[4]) {
      log('Usage: extract-inner <source> <componentName> <innerFuncName> <destFile>', 'red');
      process.exit(1);
    }
    extractInner(args[1], args[2], args[3], args[4]);
    break;
    
  case 'extract-lines':
    if (!args[1] || !args[2] || !args[3] || !args[4]) {
      log('Usage: extract-lines <source> <startLine> <endLine> <destFile> [functionName]', 'red');
      process.exit(1);
    }
    extractLines(args[1], args[2], args[3], args[4], args[5] || 'extracted');
    break;
    
  case 'extract-group':
    if (!args[1] || !args[2] || !args[3] || !args[4] || !args[5]) {
      log('Usage: extract-group <source> <componentName> <hookName> <destFile> <func1,func2,...>', 'red');
      process.exit(1);
    }
    extractGroup(args[1], args[2], args[3], args[4], args[5]);
    break;
    
  case 'create-barrel':
    if (!args[1]) {
      log('Usage: create-barrel <directory>', 'red');
      process.exit(1);
    }
    createBarrel(args[1]);
    break;
    
  case 'help':
  case '--help':
  case '-h':
  default:
    showHelp();
    break;
}
