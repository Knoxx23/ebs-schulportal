"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.use((0, auth_1.requireRole)('admin'));
// GET /api/admin/users - list staff users
router.get('/users', (_req, res) => {
    const users = database_1.default.prepare(`
    SELECT id, email, name, role, is_active, created_at, last_login, failed_attempts, locked_until
    FROM users
    ORDER BY name ASC
  `).all();
    return res.json({ users });
});
// POST /api/admin/users - create staff user
router.post('/users', async (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
        return res.status(400).json({ error: 'Alle Felder erforderlich: Email, Passwort, Name, Rolle' });
    }
    const validRoles = ['teacher', 'secretary', 'principal', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }
    const existingUser = database_1.default.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
        return res.status(409).json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits' });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const result = database_1.default.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run(email.toLowerCase().trim(), passwordHash, name.trim(), role);
    await (0, auditService_1.auditLog)({
        eventType: 'user_created',
        actorType: 'staff',
        actorId: String(req.user.userId),
        details: { newUserId: result.lastInsertRowid, email, role },
        ipAddress: req.ip,
    });
    const newUser = database_1.default.prepare('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ user: newUser });
});
// PUT /api/admin/users/:id - update role/status
router.put('/users/:id', async (req, res) => {
    const { role, is_active, name, password } = req.body;
    const user = database_1.default.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    // Prevent disabling yourself
    if (req.user.userId === user.id && is_active === false) {
        return res.status(400).json({ error: 'Sie können Ihren eigenen Account nicht deaktivieren' });
    }
    const updates = {};
    const params = [];
    const setClauses = [];
    if (role !== undefined) {
        const validRoles = ['teacher', 'secretary', 'principal', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Ungültige Rolle' });
        }
        setClauses.push('role = ?');
        params.push(role);
        updates.role = role;
    }
    if (is_active !== undefined) {
        setClauses.push('is_active = ?');
        params.push(is_active ? 1 : 0);
        updates.is_active = is_active;
    }
    if (name !== undefined) {
        setClauses.push('name = ?');
        params.push(name.trim());
        updates.name = name;
    }
    if (password !== undefined) {
        if (password.length < 8) {
            return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
        }
        const hash = await bcryptjs_1.default.hash(password, 12);
        setClauses.push('password_hash = ?');
        params.push(hash);
        updates.passwordChanged = true;
    }
    // Always reset lock on update
    setClauses.push('failed_attempts = 0', 'locked_until = NULL');
    if (setClauses.length === 0) {
        return res.status(400).json({ error: 'Keine Aktualisierungsfelder bereitgestellt' });
    }
    params.push(user.id);
    database_1.default.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    await (0, auditService_1.auditLog)({
        eventType: 'user_updated',
        actorType: 'staff',
        actorId: String(req.user.userId),
        details: { targetUserId: user.id, updates },
        ipAddress: req.ip,
    });
    const updated = database_1.default.prepare('SELECT id, email, name, role, is_active, created_at, last_login FROM users WHERE id = ?').get(user.id);
    return res.json({ user: updated });
});
// GET /api/admin/audit - view audit log
router.get('/audit', (req, res) => {
    const { event_type, actor_type, case_id, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offset = (pageNum - 1) * limitNum;
    let conditions = [];
    let params = [];
    if (event_type) {
        conditions.push('al.event_type = ?');
        params.push(event_type);
    }
    if (actor_type) {
        conditions.push('al.actor_type = ?');
        params.push(actor_type);
    }
    if (case_id) {
        conditions.push('al.case_id = ?');
        params.push(case_id);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const entries = database_1.default.prepare(`
    SELECT al.*, u.name as staff_name
    FROM audit_log al
    LEFT JOIN users u ON u.id = CAST(al.actor_id AS INTEGER) AND al.actor_type = 'staff'
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);
    const total = database_1.default.prepare(`SELECT COUNT(*) as count FROM audit_log al ${whereClause}`).get(...params).count;
    return res.json({
        entries: entries.map(e => ({
            ...e,
            details: e.details ? JSON.parse(e.details) : null,
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
});
exports.default = router;
//# sourceMappingURL=admin.js.map