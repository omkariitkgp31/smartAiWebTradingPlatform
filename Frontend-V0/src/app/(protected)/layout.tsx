'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { MarketProvider } from '../../context/MarketContext';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';

function ProtectedContent({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <div className="app-loading"><div className="spinner"></div></div>;
  }

  if (!isAuthenticated) return null;

  return (
    <MarketProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="app-main">
          <Navbar />
          <div className="app-content">
            {children}
          </div>
        </div>
      </div>
    </MarketProvider>
  );
}

export default function ProtectedLayout({ children }) {
  return <ProtectedContent>{children}</ProtectedContent>;
}
