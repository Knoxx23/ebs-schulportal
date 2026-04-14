"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRetentionService = startRetentionService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../database"));
const auditService_1 = require("./auditService");
const RETENTION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
function startRetentionService() {
    console.log('Retention service started');
    // Run initial check after 1 hour
    setTimeout(() => {
        performRetentionCheck();
    }, 60 * 60 * 1000);
    // Schedule recurring check every 24 hours
    setInterval(() => {
        performRetentionCheck();
    }, RETENTION_CHECK_INTERVAL);
}
async function performRetentionCheck() {
    try {
        console.log('[Retention] Checking for cases ready for deletion...');
        // Find all cases where retention_delete_at has passed
        const casesToDelete = database_1.default.prepare(`
      SELECT * FROM cases
      WHERE retention_delete_at IS NOT NULL
        AND retention_delete_at <= datetime('now')
        AND deleted_at IS NULL
    `).all();
        if (casesToDelete.length === 0) {
            console.log('[Retention] No cases to delete');
            return;
        }
        console.log(`[Retention] Found ${casesToDelete.length} case(s) to delete`);
        const documentsDir = path_1.default.resolve(process.env.DOCUMENTS_PATH || './documents');
        for (const caseRecord of casesToDelete) {
            try {
                // Delete document files if they exist
                if (caseRecord.document_path) {
                    const fullPath = path_1.default.resolve(documentsDir, caseRecord.document_path);
                    if (fs_1.default.existsSync(fullPath)) {
                        fs_1.default.unlinkSync(fullPath);
                        console.log(`[Retention] Deleted document: ${caseRecord.document_path}`);
                    }
                }
                // Soft-delete the case
                database_1.default.prepare(`
          UPDATE cases SET deleted_at = datetime('now')
          WHERE id = ?
        `).run(caseRecord.id);
                // Log the retention deletion
                await (0, auditService_1.auditLog)({
                    eventType: 'retention_auto_delete',
                    actorType: 'system',
                    caseId: caseRecord.id,
                    details: { reason: 'retention_period_expired' },
                    ipAddress: undefined,
                });
                console.log(`[Retention] Case ${caseRecord.id} soft-deleted`);
            }
            catch (err) {
                console.error(`[Retention] Error processing case ${caseRecord.id}:`, err);
            }
        }
        console.log(`[Retention] Retention check completed - ${casesToDelete.length} case(s) processed`);
    }
    catch (err) {
        console.error('[Retention] Error in retention check:', err);
    }
}
//# sourceMappingURL=retentionService.js.map