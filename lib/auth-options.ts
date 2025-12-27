import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import db from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'public_profile',
        },
      },
      // Pobierz email przez Graph API w callback, jeśli nie został zwrócony
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Dla Facebook, jeśli nie ma email, pozwól na logowanie bez email
      const isFacebook = account?.provider === 'facebook';
      let userEmail = user.email;
      
      // Dla Facebook, jeśli nie ma email, spróbuj pobrać przez Graph API (opcjonalnie)
      if (!userEmail && isFacebook && account?.accessToken) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/me?fields=email&access_token=${account.accessToken}`
          );
          if (response.ok) {
            const data = await response.json();
            userEmail = data.email;
          }
        } catch (error) {
          console.error('Error fetching Facebook email:', error);
        }
      }

      // Dla Facebook bez email, użyj OAuth ID jako identyfikatora
      if (isFacebook && !userEmail && account?.providerAccountId) {
        // Sprawdź czy użytkownik już istnieje po OAuth
        let dbUser = await db.users.findByOAuth('facebook', account.providerAccountId);

        if (!dbUser) {
          // Utwórz nowego użytkownika z tymczasowym email
          const tempEmail = `facebook_${account.providerAccountId}@pokopiemy.local`;
          dbUser = await db.users.create({
            name: user.name || `Facebook User ${account.providerAccountId}`,
            email: tempEmail,
            password: '', // OAuth użytkownicy nie mają hasła
            phone: null,
            preferred_level: null,
            is_admin: 0,
            oauth_provider: 'facebook',
            oauth_id: account.providerAccountId,
          });
        }

        return true;
      }

      // Dla innych providerów lub Facebook z emailem, wymagaj email
      if (!userEmail) {
        console.error('No email available for user');
        return false;
      }

      // Sprawdź czy użytkownik już istnieje po email
      let dbUser = await db.users.findByEmail(userEmail);
      console.log('signIn callback: User lookup by email', {
        email: userEmail,
        found: !!dbUser,
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
      });

      if (!dbUser) {
        // Sprawdź też po OAuth (na wypadek gdyby użytkownik miał już konto OAuth)
        if (account?.provider && account?.providerAccountId) {
          dbUser = await db.users.findByOAuth(account.provider, account.providerAccountId);
          console.log('signIn callback: User lookup by OAuth', {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            found: !!dbUser,
          });
        }

        if (!dbUser) {
          // Utwórz nowego użytkownika
          console.log('signIn callback: Creating new OAuth user', {
            email: userEmail,
            provider: account?.provider,
            providerAccountId: account?.providerAccountId,
          });
          dbUser = await db.users.create({
            name: user.name || userEmail.split('@')[0],
            email: userEmail,
            password: '', // OAuth użytkownicy nie mają hasła
            phone: null,
            preferred_level: null,
            is_admin: 0,
            oauth_provider: account?.provider || null,
            oauth_id: account?.providerAccountId || null,
          });
          console.log('signIn callback: User created', {
            userId: dbUser.id,
            email: dbUser.email,
            oauth_provider: dbUser.oauth_provider,
            oauth_id: dbUser.oauth_id,
          });
          
          // Weryfikuj, czy użytkownik został poprawnie zapisany
          const verifyUser = await db.users.findByOAuth(account?.provider || '', account?.providerAccountId || '');
          console.log('signIn callback: Verification lookup after create', {
            provider: account?.provider,
            providerAccountId: account?.providerAccountId,
            found: !!verifyUser,
            verifyUserId: verifyUser?.id,
          });
        } else {
          // Aktualizuj email jeśli użytkownik istniał tylko po OAuth
          await db.users.update(dbUser.id, {
            email: userEmail,
          });
        }
      } else {
        // Aktualizuj informacje OAuth jeśli nie były wcześniej ustawione
        if (account && !dbUser.oauth_provider) {
          console.log('signIn callback: Updating OAuth info for existing user', {
            userId: dbUser.id,
            email: dbUser.email,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
          await db.users.update(dbUser.id, {
            oauth_provider: account.provider,
            oauth_id: account.providerAccountId,
          });
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        let dbUser = null;
        
        // Dla OAuth providerów (Facebook, Google), sprawdź najpierw po OAuth ID
        if (account.providerAccountId) {
          dbUser = await db.users.findByOAuth(account.provider, account.providerAccountId);
          // Zapisz OAuth ID w tokenie dla przyszłych wywołań
          if (dbUser) {
            (token as any).oauthProvider = account.provider;
            (token as any).oauthId = account.providerAccountId;
            console.log('JWT callback: Found user by OAuth ID', {
              provider: account.provider,
              oauthId: account.providerAccountId,
              userId: dbUser.id,
              email: dbUser.email,
            });
          }
        }
        
        // Jeśli nie znaleziono po OAuth, spróbuj po email (tylko jeśli nie jest to OAuth provider)
        // Uwaga: dla OAuth, użytkownik powinien być już utworzony w signIn callback
        if (!dbUser && user.email && account.provider !== 'google' && account.provider !== 'facebook') {
          dbUser = await db.users.findByEmail(user.email);
        }

        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
          token.email = dbUser.email;
          // Zawsze zapisz OAuth ID w tokenie dla wszystkich OAuth providerów
          if (account.providerAccountId) {
            (token as any).oauthProvider = account.provider;
            (token as any).oauthId = account.providerAccountId;
          }
        } else {
          console.error('User not found in database during JWT callback:', {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            userEmail: user.email,
          });
        }
      } else if (token && (token as any).oauthProvider && (token as any).oauthId) {
        // W kolejnych wywołaniach, jeśli mamy OAuth ID w tokenie, użyj go (najbardziej niezawodne)
        const dbUser = await db.users.findByOAuth((token as any).oauthProvider, (token as any).oauthId);
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
          token.email = dbUser.email;
        } else {
          console.error('JWT refresh: User not found by OAuth ID - clearing userId from token', {
            provider: (token as any).oauthProvider,
            oauthId: (token as any).oauthId,
            oldUserId: token.userId,
          });
          // Wyczyść userId z tokenu, jeśli użytkownik nie istnieje w bazie
          delete token.userId;
          delete token.isAdmin;
          delete token.email;
        }
      } else if (token && token.email && !(token as any).oauthProvider) {
        // W kolejnych wywołaniach, jeśli mamy email w tokenie i NIE jest to OAuth, użyj go (fallback tylko dla nie-OAuth)
        const dbUser = await db.users.findByEmail(token.email as string);
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
        } else {
          // Wyczyść userId z tokenu, jeśli użytkownik nie istnieje
          console.error('JWT refresh: User not found by email - clearing userId from token', {
            email: token.email,
            oldUserId: token.userId,
          });
          delete token.userId;
          delete token.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // Ustaw userId tylko jeśli istnieje w tokenie (jeśli użytkownik istnieje w bazie)
        if (token.userId) {
          (session as any).userId = token.userId;
          (session as any).isAdmin = token.isAdmin || false;
          // Zapisz OAuth provider i ID w sesji, jeśli są dostępne (dla łatwiejszej identyfikacji)
          if ((token as any).oauthProvider && (token as any).oauthId) {
            (session as any).oauthProvider = (token as any).oauthProvider;
            (session as any).oauthId = (token as any).oauthId;
          }
        } else {
          // Jeśli nie ma userId w tokenie, użytkownik nie jest zalogowany (nie istnieje w bazie)
          console.log('Session callback: token.userId is missing - user not authenticated', {
            hasToken: !!token,
            tokenKeys: token ? Object.keys(token) : [],
            hasUser: !!session.user,
            userEmail: session.user?.email,
            oauthProvider: (token as any).oauthProvider,
            oauthId: (token as any).oauthId,
          });
          // Nie ustawiaj userId - sesja będzie bez userId, co oznacza, że użytkownik nie jest zalogowany
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'pokopiemy-nextauth-secret-change-in-production',
};

