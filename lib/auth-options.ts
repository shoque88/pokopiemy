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
      let userEmail = user.email;
      
      // Dla Facebook, jeśli nie ma email, spróbuj pobrać przez Graph API
      if (!userEmail && account?.provider === 'facebook' && account?.accessToken) {
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

      if (!userEmail) {
        console.error('No email available for user');
        return false;
      }

      // Sprawdź czy użytkownik już istnieje
      let dbUser = await db.users.findByEmail(userEmail);

      if (!dbUser) {
        // Utwórz nowego użytkownika
        dbUser = await db.users.create({
          name: user.name || userEmail.split('@')[0],
          email: userEmail,
          password: '', // OAuth użytkownicy nie mają hasła
          phone: null,
          favorite_position: null,
          is_admin: 0,
          oauth_provider: account?.provider || null,
          oauth_id: account?.providerAccountId || null,
        });
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
      if (user) {
        const dbUser = await db.users.findByEmail(user.email || '');
        if (dbUser) {
          token.userId = dbUser.id;
          token.isAdmin = dbUser.is_admin === 1;
          token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session as any).userId = token.userId;
        (session as any).isAdmin = token.isAdmin;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'pokopiemy-nextauth-secret-change-in-production',
};

