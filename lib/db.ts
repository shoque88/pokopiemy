import { put } from '@vercel/blob';

// Klucze dla Vercel Blob (nazwy plików)
const USERS_KEY = 'users.json';
const MATCHES_KEY = 'matches.json';
const REGISTRATIONS_KEY = 'registrations.json';

// Cache dla przechowywania danych w pamięci (opcjonalne, dla lepszej wydajności)
let cache: {
  users?: any[];
  matches?: any[];
  registrations?: any[];
  timestamp?: number;
  urls?: {
    users?: string;
    matches?: string;
    registrations?: string;
  };
} = {};

const CACHE_TTL = 30000; // 30 sekund

// Funkcja pomocnicza do pobierania URL blob store
function getBlobStoreUrl(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return null;
  }
  // Token ma format: vercel_blob_rw_<storeId>_<random>
  const parts = token.split('_');
  if (parts.length >= 4) {
    const storeId = parts[3];
    return `https://${storeId}.public.blob.vercel-storage.com`;
  }
  return null;
}

// Funkcje pomocnicze do odczytu/zapisu z Vercel Blob
async function readCollection(key: string, defaultValue: any[], skipCache: boolean = false): Promise<any[]> {
  try {
    // Sprawdź cache (tylko jeśli nie pomijamy cache)
    const cacheKey = key.replace('.json', '') as 'users' | 'matches' | 'registrations';
    const now = Date.now();
    if (!skipCache && cache[cacheKey] && cache.timestamp && (now - cache.timestamp) < CACHE_TTL) {
      return cache[cacheKey]!;
    }
    
    // Jeśli pomijamy cache, wyczyść go
    if (skipCache) {
      delete cache[cacheKey];
      delete cache.urls?.[cacheKey];
    }

    const baseUrl = getBlobStoreUrl();
    if (!baseUrl) {
      console.error('BLOB_READ_WRITE_TOKEN is not set or invalid');
      return defaultValue;
    }

    // Pobierz URL blob (używamy cache URL jeśli dostępny)
    // WAŻNE: Dla rejestracji zawsze używamy świeżego URL (bez cache), aby uniknąć problemów z propagacją danych
    let blobUrl = cache.urls?.[cacheKey];
    if (!blobUrl || cacheKey === 'registrations') {
      // Dla rejestracji zawsze generuj świeży URL, aby uniknąć problemów z cache
      blobUrl = `${baseUrl}/${key}`;
    }

    try {
      // Dla rejestracji dodaj timestamp do URL, aby wymusić świeże pobranie
      const fetchUrl = cacheKey === 'registrations' 
        ? `${blobUrl}?t=${Date.now()}` 
        : blobUrl;
      
      const response = await fetch(fetchUrl, {
        cache: 'no-store', // Zawsze pobierz najnowsze dane
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Blob nie istnieje jeszcze - zwróć wartość domyślną (tylko jeśli nie pomijamy cache)
          if (!skipCache) {
            cache[cacheKey] = defaultValue;
            cache.timestamp = now;
          }
          return defaultValue;
        }
        throw new Error(`Failed to fetch ${key}: ${response.statusText}`);
      }

      const data = await response.json();
      const result = Array.isArray(data) ? data : defaultValue;
      
      // Zaktualizuj cache (tylko jeśli nie pomijamy cache - dla rejestracji zawsze pomijamy cache)
      if (!skipCache) {
        cache[cacheKey] = result;
        cache.timestamp = now;
        if (!cache.urls) cache.urls = {};
        cache.urls[cacheKey] = blobUrl;
      }
      
      return result;
    } catch (fetchError: any) {
      // Jeśli fetch nie powiódł się (np. blob nie istnieje), zwróć wartość domyślną (tylko jeśli nie pomijamy cache)
      if (fetchError.message?.includes('404') || fetchError.status === 404) {
        if (!skipCache) {
          cache[cacheKey] = defaultValue;
          cache.timestamp = now;
        }
        return defaultValue;
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`Error reading ${key} from Blob:`, error);
    return defaultValue;
  }
}

async function writeCollection(key: string, data: any[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const cacheKey = key.replace('.json', '') as 'users' | 'matches' | 'registrations';
    
    console.log(`writeCollection: Saving ${key}`, {
      key,
      itemCount: data.length,
      cacheKey,
      sampleIds: cacheKey === 'matches' ? data.map((m: any) => m.id).slice(0, 5) : undefined,
      sampleIdsUsers: cacheKey === 'users' ? data.map((u: any) => u.id).slice(0, 5) : undefined,
    });
    
    // Zapisz do Vercel Blob
    const blob = await put(key, jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false, // Używamy stałych nazw plików
    });

    console.log(`writeCollection: Saved ${key} to Blob`, {
      key,
      blobUrl: blob.url,
      itemCount: data.length,
    });

    // Zaktualizuj cache (dla rejestracji nie zapisujemy w cache, aby zawsze mieć najnowsze dane)
    if (cacheKey !== 'registrations') {
      cache[cacheKey] = data;
      cache.timestamp = Date.now();
      if (!cache.urls) cache.urls = {};
      cache.urls[cacheKey] = blob.url;
      console.log(`writeCollection: Updated ${cacheKey} cache`, {
        cacheKey,
        itemCount: data.length,
        cacheTimestamp: cache.timestamp,
      });
    } else {
      // Dla rejestracji zawsze wyczyść cache, aby wymusić ponowne odczytanie
      delete cache.registrations;
      delete cache.timestamp;
      console.log('writeCollection: Cleared registrations cache after write');
    }
  } catch (error) {
    console.error(`Error writing ${key} to Blob:`, error);
    // Wyczyść cache w przypadku błędu
    const cacheKey = key.replace('.json', '') as 'users' | 'matches' | 'registrations';
    delete cache[cacheKey];
    throw error;
  }
}

