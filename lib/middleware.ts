import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { getCurrentUser } from './auth-nextauth';

export function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  
  return verifyToken(token);
}

export async function getAuthUserNextAuth() {
  try {
    return await getCurrentUser();
  } catch (error) {
    console.error('Error in getAuthUserNextAuth:', error);
    return null;
  }
}

export function requireAuth(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export async function requireAuthNextAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export function requireAdmin(request: NextRequest) {
  const user = requireAuth(request);
  if (typeof user === 'object' && 'isAdmin' in user && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}

export async function requireAdminNextAuth() {
  const user = await requireAuthNextAuth();
  if (typeof user === 'object' && 'isAdmin' in user && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}
