// stats.js
// Статистика пользователя

class UserStats {
    constructor() {
        this.stats = {
            totalBookings: 0,
            activeBookings: 0,
            totalSpent: 0,
            favoriteClass: null,
            bookingsByMonth: [],
            topDestinations: []
        };
    }

    async loadStats() {
        try {
            if (!window.api || !api.isAuthenticated()) return;

            const bookings = await api.getUserBookings();
            this.calculateStats(bookings);
            this.displayStats();

        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    calculateStats(bookings) {
        if (!bookings || bookings.length === 0) {
            this.resetStats();
            return;
        }

        // Сбрасываем статистику
        this.resetStats();

        // Подсчитываем статистику
        bookings.forEach(booking => {
            // Общее количество бронирований
            this.stats.totalBookings++;

            // Активные бронирования (не отмененные и не завершенные)
            if (booking.booking_status === 'confirmed') {
                this.stats.activeBookings++;
            }

            // Общая сумма потраченного
            if (booking.payment && booking.payment.payment_status === 'completed') {
                this.stats.totalSpent += booking.total_price || 0;
            }

            // Любимый класс обслуживания
            this.trackFavoriteClass(booking.seat_class);

            // Бронирования по месяцам
            this.trackBookingsByMonth(booking.booking_date);
        });

        // Определяем любимый класс
        this.determineFavoriteClass();
    }

    resetStats() {
        this.stats = {
            totalBookings: 0,
            activeBookings: 0,
            totalSpent: 0,
            favoriteClass: null,
            bookingsByMonth: [],
            topDestinations: [],
            classCount: {
                economy: 0,
                business: 0,
                first_class: 0
            }
        };
    }

    trackFavoriteClass(seatClass) {
        if (!seatClass) return;

        if (!this.stats.classCount) {
            this.stats.classCount = {
                economy: 0,
                business: 0,
                first_class: 0
            };
        }

        switch(seatClass) {
            case 'economy':
                this.stats.classCount.economy++;
                break;
            case 'business':
                this.stats.classCount.business++;
                break;
            case 'first_class':
                this.stats.classCount.first_class++;
                break;
        }
    }

    determineFavoriteClass() {
        if (!this.stats.classCount) return;

        const counts = this.stats.classCount;
        const maxCount = Math.max(counts.economy, counts.business, counts.first_class);

        if (maxCount === 0) {
            this.stats.favoriteClass = '-';
            return;
        }

        if (counts.economy === maxCount) {
            this.stats.favoriteClass = 'Эконом';
        } else if (counts.business === maxCount) {
            this.stats.favoriteClass = 'Бизнес';
        } else if (counts.first_class === maxCount) {
            this.stats.favoriteClass = 'Первый класс';
        }
    }

    trackBookingsByMonth(bookingDate) {
        if (!bookingDate) return;

        try {
            const date = new Date(bookingDate);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

            const existing = this.stats.bookingsByMonth.find(item => item.month === monthYear);

            if (existing) {
                existing.count++;
            } else {
                this.stats.bookingsByMonth.push({
                    month: monthYear,
                    count: 1
                });
            }
        } catch (error) {
            console.error('Ошибка обработки даты:', error);
        }
    }

    displayStats() {
        // Обновляем элементы статистики
        const elements = {
            'total-bookings': this.formatNumber(this.stats.totalBookings),
            'active-bookings': this.formatNumber(this.stats.activeBookings),
            'total-spent': this.formatCurrency(this.stats.totalSpent),
            'favorite-class': this.stats.favoriteClass || '-'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;

                // Анимация для числовых значений
                if (id !== 'favorite-class' && typeof value === 'string' && !value.includes('-')) {
                    this.animateValue(element, value);
                }
            }
        });
    }

    formatNumber(num) {
        return num.toLocaleString('ru-RU');
    }

    formatCurrency(amount) {
        return amount.toLocaleString('ru-RU') + ' ₽';
    }

    animateValue(element, targetValue) {
        const currentValue = parseFloat(element.textContent.replace(/[^\d]/g, '')) || 0;
        const target = parseFloat(targetValue.replace(/[^\d]/g, '')) || 0;

        if (currentValue === target) return;

        const duration = 1000; // 1 секунда
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Используем easeOutQuad для плавной анимации
            const easeOut = progress * (2 - progress);
            const current = currentValue + (target - currentValue) * easeOut;

            if (targetValue.includes('₽')) {
                element.textContent = Math.floor(current).toLocaleString('ru-RU') + ' ₽';
            } else {
                element.textContent = Math.floor(current).toLocaleString('ru-RU');
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    getStats() {
        return this.stats;
    }

    async refresh() {
        await this.loadStats();
    }
}

// Создаем глобальный экземпляр
window.userStats = new UserStats();

// Экспортируем глобальные функции
window.loadUserStats = () => userStats.loadStats();
window.refreshUserStats = () => userStats.refresh();
window.getUserStats = () => userStats.getStats();