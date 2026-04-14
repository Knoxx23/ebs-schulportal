"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const emailService_1 = require("../services/emailService");
const auditService_1 = require("../services/auditService");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Generate a short uppercase code (6 chars)
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const bytes = crypto_1.default.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}
// POST /api/invitations - create invitation
router.post('/', (0, auth_1.requireRole)('admin', 'secretary', 'teacher', 'principal'), async (req, res) => {
    const { child_last_name, child_first_name, class_ref, parent_email, expires_hours = 168 } = req.body; // Default 7 days
    const token = (0, uuid_1.v4)();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + Number(expires_hours) * 60 * 60 * 1000).toISOString();
    const result = database_1.default.prepare(`
    INSERT INTO invitations (token, code, child_last_name, child_first_name, class_ref, expires_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(token, code, child_last_name || null, child_first_name || null, class_ref || null, expiresAt, req.user.userId);
    const invitation = database_1.default.prepare('SELECT * FROM invitations WHERE id = ?').get(result.lastInsertRowid);
    await (0, auditService_1.auditLog)({
        eventType: 'invitation_created',
        actorType: 'staff',
        actorId: String(req.user.userId),
        details: { invitationId: invitation.id, class_ref, child_last_name, child_first_name },
        ipAddress: req.ip,
    });
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationUrl = `${origin}/activate?token=${token}`;
    // Send invitation email if email is provided and configured
    if (parent_email && (0, emailService_1.isEmailConfigured)()) {
        try {
            const childName = child_first_name && child_last_name
                ? `${child_first_name} ${child_last_name}`
                : (child_first_name || child_last_name || 'your child');
            await (0, emailService_1.sendInvitationEmail)(parent_email, childName, activationUrl, code);
        }
        catch (error) {
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
router.get('/', (0, auth_1.requireRole)('admin', 'secretary', 'teacher', 'principal'), (req, res) => {
    const { status, class_ref, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;
    let conditions = [];
    let params = [];
    if (status) {
        conditions.push('i.status = ?');
        params.push(status);
    }
    if (class_ref) {
        conditions.push('i.class_ref = ?');
        params.push(class_ref);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const invitations = database_1.default.prepare(`
    SELECT i.*, u.name as created_by_name,
      c.id as case_id, c.status as case_status
    FROM invitations i
    LEFT JOIN users u ON u.id = i.created_by
    LEFT JOIN cases c ON c.invitation_id = i.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);
    const total = database_1.default.prepare(`
    SELECT COUNT(*) as count FROM invitations i ${whereClause}
  `).get(...params).count;
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
router.delete('/:id', (0, auth_1.requireRole)('admin', 'secretary', 'principal'), async (req, res) => {
    const invitation = database_1.default.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.id);
    if (!invitation) {
        return res.status(404).json({ error: 'Einladung nicht gefunden' });
    }
    if (invitation.status === 'completed') {
        return res.status(400).json({ error: 'Eine abgeschlossene Einladung kann nicht widerrufen werden' });
    }
    database_1.default.prepare(`UPDATE invitations SET status = 'expired' WHERE id = ?`).run(invitation.id);
    await (0, auditService_1.auditLog)({
        eventType: 'invitation_revoked',
        actorType: 'staff',
        actorId: String(req.user.userId),
        details: { invitationId: invitation.id },
        ipAddress: req.ip,
    });
    return res.json({ message: 'Invitation revoked' });
});
exports.default = router;
//# sourceMappingURL=invitations.js.map