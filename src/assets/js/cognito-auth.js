// Configuración de Cognito
const AWS_CONFIG = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_iAuzWMEZj',
    userPoolWebClientId: '4d3433b9k4ls8g86pakqurbjgu'
};

// Inicializar AWS Cognito
AWS.config.update({
    region: AWS_CONFIG.region
});

const poolData = {
    UserPoolId: AWS_CONFIG.userPoolId,
    ClientId: AWS_CONFIG.userPoolWebClientId
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuthState();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login Form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register Form
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Modal handlers
        document.getElementById('login-btn')?.addEventListener('click', () => {
            this.showLoginModal();
        });

        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.hideLoginModal();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    async checkAuthState() {
        const cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser) {
            cognitoUser.getSession((err, session) => {
                if (err) {
                    console.error('Error getting session:', err);
                    this.showLoginButton();
                    return;
                }
                
                if (session.isValid()) {
                    this.currentUser = cognitoUser;
                    this.showUserMenu(cognitoUser);
                    this.showClientArea();
                } else {
                    this.showLoginButton();
                }
            });
        } else {
            this.showLoginButton();
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const authenticationData = {
            Username: email,
            Password: password,
        };

        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        const userData = {
            Username: email,
            Pool: userPool,
        };

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        try {
            const result = await new Promise((resolve, reject) => {
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: (result) => resolve(result),
                    onFailure: (err) => reject(err),
                    newPasswordRequired: (userAttributes, requiredAttributes) => {
                        // Handle new password requirement if needed
                        resolve(null);
                    }
                });
            });

            this.currentUser = cognitoUser;
            this.hideLoginModal();
            this.showUserMenu(cognitoUser);
            this.showClientArea();
            this.showMessage('¡Bienvenido! Has iniciado sesión correctamente.', 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Error al iniciar sesión: ' + error.message, 'error');
        }
    }

    async handleRegister() {
        const nombre = document.getElementById('register-nombre').value;
        const email = document.getElementById('register-email').value;
        const telefono = document.getElementById('register-telefono').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden', 'error');
            return;
        }

        const attributeList = [
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: 'email',
                Value: email
            }),
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: 'name',
                Value: nombre
            })
        ];

        if (telefono) {
            attributeList.push(
                new AmazonCognitoIdentity.CognitoUserAttribute({
                    Name: 'phone_number',
                    Value: telefono
                })
            );
        }

        try {
            const result = await new Promise((resolve, reject) => {
                userPool.signUp(email, password, attributeList, null, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            this.showMessage('¡Cuenta creada! Por favor verifica tu email.', 'success');
            this.switchTab('login');
            document.getElementById('register-form').reset();

        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Error al crear la cuenta: ' + error.message, 'error');
        }
    }

    handleLogout() {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        this.currentUser = null;
        this.showLoginButton();
        this.hideClientArea();
        this.showMessage('Has cerrado sesión correctamente', 'success');
    }

    showLoginButton() {
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('user-menu').style.display = 'none';
    }

    showUserMenu(cognitoUser) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-menu').style.display = 'block';
        
        // Obtener atributos del usuario
        cognitoUser.getUserAttributes((err, attributes) => {
            if (!err && attributes) {
                const nameAttr = attributes.find(attr => attr.getName() === 'name');
                if (nameAttr) {
                    document.getElementById('user-name').textContent = nameAttr.getValue();
                }
            }
        });
    }

    showLoginModal() {
        document.getElementById('login-modal').style.display = 'flex';
    }

    hideLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-form').reset();
    }

    switchTab(tabName) {
        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    showClientArea() {
        document.getElementById('area-cliente').style.display = 'block';
        // Scroll to client area
        document.getElementById('area-cliente').scrollIntoView({ behavior: 'smooth' });
    }

    hideClientArea() {
        document.getElementById('area-cliente').style.display = 'none';
    }

    showMessage(message, type) {
        // Implementar sistema de mensajes
        console.log(`${type}: ${message}`);
        alert(message); // Temporal - mejorar con toast notifications
    }

    // Métodos para el área de cliente
    verDocumentos() {
        this.showMessage('Redirigiendo a mis documentos...', 'info');
        // Implementar lógica de documentos
    }

    verServicios() {
        this.showMessage('Redirigiendo a mis servicios...', 'info');
        // Implementar lógica de servicios
    }

    verPagos() {
        this.showMessage('Redirigiendo a pagos...', 'info');
        // Implementar lógica de pagos
    }

    nuevaSolicitud() {
        document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});