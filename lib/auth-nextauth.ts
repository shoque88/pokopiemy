import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import db from '@/lib/db';

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
      console.log('Session found but no userId (user not in database or invalid session):', {
        hasUser: !!session.user,
        userEmail: session.user?.email,
        sessionKeys: Object.keys(session),
      });
      return null;
    }
    
    // Sprawdź, czy użytkownik rzeczywiście istnieje w bazie danych
    // Dla użytkowników OAuth, sprawdź po OAuth ID zamiast userId (jeśli jest dostępne)
    let dbUser = null;
    if ((session as any).oauthProvider && (session as any).oauthId) {
      dbUser = await db.users.findByOAuth((session as any).oauthProvider, (session as any).oauthId);
      if (!dbUser) {
        console.error('getCurrentUser: User with OAuth ID does not exist in database', {
          oauthProvider: (session as any).oauthProvider,
          oauthId: (session as any).oauthId,
          userId: (session as any).userId,
        });
        return null;
      }
    } else if ((session as any).userId) {
      // Fallback: sprawdź po userId (dla użytkowników nie-OAuth)
      dbUser = await db.users.get((session as any).userId);
      if (!dbUser) {
        console.error('getCurrentUser: User in session does not exist in database', {
          userId: (session as any).userId,
          userEmail: session.user?.email,
        });
        return null;
      }
    }
    
    if (!dbUser) {
      return null;
    }
    
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      isAdmin: dbUser.is_admin === 1,
      oauthProvider: dbUser.oauth_provider || undefined,
      oauthId: dbUser.oauth_id || undefined,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
