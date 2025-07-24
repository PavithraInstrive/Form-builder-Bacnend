const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {

        const serviceAccount = require('../../form-builder-a6dce-firebase-adminsdk-fbsvc-ff44dd2a6c.json');
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

exports.handler = async (event, context) => {
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