import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Pokopiemy - Platforma do organizowania meczów piłki nożnej',
  description: 'Zapisz się na amatorskie mecze piłki nożnej w Twojej okolicy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>
        <Providers>
          <Navigation />
          <main className="container">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

