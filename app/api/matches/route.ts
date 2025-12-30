import { NextRequest, NextResponse } from 'next/server';
import '@/lib/init'; // Inicjalizacja bazy danych
import db from '@/lib/db-neon';
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
    const level = searchParams.get('level');
    const freeOnly = searchParams.get('freeOnly') === 'true';
    const hideFull = searchParams.get('hideFull') === 'true';
    const skipLevelFilter = searchParams.get('skipLevelFilter') === 'true';

    // Pobierz zalogowanego użytkownika (jeśli istnieje) do filtrowania po poziomie
    const { getAuthUserOrNextAuth } = await import('@/lib/middleware');
    const authUser = await getAuthUserOrNextAuth(request);
    let userPreferredLevel: string | null = null;
    
    if (authUser) {
      // authUser.userId jest już zweryfikowane w getAuthUserOrNextAuth
      const user = await db.users.get(authUser.userId);
      if (user && user.preferred_level) {
        userPreferredLevel = user.preferred_level;
      }
    }

    let matches = await db.matches.all();
    console.log('GET /api/matches: All matches before filtering', { 
      totalMatches: matches.length,
      matches: matches.map((m: any) => ({ id: m.id, name: m.name, status: m.status, date_end: m.date_end }))
    });

    // Filtrowanie
    if (status) {
      matches = matches.filter((m: any) => m.status === status);
      console.log('GET /api/matches: After status filter', { status, count: matches.length });
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

    // Filtrowanie po poziomie - priorytet ma parametr level z query string
    if (level) {
      matches = matches.filter((m: any) => m.level === level);
    } else if (userPreferredLevel && !skipLevelFilter) {
      // Jeśli nie ma parametru level, użyj preferowanego poziomu użytkownika
      // Pomijamy filtrowanie jeśli skipLevelFilter=true (np. dla strony "moje mecze")
      matches = matches.filter((m: any) => m.level === userPreferredLevel);
    }

    // Sortowanie
    matches.sort((a: any, b: any) => 
      parseISO(a.date_start).getTime() - parseISO(b.date_start).getTime()
    );

    const matchesWithRegistrations: MatchWithRegistrations[] = await Promise.all(matches.map(async (match: any) => {
      const registrations = await db.registrations.findByMatch(match.id);
      const waitlist = await db.registrations.findWaitlistByMatch(match.id);
      const users = await db.users.all();

      const registrationsWithUsers = registrations.map((reg: any) => {
        const user = users.find((u: any) => u.id === reg.user_id);
        return {
          id: reg.id,
          match_id: reg.match_id,
          user_id: reg.user_id,
          is_waitlist: reg.is_waitlist || 0,
          created_at: reg.created_at,
        user: user ? {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          preferred_level: user.preferred_level,
        } : null,
        };
      }).filter((reg: any) => reg.user !== null);

      const waitlistWithUsers = waitlist.map((reg: any) => {
        const user = users.find((u: any) => u.id === reg.user_id);
        return {
          id: reg.id,
          match_id: reg.match_id,
          user_id: reg.user_id,
          is_waitlist: 1,
          created_at: reg.created_at,
          user: user ? {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            preferred_level: user.preferred_level,
          } : null,
        };
      }).filter((reg: any) => reg.user !== null);

      const paymentMethods = typeof match.payment_methods === 'string' 
        ? JSON.parse(match.payment_methods || '[]')
        : match.payment_methods || [];

      const isFull = registrations.length >= match.max_players;
      
      return {
        ...match,
        payment_methods: paymentMethods,
        is_recurring: match.is_recurring === 1 || match.is_recurring === true,
        registrations: registrationsWithUsers,
        registered_count: registrations.length,
        waitlist: waitlistWithUsers,
        waitlist_count: waitlist.length,
        is_full: isFull,
      };
    }));

    // Filtrowanie po meczach darmowych
    let filteredMatches = matchesWithRegistrations;
    if (freeOnly) {
      filteredMatches = filteredMatches.filter((m: any) => m.is_free === true || m.is_free === 1);
    }

    // Filtrowanie pełnych meczów
    if (hideFull) {
      filteredMatches = filteredMatches.filter((m: any) => !m.is_full);
    }

    return NextResponse.json(filteredMatches);
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
    console.log('POST /api/matches: Starting match creation');
    // Sprawdź autoryzację - obsługuje zarówno JWT jak i NextAuth
    const { getAuthUserOrNextAuth } = await import('@/lib/middleware');
    const authUser = await getAuthUserOrNextAuth(request);
    console.log('POST /api/matches: Auth check', { authUser: authUser ? { userId: authUser.userId, isAdmin: authUser.isAdmin } : null });
    if (!authUser) {
      console.error('POST /api/matches: Unauthorized - no authUser');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Pobierz dane użytkownika
    // authUser.userId jest już zweryfikowane w getAuthUserOrNextAuth
    console.log('POST /api/matches: Fetching user', { userId: authUser.userId });
    const user = await db.users.get(authUser.userId);
    console.log('POST /api/matches: User fetched', { user: user ? { id: user.id, email: user.email, phone: user.phone, can_create_matches: user.can_create_matches } : null });
    if (!user) {
      console.error('POST /api/matches: User not found (should not happen)', { userId: authUser.userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik może tworzyć mecze
    console.log('POST /api/matches: Checking can_create_matches', { can_create_matches: user.can_create_matches });
    if (user.can_create_matches !== undefined && user.can_create_matches !== 1) {
      console.error('POST /api/matches: User cannot create matches', { userId: user.id, can_create_matches: user.can_create_matches });
      return NextResponse.json(
        { error: 'Tworzenie meczów jest zablokowane dla Twojego konta' },
        { status: 403 }
      );
    }

    // Sprawdź czy użytkownik ma wypełniony telefon lub email
    console.log('POST /api/matches: Checking phone/email', { phone: user.phone, email: user.email });
    if (!user.phone && !user.email) {
      console.error('POST /api/matches: User has no phone or email', { userId: user.id });
      return NextResponse.json(
        { error: 'Aby utworzyć mecz, musisz wypełnić numer telefonu lub adres email w profilu' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('POST /api/matches: Request body received', { 
      hasName: !!body.name, 
      hasDateStart: !!body.date_start, 
      hasDateEnd: !!body.date_end,
      hasLocation: !!body.location,
      hasMaxPlayers: !!body.max_players,
      hasLevel: !!body.level
    });
    
    const {
      name,
      description,
      date_start,
      date_end,
      location,
      max_players,
      organizer_phone,
      organizer_email,
      payment_methods,
      level,
      is_recurring,
      recurrence_frequency,
      registration_start,
      registration_end,
      entry_fee,
      is_free,
    } = body;

    // Dla zwykłych użytkowników, użyj ich telefonu/email jako organizer_phone/organizer_email (jeśli nie podano)
    // Admini mogą podać własny telefon/email
    // Sprawdzamy czy telefon/email nie jest pustym stringiem
    const userPhone = (user.phone && user.phone.trim() !== '') ? user.phone : null;
    const userEmail = (user.email && user.email.trim() !== '') ? user.email : null;
    const providedPhone = (organizer_phone && organizer_phone.trim() !== '') ? organizer_phone : null;
    const providedEmail = (organizer_email && organizer_email.trim() !== '') ? organizer_email : null;
    
    const finalOrganizerPhone = authUser.isAdmin 
      ? (providedPhone || userPhone || null)
      : (userPhone || providedPhone || null);
    const finalOrganizerEmail = authUser.isAdmin
      ? (providedEmail || userEmail || null)
      : (userEmail || providedEmail || null);

    // Upewnij się, że przynajmniej jeden z tych pól jest wypełniony
    if (!finalOrganizerPhone && !finalOrganizerEmail) {
      return NextResponse.json(
        { error: 'Musisz podać numer telefonu lub adres email organizatora' },
        { status: 400 }
      );
    }

    if (!name || !date_start || !date_end || !location || !max_players || !level) {
      console.error('POST /api/matches: Missing required fields', { 
        name: !!name, 
        date_start: !!date_start, 
        date_end: !!date_end, 
        location: !!location, 
        max_players: !!max_players, 
        level: !!level 
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('POST /api/matches: Creating match with dates', {
      date_start,
      date_end,
      location,
      now: new Date().toISOString(),
    });
    
    console.log('POST /api/matches: Calling db.matches.create');
    let newMatch;
    try {
      newMatch = await db.matches.create({
      name,
      description: description || null,
      date_start,
      date_end,
      location,
      max_players,
      organizer_phone: finalOrganizerPhone,
      organizer_email: finalOrganizerEmail,
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
      console.log('POST /api/matches: db.matches.create succeeded', { matchId: newMatch?.id });
    } catch (createError: any) {
      console.error('POST /api/matches: Error in db.matches.create', { 
        error: createError?.message, 
        stack: createError?.stack,
        code: createError?.code 
      });
      throw createError;
    }
    
    console.log('POST /api/matches: Match created', {
      matchId: newMatch.id,
      date_start: newMatch.date_start,
      date_end: newMatch.date_end,
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
