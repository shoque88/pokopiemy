import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireSuperuser } from '@/lib/superuser-auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; field: string } }
) {
  try {
    await requireSuperuser(request);

    const { value } = await request.json();
    const field = params.field;

    if (field !== 'can_create_matches' && field !== 'can_register_to_matches') {
      return NextResponse.json(
        { error: 'Invalid field' },
        { status: 400 }
      );
    }

    const updatedUser = await db.users.update(parseInt(params.id), {
      [field]: value,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedUser.id,
      [field]: updatedUser[field],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


