import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { sendInvitationEmail, isEmailConfigured } from '../services/emailService';
import { auditLog } from '../services/auditService';

const router = Router();

router.use(requireAuth);

// Generate a short uppercase code (6 chars)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// POST /api/invitations - create invitation
router.post('/', requireRole('admin', 'secretary', 'teacher', 'principal'), async (req: AuthRequest, res: Response) => {
  const { child_last_name, child_first_name, class_ref, parent_email, expires_hours = 168 } = req.body; // Default 7 days

  const token = uuidv4();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + Number(expires_hours) * 60 * 60 * 1000).toISOString();

  const result = db.prepare(`
    INSERT INTO invitations (token, code, child_last_name, child_first_name, class_ref, expires_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    token,
    code,
    child_last_name || null,
    child_first_name || null,
    class_ref || null,
    expiresAt,
    req.user!.userId
  );

  const invitation = db.prepare('SELECT * FROM invitations WHERE id = ?').get(result.lastInsertRowid) as any;

  await auditLog({
    eventType: 'invitation_created',
    actorType: 'staff',
    actorId: String(req.user!.userId),
    details: { invitationId: invitation.id, class_ref, child_last_name, child_first_name },
    ipAddress: req.ip,
  });

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.FRONTEND_URL || 'http://localhost:5173';
  const activationUrl = `${origin}/activate?token=${token}`;

  // Send invitation email if email is provided and configured
  if (parent_email && isEmailConfigured()) {
    try {
      const childName = child_first_name && child_last_name
        ? `${child_first_name} ${child_last_name}`
        : (child_first_name || child_last_name || 'your child');
      await sendInvitationEmail(parent_email, childName, activationUrl, code);
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Email failure does not block invitation creation
    }
  }

  return res.status(201).json({
    invitation: {
      ...invitation,
      activationUrl,
    },
  });
});

// GET /api/invitations - list invitations
router.get('/', requireRole('admin', 'secretary', 'teacher', 'principal'), (req: AuthRequest, res: Response) => {
  const { status, class_ref, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let conditions: string[] = [];
  let params: any[] = [];

  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }

  if (class_ref) {
    conditions.push('i.class_ref = ?');
    params.push(class_ref);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const invitations = db.prepare(`
    SELECT i.*, u.name as created_by_name,
      c.id as case_id, c.status as case_status
    FROM invitations i
    LEFT JOIN users u ON u.id = i.created_by
    LEFT JOIN cases c ON c.invitation_id = i.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset) as any[];

  const total = (db.prepare(`
    SELECT COUNT(*) as count FROM invitations i ${whereClause}
  `).get(...params) as any).count;

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.FRONTEND_URL || 'http://localhost:5173';

  return res.json({
    invitations: invitations.map(inv => ({
      ...inv,
      activationUrl: `${origin}/activate?token=${inv.token}`,
    })),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

// DELETE /api/invitations/:id - revoke invitation
router.delete('/:id', requireRole('admin', 'secretary', 'principal'), async (req: AuthRequest, res: Response) => {
  const invitation = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id) as any;

  if (!invitation) {
    return res.status(404).json({ error: 'Einladung nicht gefunden' });
  }

  if (invitation.status === 'completed') {
    return res.status(400).json({ error: 'Eine abgeschlossene Einladung kann nicht widerrufen werden' });
  }

  db.prepare(`UPDATE invitations SET status = 'expired' WHERE id = ?`).run(invitation.id);

  await auditLog({
    eventType: 'invitation_revoked',
    actorType: 'staff',
    actorId: String(req.user!.userId),
    details: { invitationId: invitation.id },
    ipAddress: req.ip,
  });

  return res.json({ message: 'Invitation revoked' });
});

export default router;
