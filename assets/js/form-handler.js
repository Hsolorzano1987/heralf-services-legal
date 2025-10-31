// ✅ CONFIGURACIÓN CORRECTA para API Gateway
const API_URL = '/formulario';

document.getElementById('legalForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Mostrar loading
    const submitBtn = document.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Enviando...';
    submitBtn.disabled = true;
    
    const messageDiv = document.getElementById('formMessage');
    messageDiv.innerHTML = '';
    
    try {
        // Obtener datos del formulario (SOLO los necesarios)
        const formData = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value,
            servicio: document.getElementById('servicio').value,
            descripcion: document.getElementById('descripcion').value
        };
        
        // ✅ ENVIAR a API Gateway (NO directamente a DynamoDB)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // ✅ ÉXITO - Respuesta de API Gateway
            messageDiv.innerHTML = `
                <div class="message success">
                    <strong>${result.message}</strong>
                </div>
            `;
            document.getElementById('legalForm').reset();
            submitBtn.textContent = 'Solicitud Enviada ✓';
        } else {
            // ❌ ERROR - Respuesta de API Gateway
            throw new Error(result.error || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = `
            <div class="message error">
                <strong>Error al enviar:</strong> ${error.message}<br>
                <small>Por favor intenta nuevamente o contáctanos directamente.</small>
            </div>
        `;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// CSS para mensajes
const style = document.createElement('style');
style.textContent = `
    .form-message { margin-top: 20px; }
    .message { padding: 15px; border-radius: 5px; margin: 10px 0; }
    .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
`;
document.head.appendChild(style);