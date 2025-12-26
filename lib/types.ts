export type PaymentMethod = 'cash' | 'blik';

export type MatchStatus = 'active' | 'finished' | 'canceled';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export type PreferredLevel = 'kopanina' | 'cośtam gramy' | 'wannabe pro';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  preferred_level?: PreferredLevel;
  is_admin: number;
  created_at: string;
}

export interface Match {
  id: number;
  name: string;
  description?: string;
  date_start: string;
  date_end: string;
  location: string;
  max_players: number;
  organizer_phone: string;
  payment_methods: PaymentMethod[];
  status: MatchStatus;
  level: PreferredLevel;
  is_recurring: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  created_at: string;
}

export interface Registration {
  id: number;
  match_id: number;
  user_id: number;
  created_at: string;
}

export interface MatchWithRegistrations extends Match {
  registrations: (Registration & { user: User })[];
  registered_count: number;
}

