import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('install-banner-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (!dismissed && !isStandalone && isMobile) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  return (
    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm">
      <Download className="h-4 w-4 text-primary shrink-0" />
      <p className="flex-1 text-foreground">
        <span className="font-medium">Instala Nexus</span>{' '}
        <span className="text-muted-foreground">para acceso rápido.</span>{' '}
        <a href="/install" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          Ver cómo
        </a>
      </p>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
