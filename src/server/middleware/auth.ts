import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Request, RequestHandler } from 'express';

export interface AuthContext { userId: string; role: string }
export interface PosUser { id: string; email: string; role: string; fullName?: string }

// Shared with the existing application Bearer/JWT authentication path.
export function verifyBearerAuth(req: Request, secret: string): AuthContext {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Error('Authentication required');
  const decoded = jwt.verify(header.split(' ')[1], secret) as jwt.JwtPayload;
  return { userId: decoded.userId, role: decoded.role };
}

interface PosAuthDependencies {
  authenticate: (req: Request) => AuthContext;
  findUser: (id: string) => Promise<PosUser | null>;
  logger: { warn: (fields: Record<string, unknown>, message: string) => void };
}

export function requirePosOperator(deps: PosAuthDependencies): RequestHandler {
  return async (req, res, next) => {
    const request = req as Request & { auth?: AuthContext; user?: PosUser; requestId?: string };
    const reject = (status: number, code: string, message: string) => {
      const supplied = request.requestId || req.get('x-request-id');
      const requestId = supplied && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied) ? supplied : randomUUID();
      request.requestId = requestId;
      res.setHeader('X-Request-Id', requestId);
      return res.status(status).json({ error: { code, message, details: {}, requestId } });
    };
    let auth: AuthContext;
    try {
      auth = deps.authenticate(req);
      if (typeof auth.userId !== 'string' || !auth.userId) throw new Error('Invalid identity');
    } catch {
      reject(401, 'AUTH_REQUIRED', 'Authentication required to access Web POS endpoints.');
      return;
    }
    let user: PosUser | null;
    try {
      user = await deps.findUser(auth.userId);
    } catch {
      reject(500, 'INTERNAL_ERROR', 'An unexpected internal error occurred');
      return;
    }
    if (!user || user.id !== auth.userId || !['owner', 'admin'].includes(user.role)) {
      deps.logger.warn({ event: 'pos_unauthorized_access', ip: req.ip, userId: auth.userId, role: user?.role }, 'Forbidden Web POS access');
      reject(403, 'FORBIDDEN', 'Insufficient permissions. Web POS access is restricted to store administrators and owners.');
      return;
    }
    request.auth = { userId: user.id, role: user.role };
    request.user = user;
    next();
  };
}
