#!/usr/bin/env node

import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.assign(process.env, envConfig);
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.warn('⚠️  .env.local not found. ngrok will use previously configured auth token.');
}

// Get ngrok auth token from environment
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;

console.log('\n🚀 Starting AURA dev server with ngrok tunnel...\n');

// Start Vite dev server
const viteProcess = spawn('npm', ['run', 'dev:local'], {
  stdio: 'inherit',
  shell: true,
});

// Wait a moment for Vite to start, then start ngrok
setTimeout(() => {
  const ngrokArgs = ['http', '3000'];
  
  if (ngrokAuthToken) {
    console.log('\n🔑 Configuring ngrok with auth token from .env.local...\n');
    const authProcess = spawn('ngrok', ['config', 'add-authtoken', ngrokAuthToken], {
      stdio: 'pipe',
      shell: true,
    });
    
    authProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ngrok auth configured\n');
      }
      // Start ngrok tunnel
      startNgrok();
    });
  } else {
    console.log('⚠️  NGROK_AUTH_TOKEN not found in .env.local\n');
    console.log('To use ngrok, add NGROK_AUTH_TOKEN to your .env.local:\n');
    console.log('  NGROK_AUTH_TOKEN=your_token_here\n');
    console.log('Get your token from: https://dashboard.ngrok.com/auth/your-authtoken\n');
    startNgrok();
  }
  
  function startNgrok() {
    const ngrokProcess = spawn('ngrok', ngrokArgs, {
      stdio: 'inherit',
      shell: true,
    });

    ngrokProcess.on('close', (code) => {
      console.log('\n❌ ngrok exited with code', code);
      process.exit(code);
    });
  }
}, 3000);

viteProcess.on('close', (code) => {
  console.log('\n❌ Dev server exited with code', code);
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  viteProcess.kill();
  process.exit(0);
});
