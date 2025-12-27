import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireSuperuser } from '@/lib/superuser-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSuperuser(request);

    const allUsers = await db.users.all();
    
    // Zwróć użytkowników bez haseł
    const users = allUsers.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferred_level: user.preferred_level,
      can_create_matches: user.can_create_matches !== undefined ? user.can_create_matches : 1,
      can_register_to_matches: user.can_register_to_matches !== undefined ? user.can_register_to_matches : 1,
      is_admin: user.is_admin === 1,
      is_superuser: user.is_superuser === 1,
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


