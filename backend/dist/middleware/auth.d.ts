import { Request, Response, NextFunction } from 'express';
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
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function requireParentSession(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map