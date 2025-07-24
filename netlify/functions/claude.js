const axios = require('axios');

const API_CONFIG = {
    CLAUDE: {
        baseURL: "https://api.anthropic.com/v1/messages",
        getHeaders: (apiKey) => ({
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }),
    }
};

const makeApiRequest = async (url, payload, headers) => {
    try {
        const response = await axios.post(url, payload, { headers });
        return response.data;
    } catch (error) {
        const errorMessage =
            error.response?.data?.error?.message || error.message;
        throw new Error(`API Request Error: ${errorMessage}`);
    }
};

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Max-Age': '86400',
            },
            body: '',
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.CLAUDE_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: "Missing API key" }),
            };
        }

        const payload = {
            "model": "claude-3-haiku-20240307",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 4096,
            temperature: 0.3,
            top_p: 0.95,
            stop_sequences: ["\n\nHuman:"]
        };

        const headers = API_CONFIG.CLAUDE.getHeaders(apiKey);
        const response = await makeApiRequest(API_CONFIG.CLAUDE.baseURL, payload, headers);

        const content = response?.content?.[0]?.text;
        if (!content) {
            throw new Error("No content in Claude response");
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};