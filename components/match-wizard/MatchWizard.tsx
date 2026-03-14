'use client';

import { useState } from 'react';
import { WizardFormData, WizardStep, StepErrors, initialFormData } from './wizardTypes';
import WizardProgress from './WizardProgress';
import StepBasicInfo from './StepBasicInfo';
import StepDateTime from './StepDateTime';
import StepPaymentOptions from './StepPaymentOptions';
import WizardSummary from './WizardSummary';

interface MatchWizardProps {
  onSubmit: (formData: WizardFormData) => Promise<void>;
  saving: boolean;
  onCancel: () => void;
}

export default function MatchWizard({ onSubmit, saving, onCancel }: MatchWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [errors, setErrors] = useState<StepErrors>({});

  const updateFormData = (data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Wyczyść błędy dla zmienionych pól
    const clearedErrors = { ...errors };
    Object.keys(data).forEach((key) => delete clearedErrors[key]);
    setErrors(clearedErrors);
  };

  const validateStep = (step: 1 | 2 | 3): boolean => {
    const newErrors: StepErrors = {};

    if (step === 1) {
      if (!formData.location.trim()) newErrors.location = 'Podaj lokalizację';
      if (!formData.name.trim()) newErrors.name = 'Podaj nazwę meczu';
      if (!formData.max_players || parseInt(formData.max_players) < 1) newErrors.max_players = 'Podaj liczbę miejsc (min. 1)';
    }

    if (step === 2) {
      if (!formData.date_start) newErrors.date_start = 'Wybierz datę';
      if (!formData.time_start) newErrors.time_start = 'Podaj godzinę rozpoczęcia';
      if (!formData.time_end) newErrors.time_end = 'Podaj godzinę zakończenia';
      if (formData.time_start && formData.time_end && formData.time_start >= formData.time_end) {
        newErrors.time_end = 'Godzina zakończenia musi być późniejsza';
      }
    }

    if (step === 3) {
      if (!formData.is_free && !formData.entry_fee) newErrors.entry_fee = 'Podaj kwotę lub zaznacz "Za darmo"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 'summary') return;
    if (!validateStep(currentStep)) return;

    if (currentStep === 3) {
      setCurrentStep('summary');
    } else {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep === 'summary') {
      setCurrentStep(3);
    } else if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
    setErrors({});
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const stepTitles: Record<WizardStep, string> = {
    1: 'Podstawowe informacje',
    2: 'Data i czas',
    3: 'Płatność i opcje',
    'summary': 'Podsumowanie',
  };

  return (
    <div className="card wizard-container">
      <h2 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
        Nowy mecz
      </h2>

      <WizardProgress currentStep={currentStep} onStepClick={handleStepClick} />

      <h3 className="wizard-step-title">{stepTitles[currentStep]}</h3>

      {currentStep === 1 && (
        <StepBasicInfo formData={formData} onChange={updateFormData} errors={errors} />
      )}
      {currentStep === 2 && (
        <StepDateTime formData={formData} onChange={updateFormData} errors={errors} />
      )}
      {currentStep === 3 && (
        <StepPaymentOptions formData={formData} onChange={updateFormData} errors={errors} />
      )}
      {currentStep === 'summary' && (
        <WizardSummary formData={formData} onEdit={handleStepClick} />
      )}

      <div className="wizard-nav">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          {currentStep === 1 ? 'Anuluj' : 'Wstecz'}
        </button>

        {currentStep === 'summary' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Tworzenie...' : 'Utwórz mecz'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
          >
            {currentStep === 3 ? 'Podsumowanie' : 'Dalej'}
          </button>
        )}
      </div>
    </div>
  );
}
