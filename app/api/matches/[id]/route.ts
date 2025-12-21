import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { updateMatchStatuses } from '@/lib/match-utils';
import { sendCancelationEmails } from '@/lib/match-utils';

export const dynamic = 'force-dynamic';

// GET - szczegóły meczu
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    updateMatchStatuses();

    const match = db.matches.get(parseInt(params.id));
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const registrations = db.registrations.findByMatch(match.id);
    const users = db.users.all();

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

    return NextResponse.json({
      ...match,
      payment_methods: paymentMethods,
      is_recurring: match.is_recurring === 1 || match.is_recurring === true,
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
    const authUser = getAuthUser(request);
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
      status,
      is_recurring,
      recurrence_frequency,
    } = await request.json();

    const oldMatch = db.matches.get(parseInt(params.id));
    if (!oldMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Jeśli status zmienia się na "canceled", wyślij e-maile
    if (status === 'canceled' && oldMatch.status !== 'canceled') {
      await sendCancelationEmails(
        parseInt(params.id),
        oldMatch.name,
        oldMatch.location,
        oldMatch.date_start
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (date_start !== undefined) updates.date_start = date_start;
    if (date_end !== undefined) updates.date_end = date_end;
    if (location !== undefined) updates.location = location;
    if (max_players !== undefined) updates.max_players = max_players;
    if (organizer_phone !== undefined) updates.organizer_phone = organizer_phone;
    if (payment_methods !== undefined) {
      updates.payment_methods = JSON.stringify(payment_methods);
    }
    if (status !== undefined) updates.status = status;
    if (is_recurring !== undefined) updates.is_recurring = is_recurring ? 1 : 0;
    if (recurrence_frequency !== undefined) updates.recurrence_frequency = recurrence_frequency;

    const updatedMatch = db.matches.update(parseInt(params.id), updates);

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
    const authUser = getAuthUser(request);
    if (!authUser || !authUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = db.matches.delete(parseInt(params.id));

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
