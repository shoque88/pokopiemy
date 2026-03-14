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
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password || null,
        phone: row.phone || null,
        preferred_level: row.preferred_level || null,
        username: row.username || null,
        oauth_provider: row.oauth_provider || null,
        oauth_id: row.oauth_id || null,
        created_at: row.created_at,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
        avatar: row.avatar || null,
      }));
    },
    get: async (id: number) => {
      const result = await sql`SELECT * FROM users WHERE id = ${id}`;
      if (result.length === 0) return null;
      const row: any = result[0];
      return {
        ...row,
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password || null,
        phone: row.phone || null,
        preferred_level: row.preferred_level || null,
        username: row.username || null,
        oauth_provider: row.oauth_provider || null,
        oauth_id: row.oauth_id || null,
        created_at: row.created_at,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
        avatar: row.avatar || null,
      };
    },
    findByEmail: async (email: string) => {
      const result = await sql`SELECT * FROM users WHERE email = ${email}`;
      if (result.length === 0) return null;
      const row: any = result[0];
      return {
        ...row,
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password || null,
        phone: row.phone || null,
        preferred_level: row.preferred_level || null,
        username: row.username || null,
        oauth_provider: row.oauth_provider || null,
        oauth_id: row.oauth_id || null,
        created_at: row.created_at,
        is_admin: row.is_admin || 0,
        is_superuser: row.is_superuser || 0,
        can_create_matches: row.can_create_matches ?? 1,
        can_register_to_matches: row.can_register_to_matches ?? 1,
        avatar: row.avatar || null,
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
        const foundUser: any = found;
        return {
          ...foundUser,
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          password: foundUser.password || null,
          phone: foundUser.phone || null,
          preferred_level: foundUser.preferred_level || null,
          username: foundUser.username || null,
          oauth_provider: foundUser.oauth_provider || null,
          oauth_id: foundUser.oauth_id || null,
          created_at: foundUser.created_at,
          is_admin: foundUser.is_admin || 0,
          is_superuser: foundUser.is_superuser || 0,
          can_create_matches: foundUser.can_create_matches ?? 1,
          can_register_to_matches: foundUser.can_register_to_matches ?? 1,
          avatar: foundUser.avatar || null,
        };
      }
      return null;
    },
    findByUsername: async (username: string) => {
      const result = await sql`SELECT * FROM users WHERE username = ${username}`;
      if (result.length === 0) return null;
      const row: any = result[0];
      return {
        ...row,
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password || null,
        phone: row.phone || null,
        preferred_level: row.preferred_level || null,
        username: row.username || null,
        oauth_provider: row.oauth_provider || null,
        oauth_id: row.oauth_id || null,
        created_at: row.created_at,
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
          oauth_provider, oauth_id, avatar
        ) VALUES (
          ${user.name}, ${user.email || null}, ${user.password || null},
          ${user.phone || null}, ${user.preferred_level || null},
          ${toInt(user.is_admin)}, ${toInt(user.is_superuser) || 0},
          ${user.username || null},
          ${user.can_create_matches !== undefined ? toInt(user.can_create_matches) : 1}, ${user.can_register_to_matches !== undefined ? toInt(user.can_register_to_matches) : 1},
          ${user.oauth_provider || null}, ${user.oauth_id || null}, ${user.avatar || null}
        )
        RETURNING *
      `;
      const newUser: any = result[0];
      console.log('db.users.create: User created', {
        userId: newUser.id,
        email: newUser.email,
        oauth_provider: newUser.oauth_provider,
        oauth_id: newUser.oauth_id,
      });
      return {
        ...newUser,
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password || null,
        phone: newUser.phone || null,
        preferred_level: newUser.preferred_level || null,
        username: newUser.username || null,
        oauth_provider: newUser.oauth_provider || null,
        oauth_id: newUser.oauth_id || null,
        created_at: newUser.created_at,
        is_admin: newUser.is_admin || 0,
        is_superuser: newUser.is_superuser || 0,
        can_create_matches: newUser.can_create_matches ?? 1,
        can_register_to_matches: newUser.can_register_to_matches ?? 1,
        avatar: newUser.avatar || null,
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
          can_register_to_matches = COALESCE(${toInt(updates.can_register_to_matches)}, can_register_to_matches),
          avatar = COALESCE(${updates.avatar}, avatar)
        WHERE id = ${id}
        RETURNING *
      `;
      if (result.length === 0) return null;
      const updated: any = result[0];
      return {
        ...updated,
        id: updated.id,
        name: updated.name,
        email: updated.email,
        password: updated.password || null,
        phone: updated.phone || null,
        preferred_level: updated.preferred_level || null,
        username: updated.username || null,
        oauth_provider: updated.oauth_provider || null,
        oauth_id: updated.oauth_id || null,
        created_at: updated.created_at,
        is_admin: updated.is_admin || 0,
        is_superuser: updated.is_superuser || 0,
        can_create_matches: updated.can_create_matches ?? 1,
        can_register_to_matches: updated.can_register_to_matches ?? 1,
        avatar: updated.avatar || null,
      };
    },
  },
  matches: {
    all: async () => {
      const result = await sql`SELECT * FROM matches ORDER BY id`;
      return result.map((row: any) => {
        // Konwertuj daty Date na stringi ISO
        const date_start = row.date_start instanceof Date ? row.date_start.toISOString() : row.date_start;
        const date_end = row.date_end instanceof Date ? row.date_end.toISOString() : row.date_end;
        const registration_start = row.registration_start instanceof Date ? row.registration_start.toISOString() : (row.registration_start || null);
        const registration_end = row.registration_end instanceof Date ? row.registration_end.toISOString() : (row.registration_end || null);
        const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
        
        return {
        ...row,
        id: row.id,
        name: row.name,
        description: row.description || null,
        date_start,
        date_end,
        location: row.location,
        max_players: row.max_players,
        organizer_phone: row.organizer_phone || null,
        organizer_email: row.organizer_email || null,
        payment_methods: typeof row.payment_methods === 'string' 
          ? JSON.parse(row.payment_methods || '[]')
          : row.payment_methods || [],
        status: row.status || 'active',
        level: row.level || 'kopanina',
        is_recurring: toBool(row.is_recurring),
        recurrence_frequency: row.recurrence_frequency || null,
        registration_start,
        registration_end,
        entry_fee: row.entry_fee || null,
        is_free: toBool(row.is_free),
        is_private: toBool(row.is_private),
        private_token: row.private_token || null,
        created_at,
      };
      });
    },
    get: async (id: number) => {
      const result = await sql`SELECT * FROM matches WHERE id = ${id}`;
      if (result.length === 0) {
        console.log('matches.get:', { id, found: false, totalMatches: (await sql`SELECT COUNT(*) FROM matches`)[0].count });
        return null;
      }
      const match: any = result[0];
      console.log('matches.get:', { id, found: true, totalMatches: (await sql`SELECT COUNT(*) FROM matches`)[0].count });
      
      // Konwertuj daty Date na stringi ISO
      const date_start = match.date_start instanceof Date ? match.date_start.toISOString() : match.date_start;
      const date_end = match.date_end instanceof Date ? match.date_end.toISOString() : match.date_end;
      const registration_start = match.registration_start instanceof Date ? match.registration_start.toISOString() : (match.registration_start || null);
      const registration_end = match.registration_end instanceof Date ? match.registration_end.toISOString() : (match.registration_end || null);
      const created_at = match.created_at instanceof Date ? match.created_at.toISOString() : match.created_at;
      
      return {
        ...match,
        id: match.id,
        name: match.name,
        description: match.description || null,
        date_start,
        date_end,
        location: match.location,
        max_players: match.max_players,
        organizer_phone: match.organizer_phone || null,
        organizer_email: match.organizer_email || null,
        payment_methods: typeof match.payment_methods === 'string'
          ? JSON.parse(match.payment_methods || '[]')
          : match.payment_methods || [],
        status: match.status || 'active',
        level: match.level || 'kopanina',
        is_recurring: toBool(match.is_recurring),
        recurrence_frequency: match.recurrence_frequency || null,
        registration_start,
        registration_end,
        entry_fee: match.entry_fee || null,
        is_free: toBool(match.is_free),
        is_private: toBool(match.is_private),
        private_token: match.private_token || null,
        created_at,
      };
    },
    create: async (match: any) => {
      const result = await sql`
        INSERT INTO matches (
          name, description, date_start, date_end, location,
          max_players, organizer_phone, organizer_email,
          payment_methods, status, level,
          is_recurring, recurrence_frequency,
          registration_start, registration_end, entry_fee, is_free, is_private, private_token
        ) VALUES (
          ${match.name}, ${match.description || null},
          ${match.date_start}, ${match.date_end},
          ${match.location}, ${match.max_players},
          ${match.organizer_phone || null}, ${match.organizer_email || null},
          ${JSON.stringify(match.payment_methods || [])},
          ${match.status || 'active'}, ${match.level || 'kopanina'},
          ${toInt(match.is_recurring)}, ${match.recurrence_frequency || null},
          ${match.registration_start || null}, ${match.registration_end || null},
          ${match.entry_fee || null}, ${toInt(match.is_free)}, ${toInt(match.is_private)}, ${match.private_token || null}
        )
        RETURNING *
      `;
      const newMatch: any = result[0];
      console.log('Match create: Created', {
        newId: newMatch.id,
        matchName: newMatch.name,
        totalMatches: (await sql`SELECT COUNT(*) FROM matches`)[0].count,
      });
      
      // Konwertuj daty Date na stringi ISO
      const date_start = newMatch.date_start instanceof Date ? newMatch.date_start.toISOString() : newMatch.date_start;
      const date_end = newMatch.date_end instanceof Date ? newMatch.date_end.toISOString() : newMatch.date_end;
      const registration_start = newMatch.registration_start instanceof Date ? newMatch.registration_start.toISOString() : (newMatch.registration_start || null);
      const registration_end = newMatch.registration_end instanceof Date ? newMatch.registration_end.toISOString() : (newMatch.registration_end || null);
      const created_at = newMatch.created_at instanceof Date ? newMatch.created_at.toISOString() : newMatch.created_at;
      
      return {
        ...newMatch,
        id: newMatch.id,
        name: newMatch.name,
        description: newMatch.description || null,
        date_start,
        date_end,
        location: newMatch.location,
        max_players: newMatch.max_players,
        organizer_phone: newMatch.organizer_phone || null,
        organizer_email: newMatch.organizer_email || null,
        payment_methods: typeof newMatch.payment_methods === 'string'
          ? JSON.parse(newMatch.payment_methods || '[]')
          : newMatch.payment_methods || [],
        status: newMatch.status || 'active',
        level: newMatch.level || 'kopanina',
        is_recurring: toBool(newMatch.is_recurring),
        recurrence_frequency: newMatch.recurrence_frequency || null,
        registration_start,
        registration_end,
        entry_fee: newMatch.entry_fee || null,
        is_free: toBool(newMatch.is_free),
        is_private: toBool(newMatch.is_private),
        private_token: newMatch.private_token || null,
        created_at,
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
          is_free = COALESCE(${toInt(updates.is_free)}, is_free),
          is_private = COALESCE(${toInt(updates.is_private)}, is_private),
          private_token = COALESCE(${updates.private_token || null}, private_token)
        WHERE id = ${id}
        RETURNING *
      `;
      if (result.length === 0) return null;
      const updated: any = result[0];
      
      // Konwertuj daty Date na stringi ISO
      const date_start = updated.date_start instanceof Date ? updated.date_start.toISOString() : updated.date_start;
      const date_end = updated.date_end instanceof Date ? updated.date_end.toISOString() : updated.date_end;
      const registration_start = updated.registration_start instanceof Date ? updated.registration_start.toISOString() : (updated.registration_start || null);
      const registration_end = updated.registration_end instanceof Date ? updated.registration_end.toISOString() : (updated.registration_end || null);
      const created_at = updated.created_at instanceof Date ? updated.created_at.toISOString() : updated.created_at;
      
      return {
        ...updated,
        id: updated.id,
        name: updated.name,
        description: updated.description || null,
        date_start,
        date_end,
        location: updated.location,
        max_players: updated.max_players,
        organizer_phone: updated.organizer_phone || null,
        organizer_email: updated.organizer_email || null,
        payment_methods: typeof updated.payment_methods === 'string'
          ? JSON.parse(updated.payment_methods || '[]')
          : updated.payment_methods || [],
        status: updated.status || 'active',
        level: updated.level || 'kopanina',
        is_recurring: toBool(updated.is_recurring),
        recurrence_frequency: updated.recurrence_frequency || null,
        registration_start,
        registration_end,
        entry_fee: updated.entry_fee || null,
        is_free: toBool(updated.is_free),
        is_private: toBool(updated.is_private),
        private_token: updated.private_token || null,
        created_at,
      };
    },
    findByPrivateToken: async (token: string) => {
      const result = await sql`SELECT * FROM matches WHERE private_token = ${token}`;
      if (result.length === 0) return null;
      const match: any = result[0];
      
      // Konwertuj daty Date na stringi ISO
      const date_start = match.date_start instanceof Date ? match.date_start.toISOString() : match.date_start;
      const date_end = match.date_end instanceof Date ? match.date_end.toISOString() : match.date_end;
      const registration_start = match.registration_start instanceof Date ? match.registration_start.toISOString() : (match.registration_start || null);
      const registration_end = match.registration_end instanceof Date ? match.registration_end.toISOString() : (match.registration_end || null);
      const created_at = match.created_at instanceof Date ? match.created_at.toISOString() : match.created_at;
      
      return {
        ...match,
        id: match.id,
        name: match.name,
        description: match.description || null,
        date_start,
        date_end,
        location: match.location,
        max_players: match.max_players,
        organizer_phone: match.organizer_phone || null,
        organizer_email: match.organizer_email || null,
        payment_methods: typeof match.payment_methods === 'string'
          ? JSON.parse(match.payment_methods || '[]')
          : match.payment_methods || [],
        status: match.status || 'active',
        level: match.level || 'kopanina',
        is_recurring: toBool(match.is_recurring),
        recurrence_frequency: match.recurrence_frequency || null,
        registration_start,
        registration_end,
        entry_fee: match.entry_fee || null,
        is_free: toBool(match.is_free),
        is_private: toBool(match.is_private),
        private_token: match.private_token || null,
        created_at,
      };
    },
    delete: async (id: number) => {
      const result = await sql`DELETE FROM matches WHERE id = ${id} RETURNING id`;
      return result.length > 0;
    },
    findByStatus: async (status: string) => {
      const result = await sql`SELECT * FROM matches WHERE status = ${status} ORDER BY id`;
      return result.map((row: any) => {
        // Konwertuj daty Date na stringi ISO
        const date_start = row.date_start instanceof Date ? row.date_start.toISOString() : row.date_start;
        const date_end = row.date_end instanceof Date ? row.date_end.toISOString() : row.date_end;
        const registration_start = row.registration_start instanceof Date ? row.registration_start.toISOString() : (row.registration_start || null);
        const registration_end = row.registration_end instanceof Date ? row.registration_end.toISOString() : (row.registration_end || null);
        const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
        
        return {
        ...row,
        id: row.id,
        name: row.name,
        description: row.description || null,
        date_start,
        date_end,
        location: row.location,
        max_players: row.max_players,
        organizer_phone: row.organizer_phone || null,
        organizer_email: row.organizer_email || null,
        payment_methods: typeof row.payment_methods === 'string' 
          ? JSON.parse(row.payment_methods || '[]')
          : row.payment_methods || [],
        status: row.status || 'active',
        level: row.level || 'kopanina',
        is_recurring: toBool(row.is_recurring),
        recurrence_frequency: row.recurrence_frequency || null,
        registration_start,
        registration_end,
        entry_fee: row.entry_fee || null,
        is_free: toBool(row.is_free),
        is_private: toBool(row.is_private),
        private_token: row.private_token || null,
        created_at,
      };
      });
    },
  },
  registrations: {
    findByMatch: async (matchId: number, includeWaitlist: boolean = false) => {
      const result = includeWaitlist 
        ? await sql`SELECT * FROM registrations WHERE match_id = ${matchId} ORDER BY is_waitlist ASC, created_at ASC`
        : await sql`SELECT * FROM registrations WHERE match_id = ${matchId} AND (is_waitlist = 0 OR is_waitlist IS NULL) ORDER BY created_at`;
      console.log('findByMatch:', {
        matchId,
        count: result.length,
        includeWaitlist,
        allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
      });
      return result.map((row: any) => {
        const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
        return {
          id: row.id,
          match_id: row.match_id,
          user_id: row.user_id,
          is_waitlist: row.is_waitlist || 0,
          created_at,
        };
      });
    },
    findWaitlistByMatch: async (matchId: number) => {
      const result = await sql`
        SELECT * FROM registrations 
        WHERE match_id = ${matchId} AND (is_waitlist = 1) 
        ORDER BY created_at ASC
      `;
      return result.map((row: any) => {
        const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
        return {
          id: row.id,
          match_id: row.match_id,
          user_id: row.user_id,
          is_waitlist: 1,
          created_at,
        };
      });
    },
    findByUser: async (userId: number) => {
      const result = await sql`SELECT * FROM registrations WHERE user_id = ${userId} ORDER BY created_at`;
      return result.map((row: any) => {
        const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
        return {
          id: row.id,
          match_id: row.match_id,
          user_id: row.user_id,
          is_waitlist: row.is_waitlist || 0,
          created_at,
        };
      });
    },
    findByMatchAndUser: async (matchId: number, userId: number) => {
      const result = await sql`
        SELECT * FROM registrations 
        WHERE match_id = ${matchId} AND user_id = ${userId}
      `;
      if (result.length === 0) {
        console.log('findByMatchAndUser:', {
          matchId,
          userId,
          found: false,
          allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
        });
        return null;
      }
      const row: any = result[0];
      const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
      console.log('findByMatchAndUser:', {
        matchId,
        userId,
        found: true,
        allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
      });
      return {
        id: row.id,
        match_id: row.match_id,
        user_id: row.user_id,
        is_waitlist: row.is_waitlist || 0,
        created_at,
      };
    },
    // WAŻNE: Używa transakcji z ON CONFLICT, aby rozwiązać race conditions
    create: async (registration: any) => {
      try {
        const isWaitlist = registration.is_waitlist || 0;
        // Użyj INSERT ... ON CONFLICT, aby uniknąć duplikatów przy równoczesnych zapisach
        const result = await sql`
          INSERT INTO registrations (match_id, user_id, is_waitlist)
          VALUES (${registration.match_id}, ${registration.user_id}, ${isWaitlist})
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
        
        const newRegistration: any = result[0];
        const created_at = newRegistration.created_at instanceof Date ? newRegistration.created_at.toISOString() : newRegistration.created_at;
        console.log('Registration create: Created successfully', {
          registrationId: newRegistration.id,
          matchId: newRegistration.match_id,
          userId: newRegistration.user_id,
          isWaitlist: newRegistration.is_waitlist || 0,
        });
        return {
          id: newRegistration.id,
          match_id: newRegistration.match_id,
          user_id: newRegistration.user_id,
          is_waitlist: newRegistration.is_waitlist || 0,
          created_at,
        };
      } catch (error: any) {
        console.error('Registration create: Error', error);
        // Jeśli błąd to duplikat, zwróć null
        if (error.code === '23505') { // unique_violation
          return null;
        }
        throw error;
      }
    },
    moveFromWaitlist: async (matchId: number, userId: number) => {
      try {
        // Przenieś z listy rezerwowej do normalnej rejestracji
        const result = await sql`
          UPDATE registrations 
          SET is_waitlist = 0
          WHERE match_id = ${matchId} AND user_id = ${userId} AND (is_waitlist = 1)
          RETURNING *
        `;
        
        if (result.length === 0) {
          return null;
        }
        
        const updated: any = result[0];
        const created_at = updated.created_at instanceof Date ? updated.created_at.toISOString() : updated.created_at;
        console.log('Registration moveFromWaitlist: Moved successfully', {
          registrationId: updated.id,
          matchId: updated.match_id,
          userId: updated.user_id,
        });
        return {
          id: updated.id,
          match_id: updated.match_id,
          user_id: updated.user_id,
          is_waitlist: 0,
          created_at,
        };
      } catch (error: any) {
        console.error('Registration moveFromWaitlist: Error', error);
        throw error;
      }
    },
    get: async (id: number) => {
      const result = await sql`SELECT * FROM registrations WHERE id = ${id}`;
      if (result.length === 0) return null;
      const registration: any = result[0];
      const created_at = registration.created_at instanceof Date ? registration.created_at.toISOString() : registration.created_at;
      return {
        id: registration.id,
        match_id: registration.match_id,
        user_id: registration.user_id,
        is_waitlist: registration.is_waitlist || 0,
        created_at,
      };
    },
    delete: async (id: number) => {
      const result = await sql`DELETE FROM registrations WHERE id = ${id} RETURNING id`;
      return result.length > 0;
    },
    countByMatch: async (matchId: number) => {
      // Liczy tylko normalne rejestracje (bez listy rezerwowej)
      const result = await sql`SELECT COUNT(*) as count FROM registrations WHERE match_id = ${matchId} AND (is_waitlist = 0 OR is_waitlist IS NULL)`;
      const count = parseInt(result[0].count);
      console.log('countByMatch:', {
        matchId,
        count,
        allRegistrations: (await sql`SELECT COUNT(*) FROM registrations`)[0].count,
      });
      return count;
    },
    countWaitlistByMatch: async (matchId: number) => {
      const result = await sql`SELECT COUNT(*) as count FROM registrations WHERE match_id = ${matchId} AND is_waitlist = 1`;
      const count = parseInt(result[0].count);
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
  match_bans: {
    create: async (matchId: number, userId: number) => {
      try {
        const result = await sql`
          INSERT INTO match_bans (match_id, user_id)
          VALUES (${matchId}, ${userId})
          ON CONFLICT (match_id, user_id) DO NOTHING
          RETURNING *
        `;
        
        if (result.length === 0) {
          // Konflikt - ban już istnieje
          return null;
        }
        
        const newBan: any = result[0];
        const created_at = newBan.created_at instanceof Date ? newBan.created_at.toISOString() : newBan.created_at;
        return {
          id: newBan.id,
          match_id: newBan.match_id,
          user_id: newBan.user_id,
          created_at,
        };
      } catch (error: any) {
        console.error('Match ban create: Error', error);
        if (error.code === '23505') { // unique_violation
          return null;
        }
        throw error;
      }
    },
    findByMatchAndUser: async (matchId: number, userId: number) => {
      const result = await sql`
        SELECT * FROM match_bans 
        WHERE match_id = ${matchId} AND user_id = ${userId}
      `;
      if (result.length === 0) {
        return null;
      }
      const row: any = result[0];
      const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
      return {
        id: row.id,
        match_id: row.match_id,
        user_id: row.user_id,
        created_at,
      };
    },
    findByMatch: async (matchId: number) => {
      const result = await sql`SELECT * FROM match_bans WHERE match_id = ${matchId}`;
      return result.map((row: any) => {
        const created_at = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
        return {
          id: row.id,
          match_id: row.match_id,
          user_id: row.user_id,
          created_at,
        };
      });
    },
    delete: async (matchId: number, userId: number) => {
      const result = await sql`
        DELETE FROM match_bans 
        WHERE match_id = ${matchId} AND user_id = ${userId}
        RETURNING id
      `;
      return result.length > 0;
    },
  },
};

export default db;

// Funkcja inicjalizacji (tworzenie domyślnych użytkowników)
export async function initDatabase() {
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL;
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  const superuserEmail = process.env.SUPERUSER_DEFAULT_EMAIL;
  const superuserPassword = process.env.SUPERUSER_DEFAULT_PASSWORD;

  // Sprawdź czy admin istnieje
  const adminResult = await sql`SELECT id FROM users WHERE is_admin = 1 LIMIT 1`;
  if (adminResult.length === 0) {
    if (!adminEmail || !adminPassword) {
      console.warn('Brak ADMIN_DEFAULT_EMAIL lub ADMIN_DEFAULT_PASSWORD — pomijam tworzenie admina');
    } else {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(adminPassword, 10);
      await sql`
        INSERT INTO users (name, email, password, is_admin, can_create_matches, can_register_to_matches)
        VALUES ('Admin', ${adminEmail}, ${hashedPassword}, 1, 1, 1)
      `;
    }
  }

  // Sprawdź czy superuser istnieje
  const superuserResult = await sql`SELECT id FROM users WHERE is_superuser = 1 LIMIT 1`;
  if (superuserResult.length === 0) {
    if (!superuserEmail || !superuserPassword) {
      console.warn('Brak SUPERUSER_DEFAULT_EMAIL lub SUPERUSER_DEFAULT_PASSWORD — pomijam tworzenie superusera');
    } else {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(superuserPassword, 10);
      await sql`
        INSERT INTO users (name, email, username, password, is_superuser, can_create_matches, can_register_to_matches)
        VALUES ('Superuser', ${superuserEmail}, 'superuser', ${hashedPassword}, 1, 1, 1)
      `;
    }
  }
}

