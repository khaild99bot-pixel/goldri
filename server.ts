/**
 * GOLDRIX Full-Stack Application Server
 * Express Backend + Vite Middleware (Dev) / Static Dist (Prod)
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api.ts';
import { Database } from './src/server/db/database.ts';
import {
  securityHeadersMiddleware,
  securitySanitizerMiddleware,
} from './src/server/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep the server process alive against transient async/network rejections
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception (recovered):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection (recovered):', reason);
});

async function startServer() {
  // Initialize PostgreSQL database connection if DATABASE_URL is provided (e.g., on Render)
  const db = Database.getInstance();
  await db.initPostgres();

  const app = express();
  const PORT =
    process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT
      ? Number(process.env.DEFAULT_APP_PORT) || 3000
      : Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Disable server stack fingerprinting
  app.disable('x-powered-by');

  // Trust Render / Cloud load balancer proxy headers
  app.set('trust proxy', 1);

  // Enterprise HTTP Security Headers
  app.use(securityHeadersMiddleware);

  // Request parsing (25mb limit for front & back KYC document image uploads)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Deep Request Sanitization (Anti-XSS & Anti-Prototype Pollution)
  app.use(securitySanitizerMiddleware);

  // Official Android 14 (API 34) APK file download endpoint
  const apkFilePath = path.resolve(__dirname, 'public', 'GOLDRIX.apk');
  app.get(
    [
      '/GOLDRIX.apk',
      '/GOLDRIX-v2.6.apk',
      '/GOLDRIX-v3.0.apk',
      '/GOLDRIX-Android-v2.4.apk',
      '/GOLDRIX-Android-v2.5.apk',
      '/GOLDRIX-Android-v2.6.apk',
      '/api/download/apk',
      '/api/v1/download/apk',
    ],
    (_req, res) => {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="GOLDRIX-v3.0.apk"');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(apkFilePath);
    }
  );

  // Self-unregistering Service Worker endpoint to immediately purge stale browser Workbox caches
  app.get(['/sw.js', '/dev-sw.js', '/registerSW.js', '/workbox-*.js'], (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Clear-Site-Data', '"cache"');
    res.send(`
      self.addEventListener('install', function() {
        self.skipWaiting();
      });
      self.addEventListener('activate', function(event) {
        event.waitUntil(
          caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
          }).then(function() {
            return self.registration.unregister();
          }).then(function() {
            return self.clients.matchAll();
          }).then(function(clients) {
            clients.forEach(function(client) {
              if (client.url && 'navigate' in client) {
                client.navigate(client.url);
              }
            });
          })
        );
      });
    `);
  });

  app.get('/manifest.webmanifest', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      id: '/',
      name: 'GOLDRIX Smart Trading & Investment',
      short_name: 'GOLDRIX',
      description: 'Digital asset smart trading and investment plans with daily profit withdrawal.',
      theme_color: '#06090F',
      background_color: '#06090F',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    });
  });

  // Quick top-level health check (used by Render & Cloud Run zero-downtime health checks)
  app.get(['/api/health', '/api/v1/health-ping'], (_req, res) => {
    res.json({
      status: 'UP',
      platform: 'GOLDRIX',
      database: db.isPostgresConnected() ? 'POSTGRESQL' : 'PERSISTENT_FILE',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Endpoints (mounted on both /api/v1 and /api for full compatibility)
  app.use(['/api/v1', '/api'], apiRouter);

  // Official High-Resolution Platform Icon File Download (GOLDRIX-Icon.png)
  const iconPngPath = path.resolve(__dirname, 'public', 'pwa-512x512.png');
  app.get(['/GOLDRIX-Icon.png', '/api/download/icon', '/api/v1/download/icon'], (_req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="GOLDRIX-Icon.png"');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(iconPngPath);
  });

  // Official Standalone App Icon Launcher File (GOLDRIX-App.html) - Works on Android, iPhone, Windows & Mac
  app.get(['/GOLDRIX-App.html', '/api/download/launcher', '/api/v1/download/launcher'], (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'ais-dev-hloghgofbdwzb52dnlzjyh-242909076674.europe-west2.run.app';
    const targetUrl = `${protocol}://${host}/`;

    const launcherHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#06090F" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="GOLDRIX" />
  <meta http-equiv="refresh" content="1;url=${targetUrl}" />
  <title>GOLDRIX — تطبيق المنصة الرسمي</title>
  <link rel="icon" href="${targetUrl}pwa-512x512.png" />
  <link rel="apple-touch-icon" href="${targetUrl}apple-touch-icon.png" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body {
      min-height: 100vh;
      background: radial-gradient(circle at top, #0d241b 0%, #06090F 70%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 380px;
      width: 100%;
      background: rgba(17, 24, 39, 0.92);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .icon-box {
      width: 84px;
      height: 84px;
      margin: 0 auto 18px;
      border-radius: 22px;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.35);
      border: 2px solid #f59e0b;
      font-size: 38px;
      font-weight: 900;
      color: #06090F;
    }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #fff; }
    p { font-size: 13px; color: #9ca3af; margin-bottom: 22px; line-height: 1.6; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      background: #10b981;
      color: #06090F;
      font-weight: 800;
      font-size: 14px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.25);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">G</div>
    <h1>منصة GOLDRIX للتداول الذكي</h1>
    <p>جاري فتح تطبيق منصة GOLDRIX الرسمي تلقائياً...</p>
    <a class="btn" href="${targetUrl}">فتح منصة GOLDRIX الآن</a>
  </div>
  <script>
    setTimeout(function() {
      window.location.replace("${targetUrl}");
    }, 350);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="GOLDRIX-App.html"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(launcherHtml);
  });

  // Official Shortcut File Download (GOLDRIX.url)
  app.get(['/GOLDRIX.url', '/api/download/shortcut', '/api/v1/download/shortcut'], (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'ais-dev-hloghgofbdwzb52dnlzjyh-242909076674.europe-west2.run.app';
    const targetUrl = `${protocol}://${host}/`;
    const shortcutContent = `[InternetShortcut]\r\nURL=${targetUrl}\r\nIconFile=${targetUrl}pwa-512x512.png\r\nIconIndex=0\r\n`;
    res.setHeader('Content-Type', 'application/internet-shortcut');
    res.setHeader('Content-Disposition', 'attachment; filename="GOLDRIX.url"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(shortcutContent);
  });

  // Ensure unmatched /api/* routes always return JSON instead of falling through to SPA HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Keep old /admin paths hidden by redirecting to normal member root
  app.get(['/admin', '/admin/*', '/member', '/members', '/member/*', '/members/*'], (_req, res) => {
    res.redirect('/');
  });

  if (!isProd) {
    // Development mode: Mount Vite dev server middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('[Server] Vite middleware integrated in development mode.');
  } else {
    // Production mode: Serve pre-built static files from dist with no-cache on index.html
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          }
        },
      })
    );

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Serving static production build from dist.');
  }

  // Global Express Error Handler
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server] Express error handler:', err?.message || err);
    if (req.path.startsWith('/api/')) {
      res.status(err?.status || 500).json({
        error: err?.message || 'Internal server error',
      });
    } else {
      res.status(500).send('Internal Server Error');
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GOLDRIX Engine] Platform live and listening on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('[Server] HTTP server error:', err);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
