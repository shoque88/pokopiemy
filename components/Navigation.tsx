'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Jeśli NextAuth session istnieje, użyj go
    if (status === 'authenticated' && session) {
      const sessionUser = {
        id: (session as any).userId,
        name: session.user?.name,
        email: session.user?.email,
        is_admin: (session as any).isAdmin || false,
      };
      setUser(sessionUser);
      setLoading(false);
    } else if (status === 'unauthenticated') {
      // Sprawdź stary system JWT jako fallback
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            setUser(data);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session, status]);

  const handleLogout = async () => {
    // Wyloguj z NextAuth
    if (session) {
      await signOut({ callbackUrl: '/' });
    } else {
      // Wyloguj ze starego systemu
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <nav>
      <div className="container">
        <Link href="/" className="logo">
          ⚽ Pokopiemy
        </Link>
        <ul>
          <li>
            <Link href="/">Strona główna</Link>
          </li>
          {user && (
            <>
              <li>
                <Link href="/moje-mecze">Moje mecze</Link>
              </li>
              <li>
                <Link href="/profil">Profil</Link>
              </li>
              {user.is_admin && (
                <li>
                  <Link href="/admin">Panel organizatora</Link>
                </li>
              )}
            </>
          )}
          {!loading && (
            <li>
              {user ? (
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    Wyloguj
                  </button>
                </div>
              ) : (
                <Link href="/login" className="btn btn-accent">
                  Zaloguj/Zarejestruj
                </Link>
              )}
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
