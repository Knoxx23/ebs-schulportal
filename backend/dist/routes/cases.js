"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const documentService_1 = require("../services/documentService");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// GET /api/cases - list cases with filters
router.get('/', (req, res) => {
    const { status, class_ref, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;
    let conditions = [];
    let params = [];
    if (status) {
        conditions.push('c.status = ?');
        params.push(status);
    }
    if (class_ref) {
        conditions.push('i.class_ref = ?');
        params.push(class_ref);
    }
    if (search) {
        conditions.push('(c.last_name LIKE ? OR c.first_name LIKE ? OR c.guardian_name LIKE ?)');
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const cases = database_1.default.prepare(`
    SELECT
      c.id, c.status, c.last_name, c.first_name, c.birth_date,
      c.gender, c.guardian_name, c.phone, c.email,
      c.enrollment_year, c.submitted_at, c.updated_at, c.created_at,
      c.return_note, c.approved_at,
      i.class_ref, i.expires_at,
      u.name as approved_by_name
    FROM cases c
    JOIN invitations i ON i.id = c.invitation_id
    LEFT JOIN users u ON u.id = c.approved_by
    ${whereClause}
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);
    const total = database_1.default.prepare(`
    SELECT COUNT(*) as count FROM cases c
    JOIN invitations i ON i.id = c.invitation_id
    ${whereClause}
  `).get(...params).count;
    // Status counts for dashboard
    const statusCounts = database_1.default.prepare(`
    SELECT status, COUNT(*) as count FROM cases GROUP BY status
  `).all();
    return res.json({
        cases,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
        statusCounts: statusCounts.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
        }, {}),
    });
});
// GET /api/cases/:id - case detail with audit history
router.get('/:id', (req, res) => {
    const caseRecord = database_1.default.prepare(`
    SELECT c.*,
      i.class_ref, i.token, i.expires_at, i.created_at as invitation_created_at,
      u.name as approved_by_name,
      creator.name as created_by_name
    FROM cases c
    JOIN invitations i ON i.id = c.invitation_id
    LEFT JOIN users u ON u.id = c.approved_by
    LEFT JOIN users creator ON creator.id = i.created_by
    WHERE c.id = ?
  `).get(req.params.id);
    if (!caseRecord) {
        return res.status(404).json({ error: 'Case nicht gefunden' });
    }
    const auditHistory = database_1.default.prepare(`
    SELECT al.*, u.name as staff_name
    FROM audit_log al
    LEFT JOIN users u ON u.id = CAST(al.actor_id AS INTEGER) AND al.actor_type = 'staff'
    WHERE al.case_id = ?
    ORDER BY al.created_at DESC
    LIMIT 50
  `).all(caseRecord.id);
    return res.json({
        case: caseRecord,
        auditHistory: auditHistory.map(entry => ({
            ...entry,
            details: entry.details ? JSON.parse(entry.details) : null,
        })),
    });
});
// PUT /api/cases/:id - update case (staff corrections)
router.put('/:id', (0, auth_1.requireRole)('admin', 'secretary', 'principal'), async (req, res) => {
    const caseRecord = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
    if (!caseRecord) {
        return res.status(404).json({ error: 'Case nicht gefunden' });
    }
    if (caseRecord.status === 'approved' || caseRecord.status === 'archived') {
        return res.status(403).json({ error: 'Abgeschlossene Cases können nicht bearbeitet werden' });
    }
    const { last_name, first_name, birth_date, birth_place, gender, nationality, guardian_name, guardian_street, guardian_zip, guardian_city, phone, email, kindergarten, enrollment_year, enrollment_date, future_path, future_school, future_notes, } = req.body;
    if (future_path && !['A', 'B', 'C', 'D'].includes(future_path)) {
        return res.status(400).json({ error: 'Ungültiger future_path Wert' });
    }
    database_1.default.prepare(`
    UPDATE cases SET
      last_name = ?, first_name = ?, birth_date = ?, birth_place = ?, gender = ?, nationality = ?,
      guardian_name = ?, guardian_street = ?, guardian_zip = ?, guardian_city = ?,
      phone = ?, email = ?,
      kindergarten = ?, enrollment_year = ?, enrollment_date = ?,
      future_path = ?, future_school = ?, future_notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(last_name || null, first_name || null, birth_date || null, birth_place || null, gender || null, nationality || null, guardian_name || null, guardian_street || null, guardian_zip || null, guardian_city || null, phone || null, email || null, kindergarten || null, enrollment_year || null, enrollment_date || null, future_path || null, future_school || null, future_notes || null, caseRecord.id);
    await (0, auditService_1.auditLog)({
        eventType: 'case_updated_by_staff',
        actorType: 'staff',
        actorId: String(req.user.userId),
        caseId: caseRecord.id,
        details: { updatedFields: Object.keys(req.body) },
        ipAddress: req.ip,
    });
    const updated = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(caseRecord.id);
    return res.json({ case: updated });
});
// POST /api/cases/:id/approve - approve case + trigger document generation
router.post('/:id/approve', (0, auth_1.requireRole)('admin', 'secretary', 'principal'), async (req, res) => {
    const caseRecord = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
    if (!caseRecord) {
        return res.status(404).json({ error: 'Case nicht gefunden' });
    }
    if (caseRecord.status !== 'submitted') {
        return res.status(400).json({ error: 'Nur eingereichte Cases können genehmigt werden' });
    }
    try {
        const { documentPath, documentHash } = await (0, documentService_1.generateDocument)(caseRecord);
        // Calculate retention date (10 years from now)
        const retentionDate = new Date();
        retentionDate.setFullYear(retentionDate.getFullYear() + 10);
        database_1.default.prepare(`
      UPDATE cases SET
        status = 'approved',
        approved_at = datetime('now'),
        approved_by = ?,
        document_path = ?,
        document_hash = ?,
        retention_delete_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(req.user.userId, documentPath, documentHash, retentionDate.toISOString(), caseRecord.id);
        await (0, auditService_1.auditLog)({
            eventType: 'case_approved',
            actorType: 'staff',
            actorId: String(req.user.userId),
            caseId: caseRecord.id,
            details: { documentPath, documentHash },
            ipAddress: req.ip,
        });
        const updated = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(caseRecord.id);
        return res.json({ case: updated, message: 'Case approved and document generated' });
    }
    catch (error) {
        console.error('Document generation error:', error);
        // Still approve even if doc generation fails
        database_1.default.prepare(`
      UPDATE cases SET status = 'approved', approved_at = datetime('now'), approved_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(req.user.userId, caseRecord.id);
        await (0, auditService_1.auditLog)({
            eventType: 'case_approved',
            actorType: 'staff',
            actorId: String(req.user.userId),
            caseId: caseRecord.id,
            details: { documentError: error.message },
            ipAddress: req.ip,
        });
        const updated = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(caseRecord.id);
        return res.json({ case: updated, message: 'Case approved (document generation had issues)' });
    }
});
// POST /api/cases/:id/return - return to parent with note
router.post('/:id/return', (0, auth_1.requireRole)('admin', 'secretary', 'principal'), async (req, res) => {
    const { note } = req.body;
    if (!note || note.trim().length < 5) {
        return res.status(400).json({ error: 'Eine Rückgabenote ist erforderlich (mindestens 5 Zeichen)' });
    }
    const caseRecord = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
    if (!caseRecord) {
        return res.status(404).json({ error: 'Case nicht gefunden' });
    }
    if (caseRecord.status !== 'submitted') {
        return res.status(400).json({ error: 'Nur eingereichte Cases können zurückgesendet werden' });
    }
    database_1.default.prepare(`
    UPDATE cases SET status = 'returned', return_note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(note.trim(), caseRecord.id);
    // Allow parent to re-edit: reset invitation status if needed
    database_1.default.prepare(`
    UPDATE invitations SET status = 'activated' WHERE id = ?
  `).run(caseRecord.invitation_id);
    await (0, auditService_1.auditLog)({
        eventType: 'case_returned',
        actorType: 'staff',
        actorId: String(req.user.userId),
        caseId: caseRecord.id,
        details: { note: note.trim() },
        ipAddress: req.ip,
    });
    const updated = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(caseRecord.id);
    return res.json({ case: updated });
});
exports.default = router;
//# sourceMappingURL=cases.js.map