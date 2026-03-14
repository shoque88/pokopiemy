export interface WizardFormData {
  // Step 1 - Podstawowe informacje
  name: string;
  location: string;
  level: 'kopanina' | 'cośtam gramy' | 'semi pro';
  max_players: string;
  description: string;
  // Step 2 - Data i czas
  date_start: string;
  time_start: string;
  time_end: string;
  is_recurring: boolean;
  recurrence_frequency: string;
  registration_start_offset: 'now' | '1_day' | '2_days' | '3_days';
  registration_end_offset: 'to_start' | '6h' | '12h' | '24h';
  // Step 3 - Płatność i opcje
  entry_fee: string;
  is_free: boolean;
  payment_methods: string[];
  is_private: boolean;
}

export const initialFormData: WizardFormData = {
  name: '',
  location: '',
  level: 'kopanina',
  max_players: '',
  description: '',
  date_start: '',
  time_start: '',
  time_end: '',
  is_recurring: false,
  recurrence_frequency: '',
  registration_start_offset: 'now',
  registration_end_offset: 'to_start',
  entry_fee: '',
  is_free: false,
  payment_methods: [],
  is_private: false,
};

export type WizardStep = 1 | 2 | 3 | 'summary';

export interface StepErrors {
  [key: string]: string;
}
