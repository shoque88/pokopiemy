import { useState } from 'react';
import { WizardFormData, StepErrors } from './wizardTypes';

interface StepPaymentOptionsProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  errors: StepErrors;
}

export default function StepPaymentOptions({ formData, onChange, errors }: StepPaymentOptionsProps) {
  const [showPrivateTooltip, setShowPrivateTooltip] = useState(false);

  const togglePaymentMethod = (method: string) => {
    const updated = formData.payment_methods.includes(method)
      ? formData.payment_methods.filter((m) => m !== method)
      : [...formData.payment_methods, method];
    onChange({ payment_methods: updated });
  };

  return (
    <div className="wizard-step-content">
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <label style={{ marginBottom: 0 }}>Wpisowe</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={formData.is_free}
              onChange={(e) => onChange({ is_free: e.target.checked, entry_fee: '', payment_methods: e.target.checked ? [] : formData.payment_methods })}
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
            onChange({ entry_fee: value });
          }}
          disabled={formData.is_free}
          placeholder={formData.is_free ? 'Mecz jest za darmo' : 'Wpisz kwotę wpisowego (zł)'}
        />
        {errors.entry_fee && <span className="field-error">{errors.entry_fee}</span>}
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
            onChange={(e) => onChange({ is_private: e.target.checked })}
          />
          <label>Oznacz mecz jako prywatny</label>
        </div>
      </div>
    </div>
  );
}
