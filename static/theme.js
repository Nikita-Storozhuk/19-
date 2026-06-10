// theme.js (добавляем методы для обновления навигации)
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

class ThemeManager {
    constructor() {
        this.currentTheme = this.getSavedTheme() || THEMES.LIGHT;
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createThemeToggle();
        this.addThemeStyles();
        this.updateNavbar();
    }

    getSavedTheme() {
        return localStorage.getItem('app-theme');
    }

    saveTheme(theme) {
        localStorage.setItem('app-theme', theme);
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        this.saveTheme(theme);

        // Обновляем кнопку переключения темы
        this.updateThemeToggleButton(theme);

        // Обновляем навигацию
        this.updateNavbar();

        // Обновляем текст темы в футере
        this.updateThemeText(theme);

        // Сохраняем в body для легкого доступа в CSS
        document.body.classList.remove(THEMES.LIGHT, THEMES.DARK);
        document.body.classList.add(theme);
    }

    updateThemeText(theme) {
        const themeText = document.getElementById('current-theme');
        if (themeText) {
            themeText.textContent = theme === THEMES.LIGHT ? 'Светлая' : 'Тёмная';
        }
    }

    updateNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // Удаляем все классы темы
        navbar.classList.remove('navbar-light', 'navbar-dark', 'bg-light', 'bg-dark');

        if (this.currentTheme === THEMES.LIGHT) {
            navbar.classList.add('navbar-dark'); // Для светлой темы используем темный текст на светлом фоне
            // Фон задается через CSS переменные
        } else {
            navbar.classList.add('navbar-dark'); // Для темной темы темный текст на темном фоне
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
        this.applyTheme(newTheme);

        // Показываем уведомление
        const themeName = newTheme === THEMES.LIGHT ? 'светлой' : 'темной';
        showAlert(`Переключено на ${themeName} тему`, 'info');
    }

    createThemeToggle() {
        // Проверяем, не существует ли уже кнопка
        if (document.getElementById('theme-toggle')) return;

        // Создаем кнопку переключения темы
        const themeToggle = document.createElement('button');
        themeToggle.id = 'theme-toggle';
        themeToggle.className = 'btn btn-outline-light theme-toggle ms-2';
        themeToggle.innerHTML = '<i class="bi bi-moon"></i>';
        themeToggle.onclick = () => this.toggleTheme();
        themeToggle.title = this.currentTheme === THEMES.LIGHT ? 'Включить темную тему' : 'Включить светлую тему';

        // Добавляем в навигацию
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse) {
            const wrapper = document.createElement('div');
            wrapper.className = 'd-flex align-items-center';
            wrapper.appendChild(themeToggle);

            // Добавляем после auth-buttons или user-info
            const authButtons = document.getElementById('auth-buttons');
            const userInfo = document.getElementById('user-info');

            if (userInfo && userInfo.style.display !== 'none') {
                userInfo.appendChild(wrapper);
            } else if (authButtons) {
                authButtons.appendChild(wrapper);
            } else {
                navbarCollapse.appendChild(wrapper);
            }
        }

