interface AuditLogEntry {
    eventType: string;
    actorType: 'parent' | 'staff' | 'system';
    actorId?: string;
    caseId?: number;
    details?: Record<string, any>;
    ipAddress?: string;
}
export declare function auditLog(entry: AuditLogEntry): Promise<void>;
export {};
//# sourceMappingURL=auditService.d.ts.map