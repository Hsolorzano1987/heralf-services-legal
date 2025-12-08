// AWS SDK v3 - Más moderno y eficiente
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Headers CORS
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Credentials': 'true'
    };
    
    // Manejar OPTIONS (CORS preflight)
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }
    
    try {
        // Parsear body
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Formato de datos inválido' })
            };
        }
        
        const { nombre, email, telefono, servicio, descripcion } = body;
        
        // Validar campos
        if (!nombre || !email || !telefono || !servicio || !descripcion) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Todos los campos son requeridos' })
            };
        }
        
        // Crear item para DynamoDB
        const item = {
            id: { S: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) },
            nombre: { S: nombre.trim() },
            email: { S: email.trim() },
            telefono: { S: telefono.trim() },
            servicio: { S: servicio },
            descripcion: { S: descripcion.trim() },
            fecha: { S: new Date().toISOString() },
            timestamp: { N: Date.now().toString() },
            status: { S: 'nuevo' }
        };
        
        // Guardar en DynamoDB con SDK v3
        await client.send(new PutItemCommand({
            TableName: process.env.DYNAMODB_TABLE || 'heralf-legal-leads',
            Item: item
        }));
        
        console.log('Lead saved to DynamoDB:', item.id.S);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: 'Solicitud recibida correctamente. Te contactaremos en menos de 24 horas.',
                leadId: item.id.S
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Error interno del servidor' })
        };
    }
};