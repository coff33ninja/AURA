#!/usr/bin/env node
/**
 * Component Logic Analyzer
 * 
 * Analyzes a React component to understand:
 * - Refs and their usage patterns
 * - useEffect hooks and their dependencies
 * - useCallback/useMemo hooks
 * - State variables
 * - Helper functions and what they access
 * - Logical groupings for splitting
 * 
 * Usage:
 *   node scripts/analyze-component-logic.mjs <file>
 *   node scripts/analyze-component-logic.mjs components/NeuralCore.tsx
 */

import fs from 'fs';

const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
  console.log('Usage: node scripts/analyze-component-logic.mjs <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

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
  blue: '\x1b[34m',
};

console.log(`\n${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`${c.cyan}${c.bright}  Component Logic Analyzer: ${filePath}${c.reset}`);
console.log(`${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}\n`);

// 1. Find all useRef declarations
const refs = [];
const refRegex = /const\s+(\w+)\s*=\s*useRef[<\w\s|,>]*\(/g;
let match;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  refRegex.lastIndex = 0;
  while ((match = refRegex.exec(line)) !== null) {
    refs.push({ name: match[1], line: i + 1 });
  }
}

// 2. Find all useState declarations
const states = [];
const stateRegex = /const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState/g;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  stateRegex.lastIndex = 0;
  while ((match = stateRegex.exec(line)) !== null) {
    states.push({ name: match[1], setter: `set${match[2]}`, line: i + 1 });
  }
}

// 3. Find all useCallback declarations
const callbacks = [];
const callbackRegex = /const\s+(\w+)\s*=\s*useCallback\s*\(/g;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  callbackRegex.lastIndex = 0;
  while ((match = callbackRegex.exec(line)) !== null) {
    callbacks.push({ name: match[1], line: i + 1 });
  }
}

// 4. Find all useEffect hooks
const effects = [];
const effectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{/g;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('useEffect')) {
    // Find the dependency array by scanning forward
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
    // Extract deps from the line after the closing brace
    const depsLine = lines[endLine] || '';
    const depsMatch = depsLine.match(/\},\s*\[([^\]]*)\]/);
    const deps = depsMatch ? depsMatch[1].split(',').map(d => d.trim()).filter(Boolean) : [];
    effects.push({ line: i + 1, endLine: endLine + 1, deps, size: endLine - i + 1 });
  }
}

// 5. Find all regular functions (not hooks)
const functions = [];
const funcRegex = /^(\s*)(const\s+)?(\w+)\s*=\s*(\([^)]*\)|[^=])*=>\s*\{|^(\s*)function\s+(\w+)/;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const funcMatch = line.match(/^\s*const\s+(\w+)\s*=\s*(?:useCallback\s*\()?\s*\(/) ||
                    line.match(/^\s*const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/) ||
                    line.match(/^\s*function\s+(\w+)/);
  if (funcMatch && !line.includes('useRef') && !line.includes('useState') && !line.includes('useEffect') && !line.includes('useMemo')) {
    const name = funcMatch[1];
    if (name && !callbacks.find(c => c.name === name)) {
      // Find function end
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
      functions.push({ name, line: i + 1, endLine: endLine + 1, size: endLine - i + 1 });
    }
  }
}

// 6. Analyze ref usage - which functions use which refs
const refUsage = {};
for (const ref of refs) {
  refUsage[ref.name] = { usedBy: [], usedIn: [] };
  const refPattern = new RegExp(`\\b${ref.name}\\.current\\b|\\b${ref.name}\\b`, 'g');
  
  for (const func of [...functions, ...callbacks.map(c => ({ ...c, endLine: c.line + 50 }))]) {
    for (let i = func.line - 1; i < Math.min(func.endLine, lines.length); i++) {
      if (refPattern.test(lines[i]) && i !== ref.line - 1) {
        if (!refUsage[ref.name].usedBy.includes(func.name)) {
          refUsage[ref.name].usedBy.push(func.name);
        }
      }
    }
  }
  
  for (const effect of effects) {
    for (let i = effect.line - 1; i < effect.endLine; i++) {
      if (refPattern.test(lines[i])) {
        refUsage[ref.name].usedIn.push(`useEffect@${effect.line}`);
        break;
      }
    }
  }
}

// 7. Group refs by logical domain
const domains = {
  'VRM/3D': [],
  'Animation': [],
  'Expression': [],
  'Gesture': [],
  'Walking': [],
  'Camera': [],
  'Audio/LipSync': [],
  'State': [],
  'Other': [],
};

for (const ref of refs) {
  const name = ref.name.toLowerCase();
  if (name.includes('vrm') || name.includes('scene') || name.includes('renderer') || name.includes('mesh') || name.includes('light') || name.includes('particle')) {
    domains['VRM/3D'].push(ref);
  } else if (name.includes('animation') || name.includes('mixer') || name.includes('action') || name.includes('clock') || name.includes('breathing') || name.includes('blink') || name.includes('idle') || name.includes('saccade')) {
    domains['Animation'].push(ref);
  } else if (name.includes('expression') || name.includes('sidecar')) {
    domains['Expression'].push(ref);
  } else if (name.includes('gesture') || name.includes('bone') || name.includes('posture') || name.includes('body')) {
    domains['Gesture'].push(ref);
  } else if (name.includes('walk') || name.includes('leg')) {
    domains['Walking'].push(ref);
  } else if (name.includes('camera') || name.includes('head') || name.includes('lookat') || name.includes('tracking')) {
    domains['Camera'].push(ref);
  } else if (name.includes('audio') || name.includes('lipsync') || name.includes('volume') || name.includes('frequency') || name.includes('phoneme')) {
    domains['Audio/LipSync'].push(ref);
  } else if (name.includes('state') || name.includes('mode') || name.includes('config') || name.includes('behavior')) {
    domains['State'].push(ref);
  } else {
    domains['Other'].push(ref);
  }
}

// Print results
console.log(`${c.green}${c.bright}📊 SUMMARY${c.reset}`);
console.log(`${c.dim}─────────────────────────────────────────${c.reset}`);
console.log(`  Total Lines: ${lines.length}`);
console.log(`  Refs: ${refs.length}`);
console.log(`  State Variables: ${states.length}`);
console.log(`  useCallbacks: ${callbacks.length}`);
console.log(`  useEffects: ${effects.length}`);
console.log(`  Functions: ${functions.length}`);
console.log();

console.log(`${c.yellow}${c.bright}📦 REFS BY DOMAIN${c.reset}`);
console.log(`${c.dim}─────────────────────────────────────────${c.reset}`);
for (const [domain, domainRefs] of Object.entries(domains)) {
  if (domainRefs.length > 0) {
    console.log(`\n  ${c.cyan}${domain}${c.reset} (${domainRefs.length}):`);
    for (const ref of domainRefs) {
      const usage = refUsage[ref.name];
      const usedByStr = usage.usedBy.length > 0 ? ` → ${usage.usedBy.slice(0, 3).join(', ')}${usage.usedBy.length > 3 ? '...' : ''}` : '';
      console.log(`    • ${ref.name} (L${ref.line})${c.dim}${usedByStr}${c.reset}`);
    }
  }
}
console.log();

console.log(`${c.magenta}${c.bright}🔄 STATE VARIABLES${c.reset}`);
console.log(`${c.dim}─────────────────────────────────────────${c.reset}`);
for (const state of states) {
  console.log(`  • [${state.name}, ${state.setter}] (L${state.line})`);
}
console.log();

console.log(`${c.blue}${c.bright}⚡ useEffect HOOKS${c.reset}`);
console.log(`${c.dim}─────────────────────────────────────────${c.reset}`);
for (const effect of effects) {
  const depsStr = effect.deps.length > 0 ? `[${effect.deps.join(', ')}]` : '[]';
  const sizeColor = effect.size > 100 ? c.red : effect.size > 50 ? c.yellow : c.green;
  console.log(`  • L${effect.line}-${effect.endLine} ${sizeColor}(${effect.size} lines)${c.reset} deps: ${depsStr}`);
}
console.log();

console.log(`${c.green}${c.bright}🎯 LARGE FUNCTIONS (>20 lines)${c.reset}`);
console.log(`${c.dim}─────────────────────────────────────────${c.reset}`);
const largeFuncs = [...functions, ...callbacks.map(c => ({ ...c, size: 50 }))].filter(f => f.size > 20).sort((a, b) => b.size - a.size);
for (const func of largeFuncs.slice(0, 15)) {
  const sizeColor = func.size > 100 ? c.red : func.size > 50 ? c.yellow : c.green;
  console.log(`  • ${func.name.padEnd(30)} ${sizeColor}${String(func.size).padStart(4)} lines${c.reset} (L${func.line})`);
}
console.log();

// Suggest hook extractions
console.log(`${c.cyan}${c.bright}💡 SUGGESTED HOOK EXTRACTIONS${c.reset}`);
console.log(`${c.dim}─────────────────────────────────────────${c.reset}`);

const suggestions = [
  {
    name: 'useVrmLoader',
    description: 'VRM loading, disposal, model switching',
    refs: domains['VRM/3D'].map(r => r.name),
    states: ['isLoading', 'loadProgress', 'loadError'],
  },
  {
    name: 'useExpressionManager', 
    description: 'Expression blending, alias resolution, lip sync',
    refs: domains['Expression'].map(r => r.name),
    functions: ['resolveExpressionAlias', 'addExpressionTarget', 'setExpressionValue'],
  },
  {
    name: 'useGesturePlayer',
    description: 'Gesture queue, playback, bone interpolation',
    refs: domains['Gesture'].map(r => r.name),
    functions: ['playGesture', 'playNextGesture', 'getGestureRotations'],
  },
  {
    name: 'useIdleAnimations',
    description: 'Breathing, blinking, sway, saccades',
    refs: domains['Animation'].filter(r => !r.name.includes('mixer')).map(r => r.name),
    functions: ['playIdleGesture', 'setIdleState'],
  },
  {
    name: 'useWalkingAnimation',
    description: 'Walking cycle, leg/arm movement, bobbing',
    refs: domains['Walking'].map(r => r.name),
    functions: ['walk', 'stopWalking', 'setWalkingBehavior'],
  },
  {
    name: 'useCameraTracking',
    description: 'Eye contact, head tracking, look-at',
    refs: domains['Camera'].map(r => r.name),
    functions: ['updateCameraTracking', 'setLookAtTarget'],
  },
  {
    name: 'useLipSync',
    description: 'Phoneme detection, viseme weights',
    refs: domains['Audio/LipSync'].map(r => r.name),
  },
];

for (const sug of suggestions) {
  console.log(`\n  ${c.green}${sug.name}${c.reset} - ${sug.description}`);
  if (sug.refs?.length) console.log(`    ${c.dim}Refs: ${sug.refs.join(', ')}${c.reset}`);
  if (sug.states?.length) console.log(`    ${c.dim}State: ${sug.states.join(', ')}${c.reset}`);
  if (sug.functions?.length) console.log(`    ${c.dim}Functions: ${sug.functions.join(', ')}${c.reset}`);
}

console.log(`\n${c.cyan}${c.bright}═══════════════════════════════════════════════════════════════${c.reset}\n`);
