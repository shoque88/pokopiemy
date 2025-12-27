import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUserOrNextAuth } from '@/lib/middleware';

// Wymuś dynamiczne renderowanie (używa cookies)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // authUser.userId jest już zweryfikowane w getAuthUserOrNextAuth
    const user = await db.users.get(authUser.userId);
    if (!user) {
      console.error('GET /api/auth/me: User not found (should not happen)', { userId: authUser.userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferred_level: user.preferred_level,
      is_admin: user.is_admin === 1,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
