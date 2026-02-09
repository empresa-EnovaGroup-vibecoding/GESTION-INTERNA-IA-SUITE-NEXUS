
-- Create the updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create configuracion key-value table
CREATE TABLE public.configuracion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to configuracion"
  ON public.configuracion
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO public.configuracion (clave, valor) VALUES
  ('empresa_nombre', 'AI Subs'),
  ('empresa_subtitulo', 'Panel de gestión'),
  ('empresa_logo_url', NULL),
  ('color_primario', '#6366F1'),
  ('comision_porcentaje', '5'),
  ('comision_receptor', 'Ederson'),
  ('monedas_activas', '["USD","MXN","COP"]'),
  ('tasas_cambio', '{"MXN":17.5,"COP":4200}'),
  ('equipo', '[]');

CREATE TRIGGER update_configuracion_updated_at
  BEFORE UPDATE ON public.configuracion
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Anyone can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Anyone can update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos');

CREATE POLICY "Anyone can delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos');
