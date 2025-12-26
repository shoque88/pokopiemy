'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_level: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({
          name: data.name || '',
          email: data.email?.endsWith('@pokopiemy.local') ? '' : (data.email || ''),
          phone: data.phone || '',
          preferred_level: data.preferred_level || '',
        });
      } else {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profil został zaktualizowany' });
        loadUser();
      } else {
        setMessage({ type: 'error', text: 'Błąd podczas aktualizacji profilu' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas aktualizacji profilu' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  if (!user) {
    return null;
  }

  // Sprawdź czy email jest tymczasowy (dla użytkowników Facebook bez email)
  const isTemporaryEmail = user.email?.endsWith('@pokopiemy.local');

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h1 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
          Mój profil
        </h1>

        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            {isTemporaryEmail ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Wprowadź swój email"
              />
            ) : (
              <input type="email" value={user.email} disabled />
            )}
          </div>

          <div className="form-group">
            <label>Imię</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

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

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </form>
      </div>
    </div>
  );
}

