export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { image, mediaType, apiKey } = req.body;
  if (!image)   return res.status(400).json({ error: 'Imagen requerida' });
  if (!apiKey)  return res.status(400).json({ error: 'API Key requerida' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: `Eres un asistente de control de acceso. Analiza esta imagen de una INE (Credencial para Votar) mexicana y extrae la información. Responde SOLO con un objeto JSON válido, sin backticks ni texto adicional:
{"nombre":"nombre completo como aparece","curp":"CURP si es visible","esINE":true,"observaciones":"nota breve si algo no es claro"}
Si la imagen no es una INE: {"esINE":false,"nombre":"","curp":"","observaciones":"No se detectó una INE válida"}` }
          ]
        }]
      })
    });

    if (response.status === 401) {
      return res.status(401).json({ error: 'API Key inválida' });
    }

    const data = await response.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { esINE: false, observaciones: 'No se pudo interpretar la respuesta' };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Error al contactar la API', detail: err.message });
  }
}