// Inicjalizacja bazy danych
export async function initDatabase() {
  const users = await readCollection(USERS_KEY, []);

  // Utworzenie domyślnego użytkownika admina (jeśli nie istnieje)
  const adminExists = users.some((u: any) => u.is_admin === 1);
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const maxId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) : 0;
    const admin = {
      id: maxId + 1,
      name: 'Admin',
      email: 'admin@pokopiemy.pl',
      password: hashedPassword,
      phone: '+48123456789',
      preferred_level: null,
      is_admin: 1,
      is_superuser: 0,
      can_create_matches: 1,
      can_register_to_matches: 1,
      created_at: new Date().toISOString(),
    };
    users.push(admin);
    await writeCollection(USERS_KEY, users);
  }
  
  // Utworzenie superusera (jeśli nie istnieje)
  const superuserExists = users.some((u: any) => u.is_superuser === 1);
  if (!superuserExists) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('superuser123', 10);
    const maxId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) : 0;
    const superuser = {
      id: maxId + 1,
      name: 'Superuser',
      email: 'superuser@pokopiemy.pl',
      username: 'superuser',
      password: hashedPassword,
      phone: null,
      preferred_level: null,
      is_admin: 0,
      is_superuser: 1,
      can_create_matches: 1,
      can_register_to_matches: 1,
      created_at: new Date().toISOString(),
    };
    users.push(superuser);
    await writeCollection(USERS_KEY, users);
  }
}

