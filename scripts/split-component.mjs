#!/usr/bin/env node
/**
 * Component Splitting Helper Script
 * 
 * Usage:
 *   node scripts/split-component.mjs extract-function <source> <functionName> <destFile>
 *   node scripts/split-component.mjs create-barrel <directory>
 *   node scripts/split-component.mjs analyze <file>
 * 
 * Examples:
 *   node scripts/split-component.mjs analyze components/BehaviorEditor.tsx
 *   node scripts/split-component.mjs extract-function components/BehaviorEditor.tsx Slider components/behavior-editor/shared/Slider.tsx
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
 * Show help
 */
function showHelp() {
  log(`
${colors.cyan}Component Splitting Helper${colors.reset}

${colors.bright}Commands:${colors.reset}
  analyze <file>
    Analyze a file and list all functions/components with line counts
    
  extract-function <source> <functionName> <destFile>
    Extract a function from source file to destination
    Includes all imports (clean up manually after)
    
  create-barrel <directory>
    Create an index.ts barrel export for all files in directory

${colors.bright}Examples:${colors.reset}
  ${colors.gray}# Analyze BehaviorEditor to see what to split${colors.reset}
  node scripts/split-component.mjs analyze components/BehaviorEditor.tsx
  
  ${colors.gray}# Extract Slider component${colors.reset}
  node scripts/split-component.mjs extract-function components/BehaviorEditor.tsx Slider components/behavior-editor/shared/Slider.tsx
  
  ${colors.gray}# Create barrel export for tabs${colors.reset}
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
    
  case 'extract-function':
    if (!args[1] || !args[2] || !args[3]) {
      log('Usage: extract-function <source> <functionName> <destFile>', 'red');
      process.exit(1);
    }
    extractFunction(args[1], args[2], args[3]);
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
