'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';

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
  is_recurring: boolean;
  recurrence_frequency?: string;
}

export default function AdminPanelPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date_start: '',
    time_start: '',
    time_end: '',
    location: '',
    max_players: '',
    organizer_phone: '',
    payment_methods: [] as string[],
    level: 'kopanina' as 'kopanina' | 'cośtam gramy' | 'semi pro',
    status: 'active',
    is_recurring: false,
    recurrence_frequency: '',
    registration_start_date: '',
    registration_start_time: '',
    registration_end_date: '',
    registration_end_time: '',
    entry_fee: '',
    is_free: false,
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
      if (!userData.is_admin) {
        router.push('/');
        return;
      }

      setUser(userData);
      loadMatches();
    } catch (error) {
      router.push('/login');
    }
  };

  const loadMatches = async () => {
    try {
      const res = await fetch('/api/matches?status=');
      const data = await res.json();
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (match: Match) => {
    const startDate = parseISO(match.date_start);
    const endDate = parseISO(match.date_end);
    const registrationStart = (match as any).registration_start ? parseISO((match as any).registration_start) : null;
    const registrationEnd = (match as any).registration_end ? parseISO((match as any).registration_end) : null;

    setEditingMatch(match);
    setFormData({
      name: match.name,
      description: match.description || '',
      date_start: format(startDate, 'yyyy-MM-dd'),
      time_start: format(startDate, 'HH:mm'),
      time_end: format(endDate, 'HH:mm'),
      location: match.location,
      max_players: match.max_players.toString(),
      organizer_phone: match.organizer_phone,
      payment_methods: match.payment_methods,
      level: (match as any).level || 'kopanina',
      status: match.status,
      is_recurring: match.is_recurring,
      recurrence_frequency: match.recurrence_frequency || '',
      registration_start_date: registrationStart ? format(registrationStart, 'yyyy-MM-dd') : '',
      registration_start_time: registrationStart ? format(registrationStart, 'HH:mm') : '',
      registration_end_date: registrationEnd ? format(registrationEnd, 'yyyy-MM-dd') : '',
      registration_end_time: registrationEnd ? format(registrationEnd, 'HH:mm') : '',
      entry_fee: (match as any).entry_fee || '',
      is_free: (match as any).is_free === 1 || (match as any).is_free === true || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten mecz?')) {
      return;
    }

    try {
      const res = await fetch(`/api/matches/${id}`, {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dateStart = new Date(`${formData.date_start}T${formData.time_start}`);
      const dateEnd = new Date(`${formData.date_start}T${formData.time_end}`);

      const registrationStart = formData.registration_start_date && formData.registration_start_time
        ? new Date(`${formData.registration_start_date}T${formData.registration_start_time}`).toISOString()
        : undefined;
      const registrationEnd = formData.registration_end_date && formData.registration_end_time
        ? new Date(`${formData.registration_end_date}T${formData.registration_end_time}`).toISOString()
        : undefined;

      const matchData = {
        name: formData.name,
        description: formData.description,
        date_start: dateStart.toISOString(),
        date_end: dateEnd.toISOString(),
        location: formData.location,
        max_players: parseInt(formData.max_players),
        organizer_phone: formData.organizer_phone,
        payment_methods: formData.payment_methods,
        level: formData.level,
        status: formData.status,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
        registration_start: registrationStart,
        registration_end: registrationEnd,
        entry_fee: formData.is_free ? undefined : formData.entry_fee,
        is_free: formData.is_free,
      };

      const url = editingMatch ? `/api/matches/${editingMatch.id}` : '/api/matches';
      const method = editingMatch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingMatch(null);
        setFormData({
          name: '',
          description: '',
          date_start: '',
          time_start: '',
          time_end: '',
          location: '',
          max_players: '',
          organizer_phone: '',
          payment_methods: [],
          level: 'kopanina',
          status: 'active',
          is_recurring: false,
          recurrence_frequency: '',
          registration_start_date: '',
          registration_start_time: '',
          registration_end_date: '',
          registration_end_time: '',
          entry_fee: '',
          is_free: false,
        });
        loadMatches();
      } else {
        const data = await res.json();
        alert(data.error || 'Błąd podczas zapisywania meczu');
      }
    } catch (error) {
      alert('Błąd podczas zapisywania meczu');
    } finally {
      setSaving(false);
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

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm');
  };

  if (loading) {
    return <div className="loading">Ładowanie panelu...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-color)' }}>Panel organizatora</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingMatch(null);
            setFormData({
              name: '',
              description: '',
              date_start: '',
              time_start: '',
              time_end: '',
              location: '',
              max_players: '',
              organizer_phone: '',
              payment_methods: [],
              level: 'kopanina',
              status: 'active',
              is_recurring: false,
              recurrence_frequency: '',
              registration_start_date: '',
              registration_start_time: '',
              registration_end_date: '',
              registration_end_time: '',
              entry_fee: '',
              is_free: false,
            });
          }}
          className="btn btn-primary"
        >
          {showForm ? 'Anuluj' : '+ Dodaj mecz'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
            {editingMatch ? 'Edytuj mecz' : 'Nowy mecz'}
          </h2>
          <form onSubmit={handleSubmit}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

              <div className="form-group">
                <label>Telefon organizatora *</label>
                <input
                  type="tel"
                  required
                  value={formData.organizer_phone}
                  onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
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
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Aktywny</option>
                <option value="finished">Zakończony</option>
                <option value="canceled">Odwołany</option>
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
              {saving ? 'Zapisywanie...' : editingMatch ? 'Zaktualizuj mecz' : 'Utwórz mecz'}
            </button>
          </form>
        </div>
      )}

      <div>
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
          Wszystkie mecze ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <div className="empty-state">
            <p>Brak meczów. Dodaj pierwszy mecz!</p>
          </div>
        ) : (
          <div>
            {matches.map((match) => (
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
                  <span>👥 Max: {match.max_players} graczy</span>
                  <span>📞 {match.organizer_phone}</span>
                  {match.is_recurring && (
                    <span>🔄 Cykliczny ({match.recurrence_frequency === 'daily' ? 'codziennie' :
                                         match.recurrence_frequency === 'weekly' ? 'raz w tygodniu' :
                                         'raz w miesiącu'})</span>
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
                    <button
                      onClick={() => handleEdit(match)}
                      className="btn btn-secondary"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleDelete(match.id)}
                      className="btn btn-danger"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

