// form-handler.js - VERSIÓN COMPLETA Y CORRECTA
const API_URL = 'https://9g5ejyx94m.execute-api.us-east-1.amazonaws.com/production/formulario';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('legalForm');
    if (!form) {
        console.error('Formulario no encontrado');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Mostrar loading
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        
        const messageDiv = document.getElementById('formMessage');
        messageDiv.innerHTML = '';
        messageDiv.className = 'form-message';
        
        try {
            // Obtener datos del formulario
            const formData = {
                nombre: document.getElementById('nombre').value,
                email: document.getElementById('email').value,
                telefono: document.getElementById('telefono').value,
                servicio: document.getElementById('servicio').value,
                descripcion: document.getElementById('descripcion').value
            };
            
            console.log('Enviando datos:', formData);
            console.log('URL de API:', API_URL);
            
            // ✅ CONFIGURACIÓN CORRECTA para evitar CORS
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seg timeout
            
            const response = await fetch(API_URL, {
                method: 'POST',
                mode: 'cors', // ¡IMPORTANTE!
                credentials: 'omit', // No enviar cookies
                headers: {
                    'Content-Type': 'application/json',
                    // NO agregues Origin header manualmente
                },
                body: JSON.stringify(formData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);
            
            // Verificar si la respuesta es válida
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Success response:', result);
            
            if (response.ok) {
                // ✅ ÉXITO
                messageDiv.innerHTML = `
                    <div class="message success">
                        <strong>${result.message}</strong>
                        <p>ID de tu solicitud: ${result.leadId || 'N/A'}</p>
                    </div>
                `;
                messageDiv.className = 'form-message success';
                document.getElementById('legalForm').reset();
                submitBtn.textContent = '✓ Solicitud Enviada';
                submitBtn.style.backgroundColor = '#4CAF50';
                
                // Restaurar después de 5 segundos
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.style.backgroundColor = '';
                    submitBtn.disabled = false;
                }, 5000);
            } else {
                throw new Error(result.error || 'Error desconocido del servidor');
            }
            
        } catch (error) {
            console.error('Error completo:', error);
            
            // Manejo específico de errores
            let errorMessage = 'Error al enviar la solicitud';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Tiempo de espera agotado. Por favor intenta nuevamente.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Error de conexión. Verifica: <br>1. Tu conexión a internet<br>2. Que no haya bloqueadores de CORS<br>3. Intenta recargar la página';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'Error de configuración CORS. Contacta al administrador del sitio.';
            } else {
                errorMessage = error.message;
            }
            
            messageDiv.innerHTML = `
                <div class="message error">
                    <strong>Error:</strong> ${errorMessage}<br>
                    <small>Si el problema persiste, contáctanos por WhatsApp o teléfono.</small>
                </div>
            `;
            messageDiv.className = 'form-message error';
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Debug adicional
            console.log('Debug info:', {
                url: API_URL,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        }
    });
});

// Función adicional para probar CORS
function testCorsConnection() {
    console.log('Probando conexión CORS...');
    
    fetch(API_URL, {
        method: 'OPTIONS',
        mode: 'cors'
    })
    .then(response => {
        console.log('CORS OPTIONS test successful:', {
            status: response.status,
            headers: Object.fromEntries([...response.headers.entries()])
        });
    })
    .catch(error => {
        console.error('CORS OPTIONS test failed:', error);
    });
}

// Ejecutar test cuando se carga la página (opcional)
window.addEventListener('load', testCorsConnection);