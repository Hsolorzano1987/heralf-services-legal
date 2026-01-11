// WhatsApp Webhook - HerAlf Legal
// Versión básica para empezar

exports.handler = async (event) => {
    console.log('WhatsApp Webhook recibido:', JSON.stringify(event, null, 2));
    
    try {
        // Procesar webhook de WhatsApp
        const body = JSON.parse(event.body || '{}');
        
        // Verificar si es verificación del webhook
        if (event.queryStringParameters && event.queryStringParameters['hub.mode'] === 'subscribe') {
            const token = event.queryStringParameters['hub.verify_token'];
            const challenge = event.queryStringParameters['hub.challenge'];
            
            // TODO: Validar token contra variable de entorno
            return {
                statusCode: 200,
                body: challenge
            };
        }
        
        // Procesar mensaje entrante
        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        
        if (message) {
            console.log('Mensaje de WhatsApp:', message.from, message.text?.body);
            
            // Respuesta automática básica
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'received',
                    message: 'Mensaje procesado. Implementación en progreso.'
                })
            };
        }
        
        return {
            statusCode: 200,
            body: 'OK'
        };
        
    } catch (error) {
        console.error('Error en webhook WhatsApp:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
