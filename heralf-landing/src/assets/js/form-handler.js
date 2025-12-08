// ✅ CONFIGURACIÓN CORRECTA para API Gateway
// REEMPLAZA con tu URL real del output
const API_URL = 'https://9g5ejyx94m.execute-api.us-east-1.amazonaws.com/production/formulario';

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
        // Obtener datos del formulario
        const formData = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value,
            servicio: document.getElementById('servicio').value,
            descripcion: document.getElementById('descripcion').value
        };
        
        // ✅ ENVIAR a API Gateway
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // ✅ ÉXITO
            messageDiv.innerHTML = `
                <div class="message success">
                    <strong>${result.message}</strong>
                </div>
            `;
            document.getElementById('legalForm').reset();
            submitBtn.textContent = 'Solicitud Enviada ✓';
        } else {
            // ❌ ERROR
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