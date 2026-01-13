import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db-neon';
import { getAuthUserOrNextAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// POST - zbanowanie gracza z meczu przez organizatora
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sprawdź czy parametr to liczba (ID) czy string (private_token)
    const isNumeric = /^\d+$/.test(params.id);
    let match;
    
    if (isNumeric) {
      const matchId = parseInt(params.id);
      match = await db.matches.get(matchId);
    } else {
      match = await db.matches.findByPrivateToken(params.id);
    }
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Pobierz dane użytkownika
    const user = await db.users.get(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik jest organizatorem meczu lub adminem
    const isOrganizer = (user.phone && user.phone === match.organizer_phone) ||
                        (user.email && user.email === match.organizer_email);
    const isAdmin = authUser.isAdmin;

    if (!isOrganizer && !isAdmin) {
      return NextResponse.json(
        { error: 'Tylko organizator meczu może zbanować gracza' },
        { status: 403 }
      );
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Sprawdź czy gracz nie jest organizatorem
    const userToBan = await db.users.get(user_id);
    if (!userToBan) {
      return NextResponse.json({ error: 'User to ban not found' }, { status: 404 });
    }

    const isUserToBanOrganizer = (userToBan.phone && userToBan.phone === match.organizer_phone) ||
                                 (userToBan.email && userToBan.email === match.organizer_email);
    
    if (isUserToBanOrganizer) {
      return NextResponse.json(
        { error: 'Nie można zbanować organizatora meczu' },
        { status: 400 }
      );
    }

    // Dodaj ban
    const ban = await db.match_bans.create(match.id, user_id);
    
    if (!ban) {
      // Ban już istnieje
      return NextResponse.json({ success: true, message: 'Gracz jest już zbanowany' });
    }

    // Usuń rejestrację gracza (jeśli istnieje)
    const existingRegistration = await db.registrations.findByMatchAndUser(match.id, user_id);
    if (existingRegistration) {
      await db.registrations.delete(existingRegistration.id);
      
      // Jeśli to była normalna rejestracja (nie z listy rezerwowej) i mecz jest pełny, przenieś pierwszą osobę z listy rezerwowej
      const wasWaitlist = (existingRegistration.is_waitlist || 0) === 1;
      if (!wasWaitlist) {
        const waitlist = await db.registrations.findWaitlistByMatch(match.id);
        if (waitlist.length > 0) {
          const firstWaitlistUser = waitlist[0];
          await db.registrations.moveFromWaitlist(match.id, firstWaitlistUser.user_id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
