// Ten plik zapewnia inicjalizację bazy danych przy starcie aplikacji
import { initDatabase } from './db-neon';

// Ukryj ostrzeżenie deprecacji url.parse() z NextAuth
if (typeof process !== 'undefined') {
  // Usuń wszystkie istniejące listenery dla 'warning'
  process.removeAllListeners('warning');
  
  // Dodaj własny listener, który filtruje ostrzeżenie url.parse()
  process.on('warning', (warning) => {
    // Ignoruj ostrzeżenie deprecacji url.parse() z NextAuth
    if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse()')) {
      return; // Ignoruj to ostrzeżenie
    }
    // Dla innych ostrzeżeń, wyświetl je normalnie
    console.warn(warning.name, warning.message);
  });
}

// Inicjalizuj bazę danych (asynchronicznie)
(async () => {
  try {
    await initDatabase();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();

