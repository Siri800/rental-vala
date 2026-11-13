import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface AuthPayload {
  userId: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;

  if (!token) {
    return next(new ApiError(401, 'Authentication required. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    next(new ApiError(401, 'Session expired or invalid token.'));
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    const hasRole = req.user.roles.some(
      (role) => role === 'SUPER_ADMIN' || allowedRoles.includes(role)
    );
    if (!hasRole) {
      return next(new ApiError(403, 'You do not have permission to access this resource.'));
    }
    next();
  };
}