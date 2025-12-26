import db from './db';
import { Match, MatchStatus, RecurrenceFrequency } from './types';
import { format, addDays, addWeeks, addMonths, parseISO, isAfter } from 'date-fns';
import nodemailer from 'nodemailer';

// Funkcja do automatycznego aktualizowania statusu meczów
export async function updateMatchStatuses() {
  const now = new Date();
  const activeMatches = await db.matches.findByStatus('active');

  for (const match of activeMatches) {
    const endDate = parseISO(match.date_end);
    
    // Jeśli mecz się zakończył, zmień status
    if (isAfter(now, endDate)) {
      await db.matches.update(match.id, { status: 'finished' });

      // Jeśli mecz jest cykliczny, utwórz nowy mecz
      if (match.is_recurring && match.recurrence_frequency) {
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
    organizer_phone: match.organizer_phone,
    payment_methods: paymentMethods,
    level: match.level || 'kopanina',
    status: 'active',
    is_recurring: match.is_recurring,
    recurrence_frequency: match.recurrence_frequency,
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
