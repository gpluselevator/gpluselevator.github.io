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

		// We only want to proxy POST requests for AI/YouTube services
		if (request.method !== 'POST') {
			return new Response('Expected POST', { status: 405 });
		}

		try {
			const requestBody = await request.json();
			const service = requestBody.service || 'llm'; // Default to 'llm' for AI models

			// --- YouTube Service ---
			if (service === 'youtube') {
				const playlistId = requestBody.playlistId;
				if (!playlistId) {
					return jsonResponse({ error: 'Playlist ID is required' }, 400);
				}

				const apiKey = env.YOUTUBE_API_KEY;
				if (!apiKey) {
					return jsonResponse({ error: 'YouTube API key is not configured on the worker' }, 500);
				}

				const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
				const apiResponse = await fetch(apiUrl, { method: 'GET' });

				// Forward the YouTube API response back to the client
				return new Response(apiResponse.body, {
					status: apiResponse.status,
					headers: corsHeaders({ 'Content-Type': 'application/json' }),
				});
			}

			// --- LLM Service (AI Models) ---
			if (service === 'llm') {
				const model = requestBody.model || '';
				let apiUrl, apiKey;

				if (model.startsWith('gpt-')) {
					apiUrl = 'https://api.openai.com/v1/chat/completions';
					apiKey = env.OPENAI_API_KEY;
				} else {
					apiUrl = 'https://api.mistral.ai/v1/chat/completions';
					apiKey = env.MISTRAL_API_KEY;
				}

				if (!apiKey) {
					return jsonResponse({ error: `API key for model ${model} is not configured` }, 500);
				}

				const apiResponse = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify({ // Construct a clean body for the AI service
						messages: requestBody.messages,
					}),
				});

				return new Response(apiResponse.body, {
					status: apiResponse.status,
					headers: corsHeaders({ 'Content-Type': 'application/json' }),
				});
			}

			return jsonResponse({ error: `Unknown service: ${service}` }, 400);
		} catch (error) {
			return jsonResponse({ error: `Error processing request: ${error.message}` }, 500);
		}
	},
};

function jsonResponse(data, status) {
	return new Response(JSON.stringify(data), {
		status: status,
		headers: corsHeaders({ 'Content-Type': 'application/json' }),
	});
}

function handleOptions(request) {
	if (
		request.headers.get('Origin') !== null &&
		request.headers.get('Access-Control-Request-Method') !== null &&
		request.headers.get('Access-Control-Request-Headers') !== null
	) {
		// Handle CORS preflight requests.
		return new Response(null, {
			headers: corsHeaders(),
		});
	} else {
		// Handle standard OPTIONS request.
		return new Response(null, {
			headers: {
				Allow: 'GET, HEAD, POST, OPTIONS',
			},
		});
	}
}

function corsHeaders(extraHeaders = {}) {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
		'Access-Control-Max-Age': '86400',
		'Access-Control-Allow-Headers': 'Content-Type',
		...extraHeaders,
	};
}