        this.updateThemeToggleButton(this.currentTheme);
    }

    updateThemeToggleButton(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === THEMES.LIGHT ? 'bi bi-moon' : 'bi bi-sun';
            }
            themeToggle.title = theme === THEMES.LIGHT ? 'Включить темную тему' : 'Включить светлую тему';

            // Обновляем стиль кнопки в зависимости от темы
            if (theme === THEMES.LIGHT) {
                themeToggle.className = 'btn btn-outline-light theme-toggle ms-2';
            } else {
                themeToggle.className = 'btn btn-outline-light theme-toggle ms-2';
            }
        }
    }

    addThemeStyles() {
        // Проверяем, не добавлены ли стили уже
        if (document.getElementById('theme-styles')) return;

        // Добавляем CSS переменные для темы
        const style = document.createElement('style');
        style.id = 'theme-styles';
        style.textContent = `
            :root {
                /* Светлая тема (по умолчанию) */
                --bg-primary: #ffffff;
                --bg-secondary: #f8f9fa;
                --bg-tertiary: #e9ecef;
                --text-primary: #212529;
                --text-secondary: #6c757d;
                --text-muted: #adb5bd;
                --border-color: #dee2e6;
                --shadow-color: rgba(0, 0, 0, 0.1);
                --card-bg: #ffffff;
                --modal-bg: #ffffff;
                --table-hover: rgba(0, 0, 0, 0.075);
                --input-bg: #ffffff;
                --input-border: #ced4da;
                --primary-color: #0d6efd;
                --success-color: #198754;
                --danger-color: #dc3545;
                --warning-color: #ffc107;
                --info-color: #0dcaf0;
            }

            [data-theme="dark"] {
                /* Темная тема */
                --bg-primary: #121212;
                --bg-secondary: #1e1e1e;
                --bg-tertiary: #2d2d2d;
                --text-primary: #ffffff;
                --text-secondary: #b0b0b0;
                --text-muted: #6c757d;
                --border-color: #444444;
                --shadow-color: rgba(0, 0, 0, 0.3);
                --card-bg: #1e1e1e;
                --modal-bg: #2d2d2d;
                --table-hover: rgba(255, 255, 255, 0.075);
                --input-bg: #2d2d2d;
                --input-border: #555555;
                --primary-color: #0d6efd;
                --success-color: #198754;
                --danger-color: #dc3545;
                --warning-color: #ffc107;
                --info-color: #0dcaf0;
            }

            /* Применяем CSS переменные */
            body {
                background-color: var(--bg-primary);
                color: var(--text-primary);
                transition: background-color 0.3s, color 0.3s;
            }

            .card {
                background-color: var(--card-bg);
                border-color: var(--border-color);
                color: var(--text-primary);
            }

            .card-header {
                background-color: var(--bg-tertiary);
                border-bottom-color: var(--border-color);
            }

            .modal-content {
                background-color: var(--modal-bg);
                color: var(--text-primary);
            }

            .form-control, .form-select {
                background-color: var(--input-bg);
                border-color: var(--input-border);
                color: var(--text-primary);
            }

            .form-control:focus, .form-select:focus {
                background-color: var(--input-bg);
                color: var(--text-primary);
            }

            .table {
                color: var(--text-primary);
            }

            .table-hover tbody tr:hover {
                background-color: var(--table-hover);
            }

            .alert {
                background-color: var(--bg-tertiary);
                border-color: var(--border-color);
                color: var(--text-primary);
            }

            .alert-success {
                background-color: color-mix(in srgb, var(--success-color) 20%, var(--bg-tertiary));
                border-color: var(--success-color);
                color: var(--text-primary);
            }

            .alert-danger {
                background-color: color-mix(in srgb, var(--danger-color) 20%, var(--bg-tertiary));
                border-color: var(--danger-color);
                color: var(--text-primary);
            }

            .alert-warning {
                background-color: color-mix(in srgb, var(--warning-color) 20%, var(--bg-tertiary));
                border-color: var(--warning-color);
                color: var(--text-primary);
            }

            .alert-info {
                background-color: color-mix(in srgb, var(--info-color) 20%, var(--bg-tertiary));
                border-color: var(--info-color);
                color: var(--text-primary);
            }

            .text-muted {
                color: var(--text-muted) !important;
            }

            .flight-card {
                background-color: var(--card-bg);
                border-color: var(--border-color);
            }

            .flight-card:hover {
                box-shadow: 0 5px 15px var(--shadow-color);
            }

            .badge {
                color: white;
            }

            /* Стили для системы уведомлений в темной теме */
            .notification {
                background-color: var(--card-bg);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
            }

            .notification-header {
                border-bottom-color: var(--border-color);
            }

            .notification-time {
                border-top-color: var(--border-color);
                color: var(--text-muted);
            }

            .theme-toggle {
                transition: all 0.3s ease;
            }

            .theme-toggle:hover {
                transform: rotate(15deg);
            }
        `;

        document.head.appendChild(style);
    }

    // Вспомогательные методы для внешнего доступа
    isDarkMode() {
        return this.currentTheme === THEMES.DARK;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Создаем глобальный экземпляр
window.themeManager = new ThemeManager();

// Экспортируем функции
window.toggleTheme = () => themeManager.toggleTheme();
window.THEMES = THEMES;