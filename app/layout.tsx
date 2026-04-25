import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'DiscoveryLens - AI-Powered Legal Discovery',
  description: 'Analyze legal discovery files with AI assistance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