// Prosty interfejs bazy danych (zachowuje kompatybilność z istniejącym kodem)
const db = {
  users: {
    all: async () => await readCollection(USERS_KEY, []),
    get: async (id: number) => {
      const users = await readCollection(USERS_KEY, []);
      return users.find((u: any) => u.id === id);
    },
    findByEmail: async (email: string) => {
      const users = await readCollection(USERS_KEY, []);
      return users.find((u: any) => u.email === email);
    },
    findByOAuth: async (provider: string, oauthId: string) => {
      const users = await readCollection(USERS_KEY, []);
      const found = users.find((u: any) => u.oauth_provider === provider && u.oauth_id === oauthId);
      console.log('db.users.findByOAuth', {
        provider,
        oauthId,
        found: !!found,
        totalUsers: users.length,
        allOAuthUsers: users
          .filter((u: any) => u.oauth_provider)
          .map((u: any) => ({ id: u.id, provider: u.oauth_provider, oauth_id: u.oauth_id })),
      });
      return found;
    },
    findByUsername: async (username: string) => {
      const users = await readCollection(USERS_KEY, []);
      return users.find((u: any) => u.username === username);
    },
    create: async (user: any) => {
      const users = await readCollection(USERS_KEY, []);
      const newId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1;
      const newUser = { ...user, id: newId, created_at: new Date().toISOString() };
      console.log('db.users.create: Creating user', {
        newId,
        email: newUser.email,
        oauth_provider: newUser.oauth_provider,
        oauth_id: newUser.oauth_id,
        totalUsersBefore: users.length,
      });
      users.push(newUser);
      await writeCollection(USERS_KEY, users);
      console.log('db.users.create: User created and saved', {
        userId: newUser.id,
        email: newUser.email,
        oauth_provider: newUser.oauth_provider,
        oauth_id: newUser.oauth_id,
        totalUsersAfter: users.length,
      });
      return newUser;
    },
    update: async (id: number, updates: any) => {
      const users = await readCollection(USERS_KEY, []);
      const index = users.findIndex((u: any) => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        await writeCollection(USERS_KEY, users);
        return users[index];
      }
      return null;
    },
  },
  matches: {
    all: async () => await readCollection(MATCHES_KEY, []),
    get: async (id: number) => {
      const matches = await readCollection(MATCHES_KEY, []);
      const match = matches.find((m: any) => m.id === id);
      console.log('matches.get:', { id, found: !!match, totalMatches: matches.length, matchIds: matches.map((m: any) => m.id) });
      return match;
    },
    create: async (match: any) => {
      const matches = await readCollection(MATCHES_KEY, []);
      
      // Znajdź najwyższe ID wśród istniejących meczów
      const maxMatchId = matches.length > 0 ? Math.max(...matches.map((m: any) => m.id)) : 0;
      
      // Znajdź najwyższe match_id wśród wszystkich rejestracji (nawet dla usuniętych meczów)
      // To zapewnia, że nowe ID będzie unikalne w całej historii aplikacji
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      const maxRegistrationMatchId = registrations.length > 0 
        ? Math.max(...registrations.map((r: any) => r.match_id || 0)) 
        : 0;
      
      // Użyj najwyższego ID z obu źródeł + 1
      const newId = Math.max(maxMatchId, maxRegistrationMatchId) + 1;
      
      console.log('Match create: Creating new match', { 
        newId, 
        totalMatches: matches.length, 
        maxMatchId,
        maxRegistrationMatchId,
        existingMatchIds: matches.map((m: any) => m.id),
        matchName: match.name,
      });
      
      const newMatch = { ...match, id: newId, created_at: new Date().toISOString() };
      matches.push(newMatch);
      
      console.log('Match create: Before writeCollection', {
        newId,
        totalMatchesBeforeWrite: matches.length,
        matchIdsBeforeWrite: matches.map((m: any) => m.id),
      });
      
      await writeCollection(MATCHES_KEY, matches);
      
      // Weryfikuj, czy mecz został poprawnie zapisany
      const verifyMatches = await readCollection(MATCHES_KEY, []);
      const verifyMatch = verifyMatches.find((m: any) => m.id === newId);
      console.log('Match create: After writeCollection verification', {
        newId,
        totalMatchesAfterWrite: verifyMatches.length,
        matchIdsAfterWrite: verifyMatches.map((m: any) => m.id),
        matchFound: !!verifyMatch,
        matchName: verifyMatch?.name,
      });
      
      return newMatch;
    },
    update: async (id: number, updates: any) => {
      const matches = await readCollection(MATCHES_KEY, []);
      const index = matches.findIndex((m: any) => m.id === id);
      if (index !== -1) {
        matches[index] = { ...matches[index], ...updates };
        await writeCollection(MATCHES_KEY, matches);
        return matches[index];
      }
      return null;
    },
    delete: async (id: number) => {
      const matches = await readCollection(MATCHES_KEY, []);
      const filtered = matches.filter((m: any) => m.id !== id);
      await writeCollection(MATCHES_KEY, filtered);
      return filtered.length < matches.length;
    },
    findByStatus: async (status: string) => {
      const matches = await readCollection(MATCHES_KEY, []);
      return matches.filter((m: any) => m.status === status);
    },
  },
  registrations: {
    all: async () => await readCollection(REGISTRATIONS_KEY, []),
    get: async (id: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      return registrations.find((r: any) => r.id === id);
    },
    findByMatch: async (matchId: number) => {
      // Wyłącz cache dla rejestracji, aby zawsze mieć najnowsze dane
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      const result = registrations.filter((r: any) => r.match_id === matchId);
      console.log('findByMatch:', { 
        matchId, 
        count: result.length, 
        allRegistrations: registrations.length,
        matchingRegistrations: result.map((r: any) => ({ id: r.id, match_id: r.match_id, user_id: r.user_id })),
        allRegistrationsDetails: registrations.map((r: any) => ({ id: r.id, match_id: r.match_id, user_id: r.user_id })),
      });
      return result;
    },
    findByUser: async (userId: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      return registrations.filter((r: any) => r.user_id === userId);
    },
    findByMatchAndUser: async (matchId: number, userId: number) => {
      // Wyłącz cache dla rejestracji, aby zawsze mieć najnowsze dane
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      const result = registrations.find((r: any) => r.match_id === matchId && r.user_id === userId);
      console.log('findByMatchAndUser:', { matchId, userId, found: !!result, allRegistrations: registrations.length });
      return result;
    },
    create: async (registration: any) => {
      // Wyłącz cache dla rejestracji, aby zawsze mieć najnowsze dane przed sprawdzeniem duplikatów
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      console.log('Registration create: Current registrations count:', registrations.length);
      
      // Sprawdź czy już istnieje - użyj dokładnego dopasowania
      const exists = registrations.some(
        (r: any) => r.match_id === registration.match_id && r.user_id === registration.user_id
      );
      if (exists) {
        console.log('Registration create: Duplicate detected', { match_id: registration.match_id, user_id: registration.user_id });
        return null;
      }
      
      // Utwórz nową rejestrację
      const newId = registrations.length > 0 ? Math.max(...registrations.map((r: any) => r.id)) + 1 : 1;
      const newRegistration = { ...registration, id: newId, created_at: new Date().toISOString() };
      console.log('Registration create: Creating new registration', { id: newId, match_id: registration.match_id, user_id: registration.user_id });
      
      // Dodaj nową rejestrację do listy (używamy spread operator, aby utworzyć nową tablicę)
      const updatedRegistrations = [...registrations, newRegistration];
      console.log('Registration create: Updated registrations count:', updatedRegistrations.length);
      
      // Zapisz (dla rejestracji nie zapisujemy w cache w writeCollection)
      await writeCollection(REGISTRATIONS_KEY, updatedRegistrations);
      
      // Weryfikuj, czy rejestracja została poprawnie zapisana - dodaj małe opóźnienie, aby dać czas na propagację
      await new Promise(resolve => setTimeout(resolve, 100));
      const verifyRegistrations = await readCollection(REGISTRATIONS_KEY, [], true);
      const verifyRegistration = verifyRegistrations.find((r: any) => r.id === newRegistration.id);
      console.log('Registration create: Verification after write', {
        registrationId: newRegistration.id,
        matchId: newRegistration.match_id,
        userId: newRegistration.user_id,
        found: !!verifyRegistration,
        totalRegistrations: verifyRegistrations.length,
        matchingRegistrations: verifyRegistrations
          .filter((r: any) => r.match_id === newRegistration.match_id)
          .map((r: any) => ({ id: r.id, user_id: r.user_id })),
      });
      
      return newRegistration;
    },
    delete: async (id: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      const filtered = registrations.filter((r: any) => r.id !== id);
      await writeCollection(REGISTRATIONS_KEY, filtered);
      return filtered.length < registrations.length;
    },
    countByMatch: async (matchId: number) => {
      // Wyłącz cache dla rejestracji, aby zawsze mieć najnowsze dane
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      const count = registrations.filter((r: any) => r.match_id === matchId).length;
      console.log('countByMatch:', { matchId, count, allRegistrations: registrations.length });
      return count;
    },
    deleteByMatch: async (matchId: number) => {
      // Wyłącz cache, aby mieć najnowsze dane przed usunięciem
      const registrations = await readCollection(REGISTRATIONS_KEY, [], true);
      console.log('deleteByMatch: Before deletion', { matchId, totalRegistrations: registrations.length, matchingRegistrations: registrations.filter((r: any) => r.match_id === matchId).length });
      const filtered = registrations.filter((r: any) => r.match_id !== matchId);
      console.log('deleteByMatch: After filtering', { matchId, filteredCount: filtered.length, deletedCount: registrations.length - filtered.length });
      await writeCollection(REGISTRATIONS_KEY, filtered);
      return filtered.length < registrations.length;
    },
  },
};

export default db;
