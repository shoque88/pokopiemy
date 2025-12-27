import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUserOrNextAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// DELETE - anulowanie rejestracji
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const registration = await db.registrations.get(parseInt(params.id));
    
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik jest właścicielem rejestracji lub adminem
    if (registration.user_id !== authUser.userId && !authUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await db.registrations.delete(parseInt(params.id));

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
