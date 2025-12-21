/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Konfiguracja dla hostingu IONOS
  output: 'standalone', // Tworzy standalone build dla łatwiejszego wdrożenia
  // Jeśli IONOS wymaga określonego portu, użyj zmiennej środowiskowej PORT
}

module.exports = nextConfig

