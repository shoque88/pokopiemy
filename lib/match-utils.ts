import db from './db';
import { Match, MatchStatus, RecurrenceFrequency } from './types';
import { format, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMilliseconds } from 'date-fns';
import nodemailer from 'nodemailer';

// Funkcja do automatycznego aktualizowania statusu meczów
export async function updateMatchStatuses() {
  const now = new Date();
  const activeMatches = await db.matches.findByStatus('active');
  console.log('updateMatchStatuses: Checking active matches', { count: activeMatches.length, now: now.toISOString() });

  for (const match of activeMatches) {
    const endDateUTC = parseISO(match.date_end);
    
    // WAŻNE: Daty są przechowywane w UTC, ale reprezentują lokalny czas miejsca meczu (Polska, UTC+1)
    // Przykład: użytkownik wpisuje "2025-01-01 18:00" w formularzu
    // - Traktujemy to jako "18:00 czasu polskiego" (niezależnie od strefy czasowej przeglądarki)
    // - Tworzymy Date jako "18:00 UTC" i odejmujemy 1 godzinę (offset Polski UTC+1) = "17:00 UTC"
    // - W bazie mamy "2025-01-01T17:00:00.000Z" (UTC), co reprezentuje "18:00 czasu polskiego"
    //
    // Aby sprawdzić czy mecz się zakończył, porównujemy aktualny czas UTC z endDateUTC
    // Jeśli endDateUTC reprezentuje "18:00 czasu polskiego" = "17:00 UTC",
    // to mecz kończy się o "17:00 UTC", więc porównanie now (UTC) > endDateUTC (UTC) jest poprawne
    
    // Najprostsze rozwiązanie: Dla uproszczenia zakładamy Polskę (UTC+1)
    // Dodajemy 1 godzinę do endDateUTC, aby uzyskać czas zakończenia w lokalnym czasie miejsca meczu (w UTC)
    // Ale to nie jest poprawne... Musimy myśleć inaczej
    //
    // Poprawne rozwiązanie: Jeśli endDateUTC reprezentuje czas lokalny miejsca meczu (np. 18:00 lokalne w Polsce),
    // a został zapisany jako "17:00 UTC" (bo to jest 18:00 lokalne w Polsce, GMT+1),
    // to mecz kończy się o "17:00 UTC". Więc porównanie jest poprawne.
    //
    // Problem może być w tym, że jeśli użytkownik jest w innej strefie czasowej, to new Date('2025-01-01T18:00')
    // może być zinterpretowane inaczej. Więc powinniśmy zapisywać datę jako czas lokalny miejsca meczu (bez offsetu),
    // a potem podczas porównania konwertować na UTC z uwzględnieniem strefy czasowej miejsca meczu.
    
    // Dla teraz: używamy prostego porównania (zakładając że daty są poprawnie zapisane w UTC)
    // TODO: W przyszłości możemy dodać pole timezone do meczu lub określić strefę czasową z adresu
    if (isAfter(now, endDateUTC)) {
      console.log('updateMatchStatuses: Match finished, updating status', { 
        matchId: match.id, 
        matchName: match.name,
        date_end: match.date_end,
        now: now.toISOString()
      });
      
      // Usuń wszystkie zapisy dla zakończonego meczu
      await db.registrations.deleteByMatch(match.id);
      
      await db.matches.update(match.id, { status: 'finished' });

      // Jeśli mecz jest cykliczny, utwórz nowy mecz
      const isRecurring = match.is_recurring === 1 || match.is_recurring === true;
      if (isRecurring && match.recurrence_frequency) {
        await createNextRecurringMatch(match);
      }
    }
  }
}

async function createNextRecurringMatch(match: any) {
  const startDate = parseISO(match.date_start);
  const endDate = parseISO(match.date_end);

  let nextStartDate: Date;
  let nextEndDate: Date;

  switch (match.recurrence_frequency) {
    case 'daily':
      nextStartDate = addDays(startDate, 1);
      nextEndDate = addDays(endDate, 1);
      break;
    case 'weekly':
      nextStartDate = addWeeks(startDate, 1);
      nextEndDate = addWeeks(endDate, 1);
      break;
    case 'monthly':
      nextStartDate = addMonths(startDate, 1);
      nextEndDate = addMonths(endDate, 1);
      break;
    default:
      return;
  }

  // Oblicz odstęp czasowy między datą meczu a datami zapisów i zastosuj do nowych dat
  let nextRegistrationStart: string | null = null;
  let nextRegistrationEnd: string | null = null;

  if (match.registration_start) {
    const originalRegistrationStart = parseISO(match.registration_start);
    const timeDiff = differenceInMilliseconds(originalRegistrationStart, startDate);
    nextRegistrationStart = new Date(nextStartDate.getTime() + timeDiff).toISOString();
  }

  if (match.registration_end) {
    const originalRegistrationEnd = parseISO(match.registration_end);
    const timeDiff = differenceInMilliseconds(originalRegistrationEnd, startDate);
    nextRegistrationEnd = new Date(nextStartDate.getTime() + timeDiff).toISOString();
  }

  // Parse payment_methods if it's a string
  const paymentMethods = typeof match.payment_methods === 'string' 
    ? match.payment_methods 
    : JSON.stringify(match.payment_methods || []);

  await db.matches.create({
    name: match.name,
    description: match.description || null,
    date_start: nextStartDate.toISOString(),
    date_end: nextEndDate.toISOString(),
    location: match.location,
    max_players: match.max_players,
    organizer_phone: match.organizer_phone || null,
    organizer_email: match.organizer_email || null,
    payment_methods: paymentMethods,
    level: match.level || 'kopanina',
    status: 'active',
    is_recurring: match.is_recurring,
    recurrence_frequency: match.recurrence_frequency,
    registration_start: nextRegistrationStart,
    registration_end: nextRegistrationEnd,
    entry_fee: match.entry_fee || null,
    is_free: match.is_free || 0,
  });
}

// Funkcja do wysyłania powiadomień e-mail
export async function sendCancelationEmails(matchId: number, matchName: string, location: string, dateStart: string) {
  const registrations = await db.registrations.findByMatch(matchId);
  const users = await db.users.all();

  const registrationsWithUsers = registrations.map((reg: any) => {
    const user = users.find((u: any) => u.id === reg.user_id);
    return user ? { email: user.email, name: user.name } : null;
  }).filter((item: any) => item !== null) as { email: string; name: string }[];

  if (registrationsWithUsers.length === 0) return;

  // Konfiguracja transporter (w produkcji użyj prawdziwych danych SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const dateFormatted = format(parseISO(dateStart), 'dd.MM.yyyy HH:mm');

  for (const registration of registrationsWithUsers) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@pokopiemy.pl',
        to: registration.email,
        subject: `Mecz został odwołany – ${matchName}`,
        html: `
          <h2>Mecz został odwołany</h2>
          <p>Witaj ${registration.name},</p>
          <p>Informujemy, że mecz <strong>${matchName}</strong> został odwołany.</p>
          <p><strong>Data:</strong> ${dateFormatted}</p>
          <p><strong>Lokalizacja:</strong> ${location}</p>
          <p>Przepraszamy za niedogodności.</p>
          <p>Pozdrawiamy,<br>Zespół Pokopiemy</p>
        `,
      });
    } catch (error) {
      console.error(`Błąd wysyłania e-maila do ${registration.email}:`, error);
    }
  }
}
