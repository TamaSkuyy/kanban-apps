import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Kanban Task Manager',
  description: 'Simple Trello-like Kanban app',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <Toaster position="bottom-right" richColors />
        <ErrorBoundary>
          <Navbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
