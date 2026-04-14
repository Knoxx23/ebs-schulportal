import cron from 'node-cron';
import db from '../database';
import { auditLog } from './auditService';
import { logError } from './loggerService';

// Run every hour to check for reminders
export function startReminderService(): void {
  cron.schedule('0 * * * *', async () => {
    console.log('[Reminder Service] Running hourly check...');
    try {
      await checkOverdueSubmissions();
      await checkExpiredInvitations();
    } catch (err) {
      logError(err as Error, { service: 'reminderService', operation: 'hourlyCheck' });
    }
  });

  console.log('[Reminder Service] Started');
}

async function checkOverdueSubmissions(): Promise<void> {
  // Cases in 'returned' status for more than 3 days without resubmission
  const overdueCases = db.prepare(`
    SELECT c.id, c.last_name, c.first_name, c.email
    FROM cases c
    WHERE c.status = 'returned'
    AND c.updated_at < datetime('now', '-3 days')
    AND c.id NOT IN (SELECT case_id FROM reminders WHERE type = 'email' AND trigger_type = 'overdue_3d' AND status = 'sent')
  `).all() as any[];

  for (const c of overdueCases) {
    // In a real system, send an email here
    console.log(`[Reminder] Case ${c.id} (${c.last_name}, ${c.first_name}) is overdue for resubmission`);

    db.prepare(`
      INSERT INTO reminders (case_id, type, trigger_type, sent_at, status)
      VALUES (?, 'email', 'overdue_3d', datetime('now'), 'sent')
    `).run(c.id);

    await auditLog({
      eventType: 'reminder_sent',
      actorType: 'system',
      caseId: c.id,
      details: { type: 'overdue_3d', email: c.email },
    });
  }
}

async function checkExpiredInvitations(): Promise<void> {
  // Mark expired invitations
  const result = db.prepare(`
    UPDATE invitations
    SET status = 'expired'
    WHERE status IN ('pending', 'activated')
    AND expires_at < datetime('now')
  `).run();

  if (result.changes > 0) {
    console.log(`[Reminder Service] Marked ${result.changes} invitations as expired`);

    await auditLog({
      eventType: 'invitations_expired',
      actorType: 'system',
      details: { count: result.changes },
    });
  }
}
