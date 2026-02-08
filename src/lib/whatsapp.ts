import { Cliente, Suscripcion } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function getWhatsAppNotificationUrl(
  cliente: Cliente,
  suscripcion: Suscripcion,
  tipo: 'proximo' | 'hoy' | 'vencido'
): string {
  const numero = cliente.whatsapp.replace(/\D/g, '');
  const fechaVenc = format(new Date(suscripcion.fechaVencimiento), "dd 'de' MMMM", { locale: es });
  const servicio = suscripcion.servicio;

  let mensaje = '';

  switch (tipo) {
    case 'proximo':
      mensaje = `Hola ${cliente.nombre} 👋\n\nTe recordamos que tu suscripción de *${servicio}* vence el *${fechaVenc}*.\n\n¿Deseas renovarla? Estamos para ayudarte. 🙌`;
      break;
    case 'hoy':
      mensaje = `Hola ${cliente.nombre} 👋\n\n⚠️ Tu suscripción de *${servicio}* *vence hoy* (${fechaVenc}).\n\nPara no perder el acceso, renueva ahora. ¡Escríbenos! 💬`;
      break;
    case 'vencido':
      mensaje = `Hola ${cliente.nombre} 👋\n\nTu suscripción de *${servicio}* venció el *${fechaVenc}*.\n\n¿Te gustaría renovarla? Te ayudamos enseguida. 🚀`;
      break;
  }

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
