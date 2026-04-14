import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  parentSessionId?: string;
  parentInvitationId?: number;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies['staff-token'];

  if (!token) {
    res.status(401).json({ error: 'Authentifizierung erforderlich' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as JwtPayload;

    // Check user is still active
    const user = db.prepare('SELECT id, is_active, locked_until FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Konto ist deaktiviert' });
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Ungültiger oder abgelaufener Token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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

export function requireParentSession(req: AuthRequest, res: Response, next: NextFunction): void {
  const sessionId = req.cookies['parent-session'];

  if (!sessionId) {
    res.status(401).json({ error: 'Eltern-Sitzung erforderlich' });
    return;
  }

  const session = db.prepare(`
    SELECT ps.*, i.id as invitation_id, i.status as invitation_status
    FROM parent_sessions ps
    JOIN invitations i ON i.id = ps.invitation_id
    WHERE ps.session_id = ? AND ps.expires_at > datetime('now')
  `).get(sessionId) as any;

  if (!session) {
    res.status(401).json({ error: 'Ungültige oder abgelaufene Sitzung' });
    return;
  }

  req.parentSessionId = sessionId;
  req.parentInvitationId = session.invitation_id;
  next();
}
