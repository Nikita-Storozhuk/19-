// constants.js
// Константы приложения

const APP_CONSTANTS = {
    APP_NAME: 'Авиасистема',
    VERSION: '1.0.0',
    DEBUG_MODE: true,

    // Время в миллисекундах
    TOAST_DURATION: 5000,
    API_TIMEOUT: 30000,
    CACHE_DURATION: 5 * 60 * 1000, // 5 минут

    // Статусы
    FLIGHT_STATUS: {
        SCHEDULED: 'scheduled',
        DELAYED: 'delayed',
        CANCELLED: 'cancelled',
        BOARDING: 'boarding',
        DEPARTED: 'departed',
        COMPLETED: 'completed'
    },

    BOOKING_STATUS: {
        CONFIRMED: 'confirmed',
        CANCELLED: 'cancelled',
        COMPLETED: 'completed'
    },

    SEAT_CLASS: {
        ECONOMY: 'economy',
        BUSINESS: 'business',
        FIRST_CLASS: 'first_class'
    }
};

// Экспортируем для использования
window.APP_CONSTANTS = APP_CONSTANTS;