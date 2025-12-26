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
    const skipLevelFilter = searchParams.get('skipLevelFilter') === 'true';

    // Pobierz zalogowanego użytkownika (jeśli istnieje) do filtrowania po poziomie
    const { getAuthUserOrNextAuth } = await import('@/lib/middleware');
    const authUser = await getAuthUserOrNextAuth(request);
    let userPreferredLevel: string | null = null;
    
    if (authUser) {
      const user = await db.users.get(authUser.userId);
      if (user && user.preferred_level) {
        userPreferredLevel = user.preferred_level;
      }
    }

    let matches = await db.matches.all();

    // Filtrowanie
    if (status) {
      matches = matches.filter((m: any) => m.status === status);
    }

    if (location) {
      const searchTerm = location.toLowerCase();
      matches = matches.filter((m: any) => 
        m.location.toLowerCase().includes(searchTerm) ||
        m.name.toLowerCase().includes(searchTerm)
      );
    }

    if (dateFrom) {
      const dateFromParsed = parseISO(dateFrom);
      matches = matches.filter((m: any) => 
        parseISO(m.date_start) >= dateFromParsed
      );
    }

    // Filtrowanie po poziomie użytkownika (jeśli użytkownik jest zalogowany i ma ustawiony poziom)
    // Pomijamy filtrowanie jeśli skipLevelFilter=true (np. dla strony "moje mecze")
    if (userPreferredLevel && !skipLevelFilter) {
      matches = matches.filter((m: any) => m.level === userPreferredLevel);
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
            preferred_level: user.preferred_level,
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

// POST - utworzenie meczu (dla wszystkich zalogowanych użytkowników)
export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację - obsługuje zarówno JWT jak i NextAuth
    const { getAuthUserOrNextAuth } = await import('@/lib/middleware');
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Pobierz dane użytkownika
    const user = await db.users.get(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik może tworzyć mecze
    if (user.can_create_matches !== undefined && user.can_create_matches !== 1) {
      return NextResponse.json(
        { error: 'Tworzenie meczów jest zablokowane dla Twojego konta' },
        { status: 403 }
      );
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
      level,
      is_recurring,
      recurrence_frequency,
      registration_start,
      registration_end,
      entry_fee,
      is_free,
    } = await request.json();

    // Dla zwykłych użytkowników, użyj ich telefonu jako organizer_phone (jeśli nie podano)
    // Admini mogą podać własny telefon
    const finalOrganizerPhone = authUser.isAdmin 
      ? (organizer_phone || user.phone || '')
      : (user.phone || organizer_phone || '');

    if (!name || !date_start || !date_end || !location || !max_players || !finalOrganizerPhone || !level) {
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
      organizer_phone: finalOrganizerPhone,
      payment_methods: JSON.stringify(payment_methods || []),
      level: level || 'kopanina',
      status: 'active',
      is_recurring: is_recurring ? 1 : 0,
      recurrence_frequency: recurrence_frequency || null,
      registration_start: registration_start || null,
      registration_end: registration_end || null,
      entry_fee: entry_fee || null,
      is_free: is_free ? 1 : 0,
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
