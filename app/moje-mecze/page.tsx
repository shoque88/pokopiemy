'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isAfter } from 'date-fns';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date_start: '',
    time_start: '',
    time_end: '',
    location: '',
    max_players: '',
    payment_methods: [] as string[],
    level: 'kopanina' as 'kopanina' | 'cośtam gramy' | 'semi pro',
    registration_start_offset: 'now' as 'now' | '1_day' | '2_days' | '3_days',
    registration_end_offset: 'to_start' as 'to_start' | '6h' | '12h' | '24h',
    entry_fee: '',
    is_free: false,
    is_private: false,
    is_recurring: false,
    recurrence_frequency: '',
  });
  const [showPrivateTooltip, setShowPrivateTooltip] = useState(false);
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

  const togglePaymentMethod = (method: string) => {
    setFormData({
      ...formData,
      payment_methods: formData.payment_methods.includes(method)
        ? formData.payment_methods.filter((m) => m !== method)
        : [...formData.payment_methods, method],
    });
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Traktujemy datę i czas jako czas lokalny w miejscu meczu (Polska, UTC+1 zimą, UTC+2 latem)
      // Dla uproszczenia zakładamy UTC+1 (zima) jako konserwatywne oszacowanie
      // Jeśli użytkownik wpisuje "18:00", to oznacza "18:00 czasu polskiego"
      // "18:00 czasu polskiego" (UTC+1) = "17:00 UTC"
      //
      // Aby traktować datę jako czas polski niezależnie od strefy czasowej przeglądarki użytkownika,
      // tworzymy Date obiekt jako UTC i odejmujemy offset Polski (UTC+1 = 1 godzina)
      // Przykład: użytkownik wpisuje "18:00" -> chcemy "18:00 czasu polskiego" = "17:00 UTC"
      // Tworzymy "18:00 UTC" i odejmujemy 1h = "17:00 UTC" ✓
      const dateStartStr = `${formData.date_start}T${formData.time_start}:00`;
      const dateEndStr = `${formData.date_start}T${formData.time_end}:00`;
      
      // Tworzymy Date obiekt - bez 'Z' JavaScript zinterpretuje to jako lokalny czas przeglądarki
      // Ale my chcemy, aby to było zawsze czas polski, więc traktujemy jako UTC i odejmujemy offset
      // Najprostsze: utwórz jako UTC (dodając Z) i odejmij offset Polski
      const dateStartAsUTC = new Date(`${formData.date_start}T${formData.time_start}:00Z`);
      const dateEndAsUTC = new Date(`${formData.date_start}T${formData.time_end}:00Z`);
      
      // Odejmujemy 1 godzinę (offset Polski UTC+1) aby uzyskać właściwy czas UTC
      // "18:00" użytkownika → "18:00 UTC" → "17:00 UTC" (reprezentuje "18:00 czasu polskiego")
      const dateStart = new Date(dateStartAsUTC.getTime() - 1 * 60 * 60 * 1000);
      const dateEnd = new Date(dateEndAsUTC.getTime() - 1 * 60 * 60 * 1000);
      
      console.log('MyMatches handleSubmit: Date conversion', {
        userInput: { date: formData.date_start, start: formData.time_start, end: formData.time_end },
        dateStartAsUTC: dateStartAsUTC.toISOString(),
        dateEndAsUTC: dateEndAsUTC.toISOString(),
        dateStartFinal: dateStart.toISOString(),
        dateEndFinal: dateEnd.toISOString(),
      });

      // Oblicz daty zapisów na podstawie offsetów
      let registrationStart: string | undefined = undefined;
      let registrationEnd: string | undefined = undefined;
      
      if (formData.registration_start_offset !== 'now') {
        const startOffsetDays = formData.registration_start_offset === '1_day' ? 1 : 
                                formData.registration_start_offset === '2_days' ? 2 : 3;
        const startDate = new Date(dateStart);
        startDate.setDate(startDate.getDate() - startOffsetDays);
        registrationStart = startDate.toISOString();
      } else {
        // "teraz" - ustaw na aktualną datę i godzinę
        registrationStart = new Date().toISOString();
      }
      
      if (formData.registration_end_offset !== 'to_start') {
        const endOffsetHours = formData.registration_end_offset === '6h' ? 6 : 
                               formData.registration_end_offset === '12h' ? 12 : 24;
        const endDate = new Date(dateStart);
        endDate.setHours(endDate.getHours() - endOffsetHours);
        registrationEnd = endDate.toISOString();
      } else {
        // "do rozpoczęcia meczu" - ustaw na datę rozpoczęcia meczu
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

      console.log('MyMatches handleSubmit: Sending match creation request', {
        matchData: { ...matchData, payment_methods: matchData.payment_methods.length },
      });
      
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      const responseData = await res.json();
      console.log('MyMatches handleSubmit: Match creation response', {
        ok: res.ok,
        status: res.status,
        matchId: responseData.id,
        matchName: responseData.name,
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          name: '',
          description: '',
          date_start: '',
          time_start: '',
          time_end: '',
          location: '',
          max_players: '',
          payment_methods: [],
          level: 'kopanina',
          registration_start_offset: 'now',
          registration_end_offset: 'to_start',
          entry_fee: '',
          is_free: false,
          is_private: false,
          is_recurring: false,
          recurrence_frequency: '',
        });
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
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setFormData({
                name: '',
                description: '',
                date_start: '',
                time_start: '',
                time_end: '',
                location: '',
                max_players: '',
                payment_methods: [],
                level: 'kopanina',
                registration_start_offset: 'now',
                registration_end_offset: 'to_start',
                entry_fee: '',
                is_free: false,
                is_private: false,
                is_recurring: false,
                recurrence_frequency: '',
              });
            }
          }}
          className="btn btn-primary"
        >
          {showForm ? 'Anuluj' : '+ Utwórz mecz'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
            Nowy mecz
          </h2>
          <form onSubmit={handleCreateMatch}>
            <div className="form-group">
              <label>Lokalizacja *</label>
              <PlacesAutocomplete
                value={formData.location}
                onChange={(value) => setFormData({ ...formData, location: value })}
                placeholder="Wpisz adres lub nazwę miejsca..."
                required
              />
            </div>

            <div className="form-group">
              <label>Nazwa meczu *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Data rozpoczęcia *</label>
                <input
                  type="date"
                  required
                  value={formData.date_start}
                  onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Godzina rozpoczęcia *</label>
                <input
                  type="time"
                  required
                  value={formData.time_start}
                  onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Godzina zakończenia *</label>
                <input
                  type="time"
                  required
                  value={formData.time_end}
                  onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked, recurrence_frequency: e.target.checked ? formData.recurrence_frequency : '' })}
                />
                <label>Wydarzenie cykliczne</label>
              </div>
            </div>

            {formData.is_recurring && (
              <div className="form-group">
                <label>Częstotliwość</label>
                <select
                  value={formData.recurrence_frequency}
                  onChange={(e) => setFormData({ ...formData, recurrence_frequency: e.target.value })}
                >
                  <option value="">Wybierz częstotliwość</option>
                  <option value="daily">Codziennie</option>
                  <option value="weekly">Raz w tygodniu</option>
                  <option value="monthly">Raz w miesiącu</option>
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Rozpoczęcie zapisów</label>
                <select
                  value={formData.registration_start_offset}
                  onChange={(e) => setFormData({ ...formData, registration_start_offset: e.target.value as 'now' | '1_day' | '2_days' | '3_days' })}
                >
                  <option value="now">Teraz</option>
                  <option value="1_day">Dzień przed</option>
                  <option value="2_days">Dwa dni przed</option>
                  <option value="3_days">Trzy dni przed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Zakończenie zapisów</label>
                <select
                  value={formData.registration_end_offset}
                  onChange={(e) => setFormData({ ...formData, registration_end_offset: e.target.value as 'to_start' | '6h' | '12h' | '24h' })}
                >
                  <option value="to_start">Do rozpoczęcia meczu</option>
                  <option value="6h">6h przed</option>
                  <option value="12h">12h przed</option>
                  {formData.registration_start_offset !== '1_day' && (
                    <option value="24h">24h przed</option>
                  )}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Liczba wolnych miejsc *</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={formData.max_players}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, max_players: value });
                }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ marginBottom: 0 }}>Wpisowe *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked, entry_fee: '', payment_methods: e.target.checked ? [] : formData.payment_methods })}
                  />
                  <label style={{ marginBottom: 0, fontWeight: 'normal', whiteSpace: 'nowrap' }}>Za darmo</label>
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.entry_fee}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, entry_fee: value });
                }}
                disabled={formData.is_free}
                placeholder={formData.is_free ? 'Mecz jest za darmo' : 'Wpisz kwotę wpisowego'}
              />
            </div>

            {!formData.is_free && (
              <div className="form-group">
                <label>Metody płatności</label>
                <div className="checkbox-group">
                  <div className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.payment_methods.includes('cash')}
                      onChange={() => togglePaymentMethod('cash')}
                    />
                    <label>Gotówka</label>
                  </div>
                  <div className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.payment_methods.includes('blik')}
                      onChange={() => togglePaymentMethod('blik')}
                    />
                    <label>BLIK</label>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ marginBottom: 0 }}>Prywatny</label>
                <div
                  style={{ 
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={() => setShowPrivateTooltip(true)}
                  onMouseLeave={() => setShowPrivateTooltip(false)}
                >
                  i
                  {showPrivateTooltip && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '5px',
                        padding: '10px',
                        backgroundColor: '#333',
                        color: 'white',
                        borderRadius: '5px',
                        fontSize: '12px',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        maxWidth: '300px',
                        whiteSpace: 'normal',
                        width: '250px'
                      }}
                    >
                      Mecz prywatny jest niewidoczny na stronie głównej. Tylko osoby z odpowiednim linkiem mogą się na niego zapisać. Jako organizator otrzymasz link do udostępnienia uczestnikom.
                    </div>
                  )}
                </div>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                />
                <label>Oznacz mecz jako prywatny</label>
              </div>
            </div>

            <div className="form-group">
              <label>Poziom *</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as 'kopanina' | 'cośtam gramy' | 'semi pro' })}
                required
              >
                <option value="kopanina">Kopanina</option>
                <option value="cośtam gramy">Cośtam gramy</option>
                <option value="semi pro">Semi pro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Uwagi</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Tworzenie...' : 'Utwórz mecz'}
            </button>
          </form>
        </div>
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

