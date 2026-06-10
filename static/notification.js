// notification.js
// Система уведомлений

class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.init();
    }

    init() {
        this.createContainer();
        this.setupGlobalFunction();
    }

    createContainer() {
        // Удаляем старый контейнер если есть
        const oldContainer = document.getElementById('notification-container');
        if (oldContainer) oldContainer.remove();

        // Создаем новый контейнер
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notifications-center';
        document.body.appendChild(this.container);
    }

    setupGlobalFunction() {
        window.showNotification = (type, title, message, duration = 5000) => {
            this.show(type, title, message, duration);
        };

        window.showAlert = (message, type = 'info', duration = 5000) => {
            this.show(type, type === 'error' ? 'Ошибка' :
                    type === 'success' ? 'Успешно' :
                    type === 'warning' ? 'Внимание' : 'Информация',
                    message, duration);
        };
    }

    show(type, title, message, duration = 5000) {
        const id = 'notification-' + Date.now();
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification notification-${type}`;

        // Устанавливаем заголовок в зависимости от типа
        let icon = 'bi-info-circle';
        let colorClass = 'text-primary';

        switch(type) {
            case 'success':
                icon = 'bi-check-circle';
                colorClass = 'text-success';
                break;
            case 'error':
            case 'danger':
                icon = 'bi-exclamation-triangle';
                colorClass = 'text-danger';
                type = 'error';
                break;
            case 'warning':
                icon = 'bi-exclamation-circle';
                colorClass = 'text-warning';
                break;
            case 'info':
            default:
                icon = 'bi-info-circle';
                colorClass = 'text-info';
        }

        notification.innerHTML = `
            <div class="notification-header">
                <div>
                    <i class="bi ${icon} ${colorClass} me-2"></i>
                    <strong>${title}</strong>
                </div>
                <button type="button" class="notification-close" onclick="notificationSystem.close('${id}')">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="notification-body">
                ${message}
            </div>
            <div class="notification-time">
                ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
        `;

        this.container.appendChild(notification);
        this.notifications.push({ id, element: notification });

        // Автоматическое закрытие
        if (duration > 0) {
            setTimeout(() => this.close(id), duration);
        }

        return id;
    }

    close(id) {
        const notification = document.getElementById(id);
        if (notification) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 300);
        }
    }

    closeAll() {
        this.notifications.forEach(n => this.close(n.id));
    }
}

// Создаем глобальный экземпляр
window.notificationSystem = new NotificationSystem();

// Экспортируем глобальные функции
window.showNotification = (type, title, message, duration) =>
    notificationSystem.show(type, title, message, duration);
window.showAlert = (message, type, duration) =>
    notificationSystem.show(type,
        type === 'error' || type === 'danger' ? 'Ошибка' :
        type === 'success' ? 'Успешно' :
        type === 'warning' ? 'Внимание' : 'Информация',
        message, duration);