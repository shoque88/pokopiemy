import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-neon';
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

    // Pobierz informacje o rejestracji przed usunięciem
    const matchId = registration.match_id;
    const wasWaitlist = (registration.is_waitlist || 0) === 1;
    
    const deleted = await db.registrations.delete(parseInt(params.id));

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
    }

    // Jeśli to była normalna rejestracja (nie z listy rezerwowej) i mecz jest pełny, przenieś pierwszą osobę z listy rezerwowej
    if (!wasWaitlist) {
      const waitlist = await db.registrations.findWaitlistByMatch(matchId);
      if (waitlist.length > 0) {
        const firstWaitlistUser = waitlist[0];
        console.log('Registration DELETE: Moving first user from waitlist', {
          matchId,
          waitlistUserId: firstWaitlistUser.user_id,
          waitlistRegistrationId: firstWaitlistUser.id,
        });
        const moved = await db.registrations.moveFromWaitlist(matchId, firstWaitlistUser.user_id);
        if (moved) {
          console.log('Registration DELETE: Successfully moved user from waitlist', {
            matchId,
            movedRegistrationId: moved.id,
            userId: moved.user_id,
          });
        }
      }
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
