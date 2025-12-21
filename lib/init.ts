// Ten plik zapewnia inicjalizację bazy danych przy starcie aplikacji
import { initDatabase } from './db';

// Inicjalizuj bazę danych (asynchronicznie)
(async () => {
  try {
    await initDatabase();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();

