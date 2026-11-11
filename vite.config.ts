import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { generateGroundedChatResponse } from './server/aiService.ts';
import { createPagosyaSandboxCheckout } from './server/pagosyaService.ts';

function apiPlugin(): Plugin {
  return {
    name: 'team-life-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const cleanUrl = req.url ? req.url.split('?')[0].replace(/\/+$/, '') : '';

        // CORS headers
        if (cleanUrl === '/api/ai/chat' || cleanUrl === '/api/pagosya/create-checkout' || cleanUrl === '/.netlify/functions/pagosya-create-checkout') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
        }

        if (cleanUrl === '/api/ai/chat') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const { prompt, history } = parsed;
                const result = await generateGroundedChatResponse(prompt || '', history);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify(result));
              } catch (err: any) {
                console.error('[Vite Server Error]:', err);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  reply: 'Ocurrió un error al procesar tu consulta con la inteligencia artificial. Por favor intenta de nuevo.' 
                }));
              }
            });
            return;
          }
        }

        if (cleanUrl === '/api/pagosya/create-checkout' || cleanUrl === '/.netlify/functions/pagosya-create-checkout') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const host = req.headers['host'];
                const origin = host ? `http://${host}` : undefined;
                const result = await createPagosyaSandboxCheckout(parsed, origin);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = result.statusCode;
                res.end(JSON.stringify(result.success ? result.data : { error: result.error, detail: result.detail }));
              } catch (err: any) {
                console.error('[Vite PagosYa Server Error]:', err);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  error: 'Error interno en el servidor dev al generar checkout de PagosYa.',
                  detail: err?.message || String(err)
                }));
              }
            });
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

