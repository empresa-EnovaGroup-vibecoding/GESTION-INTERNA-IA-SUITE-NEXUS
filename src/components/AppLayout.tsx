import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Monitor, Users, DollarSign, Menu, Package, CalendarDays, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageView } from '@/types';
import { cn } from '@/lib/utils';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { applySidebarTheme } from '@/lib/sidebarTheme';
import { useContentTheme } from '@/hooks/useContentTheme';
import { hexToHSL } from '@/lib/colorUtils';

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
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

export default function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // dark by default
  });
  const { config, loading } = useConfiguracion();
  const { isCustom, resetColors } = useContentTheme();
  const { signOut } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    // Reset content colors to match the new mode
    resetColors();
  }, [darkMode, resetColors]);

  useEffect(() => {
    if (!loading) {
      applySidebarTheme(config);
      // Apply saved primary color on load
      if (config.color_primario) {
        const hsl = hexToHSL(config.color_primario);
        if (hsl) {
          document.documentElement.style.setProperty('--primary', hsl);
          document.documentElement.style.setProperty('--ring', hsl);
        }
      }
    }
  }, [loading, config]);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
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
          background: 'var(--sidebar-bg, #1a1f2e)',
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6" style={{ backgroundColor: 'var(--sidebar-logo-bg, #1e2235)' }}>
          {config.empresa_logo_url ? (
            <img src={config.empresa_logo_url} alt="Logo" className="h-8 w-8 rounded-xl object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--sidebar-icon-active, #4ef4c2)' }}>
              <Monitor className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-[15px] font-bold" style={{ color: 'var(--sidebar-active-text, #fff)' }}>{config.empresa_nombre}</h1>
            <p className="text-[11px]" style={{ color: 'var(--sidebar-text, #94a3b8)', opacity: 0.5 }}>{config.empresa_subtitulo}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--sidebar-text, #94a3b8)', opacity: 0.4 }}>
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
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 border-l-[3px]"
                style={{
                  backgroundColor: isActive ? 'var(--sidebar-active-bg, #2d3348)' : undefined,
                  color: isActive ? 'var(--sidebar-active-text, #fff)' : 'var(--sidebar-text, #94a3b8)',
                  borderColor: isActive ? 'var(--sidebar-icon-active, #4ef4c2)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover-bg, #232839)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-active-text, #fff)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text, #94a3b8)';
                  }
                }}
              >
                <Icon className="h-[18px] w-[18px]" style={{ color: isActive ? 'var(--sidebar-icon-active, #4ef4c2)' : 'var(--sidebar-icon-color, #64748b)' }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 space-y-2" style={{ borderTop: `1px solid var(--sidebar-border, #2d3348)` }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200"
            style={{ color: 'var(--sidebar-text, #94a3b8)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover-bg, #232839)';
              (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-active-text, #fff)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text, #94a3b8)';
            }}
          >
            {darkMode ? (
              <Sun className="h-[18px] w-[18px]" style={{ color: 'var(--sidebar-icon-color, #64748b)' }} />
            ) : (
              <Moon className="h-[18px] w-[18px]" style={{ color: 'var(--sidebar-icon-color, #64748b)' }} />
            )}
            {darkMode ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200"
            style={{ color: 'var(--sidebar-text, #94a3b8)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover-bg, #232839)';
              (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-active-text, #fff)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text, #94a3b8)';
            }}
          >
            <LogOut className="h-[18px] w-[18px]" style={{ color: 'var(--sidebar-icon-color, #64748b)' }} />
            Cerrar sesión
          </button>
          <p className="text-[11px]" style={{ color: 'var(--sidebar-text, #94a3b8)', opacity: 0.4 }}>v1.0 · Gestión Interna</p>
        </div>
      </aside>

      {/* Main content */}
      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundColor: isCustom ? 'var(--content-bg)' : undefined,
          color: isCustom ? 'var(--content-text)' : undefined,
          
        }}
      >
        <header
          className="flex h-14 items-center gap-4 border-b border-border px-4 lg:px-8"
          style={{
            backgroundColor: isCustom ? 'var(--content-card-bg)' : undefined,
            borderColor: isCustom ? 'var(--content-hover-bg)' : undefined,
            color: isCustom ? 'var(--content-text-heading)' : undefined,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden transition-colors duration-200 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold capitalize">{currentPage}</h2>
        </header>

        <main
          className="flex-1 overflow-y-auto p-4 lg:p-8"
          style={{
            backgroundColor: isCustom ? 'var(--content-bg)' : undefined,
            color: isCustom ? 'var(--content-text)' : undefined,
          }}
        >
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
