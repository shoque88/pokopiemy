'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  entry_fee?: string;
  is_free?: boolean;
  registrations: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      preferred_level?: string;
    };
  }>;
  registered_count: number;
}

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    loadMatch();
    loadUser();
  }, [params.id]);

  const loadMatch = async () => {
    try {
      const res = await fetch(`/api/matches/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      // User not logged in
    }
  };

  const handleRegister = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/mecz/${params.id}`));
      return;
    }

    setRegistering(true);
    setMessage(null);

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: parseInt(params.id as string) }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Zostałeś zapisany na mecz!' });
        loadMatch();
      } else {
        setMessage({ type: 'error', text: data.error || 'Błąd podczas zapisywania' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas zapisywania' });
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!match || !user) return;

    const registration = match.registrations.find((r) => r.user.id === user.id);
    if (!registration) return;

    setRegistering(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/registrations/${registration.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Anulowano udział w meczu' });
        loadMatch();
      } else {
        setMessage({ type: 'error', text: 'Błąd podczas anulowania' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas anulowania' });
    } finally {
      setRegistering(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm');
  };

  const isRegistered = user && match?.registrations.some((r) => r.user.id === user.id);
  const isFull = match ? match.registered_count >= match.max_players : false;

  if (loading) {
    return <div className="loading">Ładowanie szczegółów meczu...</div>;
  }

  if (!match) {
    return <div className="empty-state"><h3>Mecz nie został znaleziony</h3></div>;
  }

  return (
    <div className="match-details">
      <h1>{match.name}</h1>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {match.description && (
        <p style={{ marginBottom: '2rem', fontSize: '1.125rem', color: 'var(--text-light)' }}>
          {match.description}
        </p>
      )}

      <div className="match-info">
        <div className="info-item">
          <span className="info-label">Data i godzina</span>
          <span className="info-value">
            {formatDateTime(match.date_start)} - {formatTime(match.date_end)}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Lokalizacja</span>
          <span className="info-value">{match.location}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Telefon organizatora</span>
          <span className="info-value">{match.organizer_phone}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Max graczy</span>
          <span className="info-value">{match.max_players}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Poziom</span>
          <span className="info-value">
            {match.level === 'kopanina' ? 'Kopanina' :
             match.level === 'cośtam gramy' ? 'Cośtam gramy' :
             match.level === 'wannabe pro' ? 'Wannabe pro' :
             match.level}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Metody płatności</span>
          <span className="info-value">
            {match.payment_methods.map((m: string) => m === 'cash' ? 'Gotówka' : 'BLIK').join(', ')}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Wpisowe</span>
          <span className="info-value">
            {match.is_free ? 'Za darmo' : match.entry_fee || 'Brak informacji'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Status</span>
          <span className="info-value">
            <span className={`status-badge ${
              match.status === 'active' ? 'status-active' :
              match.status === 'finished' ? 'status-finished' :
              'status-canceled'
            }`}>
              {match.status === 'active' ? 'Aktywny' :
               match.status === 'finished' ? 'Zakończony' :
               'Odwołany'}
            </span>
          </span>
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
                {reg.user.preferred_level && (
                  <div className="player-position">Poziom: {reg.user.preferred_level}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {match.status === 'active' && (
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          {isRegistered ? (
            <button
              onClick={handleUnregister}
              disabled={registering}
              className="btn btn-danger"
            >
              {registering ? 'Anulowanie...' : 'Anuluj udział'}
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={registering || isFull}
              className="btn btn-primary"
            >
              {registering ? 'Zapisywanie...' : isFull ? 'Mecz pełny' : 'Zapisz się'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

