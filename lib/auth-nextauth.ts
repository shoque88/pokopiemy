import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function getSession() {
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
    if (!session) {
      console.log('No session found in getCurrentUser');
      return null;
    }
    
    if (!(session as any).userId) {
      console.log('Session found but no userId:', {
        hasUser: !!session.user,
        userEmail: session.user?.email,
        sessionKeys: Object.keys(session),
      });
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
