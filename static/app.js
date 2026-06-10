// app.js - Оптимизированная версия

// Основные константы
const SECTIONS_CONFIG = {
    DEFAULT: 'welcome',
    PROTECTED: ['my-bookings', 'admin-panel']
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Загрузка приложения Авиасистема...');

    try {
        await new Promise(resolve => setTimeout(resolve, 100));

        setTimeout(() => checkAuthOnLoad(), 500);

        const isApiAvailable = await testApiConnection();
        handleApiStatus(isApiAvailable);

        if (window.themeManager) {
            window.themeManager.updateNavbar();
        }

        showSection(SECTIONS_CONFIG.DEFAULT);
        initBootstrapComponents();
        updateConnectionStatus();

        console.log('✅ Приложение успешно загружено!');
    } catch (error) {
        console.error('❌ Ошибка при инициализации приложения:', error);
        showAlert(`Ошибка инициализации: ${error.message}`, 'danger');
    }
});

// Обработка статуса API
function handleApiStatus(isAvailable) {
    if (!isAvailable) {
        console.error('API недоступен');
        createAlertContainer();
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>Внимание!</strong> Сервер API недоступен.
            Убедитесь, что бэкенд запущен на http://localhost:8000
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.getElementById('alert-container').appendChild(alertDiv);
    } else {
        showNotification('success', 'API подключен', 'Соединение с сервером установлено');
    }
}

// Переключение секций
window.showSection = function(sectionId) {
    console.log(`Переключение на секцию: ${sectionId}`);

    hideAllSections();
    showTargetSection(sectionId);

    updateActiveNavLink(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Скрыть все секции
function hideAllSections() {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
}

// Показать целевую секцию
function showTargetSection(sectionId) {
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (!targetSection) {
        console.warn(`Секция ${sectionId} не найдена`);
        showSection(SECTIONS_CONFIG.DEFAULT);
        return;
    }

    targetSection.style.display = 'block';
    handleSpecialSections(sectionId);
}

// Обработка специальных секций
// Обработка специальных секций
function handleSpecialSections(sectionId) {
    console.log(`🔧 Обработка секции: ${sectionId}`);

    if (sectionId === 'my-bookings') {
        if (window.api && window.api.isAuthenticated()) {
            // Проверяем, что функция существует
            if (typeof loadUserBookings === 'function') {
                loadUserBookings();
            } else {
                console.warn('Функция loadUserBookings не найдена');
                showAlert('Функция загрузки бронирований недоступна', 'warning');
            }
        } else {
            showAlert('Для просмотра бронирований необходимо войти в систему', 'warning');
            showSection('login');
        }
    } else if (sectionId === 'admin-panel') {
        if (!window.api || !window.api.isAdmin()) {
            showAlert('Доступ запрещен. Требуются права администратора', 'danger');
            showSection('search-flights');
        } else {
            // Проверяем, что функция существует
            if (typeof showAdminSection === 'function') {
                showAdminSection('manage-flights');
            } else {
                console.warn('Функция showAdminSection не найдена');
                showAlert('Админ-панель недоступна', 'warning');
            }
        }
    } else if (sectionId === 'search-flights') {
        // Автоматически загружаем рейсы если пользователь авторизован
        if (window.api && window.api.isAuthenticated() && typeof loadAllFlights === 'function') {
            setTimeout(() => loadAllFlights(), 100);
        }
    }
}

// Обновление активной ссылки в навигации
function updateActiveNavLink(activeSection) {
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        const onclick = link.getAttribute('onclick');
        if (onclick?.includes(`showSection('${activeSection}')`)) {
            link.classList.add('active');
        }
    });
}

// Обновление статуса соединения
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;

    const isOnline = window.isOnline ? window.isOnline() : navigator.onLine;

    if (isOnline) {
        statusElement.innerHTML = '<i class="bi bi-wifi"></i> Онлайн';
        statusElement.className = 'text-success';
    } else {
        statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Офлайн';
        statusElement.className = 'text-warning';
    }
}

// Инициализация Bootstrap компонентов
function initBootstrapComponents() {
    try {
        // Tooltips
        const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));

        // Dropdowns
        const dropdownTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
        dropdownTriggerList.forEach(el => new bootstrap.Dropdown(el));

        console.log('✅ Bootstrap компоненты инициализированы');
    } catch (error) {
        console.error('Ошибка при инициализации Bootstrap компонентов:', error);
    }
}

// Форматирование дат
window.formatDate = function(dateString) {
    if (!dateString) return 'Не указана';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
};

window.formatTime = function(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
};

// Добавьте в app.js
window.searchBookings = async function() {
    try {
        if (!api.isAuthenticated()) {
            showAlert('Требуется авторизация', 'warning');
            return;
        }

        const bookingRef = document.getElementById('booking-search-ref')?.value;
        const flightNumber = document.getElementById('booking-search-flight')?.value;
        const status = document.getElementById('booking-search-status')?.value;
        const startDate = document.getElementById('booking-search-start')?.value;
        const endDate = document.getElementById('booking-search-end')?.value;

        const params = {};
        if (bookingRef) params.booking_reference = bookingRef;
        if (flightNumber) params.flight_number = flightNumber;
        if (status) params.status = status;
        if (startDate) params.start_date = new Date(startDate).toISOString();
        if (endDate) params.end_date = new Date(endDate).toISOString();

        const bookings = await api.searchBookings(params);

        // Отображаем результаты поиска
        if (typeof displaySearchBookingsResults === 'function') {
            displaySearchBookingsResults(bookings);
        } else {
            console.log('Найденные бронирования:', bookings);
        }

    } catch (error) {
        console.error('Ошибка поиска бронирований:', error);
        showAlert(`Ошибка поиска: ${error.message}`, 'danger');
    }
};

// Экспорт функций
window.showSection = showSection;
window.createAlertContainer = createAlertContainer;
// Конец файла