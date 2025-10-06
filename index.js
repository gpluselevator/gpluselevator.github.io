/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    // Allow OPTIONS requests (for CORS preflight)
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Expected POST', { status: 405 });
    }

    try {
      const requestBody = await request.json();
      const model = requestBody.model || '';

      let apiUrl, apiKey, apiRequestBody;

      if (model.startsWith('gpt-')) {
        // Handle OpenAI request
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        apiKey = env.OPENAI_API_KEY;
        apiRequestBody = JSON.stringify(requestBody);
      } else {
        // Default to Mistral
        apiUrl = 'https://api.mistral.ai/v1/chat/completions';
        apiKey = env.MISTRAL_API_KEY;
        apiRequestBody = JSON.stringify(requestBody);
      }

      if (!apiKey) {
        return new Response('API key is missing', { status: 500 });
      }

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: apiRequestBody,
      });

      // Forward the API response back to the client
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Adjust if you want to restrict to your domain
        },
      });
    } catch (error) {
      return new Response(`Error processing request: ${error.message}`, { status: 500 });
    }
  },
};

function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*', // Or your specific domain
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}