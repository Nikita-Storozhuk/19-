// welcome.js
class WelcomePage {
    constructor() {
        this.stats = {
            flights: 500,
            users: 10000,
            countries: 50,
            bookings: 25000
        };
        this.init();
    }

    init() {
        this.animateStats();
        this.setupEventListeners();
        this.loadStatsFromAPI();
    }

    animateStats() {
        // Анимация статистики при загрузке
        const statElements = {
            'stats-flights': this.stats.flights,
            'stats-users': this.stats.users,
            'stats-countries': this.stats.countries,
            'stats-bookings': this.stats.bookings
        };

        Object.entries(statElements).forEach(([id, targetValue]) => {
            this.animateNumber(id, targetValue);
        });
    }

    animateNumber(elementId, targetValue, duration = 2000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const startTime = Date.now();

        const formatNumber = (num) => {
            if (num >= 1000) {
                return (num / 1000).toFixed(0) + 'K+';
            }
            return num.toFixed(0) + '+';
        };

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            element.textContent = formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = formatNumber(targetValue);
            }
        };

        animate();
    }

    setupEventListeners() {
        // Добавляем обработчики для быстрого поиска
        const quickDeparture = document.getElementById('quick-departure');
        const quickArrival = document.getElementById('quick-arrival');

        if (quickDeparture && quickArrival) {
            quickDeparture.addEventListener('change', this.updateQuickSearch.bind(this));
            quickArrival.addEventListener('change', this.updateQuickSearch.bind(this));
        }
    }

    updateQuickSearch() {
        const departure = document.getElementById('quick-departure').value;
        const arrival = document.getElementById('quick-arrival').value;

        const searchBtn = document.querySelector('.quick-search-section .btn');
        if (searchBtn) {
            if (departure && arrival) {
                searchBtn.disabled = false;
                searchBtn.innerHTML = '<i class="bi bi-search me-2"></i>Найти рейсы';
            } else {
                searchBtn.disabled = true;
                searchBtn.innerHTML = '<i class="bi bi-search me-2"></i>Выберите города';
            }
        }
    }

    // welcome.js - исправьте функцию loadStatsFromAPI
    async loadStatsFromAPI() {
    try {
        // Загружаем только рейсы (публичный эндпоинт)
        const flightsData = await api.getFlights({ limit: 100 }).catch(() => []);

        // Обновляем статистику на основе реальных данных
        if (flightsData && flightsData.length > 0) {
            this.stats.flights = Math.min(flightsData.length * 10, 999);
            this.animateNumber('stats-flights', this.stats.flights, 1000);
        }

        // Пользователей загружаем только если админ
        if (api.isAdmin()) {
            const usersData = await api.getUsers().catch(() => []);
            if (usersData && usersData.length > 0) {
                this.stats.users = Math.min(usersData.length * 100, 99999);
                this.animateNumber('stats-users', this.stats.users, 1000);
            }
        }

    } catch (error) {
        console.log('Не удалось загрузить статистику из API, используем демо-данные');
    }
}

        quickSearch() {
            const departure = document.getElementById('quick-departure').value;
            const arrival = document.getElementById('quick-arrival').value;

            if (!departure || !arrival) {
                showAlert('Пожалуйста, выберите города вылета и назначения', 'warning');
                return;
            }

            // Извлекаем код аэропорта из строки
            const departureMatch = departure.match(/\(([^)]+)\)/);
            const arrivalMatch = arrival.match(/\(([^)]+)\)/);

            const departureCode = departureMatch ? departureMatch[1] : departure;
            const arrivalCode = arrivalMatch ? arrivalMatch[1] : arrival;

            // Переключаемся на поиск рейсов
            showSection('search-flights');

            // Заполняем поля поиска
            setTimeout(() => {
                const departureInput = document.getElementById('departure-airport');
                const arrivalInput = document.getElementById('arrival-airport');

                if (departureInput) departureInput.value = departureCode;
                if (arrivalInput) arrivalInput.value = arrivalCode;

                // Запускаем поиск
                setTimeout(() => {
                    const searchForm = document.getElementById('flight-search-form');
                    if (searchForm) {
                        const submitEvent = new Event('submit', { cancelable: true });
                        searchForm.dispatchEvent(submitEvent);
                    }
                }, 100);
            }, 300);

            // Показываем уведомление
            showAlert(`Ищем рейсы из ${departure} в ${arrival}`, 'info');
        }

    // Метод для обновления статистики
    updateStats(newStats) {
        if (newStats.flights) {
            this.stats.flights = newStats.flights;
            this.animateNumber('stats-flights', newStats.flights, 1000);
        }
        if (newStats.users) {
            this.stats.users = newStats.users;
            this.animateNumber('stats-users', newStats.users, 1000);
        }
        if (newStats.countries) {
            this.stats.countries = newStats.countries;
            this.animateNumber('stats-countries', newStats.countries, 1000);
        }
        if (newStats.bookings) {
            this.stats.bookings = newStats.bookings;
            this.animateNumber('stats-bookings', newStats.bookings, 1000);
        }
    }
}

