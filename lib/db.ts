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
async function readCollection(key: string, defaultValue: any[]): Promise<any[]> {
  try {
    // Sprawdź cache
    const cacheKey = key.replace('.json', '') as 'users' | 'matches' | 'registrations';
    const now = Date.now();
    if (cache[cacheKey] && cache.timestamp && (now - cache.timestamp) < CACHE_TTL) {
      return cache[cacheKey]!;
    }

    const baseUrl = getBlobStoreUrl();
    if (!baseUrl) {
      console.error('BLOB_READ_WRITE_TOKEN is not set or invalid');
      return defaultValue;
    }

    // Pobierz URL blob (używamy cache URL jeśli dostępny)
    let blobUrl = cache.urls?.[cacheKey];
    if (!blobUrl) {
      blobUrl = `${baseUrl}/${key}`;
    }

    try {
      const response = await fetch(blobUrl, {
        cache: 'no-store', // Zawsze pobierz najnowsze dane
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Blob nie istnieje jeszcze - zwróć wartość domyślną
          cache[cacheKey] = defaultValue;
          cache.timestamp = now;
          return defaultValue;
        }
        throw new Error(`Failed to fetch ${key}: ${response.statusText}`);
      }

      const data = await response.json();
      const result = Array.isArray(data) ? data : defaultValue;
      
      // Zaktualizuj cache
      cache[cacheKey] = result;
      cache.timestamp = now;
      if (!cache.urls) cache.urls = {};
      cache.urls[cacheKey] = blobUrl;
      
      return result;
    } catch (fetchError: any) {
      // Jeśli fetch nie powiódł się (np. blob nie istnieje), zwróć wartość domyślną
      if (fetchError.message?.includes('404') || fetchError.status === 404) {
        cache[cacheKey] = defaultValue;
        cache.timestamp = now;
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
    
    // Zapisz do Vercel Blob
    const blob = await put(key, jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false, // Używamy stałych nazw plików
    });

    // Zaktualizuj cache
    const cacheKey = key.replace('.json', '') as 'users' | 'matches' | 'registrations';
    cache[cacheKey] = data;
    cache.timestamp = Date.now();
    if (!cache.urls) cache.urls = {};
    cache.urls[cacheKey] = blob.url;
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
      return users.find((u: any) => u.oauth_provider === provider && u.oauth_id === oauthId);
    },
    findByUsername: async (username: string) => {
      const users = await readCollection(USERS_KEY, []);
      return users.find((u: any) => u.username === username);
    },
    create: async (user: any) => {
      const users = await readCollection(USERS_KEY, []);
      const newId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1;
      const newUser = { ...user, id: newId, created_at: new Date().toISOString() };
      users.push(newUser);
      await writeCollection(USERS_KEY, users);
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
      return matches.find((m: any) => m.id === id);
    },
    create: async (match: any) => {
      const matches = await readCollection(MATCHES_KEY, []);
      const newId = matches.length > 0 ? Math.max(...matches.map((m: any) => m.id)) + 1 : 1;
      const newMatch = { ...match, id: newId, created_at: new Date().toISOString() };
      matches.push(newMatch);
      await writeCollection(MATCHES_KEY, matches);
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
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      return registrations.filter((r: any) => r.match_id === matchId);
    },
    findByUser: async (userId: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      return registrations.filter((r: any) => r.user_id === userId);
    },
    findByMatchAndUser: async (matchId: number, userId: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      return registrations.find((r: any) => r.match_id === matchId && r.user_id === userId);
    },
    create: async (registration: any) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      // Sprawdź czy już istnieje
      const exists = registrations.some(
        (r: any) => r.match_id === registration.match_id && r.user_id === registration.user_id
      );
      if (exists) {
        return null;
      }
      const newId = registrations.length > 0 ? Math.max(...registrations.map((r: any) => r.id)) + 1 : 1;
      const newRegistration = { ...registration, id: newId, created_at: new Date().toISOString() };
      registrations.push(newRegistration);
      await writeCollection(REGISTRATIONS_KEY, registrations);
      return newRegistration;
    },
    delete: async (id: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      const filtered = registrations.filter((r: any) => r.id !== id);
      await writeCollection(REGISTRATIONS_KEY, filtered);
      return filtered.length < registrations.length;
    },
    countByMatch: async (matchId: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      return registrations.filter((r: any) => r.match_id === matchId).length;
    },
    deleteByMatch: async (matchId: number) => {
      const registrations = await readCollection(REGISTRATIONS_KEY, []);
      const filtered = registrations.filter((r: any) => r.match_id !== matchId);
      await writeCollection(REGISTRATIONS_KEY, filtered);
      return filtered.length < registrations.length;
    },
  },
};

export default db;
