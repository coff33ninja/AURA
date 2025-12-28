#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vrmDir = path.join(__dirname, '..', 'public', 'VRM-Models');
const outDir = path.join(vrmDir, 'sidecars');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Find all .vrm files
const files = fs.readdirSync(vrmDir).filter(f => f.endsWith('.vrm'));

console.log(`Found ${files.length} VRM files. Starting extraction...`);

let completed = 0;
let failed = 0;

const extractVrm = (file) => {
  return new Promise((resolve) => {
    const vrmPath = path.join(vrmDir, file);
    const proc = spawn('node', [
      path.join(__dirname, 'patch-vrm-expressions.mjs'),
      vrmPath,
      `--out-dir=${outDir}`
    ]);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${file}`);
        completed++;
      } else {
        console.error(`✗ ${file}: ${stderr}`);
        failed++;
      }
      resolve();
    });
  });
};

// Process all VRM files sequentially
(async () => {
  for (const file of files) {
    await extractVrm(file);
  }
  console.log(`\nDone! ${completed} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})();
