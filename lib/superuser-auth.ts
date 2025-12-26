import { NextRequest } from 'next/server';
import { verifyToken } from './auth';
import db from './db';

export interface SuperuserAuthResult {
  userId: number;
  isSuperuser: boolean;
}

export function getSuperuserAuth(request: NextRequest): SuperuserAuthResult | null {
  const token = request.cookies.get('superuser_token')?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  return {
    userId: decoded.userId,
    isSuperuser: true,
  };
}

export async function requireSuperuser(request: NextRequest): Promise<SuperuserAuthResult> {
  const auth = getSuperuserAuth(request);
  if (!auth) {
    throw new Error('Unauthorized');
  }

  // Sprawdź czy użytkownik nadal jest superuserem
  const user = await db.users.get(auth.userId);
  if (!user || !user.is_superuser || user.is_superuser !== 1) {
    throw new Error('Unauthorized');
  }

  return auth;
}

