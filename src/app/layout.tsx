import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Eco-Corruption Guard | Environmental Control Center', description: 'Environmental monitoring, early warning and tamper-evident evidence. Simulation prototype.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="th"><body>{children}</body></html>; }
