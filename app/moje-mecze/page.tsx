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
}

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
    registration_start_date: '',
    registration_start_time: '',
    registration_end_date: '',
    registration_end_time: '',
    entry_fee: '',
    is_free: false,
    is_recurring: false,
    recurrence_frequency: '',
  });

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

      // Pobierz wszystkie mecze (bez filtrowania po poziomie, aby zobaczyć wszystkie mecze użytkownika)
      // Używamy parametru skipLevelFilter, aby pominąć filtrowanie po poziomie
      const matchesRes = await fetch('/api/matches?status=&skipLevelFilter=true');
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

      const registrationStart = formData.registration_start_date && formData.registration_start_time
        ? new Date(`${formData.registration_start_date}T${formData.registration_start_time}:00`).toISOString()
        : undefined;
      const registrationEnd = formData.registration_end_date && formData.registration_end_time
        ? new Date(`${formData.registration_end_date}T${formData.registration_end_time}:00`).toISOString()
        : undefined;

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
          registration_start_date: '',
          registration_start_time: '',
          registration_end_date: '',
          registration_end_time: '',
          entry_fee: '',
          is_free: false,
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
                registration_start_date: '',
                registration_start_time: '',
                registration_end_date: '',
                registration_end_time: '',
                entry_fee: '',
                is_free: false,
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

            <div style={{ 
              border: '2px solid #28a745', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              marginTop: '1rem',
              backgroundColor: '#f0fff4'
            }}>
              <h3 style={{ 
                color: '#28a745', 
                fontWeight: 'bold', 
                textAlign: 'center', 
                marginBottom: '1rem',
                marginTop: 0
              }}>
                Zapisy
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>Data rozpoczęcia zapisów</label>
                  <input
                    type="date"
                    value={formData.registration_start_date}
                    onChange={(e) => setFormData({ ...formData, registration_start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Godzina rozpoczęcia zapisów</label>
                  <input
                    type="time"
                    value={formData.registration_start_time}
                    onChange={(e) => setFormData({ ...formData, registration_start_time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Data zakończenia zapisów</label>
                  <input
                    type="date"
                    value={formData.registration_end_date}
                    onChange={(e) => setFormData({ ...formData, registration_end_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Godzina zakończenia zapisów</label>
                  <input
                    type="time"
                    value={formData.registration_end_time}
                    onChange={(e) => setFormData({ ...formData, registration_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Maksymalna liczba graczy *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.max_players}
                  onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ marginBottom: 0 }}>Wpisowe</label>
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
                <h3>{match.name}</h3>
                {match.description && (
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-light)' }}>
                    {match.description}
                  </p>
                )}

                <div className="match-meta">
                  <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                  <span>📍 {match.location}</span>
                  {match.level && (
                    <span>🎯 {match.level === 'kopanina' ? 'Kopanina' : match.level === 'cośtam gramy' ? 'Cośtam gramy' : match.level === 'semi pro' ? 'Semi pro' : match.level}</span>
                  )}
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
                    {match.registration_id !== null && (
                      <button
                        onClick={() => handleUnregister(match.registration_id!)}
                        disabled={unregistering === match.registration_id}
                        className="btn btn-danger"
                      >
                        {unregistering === match.registration_id ? 'Anulowanie...' : 'Anuluj udział'}
                      </button>
                    )}
                    {match.isCreatedByUser && !match.registration_id && (
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
                <h3>{match.name}</h3>
                <div className="match-meta">
                  <span>📅 {formatDateTime(match.date_start)} - {formatTime(match.date_end)}</span>
                  <span>📍 {match.location}</span>
                  {match.level && (
                    <span>🎯 {match.level === 'kopanina' ? 'Kopanina' : match.level === 'cośtam gramy' ? 'Cośtam gramy' : match.level === 'semi pro' ? 'Semi pro' : match.level}</span>
                  )}
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

