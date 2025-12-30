#!/usr/bin/env node
/**
 * Extraction Validator Script
 * 
 * Validates that extracted code matches the original source.
 * Compares extracted files against their source to ensure no code was lost or corrupted.
 * 
 * Usage:
 *   node scripts/validate-extraction.mjs <sourceFile> <extractedDir>
 *   node scripts/validate-extraction.mjs components/NeuralCore.tsx components/neural-core/
 * 
 * Commands:
 *   validate <sourceFile> <extractedDir>  - Validate all extractions in directory
 *   compare <sourceFile> <extractedFile>  - Compare single extracted file with source
 *   coverage <sourceFile> <extractedDir>  - Show how much of source is covered by extractions
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(msg, color = 'reset') {
  console.log(`${c[color]}${msg}${c.reset}`);
}

function normalizeCode(code) {
  return code
    .replace(/\/\/.*$/gm, '')           // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove multi-line comments
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .replace(/^\s+|\s+$/g, '')          // Trim
    .toLowerCase();
}

function hashCode(code) {
  return crypto.createHash('md5').update(normalizeCode(code)).digest('hex').slice(0, 8);
}


/**
 * Parse extraction metadata from file header comment
 */
function parseExtractionMeta(content) {
  const lines = content.split('\n');
  const meta = {
    sourceFile: null,
    functionName: null,
    startLine: null,
    endLine: null,
    componentName: null,
  };
  
  for (const line of lines.slice(0, 10)) {
    // Match: // Extracted from components/NeuralCore.tsx - NeuralCore.functionName
    let match = line.match(/Extracted from ([^\s]+)\s*-\s*(\w+)\.(\w+)/);
    if (match) {
      meta.sourceFile = match[1];
      meta.componentName = match[2];
      meta.functionName = match[3];
      continue;
    }
    
    // Match: // Extracted from components/NeuralCore.tsx lines 800-870
    match = line.match(/Extracted from ([^\s]+)\s+lines\s+(\d+)-(\d+)/);
    if (match) {
      meta.sourceFile = match[1];
      meta.startLine = parseInt(match[2]);
      meta.endLine = parseInt(match[3]);
      continue;
    }
    
    // Match: // Function: functionName
    match = line.match(/Function:\s*(\w+)/);
    if (match) {
      meta.functionName = match[1];
    }
  }
  
  return meta;
}

/**
 * Extract the actual code from an extracted file (skip imports and header)
 */
function getExtractedCode(content) {
  const lines = content.split('\n');
  let codeStart = 0;
  
  // Skip header comments and imports
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('import ') || line.startsWith('export *') || 
        line === '' || line.startsWith('/*') || line.startsWith('*')) {
      codeStart = i + 1;
    } else if (line.startsWith('export ') || line.startsWith('const ') || line.startsWith('function ')) {
      codeStart = i;
      break;
    }
  }
  
  return lines.slice(codeStart).join('\n');
}


/**
 * Find function in source file by name
 */
