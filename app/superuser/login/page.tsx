'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperuserLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    // Sprawdź czy superuser jest już zalogowany
    fetch('/api/auth/superuser/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          router.push('/superuser');
        }
      })
      .catch(() => {
        // Ignoruj błędy - użytkownik nie jest zalogowany
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/superuser/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/superuser');
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

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', paddingTop: '3rem' }}>
      <div className="card">
        <h1 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
          Logowanie Superuser
        </h1>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nazwa użytkownika *</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Wprowadź nazwę użytkownika"
            />
          </div>

          <div className="form-group">
            <label>Hasło *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Wprowadź hasło"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
      </div>
    </div>
  );
}


