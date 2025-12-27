import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUserOrNextAuth } from '@/lib/middleware';
import { sendCancelationEmails } from '@/lib/match-utils';

export const dynamic = 'force-dynamic';

// POST - odwołanie meczu przez organizatora
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const match = await db.matches.get(parseInt(params.id));
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Pobierz dane użytkownika
    // authUser.userId jest już zweryfikowane w getAuthUserOrNextAuth
    const user = await db.users.get(authUser.userId);
    if (!user) {
      console.error('POST /api/matches/[id]/cancel: User not found (should not happen)', { userId: authUser.userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik jest organizatorem meczu lub adminem
    const isOrganizer = (user.phone && user.phone === match.organizer_phone) ||
                        (user.email && user.email === match.organizer_email);
    const isAdmin = authUser.isAdmin;

    if (!isOrganizer && !isAdmin) {
      return NextResponse.json(
        { error: 'Tylko organizator meczu może go odwołać' },
        { status: 403 }
      );
    }

    // Sprawdź czy mecz jest aktywny
    if (match.status !== 'active') {
      return NextResponse.json(
        { error: 'Nie można odwołać meczu, który nie jest aktywny' },
        { status: 400 }
      );
    }

    // Usuń wszystkie zapisy dla odwołanego meczu
    await db.registrations.deleteByMatch(parseInt(params.id));

    // Wyślij e-maile do zapisanych graczy
    await sendCancelationEmails(
      parseInt(params.id),
      match.name,
      match.location,
      match.date_start
    );

    // Zmień status meczu na 'canceled'
    await db.matches.update(parseInt(params.id), { status: 'canceled' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

