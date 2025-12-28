// NOWA WERSJA - Neon Postgres
// UWAGA: Ten plik wymaga:
// 1. npm install @neondatabase/serverless
// 2. DATABASE_URL w zmiennych środowiskowych
// 3. Wykonania schema.sql w Neon Dashboard

import { neon } from '@neondatabase/serverless';

// Connection string z zmiennych środowiskowych
const sql = neon(process.env.DATABASE_URL!);

// Helper do konwersji boolean/integer
function toInt(value: any): number {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  return 0;
}

function toBool(value: any): boolean {
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return value;
  return false;
}

// Prosty interfejs bazy danych (zachowuje kompatybilność z istniejącym kodem)
const db = {
  users: {
    all: async () => {
      const result = await sql`SELECT * FROM users ORDER BY id`;
      return result.map((row: any) => ({
        ...row,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
      }));
    },
    get: async (id: number) => {
      const result = await sql`SELECT * FROM users WHERE id = ${id}`;
      if (result.length === 0) return null;
      const row = result[0];
      return {
        ...row,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
      };
    },
    findByEmail: async (email: string) => {
      const result = await sql`SELECT * FROM users WHERE email = ${email}`;
      if (result.length === 0) return null;
      const row = result[0];
      return {
        ...row,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
      };
    },
    findByOAuth: async (provider: string, oauthId: string) => {
      const result = await sql`
        SELECT * FROM users 
        WHERE oauth_provider = ${provider} AND oauth_id = ${oauthId}
      `;
      const found = result.length > 0 ? result[0] : null;
      
      // Logowanie dla debugowania
      const allOAuth = await sql`SELECT id, oauth_provider, oauth_id FROM users WHERE oauth_provider IS NOT NULL`;
      console.log('db.users.findByOAuth', {
        provider,
        oauthId,
        found: !!found,
        totalUsers: (await sql`SELECT COUNT(*) FROM users`)[0].count,
        allOAuthUsers: allOAuth,
      });
      
      if (found) {
        return {
          ...found,
          is_admin: found.is_admin || 0,
          is_superuser: found.is_superuser || 0,
          can_create_matches: found.can_create_matches ?? 1,
          can_register_to_matches: found.can_register_to_matches ?? 1,
        };
      }
      return null;
    },
    findByUsername: async (username: string) => {
      const result = await sql`SELECT * FROM users WHERE username = ${username}`;
      if (result.length === 0) return null;
      const row = result[0];
      return {
        ...row,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
      };
    },
    create: async (user: any) => {
      const result = await sql`
        INSERT INTO users (
          name, email, password, phone, preferred_level,
          is_admin, is_superuser, username,
          can_create_matches, can_register_to_matches,
          oauth_provider, oauth_id
        ) VALUES (
          ${user.name}, ${user.email || null}, ${user.password || null},
          ${user.phone || null}, ${user.preferred_level || null},
          ${toInt(user.is_admin)}, ${toInt(user.is_superuser) || 0},
          ${user.username || null},
          ${toInt(user.can_create_matches) ?? 1}, ${toInt(user.can_register_to_matches) ?? 1},
          ${user.oauth_provider || null}, ${user.oauth_id || null}
        )
        RETURNING *
      `;
      const newUser = result[0];
      console.log('db.users.create: User created', {
        userId: newUser.id,
        email: newUser.email,
        oauth_provider: newUser.oauth_provider,
        oauth_id: newUser.oauth_id,
      });
      return {
        ...newUser,
        is_admin: newUser.is_admin || 0,
        is_superuser: newUser.is_superuser || 0,
        can_create_matches: newUser.can_create_matches ?? 1,
        can_register_to_matches: newUser.can_register_to_matches ?? 1,
      };
    },
    update: async (id: number, updates: any) => {
      // Uproszczona wersja - aktualizacja tylko podstawowych pól
      // Dla bardziej złożonych update'ów można rozbudować
      const result = await sql`
        UPDATE users 
        SET 
          name = COALESCE(${updates.name}, name),
          email = COALESCE(${updates.email}, email),
          password = COALESCE(${updates.password}, password),
          phone = COALESCE(${updates.phone}, phone),
          preferred_level = COALESCE(${updates.preferred_level}, preferred_level),
          is_admin = COALESCE(${toInt(updates.is_admin)}, is_admin),
          is_superuser = COALESCE(${toInt(updates.is_superuser)}, is_superuser),
          username = COALESCE(${updates.username}, username),
          can_create_matches = COALESCE(${toInt(updates.can_create_matches)}, can_create_matches),
          can_register_to_matches = COALESCE(${toInt(updates.can_register_to_matches)}, can_register_to_matches)
        WHERE id = ${id}
        RETURNING *
      `;
      if (result.length === 0) return null;
      const updated = result[0];
      return {
        ...updated,
        is_admin: updated.is_admin || 0,
        is_superuser: updated.is_superuser || 0,
        can_create_matches: updated.can_create_matches ?? 1,
        can_register_to_matches: updated.can_register_to_matches ?? 1,
      };
    },
  },
  matches: {
    all: async () => {
      const result = await sql`SELECT * FROM matches ORDER BY id`;
      return result.map((row: any) => ({
        ...row,
        payment_methods: typeof row.payment_methods === 'string' 
          ? JSON.parse(row.payment_methods || '[]')
          : row.payment_methods || [],
        is_recurring: toBool(row.is_recurring),
        is_free: toBool(row.is_free),
        status: row.status || 'active',
      }));
    },
    get: async (id: number) => {
      const result = await sql`SELECT * FROM matches WHERE id = ${id}`;
      if (result.length === 0) {
        console.log('matches.get:', { id, found: false, totalMatches: (await sql`SELECT COUNT(*) FROM matches`)[0].count });
        return null;
      }
      const match = result[0];
      console.log('matches.get:', { id, found: true, totalMatches: (await sql`SELECT COUNT(*) FROM matches`)[0].count });
      return {
        ...match,
        payment_methods: typeof match.payment_methods === 'string'
          ? JSON.parse(match.payment_methods || '[]')
          : match.payment_methods || [],
        is_recurring: toBool(match.is_recurring),
        is_free: toBool(match.is_free),
        status: match.status || 'active',
      };
    },
    create: async (match: any) => {
      const result = await sql`
        INSERT INTO matches (
          name, description, date_start, date_end, location,
          max_players, organizer_phone, organizer_email,
          payment_methods, status, level,
          is_recurring, recurrence_frequency,
          registration_start, registration_end, entry_fee, is_free
        ) VALUES (
          ${match.name}, ${match.description || null},
          ${match.date_start}, ${match.date_end},
          ${match.location}, ${match.max_players},
          ${match.organizer_phone || null}, ${match.organizer_email || null},
          ${JSON.stringify(match.payment_methods || [])},
          ${match.status || 'active'}, ${match.level || 'kopanina'},
          ${toInt(match.is_recurring)}, ${match.recurrence_frequency || null},
          ${match.registration_start || null}, ${match.registration_end || null},
          ${match.entry_fee || null}, ${toInt(match.is_free)}
        )
        RETURNING *
      `;
      const newMatch = result[0];
      console.log('Match create: Created', {
        newId: newMatch.id,
        matchName: newMatch.name,
        totalMatches: (await sql`SELECT COUNT(*) FROM matches`)[0].count,
      });
      return {
        ...newMatch,
        payment_methods: typeof newMatch.payment_methods === 'string'
          ? JSON.parse(newMatch.payment_methods || '[]')
          : newMatch.payment_methods || [],
        is_recurring: toBool(newMatch.is_recurring),
        is_free: toBool(newMatch.is_free),
      };
    },
    update: async (id: number, updates: any) => {
      // Uproszczona wersja - aktualizacja tylko podstawowych pól
      const result = await sql`
        UPDATE matches 
        SET 
          name = COALESCE(${updates.name}, name),
          description = COALESCE(${updates.description}, description),
          date_start = COALESCE(${updates.date_start}, date_start),
          date_end = COALESCE(${updates.date_end}, date_end),
          location = COALESCE(${updates.location}, location),
          max_players = COALESCE(${updates.max_players}, max_players),
          organizer_phone = COALESCE(${updates.organizer_phone}, organizer_phone),
          organizer_email = COALESCE(${updates.organizer_email}, organizer_email),
          payment_methods = COALESCE(${updates.payment_methods ? JSON.stringify(updates.payment_methods) : null}, payment_methods),
          status = COALESCE(${updates.status}, status),
          level = COALESCE(${updates.level}, level),
          is_recurring = COALESCE(${toInt(updates.is_recurring)}, is_recurring),
          recurrence_frequency = COALESCE(${updates.recurrence_frequency}, recurrence_frequency),
          registration_start = COALESCE(${updates.registration_start}, registration_start),
          registration_end = COALESCE(${updates.registration_end}, registration_end),
          entry_fee = COALESCE(${updates.entry_fee}, entry_fee),
          is_free = COALESCE(${toInt(updates.is_free)}, is_free)
        WHERE id = ${id}
        RETURNING *
      `;
      if (result.length === 0) return null;
      const updated = result[0];
      return {
        ...updated,
        payment_methods: typeof updated.payment_methods === 'string'
          ? JSON.parse(updated.payment_methods || '[]')
          : updated.payment_methods || [],
        is_recurring: toBool(updated.is_recurring),
        is_free: toBool(updated.is_free),
      };
    },
    delete: async (id: number) => {
      const result = await sql`DELETE FROM matches WHERE id = ${id} RETURNING id`;
      return result.length > 0;
    },
    findByStatus: async (status: string) => {
      const result = await sql`SELECT * FROM matches WHERE status = ${status} ORDER BY id`;
      return result.map((row: any) => ({
        ...row,
        payment_methods: typeof row.payment_methods === 'string' 
          ? JSON.parse(row.payment_methods || '[]')
          : row.payment_methods || [],
        is_recurring: toBool(row.is_recurring),
        is_free: toBool(row.is_free),
        status: row.status || 'active',
      }));
    },
  },
  registrations: {
    findByMatch: async (matchId: number) => {
      const result = await sql`
        SELECT * FROM registrations WHERE match_id = ${matchId} ORDER BY created_at
      `;
      console.log('findByMatch:', {
        matchId,
        count: result.length,
        allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
      });
      return result;
    },
    findByUser: async (userId: number) => {
      return await sql`SELECT * FROM registrations WHERE user_id = ${userId} ORDER BY created_at`;
    },
    findByMatchAndUser: async (matchId: number, userId: number) => {
      const result = await sql`
        SELECT * FROM registrations 
        WHERE match_id = ${matchId} AND user_id = ${userId}
      `;
      const found = result.length > 0 ? result[0] : null;
      console.log('findByMatchAndUser:', {
        matchId,
        userId,
        found: !!found,
        allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
      });
      return found;
    },
    // WAŻNE: Używa transakcji z ON CONFLICT, aby rozwiązać race conditions
    create: async (registration: any) => {
      try {
        // Użyj INSERT ... ON CONFLICT, aby uniknąć duplikatów przy równoczesnych zapisach
        const result = await sql`
          INSERT INTO registrations (match_id, user_id)
          VALUES (${registration.match_id}, ${registration.user_id})
          ON CONFLICT (match_id, user_id) DO NOTHING
          RETURNING *
        `;
        
        if (result.length === 0) {
          // Konflikt - rejestracja już istnieje
          console.log('Registration create: Duplicate detected', {
            match_id: registration.match_id,
            user_id: registration.user_id,
          });
          return null;
        }
        
        const newRegistration = result[0];
        console.log('Registration create: Created successfully', {
          registrationId: newRegistration.id,
          matchId: newRegistration.match_id,
          userId: newRegistration.user_id,
        });
        return newRegistration;
      } catch (error: any) {
        console.error('Registration create: Error', error);
        // Jeśli błąd to duplikat, zwróć null
        if (error.code === '23505') { // unique_violation
          return null;
        }
        throw error;
      }
    },
    delete: async (id: number) => {
      const result = await sql`DELETE FROM registrations WHERE id = ${id} RETURNING id`;
      return result.length > 0;
    },
    countByMatch: async (matchId: number) => {
      const result = await sql`SELECT COUNT(*) as count FROM registrations WHERE match_id = ${matchId}`;
      const count = parseInt(result[0].count);
      console.log('countByMatch:', {
        matchId,
        count,
        allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
      });
      return count;
    },
    deleteByMatch: async (matchId: number) => {
      const result = await sql`
        DELETE FROM registrations WHERE match_id = ${matchId}
        RETURNING id
      `;
      const deleted = result.length;
      console.log('deleteByMatch:', {
        matchId,
        deletedCount: deleted,
      });
      return deleted > 0;
    },
  },
};

export default db;

// Funkcja inicjalizacji (tworzenie domyślnych użytkowników)
export async function initDatabase() {
  // Sprawdź czy admin istnieje
  const adminResult = await sql`SELECT id FROM users WHERE is_admin = 1 LIMIT 1`;
  if (adminResult.length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('***REDACTED***', 10);
    await sql`
      INSERT INTO users (name, email, password, is_admin, can_create_matches, can_register_to_matches)
      VALUES ('Admin', '***REDACTED_EMAIL***', ${hashedPassword}, 1, 1, 1)
    `;
  }
  
  // Sprawdź czy superuser istnieje
  const superuserResult = await sql`SELECT id FROM users WHERE is_superuser = 1 LIMIT 1`;
  if (superuserResult.length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('***REDACTED***', 10);
    await sql`
      INSERT INTO users (name, email, username, password, is_superuser, can_create_matches, can_register_to_matches)
      VALUES ('Superuser', '***REDACTED_EMAIL***', 'superuser', ${hashedPassword}, 1, 1, 1)
    `;
  }
}

