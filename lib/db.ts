import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data');
const usersPath = path.join(dbPath, 'users.json');
const matchesPath = path.join(dbPath, 'matches.json');
const registrationsPath = path.join(dbPath, 'registrations.json');

// Upewnij się, że katalog data istnieje
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// Funkcje pomocnicze do odczytu/zapisu
function readFile(filePath: string, defaultValue: any[]): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeFile(filePath: string, data: any[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// Inicjalizacja bazy danych
export function initDatabase() {
  const users = readFile(usersPath, []);
  const matches = readFile(matchesPath, []);
  const registrations = readFile(registrationsPath, []);

  // Utworzenie domyślnego użytkownika admina (jeśli nie istnieje)
  const adminExists = users.some((u: any) => u.is_admin === 1);
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const admin = {
      id: users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1,
      name: 'Admin',
      email: 'admin@pokopiemy.pl',
      password: hashedPassword,
      phone: '+48123456789',
      favorite_position: 'Bramkarz',
      is_admin: 1,
      created_at: new Date().toISOString(),
    };
    users.push(admin);
    writeFile(usersPath, users);
  }
}

// Inicjalizacja przy pierwszym uruchomieniu
initDatabase();

// Prosty interfejs bazy danych
const db = {
  users: {
    all: () => readFile(usersPath, []),
    get: (id: number) => {
      const users = readFile(usersPath, []);
      return users.find((u: any) => u.id === id);
    },
    findByEmail: (email: string) => {
      const users = readFile(usersPath, []);
      return users.find((u: any) => u.email === email);
    },
    create: (user: any) => {
      const users = readFile(usersPath, []);
      const newId = users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1;
      const newUser = { ...user, id: newId, created_at: new Date().toISOString() };
      users.push(newUser);
      writeFile(usersPath, users);
      return newUser;
    },
    update: (id: number, updates: any) => {
      const users = readFile(usersPath, []);
      const index = users.findIndex((u: any) => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        writeFile(usersPath, users);
        return users[index];
      }
      return null;
    },
  },
  matches: {
    all: () => readFile(matchesPath, []),
    get: (id: number) => {
      const matches = readFile(matchesPath, []);
      return matches.find((m: any) => m.id === id);
    },
    create: (match: any) => {
      const matches = readFile(matchesPath, []);
      const newId = matches.length > 0 ? Math.max(...matches.map((m: any) => m.id)) + 1 : 1;
      const newMatch = { ...match, id: newId, created_at: new Date().toISOString() };
      matches.push(newMatch);
      writeFile(matchesPath, matches);
      return newMatch;
    },
    update: (id: number, updates: any) => {
      const matches = readFile(matchesPath, []);
      const index = matches.findIndex((m: any) => m.id === id);
      if (index !== -1) {
        matches[index] = { ...matches[index], ...updates };
        writeFile(matchesPath, matches);
        return matches[index];
      }
      return null;
    },
    delete: (id: number) => {
      const matches = readFile(matchesPath, []);
      const filtered = matches.filter((m: any) => m.id !== id);
      writeFile(matchesPath, filtered);
      return filtered.length < matches.length;
    },
    findByStatus: (status: string) => {
      const matches = readFile(matchesPath, []);
      return matches.filter((m: any) => m.status === status);
    },
  },
  registrations: {
    all: () => readFile(registrationsPath, []),
    get: (id: number) => {
      const registrations = readFile(registrationsPath, []);
      return registrations.find((r: any) => r.id === id);
    },
    findByMatch: (matchId: number) => {
      const registrations = readFile(registrationsPath, []);
      return registrations.filter((r: any) => r.match_id === matchId);
    },
    findByUser: (userId: number) => {
      const registrations = readFile(registrationsPath, []);
      return registrations.filter((r: any) => r.user_id === userId);
    },
    findByMatchAndUser: (matchId: number, userId: number) => {
      const registrations = readFile(registrationsPath, []);
      return registrations.find((r: any) => r.match_id === matchId && r.user_id === userId);
    },
    create: (registration: any) => {
      const registrations = readFile(registrationsPath, []);
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
      writeFile(registrationsPath, registrations);
      return newRegistration;
    },
    delete: (id: number) => {
      const registrations = readFile(registrationsPath, []);
      const filtered = registrations.filter((r: any) => r.id !== id);
      writeFile(registrationsPath, filtered);
      return filtered.length < registrations.length;
    },
    countByMatch: (matchId: number) => {
      const registrations = readFile(registrationsPath, []);
      return registrations.filter((r: any) => r.match_id === matchId).length;
    },
  },
};

export default db;
