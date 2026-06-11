// api.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Конфигурация API
const API_CONFIG = {
    //BASE_URL: 'http://localhost:8000',
    BASE_URL: 'https://one9-vlbb.onrender.com',
    AUTH_TYPE: 'basic'
};

// Глобальные переменные для хранения учетных данных
let currentAuth = {
    username: null,
    password: null,
    isLoggedIn: false,
    user: null
};

// Вспомогательные функции для работы с API
class ApiClient {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
    }

    // Получить заголовки для запроса
    getHeaders(contentType = 'application/json') {
        const headers = {
            'Accept': 'application/json'
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        // Добавляем Basic Auth если пользователь авторизован
        if (currentAuth.username && currentAuth.password) {
            const authString = btoa(`${currentAuth.username}:${currentAuth.password}`);
            headers['Authorization'] = `Basic ${authString}`;
        }

        return headers;
    }

    // ========== ПОИСК И ФИЛЬТРАЦИЯ ==========

    // Расширенный поиск рейсов
    async searchFlights(params = {}) {
        return await this.get('/flights/search/', params);
    }

    // Поиск аэропортов
    async searchAirports(params = {}) {
        return await this.get('/airports/search/', params);
    }

    // Поиск бронирований пользователя
    async searchBookings(params = {}) {
        return await this.get('/bookings/search/', params);
    }

    // Получить подсказки для поиска рейсов
    async getFlightSuggestions(query, limit = 10) {
        return await this.get('/flights/suggestions/', {
            query: query,
            limit: limit
        });
    }

    // Получить самые дешевые рейсы
    async getCheapestFlights(params = {}) {
        return await this.get('/flights/cheapest/', params);
    }

    // Получить ближайшие рейсы
    async getUpcomingFlights(hoursAhead = 24, skip = 0, limit = 100) {
        return await this.get('/flights/upcoming/', {
            hours_ahead: hoursAhead,
            skip: skip,
            limit: limit
        });
    }

    // Получить информацию об аэропорте по коду
    async getAirportByCode(code) {
        return await this.get(`/airports/code/${code}`);
    }

    // ========== АДМИН: УПРАВЛЕНИЕ РЕЙСАМИ ==========
    async updateFlight(flightId, flightData) {
        console.log(`PUT /admin/flights/${flightId}`, flightData);
        return await this.put(`/admin/flights/${flightId}`, flightData);
    }

    async deleteFlight(flightId) {
        console.log(`DELETE /admin/flights/${flightId}`);
        return await this.delete(`/admin/flights/${flightId}`);
    }

    // ========== АДМИН: УПРАВЛЕНИЕ АЭРОПОРТАМИ ==========
    async updateAirport(airportId, airportData) {
        console.log(`PUT /admin/airports/${airportId}`, airportData);
        return await this.put(`/admin/airports/${airportId}`, airportData);
    }

    async deleteAirport(airportId) {
        console.log(`DELETE /admin/airports/${airportId}`);
        return await this.delete(`/admin/airports/${airportId}`);
    }

    // ========== АДМИН: УПРАВЛЕНИЕ САМОЛЕТАМИ ==========
    async getAircrafts() {
        return await this.get('/admin/aircrafts/');
    }

    async getAircraft(aircraftId) {
        return await this.get(`/admin/aircrafts/${aircraftId}`);
    }

    async createAircraft(aircraftData) {
        console.log('POST /admin/aircrafts/', aircraftData);
        return await this.post('/admin/aircrafts/', aircraftData);
    }

    async updateAircraft(aircraftId, aircraftData) {
        console.log(`PUT /admin/aircrafts/${aircraftId}`, aircraftData);
        return await this.put(`/admin/aircrafts/${aircraftId}`, aircraftData);
    }

    async deleteAircraft(aircraftId) {
        console.log(`DELETE /admin/aircrafts/${aircraftId}`);
        return await this.delete(`/admin/aircrafts/${aircraftId}`);
    }

    // ========== ФУНКЦИИ АПГРЕЙДА ==========
    async upgradeBooking(bookingId, upgradeData) {
        console.log(`POST /bookings/${bookingId}/upgrade`, upgradeData);
        return await this.post(`/bookings/${bookingId}/upgrade`, upgradeData);
    }

    async getUpgradeOptions(bookingId) {
        return await this.get(`/bookings/${bookingId}/upgrade-options`);
    }

    // Обработка ответа
    async handleResponse(response) {
        console.log(`API Response: ${response.status} ${response.statusText}`);

        // Если ответ успешный (200-299)
        if (response.ok) {
            try {
                // Если ответ пустой (например, 204 No Content)
                if (response.status === 204 || response.headers.get('content-length') === '0') {
                    return null;
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }
            } catch (error) {
                console.warn('Ошибка при разборе JSON ответа:', error);
                return null;
            }
        } else {
            // Обработка ошибок
            let errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                try {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                } catch (e2) {
                    // Не удалось прочитать текст ошибки
                }
            }

            console.error('API Error:', errorMessage);
            throw new Error(errorMessage);
        }
    }

    // Базовый метод для GET запросов
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // Добавляем параметры запроса
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        console.log(`GET ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(),
            mode: 'cors',
            credentials: 'omit'
        });

        return this.handleResponse(response);
    }

    // Базовый метод для POST запросов
    async post(endpoint, data) {
        console.log(`POST ${this.baseUrl}${endpoint}`, data);
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
            mode: 'cors',
            credentials: 'omit'
        });

        return this.handleResponse(response);
    }

    // Базовый метод для PUT запросов
    async put(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
            mode: 'cors',
            credentials: 'omit'
        });

        return this.handleResponse(response);
    }

    // Базовый метод для DELETE запросов
    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
            mode: 'cors',
            credentials: 'omit'
        });

        return this.handleResponse(response);
    }

    // Специфичные методы API

    // Аутентификация
    async login(username, password) {
        try {
            // Сохраняем учетные данные
            console.log(username);
            console.log(password);

            currentAuth.username = username;
            currentAuth.password = password;

            console.log(`Попытка входа пользователя: ${username}`);

            // Проверяем учетные данные, запрашивая профиль пользователя
            const user = await this.get('/users/me/');
            currentAuth.user = user;
            currentAuth.isLoggedIn = true;

            console.log(`Успешный вход: ${user.username}`);

            // Сохраняем в localStorage для автоматического входа
            try {
                localStorage.setItem('airline_auth', JSON.stringify({
                    username: username,
                    password: password
                }));
            } catch (e) {
                console.warn('Не удалось сохранить в localStorage:', e);
            }

            return user;
        } catch (error) {
            // Сбрасываем учетные данные при ошибке
            this.logout();
            throw error;
        }
    }

    // Регистрация
    async register(userData) {
        console.log('Регистрация нового пользователя:', userData.email);

        // Правильный запрос для регистрации
        const response = await fetch(`${this.baseUrl}/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData),
            mode: 'cors'
        });

        return this.handleResponse(response);
    }

    // Добавьте также метод для получения конкретного бронирования
    async getBooking(bookingId) {
        const id = parseInt(bookingId);
        return await this.get(`/bookings/${id}`);
    }

    // Получение цен на багаж
    async getLuggagePricing() {
        return await this.get('/luggage/pricing');
    }

    // Создание бронирования с багажом
    async createBookingWithLuggage(bookingData) {
        return await this.post('/bookings/with-luggage/', bookingData);
    }

    // Получение информации о багаже для бронирования
    async getBookingLuggage(bookingId) {
        return await this.get(`/bookings/${bookingId}/luggage`);
    }

    // Добавление багажа к существующему бронированию
    async addLuggageToBooking(bookingId, luggageData) {
        return await this.post(`/bookings/${bookingId}/luggage`, luggageData);
    }

    // Получение рейсов
    async getFlights(params = {}) {
        return await this.get('/flights/', params);
    }

    // Получение конкретного рейса
    async getFlight(id) {
        return await this.get(`/flights/${id}`);
    }

    // Создание бронирования
    async createBooking(bookingData) {
        return await this.post('/bookings/', bookingData);
    }

    // Получение бронирований пользователя
    async getUserBookings() {
        return await this.get('/bookings/');
    }

    // Отмена бронирования
    async cancelBooking(bookingId) {
        return await this.post(`/bookings/${bookingId}/cancel`, {});
    }

    // Создание платежа
    async createPayment(paymentData) {
        console.log('📤 Отправляем запрос на создание платежа:', paymentData);

        const response = await this.post('/payments/', paymentData);

        console.log('📥 Ответ от сервера:', response);

        // Проверяем структуру ответа
        if (!response) {
            console.warn('⚠️ API вернул пустой ответ');
        } else if (!response.id && !response.transaction_id) {
            console.warn('⚠️ Странный ответ от API:', response);
        }

        return response;
    }

    // Админ: создание рейса
    async createFlight(flightData) {
        return await this.post('/admin/flights/', flightData);
    }

    // Админ: получение всех пользователей
    async getUsers() {
        return await this.get('/admin/users/');
    }

    // Админ: получение аэропортов
    async getAirports() {
        return await this.get('/airports/');
    }

    // Админ: создание аэропорта
    async createAirport(airportData) {
        return await this.post('/airports/', airportData);
    }

    getPaymentHistory() {
        return this.get('/payments/history');
    }

    // Выход
    logout() {
        console.log('Выход из системы');
        currentAuth.username = null;
        currentAuth.password = null;
        currentAuth.user = null;
        currentAuth.isLoggedIn = false;
        try {
            localStorage.removeItem('airline_auth');
        } catch (e) {
            console.warn('Не удалось очистить localStorage:', e);
        }
    }

    // Проверка, является ли пользователь администратором
    isAdmin() {
        return currentAuth.user && currentAuth.user.role === 'admin';
    }

    // Получение текущего пользователя
    getCurrentUser() {
        return currentAuth.user;
    }

    // Проверка авторизации
    isAuthenticated() {
        return currentAuth.isLoggedIn;
    }
}

// Создаем экземпляр API клиента
const api = new ApiClient();

// Экспортируем для использования в других файлах
window.api = api;
// Конец файла