// Configuración para AWS - MODO SEGURO
// En producción, usa AWS Cognito Identity Pool en lugar de credenciales fijas

class HerAlfApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setCurrentYear();
        this.initAWS();
    }

    setupEventListeners() {
        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', this.handleSmoothScroll);
        });

        // Form submission
        const legalForm = document.getElementById('legalForm');
        if (legalForm) {
            legalForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Input validation
        this.setupInputValidation();
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    setupInputValidation() {
        const phoneInput = document.getElementById('telefono');
        if (phoneInput) {
            phoneInput.addEventListener('input', this.formatPhoneNumber);
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', this.validateEmail.bind(this));
        }
    }

    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        
        if (value.length >= 3) {
            value = value.replace(/(\d{3})(\d{0,3})(\d{0,4})/, '($1) $2-$3');
        }
        
        e.target.value = value;
    }

    validateEmail(e) {
        const email = e.target.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            this.showFieldError(e.target, 'Por favor, ingresa un correo electrónico válido');
        } else {
            this.clearFieldError(e.target);
        }
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        field.style.borderColor = 'var(--error-color)';
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = 'var(--error-color)';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '5px';
        errorElement.textContent = message;
        
        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.style.borderColor = '';
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const formData = this.getFormData();
        await this.submitForm(formData);
    }

    validateForm() {
        let isValid = true;
        const form = document.getElementById('legalForm');
        
        // Validar campos requeridos
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'Este campo es obligatorio');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        // Validar email específico
        const emailField = document.getElementById('email');
        if (emailField.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value)) {
                this.showFieldError(emailField, 'Por favor, ingresa un correo electrónico válido');
                isValid = false;
            }
        }

        return isValid;
    }

    getFormData() {
        return {
            id: this.generateId(),
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            servicio: document.getElementById('servicio').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            fecha: new Date().toISOString(),
            timestamp: Date.now(),
            status: 'nuevo'
        };
    }

    async submitForm(formData) {
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        
        try {
            this.setButtonLoading(submitBtn, true);
            
            // Intentar enviar a AWS primero
            if (window.AWS && this.isAWSConfigured()) {
                await this.saveToDynamoDB(formData);
            } else {
                // Fallback: enviar por email o mostrar mensaje de éxito
                await this.fallbackSubmit(formData);
            }
            
            this.showMessage('¡Solicitud enviada con éxito! Te contactaremos en menos de 24 horas.', 'success');
            document.getElementById('legalForm').reset();
            
        } catch (error) {
            console.error('Error al enviar el formulario:', error);
            this.showMessage('Hubo un error al enviar tu solicitud. Por favor, intenta nuevamente o contáctanos directamente.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false, originalText);
        }
    }

    setButtonLoading(button, isLoading, originalText = 'Enviar Solicitud') {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('btn-loading');
            button.textContent = 'Enviando...';
        } else {
            button.disabled = false;
            button.classList.remove('btn-loading');
            button.textContent = originalText;
        }
    }

    isAWSConfigured() {
        // Verificar si AWS está configurado
        return window.AWS && AWS.config.credentials;
    }

    async saveToDynamoDB(data) {
        return new Promise((resolve, reject) => {
            // Para producción, reemplaza con tu configuración real
            const dynamodb = new AWS.DynamoDB.DocumentClient();
            const params = {
                TableName: 'heralf-leads',
                Item: data
            };
            
            dynamodb.put(params, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async fallbackSubmit(data) {
        // Simular envío (en producción, podrías usar EmailJS, Formspree, etc.)
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Datos del formulario (simulación):', data);
                resolve();
            }, 1000);
        });
    }

    showMessage(message, type) {
        const formMessage = document.getElementById('formMessage');
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        
        // Scroll to message
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Ocultar mensaje después de 5 segundos
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }

    generateId() {
        return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setCurrentYear() {
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    initAWS() {
        // Para desarrollo, puedes configurar AWS aquí
        // EN PRODUCCIÓN: Usa AWS Cognito Identity Pool para mayor seguridad
        /*
        AWS.config.update({
            region: 'us-east-1',
            credentials: new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'tu-identity-pool-id'
            })
        });
        */
        
        console.log('HerAlf App inicializada');
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new HerAlfApp();
});

// Configuración para AWS Lambda (alternativa)
class LambdaService {
    constructor() {
        this.lambdaEndpoint = 'https://tu-api-gateway.execute-api.region.amazonaws.com/prod/submit-form';
    }

    async submitForm(data) {
        try {
            const response = await fetch(this.lambdaEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            return await response.json();
        } catch (error) {
            console.error('Error al enviar a Lambda:', error);
            throw error;
        }
    }
}

// Exportar para uso global si es necesario
window.HerAlfApp = HerAlfApp;