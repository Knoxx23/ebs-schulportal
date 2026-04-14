import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { requireParentSession, AuthRequest } from '../middleware/auth';
import { parentActivateRateLimit } from '../middleware/rateLimit';
import { auditLog } from '../services/auditService';

const router = Router();

// POST /api/parent/activate - validate token+code, create session
router.post('/activate', parentActivateRateLimit, async (req: Request, res: Response) => {
  const { token, code } = req.body;

  if (!token || !code) {
    return res.status(400).json({ error: 'Token und Code erforderlich' });
  }

  const trimmedToken = token.trim();
  const trimmedCode = code.trim().toUpperCase();

  const invitation = db.prepare(`
    SELECT * FROM invitations
    WHERE token = ? AND code = ? AND expires_at > datetime('now')
  `).get(trimmedToken, trimmedCode) as any;

  if (!invitation) {
    await auditLog({
      eventType: 'activation_failed',
      actorType: 'parent',
      details: { token: token.substring(0, 8) + '...', reason: 'invalid_token_or_code' },
      ipAddress: req.ip,
    });
    return res.status(400).json({ error: 'Ungültiger oder abgelaufener Aktivierungscode' });
  }

  if (invitation.status === 'expired') {
    return res.status(400).json({ error: 'Diese Einladung ist abgelaufen' });
  }

  if (invitation.status === 'completed') {
    return res.status(400).json({ error: 'Diese Einladung wurde bereits abgeschlossen' });
  }

  // Create or retrieve case
  let caseRecord = db.prepare('SELECT * FROM cases WHERE invitation_id = ?').get(invitation.id) as any;

  if (!caseRecord) {
    const result = db.prepare(`
      INSERT INTO cases (invitation_id, status, last_name, first_name, language)
      VALUES (?, 'draft', ?, ?, 'de')
    `).run(invitation.id, invitation.child_last_name || '', invitation.child_first_name || '');

    caseRecord = db.prepare('SELECT * FROM cases WHERE id = ?').get(result.lastInsertRowid) as any;
  }

  // Create session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  db.prepare(`
    INSERT INTO parent_sessions (session_id, invitation_id, expires_at, ip_address)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, invitation.id, expiresAt, req.ip);

  // Update invitation status
  if (invitation.status === 'pending') {
    db.prepare(`
      UPDATE invitations SET status = 'activated', activated_at = datetime('now'), session_id = ?
      WHERE id = ?
    `).run(sessionId, invitation.id);
  }

  await auditLog({
    eventType: 'invitation_activated',
    actorType: 'parent',
    caseId: caseRecord.id,
    details: { invitationId: invitation.id },
    ipAddress: req.ip,
  });

  // Set parent session cookie
  res.cookie('parent-session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });

  return res.json({
    message: 'Activation successful',
    case: sanitizeCaseForParent(caseRecord),
    invitation: {
      childLastName: invitation.child_last_name,
      childFirstName: invitation.child_first_name,
      classRef: invitation.class_ref,
    },
  });
});

// GET /api/parent/case - get current case
router.get('/case', requireParentSession, (req: AuthRequest, res: Response) => {
  const caseRecord = db.prepare(`
    SELECT c.* FROM cases c
    JOIN invitations i ON i.id = c.invitation_id
    WHERE c.invitation_id = ?
  `).get(req.parentInvitationId) as any;

  if (!caseRecord) {
    return res.status(404).json({ error: 'Case nicht gefunden' });
  }

  return res.json({ case: sanitizeCaseForParent(caseRecord) });
});

