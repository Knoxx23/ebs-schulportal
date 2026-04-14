import db from '../database';

interface AuditLogEntry {
  eventType: string;
  actorType: 'parent' | 'staff' | 'system';
  actorId?: string;
  caseId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    db.prepare(`
      INSERT INTO audit_log (event_type, actor_type, actor_id, case_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      entry.eventType,
      entry.actorType,
      entry.actorId || null,
      entry.caseId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit logging failure should not break the main flow
  }
}
