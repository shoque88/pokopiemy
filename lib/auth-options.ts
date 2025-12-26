import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AzureADProvider from 'next-auth/providers/azure-ad';
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
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
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

      if (!dbUser) {
        // Sprawdź też po OAuth (na wypadek gdyby użytkownik miał już konto OAuth)
        if (account?.provider && account?.providerAccountId) {
          dbUser = await db.users.findByOAuth(account.provider, account.providerAccountId);
        }

        if (!dbUser) {
          // Utwórz nowego użytkownika
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
        } else {
          // Aktualizuj email jeśli użytkownik istniał tylko po OAuth
          await db.users.update(dbUser.id, {
            email: userEmail,
          });
        }
      } else {
        // Aktualizuj informacje OAuth jeśli nie były wcześniej ustawione
        if (account && !dbUser.oauth_provider) {
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
        
        // Dla Facebook, sprawdź najpierw po OAuth (nawet jeśli jest email)
        if (account.provider === 'facebook' && account.providerAccountId) {
          dbUser = await db.users.findByOAuth('facebook', account.providerAccountId);
          // Zapisz OAuth ID w tokenie dla przyszłych wywołań
          if (dbUser) {
            (token as any).oauthProvider = 'facebook';
            (token as any).oauthId = account.providerAccountId;
          }
        }
        
        // Jeśli nie znaleziono po OAuth, spróbuj po email
        if (!dbUser && user.email) {
          dbUser = await db.users.findByEmail(user.email);
        }

        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
          token.email = dbUser.email;
        } else {
          console.error('User not found in database during JWT callback:', {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            userEmail: user.email,
          });
        }
      } else if (token && (token as any).oauthProvider && (token as any).oauthId) {
        // W kolejnych wywołaniach, jeśli mamy OAuth ID w tokenie, użyj go
        const dbUser = await db.users.findByOAuth((token as any).oauthProvider, (token as any).oauthId);
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
          token.email = dbUser.email;
        }
      } else if (token && token.email) {
        // W kolejnych wywołaniach, jeśli mamy email w tokenie, użyj go
        const dbUser = await db.users.findByEmail(token.email as string);
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session as any).userId = token.userId;
        (session as any).isAdmin = token.isAdmin;
        
        // Logowanie dla debugowania
        if (!token.userId) {
          console.log('Session callback: token.userId is missing', {
            hasToken: !!token,
            tokenKeys: token ? Object.keys(token) : [],
            hasUser: !!session.user,
            userEmail: session.user?.email,
          });
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

