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
    console.log('🌐 Starting ngrok tunnel...\n');
    const ngrokProcess = spawn('ngrok', ['http', '3000', '--log=stdout'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let urlFound = false;

    ngrokProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      // Extract and display the public URL
      if (!urlFound && output.includes('Forwarding')) {
        const urlMatch = output.match(/Forwarding\s+(\S+)\s+->/);
        if (urlMatch && urlMatch[1]) {
          urlFound = true;
          const publicUrl = urlMatch[1];
          
          console.log('\n');
          console.log('╔════════════════════════════════════════════════════════════════╗');
          console.log('║                    🌍 NGROK TUNNEL ACTIVE 🌍                    ║');
          console.log('╠════════════════════════════════════════════════════════════════╣');
          console.log(`║ Public URL: ${publicUrl.padEnd(50)} ║`);
          console.log('║                                                                ║');
          console.log('║ Share this link with anyone to access your AURA bot remotely! ║');
          console.log('╚════════════════════════════════════════════════════════════════╝');
          console.log('\n');
        }
      }
    });

    ngrokProcess.stderr.on('data', (data) => {
      console.error('ngrok error:', data.toString());
    });

    ngrokProcess.on('close', (code) => {
      console.log('\n❌ ngrok exited with code', code);
      process.exit(code);
    });

    ngrokProcess.on('error', (err) => {
      console.error('\n❌ Failed to start ngrok:', err.message);
      console.error('\nMake sure ngrok is installed globally:');
      console.error('  npm install -g ngrok\n');
      process.exit(1);
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
