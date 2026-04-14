"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../database"));
const rateLimit_1 = require("../middleware/rateLimit");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}
router.post('/login', rateLimit_1.loginRateLimit, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }
    const user = database_1.default.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
    if (!user) {
        await (0, auditService_1.auditLog)({
            eventType: 'login_failed',
            actorType: 'staff',
            actorId: email,
            details: { reason: 'user_not_found' },
            ipAddress: req.ip,
        });
        return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });
    }
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(423).json({
            error: 'Konto ist temporär gesperrt aufgrund zu vieler fehlgeschlagener Versuche',
            lockedUntil: user.locked_until,
        });
    }
    const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValid) {
        const newAttempts = (user.failed_attempts || 0) + 1;
        let lockedUntil = null;
        if (newAttempts >= 5) {
            // Lock for 15 minutes
            lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        database_1.default.prepare(`
      UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?
    `).run(newAttempts, lockedUntil, user.id);
        await (0, auditService_1.auditLog)({
            eventType: 'login_failed',
            actorType: 'staff',
            actorId: String(user.id),
            details: { attempts: newAttempts, locked: !!lockedUntil },
            ipAddress: req.ip,
        });
        if (lockedUntil) {
            return res.status(423).json({
                error: 'Zu viele fehlgeschlagene Anmeldeversuche. Konto für 15 Minuten gesperrt.',
                lockedUntil,
            });
        }
        return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });
    }
    // Reset failed attempts on success
    database_1.default.prepare(`
    UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?
  `).run(user.id);
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
    };
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    await (0, auditService_1.auditLog)({
        eventType: 'login_success',
        actorType: 'staff',
        actorId: String(user.id),
        details: { role: user.role },
        ipAddress: req.ip,
    });
    // Set cookie
    res.cookie('staff-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/',
    });
    return res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
    });
});
router.post('/logout', auth_1.requireAuth, async (req, res) => {
    await (0, auditService_1.auditLog)({
        eventType: 'logout',
        actorType: 'staff',
        actorId: String(req.user?.userId),
        details: {},
        ipAddress: req.ip,
    });
    res.clearCookie('staff-token', { path: '/' });
    res.clearCookie('csrf-token', { path: '/' });
    return res.json({ message: 'Logged out successfully' });
});
router.get('/me', auth_1.requireAuth, (req, res) => {
    const user = database_1.default.prepare('SELECT id, email, name, role, is_active, last_login FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    return res.json({ user });
});
exports.default = router;
//# sourceMappingURL=auth.js.map