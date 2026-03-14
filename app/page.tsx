'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  is_free?: boolean;
  entry_fee?: string;
  registrations?: Array<{
    id: number;
    user: {
      id: number;
      name: string;
    };
  }>;
}

// Funkcja pomocnicza do renderowania ikony poziomu (schody)
const LevelIcon = ({ level }: { level: string }) => {
  const getLevelNumber = (level: string) => {
    if (level === 'kopanina') return 1;
    if (level === 'cośtam gramy') return 2;
    if (level === 'semi pro') return 3;
    return 0;
  };

  const activeLevel = getLevelNumber(level);

  return (
    <span className="level-icon-stairs" data-level={activeLevel}>
      <span className={`level-step ${activeLevel === 1 ? 'active' : ''}`}></span>
      <span className={`level-step ${activeLevel === 2 ? 'active' : ''}`}></span>
      <span className={`level-step ${activeLevel === 3 ? 'active' : ''}`}></span>
    </span>
  );
};

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    status: 'active',
    level: '',
    freeOnly: false,
    hideFull: false,
  });
  const [user, setUser] = useState<any>(null);
  const [registering, setRegistering] = useState<number | null>(null);
  const [unregistering, setUnregistering] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string; matchId?: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadMatches();
    loadUser();
  }, [filters]);

  const loadMatches = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.location) params.append('location', filters.location);
    if (filters.status && filters.status !== '') params.append('status', filters.status);
    if (filters.level) params.append('level', filters.level);
    if (filters.freeOnly) params.append('freeOnly', 'true');
    if (filters.hideFull) params.append('hideFull', 'true');
    // Jeśli użytkownik nie wybrał poziomu w filtrze, pokaż wszystkie mecze (nie filtruj po poziomie użytkownika)
    if (!filters.level) {
      params.append('skipLevelFilter', 'true');
    }

    try {
      const res = await fetch(`/api/matches?${params.toString()}`);
      const data = await res.json();
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
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

  const handleRegister = async (matchId: number) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setRegistering(matchId);
    setMessage(null);

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Zostałeś zapisany na mecz!', matchId });
        // Odśwież listę meczów po 100ms
        setTimeout(() => {
          loadMatches();
        }, 100);
      } else {
        setMessage({ type: 'error', text: data.error || 'Błąd podczas zapisywania', matchId });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas zapisywania', matchId });
    } finally {
      setRegistering(null);
    }
  };

  const handleUnregister = async (matchId: number, match: Match) => {
    if (!user) return;

    // Szukaj w normalnych rejestracjach
    let registration = match.registrations?.find((r) => r.user.id === user.id);
    // Jeśli nie znaleziono, szukaj w liście rezerwowej
    if (!registration && (match as any).waitlist) {
      registration = (match as any).waitlist.find((r: any) => r.user.id === user.id);
    }
    if (!registration) return;

    setUnregistering(matchId);
    setMessage(null);

    try {
      const res = await fetch(`/api/registrations/${registration.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const isWaitlist = (match as any).waitlist?.some((r: any) => r.user.id === user.id);
        setMessage({ 
          type: 'success', 
          text: isWaitlist ? 'Zrezygnowano z listy rezerwowej' : 'Anulowano udział w meczu', 
          matchId 
        });
        // Odśwież listę meczów po 100ms
        setTimeout(() => {
          loadMatches();
        }, 100);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Błąd podczas anulowania', matchId });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas anulowania', matchId });
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

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      active: { label: 'Aktywny', className: 'status-active' },
      finished: { label: 'Zakończony', className: 'status-finished' },
      canceled: { label: 'Odwołany', className: 'status-canceled' },
    };
    const statusInfo = statusMap[status] || statusMap.active;
    return (
      <span className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
          Nadchodzące mecze
        </h2>
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="btn btn-secondary filters-toggle-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          aria-label="Pokaż/ukryj filtry"
        >
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <span className="filters-toggle-text">Filtry</span>
        </button>
      </div>

      {filtersOpen && (
        <div className="filters" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={(e) => { e.preventDefault(); loadMatches(); }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label>Szukaj</label>
                <input
                  type="text"
                  placeholder="Szukaj po nazwie lub lokalizacji"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="active">Aktywne</option>
                  <option value="finished">Zakończone</option>
                  <option value="canceled">Odwołane</option>
                  <option value="">Wszystkie</option>
                </select>
              </div>
              <div className="form-group">
                <label>Poziom</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                >
                  <option value="">Wszystkie</option>
                  <option value="kopanina">Kopanina</option>
                  <option value="cośtam gramy">Cośtam gramy</option>
                  <option value="semi pro">Semi pro</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  id="freeOnly"
                  checked={filters.freeOnly}
                  onChange={(e) => setFilters({ ...filters, freeOnly: e.target.checked })}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="freeOnly" style={{ margin: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>Tylko darmowe</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  id="hideFull"
                  checked={filters.hideFull}
                  onChange={(e) => setFilters({ ...filters, hideFull: e.target.checked })}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="hideFull" style={{ margin: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>Ukryj pełne mecze</label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                Filtruj
              </button>
            </div>
          </form>
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading">Ładowanie meczów...</div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <h3>Brak meczów</h3>
          <p>Nie znaleziono meczów spełniających kryteria wyszukiwania.</p>
        </div>
      ) : (
        <div>
          {matches.map((match) => {
            const isRegistered = user && match.registrations?.some((r) => r.user.id === user.id);
            const isFull = match.registered_count >= match.max_players;
            const isOnWaitlist = user && (match as any).waitlist?.some((r: any) => r.user.id === user.id);
            
            return (
              <div key={match.id} className="card match-card">
                {/* Nagłówek z nazwą i badge poziomu */}
                <div className="match-header">
                  <h3>
                    <Link href={`/mecz/${match.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {match.name}
                    </Link>
                  </h3>
                  {match.level && (
                    <span className={`badge badge-level badge-level-${match.level === 'kopanina' ? 'kopanina' : match.level === 'cośtam gramy' ? 'cos-tam-gramy' : match.level === 'semi pro' ? 'semi-pro' : ''}`}>
                      <LevelIcon level={match.level} />
                      {match.level === 'kopanina' ? 'Kopanina' 
                       : match.level === 'cośtam gramy' ? 'Cośtam gramy' 
                       : match.level === 'semi pro' ? 'Semi pro' 
                       : match.level}
                    </span>
                  )}
                </div>

                {/* Meta - kluczowe informacje w dwóch wierszach */}
                <div className="match-meta">
                  <div className="match-meta-row">
                    <span className="match-meta-item">
                      <span className="match-meta-icon">📅</span>
                      {formatDateTime(match.date_start)} - {formatTime(match.date_end)}
                    </span>
                    <span className="match-meta-item">
                      <span className="match-meta-icon">📍</span>
                      {match.location}
                    </span>
                  </div>
                  <div className="match-meta-row">
                    <span className="match-meta-item">
                      <span className="match-meta-icon">💳</span>
                      {match.is_free 
                        ? 'Za darmo' 
                        : (() => {
                            const methods = match.payment_methods && match.payment_methods.length > 0 
                              ? match.payment_methods.map((m: string) => m === 'cash' ? 'Gotówka' : 'BLIK').join(', ')
                              : 'Brak informacji';
                            const fee = match.entry_fee ? ` - ${match.entry_fee}` : '';
                            return methods + fee;
                          })()}
                    </span>
                    <span className="match-meta-item">
                      <span className="match-meta-icon">👥</span>
                      {match.registered_count}/{match.max_players} graczy
                      {isFull && <span className="match-full-indicator"> (Pełny)</span>}
                    </span>
                  </div>
                </div>

                {/* Organizator z kontaktem */}
                <div className="match-organizer">
                  <span className="match-organizer-label">Organizator:</span>
                  <span className="match-organizer-contact">
                    📞 {((match as any).organizer_phone && (match as any).organizer_phone.trim() !== '') 
                      ? (match as any).organizer_phone 
                      : ((match as any).organizer_email && (match as any).organizer_email.trim() !== '') 
                        ? (match as any).organizer_email 
                        : 'Brak kontaktu'}
                  </span>
                </div>

                {/* Opis (jeśli jest) */}
                {match.description && (
                  <p className="match-description">
                    {match.description}
                  </p>
                )}

                {/* Footer - Status + CTA */}
                <div className="match-footer">
                  <span className={`status-badge ${
                    match.status === 'active'
                      ? isFull ? 'status-full' : 'status-active'
                      : match.status === 'finished'
                      ? 'status-finished'
                      : 'status-canceled'
                  }`}>
                    {match.status === 'canceled'
                      ? 'Odwołany'
                      : match.status === 'finished'
                      ? 'Zakończony'
                      : isFull
                      ? 'Pełny'
                      : 'Wolne miejsca'}
                  </span>
                  
                  <div className="match-actions">
                    {match.status === 'active' && !isRegistered && !isOnWaitlist && (
                      <button
                        onClick={() => handleRegister(match.id)}
                        disabled={registering === match.id}
                        className="btn btn-primary"
                      >
                        {registering === match.id 
                          ? 'Zapisywanie...' 
                          : isFull 
                            ? 'Zapisz się na listę rezerwową' 
                            : 'Zapisz się'}
                      </button>
                    )}
                    {match.status === 'active' && (isRegistered || isOnWaitlist) && (
                      <>
                        <button
                          onClick={() => handleUnregister(match.id, match)}
                          disabled={unregistering === match.id}
                          className="btn btn-danger"
                        >
                          {unregistering === match.id 
                            ? 'Anulowanie...' 
                            : isRegistered 
                              ? 'Wypisz się' 
                              : 'Zrezygnuj z listy rezerwowej'}
                        </button>
                        <span className="badge badge-success">
                          {isRegistered ? 'Zapisany' : 'Na liście rezerwowej'}
                        </span>
                      </>
                    )}
                    <Link href={`/mecz/${match.id}`} className="btn btn-secondary">
                      Szczegóły
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

