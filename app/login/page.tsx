'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    favorite_position: '',
  });

  useEffect(() => {
    // Sprawdź czy użytkownik jest już zalogowany
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          const redirect = searchParams.get('redirect') || '/';
          router.push(redirect);
        }
      });
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error || 'Wystąpił błąd');
      }
    } catch (error) {
      setError('Wystąpił błąd podczas połączenia');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setOauthLoading(provider);
    setError('');

    try {
      const redirect = searchParams.get('redirect') || '/';
      const result = await signIn(provider, {
        callbackUrl: redirect,
        redirect: true,
      });

      if (result?.error) {
        setError('Błąd podczas logowania przez ' + provider);
        setOauthLoading(null);
      }
    } catch (error) {
      setError('Błąd podczas logowania przez ' + provider);
      setOauthLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="card">
        <h1 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
          {isLogin ? 'Logowanie' : 'Rejestracja'}
        </h1>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Przyciski OAuth */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={oauthLoading !== null}
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#4285F4',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
              }}
            >
              {oauthLoading === 'google' ? (
                'Logowanie...'
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Zaloguj się przez Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={oauthLoading !== null}
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#1877F2',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
              }}
            >
              {oauthLoading === 'facebook' ? (
                'Logowanie...'
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Zaloguj się przez Facebook
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('azure-ad')}
              disabled={oauthLoading !== null}
              className="btn"
              style={{
                width: '100%',
                backgroundColor: '#0078D4',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
              }}
            >
              {oauthLoading === 'azure-ad' ? (
                'Logowanie...'
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
                  </svg>
                  Zaloguj się przez Microsoft
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <span style={{ padding: '0 1rem', color: 'var(--text-light)' }}>lub</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Imię</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Hasło</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Preferowany poziom</label>
                <select
                  value={formData.preferred_level}
                  onChange={(e) => setFormData({ ...formData, preferred_level: e.target.value })}
                >
                  <option value="">Wybierz poziom</option>
                  <option value="kopanina">Kopanina</option>
                  <option value="cośtam gramy">Cośtam gramy</option>
                  <option value="wannabe pro">Wannabe pro</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading || oauthLoading !== null} style={{ width: '100%' }}>
            {loading ? 'Przetwarzanie...' : isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading">Ładowanie...</div>}>
      <LoginForm />
    </Suspense>
  );
}
