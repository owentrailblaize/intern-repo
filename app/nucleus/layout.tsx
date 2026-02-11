'use client';

import { AuthProvider } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ReactNode } from 'react';
import { Sidebar } from '@/app/workspace/components/Sidebar';

function NucleusLayoutInner({ children }: { children: ReactNode }) {
  return (
    <div className="ws-layout">
      <Sidebar unreadCount={3} />
      <main className="ws-main">
        <div className="ws-content nucleus-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function NucleusLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <NucleusLayoutInner>{children}</NucleusLayoutInner>
      </ProtectedRoute>
    </AuthProvider>
  );
}
