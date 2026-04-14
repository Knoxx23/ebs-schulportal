"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderService = startReminderService;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../database"));
const auditService_1 = require("./auditService");
const loggerService_1 = require("./loggerService");
// Run every hour to check for reminders
function startReminderService() {
    node_cron_1.default.schedule('0 * * * *', async () => {
        console.log('[Reminder Service] Running hourly check...');
        try {
            await checkOverdueSubmissions();
            await checkExpiredInvitations();
        }
        catch (err) {
            (0, loggerService_1.logError)(err, { service: 'reminderService', operation: 'hourlyCheck' });
        }
    });
    console.log('[Reminder Service] Started');
}
async function checkOverdueSubmissions() {
    // Cases in 'returned' status for more than 3 days without resubmission
    const overdueCases = database_1.default.prepare(`
    SELECT c.id, c.last_name, c.first_name, c.email
    FROM cases c
    WHERE c.status = 'returned'
    AND c.updated_at < datetime('now', '-3 days')
    AND c.id NOT IN (SELECT case_id FROM reminders WHERE type = 'email' AND trigger_type = 'overdue_3d' AND status = 'sent')
  `).all();
    for (const c of overdueCases) {
        // In a real system, send an email here
        console.log(`[Reminder] Case ${c.id} (${c.last_name}, ${c.first_name}) is overdue for resubmission`);
        database_1.default.prepare(`
      INSERT INTO reminders (case_id, type, trigger_type, sent_at, status)
      VALUES (?, 'email', 'overdue_3d', datetime('now'), 'sent')
    `).run(c.id);
        await (0, auditService_1.auditLog)({
            eventType: 'reminder_sent',
            actorType: 'system',
            caseId: c.id,
            details: { type: 'overdue_3d', email: c.email },
        });
    }
}
async function checkExpiredInvitations() {
    // Mark expired invitations
    const result = database_1.default.prepare(`
    UPDATE invitations
    SET status = 'expired'
    WHERE status IN ('pending', 'activated')
    AND expires_at < datetime('now')
  `).run();
    if (result.changes > 0) {
        console.log(`[Reminder Service] Marked ${result.changes} invitations as expired`);
        await (0, auditService_1.auditLog)({
            eventType: 'invitations_expired',
            actorType: 'system',
            details: { count: result.changes },
        });
    }
}
//# sourceMappingURL=reminderService.js.map