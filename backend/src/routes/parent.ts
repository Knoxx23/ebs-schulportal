import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { requireParentSession, AuthRequest } from '../middleware/auth';
import { parentActivateRateLimit } from '../middleware/rateLimit';
import { auditLog } from '../services/auditService';
import PDFDocument from 'pdfkit';

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
    birth_country, immigration_year, confession, mother_tongue, aussiedler,
    guardian_name, guardian_street, guardian_zip, guardian_city,
    phone, email, emergency_phone,
    guardian_1_last_name, guardian_1_first_name, guardian_1_birth_country,
    guardian_2_last_name, guardian_2_first_name, guardian_2_birth_country,
    kindergarten, enrollment_year, enrollment_date,
    last_school_type, last_school_name, graduation_expected, graduation_class,
    future_path, future_school, future_notes,
    future_company_name, future_company_phone, future_company_address, future_job_title,
    future_duration_from, future_duration_to,
    future_school_address, future_school_class,
    future_berufsfeld,
    future_measure_name, future_measure_org, future_measure_from, future_measure_to,
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
      birth_country = ?, immigration_year = ?, confession = ?, mother_tongue = ?, aussiedler = ?,
      guardian_name = ?, guardian_street = ?, guardian_zip = ?, guardian_city = ?,
      phone = ?, email = ?, emergency_phone = ?,
      guardian_1_last_name = ?, guardian_1_first_name = ?, guardian_1_birth_country = ?,
      guardian_2_last_name = ?, guardian_2_first_name = ?, guardian_2_birth_country = ?,
      kindergarten = ?, enrollment_year = ?, enrollment_date = ?,
      last_school_type = ?, last_school_name = ?, graduation_expected = ?, graduation_class = ?,
      future_path = ?, future_school = ?, future_notes = ?,
      future_company_name = ?, future_company_phone = ?, future_company_address = ?, future_job_title = ?,
      future_duration_from = ?, future_duration_to = ?,
      future_school_address = ?, future_school_class = ?,
      future_berufsfeld = ?,
      future_measure_name = ?, future_measure_org = ?, future_measure_from = ?, future_measure_to = ?,
      language = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    last_name || null, first_name || null, birth_date || null, birth_place || null,
    gender || null, nationality || null,
    birth_country || null, immigration_year || null, confession || null, mother_tongue || null, aussiedler || null,
    guardian_name || null, guardian_street || null, guardian_zip || null, guardian_city || null,
    phone || null, email || null, emergency_phone || null,
    guardian_1_last_name || null, guardian_1_first_name || null, guardian_1_birth_country || null,
    guardian_2_last_name || null, guardian_2_first_name || null, guardian_2_birth_country || null,
    kindergarten || null, enrollment_year || null, enrollment_date || null,
    last_school_type || null, last_school_name || null, graduation_expected || null, graduation_class || null,
    future_path || null, future_school || null, future_notes || null,
    future_company_name || null, future_company_phone || null, future_company_address || null, future_job_title || null,
    future_duration_from || null, future_duration_to || null,
    future_school_address || null, future_school_class || null,
    future_berufsfeld || null,
    future_measure_name || null, future_measure_org || null, future_measure_from || null, future_measure_to || null,
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

  // Create PDF document
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="meine-daten-dsgvo.pdf"');
  
  doc.pipe(res);
  
  // Header
  doc.fontSize(20).text('DSGVO-Datenauskunft (Art. 15 DSGVO)', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Erstellt am: ${new Date().toLocaleString('de-DE')}`, { align: 'right' });
  doc.moveDown(2);
  
  // Section 1: Child Data
  doc.fontSize(16).text('1. Daten des Kindes', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
     .text(`Name: ${caseRecord.first_name || '-'} ${caseRecord.last_name || '-'}`)
     .text(`Geburtsdatum: ${caseRecord.birth_date ? new Date(caseRecord.birth_date).toLocaleDateString('de-DE') : '-'}`)
     .text(`Geburtsort: ${caseRecord.birth_place || '-'}`)
     .text(`Geschlecht: ${caseRecord.gender || '-'}`)
     .text(`Staatsangehörigkeit: ${caseRecord.nationality || '-'}`);
  doc.moveDown();
  
  // Section 2: Guardian Data
  doc.fontSize(16).text('2. Daten der Erziehungsberechtigten', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
     .text(`Name: ${caseRecord.guardian_name || '-'}`)
     .text(`Straße: ${caseRecord.guardian_street || '-'}`)
     .text(`PLZ/Ort: ${caseRecord.guardian_zip || '-'} ${caseRecord.guardian_city || '-'}`)
     .text(`Telefon: ${caseRecord.phone || '-'}`)
     .text(`E-Mail: ${caseRecord.email || '-'}`);
  doc.moveDown();
  
  // Section 3: School Data
  doc.fontSize(16).text('3. Schullaufbahn', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
     .text(`Kindergarten/Kita: ${caseRecord.kindergarten || '-'}`)
     .text(`Einschulungsjahr: ${caseRecord.enrollment_year || '-'}`)
     .text(`Aufnahmedatum: ${caseRecord.enrollment_date ? new Date(caseRecord.enrollment_date).toLocaleDateString('de-DE') : '-'}`)
     .text(`Künftige Tätigkeit: ${caseRecord.future_path || '-'}`)
     .text(`Künftige Schule: ${caseRecord.future_school || '-'}`)
     .text(`Bemerkungen: ${caseRecord.future_notes || '-'}`);
  doc.moveDown();
  
  // Section 4: Metadata & Consent
  doc.fontSize(16).text('4. Metadaten & Einwilligungen', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12)
     .text(`Fall-ID: ${caseRecord.id}`)
     .text(`Status: ${caseRecord.status}`)
     .text(`Sprache: ${caseRecord.language}`)
     .text(`Erstellt am: ${new Date(caseRecord.created_at).toLocaleString('de-DE')}`);
  
  if (caseRecord.submitted_at) {
    doc.text(`Eingereicht am: ${new Date(caseRecord.submitted_at).toLocaleString('de-DE')}`);
  }
  
  doc.moveDown();
  doc.fontSize(14).text('Protokollierte Einwilligungen:');
  if (consentLogs.length === 0) {
    doc.fontSize(12).text('- Keine Einwilligungen gefunden');
  } else {
    consentLogs.forEach((log: any) => {
      doc.fontSize(12).text(`- ${log.consent_type} am ${new Date(log.given_at).toLocaleString('de-DE')} (IP: ${log.ip_address || 'Unbekannt'})`);
    });
  }
  
  doc.moveDown();
  doc.fontSize(14).text('Aktivitätsprotokoll (Audit Log):');
  if (auditLogs.length === 0) {
    doc.fontSize(12).text('- Keine Aktivitäten gefunden');
  } else {
    auditLogs.slice(0, 10).forEach((log: any) => { // Limit to 10 to avoid huge PDFs
      doc.fontSize(12).text(`- ${new Date(log.created_at).toLocaleString('de-DE')}: ${log.event_type} (${log.actor_type})`);
    });
    if (auditLogs.length > 10) {
      doc.fontSize(12).text(`- ... und ${auditLogs.length - 10} weitere Einträge`);
    }
  }
  
  doc.end();
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
    birth_country: c.birth_country,
    immigration_year: c.immigration_year,
    confession: c.confession,
    mother_tongue: c.mother_tongue,
    aussiedler: c.aussiedler,
    guardian_name: c.guardian_name,
    guardian_street: c.guardian_street,
    guardian_zip: c.guardian_zip,
    guardian_city: c.guardian_city,
    phone: c.phone,
    email: c.email,
    emergency_phone: c.emergency_phone,
    guardian_1_last_name: c.guardian_1_last_name,
    guardian_1_first_name: c.guardian_1_first_name,
    guardian_1_birth_country: c.guardian_1_birth_country,
    guardian_2_last_name: c.guardian_2_last_name,
    guardian_2_first_name: c.guardian_2_first_name,
    guardian_2_birth_country: c.guardian_2_birth_country,
    kindergarten: c.kindergarten,
    enrollment_year: c.enrollment_year,
    enrollment_date: c.enrollment_date,
    last_school_type: c.last_school_type,
    last_school_name: c.last_school_name,
    graduation_expected: c.graduation_expected,
    graduation_class: c.graduation_class,
    future_path: c.future_path,
    future_school: c.future_school,
    future_notes: c.future_notes,
    future_company_name: c.future_company_name,
    future_company_phone: c.future_company_phone,
    future_company_address: c.future_company_address,
    future_job_title: c.future_job_title,
    future_duration_from: c.future_duration_from,
    future_duration_to: c.future_duration_to,
    future_school_address: c.future_school_address,
    future_school_class: c.future_school_class,
    future_berufsfeld: c.future_berufsfeld,
    future_measure_name: c.future_measure_name,
    future_measure_org: c.future_measure_org,
    future_measure_from: c.future_measure_from,
    future_measure_to: c.future_measure_to,
    language: c.language,
    updated_at: c.updated_at,
    submitted_at: c.submitted_at,
    return_note: c.return_note,
  };
}

export default router;
