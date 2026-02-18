import { useState, lazy, Suspense } from 'react';
import { PageView } from '@/types';
import { DataProvider } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';

const CalendarioPage = lazy(() => import('@/pages/CalendarioPage'));
const PanelesPage = lazy(() => import('@/pages/PanelesPage'));
const ClientesPage = lazy(() => import('@/pages/ClientesPage'));
const FinanzasPage = lazy(() => import('@/pages/FinanzasPage'));
const ServiciosPage = lazy(() => import('@/pages/ServiciosPage'));
const ConfiguracionPage = lazy(() => import('@/pages/ConfiguracionPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [pendingSearch, setPendingSearch] = useState('');

  const navigateWithSearch = (page: PageView, search: string) => {
    setPendingSearch(search);
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} onNavigateToPanel={(search) => navigateWithSearch('paneles', search)} />;
      case 'calendario': return <CalendarioPage />;
      case 'paneles': return <PanelesPage initialSearch={pendingSearch} onSearchConsumed={() => setPendingSearch('')} />;
      case 'clientes': return <ClientesPage />;
      case 'finanzas': return <FinanzasPage />;
      case 'servicios': return <ServiciosPage />;
      case 'configuracion': return <ConfiguracionPage />;
    }
  };

  return (
    <DataProvider>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Cargando...</div>}>
          {renderPage()}
        </Suspense>
      </AppLayout>
    </DataProvider>
  );
}

const Index = () => {
  const { user, loading, sessionExpired, clearSessionExpired } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            style={{
              width: 36,
              height: 36,
              border: '4px solid rgba(0,0,0,0.1)',
              borderLeftColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ color: '#888', fontSize: 14 }}>Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user && sessionExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center p-8 rounded-xl shadow-lg" style={{ backgroundColor: '#fff', maxWidth: 400 }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: '#fef3c7' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#111' }}>Tu sesión ha expirado</h2>
          <p className="mb-6 text-sm" style={{ color: '#666' }}>Por seguridad, tu sesión se ha cerrado. Inicia sesión nuevamente para continuar.</p>
          <button
            onClick={clearSessionExpired}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white"
            style={{ backgroundColor: '#3b82f6' }}
          >
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <AppContent />;
};

export default Index;
