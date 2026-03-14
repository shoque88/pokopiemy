import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import { WizardFormData, StepErrors } from './wizardTypes';

interface StepBasicInfoProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  errors: StepErrors;
}

export default function StepBasicInfo({ formData, onChange, errors }: StepBasicInfoProps) {
  return (
    <div className="wizard-step-content">
      <div className="form-group">
        <label>Lokalizacja *</label>
        <PlacesAutocomplete
          value={formData.location}
          onChange={(value) => onChange({ location: value })}
          placeholder="Wpisz adres lub nazwę miejsca..."
          required
        />
        {errors.location && <span className="field-error">{errors.location}</span>}
      </div>

      <div className="form-group">
        <label>Nazwa meczu *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="np. Piłka na Orliku"
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label>Poziom *</label>
        <select
          value={formData.level}
          onChange={(e) => onChange({ level: e.target.value as WizardFormData['level'] })}
        >
          <option value="kopanina">Kopanina</option>
          <option value="cośtam gramy">Cośtam gramy</option>
          <option value="semi pro">Semi pro</option>
        </select>
      </div>

      <div className="form-group">
        <label>Liczba wolnych miejsc *</label>
        <input
          type="number"
          min="1"
          step="1"
          value={formData.max_players}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '');
            onChange({ max_players: value });
          }}
          placeholder="np. 10"
        />
        {errors.max_players && <span className="field-error">{errors.max_players}</span>}
      </div>

      <div className="form-group">
        <label>Uwagi</label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Dodatkowe informacje o meczu..."
        />
      </div>
    </div>
  );
}
