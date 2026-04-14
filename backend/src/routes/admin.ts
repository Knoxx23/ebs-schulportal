import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { auditLog } from '../services/auditService';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/users - list staff users
router.get('/users', (_req: AuthRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, email, name, role, is_active, created_at, last_login, failed_attempts, locked_until
    FROM users
    ORDER BY name ASC
  `).all() as any[];

  return res.json({ users });
});

// POST /api/admin/users - create staff user
router.post('/users', async (req: AuthRequest, res: Response) => {
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

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (existingUser) {
    return res.status(409).json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run(email.toLowerCase().trim(), passwordHash, name.trim(), role);

  await auditLog({
    eventType: 'user_created',
    actorType: 'staff',
    actorId: String(req.user!.userId),
    details: { newUserId: result.lastInsertRowid, email, role },
    ipAddress: req.ip,
  });

  const newUser = db.prepare('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
  return res.status(201).json({ user: newUser });
});

// PUT /api/admin/users/:id - update role/status
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  const { role, is_active, name, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  // Prevent disabling yourself
  if (req.user!.userId === user.id && is_active === false) {
    return res.status(400).json({ error: 'Sie können Ihren eigenen Account nicht deaktivieren' });
  }

  const updates: any = {};
  const params: any[] = [];
  const setClauses: string[] = [];

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
    const hash = await bcrypt.hash(password, 12);
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
  db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  await auditLog({
    eventType: 'user_updated',
    actorType: 'staff',
    actorId: String(req.user!.userId),
    details: { targetUserId: user.id, updates },
    ipAddress: req.ip,
  });

  const updated = db.prepare('SELECT id, email, name, role, is_active, created_at, last_login FROM users WHERE id = ?').get(user.id) as any;
  return res.json({ user: updated });
});

// GET /api/admin/audit - view audit log
router.get('/audit', (req: AuthRequest, res: Response) => {
  const { event_type, actor_type, case_id, page = '1', limit = '50' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 50, 200);
  const offset = (pageNum - 1) * limitNum;

  let conditions: string[] = [];
  let params: any[] = [];

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

  const entries = db.prepare(`
    SELECT al.*, u.name as staff_name
    FROM audit_log al
    LEFT JOIN users u ON u.id = CAST(al.actor_id AS INTEGER) AND al.actor_type = 'staff'
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset) as any[];

  const total = (db.prepare(`SELECT COUNT(*) as count FROM audit_log al ${whereClause}`).get(...params) as any).count;

  return res.json({
    entries: entries.map(e => ({
      ...e,
      details: e.details ? JSON.parse(e.details) : null,
    })),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

export default router;
