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
    
    // Try Gemini first, fallback to Groq if Gemini key not available
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    // ... inside your handler ...

if (geminiKey) {
  console.log('Using Gemini API');
  
  // FIX 1: Clean the model name. 
  // If process.env.GEMINI_MODEL is "models/gemini-1.5-flash", we strip the prefix.
  // The URL structure requires: models/{modelName}:generateContent
  let modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  if (modelName.includes('/')) {
    modelName = modelName.split('/').pop();
  }
  
  // FIX 2: Use v1 instead of v1beta for better stability with 1.5 Flash
  const apiVersion = 'v1'; 
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        // Note: BLOCK_NONE is sometimes restricted for certain regions/accounts.
        // If you still get errors, try changing these to 'BLOCK_ONLY_HIGH'
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      })
    }
  );

// ... rest of your error handling ...

      const data = await response.json();

      if (!response.ok) {
        console.error('Gemini API error:', data);
        return res.status(response.status).json({ 
          error: data.error?.message || 'API request failed',
          details: data
        });
      }

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts
          .map(part => part.text)
          .join('');
        
        return res.status(200).json({ text });
      } else {
        throw new Error('Unexpected response format from Gemini');
      }
      
    } else if (groqKey) {
      // Fallback to Groq
      console.log('Using Groq API (Gemini key not found)');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Groq API error:', data);
        return res.status(response.status).json({ 
          error: data.error?.message || 'API request failed'
        });
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return res.status(200).json({ text: data.choices[0].message.content });
      } else {
        throw new Error('Unexpected response format from Groq');
      }
      
    } else {
      return res.status(500).json({ 
        error: 'No API key configured. Please add GEMINI_API_KEY or GROQ_API_KEY to Vercel environment variables.' 
      });
    }
    
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Generation failed'
    });
  }
}
