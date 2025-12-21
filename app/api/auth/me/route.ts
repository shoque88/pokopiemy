import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { getCurrentUser } from '@/lib/auth-nextauth';

// Wymuś dynamiczne renderowanie (używa cookies)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Sprawdź autoryzację - najpierw przez JWT (dla użytkowników email/hasło), potem przez NextAuth (dla OAuth)
    let authUser = getAuthUser(request);
    let userId: number | null = null;

    if (authUser) {
      // Użytkownik zalogowany przez JWT (email/hasło)
      userId = authUser.userId;
    } else {
      // Sprawdź NextAuth session (dla OAuth użytkowników)
      const nextAuthUser = await getCurrentUser();
      if (nextAuthUser) {
        userId = nextAuthUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.users.get(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      favorite_position: user.favorite_position,
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
