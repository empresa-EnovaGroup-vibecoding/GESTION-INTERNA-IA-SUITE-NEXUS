import React, { useState } from 'react';
import { LayoutDashboard, Monitor, Users, DollarSign, Menu, Package, CalendarDays } from 'lucide-react';
import { PageView } from '@/types';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  children: React.ReactNode;
}

const navItems: { id: PageView; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'paneles', label: 'Paneles', icon: Monitor },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
  { id: 'servicios', label: 'Servicios', icon: Package },
];

export default function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'linear-gradient(180deg, #1A1A2E 0%, #16213E 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <Monitor className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white">AI Subs</h1>
            <p className="text-[11px] text-white/40">Panel de gestión</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">
            Menú
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white border-l-[3px] border-primary"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white/90 border-l-[3px] border-transparent"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-[11px] text-white/30">v1.0 · Gestión Interna</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground lg:hidden transition-colors duration-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold capitalize text-foreground">{currentPage}</h2>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
