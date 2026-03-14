import { WizardStep } from './wizardTypes';

interface WizardProgressProps {
  currentStep: WizardStep;
  onStepClick: (step: 1 | 2 | 3) => void;
}

const steps = [
  { number: 1 as const, label: 'Informacje' },
  { number: 2 as const, label: 'Data i czas' },
  { number: 3 as const, label: 'Płatność' },
];

export default function WizardProgress({ currentStep, onStepClick }: WizardProgressProps) {
  const currentNum = currentStep === 'summary' ? 4 : currentStep;

  return (
    <div className="wizard-progress">
      {steps.map((step, index) => {
        const isCompleted = currentNum > step.number;
        const isActive = currentStep === step.number;

        return (
          <div key={step.number} className="wizard-progress-item">
            {index > 0 && (
              <div className={`wizard-step-line ${isCompleted ? 'completed' : ''}`} />
            )}
            <button
              type="button"
              className={`wizard-step-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => isCompleted ? onStepClick(step.number) : undefined}
              disabled={!isCompleted}
            >
              {isCompleted ? '✓' : step.number}
            </button>
            <span className={`wizard-step-label ${isActive ? 'active' : ''}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
