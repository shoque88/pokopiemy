import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUserOrNextAuth } from '@/lib/middleware';
import { updateMatchStatuses } from '@/lib/match-utils';
import { sendCancelationEmails } from '@/lib/match-utils';

export const dynamic = 'force-dynamic';

// GET - szczegóły meczu
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await updateMatchStatuses();

    const match = await db.matches.get(parseInt(params.id));
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const registrations = await db.registrations.findByMatch(match.id);
    console.log('GET /api/matches/[id]: Found registrations', { 
      matchId: match.id, 
      registrationCount: registrations.length,
      registrations: registrations.map((r: any) => ({ id: r.id, match_id: r.match_id, user_id: r.user_id }))
    });
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
          email: user.email,
          preferred_level: user.preferred_level,
        } : null,
      };
    }).filter((reg: any) => reg.user !== null);

    console.log('GET /api/matches/[id]: Registrations with users', { 
      matchId: match.id,
      count: registrationsWithUsers.length,
      registrationsWithUsers: registrationsWithUsers.map((r: any) => ({ id: r.id, user_id: r.user_id, userName: r.user?.name }))
    });

    const paymentMethods = typeof match.payment_methods === 'string' 
      ? JSON.parse(match.payment_methods || '[]')
      : match.payment_methods || [];

    return NextResponse.json({
      ...match,
      payment_methods: paymentMethods,
      is_recurring: match.is_recurring === 1 || match.is_recurring === true,
      is_free: match.is_free === 1 || match.is_free === true,
      registrations: registrationsWithUsers,
      registered_count: registrations.length,
    });
  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - aktualizacja meczu (tylko admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      organizer_email,
      payment_methods,
      level,
      status,
      is_recurring,
      recurrence_frequency,
      registration_start,
      registration_end,
      entry_fee,
      is_free,
    } = await request.json();

    const oldMatch = await db.matches.get(parseInt(params.id));
    if (!oldMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Jeśli status zmienia się na "canceled", usuń wszystkie zapisy i wyślij e-maile
    if (status === 'canceled' && oldMatch.status !== 'canceled') {
      // Usuń wszystkie zapisy dla odwołanego meczu
      await db.registrations.deleteByMatch(parseInt(params.id));
      
      await sendCancelationEmails(
        parseInt(params.id),
        oldMatch.name,
        oldMatch.location,
        oldMatch.date_start
      );
    }

    // Jeśli status zmienia się na "finished", usuń wszystkie zapisy
    if (status === 'finished' && oldMatch.status !== 'finished') {
      await db.registrations.deleteByMatch(parseInt(params.id));
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (date_start !== undefined) updates.date_start = date_start;
    if (date_end !== undefined) updates.date_end = date_end;
    if (location !== undefined) updates.location = location;
    if (max_players !== undefined) updates.max_players = max_players;
    if (organizer_phone !== undefined) updates.organizer_phone = organizer_phone || null;
    if (organizer_email !== undefined) updates.organizer_email = organizer_email || null;
    if (payment_methods !== undefined) {
      updates.payment_methods = JSON.stringify(payment_methods);
    }
    if (level !== undefined) updates.level = level;
    if (status !== undefined) updates.status = status;
    if (is_recurring !== undefined) updates.is_recurring = is_recurring ? 1 : 0;
    if (registration_start !== undefined) updates.registration_start = registration_start || null;
    if (registration_end !== undefined) updates.registration_end = registration_end || null;
    if (entry_fee !== undefined) updates.entry_fee = entry_fee || null;
    if (is_free !== undefined) updates.is_free = is_free ? 1 : 0;
    if (recurrence_frequency !== undefined) updates.recurrence_frequency = recurrence_frequency;

    const updatedMatch = await db.matches.update(parseInt(params.id), updates);

    if (!updatedMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const paymentMethods = typeof updatedMatch.payment_methods === 'string' 
      ? JSON.parse(updatedMatch.payment_methods || '[]')
      : updatedMatch.payment_methods || [];

    return NextResponse.json({
      ...updatedMatch,
      payment_methods: paymentMethods,
      is_recurring: updatedMatch.is_recurring === 1 || updatedMatch.is_recurring === true,
    });
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - usunięcie meczu (tylko admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUserOrNextAuth(request);
    if (!authUser || !authUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Usuń wszystkie zapisy dla tego meczu
    await db.registrations.deleteByMatch(parseInt(params.id));

    const deleted = await db.matches.delete(parseInt(params.id));

    if (!deleted) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
