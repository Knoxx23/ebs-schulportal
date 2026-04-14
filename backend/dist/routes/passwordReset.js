"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../database"));
const auditService_1 = require("../services/auditService");
const emailService_1 = require("../services/emailService");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
// POST /api/auth/request-reset - request password reset
router.post('/request-reset', rateLimit_1.requestResetLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'E-Mail erforderlich' });
    }
    // Always return success to prevent email enumeration
    const successMessage = 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.';
    const user = database_1.default.prepare('SELECT id, email, name FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
    if (!user) {
        return res.json({ message: successMessage });
    }
    // Invalidate old reset tokens
    database_1.default.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);
    // Generate reset token
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    database_1.default.prepare(`
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, resetToken, expiresAt);
    // Send email
    await (0, emailService_1.sendPasswordResetEmail)(user.email, user.name, resetToken);
    await (0, auditService_1.auditLog)({
        eventType: 'password_reset_requested',
        actorType: 'staff',
        actorId: String(user.id),
        details: {},
        ipAddress: req.ip,
    });
    return res.json({ message: successMessage });
});
// POST /api/auth/reset-password - reset password with token
router.post('/reset-password', rateLimit_1.resetLimiter, async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }
    const resetRecord = database_1.default.prepare(`
    SELECT pr.*, u.id as user_id, u.email, u.name
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')
  `).get(token);
    if (!resetRecord) {
        return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Link' });
    }
    // Hash new password
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    // Update password
    database_1.default.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?')
        .run(passwordHash, resetRecord.user_id);
    // Mark token as used
    database_1.default.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
    await (0, auditService_1.auditLog)({
        eventType: 'password_reset_completed',
        actorType: 'staff',
        actorId: String(resetRecord.user_id),
        details: {},
        ipAddress: req.ip,
    });
    return res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
});
exports.default = router;
//# sourceMappingURL=passwordReset.js.map