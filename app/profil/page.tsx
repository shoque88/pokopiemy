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
    phone: '',
    favorite_position: '',
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
          phone: data.phone || '',
          favorite_position: data.favorite_position || '',
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
            <input type="email" value={user.email} disabled />
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
            <label>Ulubiona pozycja</label>
            <select
              value={formData.favorite_position}
              onChange={(e) => setFormData({ ...formData, favorite_position: e.target.value })}
            >
              <option value="">Wybierz pozycję</option>
              <option value="Bramkarz">Bramkarz</option>
              <option value="Obrońca">Obrońca</option>
              <option value="Pomocnik">Pomocnik</option>
              <option value="Napastnik">Napastnik</option>
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

