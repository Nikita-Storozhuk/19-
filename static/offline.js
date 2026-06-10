// offline.js
// Офлайн-менеджер

class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.queue = [];
        this.cache = {};
        this.init();
    }

    init() {
        // Настройка обработчиков событий сети
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Глобальные функции
        window.isOnline = () => this.isOnline;
        window.cacheData = (key, data) => this.cacheData(key, data);
        window.getCachedData = (key) => this.getCachedData(key);

        // Проверка начального состояния
        this.updateOnlineStatus();
    }

    updateOnlineStatus() {
        this.isOnline = navigator.onLine;
        const indicator = document.getElementById('connection-status');

        if (indicator) {
            if (this.isOnline) {
                indicator.innerHTML = '<i class="bi bi-wifi"></i> Онлайн';
                indicator.className = 'text-success';
            } else {
                indicator.innerHTML = '<i class="bi bi-wifi-off"></i> Офлайн';
                indicator.className = 'text-warning';
            }
        }

        // Показываем/скрываем индикатор офлайн-режима
        this.showOfflineIndicator(!this.isOnline);
    }

    showOfflineIndicator(show) {
        // Удаляем старый индикатор
        const oldIndicator = document.getElementById('offline-indicator');
        if (oldIndicator) oldIndicator.remove();

        if (show) {
            const indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.className = 'offline-indicator';
            indicator.innerHTML = `
                <div class="container">
                    <i class="bi bi-wifi-off me-2"></i>
                    <span>Работа в офлайн-режиме. Некоторые функции недоступны.</span>
                </div>
            `;
            document.body.insertBefore(indicator, document.body.firstChild);
        }
    }

    handleOnline() {
        this.isOnline = true;
        this.updateOnlineStatus();

        // Показываем уведомление
        if (window.showAlert) {
            showAlert('Соединение восстановлено', 'success');
        }

        // Обрабатываем отложенные запросы
        this.processQueue();
    }

    handleOffline() {
        this.isOnline = false;
        this.updateOnlineStatus();

        // Показываем уведомление
        if (window.showAlert) {
            showAlert('Потеряно соединение с интернетом', 'warning');
        }
    }

    addToQueue(operation) {
        this.queue.push(operation);
        console.log('Операция добавлена в очередь офлайн - запросов:', this.queue.length);
    }

    async processQueue() {
        if (this.queue.length === 0) return;

        console.log('Обработка отложенных запросов...');
        const failedOperations = [];

        for (const operation of this.queue) {
            try {
                await operation();
                console.log('Отложенный запрос выполнен успешно');
            } catch (error) {
                console.error('Ошибка выполнения отложенного запроса:', error);
                failedOperations.push(operation);
            }
        }

        this.queue = failedOperations;

        if (failedOperations.length === 0) {
            console.log('Все отложенные запросы выполнены');
            if (window.showAlert) {
                showAlert('Все отложенные операции завершены', 'success');
            }
        }
    }

    cacheData(key, data) {
        try {
            this.cache[key] = {
                data: data,
                timestamp: Date.now()
            };

            // Также сохраняем в localStorage для persistence
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));

            return true;
        } catch (error) {
            console.error('Ошибка кеширования данных:', error);
            return false;
        }
    }

    getCachedData(key, maxAge = 5 * 60 * 1000) { // 5 минут по умолчанию
        try {
            // Сначала проверяем memory cache
            if (this.cache[key]) {
                const cached = this.cache[key];
                if (Date.now() - cached.timestamp < maxAge) {
                    return cached.data;
                }
            }

            // Затем проверяем localStorage
            const stored = localStorage.getItem(`cache_${key}`);
            if (stored) {
                const cached = JSON.parse(stored);
                if (Date.now() - cached.timestamp < maxAge) {
                    // Обновляем memory cache
                    this.cache[key] = cached;
                    return cached.data;
                } else {
                    // Удаляем просроченные данные
                    localStorage.removeItem(`cache_${key}`);
                    delete this.cache[key];
                }
            }

            return null;
        } catch (error) {
            console.error('Ошибка получения кешированных данных:', error);
            return null;
        }
    }

    clearCache() {
        this.cache = {};

        // Очищаем localStorage кеш
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    getQueueLength() {
        return this.queue.length;
    }

    getCacheStats() {
        return {
            memoryCacheSize: Object.keys(this.cache).length,
            localStorageCacheSize: Object.keys(localStorage).filter(key => key.startsWith('cache_')).length,
            queueLength: this.queue.length
        };
    }
}

// Создаем глобальный экземпляр
window.offlineManager = new OfflineManager();

// Экспортируем глобальные функции
window.isOnline = () => offlineManager.isOnline;
window.cacheData = (key, data) => offlineManager.cacheData(key, data);
window.getCachedData = (key) => offlineManager.getCachedData(key);
window.getCacheStats = () => offlineManager.getCacheStats();
window.clearCache = () => offlineManager.clearCache();