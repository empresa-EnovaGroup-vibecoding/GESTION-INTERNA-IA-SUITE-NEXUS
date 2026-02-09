import { useState } from 'react';
import { PageView } from '@/types';
import { DataProvider } from '@/contexts/DataContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import CalendarioPage from '@/pages/CalendarioPage';
import PanelesPage from '@/pages/PanelesPage';
import ClientesPage from '@/pages/ClientesPage';
import FinanzasPage from '@/pages/FinanzasPage';
import ServiciosPage from '@/pages/ServiciosPage';
import LoginPage from '@/pages/LoginPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'calendario': return <CalendarioPage />;
      case 'paneles': return <PanelesPage />;
      case 'clientes': return <ClientesPage />;
      case 'finanzas': return <FinanzasPage />;
      case 'servicios': return <ServiciosPage />;
    }
  };

  return (
    <DataProvider>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </AppLayout>
    </DataProvider>
  );
}

const Index = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default Index;
