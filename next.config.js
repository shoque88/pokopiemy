/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Konfiguracja dla hostingu IONOS
  output: 'standalone', // Tworzy standalone build dla łatwiejszego wdrożenia
  // Jeśli IONOS wymaga określonego portu, użyj zmiennej środowiskowej PORT
  // Ukryj ostrzeżenie deprecacji url.parse() z NextAuth
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Przechwytuj ostrzeżenia przed ich wyświetleniem
      const originalEmitWarning = process.emitWarning;
      process.emitWarning = function(warning, ...args) {
        if (warning && typeof warning === 'object') {
          if (warning.name === 'DeprecationWarning' && warning.message && warning.message.includes('url.parse()')) {
            return; // Ignoruj to ostrzeżenie
          }
        }
        if (typeof warning === 'string' && warning.includes('url.parse()')) {
          return; // Ignoruj to ostrzeżenie
        }
        return originalEmitWarning.apply(process, [warning, ...args]);
      };
      
      // Również przechwytuj przez process.on('warning')
      process.removeAllListeners('warning');
      process.on('warning', (warning) => {
        if (warning.name === 'DeprecationWarning' && warning.message && warning.message.includes('url.parse()')) {
          return; // Ignoruj to ostrzeżenie
        }
        console.warn(warning.name, warning.message);
      });
    }
    return config;
  },
}

module.exports = nextConfig

