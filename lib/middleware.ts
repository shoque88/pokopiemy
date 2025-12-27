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

// Funkcja pomocnicza do sprawdzania autoryzacji - obsługuje zarówno JWT jak i NextAuth
export async function getAuthUserOrNextAuth(request: NextRequest) {
  // Najpierw sprawdź JWT (dla użytkowników email/hasło)
  const jwtUser = getAuthUser(request);
  if (jwtUser) {
    // Sprawdź, czy użytkownik rzeczywiście istnieje w bazie danych
    const db = await import('./db');
    const user = await db.default.users.get(jwtUser.userId);
    if (!user) {
      console.error('getAuthUserOrNextAuth: JWT user does not exist in database', { userId: jwtUser.userId });
      return null;
    }
    return {
      userId: user.id,
      isAdmin: user.is_admin === 1,
      isOAuth: false,
    };
  }

  // Jeśli nie ma JWT, sprawdź NextAuth session (dla OAuth użytkowników)
  const nextAuthUser = await getCurrentUser();
  if (nextAuthUser) {
    console.log('getAuthUserOrNextAuth: NextAuth user found', { userId: nextAuthUser.id, isAdmin: nextAuthUser.isAdmin, oauthProvider: nextAuthUser.oauthProvider, oauthId: nextAuthUser.oauthId });
    return {
      userId: nextAuthUser.id,
      isAdmin: nextAuthUser.isAdmin || false,
      isOAuth: !!nextAuthUser.oauthProvider,
      oauthProvider: nextAuthUser.oauthProvider,
      oauthId: nextAuthUser.oauthId,
    };
  }

  console.log('getAuthUserOrNextAuth: No user found (no JWT, no NextAuth session)');
  return null;
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
