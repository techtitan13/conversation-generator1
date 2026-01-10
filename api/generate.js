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
    
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API key not configured. Please add HUGGINGFACE_API_KEY to Vercel environment variables.' 
      });
    }

    // Using the new HuggingFace Inference API endpoint
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true
          },
          options: {
            wait_for_model: true
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('HuggingFace API error:', data);
      
      // Model might be loading
      if (data.error && data.error.includes('loading')) {
        return res.status(503).json({ 
          error: 'AI model is starting up... Please wait 20-30 seconds and try again.',
          isLoading: true
        });
      }
      
      return res.status(response.status).json({ 
        error: data.error || 'API request failed'
      });
    }

    // HuggingFace returns an array with generated text
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      return res.status(200).json({ text: data[0].generated_text });
    } else if (typeof data === 'string') {
      return res.status(200).json({ text: data });
    } else {
      console.error('Unexpected response format:', data);
      throw new Error('Unexpected response format from API');
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Generation failed'
    });
  }
}
