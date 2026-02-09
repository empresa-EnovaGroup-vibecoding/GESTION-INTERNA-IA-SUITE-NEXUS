import { useState } from 'react';
import { PageView } from '@/types';
import { DataProvider } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import CalendarioPage from '@/pages/CalendarioPage';
import PanelesPage from '@/pages/PanelesPage';
import ClientesPage from '@/pages/ClientesPage';
import FinanzasPage from '@/pages/FinanzasPage';
import ServiciosPage from '@/pages/ServiciosPage';
import ConfiguracionPage from '@/pages/ConfiguracionPage';
import LoginPage from '@/pages/LoginPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'calendario': return <CalendarioPage />;
      case 'paneles': return <PanelesPage />;
      case 'clientes': return <ClientesPage />;
      case 'finanzas': return <FinanzasPage />;
      case 'servicios': return <ServiciosPage />;
      case 'configuracion': return <ConfiguracionPage />;
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

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <AppContent />;
};

export default Index;
