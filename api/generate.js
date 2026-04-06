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
    
    if (geminiKey) {
      // Use Gemini - try multiple model variations
      console.log('Using Gemini API');
      
      // Try different model name formats
      const modelsToTry = [
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-pro',
        'gemini-1.0-pro'
      ];
      
      let lastError = null;
      
      for (const model of modelsToTry) {
        try {
          console.log('Trying model:', model);
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`,
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
                }
              })
            }
          );

          const data = await response.json();

          if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
            console.log('Success with model:', model);
            const text = data.candidates[0].content.parts
              .map(part => part.text)
              .join('');
            
            return res.status(200).json({ text });
          }
          
          lastError = data.error?.message || 'Model not available';
          console.log('Model', model, 'failed:', lastError);
          
        } catch (error) {
          console.log('Model', model, 'error:', error.message);
          lastError = error.message;
          continue;
        }
      }
      
      // If we get here, all models failed
      return res.status(500).json({ 
        error: `All Gemini models failed. Last error: ${lastError}. Please check your API key at https://aistudio.google.com/app/apikey`
      });
      
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
