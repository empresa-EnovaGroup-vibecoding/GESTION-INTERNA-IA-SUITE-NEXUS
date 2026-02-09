import { Cliente, Suscripcion, Servicio } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function getWhatsAppNotificationUrl(
  cliente: Cliente,
  suscripcion: Suscripcion,
  servicio: Servicio | undefined,
  tipo: 'proximo' | 'hoy' | 'vencido'
): string {
  const numero = cliente.whatsapp.replace(/\D/g, '');
  const fechaVenc = format(new Date(suscripcion.fechaVencimiento), "dd 'de' MMMM", { locale: es });
  const servicioNombre = servicio?.nombre || 'tu servicio';

  let mensaje = '';

  switch (tipo) {
    case 'hoy':
      mensaje = `Hola ${cliente.nombre}! Tu suscripción de ${servicioNombre} vence hoy ${fechaVenc}. ¿Quieres renovar? Responde SI para renovar 🙌`;
      break;
    case 'proximo':
      mensaje = `Hola ${cliente.nombre}! Tu suscripción de ${servicioNombre} vence el ${fechaVenc}. ¿Te lo renuevo para que no pierdas acceso? 💬`;
      break;
    case 'vencido':
      mensaje = `Hola ${cliente.nombre}! Tu suscripción de ${servicioNombre} venció el ${fechaVenc}. ¿Quieres renovar para seguir usando el servicio? 🚀`;
      break;
  }

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