// PUT /api/parent/case - save/update case (auto-save)
router.put('/case', requireParentSession, async (req: AuthRequest, res: Response) => {
  const caseRecord = db.prepare(`
    SELECT c.* FROM cases c
    WHERE c.invitation_id = ?
  `).get(req.parentInvitationId) as any;

  if (!caseRecord) {
    return res.status(404).json({ error: 'Case nicht gefunden' });
  }

  if (caseRecord.status === 'approved' || caseRecord.status === 'archived') {
    return res.status(403).json({ error: 'Abgeschlossene Cases können nicht bearbeitet werden' });
  }

  const {
    last_name, first_name, birth_date, birth_place, gender, nationality,
    guardian_name, guardian_street, guardian_zip, guardian_city,
    phone, email,
    kindergarten, enrollment_year, enrollment_date,
    future_path, future_school, future_notes,
    language,
    consent_given,
    consent_timestamp,
  } = req.body;

  // Validate future_path
  if (future_path && !['A', 'B', 'C', 'D'].includes(future_path)) {
    return res.status(400).json({ error: 'Ungültiger future_path Wert' });
  }

  db.prepare(`
    UPDATE cases SET
      last_name = ?, first_name = ?, birth_date = ?, birth_place = ?, gender = ?, nationality = ?,
      guardian_name = ?, guardian_street = ?, guardian_zip = ?, guardian_city = ?,
      phone = ?, email = ?,
      kindergarten = ?, enrollment_year = ?, enrollment_date = ?,
      future_path = ?, future_school = ?, future_notes = ?,
      language = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    last_name || null, first_name || null, birth_date || null, birth_place || null,
    gender || null, nationality || null,
    guardian_name || null, guardian_street || null, guardian_zip || null, guardian_city || null,
    phone || null, email || null,
    kindergarten || null, enrollment_year || null, enrollment_date || null,
    future_path || null, future_school || null, future_notes || null,
    language || 'de',
    caseRecord.id
  );

  // Log consent if provided
  if (consent_given === true) {
    db.prepare(`
      INSERT INTO consent_log (case_id, consent_type, given_at, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(
      caseRecord.id,
      'enrollment_data_processing',
      consent_timestamp || new Date().toISOString(),
      req.ip || null
    );
  }

  const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseRecord.id) as any;

  return res.json({ case: sanitizeCaseForParent(updated) });
});

