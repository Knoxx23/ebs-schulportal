import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { auditLog } from '../services/auditService';

const DOCUMENTS_PATH = path.resolve(process.env.DOCUMENTS_PATH || './documents');

const router = Router();

router.use(requireAuth);

// GET /api/documents/:caseId - download generated document
router.get('/:caseId', async (req: AuthRequest, res: Response) => {
  const caseRecord = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.caseId) as any;

  if (!caseRecord) {
    return res.status(404).json({ error: 'Case nicht gefunden' });
  }

  if (caseRecord.status !== 'approved') {
    return res.status(400).json({ error: 'Dokument nur für genehmigte Cases verfügbar' });
  }

  if (!caseRecord.document_path) {
    return res.status(404).json({ error: 'Dokument noch nicht generiert' });
  }

  const docPath = path.resolve(caseRecord.document_path);

  // Path traversal protection: ensure resolved path is within DOCUMENTS_PATH
  if (!docPath.startsWith(DOCUMENTS_PATH)) {
    console.warn(`Attempted path traversal: ${docPath} is outside ${DOCUMENTS_PATH}`);
    return res.status(403).json({ error: 'Zugriff verweigert' });
  }

  if (!fs.existsSync(docPath)) {
    return res.status(404).json({ error: 'Dokumentdatei nicht auf Server gefunden' });
  }

  await auditLog({
    eventType: 'document_downloaded',
    actorType: 'staff',
    actorId: String(req.user!.userId),
    caseId: caseRecord.id,
    details: { documentPath: caseRecord.document_path },
    ipAddress: req.ip,
  });

  const fileName = `EBS_${caseRecord.last_name}_${caseRecord.first_name}_${caseRecord.id}.docx`;

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  return res.sendFile(docPath);
});

export default router;
