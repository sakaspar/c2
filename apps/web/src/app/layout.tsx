import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Salafni BNPL Tunisia',
  description: 'Investor-ready Tunisian Buy Now Pay Later fintech platform'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
