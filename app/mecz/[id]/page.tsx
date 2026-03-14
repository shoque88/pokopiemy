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
  organizer_phone?: string;
  organizer_email?: string;
  payment_methods: string[];
  status: string;
  level: string;
  entry_fee?: string;
  is_free?: boolean;
  is_private?: boolean;
  private_token?: string;
  registrations: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      phone?: string;
      email?: string;
      preferred_level?: string;
      avatar?: string;
    };
  }>;
  registered_count: number;
  waitlist?: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      phone?: string;
      email?: string;
      preferred_level?: string;
      avatar?: string;
    };
  }>;
  waitlist_count?: number;
}

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadMatch();
    loadUser();
  }, [params.id]);

  const loadMatch = async () => {
    try {
      // Użyj cache: 'no-store' aby zawsze pobrać najnowsze dane
      const res = await fetch(`/api/matches/${params.id}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        console.log('loadMatch: Loaded match data', { 
          matchId: data.id,
          matchName: data.name,
          is_private: data.is_private,
          is_private_type: typeof data.is_private,
          organizer_phone: data.organizer_phone,
          organizer_email: data.organizer_email,
          private_token: data.private_token,
          registrationCount: data.registered_count,
          registrations: data.registrations?.length || 0
        });
        
        // Jeśli mecz jest prywatny i użytkownik wszedł przez ID, przekieruj na token
        const isNumeric = /^\d+$/.test(params.id as string);
        if (data.is_private && data.private_token && isNumeric && typeof window !== 'undefined') {
          console.log('loadMatch: Redirecting to private token URL', { 
            oldUrl: params.id, 
            newToken: data.private_token 
          });
          router.replace(`/mecz/${data.private_token}`);
          return;
        }
        
        setMatch(data);
      } else {
        // Jeśli nie udało się załadować (np. mecz prywatny dostępny przez ID), pokaż błąd
        if (res.status === 404) {
          setMatch(null);
        }
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
        console.log('loadUser: Loaded user data', {
          userId: data.id,
          userName: data.name,
          userPhone: data.phone,
          userEmail: data.email
        });
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
        setMessage({ type: 'success', text: data.message || 'Zostałeś zapisany na mecz!' });
        // Poczekaj chwilę, aby upewnić się, że dane są zapisane, a następnie odśwież
        await new Promise(resolve => setTimeout(resolve, 100));
        await loadMatch();
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

    // Szukaj w normalnych rejestracjach
    let registration = match.registrations.find((r) => r.user.id === user.id);
    // Jeśli nie znaleziono, szukaj w liście rezerwowej
    if (!registration && match.waitlist) {
      registration = match.waitlist.find((r) => r.user.id === user.id);
    }
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

  const copyMatchLink = async () => {
    if (!match) return;
    // Dla meczów prywatnych używamy private_token, dla zwykłych - ID
    const matchIdentifier = match.is_private && match.private_token ? match.private_token : match.id;
    const matchLink = typeof window !== 'undefined' ? `${window.location.origin}/mecz/${matchIdentifier}` : `/mecz/${matchIdentifier}`;
    try {
      await navigator.clipboard.writeText(matchLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback dla starszych przeglądarek
      const textArea = document.createElement('textarea');
      textArea.value = matchLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleCancelMatch = async () => {
    if (!match || !user) return;

    if (!confirm('Czy na pewno chcesz odwołać ten mecz? Wszyscy zapisani gracze otrzymają powiadomienie.')) {
      return;
    }

    setCanceling(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/matches/${match.id}/cancel`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Mecz został odwołany' });
        loadMatch();
      } else {
        setMessage({ type: 'error', text: data.error || 'Błąd podczas odwoływania meczu' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas odwoływania meczu' });
    } finally {
      setCanceling(false);
    }
  };

  const handleRemovePlayer = async (registrationId: number, userId: number, playerName: string) => {
    if (!match || !user) return;

    // Popup 1: Potwierdzenie usunięcia zapisu
    if (!confirm(`Czy na pewno chcesz usunąć zapis gracza ${playerName}?`)) {
      return;
    }

    setRemoving(registrationId);
    setMessage(null);

    try {
      // Usuń zapis
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Błąd podczas usuwania zapisu' });
        return;
      }

      // Popup 2: Pytanie o banowanie
      const shouldBan = confirm(`Czy chcesz zablokować graczowi ${playerName} możliwość zapisania się do tego meczu?`);

      if (shouldBan) {
        // Zbanuj gracza
        const matchIdentifier = match.is_private && match.private_token ? match.private_token : match.id;
        const banRes = await fetch(`/api/matches/${matchIdentifier}/ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });

        if (banRes.ok) {
          setMessage({ type: 'success', text: `Gracz ${playerName} został usunięty i zbanowany z meczu` });
        } else {
          const banData = await banRes.json();
          setMessage({ type: 'error', text: banData.error || 'Błąd podczas banowania gracza' });
        }
      } else {
        setMessage({ type: 'success', text: `Gracz ${playerName} został usunięty z meczu` });
      }

      // Odśwież dane meczu
      loadMatch();
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas usuwania gracza' });
    } finally {
      setRemoving(null);
    }
  };

  const isRegistered = user && match?.registrations.some((r) => r.user.id === user.id);
  const isOnWaitlist = user && match?.waitlist?.some((r) => r.user.id === user.id);
  const isFull = match ? match.registered_count >= match.max_players : false;
  const isOrganizer = user && match && (
    (user.phone && match.organizer_phone && user.phone.trim() === match.organizer_phone.trim()) ||
    (user.email && match.organizer_email && user.email.trim().toLowerCase() === match.organizer_email.trim().toLowerCase())
  );

  // Debug log
  useEffect(() => {
    if (match) {
      console.log('=== MATCH DETAILS DEBUG ===');
      console.log('Match data:', {
        id: match.id,
        name: match.name,
        is_private: match.is_private,
        is_private_type: typeof match.is_private,
        organizer_phone: match.organizer_phone,
        organizer_email: match.organizer_email
      });
      if (user) {
        console.log('User data:', {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email
        });
        console.log('isOrganizer calculation:', {
          isOrganizer,
          phoneMatch: user.phone && match.organizer_phone && user.phone.trim() === match.organizer_phone.trim(),
          emailMatch: user.email && match.organizer_email && user.email.trim().toLowerCase() === match.organizer_email.trim().toLowerCase(),
          shouldShowLink: isOrganizer && match.is_private
        });
      } else {
        console.log('User: NOT LOGGED IN');
      }
      console.log('========================');
    }
  }, [match, user, isOrganizer]);

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
        {((match.organizer_phone && match.organizer_phone.trim() !== '') || 
          (match.organizer_email && match.organizer_email.trim() !== '')) && (
          <div className="info-item">
            <span className="info-label">Kontakt organizatora</span>
            <span className="info-value">
              {(match.organizer_phone && match.organizer_phone.trim() !== '') 
                ? match.organizer_phone 
                : match.organizer_email}
            </span>
          </div>
        )}
        <div className="info-item">
          <span className="info-label">Max graczy</span>
          <span className="info-value">{match.max_players}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Poziom</span>
          <span className={`info-value badge badge-level badge-level-${match.level === 'kopanina' ? 'kopanina' : match.level === 'cośtam gramy' ? 'cos-tam-gramy' : match.level === 'semi pro' ? 'semi-pro' : ''}`}>
            {match.level === 'kopanina' ? 'Kopanina' :
             match.level === 'cośtam gramy' ? 'Cośtam gramy' :
             match.level === 'semi pro' ? 'Semi pro' :
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
        {match.is_private && (
          <div className="info-item">
            <span className="info-label">Typ meczu</span>
            <span className="info-value">
              <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>🔒 Prywatny</span>
            </span>
          </div>
        )}
      </div>

      {isOrganizer && match.is_private && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
            Link do udostępnienia uczestnikom
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <code style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem',
              color: 'var(--text-color)',
              wordBreak: 'break-all'
            }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/mecz/${match.id}` : `/mecz/${match.id}`}
            </code>
            <button
              onClick={copyMatchLink}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: linkCopied ? 'var(--success-color)' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              {linkCopied ? '✓ Skopiowano' : '📋 Kopiuj link'}
            </button>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Udostępnij ten link osobom, które chcesz zaprosić na mecz. Tylko osoby z tym linkiem będą mogły zobaczyć i zapisać się na ten mecz.
          </p>
        </div>
      )}

      <div className="players-list">
        <h2>Zapisani gracze ({match.registered_count}/{match.max_players})</h2>
        {match.registrations.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>Brak zapisanych graczy</p>
        ) : (
          <div className="players-grid">
            {match.registrations.map((reg) => {
              const isPlayerOrganizer = (reg.user.phone && reg.user.phone === match.organizer_phone) ||
                                        (reg.user.email && reg.user.email === match.organizer_email);
              return (
                <div 
                  key={reg.id} 
                  className="player-card"
                  style={{
                    ...(isPlayerOrganizer ? { border: '2px solid #28a745', backgroundColor: '#f0fff4' } : {}),
                    position: 'relative',
                  }}
                >
                  {isOrganizer && !isPlayerOrganizer && (
                    <button
                      onClick={() => handleRemovePlayer(reg.id, reg.user.id, reg.user.name)}
                      disabled={removing === reg.id}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: removing === reg.id ? 'wait' : 'pointer',
                        fontSize: '1.2rem',
                        color: '#dc3545',
                        padding: '0.25rem',
                        lineHeight: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Usuń gracza"
                    >
                      ×
                    </button>
                  )}
                  {reg.user.avatar && (
                    <img 
                      src={reg.user.avatar} 
                      alt={reg.user.name} 
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        marginBottom: '0.5rem',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div className="player-name">{reg.user.name}</div>
                  {isPlayerOrganizer && (
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#28a745', 
                      fontWeight: 'bold',
                      marginTop: '0.25rem'
                    }}>
                      Organizator
                    </div>
                  )}
                  {reg.user.preferred_level && (
                    <div className="player-position">Poziom: {reg.user.preferred_level}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {match.waitlist && match.waitlist.length > 0 && (
        <div className="players-list" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          <h2>Lista rezerwowa ({match.waitlist_count || match.waitlist.length})</h2>
          <div className="players-grid">
            {match.waitlist.map((reg, index) => (
              <div 
                key={reg.id} 
                className="player-card"
                style={{ opacity: 0.7, border: '1px dashed var(--border-color)' }}
              >
                {reg.user.avatar && (
                  <img 
                    src={reg.user.avatar} 
                    alt={reg.user.name} 
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '50%', 
                      marginBottom: '0.5rem',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div className="player-name">{reg.user.name}</div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-light)', 
                  marginTop: '0.25rem'
                }}>
                  Pozycja #{index + 1}
                </div>
                {reg.user.preferred_level && (
                  <div className="player-position">Poziom: {reg.user.preferred_level}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {match.status === 'active' && (
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          {isOrganizer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={handleCancelMatch}
                disabled={canceling}
                className="btn btn-danger"
              >
                {canceling ? 'Odwoływanie...' : 'Odwołaj mecz'}
              </button>
              {isRegistered ? (
                <button
                  onClick={handleUnregister}
                  disabled={registering}
                  className="btn btn-secondary"
                >
                  {registering ? 'Anulowanie...' : 'Anuluj swój udział'}
                </button>
              ) : isOnWaitlist ? (
                <button
                  onClick={handleUnregister}
                  disabled={registering}
                  className="btn btn-secondary"
                >
                  {registering ? 'Anulowanie...' : 'Zrezygnuj z listy rezerwowej'}
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="btn btn-primary"
                >
                  {registering ? 'Zapisywanie...' : isFull ? 'Zapisz się na listę rezerwową' : 'Zapisz się'}
                </button>
              )}
            </div>
          ) : (
            <>
              {isRegistered ? (
                <button
                  onClick={handleUnregister}
                  disabled={registering}
                  className="btn btn-danger"
                >
                  {registering ? 'Anulowanie...' : 'Anuluj udział'}
                </button>
              ) : isOnWaitlist ? (
                <button
                  onClick={handleUnregister}
                  disabled={registering}
                  className="btn btn-secondary"
                >
                  {registering ? 'Anulowanie...' : 'Zrezygnuj z listy rezerwowej'}
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="btn btn-primary"
                >
                  {registering ? 'Zapisywanie...' : isFull ? 'Zapisz się na listę rezerwową' : 'Zapisz się'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

