export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to list models',
        details: data
      });
    }

    // Filter for models that support generateContent
    const supportedModels = data.models
      .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
      .map(model => ({
        name: model.name.replace('models/', ''),
        displayName: model.displayName,
        description: model.description
      }));

    return res.status(200).json({ 
      models: supportedModels,
      total: supportedModels.length
    });

  } catch (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }
}
