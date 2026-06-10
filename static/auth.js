// auth.js - Оптимизированная версия
// Убраны дубликаты функций showAlert и улучшена структура

// Общая функция для отображения уведомлений
window.showAlert = window.showAlert || function(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    let container = document.getElementById('alert-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alert-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    container.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
};

// Общая функция для управления состоянием кнопок
function manageButtonState(button, isLoading, loadingText = '') {
    if (!button) return { originalText: '' };

    const originalText = button.innerHTML;
    if (isLoading) {
        button.innerHTML = loadingText;
        button.disabled = true;
    } else {
        button.innerHTML = originalText;
        button.disabled = false;
    }

    return { originalText };
}

// Общие сообщения об ошибках
const ERROR_MESSAGES = {
    NETWORK: 'Ошибка подключения к серверу. Проверьте интернет-соединение',
    API_UNAVAILABLE: 'Ошибка подключения к серверу. Проверьте, запущен ли бэкенд',
    AUTH_FAILED: 'Неверное имя пользователя или пароль',
    USER_EXISTS: 'Пользователь с таким email или именем уже существует',
    REQUIRED_FIELDS: 'Пожалуйста, заполните все обязательные поля',
    PASSWORDS_MATCH: 'Пароли не совпадают!',
    PASSWORD_LENGTH: 'Пароль должен содержать минимум 6 символов',
    INVALID_EMAIL: 'Пожалуйста, введите корректный email адрес'
};

// Валидация email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Вход в систему
async function login(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;

    if (!username || !password) {
        showAlert(ERROR_MESSAGES.REQUIRED_FIELDS, 'warning');
        return false;
    }

    let submitBtn = null;
    if (event?.target) {
        submitBtn = event.target.querySelector('button[type="submit"]');
    }

    try {
        manageButtonState(submitBtn, true, '<span class="spinner-border spinner-border-sm" role="status"></span> Вход...');
        console.log('🔑 Попытка входа:', username);

        if (!window.api?.login) {
            throw new Error('API не инициализирован');
        }

        const user = await api.login(username, password);
        console.log('✅ Успешный вход:', user);

        updateUIForLoggedInUser(user);

        setTimeout(() => {
            showSection('search-flights');
        }, 500);

        if (event?.target?.reset) {
            event.target.reset();
        }

        return true;

    } catch (error) {
        console.error('❌ Ошибка входа:', error);

        let errorMessage = 'Ошибка входа';
        if (error.message.includes('401')) {
            errorMessage = ERROR_MESSAGES.AUTH_FAILED;
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = ERROR_MESSAGES.API_UNAVAILABLE;
        } else {
            errorMessage = `Ошибка входа: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');
        return false;

    } finally {
        manageButtonState(submitBtn, false);
    }
}

// Регистрация
async function register(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const email = document.getElementById('register-email')?.value;
    const username = document.getElementById('register-username')?.value;
    const password = document.getElementById('register-password')?.value;
    const passwordConfirm = document.getElementById('register-password-confirm')?.value;

    if (!email || !username || !password || !passwordConfirm) {
        showAlert(ERROR_MESSAGES.REQUIRED_FIELDS, 'warning');
        return false;
    }

    if (!validateEmail(email)) {
        showAlert(ERROR_MESSAGES.INVALID_EMAIL, 'warning');
        return false;
    }

    if (password !== passwordConfirm) {
        showAlert(ERROR_MESSAGES.PASSWORDS_MATCH, 'danger');
        return false;
    }

    if (password.length < 6) {
        showAlert(ERROR_MESSAGES.PASSWORD_LENGTH, 'warning');
        return false;
    }

    const userData = {
        email: email,
        username: username,
        password: password,
        first_name: document.getElementById('register-firstname')?.value || '',
        last_name: document.getElementById('register-lastname')?.value || '',
        phone: document.getElementById('register-phone')?.value || ''
    };

    let submitBtn = null;
    if (event?.target) {
        submitBtn = event.target.querySelector('button[type="submit"]');
    }

    try {
        manageButtonState(submitBtn, true, '<span class="spinner-border spinner-border-sm" role="status"></span> Регистрация...');
        console.log('📝 Отправка данных регистрации:', { ...userData, password: '***' });

        const result = await api.register(userData);
        console.log('✅ Регистрация успешна:', result);

        setTimeout(() => {
            showSection('login');
        }, 500);

        if (event?.target?.reset) {
            event.target.reset();
        }

        return true;

    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);

        let errorMessage = 'Ошибка регистрации';
        if (error.message.includes('already registered') || error.message.includes('already taken')) {
            errorMessage = ERROR_MESSAGES.USER_EXISTS;
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = ERROR_MESSAGES.API_UNAVAILABLE;
        } else {
            errorMessage = `Ошибка регистрации: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');
        return false;

    } finally {
        manageButtonState(submitBtn, false);
    }
}

// Выход из системы
function logout() {
    try {
        api.logout();
        updateUIForLoggedOutUser();
        showSection('search-flights');
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Обновление UI для авторизованного пользователя
function updateUIForLoggedInUser(user) {
    console.log('Обновление UI для авторизованного пользователя:', user);

    try {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');

        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (userEmail) userEmail.textContent = user.email || user.username;

        if (user.role === 'admin') {
            const adminNav = document.getElementById('admin-nav');
            if (adminNav) adminNav.style.display = 'block';
        }

        updateProtectedLinks(true);

    } catch (error) {
        console.error('Ошибка обновления UI:', error);
    }
}

// Обновление UI для неавторизованного пользователя
function updateUIForLoggedOutUser() {
    console.log('Обновление UI для неавторизованного пользователя');

    try {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');

        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';

        const adminNav = document.getElementById('admin-nav');
        if (adminNav) adminNav.style.display = 'none';

        updateProtectedLinks(false);

    } catch (error) {
        console.error('Ошибка обновления UI:', error);
    }
}

// Обновление защищенных ссылок
function updateProtectedLinks(isLoggedIn) {
    const protectedLinks = document.querySelectorAll('.nav-link[href="#"]');

    protectedLinks.forEach(link => {
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes('showSection')) {
            const section = onclick.match(/showSection\('([^']+)'\)/)?.[1];
            if (section && ['my-bookings', 'admin-panel'].includes(section)) {
                link.style.pointerEvents = isLoggedIn ? 'auto' : 'none';
                link.style.opacity = isLoggedIn ? '1' : '0.5';
            }
        }
    });
}

// Проверка авторизации при загрузке
async function checkAuthOnLoad() {
    console.log('Проверка авторизации при загрузке страницы');

    try {
        const savedAuth = localStorage.getItem('airline_auth');
        if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            if (authData.username && authData.password) {
                console.log('Попытка автоматического входа для:', authData.username);

                await api.login(authData.username, authData.password)
                    .then(user => {
                        console.log('Автоматический вход успешен:', user.username);
                        updateUIForLoggedInUser(user);
                        if (window.showSection && document.readyState === 'complete') {
                            showSection('search-flights');
                        }
                    })
                    .catch(error => {
                        console.log('Автоматический вход не удался:', error.message);
                        localStorage.removeItem('airline_auth');
                        updateUIForLoggedOutUser();
                    });
                return;
            }
        }
    } catch (error) {
        console.error('Ошибка при восстановлении сессии:', error);
        try {
            localStorage.removeItem('airline_auth');
        } catch {}
    }

    updateUIForLoggedOutUser();
}

// Тестирование API соединения
async function testApiConnection() {
    //https://sketchily-equipped-spidermonkey.cloudpub.ru/health
    //http://localhost:8000/health
    try {
        console.log('Тестирование подключения к API...');
        const response = await fetch('http:127.0.0.1:8000/health', {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ API доступен:', data);
            return true;
        } else {
            console.warn('❌ API недоступен, статус:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка подключения к API:', error);

        createAlertContainer();
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>Сервер API недоступен!</strong><br>
            Проверьте, запущен ли бэкенд на localhost:8000<br>
            <small>Ошибка: ${error.message}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.getElementById('alert-container').appendChild(alertDiv);
        return false;
    }
}

// Создание контейнера для алертов
function createAlertContainer() {
    if (!document.getElementById('alert-container')) {
        const container = document.createElement('div');
        container.id = 'alert-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
}

// Экспортируем функции
window.login = login;
window.register = register;
window.logout = logout;
window.checkAuthOnLoad = checkAuthOnLoad;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.updateUIForLoggedOutUser = updateUIForLoggedOutUser;
window.testApiConnection = testApiConnection;
window.createAlertContainer = createAlertContainer;

// Глобальные обработчики ошибок
window.addEventListener('error', (event) => {
    console.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанное Promise rejection:', event.reason);
});