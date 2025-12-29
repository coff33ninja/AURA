import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { BehaviorStorageService } from './services/behaviorStorageService';

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

// Plugin for SQLite-based behavior storage API
function behaviorStoragePlugin() {
  let storageService: BehaviorStorageService | null = null;
  
  return {
    name: 'behavior-storage-api',
    configureServer(server) {
      // Initialize storage service
      storageService = new BehaviorStorageService();
      console.log('[BehaviorStorage] SQLite database initialized');
      
      // Helper to parse JSON body
      const parseBody = (req): Promise<any> => {
        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (e) {
              reject(e);
            }
          });
          req.on('error', reject);
        });
      };
      
      // Helper to send JSON response
      const sendJson = (res, data, status = 200) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };
      
      // GET /api/behaviors/:modelName - get all configs for a model
      // GET /api/behaviors/:modelName/:behaviorType - get specific config
      server.middlewares.use('/api/behaviors', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const urlParts = req.url?.split('/').filter(Boolean) || [];
        const modelName = urlParts[0];
        const behaviorType = urlParts[1];
        
        if (!modelName) {
          sendJson(res, { error: 'Model name required' }, 400);
          return;
        }
        
        try {
          if (req.method === 'GET') {
            if (behaviorType) {
              const config = storageService.getConfig(modelName, behaviorType);
              sendJson(res, config || {});
            } else {
              const configs = storageService.getAllConfigs(modelName);
              sendJson(res, configs);
            }
          } else if (req.method === 'PUT' || req.method === 'POST') {
            if (!behaviorType) {
              sendJson(res, { error: 'Behavior type required for PUT' }, 400);
              return;
            }
            const body = await parseBody(req);
            storageService.saveConfig(modelName, behaviorType, body);
            sendJson(res, { success: true });
          } else if (req.method === 'DELETE') {
            if (behaviorType) {
              storageService.deleteConfig(modelName, behaviorType);
            } else {
              storageService.deleteConfig(modelName);
            }
            sendJson(res, { success: true });
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });
      
      // POST /api/sessions/start - start a new session
      // POST /api/sessions/:sessionId/end - end a session
      // POST /api/sessions/:sessionId/log - log a behavior change
      server.middlewares.use('/api/sessions', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const urlParts = req.url?.split('/').filter(Boolean) || [];
        
        try {
          if (req.method === 'POST') {
            if (urlParts.length === 0 || urlParts[0] === 'start') {
              // Start new session
              const body = await parseBody(req);
              const sessionId = storageService.startSession(body.metadata);
              sendJson(res, { sessionId });
            } else if (urlParts.length >= 2) {
              const sessionId = urlParts[0];
              const action = urlParts[1];
              
              if (action === 'end') {
                storageService.endSession(sessionId);
                sendJson(res, { success: true });
              } else if (action === 'log') {
                const body = await parseBody(req);
                storageService.logChange(
                  sessionId,
                  body.modelName,
                  body.behaviorType,
                  body.context || '',
                  body.oldValue || {},
                  body.newValue || {}
                );
                sendJson(res, { success: true });
              } else {
                next();
              }
            } else {
              next();
            }
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Session error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });
      
      // GET /api/export/training - export training data
      // POST /api/export/sidecars/:modelName - export to sidecar files
      server.middlewares.use('/api/export', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const urlParts = req.url?.split('/').filter(Boolean) || [];
        
        try {
          if (urlParts[0] === 'training' && req.method === 'GET') {
            const data = storageService.exportTrainingData();
            sendJson(res, data);
          } else if (urlParts[0] === 'sidecars' && urlParts[1] && req.method === 'POST') {
            const modelName = urlParts[1];
            const sidecarsDir = path.join(process.cwd(), 'public', 'VRM-Models', 'sidecars');
            storageService.exportToSidecars(modelName, sidecarsDir);
            sendJson(res, { success: true, message: `Exported configs for ${modelName}` });
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Export error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });
      
      // POST /api/admin/clear - clear database
      // GET /api/admin/stats - get database stats
      server.middlewares.use('/api/admin', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const urlParts = req.url?.split('/').filter(Boolean) || [];
        
        try {
          if (urlParts[0] === 'clear' && req.method === 'POST') {
            storageService.clearAll();
            sendJson(res, { success: true, message: 'Database cleared' });
          } else if (urlParts[0] === 'stats' && req.method === 'GET') {
            const stats = storageService.getStats();
            sendJson(res, stats);
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Admin error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });

      // ============ Conversation API ============
      // GET /api/conversations/recent?limit=N - get recent messages
      // GET /api/conversations/summary?limit=N - get conversation summary
      // GET /api/conversations/stats - get conversation stats
      // POST /api/conversations/message - save a message
      // POST /api/conversations/session/start - start new session
      // POST /api/conversations/session/:id/end - end session
      // DELETE /api/conversations - clear all conversations
      server.middlewares.use('/api/conversations', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const url = new URL(req.url || '', 'http://localhost');
        const urlParts = url.pathname.split('/').filter(Boolean);
        
        try {
          if (req.method === 'GET') {
            if (urlParts[0] === 'recent') {
              const limit = parseInt(url.searchParams.get('limit') || '20');
              const messages = storageService.getRecentMessages(limit);
              sendJson(res, messages);
            } else if (urlParts[0] === 'summary') {
              const limit = parseInt(url.searchParams.get('limit') || '10');
              const summary = storageService.getConversationSummary(limit);
              sendJson(res, { summary });
            } else if (urlParts[0] === 'stats') {
              const stats = storageService.getConversationStats();
              sendJson(res, stats);
            } else {
              next();
            }
          } else if (req.method === 'POST') {
            if (urlParts[0] === 'message') {
              const body = await parseBody(req);
              const id = storageService.saveMessage(body.sessionId, body.role, body.content);
              sendJson(res, { success: true, id });
            } else if (urlParts[0] === 'session') {
              if (urlParts[1] === 'start') {
                const sessionId = storageService.startConversationSession();
                sendJson(res, { sessionId });
              } else if (urlParts[2] === 'end') {
                const sessionId = urlParts[1];
                storageService.endConversationSession(sessionId);
                sendJson(res, { success: true });
              } else {
                next();
              }
            } else {
              next();
            }
          } else if (req.method === 'DELETE') {
            storageService.clearConversations();
            sendJson(res, { success: true });
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Conversation error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });

      // ============ VRM Config API ============
      // GET /api/vrm-configs/:modelName - get config for model
      // PUT /api/vrm-configs/:modelName - save config for model
      // DELETE /api/vrm-configs/:modelName - delete config
      server.middlewares.use('/api/vrm-configs', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const urlParts = req.url?.split('/').filter(Boolean) || [];
        const modelName = decodeURIComponent(urlParts[0] || '');
        
        if (!modelName) {
          sendJson(res, { error: 'Model name required' }, 400);
          return;
        }
        
        try {
          if (req.method === 'GET') {
            const config = storageService.getVrmConfig(modelName);
            sendJson(res, config || {});
          } else if (req.method === 'PUT' || req.method === 'POST') {
            const body = await parseBody(req);
            storageService.saveVrmConfig(modelName, body);
            sendJson(res, { success: true });
          } else if (req.method === 'DELETE') {
            storageService.deleteVrmConfig(modelName);
            sendJson(res, { success: true });
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] VRM config error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });

      // ============ User Preferences API ============
      // GET /api/preferences/:key - get preference
      // GET /api/preferences - get all preferences
      // PUT /api/preferences/:key - save preference
      // DELETE /api/preferences/:key - delete preference
      server.middlewares.use('/api/preferences', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        const urlParts = req.url?.split('/').filter(Boolean) || [];
        const key = decodeURIComponent(urlParts[0] || '');
        
        try {
          if (req.method === 'GET') {
            if (key) {
              const value = storageService.getPreference(key);
              sendJson(res, value || {});
            } else {
              const all = storageService.getAllPreferences();
              sendJson(res, all);
            }
          } else if (req.method === 'PUT' || req.method === 'POST') {
            if (!key) {
              sendJson(res, { error: 'Preference key required' }, 400);
              return;
            }
            const body = await parseBody(req);
            storageService.savePreference(key, body);
            sendJson(res, { success: true });
          } else if (req.method === 'DELETE') {
            if (!key) {
              sendJson(res, { error: 'Preference key required' }, 400);
              return;
            }
            storageService.deletePreference(key);
            sendJson(res, { success: true });
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Preferences error:', e);
          sendJson(res, { error: String(e) }, 500);
        }
      });

      // ============ Full Export API ============
      // GET /api/export/all - export entire database
      server.middlewares.use('/api/export/all', async (req, res, next) => {
        if (!storageService) {
          sendJson(res, { error: 'Storage not initialized' }, 500);
          return;
        }
        
        try {
          if (req.method === 'GET') {
            const data = storageService.exportAll();
            sendJson(res, data);
          } else {
            next();
          }
        } catch (e) {
          console.error('[BehaviorStorage] Export all error:', e);
          sendJson(res, { error: String(e) }, 500);
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
      plugins: [react(), vrmModelsPlugin(), behaviorStoragePlugin()],
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
