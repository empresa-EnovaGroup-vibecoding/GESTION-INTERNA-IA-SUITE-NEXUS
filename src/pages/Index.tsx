import { useState } from 'react';
import { PageView } from '@/types';
import { DataProvider } from '@/contexts/DataContext';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import PanelesPage from '@/pages/PanelesPage';
import ClientesPage from '@/pages/ClientesPage';
import FinanzasPage from '@/pages/FinanzasPage';
import ServiciosPage from '@/pages/ServiciosPage';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
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
};

export default Index;
