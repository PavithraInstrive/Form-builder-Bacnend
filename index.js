require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const admin = require('firebase-admin');




const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};


// const serviceAccount = require('./form-builder-a6dce-firebase-adminsdk-fbsvc-ff44dd2a6c.json');



const app = express();
app.use(cors());
app.use(bodyParser.json()); 

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});




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

app.post('/api/claude', async (req, res) => {

  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).send({ error: "Missing API key" });
  }

  const payload = {
   "model": "claude-3-haiku-20240307",
    messages: [
      {
        role: "user",
        content: req.body.prompt
      }
    ],
    max_tokens: 4096,
    temperature: 0.3,
    top_p: 0.95,
    stop_sequences: ["\n\nHuman:"]
  };

  try {
    const headers = API_CONFIG.CLAUDE.getHeaders(apiKey);

    const response = await makeApiRequest(API_CONFIG.CLAUDE.baseURL, payload, headers);

    const content = response?.content?.[0]?.text;
    if (!content) {
      throw new Error("No content in Claude response");
    }

    return res.status(200).send({ content });

  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

app.post('/api/notify', async (req, res) => {
  try {
    const { tokens, title, body, formId } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, sent: 0, message: 'No tokens to send to' });
    }

    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        formId: formId || '',
        type: 'new_form'
      }
    };

    let successCount = 0;
    let failureCount = 0;

    for (const token of tokens) {
      try {
        await admin.messaging().send({
          ...message,
          token: token
        });
        successCount++;
      } catch (error) {
        console.error('Failed to send to token:', token, error);
        failureCount++;
      }
    }

    console.log(`Sent ${successCount} notifications, ${failureCount} failed`);

    res.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      message: `Sent ${successCount} notifications successfully`
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notifications' 
    });
  }
});



const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

