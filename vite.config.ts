import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Plugin to serve VRM model list dynamically
function vrmModelsPlugin() {
  return {
    name: 'vrm-models-api',
    configureServer(server) {
      server.middlewares.use('/api/vrm-models', (req, res) => {
        const vrmDir = path.join(process.cwd(), 'public', 'VRM-Models');
        const sidecarsDir = path.join(vrmDir, 'sidecars');
        try {
          const files = fs.readdirSync(vrmDir);
          const vrmFiles = files.filter(f => {
            if (!f.endsWith('.vrm')) return false;
            // Only include VRMs that have a valid sidecar (indicates proper VRM with expressions)
            const sidecarPath = path.join(sidecarsDir, `${f}.expressions.json`);
            if (fs.existsSync(sidecarPath)) {
              try {
                const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
                // Must have at least some expression groups
                return sidecar.groups && Object.keys(sidecar.groups).length > 0;
              } catch {
                return false;
              }
            }
            return false;
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(vrmFiles));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read VRM models' }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    // Load env from current directory, with empty prefix to get all vars
    const env = loadEnv(mode, process.cwd(), '');
    
    console.log('Loaded GEMINI_API_KEYS:', env.GEMINI_API_KEYS ? 'Found' : 'NOT FOUND');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '.ngrok.io',
          '.ngrok-free.app',
          '.ngrok-pro.app'
        ],
        middlewareMode: false,
      },
      plugins: [react(), vrmModelsPlugin()],
      define: {
        'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS || '')
      },
      build: {
        chunkSizeWarningLimit: 1500,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
