'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';

interface Match {
  id: number;
  name: string;
  description?: string;
  date_start: string;
  date_end: string;
  location: string;
  max_players: number;
  organizer_phone: string;
  payment_methods: string[];
  status: string;
  level: string;
  registrations: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      phone?: string;
      preferred_level?: string;
    };
  }>;
  registered_count: number;
}

export default function SuperuserMatchPage() {
  const router = useRouter();
  const params = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, [params.id]);

  const loadMatch = async () => {
    try {
      const superuserRes = await fetch('/api/auth/superuser/me');
      if (!superuserRes.ok) {
        router.push('/superuser/login');
        return;
      }

      const matchRes = await fetch(`/api/matches/${params.id}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setMatch(data);
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregisterUser = async (registrationId: number) => {
    if (!confirm('Czy na pewno chcesz wypisać tego użytkownika z meczu?')) {
      return;
    }

    try {
      const res = await fetch(`/api/superuser/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadMatch();
      } else {
        alert('Błąd podczas wypisywania użytkownika');
      }
    } catch (error) {
      alert('Błąd podczas wypisywania użytkownika');
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
  };

  if (loading) {
    return <div className="loading">Ładowanie meczu...</div>;
  }

  if (!match) {
    return <div className="empty-state"><h3>Mecz nie został znaleziony</h3></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => router.push('/superuser')} className="btn btn-secondary">
          ← Powrót do panelu
        </button>
      </div>

      <h1 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>{match.name}</h1>

      <div className="match-info" style={{ marginBottom: '2rem' }}>
        <div className="info-item">
          <span className="info-label">Data i godzina</span>
          <span className="info-value">
            {formatDateTime(match.date_start)} - {format(parseISO(match.date_end), 'HH:mm')}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Lokalizacja</span>
          <span className="info-value">{match.location}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Max graczy</span>
          <span className="info-value">{match.max_players}</span>
        </div>
      </div>

      <div className="players-list">
        <h2>Zapisani gracze ({match.registered_count}/{match.max_players})</h2>
        {match.registrations.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>Brak zapisanych graczy</p>
        ) : (
          <div className="players-grid">
            {match.registrations.map((reg) => (
              <div key={reg.id} className="player-card">
                <div className="player-name">{reg.user.name}</div>
                {reg.user.phone && (
                  <div className="player-position">Tel: {reg.user.phone}</div>
                )}
                {reg.user.preferred_level && (
                  <div className="player-position">Poziom: {reg.user.preferred_level}</div>
                )}
                <button
                  onClick={() => handleUnregisterUser(reg.id)}
                  className="btn btn-danger"
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  Wypisz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

