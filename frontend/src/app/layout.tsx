import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import AppShell from './components/AppShell';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeProvider from './components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Kanban Task Manager',
  description: 'Simple Trello-like Kanban app',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Toaster position="bottom-right" richColors />
        <ThemeProvider>
          <ErrorBoundary>
            <OfflineBanner />
            <AppShell>{children}</AppShell>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
