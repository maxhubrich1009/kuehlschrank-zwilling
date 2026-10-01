import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kühlschrank-Zwilling',
  description: 'Digitaler Zwilling deines Kühlschrankinhalts – v0.1'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
