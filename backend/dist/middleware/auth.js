"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireParentSession = requireParentSession;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../database"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}
function requireAuth(req, res, next) {
    const token = req.cookies['staff-token'];
    if (!token) {
        res.status(401).json({ error: 'Authentifizierung erforderlich' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check user is still active
        const user = database_1.default.prepare('SELECT id, is_active, locked_until FROM users WHERE id = ?').get(payload.userId);
        if (!user || !user.is_active) {
            res.status(401).json({ error: 'Konto ist deaktiviert' });
            return;
        }
        req.user = payload;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Ungültiger oder abgelaufener Token' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentifizierung erforderlich' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Unzureichende Berechtigung' });
            return;
        }
        next();
    };
}
function requireParentSession(req, res, next) {
    const sessionId = req.cookies['parent-session'];
    if (!sessionId) {
        res.status(401).json({ error: 'Eltern-Sitzung erforderlich' });
        return;
    }
    const session = database_1.default.prepare(`
    SELECT ps.*, i.id as invitation_id, i.status as invitation_status
    FROM parent_sessions ps
    JOIN invitations i ON i.id = ps.invitation_id
    WHERE ps.session_id = ? AND ps.expires_at > datetime('now')
  `).get(sessionId);
    if (!session) {
        res.status(401).json({ error: 'Ungültige oder abgelaufene Sitzung' });
        return;
    }
    req.parentSessionId = sessionId;
    req.parentInvitationId = session.invitation_id;
    next();
}
//# sourceMappingURL=auth.js.map