import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// POST - zapisanie się na mecz
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id } = await request.json();

    if (!match_id) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Sprawdź czy mecz istnieje i jest aktywny
    const match = await db.matches.get(match_id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot register for inactive match' },
        { status: 400 }
      );
    }

    // Sprawdź czy użytkownik już jest zapisany
    const existing = await db.registrations.findByMatchAndUser(match_id, authUser.userId);
    if (existing) {
      return NextResponse.json(
        { error: 'Already registered for this match' },
        { status: 400 }
      );
    }

    // Sprawdź limit graczy
    const registeredCount = await db.registrations.countByMatch(match_id);
    if (registeredCount >= match.max_players) {
      return NextResponse.json(
        { error: 'Match is full' },
        { status: 400 }
      );
    }

    // Zapisz użytkownika
    const registration = await db.registrations.create({
      match_id,
      user_id: authUser.userId,
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Failed to create registration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        match_id,
        user_id: authUser.userId,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
