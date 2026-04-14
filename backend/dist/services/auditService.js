"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
const database_1 = __importDefault(require("../database"));
async function auditLog(entry) {
    try {
        database_1.default.prepare(`
      INSERT INTO audit_log (event_type, actor_type, actor_id, case_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entry.eventType, entry.actorType, entry.actorId || null, entry.caseId || null, entry.details ? JSON.stringify(entry.details) : null, entry.ipAddress || null);
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw - audit logging failure should not break the main flow
    }
}
//# sourceMappingURL=auditService.js.map