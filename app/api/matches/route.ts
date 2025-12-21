import { NextRequest, NextResponse } from 'next/server';
import '@/lib/init'; // Inicjalizacja bazy danych
import db from '@/lib/db';
import { Match, MatchWithRegistrations } from '@/lib/types';
import { updateMatchStatuses } from '@/lib/match-utils';
import { parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET - lista meczów
export async function GET(request: NextRequest) {
  try {
    // Aktualizuj statusy meczów przed pobraniem
    await updateMatchStatuses();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const status = searchParams.get('status') || 'active';
    const dateFrom = searchParams.get('dateFrom');

    let matches = await db.matches.all();

    // Filtrowanie
    if (status) {
      matches = matches.filter((m: any) => m.status === status);
    }

    if (location) {
      matches = matches.filter((m: any) => 
        m.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (dateFrom) {
      const dateFromParsed = parseISO(dateFrom);
      matches = matches.filter((m: any) => 
        parseISO(m.date_start) >= dateFromParsed
      );
    }

    // Sortowanie
    matches.sort((a: any, b: any) => 
      parseISO(a.date_start).getTime() - parseISO(b.date_start).getTime()
    );

    const matchesWithRegistrations: MatchWithRegistrations[] = await Promise.all(matches.map(async (match: any) => {
      const registrations = await db.registrations.findByMatch(match.id);
      const users = await db.users.all();

      const registrationsWithUsers = registrations.map((reg: any) => {
        const user = users.find((u: any) => u.id === reg.user_id);
        return {
          id: reg.id,
          match_id: reg.match_id,
          user_id: reg.user_id,
          created_at: reg.created_at,
          user: user ? {
            id: user.id,
            name: user.name,
            phone: user.phone,
            favorite_position: user.favorite_position,
          } : null,
        };
      }).filter((reg: any) => reg.user !== null);

      const paymentMethods = typeof match.payment_methods === 'string' 
        ? JSON.parse(match.payment_methods || '[]')
        : match.payment_methods || [];

      return {
        ...match,
        payment_methods: paymentMethods,
        is_recurring: match.is_recurring === 1 || match.is_recurring === true,
        registrations: registrationsWithUsers,
        registered_count: registrations.length,
      };
    }));

    return NextResponse.json(matchesWithRegistrations);
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - utworzenie meczu (tylko admin)
export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację - obsługuje zarówno JWT jak i NextAuth
    const { getAuthUserOrNextAuth } = await import('@/lib/middleware');
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser || !authUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      name,
      description,
      date_start,
      date_end,
      location,
      max_players,
      organizer_phone,
      payment_methods,
      is_recurring,
      recurrence_frequency,
    } = await request.json();

    if (!name || !date_start || !date_end || !location || !max_players || !organizer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newMatch = await db.matches.create({
      name,
      description: description || null,
      date_start,
      date_end,
      location,
      max_players,
      organizer_phone,
      payment_methods: JSON.stringify(payment_methods || []),
      status: 'active',
      is_recurring: is_recurring ? 1 : 0,
      recurrence_frequency: recurrence_frequency || null,
    });

    const paymentMethods = typeof newMatch.payment_methods === 'string' 
      ? JSON.parse(newMatch.payment_methods || '[]')
      : newMatch.payment_methods || [];

    return NextResponse.json({
      ...newMatch,
      payment_methods: paymentMethods,
      is_recurring: newMatch.is_recurring === 1 || newMatch.is_recurring === true,
    });
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
