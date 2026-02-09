import { Smartphone, Share, MoreVertical, Plus, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';

function StepCard({ step, icon: Icon, title, description }: { step: number; icon: React.ElementType; title: string; description: string }) {
  return (
    <Card className="flex items-start gap-4 p-5 border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm">
        {step}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-sm">Instalar Nexus</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <img src="/icons/icon-192.png" alt="Nexus" className="h-14 w-14 rounded-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Nexus</h2>
            <p className="text-sm text-muted-foreground mt-1">Panel de gestión</p>
          </div>

          {installed ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">¡App ya instalada!</span>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="gap-2">
              <Download className="h-4 w-4" />
              Instalar ahora
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Sigue los pasos según tu dispositivo</p>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="android" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="android">Android</TabsTrigger>
            <TabsTrigger value="ios">iPhone / iPad</TabsTrigger>
          </TabsList>

          <TabsContent value="android" className="mt-6 space-y-3">
            <StepCard
              step={1}
              icon={Smartphone}
              title="Abre en Chrome"
              description="Abre esta página en Google Chrome. Asegúrate de no estar en modo incógnito."
            />
            <StepCard
              step={2}
              icon={MoreVertical}
              title="Menú del navegador"
              description='Toca el ícono de tres puntos (⋮) en la esquina superior derecha de Chrome.'
            />
            <StepCard
              step={3}
              icon={Download}
              title='"Instalar app" o "Agregar a inicio"'
              description='Busca la opción "Instalar app" o "Agregar a pantalla de inicio" en el menú desplegable.'
            />
            <StepCard
              step={4}
              icon={CheckCircle2}
              title="Confirma la instalación"
              description="Toca Instalar en el diálogo de confirmación. La app aparecerá en tu pantalla de inicio."
            />
          </TabsContent>

          <TabsContent value="ios" className="mt-6 space-y-3">
            <StepCard
              step={1}
              icon={Smartphone}
              title="Abre en Safari"
              description="Abre esta página en Safari. La instalación no funciona desde Chrome u otros navegadores en iOS."
            />
            <StepCard
              step={2}
              icon={Share}
              title="Botón Compartir"
              description='Toca el ícono de compartir (cuadrado con flecha hacia arriba) en la barra inferior de Safari.'
            />
            <StepCard
              step={3}
              icon={Plus}
              title='"Agregar a pantalla de inicio"'
              description='Desplázate hacia abajo en el menú y selecciona "Agregar a pantalla de inicio".'
            />
            <StepCard
              step={4}
              icon={CheckCircle2}
              title="Confirma"
              description='Toca "Agregar" en la esquina superior derecha. La app aparecerá en tu pantalla de inicio como una app nativa.'
            />
          </TabsContent>
        </Tabs>

        {/* Benefits */}
        <Card className="p-5 border-border/50 bg-card/80">
          <h3 className="font-semibold text-sm mb-3">¿Por qué instalarla?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Acceso rápido desde tu pantalla de inicio</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Experiencia a pantalla completa sin barras del navegador</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Carga más rápida con caché de recursos</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
