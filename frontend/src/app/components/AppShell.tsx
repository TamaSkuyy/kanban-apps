'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import SkipToContent from './SkipToContent';
import ScreenReaderAnnouncer from './ScreenReaderAnnouncer';

const AUTH_PATHS = ['/login', '/register'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SkipToContent />
      <ScreenReaderAnnouncer />
      <Navbar />
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
