const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            })
        });
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

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
        const { tokens, title, body, formId } = JSON.parse(event.body);

        if (!tokens || tokens.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    success: true, 
                    sent: 0, 
                    message: 'No tokens to send to' 
                }),
            };
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

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: true,
                sent: successCount,
                failed: failureCount,
                message: `Sent ${successCount} notifications successfully`
            }),
        };

    } catch (error) {
        console.error('Error sending notifications:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
                success: false, 
                message: 'Failed to send notifications' 
            }),
        };
    }
};