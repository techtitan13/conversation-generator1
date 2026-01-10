export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.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,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.content && data.content[0]) {
      return res.status(200).json({ text: data.content[0].text });
    } else {
      throw new Error('No response from API');
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