function findFunctionInSource(sourceContent, functionName, componentName = null) {
  const lines = sourceContent.split('\n');
  
  // Patterns to match function declarations
  const patterns = [
    new RegExp(`^\\s*const\\s+${functionName}\\s*=\\s*useCallback\\s*\\(`),
    new RegExp(`^\\s*const\\s+${functionName}\\s*=\\s*useMemo\\s*\\(`),
    new RegExp(`^\\s*const\\s+${functionName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
    new RegExp(`^\\s*const\\s+${functionName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
    new RegExp(`^\\s*const\\s+${functionName}\\s*=\\s*\\(`),
    new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${functionName}\\s*\\(`),
  ];
  
  let funcStart = -1;
  let funcEnd = -1;
  let braceCount = 0;
  let inFunc = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inFunc) {
      for (const pattern of patterns) {
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
  
  if (funcStart === -1) return null;
  
  return {
    code: lines.slice(funcStart, funcEnd + 1).join('\n'),
    startLine: funcStart + 1,
    endLine: funcEnd + 1,
  };
}

/**
 * Get lines from source file
 */
function getSourceLines(sourceContent, startLine, endLine) {
  const lines = sourceContent.split('\n');
  return lines.slice(startLine - 1, endLine).join('\n');
}


/**
 * Compare extracted file with source
 */
function compareFile(sourcePath, extractedPath) {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    return { valid: false, error: 'Source not found' };
  }
  
  if (!fs.existsSync(extractedPath)) {
    log(`Extracted file not found: ${extractedPath}`, 'red');
    return { valid: false, error: 'Extracted not found' };
  }
  
  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  const extractedContent = fs.readFileSync(extractedPath, 'utf-8');
  
  const meta = parseExtractionMeta(extractedContent);
  const extractedCode = getExtractedCode(extractedContent);
  
  let sourceCode = null;
  let sourceLocation = '';
  
  if (meta.startLine && meta.endLine) {
    // Line-based extraction
    sourceCode = getSourceLines(sourceContent, meta.startLine, meta.endLine);
    sourceLocation = `lines ${meta.startLine}-${meta.endLine}`;
  } else if (meta.functionName) {
    // Function-based extraction
    const found = findFunctionInSource(sourceContent, meta.functionName, meta.componentName);
    if (found) {
      sourceCode = found.code;
      sourceLocation = `${meta.functionName} (L${found.startLine}-${found.endLine})`;
    }
  }
  
  if (!sourceCode) {
    return {
      valid: false,
      error: 'Could not locate source code',
      meta,
    };
  }
  
  // Compare normalized code
  const sourceHash = hashCode(sourceCode);
  const extractedHash = hashCode(extractedCode);
  const match = sourceHash === extractedHash;
  
  // Calculate similarity if not exact match
  let similarity = 100;
  if (!match) {
    const sourceNorm = normalizeCode(sourceCode);
    const extractedNorm = normalizeCode(extractedCode);
    const longer = Math.max(sourceNorm.length, extractedNorm.length);
    const shorter = Math.min(sourceNorm.length, extractedNorm.length);
    similarity = Math.round((shorter / longer) * 100);
  }
  
  return {
    valid: match || similarity > 90,
    exactMatch: match,
    similarity,
    sourceLocation,
    sourceHash,
    extractedHash,
    sourceLines: sourceCode.split('\n').length,
    extractedLines: extractedCode.split('\n').length,
    meta,
  };
}


/**
 * Validate all extractions in a directory
 */
function validateDirectory(sourcePath, extractedDir) {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    process.exit(1);
  }
  
  if (!fs.existsSync(extractedDir)) {
    log(`Extracted directory not found: ${extractedDir}`, 'red');
    process.exit(1);
  }
  
  log(`\n${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}`);
  log(`${c.cyan}  Extraction Validator${c.reset}`);
  log(`${c.cyan}  Source: ${sourcePath}${c.reset}`);
  log(`${c.cyan}  Extracted: ${extractedDir}${c.reset}`);
  log(`${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}\n`);
  
  // Find all extracted files recursively
  const extractedFiles = [];
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        if (file !== 'index.ts' && file !== 'index.tsx') {
          extractedFiles.push(filePath);
        }
      }
    }
  }
  walkDir(extractedDir);
  
  log(`Found ${extractedFiles.length} extracted files\n`, 'cyan');
  
  const results = {
    valid: 0,
    invalid: 0,
    warnings: 0,
    files: [],
  };
  
  for (const extractedPath of extractedFiles) {
    const relativePath = path.relative(extractedDir, extractedPath);
    const result = compareFile(sourcePath, extractedPath);
    
    let status, statusColor;
    if (result.exactMatch) {
      status = '✓ EXACT';
      statusColor = 'green';
      results.valid++;
    } else if (result.valid) {
      status = `~ ${result.similarity}%`;
      statusColor = 'yellow';
      results.warnings++;
    } else {
      status = '✗ FAIL';
      statusColor = 'red';
      results.invalid++;
    }
    
    const funcName = result.meta?.functionName || result.sourceLocation || '?';
    log(`  ${c[statusColor]}${status.padEnd(10)}${c.reset} ${relativePath.padEnd(40)} ${c.dim}${funcName}${c.reset}`);
    
    if (!result.valid && result.error) {
      log(`             ${c.red}Error: ${result.error}${c.reset}`);
    }
    
    results.files.push({ path: extractedPath, ...result });
  }
  
  // Summary
  log(`\n${c.bright}Summary:${c.reset}`);
  log(`  ${c.green}Valid:    ${results.valid}${c.reset}`);
  log(`  ${c.yellow}Warnings: ${results.warnings}${c.reset}`);
  log(`  ${c.red}Invalid:  ${results.invalid}${c.reset}`);
  log(`  Total:   ${extractedFiles.length}`);
  
  return results;
}


/**
 * Calculate coverage - how much of source is covered by extractions
 */
function calculateCoverage(sourcePath, extractedDir) {
  if (!fs.existsSync(sourcePath)) {
    log(`Source file not found: ${sourcePath}`, 'red');
    process.exit(1);
  }
  
  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  const sourceLines = sourceContent.split('\n');
  const totalLines = sourceLines.length;
  
  // Track which lines are covered
  const coveredLines = new Set();
  
  // Find all extracted files
  const extractedFiles = [];
  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && file !== 'index.ts') {
        extractedFiles.push(filePath);
      }
    }
  }
  walkDir(extractedDir);
  
  log(`\n${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}`);
  log(`${c.cyan}  Coverage Analysis${c.reset}`);
  log(`${c.cyan}  Source: ${sourcePath} (${totalLines} lines)${c.reset}`);
  log(`${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}\n`);
  
  const extractions = [];
  
  for (const extractedPath of extractedFiles) {
    const content = fs.readFileSync(extractedPath, 'utf-8');
    const meta = parseExtractionMeta(content);
    
    let startLine = null, endLine = null;
    
    if (meta.startLine && meta.endLine) {
      startLine = meta.startLine;
      endLine = meta.endLine;
    } else if (meta.functionName) {
      const found = findFunctionInSource(sourceContent, meta.functionName, meta.componentName);
      if (found) {
        startLine = found.startLine;
        endLine = found.endLine;
      }
    }
    
    if (startLine && endLine) {
      for (let i = startLine; i <= endLine; i++) {
        coveredLines.add(i);
      }
      extractions.push({
        file: path.relative(extractedDir, extractedPath),
        name: meta.functionName || `lines ${startLine}-${endLine}`,
        startLine,
        endLine,
        lines: endLine - startLine + 1,
      });
    }
  }
  
  // Sort extractions by start line
  extractions.sort((a, b) => a.startLine - b.startLine);
  
  log(`${c.bright}Extracted sections:${c.reset}\n`);
  for (const ext of extractions) {
    log(`  L${String(ext.startLine).padStart(4)}-${String(ext.endLine).padEnd(4)} ${c.dim}(${ext.lines} lines)${c.reset} ${ext.name}`);
  }
  
  // Find gaps (uncovered sections)
  const gaps = [];
  let lastEnd = 0;
  for (const ext of extractions) {
    if (ext.startLine > lastEnd + 1) {
      gaps.push({ start: lastEnd + 1, end: ext.startLine - 1 });
    }
    lastEnd = Math.max(lastEnd, ext.endLine);
  }
  if (lastEnd < totalLines) {
    gaps.push({ start: lastEnd + 1, end: totalLines });
  }
  
  // Filter significant gaps (>10 lines, not just imports/whitespace)
  const significantGaps = gaps.filter(g => {
    const gapLines = sourceLines.slice(g.start - 1, g.end);
    const codeLines = gapLines.filter(l => {
      const trimmed = l.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('import ') && !trimmed.startsWith('*');
    });
    return codeLines.length > 10;
  });
  
  if (significantGaps.length > 0) {
    log(`\n${c.yellow}${c.bright}Uncovered sections (>10 code lines):${c.reset}\n`);
    for (const gap of significantGaps) {
      const gapSize = gap.end - gap.start + 1;
      // Show first non-empty line as hint
      const hint = sourceLines.slice(gap.start - 1, gap.end).find(l => l.trim() && !l.trim().startsWith('//'))?.trim().slice(0, 50) || '';
      log(`  L${String(gap.start).padStart(4)}-${String(gap.end).padEnd(4)} ${c.dim}(${gapSize} lines)${c.reset} ${c.dim}${hint}...${c.reset}`);
    }
  }
  
  const coverage = Math.round((coveredLines.size / totalLines) * 100);
  const coverageColor = coverage > 80 ? 'green' : coverage > 50 ? 'yellow' : 'red';
  
  log(`\n${c.bright}Coverage: ${c[coverageColor]}${coverage}%${c.reset} (${coveredLines.size}/${totalLines} lines)`);
  
  return { coverage, coveredLines: coveredLines.size, totalLines, gaps: significantGaps };
}


/**
 * Show help
 */
function showHelp() {
  log(`
${c.cyan}Extraction Validator${c.reset}

Validates extracted code against original source file.

${c.bright}Commands:${c.reset}
  validate <sourceFile> <extractedDir>
    Validate all extracted files match their source
    
  compare <sourceFile> <extractedFile></extractedFile>ompare a single extracted file with source
    
  coverage <sourceFile> <extractedDir>
    Show coverage - how much of source is extracted

${c.bright}Examples:${c.reset}
  ${c.dim}# Validate all NeuralCore extractions${c.reset}
  node scripts/validate-extraction.mjs validate components/NeuralCore.tsx components/neural-core/
  
  ${c.dim}# Check coverage${c.reset}
  node scripts/validate-extraction.mjs coverage components/NeuralCore.tsx components/neural-core/
  
  ${c.dim}# Compare single file${c.reset}
  node scripts/validate-extraction.mjs compare components/NeuralCore.tsx components/neural-core/utils/animateLoop.ts
`);
}

// Main
switch (command) {
  case 'validate':
    if (!args[1] || !args[2]) {
      log('Usage: validate <sourceFile> <extractedDir>', 'red');
      process.exit(1);
    }
    validateDirectory(args[1], args[2]);
    break;
    
  case 'compare':
    if (!args[1] || !args[2]) {
      log('Usage: compare <sourceFile> <extractedFile>', 'red');
      process.exit(1);
    }
    const result = compareFile(args[1], args[2]);
    console.log(JSON.stringify(result, null, 2));
    break;
    
  case 'coverage':
    if (!args[1] || !args[2]) {
      log('Usage: coverage <sourceFile> <extractedDir>', 'red');
      process.exit(1);
    }
    calculateCoverage(args[1], args[2]);
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    if (args[0] && args[1]) {
      // Default to validate if two args given
      validateDirectory(args[0], args[1]);
    } else {
      showHelp();
    }
    break;
}
