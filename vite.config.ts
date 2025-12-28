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
        try {
          const files = fs.readdirSync(vrmDir);
          const vrmFiles = files.filter(f => f.endsWith('.vrm'));
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
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), basicSsl(), vrmModelsPlugin()],
      define: {
        'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS)
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
