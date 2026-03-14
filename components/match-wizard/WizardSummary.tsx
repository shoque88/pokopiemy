import { WizardFormData } from './wizardTypes';

interface WizardSummaryProps {
  formData: WizardFormData;
  onEdit: (step: 1 | 2 | 3) => void;
}

const levelLabels: Record<string, string> = {
  'kopanina': 'Kopanina',
  'cośtam gramy': 'Cośtam gramy',
  'semi pro': 'Semi pro',
};

const registrationStartLabels: Record<string, string> = {
  'now': 'Teraz',
  '1_day': 'Dzień przed',
  '2_days': 'Dwa dni przed',
  '3_days': 'Trzy dni przed',
};

const registrationEndLabels: Record<string, string> = {
  'to_start': 'Do rozpoczęcia meczu',
  '6h': '6h przed',
  '12h': '12h przed',
  '24h': '24h przed',
};

const frequencyLabels: Record<string, string> = {
  'daily': 'Codziennie',
  'weekly': 'Raz w tygodniu',
  'monthly': 'Raz w miesiącu',
};

const paymentLabels: Record<string, string> = {
  'cash': 'Gotówka',
  'blik': 'BLIK',
};

export default function WizardSummary({ formData, onEdit }: WizardSummaryProps) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-summary-section">
        <div className="wizard-summary-header">
          <h3>Podstawowe informacje</h3>
          <button type="button" className="wizard-summary-edit" onClick={() => onEdit(1)}>
            Edytuj
          </button>
        </div>
        <div className="wizard-summary-grid">
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Lokalizacja</span>
            <span className="wizard-summary-value">{formData.location}</span>
          </div>
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Nazwa</span>
            <span className="wizard-summary-value">{formData.name}</span>
          </div>
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Poziom</span>
            <span className="wizard-summary-value">{levelLabels[formData.level]}</span>
          </div>
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Wolne miejsca</span>
            <span className="wizard-summary-value">{formData.max_players}</span>
          </div>
          {formData.description && (
            <div className="wizard-summary-item" style={{ gridColumn: '1 / -1' }}>
              <span className="wizard-summary-label">Uwagi</span>
              <span className="wizard-summary-value">{formData.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="wizard-summary-section">
        <div className="wizard-summary-header">
          <h3>Data i czas</h3>
          <button type="button" className="wizard-summary-edit" onClick={() => onEdit(2)}>
            Edytuj
          </button>
        </div>
        <div className="wizard-summary-grid">
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Data</span>
            <span className="wizard-summary-value">{formData.date_start}</span>
          </div>
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Godzina</span>
            <span className="wizard-summary-value">{formData.time_start} - {formData.time_end}</span>
          </div>
          {formData.is_recurring && (
            <div className="wizard-summary-item">
              <span className="wizard-summary-label">Cykliczny</span>
              <span className="wizard-summary-value">{frequencyLabels[formData.recurrence_frequency] || 'Tak'}</span>
            </div>
          )}
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Zapisy od</span>
            <span className="wizard-summary-value">{registrationStartLabels[formData.registration_start_offset]}</span>
          </div>
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Zapisy do</span>
            <span className="wizard-summary-value">{registrationEndLabels[formData.registration_end_offset]}</span>
          </div>
        </div>
      </div>

      <div className="wizard-summary-section">
        <div className="wizard-summary-header">
          <h3>Płatność i opcje</h3>
          <button type="button" className="wizard-summary-edit" onClick={() => onEdit(3)}>
            Edytuj
          </button>
        </div>
        <div className="wizard-summary-grid">
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Wpisowe</span>
            <span className="wizard-summary-value">
              {formData.is_free ? 'Za darmo' : `${formData.entry_fee} zł`}
            </span>
          </div>
          {!formData.is_free && formData.payment_methods.length > 0 && (
            <div className="wizard-summary-item">
              <span className="wizard-summary-label">Metody płatności</span>
              <span className="wizard-summary-value">
                {formData.payment_methods.map(m => paymentLabels[m]).join(', ')}
              </span>
            </div>
          )}
          <div className="wizard-summary-item">
            <span className="wizard-summary-label">Prywatny</span>
            <span className="wizard-summary-value">{formData.is_private ? 'Tak' : 'Nie'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
