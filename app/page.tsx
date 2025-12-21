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
  registered_count: number;
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    status: 'active',
    dateFrom: '',
  });

  useEffect(() => {
    loadMatches();
  }, [filters]);

  const loadMatches = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.location) params.append('location', filters.location);
    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);

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
      <h1 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>
        Nadchodzące mecze
      </h1>

      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); loadMatches(); }}>
          <div className="form-group">
            <label>Lokalizacja</label>
            <input
              type="text"
              placeholder="Szukaj po lokalizacji..."
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
            <label>Data od</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Filtruj
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading">Ładowanie meczów...</div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <h3>Brak meczów</h3>
          <p>Nie znaleziono meczów spełniających kryteria wyszukiwania.</p>
        </div>
      ) : (
        <div>
          {matches.map((match) => (
            <div key={match.id} className="card match-card">
              <h3>{match.name}</h3>
              {match.description && <p style={{ marginTop: '0.5rem', color: 'var(--text-light)' }}>{match.description}</p>}
              
              <div className="match-meta">
                <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                <span>📍 {match.location}</span>
                <span>👥 {match.registered_count}/{match.max_players} graczy</span>
                <span>📞 {match.organizer_phone}</span>
                <span>💳 {match.payment_methods.map((m: string) => m === 'cash' ? 'Gotówka' : 'BLIK').join(', ')}</span>
              </div>

              <div className="match-footer">
                {getStatusBadge(match.status)}
                <Link href={`/mecz/${match.id}`} className="btn btn-primary">
                  Szczegóły
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

