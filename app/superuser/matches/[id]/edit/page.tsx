'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  registration_start?: string;
  registration_end?: string;
  entry_fee?: string;
  is_free?: boolean;
}

export default function SuperuserEditMatchPage() {
  const router = useRouter();
  const params = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
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
    loadMatch();
  }, [params.id]);

  const loadMatch = async () => {
    try {
      const superuserRes = await fetch('/api/auth/superuser/me');
      if (!superuserRes.ok) {
        router.push('/superuser/login');
        return;
      }

      const matchRes = await fetch(`/api/matches/${params.id}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setMatch(data);
        
        const startDate = parseISO(data.date_start);
        const endDate = parseISO(data.date_end);
        const registrationStart = data.registration_start ? parseISO(data.registration_start) : null;
        const registrationEnd = data.registration_end ? parseISO(data.registration_end) : null;

        setFormData({
          name: data.name,
          description: data.description || '',
          date_start: format(startDate, 'yyyy-MM-dd'),
          time_start: format(startDate, 'HH:mm'),
          time_end: format(endDate, 'HH:mm'),
          location: data.location,
          max_players: data.max_players.toString(),
          organizer_phone: data.organizer_phone,
          payment_methods: data.payment_methods || [],
          level: data.level || 'kopanina',
          status: data.status,
          is_recurring: data.is_recurring,
          recurrence_frequency: data.recurrence_frequency || '',
          registration_start_date: registrationStart ? format(registrationStart, 'yyyy-MM-dd') : '',
          registration_start_time: registrationStart ? format(registrationStart, 'HH:mm') : '',
          registration_end_date: registrationEnd ? format(registrationEnd, 'yyyy-MM-dd') : '',
          registration_end_time: registrationEnd ? format(registrationEnd, 'HH:mm') : '',
          entry_fee: data.entry_fee || '',
          is_free: data.is_free === 1 || data.is_free === true,
        });
      }
    } catch (error) {
      console.error('Error loading match:', error);
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

      const res = await fetch(`/api/superuser/matches/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (res.ok) {
        router.push('/superuser');
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

  if (loading) {
    return <div className="loading">Ładowanie meczu...</div>;
  }

  if (!match) {
    return <div className="empty-state"><h3>Mecz nie został znaleziony</h3></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => router.push('/superuser')} className="btn btn-secondary">
          ← Powrót do panelu
        </button>
      </div>

      <h1 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Edytuj mecz</h1>

      <div className="card">
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
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
            {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </form>
      </div>
    </div>
  );
}

