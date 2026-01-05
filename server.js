const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.resolve(__dirname)));

// CORS for local development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// API endpoint to generate chatbot response
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured. Please set GEMINI_API_KEY in .env file' 
      });
    }

    // Prepare request to Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: message.trim()
        }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    };

    // Call Gemini API
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      console.error('Gemini API Error:', errorMessage);
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();

    // Extract the response text from Gemini API response
    let reply = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      if (parts && parts[0] && parts[0].text) {
        reply = parts[0].text;
      }
    }

    if (!reply) {
      console.error('Unexpected API response format:', JSON.stringify(data));
      return res.status(500).json({ error: 'Unexpected response format from API' });
    }

    return res.json({ reply });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Chatbot server running on http://localhost:${port}`);
  console.log(`📝 Serving files from: ${__dirname}`);
  
  if (GEMINI_API_KEY) {
    console.log(`✅ Gemini API configured (Model: ${GEMINI_MODEL})`);
    console.log(`🔑 API Key: ${GEMINI_API_KEY.slice(0, 8)}...${GEMINI_API_KEY.slice(-4)}`);
  } else {
    console.log(`⚠️  Warning: GEMINI_API_KEY not set in .env file`);
    console.log(`   Create a .env file with: GEMINI_API_KEY=your_api_key_here`);
  }
});

