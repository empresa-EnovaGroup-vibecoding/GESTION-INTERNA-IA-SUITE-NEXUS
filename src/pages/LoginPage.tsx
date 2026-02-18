import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Send } from 'lucide-react';
import logoNexus from '@/assets/logo-nexus.png';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSubmitting(true);
    const { supabaseExternal } = await import('@/lib/supabaseExternal');
    const { error } = await supabaseExternal.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
    setResetSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-30"
              style={{ background: 'hsl(var(--primary))' }}
            />
            <img
              src={logoNexus}
              alt="Nexus Digital logo"
              className="relative mx-auto h-16 w-16 rounded-2xl object-contain shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Nexus
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {forgotMode ? 'Recupera el acceso a tu cuenta' : 'Panel de gestión digital'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-scale-in">
          {forgotMode ? (
            /* ─── Forgot password ─── */
            resetSent ? (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <Send className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Enlace enviado</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Revisa tu bandeja de entrada para el enlace de recuperación.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setForgotMode(false); setResetSent(false); setError(''); }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5 animate-fade-in">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold text-foreground">Recuperar contraseña</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Te enviaremos un enlace para restablecer tu contraseña
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="tu@email.com"
                      className="pl-10 h-11 rounded-xl bg-background"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full h-11 rounded-xl font-medium shadow-sm" disabled={resetSubmitting}>
                  {resetSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    'Enviar enlace'
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setForgotMode(false); setError(''); }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al login
                </button>
              </form>
            )
          ) : (
            /* ─── Login form ─── */
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="tu@email.com"
                      className="pl-10 h-11 rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={6}
                      className="pl-10 pr-10 h-11 rounded-xl bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full h-11 rounded-xl font-medium shadow-sm" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Iniciando sesión...
                    </span>
                  ) : (
                    'Iniciar sesión'
                  )}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-border text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => { setForgotMode(true); setError(''); }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 opacity-60">
          Nexus Digital © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
