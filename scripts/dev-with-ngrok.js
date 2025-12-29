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

/**
 * Try to start ngrok using the npm package API first, fall back to CLI
 */
async function tryNgrokNpm(port) {
  try {
    // Dynamic import to check if ngrok npm package is available
    const ngrok = await import('ngrok');
    
    if (ngrokAuthToken) {
      console.log('🔑 Configuring ngrok with auth token from .env.local...\n');
      await ngrok.default.authtoken(ngrokAuthToken);
      console.log('✅ ngrok auth configured\n');
    }
    
    console.log('🌐 Starting ngrok tunnel (npm package)...\n');
    const url = await ngrok.default.connect(port);
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    🌍 NGROK TUNNEL ACTIVE 🌍                    ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Public URL: ${url.padEnd(50)} ║`);
    console.log('║                                                                ║');
    console.log('║ Share this link with anyone to access your AURA bot remotely! ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    return true;
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('📦 ngrok npm package not found, trying system CLI...\n');
      return false;
    }
    console.error('❌ ngrok npm package error:', err.message);
    return false;
  }
}

/**
 * Start ngrok using the system CLI (global install or Chocolatey)
 */
function startNgrokCli() {
  if (ngrokAuthToken) {
    console.log('🔑 Configuring ngrok with auth token from .env.local...\n');
    const authProcess = spawn('ngrok', ['config', 'add-authtoken', ngrokAuthToken], {
      stdio: 'pipe',
      shell: true,
    });
    
    authProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ngrok auth configured\n');
      }
      runNgrokTunnel();
    });
    
    authProcess.on('error', () => {
      showInstallInstructions();
    });
  } else {
    console.log('⚠️  NGROK_AUTH_TOKEN not found in .env.local\n');
    console.log('To use ngrok, add NGROK_AUTH_TOKEN to your .env.local:\n');
    console.log('  NGROK_AUTH_TOKEN=your_token_here\n');
    console.log('Get your token from: https://dashboard.ngrok.com/auth/your-authtoken\n');
    runNgrokTunnel();
  }
}

function runNgrokTunnel() {
  console.log('🌐 Starting ngrok tunnel (CLI)...\n');
  const ngrokProcess = spawn('ngrok', ['http', '3000', '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  let urlFound = false;

  ngrokProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Extract and display the public URL from ngrok logs
    if (!urlFound) {
      // Match both old format "Forwarding" and new log format "url="
      const urlMatch = output.match(/url=(https:\/\/[a-zA-Z0-9\.\-]+\.ngrok[a-zA-Z0-9\.\-]*\.app)/);
      if (urlMatch && urlMatch[1]) {
        urlFound = true;
        const publicUrl = urlMatch[1];
        
        setTimeout(() => {
          console.log('\n');
          console.log('╔════════════════════════════════════════════════════════════════╗');
          console.log('║                    🌍 NGROK TUNNEL ACTIVE 🌍                    ║');
          console.log('╠════════════════════════════════════════════════════════════════╣');
          console.log(`║ Public URL: ${publicUrl.padEnd(50)} ║`);
          console.log('║                                                                ║');
          console.log('║ Share this link with anyone to access your AURA bot remotely! ║');
          console.log('╚════════════════════════════════════════════════════════════════╝');
          console.log('\n');
        }, 100);
      }
    }
  });

  ngrokProcess.stderr.on('data', (data) => {
    console.error('ngrok error:', data.toString());
  });

  ngrokProcess.on('close', (code) => {
    if (code !== 0) {
      console.log('\n❌ ngrok exited with code', code);
    }
  });

  ngrokProcess.on('error', (err) => {
    showInstallInstructions();
  });
}

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

function showInstallInstructions() {
  console.error('\n❌ ngrok is not installed or not found in PATH\n');
  console.error('Install ngrok using one of these methods:\n');
  console.error('  Option 1 - npm (recommended):');
  console.error('    npm install ngrok\n');
  console.error('  Option 2 - Global npm install:');
  console.error('    npm install -g ngrok\n');
  console.error('  Option 3 - Chocolatey (Windows):');
  console.error('    choco install ngrok\n');
  console.error('  Option 4 - Download directly:');
  console.error('    https://ngrok.com/download\n');
  console.error('The dev server is still running at http://localhost:3000\n');
}

// Wait a moment for Vite to start, then start ngrok
setTimeout(async () => {
  // Try npm package first, fall back to CLI
  const npmSuccess = await tryNgrokNpm(3000);
  if (!npmSuccess) {
    startNgrokCli();
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
