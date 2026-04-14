import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../database';
import { auditLog } from '../services/auditService';
import { sendPasswordResetEmail } from '../services/emailService';
import { requestResetLimiter, resetLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/auth/request-reset - request password reset
router.post('/request-reset', requestResetLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-Mail erforderlich' });
  }

  // Always return success to prevent email enumeration
  const successMessage = 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.';

  const user = db.prepare('SELECT id, email, name FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim()) as any;

  if (!user) {
    return res.json({ message: successMessage });
  }

  // Invalidate old reset tokens
  db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(`
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, resetToken, expiresAt);

  // Send email
  await sendPasswordResetEmail(user.email, user.name, resetToken);

  await auditLog({
    eventType: 'password_reset_requested',
    actorType: 'staff',
    actorId: String(user.id),
    details: {},
    ipAddress: req.ip,
  });

  return res.json({ message: successMessage });
});

// POST /api/auth/reset-password - reset password with token
router.post('/reset-password', resetLimiter, async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
  }

  const resetRecord = db.prepare(`
    SELECT pr.*, u.id as user_id, u.email, u.name
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')
  `).get(token) as any;

  if (!resetRecord) {
    return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Link' });
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Update password
  db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?')
    .run(passwordHash, resetRecord.user_id);

  // Mark token as used
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

  await auditLog({
    eventType: 'password_reset_completed',
    actorType: 'staff',
    actorId: String(resetRecord.user_id),
    details: {},
    ipAddress: req.ip,
  });

  return res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
});

export default router;
