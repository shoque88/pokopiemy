import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest } from 'next/server';

export async function getSession(request?: NextRequest) {
  // W App Router musimy użyć innego podejścia
  // NextAuth automatycznie obsługuje session przez cookies
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).userId) {
      return null;
    }
    return {
      id: (session as any).userId,
      email: session.user?.email,
      name: session.user?.name,
      isAdmin: (session as any).isAdmin || false,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
