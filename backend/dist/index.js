"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
// Validate JWT_SECRET early
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be set and at least 32 characters long');
    process.exit(1);
}
const database_1 = require("./database");
const auth_1 = __importDefault(require("./routes/auth"));
const parent_1 = __importDefault(require("./routes/parent"));
const cases_1 = __importDefault(require("./routes/cases"));
const invitations_1 = __importDefault(require("./routes/invitations"));
const documents_1 = __importDefault(require("./routes/documents"));
const admin_1 = __importDefault(require("./routes/admin"));
const passwordReset_1 = __importDefault(require("./routes/passwordReset"));
const reminderService_1 = require("./services/reminderService");
const retentionService_1 = require("./services/retentionService");
const loggerService_1 = require("./services/loggerService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
// Ensure documents directory exists
const documentsDir = path_1.default.resolve(process.env.DOCUMENTS_PATH || './documents');
if (!fs_1.default.existsSync(documentsDir)) {
    fs_1.default.mkdirSync(documentsDir, { recursive: true });
}
// Trust proxy (for reverse proxies like nginx/Coolify)
app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: isProduction ? false : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Cookie parsing
app.use((0, cookie_parser_1.default)(process.env.COOKIE_SECRET || 'fallback-secret'));
// CSRF protection middleware (double-submit cookie pattern)
app.use((req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Set CSRF token cookie if not present
        if (!req.cookies['csrf-token']) {
            const token = crypto_1.default.randomBytes(32).toString('hex');
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
app.use('/api/auth', auth_1.default);
app.use('/api/auth', passwordReset_1.default);
app.use('/api/parent', parent_1.default);
app.use('/api/cases', cases_1.default);
app.use('/api/invitations', invitations_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve built frontend (production mode)
// In Docker, frontend is at /app/frontend/dist; locally at ../../frontend/dist
const frontendDist = process.env.FRONTEND_DIST_PATH
    ? path_1.default.resolve(process.env.FRONTEND_DIST_PATH)
    : path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist, {
        maxAge: isProduction ? '1d' : 0,
    }));
    // SPA fallback: all non-API routes serve index.html
    app.get('*', (_req, res) => {
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
else {
    console.warn('Frontend dist not found at', frontendDist, '- serving API only');
    app.use((_req, res) => {
        res.status(404).json({ error: 'Nicht gefunden. Frontend zuerst bauen: cd frontend && npm run build' });
    });
}
// Error handler
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    (0, loggerService_1.logError)(err, { path: req.path, method: req.method });
    res.status(500).json({ error: 'Interner Serverfehler' });
});
// Async startup
async function main() {
    await (0, database_1.initDatabase)();
    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`\n========================================`);
        console.log(`  EBS Server running on port ${PORT}`);
        console.log(`  Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
        console.log(`  URL: http://localhost:${PORT}`);
        console.log(`========================================\n`);
        // Start background services
        if (process.env.NODE_ENV !== 'test') {
            (0, reminderService_1.startReminderService)();
            (0, retentionService_1.startRetentionService)();
        }
    });
}
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map