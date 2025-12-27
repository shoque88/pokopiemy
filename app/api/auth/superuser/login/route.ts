import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateToken, comparePassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Znajdź superusera po username
    const user = await db.users.findByUsername(username);
    if (!user || !user.is_superuser || user.is_superuser !== 1 || !user.password) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Sprawdź hasło
    if (!comparePassword(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generuj token (używamy specjalnego typu dla superusera)
    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: true, // Superuser ma wszystkie uprawnienia admina
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        is_superuser: user.is_superuser === 1,
      },
    });

    // Używamy osobnego cookie dla superusera
    response.cookies.set('superuser_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dni
    });

    return response;
  } catch (error) {
    console.error('Superuser login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

