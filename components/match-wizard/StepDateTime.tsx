import { WizardFormData, StepErrors } from './wizardTypes';

interface StepDateTimeProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  errors: StepErrors;
}

export default function StepDateTime({ formData, onChange, errors }: StepDateTimeProps) {
  return (
    <div className="wizard-step-content">
      <div className="form-group">
        <label>Data rozpoczęcia *</label>
        <input
          type="date"
          value={formData.date_start}
          onChange={(e) => onChange({ date_start: e.target.value })}
        />
        {errors.date_start && <span className="field-error">{errors.date_start}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Godzina rozpoczęcia *</label>
          <input
            type="time"
            value={formData.time_start}
            onChange={(e) => onChange({ time_start: e.target.value })}
          />
          {errors.time_start && <span className="field-error">{errors.time_start}</span>}
        </div>

        <div className="form-group">
          <label>Godzina zakończenia *</label>
          <input
            type="time"
            value={formData.time_end}
            onChange={(e) => onChange({ time_end: e.target.value })}
          />
          {errors.time_end && <span className="field-error">{errors.time_end}</span>}
        </div>
      </div>

      <div className="form-group">
        <div className="checkbox-item">
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => onChange({ is_recurring: e.target.checked, recurrence_frequency: e.target.checked ? formData.recurrence_frequency : '' })}
          />
          <label>Wydarzenie cykliczne</label>
        </div>
      </div>

      {formData.is_recurring && (
        <div className="form-group">
          <label>Częstotliwość</label>
          <select
            value={formData.recurrence_frequency}
            onChange={(e) => onChange({ recurrence_frequency: e.target.value })}
          >
            <option value="">Wybierz częstotliwość</option>
            <option value="daily">Codziennie</option>
            <option value="weekly">Raz w tygodniu</option>
            <option value="monthly">Raz w miesiącu</option>
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Rozpoczęcie zapisów</label>
          <select
            value={formData.registration_start_offset}
            onChange={(e) => onChange({ registration_start_offset: e.target.value as WizardFormData['registration_start_offset'] })}
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
            onChange={(e) => onChange({ registration_end_offset: e.target.value as WizardFormData['registration_end_offset'] })}
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
    </div>
  );
}
