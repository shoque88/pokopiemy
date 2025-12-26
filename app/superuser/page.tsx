'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  registered_count: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  can_create_matches?: number;
  can_register_to_matches?: number;
}

export default function SuperuserPanelPage() {
  const router = useRouter();
  const [superuser, setSuperuser] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'users'>('matches');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const superuserRes = await fetch('/api/auth/superuser/me');
      if (!superuserRes.ok) {
        router.push('/superuser/login');
        return;
      }

      const superuserData = await superuserRes.json();
      setSuperuser(superuserData);
      loadMatches();
      loadUsers();
    } catch (error) {
      router.push('/superuser/login');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const res = await fetch('/api/matches?status=&skipLevelFilter=true');
      const data = await res.json();
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/superuser/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDeleteMatch = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten mecz?')) {
      return;
    }

    try {
      const res = await fetch(`/api/superuser/matches/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadMatches();
      } else {
        alert('Błąd podczas usuwania meczu');
      }
    } catch (error) {
      alert('Błąd podczas usuwania meczu');
    }
  };

  const handleEditMatch = async (match: Match) => {
    router.push(`/superuser/matches/${match.id}/edit`);
  };

  const handleUnregisterUser = async (matchId: number, registrationId: number) => {
    if (!confirm('Czy na pewno chcesz wypisać tego użytkownika z meczu?')) {
      return;
    }

    try {
      const res = await fetch(`/api/superuser/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadMatches();
      } else {
        alert('Błąd podczas wypisywania użytkownika');
      }
    } catch (error) {
      alert('Błąd podczas wypisywania użytkownika');
    }
  };

  const handleToggleUserBlock = async (userId: number, field: 'can_create_matches' | 'can_register_to_matches') => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const currentValue = user[field] === 1;
      const res = await fetch(`/api/superuser/users/${userId}/${field}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: !currentValue ? 1 : 0 }),
      });

      if (res.ok) {
        loadUsers();
      } else {
        alert('Błąd podczas aktualizacji użytkownika');
      }
    } catch (error) {
      alert('Błąd podczas aktualizacji użytkownika');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/superuser/logout', { method: 'POST' });
      router.push('/superuser/login');
    } catch (error) {
      router.push('/superuser/login');
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
  };

  if (loading) {
    return <div className="loading">Ładowanie panelu...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-color)' }}>Panel Superusera</h1>
        <button onClick={handleLogout} className="btn btn-secondary">
          Wyloguj
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('matches')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'matches' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'matches' ? 'white' : 'var(--text-color)',
            cursor: 'pointer',
            borderBottom: activeTab === 'matches' ? '3px solid var(--primary-color)' : '3px solid transparent',
            marginBottom: '-2px',
          }}
        >
          Mecze
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'users' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'users' ? 'white' : 'var(--text-color)',
            cursor: 'pointer',
            borderBottom: activeTab === 'users' ? '3px solid var(--primary-color)' : '3px solid transparent',
            marginBottom: '-2px',
          }}
        >
          Użytkownicy
        </button>
      </div>

      {activeTab === 'matches' && (
        <div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Wszystkie mecze ({matches.length})</h2>
          {matches.length === 0 ? (
            <div className="empty-state">
              <h3>Brak meczów</h3>
            </div>
          ) : (
            <div>
              {matches.map((match) => (
                <div key={match.id} className="card match-card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3>{match.name}</h3>
                      {match.description && <p style={{ marginTop: '0.5rem', color: 'var(--text-light)' }}>{match.description}</p>}
                      <div className="match-meta" style={{ marginTop: '1rem' }}>
                        <span>📅 {formatDateTime(match.date_start)} - {format(parseISO(match.date_end), 'HH:mm')}</span>
                        <span>📍 {match.location}</span>
                        <span>👥 {match.registered_count}/{match.max_players} graczy</span>
                        <span>🎯 {match.level === 'kopanina' ? 'Kopanina' : match.level === 'cośtam gramy' ? 'Cośtam gramy' : match.level === 'wannabe pro' ? 'Wannabe pro' : match.level}</span>
                        <span className={`status-badge ${match.status === 'active' ? 'status-active' : match.status === 'finished' ? 'status-finished' : 'status-canceled'}`}>
                          {match.status === 'active' ? 'Aktywny' : match.status === 'finished' ? 'Zakończony' : 'Odwołany'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                      <button
                        onClick={() => handleEditMatch(match)}
                        className="btn btn-secondary"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="btn btn-danger"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => router.push(`/superuser/matches/${match.id}`)}
                      className="btn btn-primary"
                    >
                      Zarządzaj zapisami
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Użytkownicy ({users.length})</h2>
          {users.length === 0 ? (
            <div className="empty-state">
              <h3>Brak użytkowników</h3>
            </div>
          ) : (
            <div>
              {users.map((user) => (
                <div key={user.id} className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3>{user.name}</h3>
                      <p style={{ color: 'var(--text-light)', marginTop: '0.25rem' }}>
                        {user.email} {user.phone && `• ${user.phone}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={user.can_create_matches === 1}
                            onChange={() => handleToggleUserBlock(user.id, 'can_create_matches')}
                          />
                          <span>Może tworzyć mecze</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={user.can_register_to_matches === 1}
                            onChange={() => handleToggleUserBlock(user.id, 'can_register_to_matches')}
                          />
                          <span>Może zapisywać się na mecze</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

