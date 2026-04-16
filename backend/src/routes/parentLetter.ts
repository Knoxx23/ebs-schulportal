import { Router, Response } from 'express';
import db from '../database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = Router();
router.use(requireAuth);

// GET /api/parent-letter/:invitationId - generate parent letter PDF with QR code
router.get('/:invitationId', requireRole('admin', 'secretary', 'teacher', 'principal'), async (req: AuthRequest, res: Response) => {
  const invitation = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.invitationId) as any;

  if (!invitation) {
    return res.status(404).json({ error: 'Einladung nicht gefunden' });
  }

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.FRONTEND_URL || 'http://localhost:5173';
  const activationUrl = `${origin}/activate?token=${invitation.token}`;

  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(activationUrl, {
    errorCorrectionLevel: 'M',
    width: 250,
    margin: 2,
  });

  const childName = [invitation.child_first_name, invitation.child_last_name].filter(Boolean).join(' ') || 'Ihr Kind';
  const classRef = invitation.class_ref || '';
  const code = invitation.code || '';

  // Build PDF
  const doc = new PDFDocument({ size: 'A4', margin: 60 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Elternbrief_${childName.replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────────
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor('#1a3a5c')
    .text('Einschulungsblatt – Online-Anmeldung', { align: 'center' });

  doc.moveDown(0.4);
  doc
    .fontSize(13)
    .font('Helvetica')
    .fillColor('#444')
    .text('Bitte füllen Sie das Formular für Ihr Kind online aus.', { align: 'center' });

  doc.moveDown(1.2);

  // ── Divider ──────────────────────────────────────────────────────────────
  doc
    .moveTo(60, doc.y)
    .lineTo(535, doc.y)
    .strokeColor('#1a3a5c')
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(1);

  // ── Child info ───────────────────────────────────────────────────────────
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#1a3a5c')
    .text('Angaben zum Kind');

  doc.moveDown(0.4);

  const infoY = doc.y;
  doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#222');

  const labelX = 60;
  const valueX = 200;

  doc.text('Name:', labelX, infoY);
  doc.font('Helvetica-Bold').text(childName, valueX, infoY);

  if (classRef) {
    doc.moveDown(0.3);
    const classY = doc.y;
    doc.font('Helvetica').text('Klasse:', labelX, classY);
    doc.font('Helvetica-Bold').text(classRef, valueX, classY);
  }

  doc.moveDown(1.5);

  // ── Instructions ─────────────────────────────────────────────────────────
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#1a3a5c')
    .text('So geht\'s:');

  doc.moveDown(0.5);

  const steps = [
    '1.  Scannen Sie den QR-Code mit Ihrem Smartphone.',
    '2.  Sie werden direkt auf das Anmeldeformular weitergeleitet.',
    '3.  Füllen Sie alle Felder vollständig aus.',
    '4.  Bestätigen Sie die Eingaben am Ende des Formulars.',
  ];

  doc.fontSize(12).font('Helvetica').fillColor('#222');
  steps.forEach(step => {
    doc.text(step, { indent: 10 });
    doc.moveDown(0.3);
  });

  doc.moveDown(0.8);

  // ── QR Code + URL ─────────────────────────────────────────────────────────
  const qrX = 60;
  const qrY = doc.y;
  const qrSize = 180;

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // Right side of QR: direct link info
  const textX = qrX + qrSize + 30;
  const textW = 535 - textX;

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1a3a5c')
    .text('Direktlink:', textX, qrY, { width: textW });

  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#555')
    .text(activationUrl, textX, doc.y, { width: textW });

  doc.moveDown(1.5);

  // ── Code box ─────────────────────────────────────────────────────────────
  const boxY = qrY + qrSize + 20;
  doc.y = boxY;

  doc
    .moveTo(60, boxY)
    .lineTo(535, boxY)
    .strokeColor('#cccccc')
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.8);

  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor('#1a3a5c')
    .text('Ihr persönlicher Zugangscode:', { align: 'center' });

  doc.moveDown(0.4);

  // Code in large styled box
  const codeBoxX = 180;
  const codeBoxY = doc.y;
  const codeBoxW = 175;
  const codeBoxH = 48;

  doc
    .roundedRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 8)
    .fillColor('#1a3a5c')
    .fill();

  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text(code, codeBoxX, codeBoxY + 10, { width: codeBoxW, align: 'center' });

  doc.y = codeBoxY + codeBoxH + 14;
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666')
    .text('Bitte halten Sie diesen Code bereit. Er wird beim Öffnen des Formulars abgefragt.', { align: 'center' });

  doc.moveDown(1.5);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc
    .moveTo(60, doc.y)
    .lineTo(535, doc.y)
    .strokeColor('#cccccc')
    .lineWidth(1)
    .stroke();

  doc.moveDown(0.5);
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#999')
    .text(
      'Dieses Schreiben wurde automatisch erstellt. Bei Fragen wenden Sie sich bitte an das Schulsekretariat.',
      { align: 'center' }
    );

  doc.end();
});

export default router;
