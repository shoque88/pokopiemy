import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUserOrNextAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// PUT - aktualizacja profilu użytkownika
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sprawdź czy użytkownik edytuje swój profil lub jest adminem
    if (parseInt(params.id) !== authUser.userId && !authUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, phone, preferred_level } = await request.json();

    // Pobierz aktualnego użytkownika, aby sprawdzić czy ma tymczasowy email
    const currentUser = await db.users.get(parseInt(params.id));
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isTemporaryEmail = currentUser.email?.endsWith('@pokopiemy.local');

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (preferred_level !== undefined) updates.preferred_level = preferred_level;
    
    // Pozwól na zmianę email tylko jeśli użytkownik ma tymczasowy email
    if (email !== undefined && isTemporaryEmail) {
      // Sprawdź czy nowy email nie jest już używany
      if (email && email.trim() !== '') {
        const existingUser = await db.users.findByEmail(email.trim());
        if (existingUser && existingUser.id !== parseInt(params.id)) {
          return NextResponse.json(
            { error: 'Ten email jest już używany przez innego użytkownika' },
            { status: 400 }
          );
        }
        updates.email = email.trim();
      }
    }

    const updatedUser = await db.users.update(parseInt(params.id), updates);

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      preferred_level: updatedUser.preferred_level,
      is_admin: updatedUser.is_admin === 1,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
