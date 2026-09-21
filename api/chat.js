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
        system: `Eres el asistente virtual de Englobarte, una empresa de decoración de eventos dirigida por Junior y Alba, con base en Reus (Tarragona), que se desplaza a cualquier punto de España.

Información importante sobre Englobarte:
- Servicios: decoración para cumpleaños, bautizos y comuniones, baby showers y gender reveals, bodas, jubilaciones, y eventos corporativos.
- No trabajan con catálogos cerrados ni precios fijos: cada evento se diseña a medida según lo que pida el cliente, así que nunca des un precio concreto.
- Para presupuestos, pide amablemente que el cliente cuente qué tipo de evento es, la fecha aproximada, el lugar y cuántos invitados, y anímale a dejar su WhatsApp o email para que Junior y Alba le contacten con un presupuesto a medida.
- Contacto: WhatsApp e Instagram @englobarte.tgn.
- Tono: cercano, amable, como hablaría un negocio familiar. Respuestas breves y claras.

Si te preguntan algo que no tiene que ver con Englobarte o los eventos, redirige amablemente la conversación hacia cómo puedes ayudarles con su evento.`,
        messages: messages
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Error de la API de Claude:', datos);
      return res.status(500).json({ error: 'Error al contactar con el asistente' });
    }

    const textoRespuesta = datos.content[0].text;

    return res.status(200).json({ respuesta: textoRespuesta });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Algo ha fallado' });
  }
}