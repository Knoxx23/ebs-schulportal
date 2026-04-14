import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Validate JWT_SECRET early
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long');
  process.exit(1);
}

import { initDatabase, db } from './database';
import authRouter from './routes/auth';
import parentRouter from './routes/parent';
import casesRouter from './routes/cases';
import invitationsRouter from './routes/invitations';
import documentsRouter from './routes/documents';
import adminRouter from './routes/admin';
import passwordResetRouter from './routes/passwordReset';
import { startReminderService } from './services/reminderService';
import { startRetentionService } from './services/retentionService';
import { logError } from './services/loggerService';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure documents directory exists
const documentsDir = path.resolve(process.env.DOCUMENTS_PATH || './documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Trust proxy (for reverse proxies like nginx/Coolify)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS - in production, only allow same-origin (frontend served from same server)
app.use(cors({
  origin: isProduction ? false : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser(process.env.COOKIE_SECRET || 'fallback-secret'));

// CSRF protection middleware (double-submit cookie pattern)
app.use((req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Set CSRF token cookie if not present
    if (!req.cookies['csrf-token']) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('csrf-token', token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      });
    }
    return next();
  }

  // Skip CSRF for parent activation and auth login (no session to protect)
  if (req.path === '/api/parent/activate' || req.path === '/api/auth/login' || req.path === '/api/auth/reset-password' || req.path === '/api/auth/request-reset') {
    return next();
  }

  // Validate CSRF token for state-changing requests
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Ungültiger CSRF-Token' });
  }

  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/auth', passwordResetRouter);
app.use('/api/parent', parentRouter);
app.use('/api/cases', casesRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Serve built frontend (production mode)
// In Docker, frontend is at /app/frontend/dist; locally at ../../frontend/dist
const frontendDist = process.env.FRONTEND_DIST_PATH
  ? path.resolve(process.env.FRONTEND_DIST_PATH)
  : path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    maxAge: isProduction ? '1d' : 0,
  }));
  // SPA fallback: all non-API routes serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.warn('Frontend dist not found at', frontendDist, '- serving API only');
  app.use((_req, res) => {
    res.status(404).json({ error: 'Nicht gefunden. Frontend zuerst bauen: cd frontend && npm run build' });
  });
}

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  logError(err, { path: req.path, method: req.method });
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// Async startup
async function main() {
  await initDatabase();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`  EBS Server running on port ${PORT}`);
    console.log(`  Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`========================================\n`);

    // Start background services
    if (process.env.NODE_ENV !== 'test') {
      startReminderService();
      startRetentionService();
    }
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