// Создаем глобальный экземпляр
window.welcomePage = new WelcomePage();

// Экспортируем функции
window.quickSearch = () => window.welcomePage.quickSearch();
window.updateWelcomeStats = (stats) => window.welcomePage.updateStats(stats);

// Добавляем стили для приветственной страницы
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Стили для приветственной страницы */
        .hero-section {
            background: linear-gradient(135deg, var(--primary-color) 0%, #667eea 100%);
            color: white;
            border-radius: 20px;
            margin-top: 20px;
            padding: 40px 20px;
            box-shadow: 0 10px 30px var(--shadow-color);
        }

        [data-theme="dark"] .hero-section {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }

        .feature-card {
            border-radius: 15px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
            color: var(--text-primary);
        }

        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 30px var(--shadow-color);
        }

        .feature-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: var(--bg-tertiary);
        }

        .cta-section {
            padding: 40px 0;
        }

        .cta-section .btn {
            padding: 15px 30px;
            font-size: 1.1rem;
            border-radius: 10px;
            transition: all 0.3s ease;
        }

        .cta-section .btn:hover {
            transform: scale(1.05);
        }

        .quick-search-section {
            margin: 40px 0;
        }

        .quick-search-section .card {
            border-radius: 15px;
            overflow: hidden;
        }

        .quick-search-section .form-floating {
            margin-bottom: 0;
        }

        .quick-search-section .btn {
            height: 58px; /* Высота как у других полей */
            border-radius: 10px;
        }

        .stats-section {
            padding: 40px 0;
        }

        .stat-item {
            padding: 20px;
            border-radius: 15px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
        }

        .stat-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px var(--shadow-color);
        }

        .stat-number {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-weight: 800;
            margin-bottom: 10px;
        }

        .stat-label {
            font-size: 1rem;
            color: var(--text-secondary);
        }

        /* Адаптивность */
        @media (max-width: 768px) {
            .hero-section {
                padding: 20px 10px;
                border-radius: 10px;
            }

            .feature-card {
                margin-bottom: 20px;
            }

            .cta-section .btn {
                width: 100%;
                margin-bottom: 10px;
            }

            .quick-search-section .row > div {
                margin-bottom: 15px;
            }

            .quick-search-section .btn {
                height: auto;
                padding: 15px;
            }

            .stat-item {
                margin-bottom: 20px;
            }
        }

        /* Анимации */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-section h1 {
            animation: fadeInUp 0.8s ease-out;
        }

        .hero-section p {
            animation: fadeInUp 0.8s ease-out 0.2s both;
        }

        .feature-card {
            animation: fadeInUp 0.8s ease-out;
        }

        .feature-card:nth-child(2) {
            animation-delay: 0.1s;
        }

        .feature-card:nth-child(3) {
            animation-delay: 0.2s;
        }

        .cta-section {
            animation: fadeInUp 0.8s ease-out 0.4s both;
        }

        .quick-search-section {
            animation: fadeInUp 0.8s ease-out 0.6s both;
        }

        .stats-section {
            animation: fadeInUp 0.8s ease-out 0.8s both;
        }
    `;
    document.head.appendChild(style);
});