'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isAfter } from 'date-fns';

interface Match {
  id: number;
  name: string;
  description?: string;
  date_start: string;
  date_end: string;
  location: string;
  status: string;
  registration_id: number;
}

export default function MyMatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [unregistering, setUnregistering] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await userRes.json();
      setUser(userData);

      // Pobierz wszystkie mecze użytkownika
      const matchesRes = await fetch('/api/matches?status=');
      const allMatches = await matchesRes.json();

      // Filtruj mecze, na które użytkownik jest zapisany
      const userMatches = allMatches
        .filter((match: any) =>
          match.registrations.some((reg: any) => reg.user_id === userData.id)
        )
        .map((match: any) => {
          const registration = match.registrations.find((reg: any) => reg.user_id === userData.id);
          return {
            ...match,
            registration_id: registration.id,
          };
        });

      setMatches(userMatches);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async (registrationId: number) => {
    if (!confirm('Czy na pewno chcesz anulować udział w tym meczu?')) {
      return;
    }

    setUnregistering(registrationId);

    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
      } else {
        alert('Błąd podczas anulowania rejestracji');
      }
    } catch (error) {
      alert('Błąd podczas anulowania rejestracji');
    } finally {
      setUnregistering(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm');
  };

  const now = new Date();
  const upcomingMatches = matches.filter((match) =>
    isAfter(parseISO(match.date_start), now) && match.status === 'active'
  );
  const finishedMatches = matches.filter(
    (match) => !isAfter(parseISO(match.date_start), now) || match.status !== 'active'
  );

  if (loading) {
    return <div className="loading">Ładowanie meczów...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>
        Moje mecze
      </h1>

      <div>
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
          Nadchodzące ({upcomingMatches.length})
        </h2>
        {upcomingMatches.length === 0 ? (
          <div className="empty-state">
            <p>Nie masz żadnych nadchodzących meczów</p>
            <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Przeglądaj mecze
            </Link>
          </div>
        ) : (
          <div>
            {upcomingMatches.map((match) => (
              <div key={match.id} className="card match-card">
                <h3>{match.name}</h3>
                {match.description && (
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-light)' }}>
                    {match.description}
                  </p>
                )}

                <div className="match-meta">
                  <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                  <span>📍 {match.location}</span>
                </div>

                <div className="match-footer">
                  <span className={`status-badge ${
                    match.status === 'active' ? 'status-active' :
                    match.status === 'finished' ? 'status-finished' :
                    'status-canceled'
                  }`}>
                    {match.status === 'active' ? 'Aktywny' :
                     match.status === 'finished' ? 'Zakończony' :
                     'Odwołany'}
                  </span>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href={`/mecz/${match.id}`} className="btn btn-secondary">
                      Szczegóły
                    </Link>
                    <button
                      onClick={() => handleUnregister(match.registration_id)}
                      disabled={unregistering === match.registration_id}
                      className="btn btn-danger"
                    >
                      {unregistering === match.registration_id ? 'Anulowanie...' : 'Anuluj udział'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {finishedMatches.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
            Zakończone ({finishedMatches.length})
          </h2>
          <div>
            {finishedMatches.map((match) => (
              <div key={match.id} className="card match-card">
                <h3>{match.name}</h3>
                <div className="match-meta">
                  <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                  <span>📍 {match.location}</span>
                </div>
                <div className="match-footer">
                  <span className={`status-badge ${
                    match.status === 'finished' ? 'status-finished' : 'status-canceled'
                  }`}>
                    {match.status === 'finished' ? 'Zakończony' : 'Odwołany'}
                  </span>
                  <Link href={`/mecz/${match.id}`} className="btn btn-secondary">
                    Szczegóły
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