// POST /api/parent/case/submit - submit case
router.post('/case/submit', requireParentSession, async (req: AuthRequest, res: Response) => {
  const caseRecord = db.prepare(`
    SELECT c.* FROM cases c WHERE c.invitation_id = ?
  `).get(req.parentInvitationId) as any;

  if (!caseRecord) {
    return res.status(404).json({ error: 'Case nicht gefunden' });
  }

  if (caseRecord.status === 'submitted' || caseRecord.status === 'approved') {
    return res.status(400).json({ error: 'Case ist bereits eingereicht oder genehmigt' });
  }

  // Validation
  const required = ['last_name', 'first_name', 'birth_date', 'birth_place', 'gender', 'guardian_name', 'guardian_street', 'guardian_zip', 'guardian_city', 'phone'];
  const missing = required.filter(field => !caseRecord[field]);

  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  // Validate German postal code (5 digits)
  if (caseRecord.guardian_zip && !/^\d{5}$/.test(caseRecord.guardian_zip)) {
    return res.status(400).json({ error: 'Postleitzahl muss 5 Ziffern haben' });
  }

  // Validate birth date is in the past
  if (caseRecord.birth_date) {
    const birthDate = new Date(caseRecord.birth_date);
    if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      return res.status(400).json({ error: 'Geburtsdatum muss in der Vergangenheit liegen' });
    }
  }

  // Validate phone number (basic: at least 6 digits)
  if (caseRecord.phone) {
    const digits = caseRecord.phone.replace(/[^0-9]/g, '');
    if (digits.length < 6) {
      return res.status(400).json({ error: 'Telefonnummer ist zu kurz' });
    }
  }

  db.prepare(`
    UPDATE cases SET status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(caseRecord.id);

  // Update invitation status
  db.prepare(`
    UPDATE invitations SET status = 'completed' WHERE id = ?
  `).run(req.parentInvitationId);

  await auditLog({
    eventType: 'case_submitted',
    actorType: 'parent',
    caseId: caseRecord.id,
    details: {},
    ipAddress: req.ip,
  });

  const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseRecord.id) as any;
  return res.json({ case: sanitizeCaseForParent(updated) });
});

// GET /api/parent/case/status - get status (minimal)
router.get('/case/status', requireParentSession, (req: AuthRequest, res: Response) => {
  const caseRecord = db.prepare(`
    SELECT id, status, submitted_at, return_note FROM cases WHERE invitation_id = ?
  `).get(req.parentInvitationId) as any;

  if (!caseRecord) {
    return res.status(404).json({ error: 'Case nicht gefunden' });
  }

  return res.json({
    id: caseRecord.id,
    status: caseRecord.status,
    submittedAt: caseRecord.submitted_at,
    returnNote: caseRecord.status === 'returned' ? caseRecord.return_note : null,
  });
});

// GET /api/parent/case/export - export personal data (DSGVO Art. 15)
router.get('/case/export', requireParentSession, (req: AuthRequest, res: Response) => {
  const caseRecord = db.prepare(`
    SELECT c.* FROM cases c
    WHERE c.invitation_id = ?
  `).get(req.parentInvitationId) as any;

  if (!caseRecord) {
    return res.status(404).json({ error: 'Case nicht gefunden' });
  }

  // Get audit log entries for this case
  const auditLogs = db.prepare(`
    SELECT * FROM audit_log WHERE case_id = ?
    ORDER BY created_at DESC
  `).all(caseRecord.id) as any[];

  // Get consent logs for this case
  const consentLogs = db.prepare(`
    SELECT * FROM consent_log WHERE case_id = ?
    ORDER BY created_at DESC
  `).all(caseRecord.id) as any[];

  // Compile export object
  const exportData = {
    exportedAt: new Date().toISOString(),
    dataSubject: {
      childName: {
        firstName: caseRecord.first_name,
        lastName: caseRecord.last_name,
      },
      childPersonalData: {
        birthDate: caseRecord.birth_date,
        birthPlace: caseRecord.birth_place,
        gender: caseRecord.gender,
        nationality: caseRecord.nationality,
      },
      guardianContactData: {
        name: caseRecord.guardian_name,
        street: caseRecord.guardian_street,
        postalCode: caseRecord.guardian_zip,
        city: caseRecord.guardian_city,
        phone: caseRecord.phone,
        email: caseRecord.email,
      },
    },
    enrollmentData: {
      kindergarten: caseRecord.kindergarten,
      enrollmentYear: caseRecord.enrollment_year,
      enrollmentDate: caseRecord.enrollment_date,
      futurePath: caseRecord.future_path,
      futureSchool: caseRecord.future_school,
      futureNotes: caseRecord.future_notes,
    },
    caseMetadata: {
      caseId: caseRecord.id,
      status: caseRecord.status,
      language: caseRecord.language,
      createdAt: caseRecord.created_at,
      updatedAt: caseRecord.updated_at,
      submittedAt: caseRecord.submitted_at,
      approvedAt: caseRecord.approved_at,
    },
    auditLog: auditLogs,
    consentLog: consentLogs,
    exportLegalBasis: 'DSGVO Art. 15 (Auskunftsrecht / Right of Access)',
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="meine-daten.json"');
  return res.json(exportData);
});

function sanitizeCaseForParent(c: any) {
  return {
    id: c.id,
    status: c.status,
    last_name: c.last_name,
    first_name: c.first_name,
    birth_date: c.birth_date,
    birth_place: c.birth_place,
    gender: c.gender,
    nationality: c.nationality,
    guardian_name: c.guardian_name,
    guardian_street: c.guardian_street,
    guardian_zip: c.guardian_zip,
    guardian_city: c.guardian_city,
    phone: c.phone,
    email: c.email,
    kindergarten: c.kindergarten,
    enrollment_year: c.enrollment_year,
    enrollment_date: c.enrollment_date,
    future_path: c.future_path,
    future_school: c.future_school,
    future_notes: c.future_notes,
    language: c.language,
    updated_at: c.updated_at,
    submitted_at: c.submitted_at,
    return_note: c.return_note,
  };
}

export default router;
