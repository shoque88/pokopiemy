import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import { requireSuperuser } from '@/lib/superuser-auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSuperuser(request);

    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Pobierz użytkownika
    const user = await db.users.get(auth.userId);
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'User not found or password cannot be changed' },
        { status: 404 }
      );
    }

    // Sprawdź aktualne hasło
    if (!comparePassword(current_password, user.password)) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Zaktualizuj hasło
    const hashedPassword = hashPassword(new_password);
    await db.users.update(auth.userId, {
      password: hashedPassword,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


