import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireSuperuser } from '@/lib/superuser-auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperuser(request);

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
    if (level !== undefined) updates.level = level;
    if (status !== undefined) updates.status = status;
    if (is_recurring !== undefined) updates.is_recurring = is_recurring ? 1 : 0;
    if (registration_start !== undefined) updates.registration_start = registration_start || null;
    if (registration_end !== undefined) updates.registration_end = registration_end || null;
    if (entry_fee !== undefined) updates.entry_fee = entry_fee || null;
    if (is_free !== undefined) updates.is_free = is_free ? 1 : 0;
    if (recurrence_frequency !== undefined) updates.recurrence_frequency = recurrence_frequency;

    // Jeśli status zmienił się na 'canceled' lub 'finished', usuń wszystkie zapisy
    if (status !== undefined && oldMatch.status !== status) {
      if (status === 'canceled' || status === 'finished') {
        await db.registrations.deleteByMatch(parseInt(params.id));
      }
    }

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
      is_free: updatedMatch.is_free === 1 || updatedMatch.is_free === true,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperuser(request);

    // Usuń wszystkie zapisy dla tego meczu
    await db.registrations.deleteByMatch(parseInt(params.id));

    const deleted = await db.matches.delete(parseInt(params.id));

    if (!deleted) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

