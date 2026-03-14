'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isAfter } from 'date-fns';
import MatchWizard from '@/components/match-wizard/MatchWizard';
import { WizardFormData } from '@/components/match-wizard/wizardTypes';

interface Match {
  id: number;
  name: string;
  description?: string;
  date_start: string;
  date_end: string;
  location: string;
  status: string;
  level?: string;
  registration_id: number | null;
  isCreatedByUser?: boolean;
  is_private?: boolean;
  private_token?: string;
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

export default function MyMatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [unregistering, setUnregistering] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState<number | null>(null);

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

      // Pobierz wszystkie mecze (bez filtrowania po poziomie i meczach prywatnych, aby zobaczyć wszystkie mecze użytkownika)
      // Używamy parametru skipLevelFilter, aby pominąć filtrowanie po poziomie
      // Używamy parametru skipPrivateFilter, aby zobaczyć również mecze prywatne użytkownika
      const matchesRes = await fetch('/api/matches?status=&skipLevelFilter=true&skipPrivateFilter=true');
      const allMatches = await matchesRes.json();

      // Filtruj mecze:
      // 1. Na które użytkownik jest zapisany
      // 2. Utworzone przez użytkownika (organizer_phone = telefon użytkownika lub organizer_email = email użytkownika)
      console.log('MyMatches loadData: Filtering matches', {
        userId: userData.id,
        userPhone: userData.phone,
        userEmail: userData.email,
        totalMatches: allMatches.length,
        sampleMatches: allMatches.slice(0, 3).map((m: any) => ({
          id: m.id,
          name: m.name,
          organizer_phone: m.organizer_phone,
          organizer_email: m.organizer_email,
          registrationCount: m.registrations?.length || 0,
        })),
      });
      const userMatches = allMatches
        .filter((match: any) => {
          // Mecz utworzony przez użytkownika (sprawdź po telefonie lub emailu)
          const isCreatedByUser = (userData.phone && match.organizer_phone === userData.phone) ||
                                  (userData.email && match.organizer_email === userData.email);
          // Mecz, na który użytkownik jest zapisany
          const isRegistered = match.registrations?.some((reg: any) => reg.user_id === userData.id) || false;
          const matches = isCreatedByUser || isRegistered;
          if (matches) {
            console.log('MyMatches loadData: Match matches user', {
              matchId: match.id,
              matchName: match.name,
              isCreatedByUser,
              isRegistered,
              organizer_phone: match.organizer_phone,
              organizer_email: match.organizer_email,
            });
          }
          return matches;
        })
        .map((match: any) => {
          const registration = match.registrations.find((reg: any) => reg.user_id === userData.id);
          return {
            ...match,
            registration_id: registration?.id || null, // null jeśli użytkownik nie jest zapisany (ale utworzył mecz)
            isCreatedByUser: (userData.phone && match.organizer_phone === userData.phone) ||
                            (userData.email && match.organizer_email === userData.email),
          };
        });

