"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const DOCUMENTS_PATH = path_1.default.resolve(process.env.DOCUMENTS_PATH || './documents');
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// GET /api/documents/:caseId - download generated document
router.get('/:caseId', async (req, res) => {
    const caseRecord = database_1.default.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.caseId);
    if (!caseRecord) {
        return res.status(404).json({ error: 'Case nicht gefunden' });
    }
    if (caseRecord.status !== 'approved') {
        return res.status(400).json({ error: 'Dokument nur für genehmigte Cases verfügbar' });
    }
    if (!caseRecord.document_path) {
        return res.status(404).json({ error: 'Dokument noch nicht generiert' });
    }
    const docPath = path_1.default.resolve(caseRecord.document_path);
    // Path traversal protection: ensure resolved path is within DOCUMENTS_PATH
    if (!docPath.startsWith(DOCUMENTS_PATH)) {
        console.warn(`Attempted path traversal: ${docPath} is outside ${DOCUMENTS_PATH}`);
        return res.status(403).json({ error: 'Zugriff verweigert' });
    }
    if (!fs_1.default.existsSync(docPath)) {
        return res.status(404).json({ error: 'Dokumentdatei nicht auf Server gefunden' });
    }
    await (0, auditService_1.auditLog)({
        eventType: 'document_downloaded',
        actorType: 'staff',
        actorId: String(req.user.userId),
        caseId: caseRecord.id,
        details: { documentPath: caseRecord.document_path },
        ipAddress: req.ip,
    });
    const fileName = `EBS_${caseRecord.last_name}_${caseRecord.first_name}_${caseRecord.id}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return res.sendFile(docPath);
});
exports.default = router;
//# sourceMappingURL=documents.js.map