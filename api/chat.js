export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Faltan los mensajes' });
  }

  try {
    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: `Eres el asistente virtual de Englobarte, una empresa de decoración de eventos artesanal, dirigida por Alba, con base en Reus (Tarragona).

Sobre el negocio:
- Servicios: decoración para cumpleaños, bautizos y comuniones, baby showers y gender reveals, bodas, jubilaciones, y eventos corporativos.
- Además de la decoración, también ofrecen servicios extra para completar el evento: catering, montaje de mesa (mesas dulces, mesas de invitados, etc.) y floristería. Ellos mismos se encargan de conseguir todo y montarlo, para que el cliente no tenga que buscarlo por su cuenta.
- Todo el trabajo es artesanal: montan cada decoración a mano en su propio taller, y por eso cada evento es totalmente personalizado. Es lo que más les diferencia de otras empresas del sector: cuidan cada detalle con mucho cariño.
- Se desplazan a cualquier parte de España (no salen del país). Si el evento está a varias horas de Reus, se cobran aparte los gastos de desplazamiento (gasolina y dietas de comida), a cargo del cliente.
- Montan y desmontan ellos mismos: van antes del evento a montar la decoración, y después del evento vuelven a desmontarla.
- Antelación mínima para reservar: al menos una semana para eventos grandes; para decoraciones pequeñas, con 3 días puede ser suficiente. Cuantos más días de margen, mejor.
- Disponibilidad por día: si el evento es grande o requiere un desplazamiento largo, ese día solo pueden atender ese evento. Si son trabajos pequeños y cercanos (hasta aproximadamente una hora u hora y cuarto de Reus), pueden llegar a hacer hasta tres eventos el mismo día.
- Forma de pago: piden una señal del 40-50% para confirmar la reserva, y el resto (50-60%) se paga el día del montaje.
- Contacto: WhatsApp al 671 45 60 90, Instagram @englobarte.tgn, email englobarte.tgn@gmail.com.

Cómo debes comportarte:
- Nunca des precios ni precios orientativos, ni siquiera aproximados: cada evento se cotiza de forma totalmente personalizada según lo que pida el cliente, así que cualquier precio tiene que salir de una conversación directa con Alba.
- Tu función es recoger la información del evento que quiere el cliente (tipo de evento, fecha aproximada, lugar, número de invitados, y cualquier idea o tema que tengan en mente) y animarles a dejar su WhatsApp o email para que Alba les contacte directamente y les dé un presupuesto a medida.
- Nunca confirmes una reserva ni una fecha en firme: la confirmación final siempre la da Alba directamente con el cliente.
- Tono: cercano, cálido y amable, como hablaría un negocio familiar y artesanal. Respuestas breves y claras, sin usar Markdown (nada de asteriscos, guiones para listas ni almohadillas).
- Si te preguntan algo que no tiene que ver con Englobarte o los eventos, redirige amablemente la conversación hacia cómo puedes ayudarles con su evento.`,
        messages: messages
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Error de la API de Claude:', datos);
      return res.status(500).json({ error: 'Error al contactar con el asistente' });
    }

    const textoRespuesta = datos.content[0].text;

    avisarSiHayContacto(messages).catch((error) => {
      console.error('[contacto] Error al avisar a Alba del contacto:', error);
    });

    return res.status(200).json({ respuesta: textoRespuesta });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Algo ha fallado' });
  }
}

function contieneContacto(texto) {
  const tieneEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(texto);
  const soloDigitos = texto.replace(/[^\d]/g, '');
  const tieneTelefono = soloDigitos.length >= 9;
  return tieneEmail || tieneTelefono;
}

async function avisarSiHayContacto(messages) {
  const ultimoMensajeUsuario = [...messages].reverse().find((m) => m.role === 'user');
  console.log('[contacto] último mensaje del usuario:', ultimoMensajeUsuario ? ultimoMensajeUsuario.content : '(ninguno)');

  if (!ultimoMensajeUsuario || !contieneContacto(ultimoMensajeUsuario.content)) {
    console.log('[contacto] no se detectó email ni teléfono, no se avisa.');
    return;
  }
  console.log('[contacto] contacto detectado, revisando clave de Resend...');

  if (!process.env.RESEND_API_KEY) {
    console.log('[contacto] RESEND_API_KEY no está definida en este entorno. No se puede avisar.');
    return;
  }
  console.log('[contacto] clave encontrada, enviando correo a Resend...');

  const transcripcion = messages
    .map((m) => `${m.role === 'user' ? 'Cliente' : 'Asistente'}: ${m.content}`)
    .join('\n\n');

  const respuestaResend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Web Englobarte <notificaciones@englobarte.es>',
      to: ['englobarte.tgn@gmail.com'],
      subject: 'Nuevo contacto desde el chat de la web',
      text: `Alguien ha dejado sus datos de contacto hablando con el chatbot de la web.\n\nConversación completa:\n\n${transcripcion}`
    })
  });

  const textoRespuestaResend = await respuestaResend.text();
  console.log('[contacto] respuesta de Resend — status:', respuestaResend.status, '— cuerpo:', textoRespuestaResend);
} 