      setMatches(userMatches);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (formData: WizardFormData) => {
    setSaving(true);

    try {
      const dateStartAsUTC = new Date(`${formData.date_start}T${formData.time_start}:00Z`);
      const dateEndAsUTC = new Date(`${formData.date_start}T${formData.time_end}:00Z`);
      const dateStart = new Date(dateStartAsUTC.getTime() - 1 * 60 * 60 * 1000);
      const dateEnd = new Date(dateEndAsUTC.getTime() - 1 * 60 * 60 * 1000);

      let registrationStart: string | undefined = undefined;
      let registrationEnd: string | undefined = undefined;

      if (formData.registration_start_offset !== 'now') {
        const startOffsetDays = formData.registration_start_offset === '1_day' ? 1 :
                                formData.registration_start_offset === '2_days' ? 2 : 3;
        const startDate = new Date(dateStart);
        startDate.setDate(startDate.getDate() - startOffsetDays);
        registrationStart = startDate.toISOString();
      } else {
        registrationStart = new Date().toISOString();
      }

      if (formData.registration_end_offset !== 'to_start') {
        const endOffsetHours = formData.registration_end_offset === '6h' ? 6 :
                               formData.registration_end_offset === '12h' ? 12 : 24;
        const endDate = new Date(dateStart);
        endDate.setHours(endDate.getHours() - endOffsetHours);
        registrationEnd = endDate.toISOString();
      } else {
        registrationEnd = dateStart.toISOString();
      }

      const matchData = {
        name: formData.name,
        description: formData.description,
        date_start: dateStart.toISOString(),
        date_end: dateEnd.toISOString(),
        location: formData.location,
        max_players: parseInt(formData.max_players),
        payment_methods: formData.payment_methods,
        level: formData.level,
        registration_start: registrationStart,
        registration_end: registrationEnd,
        entry_fee: formData.is_free ? undefined : formData.entry_fee,
        is_free: formData.is_free,
        is_private: formData.is_private,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
      };

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (res.ok) {
        setShowForm(false);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Błąd podczas tworzenia meczu');
      }
    } catch (error) {
      alert('Błąd podczas tworzenia meczu');
    } finally {
      setSaving(false);
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

  // Funkcja pomocnicza do uzyskania identyfikatora meczu dla URL (ID dla zwykłych, token dla prywatnych)
  const getMatchUrlIdentifier = (match: Match): string => {
    return (match.is_private && (match as any).private_token) ? (match as any).private_token : match.id.toString();
  };

  const copyMatchLink = async (match: Match) => {
    // Dla meczów prywatnych używamy private_token, dla zwykłych - ID
    const matchIdentifier = match.is_private && (match as any).private_token ? (match as any).private_token : match.id;
    const matchLink = `${window.location.origin}/mecz/${matchIdentifier}`;
    try {
      await navigator.clipboard.writeText(matchLink);
      setCopiedMatchId(match.id);
      setTimeout(() => setCopiedMatchId(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback dla starszych przeglądarek
      const textArea = document.createElement('textarea');
      textArea.value = matchLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMatchId(match.id);
      setTimeout(() => setCopiedMatchId(null), 2000);
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-color)' }}>
          Moje mecze
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            + Utwórz mecz
          </button>
        )}
      </div>

      {showForm && (
        <MatchWizard
          onSubmit={handleCreateMatch}
          saving={saving}
          onCancel={() => setShowForm(false)}
        />
      )}

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
                {/* Nagłówek z nazwą i badge poziomu */}
                <div className="match-header">
                  <h3>
                    <Link href={`/mecz/${getMatchUrlIdentifier(match)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
                
                {match.description && (
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-light)' }}>
                    {match.description}
                  </p>
                )}

                <div className="match-meta">
                  <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                  <span>📍 {match.location}</span>
                  <span>📞 {((match as any).organizer_phone && (match as any).organizer_phone.trim() !== '') 
                    ? (match as any).organizer_phone 
                    : ((match as any).organizer_email && (match as any).organizer_email.trim() !== '') 
                      ? (match as any).organizer_email 
                      : 'Brak kontaktu'}</span>
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
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={`/mecz/${getMatchUrlIdentifier(match)}`} className="btn btn-secondary">
                      Szczegóły
                    </Link>
                    {match.isCreatedByUser && match.is_private && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-color)' }}>
                          Link do zapisu:
                        </span>
                        <code style={{ fontSize: '0.85rem', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', backgroundColor: 'white', borderRadius: '3px' }}>
                          {(() => {
                            const matchIdentifier = match.is_private && (match as any).private_token ? (match as any).private_token : match.id;
                            return typeof window !== 'undefined' ? `${window.location.origin}/mecz/${matchIdentifier}` : `/mecz/${matchIdentifier}`;
                          })()}
                        </code>
                        <button
                          onClick={() => copyMatchLink(match)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: copiedMatchId === match.id ? 'var(--success-color)' : 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {copiedMatchId === match.id ? '✓ Skopiowano' : '📋 Kopiuj link'}
                        </button>
                      </div>
                    )}
                    {match.registration_id !== null && (
                      <button
                        onClick={() => handleUnregister(match.registration_id!)}
                        disabled={unregistering === match.registration_id}
                        className="btn btn-danger"
                      >
                        {unregistering === match.registration_id ? 'Anulowanie...' : 'Anuluj udział'}
                      </button>
                    )}
                    {match.isCreatedByUser && !match.registration_id && !match.is_private && (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        Twój mecz
                      </span>
                    )}
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
                {/* Nagłówek z nazwą i badge poziomu */}
                <div className="match-header">
                  <h3>
                    <Link href={`/mecz/${getMatchUrlIdentifier(match)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
                
                <div className="match-meta">
                  <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                  <span>📍 {match.location}</span>
                  <span>📞 {((match as any).organizer_phone && (match as any).organizer_phone.trim() !== '') 
                    ? (match as any).organizer_phone 
                    : ((match as any).organizer_email && (match as any).organizer_email.trim() !== '') 
                      ? (match as any).organizer_email 
                      : 'Brak kontaktu'}</span>
                </div>
                <div className="match-footer">
                  <span className={`status-badge ${
                    match.status === 'finished' ? 'status-finished' : 'status-canceled'
                  }`}>
                    {match.status === 'finished' ? 'Zakończony' : 'Odwołany'}
                  </span>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={`/mecz/${getMatchUrlIdentifier(match)}`} className="btn btn-secondary">
                      Szczegóły
                    </Link>
                    {match.isCreatedByUser && match.is_private && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-color)' }}>
                          Link do zapisu:
                        </span>
                        <code style={{ fontSize: '0.85rem', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', backgroundColor: 'white', borderRadius: '3px' }}>
                          {(() => {
                            const matchIdentifier = match.is_private && (match as any).private_token ? (match as any).private_token : match.id;
                            return typeof window !== 'undefined' ? `${window.location.origin}/mecz/${matchIdentifier}` : `/mecz/${matchIdentifier}`;
                          })()}
                        </code>
                        <button
                          onClick={() => copyMatchLink(match)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: copiedMatchId === match.id ? 'var(--success-color)' : 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {copiedMatchId === match.id ? '✓ Skopiowano' : '📋 Kopiuj link'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

