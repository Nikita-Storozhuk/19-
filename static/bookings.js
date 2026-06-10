// Обновленная версия loadUserBookings
async function loadUserBookings() {
    console.log('🔄 Начинаю загрузку бронирований...');

    const bookingsList = document.getElementById('bookings-list');
    if (!bookingsList) {
        console.error('❌ Элемент bookings-list не найден');
        return;
    }

    if (!api.isAuthenticated()) {
        showAlert('Для просмотра бронирований необходимо войти в систему', 'warning');
        return;
    }

    try {
        // Показываем индикатор загрузки сразу
        /*bookingsList.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-3 text-muted">Загрузка ваших бронирований...</p>
            </div>
        `;*/

        const startTime = performance.now();

        // Загружаем бронирования
        console.log('📥 Запрашиваю бронирования...');
        const bookings = await api.getUserBookings();
        console.log('📊 Все бронирования:', bookings);
        console.log('📊 Статусы бронирований:', bookings.map(b => b.booking_status || b.status));
        console.log('📊 Отмененные бронирования:', bookings.filter(b =>
            b.booking_status === 'cancelled' || b.status === 'cancelled'
        ));

        const loadTime = performance.now() - startTime;
        console.log(`✅ Бронирования загружены за ${loadTime.toFixed(2)}ms`, bookings);

        if (!bookings || bookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-info-circle fs-4 me-3"></i>
                        <div>
                            <h5 class="mb-1">У вас пока нет бронирований</h5>
                            <p class="mb-0">Найдите и забронируйте рейс в разделе "Поиск рейсов"</p>
                            <a href="#" class="btn btn-primary btn-sm mt-2" onclick="showSection('search-flights')">
                                <i class="bi bi-search me-1"></i> Найти рейсы
                            </a>
                        </div>
                    </div>
                </div>
            `;
            updateUserStats(0, 0, 0, '-');
            return;
        }

        // Быстрое отображение без дополнительных запросов
        displayBookings(bookings);

        // Обновляем статистику
        if (window.userStats) {
            userStats.loadStats();
        }

    } catch (error) {
        console.error('❌ Ошибка загрузки бронирований:', error);

        let errorMessage = 'Ошибка загрузки бронирований';
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Ошибка подключения к серверу. Проверьте интернет-соединение.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Ошибка авторизации. Попробуйте перезайти в систему.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Бронирования не найдены.';
        }

        bookingsList.innerHTML = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle fs-4 me-3"></i>
                    <div>
                        <h5 class="mb-1">Ошибка загрузки</h5>
                        <p class="mb-2">${errorMessage}</p>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="loadUserBookings()">
                                <i class="bi bi-arrow-clockwise"></i> Повторить попытку
                            </button>
                            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="showSection('search-flights')">
                                <i class="bi bi-search"></i> Найти рейсы
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Функция для получения платежа по ID бронирования
async function getPaymentForBooking(bookingId) {
    try {
        // Временно: запрашиваем платежи и фильтруем на фронтенде
        // В идеале должен быть API endpoint /payments?booking_id=X
        const response = await api.get('/payments/history');
        if (response && response.payments) {
            const payment = response.payments.find(p => p.booking_id === bookingId);
            return payment;
        }
        return null;
    } catch (error) {
        console.error('Ошибка получения платежа:', error);
        return null;
    }
}

async function loadBookingsWithPayments() {
    try {
        // 1. Загружаем бронирования
        const bookings = await api.getUserBookings();

        // 2. Для каждого бронирования загружаем платеж
        const bookingsWithPayments = await Promise.all(
            bookings.map(async (booking) => {
                try {
                    const paymentResponse = await api.get(`/bookings/${booking.id}/payment`);
                    return {
                        ...booking,
                        payment: paymentResponse.has_payment ? paymentResponse.payment : null
                    };
                } catch (error) {
                    return { ...booking, payment: null };
                }
            })
        );

        displayBookings(bookingsWithPayments);
    } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
        throw error;
    }
}

function updateUserStats(total, active, spent, favoriteClass) {
    const totalElement = document.getElementById('total-bookings');
    const activeElement = document.getElementById('active-bookings');
    const spentElement = document.getElementById('total-spent');
    const classElement = document.getElementById('favorite-class');

    if (totalElement) totalElement.textContent = total;
    if (activeElement) activeElement.textContent = active;
    if (spentElement) spentElement.textContent = `${spent.toLocaleString('ru-RU')} ₽`;
    if (classElement) classElement.textContent = favoriteClass;
}

function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookings-list');
    console.log('содержимое переменной bookingsList ',bookingsList);

    if (!bookingsList) {
        console.error('Элемент bookings-list не найден');
        return;
    }

    if (!bookings || bookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="alert alert-info">
                <div class="d-flex align-items-center">
                    <i class="bi bi-info-circle fs-4 me-3"></i>
                    <div>
                        <h5 class="mb-1">У вас пока нет бронирований</h5>
                        <p class="mb-0">Найдите и забронируйте рейс в разделе "Поиск рейсов"</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Очищаем список
    //bookingsList.innerHTML = '';

    // Статистика для отображения
    let totalBookings = bookings.length;
    let activeBookings = bookings.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'paid').length;
    let totalSpent = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);

    // Любимый класс (наиболее частый)
    const classCounts = {};
    bookings.forEach(booking => {
        if (booking.seat_class) {
            classCounts[booking.seat_class] = (classCounts[booking.seat_class] || 0) + 1;
        }
    });

    let favoriteClass = '-';
    if (Object.keys(classCounts).length > 0) {
        const maxClass = Object.entries(classCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        favoriteClass = getSeatClassName(maxClass);
    }

    // Обновляем статистику в UI
    updateUserStats(totalBookings, activeBookings, totalSpent, favoriteClass);

    // Сортируем бронирования по дате создания (новые сначала)
    const sortedBookings = [...bookings].sort((a, b) =>
        new Date(b.created_at || b.booking_date) - new Date(a.created_at || a.booking_date)
    );

    // Группируем по статусу
    const groupedBookings = {
        active: sortedBookings.filter(b => ['confirmed', 'paid', 'waiting'].includes(b.booking_status)),
        cancelled: sortedBookings.filter(b => b.booking_status === 'cancelled'),
        completed: sortedBookings.filter(b => b.booking_status === 'completed')
    };

    // Отображаем активные бронирования
    if (groupedBookings.active.length > 0) {
        const activeSection = document.createElement('div');
        activeSection.className = 'mb-5';
        activeSection.innerHTML = `
            <h4 class="text-primary mb-3">
                <i class="bi bi-clock-history me-2"></i>Активные бронирования
                <span class="badge bg-primary ms-2">${groupedBookings.active.length}</span>
            </h4>
        `;
        bookingsList.appendChild(activeSection);

        groupedBookings.active.forEach(booking => {
            const bookingCard = createBookingCard(booking);
            activeSection.appendChild(bookingCard);
        });
    }

    // Отображаем завершенные бронирования
    if (groupedBookings.completed.length > 0) {
        const completedSection = document.createElement('div');
        completedSection.className = 'mb-5';
        completedSection.innerHTML = `
            <h4 class="text-success mb-3">
                <i class="bi bi-check-circle me-2"></i>Завершенные поездки
                <span class="badge bg-success ms-2">${groupedBookings.completed.length}</span>
            </h4>
        `;
        bookingsList.appendChild(completedSection);

        groupedBookings.completed.forEach(booking => {
            const bookingCard = createBookingCard(booking);
            completedSection.appendChild(bookingCard);
        });
    }

    // Отображаем отмененные бронирования
    if (groupedBookings.cancelled.length > 0) {
        const cancelledSection = document.createElement('div');
        cancelledSection.className = 'mb-5';
        cancelledSection.innerHTML = `
            <h4 class="text-secondary mb-3">
                <i class="bi bi-x-circle me-2"></i>Отмененные бронирования
                <span class="badge bg-secondary ms-2">${groupedBookings.cancelled.length}</span>
            </h4>
        `;
        bookingsList.appendChild(cancelledSection);

        groupedBookings.cancelled.forEach(booking => {
            const bookingCard = createBookingCard(booking);
            cancelledSection.appendChild(bookingCard);
        });
    }
}

function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'card booking-card mb-3';
    card.setAttribute('data-booking-id', booking.id || booking.booking_id);

    // Определяем статус и цвет
    const statusInfo = getBookingStatusInfo(booking.booking_status || booking.status);

    // Форматируем даты
    const createdDate = formatDateTime(booking.created_at || booking.booking_date);
    const flightDate = booking.flight && booking.flight.departure_time
        ? formatDate(booking.flight.departure_time)
        : 'Не указана';

    // Информация о багаже
    let luggageHtml = '';
    if (booking.luggage && booking.luggage.length > 0) {
        const totalLuggagePrice = booking.luggage.reduce((sum, item) => sum + (item.price || 0), 0);
        luggageHtml = `
            <div class="mb-2">
                <strong><i class="bi bi-suitcase"></i> Багаж:</strong>
                <div class="mt-1">
                    ${booking.luggage.map(item => `
                        <span class="badge bg-info me-1 mb-1" data-bs-toggle="tooltip"
                              title="${getLuggageTypeName(item.luggage_type)}: ${item.weight} кг">
                            <i class="bi ${getLuggageIcon(item.luggage_type)} me-1"></i>
                            ${item.weight} кг
                            ${item.price ? `(${item.price} ₽)` : ''}
                        </span>
                    `).join('')}
                    ${totalLuggagePrice > 0 ? `
                        <small class="text-muted ms-2">Итого по багажу: ${totalLuggagePrice} ₽</small>
                    ` : ''}
                </div>
                ${booking.luggage.some(item => item.special_requirements) ? `
                    <div class="alert alert-warning mt-2 p-2">
                        <small><i class="bi bi-exclamation-triangle"></i> Особые требования к багажу</small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Информация о рейсе
    let flightInfo = '';
    if (booking.flight) {
        flightInfo = `
            <div class="flight-info mb-2">
                <strong><i class="bi bi-airplane"></i> Рейс ${booking.flight.flight_number}</strong>
                <div class="text-muted small">
                    ${booking.flight.departure_airport} → ${booking.flight.arrival_airport}
                    <br>
                    ${formatDateTime(booking.flight.departure_time)} - ${formatTime(booking.flight.arrival_time)}
                </div>
            </div>
        `;
    }


    // Кнопки действий
    let actionButtons = '';
    if (booking.booking_status === 'confirmed' || booking.booking_status === 'paid') {
        actionButtons = `
            <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-primary" onclick="viewBookingDetails(${booking.id})">
                    <i class="bi bi-eye"></i> Детали
                </button>
                ${booking.booking_status === 'confirmed' ? `
                    <button class="btn btn-outline-success" onclick="showPaymentModal(${booking.id})">
                        <i class="bi bi-credit-card"></i> Оплатить
                    </button>
                ` : ''}
                ${booking.booking_status === 'paid' && booking.flight ? `
                    <button class="btn btn-outline-info" onclick="getBoardingPass(${booking.id})">
                        <i class="bi bi-qr-code"></i> Посадочный талон
                    </button>
                ` : ''}
                <button class="btn btn-outline-danger" onclick="cancelBooking(${booking.id})">
                    <i class="bi bi-x-circle"></i> Отменить
                </button>
            </div>
        `;
    } else if (booking.booking_status === 'waiting') {
        actionButtons = `
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-warning" onclick="viewBookingDetails(${booking.id})">
                    <i class="bi bi-clock"></i> Ожидает подтверждения
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelBooking(${booking.id})">
                    <i class="bi bi-x-circle"></i> Отменить
                </button>
            </div>
        `;
    } else if (booking.booking_status  === 'cancelled') {
        actionButtons = `
            <button class="btn btn-sm btn-outline-secondary" onclick="viewBookingDetails(${booking.id})">
                <i class="bi bi-eye"></i> Просмотр
            </button>
        `;
    } else if (booking.booking_status === 'completed') {
        actionButtons = `
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-success" onclick="viewBookingDetails(${booking.id})">
                    <i class="bi bi-eye"></i> Детали поездки
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="leaveFeedback(${booking.id})">
                    <i class="bi bi-chat-left-text"></i> Оставить отзыв
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h5 class="card-title mb-1">
                        Бронирование #${booking.booking_reference || booking.id}
                        <span class="badge ${statusInfo.class} ms-2">
                            ${statusInfo.text}
                        </span>
                    </h5>
                    <div class="text-muted small">
                        <i class="bi bi-calendar"></i> Создано: ${createdDate}
                        ${flightDate ? `<br><i class="bi bi-calendar-check"></i> Рейс: ${flightDate}` : ''}
                    </div>
                </div>
                <div class="text-end">
                    <h4 class="text-primary mb-1">${booking.total_price || 0} ₽</h4>
                    <div class="text-muted small">
                        <span class="badge bg-secondary">${getSeatClassName(booking.seat_class)}</span>
                        ${booking.passengers_count ? `<span class="badge bg-info ms-1">${booking.passengers_count} пасс.</span>` : ''}
                    </div>
                </div>
            </div>

            ${flightInfo}

            <!-- Информация о пассажирах -->
            <div class="mb-2">
                <strong><i class="bi bi-people"></i> Пассажиры:</strong>
                <span class="ms-2">${booking.passengers_count || 1} человек</span>
                ${booking.seat_numbers && booking.seat_numbers.length > 0 ? `
                    <span class="ms-2">
                        Места: ${booking.seat_numbers.join(', ')}
                    </span>
                ` : ''}
            </div>

            ${luggageHtml}

            <!-- Особые пожелания -->
            ${booking.special_requests ? `
                <div class="alert alert-light border mt-2 p-2">
                    <small><i class="bi bi-chat-left-text"></i> <strong>Особые пожелания:</strong> ${booking.special_requests}</small>
                </div>
            ` : ''}

            <!-- Квитанция/чек -->
            ${booking.receipt_url ? `
                <div class="mb-3">
                    <a href="${booking.receipt_url}" class="btn btn-sm btn-outline-success" target="_blank">
                        <i class="bi bi-receipt"></i> Скачать квитанцию
                    </a>
                </div>
            ` : ''}

            <!-- Кнопки действий -->
            <div class="mt-3">
                ${actionButtons}
            </div>

            <!-- Дополнительная информация -->
            <div class="mt-3 pt-3 border-top text-muted small">
                <div class="row">
                    <div class="col-md-6">
                        <div><i class="bi bi-building"></i> Авиакомпания: ${booking.airline || 'Не указана'}</div>
                        <div><i class="bi bi-geo-alt"></i> Маршрут: ${booking.departure_city || ''} → ${booking.arrival_city || ''}</div>
                    </div>
                    <div class="col-md-6">
                        <div><i class="bi bi-credit-card"></i> Оплата: ${booking.payment_status || 'Не оплачено'}</div>
                        ${booking.confirmation_code ? `
                            <div><i class="bi bi-key"></i> Код подтверждения: ${booking.confirmation_code}</div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Добавьте вспомогательные функции
function getSeatClassBadge(seatClass) {
    const badges = {
        'economy': 'bg-success',
        'business': 'bg-warning text-dark',
        'first_class': 'bg-danger'
    };
    return badges[seatClass] || 'bg-secondary';
}

function getSeatClassName(seatClass) {
    const names = {
        'economy': 'Эконом',
        'business': 'Бизнес',
        'first_class': 'Первый класс'
    };
    return names[seatClass] || seatClass;
}

// Вспомогательные функции
function calculateHoursUntilFlight(departureTime) {
    if (!departureTime) return Infinity;

    try {
        const flightTime = new Date(departureTime);
        const now = new Date();
        const diffMs = flightTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        return Math.max(0, diffHours);
    } catch (error) {
        console.error('Ошибка расчета времени:', error);
        return Infinity;
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';

    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        return dateTimeString;
    }
}

function showRefundDetails(bookingId) {
    // Находим бронирование
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.payment) return;

    const modalHtml = `
        <div class="modal fade" id="refund-details-modal-${bookingId}" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-arrow-counterclockwise me-2"></i>
                            Детали возврата
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Информация о бронировании</h6>
                                <p><strong>Номер:</strong> ${booking.booking_reference}</p>
                                <p><strong>Сумма:</strong> ${booking.total_price} ₽</p>
                                <p><strong>Дата бронирования:</strong> ${formatDate(booking.booking_date)}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Информация о возврате</h6>
                                <p><strong>Статус:</strong> <span class="badge bg-info">Возвращен</span></p>
                                <p><strong>Сумма возврата:</strong> ${booking.payment.amount} ₽</p>
                                <p><strong>ID возврата:</strong> ${booking.payment.refund_transaction_id || 'Не указан'}</p>
                                <p><strong>Дата возврата:</strong> ${booking.payment.refund_date ? formatDate(booking.payment.refund_date) : 'Не указана'}</p>
                                <p><strong>Метод оплаты:</strong> ${getPaymentMethodName(booking.payment.payment_method)}</p>
                            </div>
                        </div>

                        <div class="alert alert-info mt-3">
                            <h6><i class="bi bi-info-circle"></i> Информация</h6>
                            <p class="mb-1">Деньги будут возвращены на исходный способ оплаты</p>
                            <p class="mb-1">Срок поступления: 3-5 рабочих дней</p>
                            <p class="mb-0">При возникновении вопросов обращайтесь в поддержку</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        <button type="button" class="btn btn-primary" onclick="printRefundDetails(${bookingId})">
                            <i class="bi bi-printer"></i> Распечатать
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку
    const oldModal = document.getElementById(`refund-details-modal-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`refund-details-modal-${bookingId}`));
    modal.show();
}

function printRefundDetails(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const printContent = `
        <html>
        <head>
            <title>Детали возврата #${booking.booking_reference}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; }
                .section { margin-bottom: 20px; }
                .label { font-weight: bold; color: #555; }
                .value { margin-left: 10px; }
                .header { text-align: center; margin-bottom: 30px; }
                .company { font-size: 24px; font-weight: bold; color: #17a2b8; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">Авиакомпания "SkyWings"</div>
                <div>Чек о возврате денежных средств</div>
            </div>

            <div class="section">
                <h2>Информация о бронировании</h2>
                <p><span class="label">Номер бронирования:</span><span class="value">${booking.booking_reference}</span></p>
                <p><span class="label">Дата бронирования:</span><span class="value">${formatDate(booking.booking_date)}</span></p>
                <p><span class="label">Сумма бронирования:</span><span class="value">${booking.total_price} ₽</span></p>
                ${booking.flight ? `
                    <p><span class="label">Рейс:</span><span class="value">${booking.flight.departure_airport} → ${booking.flight.arrival_airport}</span></p>
                    <p><span class="label">Номер рейса:</span><span class="value">${booking.flight.flight_number}</span></p>
                ` : ''}
            </div>

            <div class="section">
                <h2>Информация о возврате</h2>
                <p><span class="label">Статус:</span><span class="value">Возврат осуществлен</span></p>
                <p><span class="label">Сумма возврата:</span><span class="value">${booking.payment.amount} ₽</span></p>
                <p><span class="label">ID возврата:</span><span class="value">${booking.payment.refund_transaction_id || 'Не указан'}</span></p>
                <p><span class="label">Дата возврата:</span><span class="value">${booking.payment.refund_date ? formatDate(booking.payment.refund_date) : 'Не указана'}</span></p>
                <p><span class="label">Метод оплаты:</span><span class="value">${getPaymentMethodName(booking.payment.payment_method)}</span></p>
            </div>

            <div class="section">
                <h2>Дополнительная информация</h2>
                <p>Денежные средства будут возвращены на исходный способ оплаты в течение 3-5 рабочих дней.</p>
                <p>При возникновении вопросов обращайтесь в службу поддержки по телефону: 8-800-555-35-35</p>
            </div>

            <div class="footer">
                <p>Чек сформирован: ${new Date().toLocaleString('ru-RU')}</p>
                <p>Документ является подтверждением возврата денежных средств</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function showRefundConfirmationModal(bookingId, refundInfo) {
    const modalHtml = `
        <div class="modal fade" id="refund-modal-${bookingId}" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header ${refundInfo.can_refund ? 'bg-warning' : 'bg-danger'} text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            ${refundInfo.can_refund ? 'Отмена с возвратом денег' : 'Отмена бронирования'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${refundInfo.can_refund ? `
                            <div class="alert alert-success">
                                <h6><i class="bi bi-check-circle-fill"></i> Возврат денег возможен!</h6>
                                <p class="mb-1"><strong>Будет возвращено:</strong> ${refundInfo.refund_amount.toFixed(2)}₽</p>
                                <p class="mb-1"><strong>Срок возврата:</strong> до ${refundInfo.refund_days} рабочих дней</p>
                                <p class="mb-0"><strong>На карту:</strong> ${refundInfo.payment_method}</p>
                            </div>
                        ` : `
                            <div class="alert alert-danger">
                                <h6><i class="bi bi-exclamation-octagon-fill"></i> Возврат денег невозможен</h6>
                                <p>До вылета осталось менее 3 часов. Согласно правилам тарифа, возврат не предусмотрен.</p>
                            </div>
                        `}

                        <div class="alert alert-info">
                            <p><strong>Вы уверены, что хотите отменить бронирование?</strong></p>
                            <p class="mb-0 small">После отмены места будут возвращены в продажу.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Отмена
                        </button>
                        <button type="button" class="btn ${refundInfo.can_refund ? 'btn-warning' : 'btn-danger'}"
                                onclick="processCancellation(${bookingId})"
                                id="confirm-cancel-btn-${bookingId}">
                            <i class="bi bi-check-circle"></i>
                            ${refundInfo.can_refund ? 'Отменить с возвратом' : 'Отменить без возврата'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку
    const oldModal = document.getElementById(`refund-modal-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`refund-modal-${bookingId}`));
    modal.show();
}

// Функция для обработки отмены
async function processCancellation(bookingId) {
    const confirmBtn = document.getElementById(`confirm-cancel-btn-${bookingId}`);
    if (confirmBtn) {
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Обработка...';
        confirmBtn.disabled = true;
    }

    try {
        await cancelBooking(bookingId);

        // Закрываем модальное окно
        const modalElement = document.getElementById(`refund-modal-${bookingId}`);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
    } finally {
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="bi bi-check-circle"></i> Подтвердить';
            confirmBtn.disabled = false;
        }
    }
}

// Улучшенная версия showPaymentModal
// Упрощенная версия showPaymentModal
function showPaymentModal(bookingId) {
    console.log('💰 Открываю оплату для бронирования:', bookingId);

    if (!api.isAuthenticated()) {
        showAlert('Для оплаты необходимо войти в систему', 'warning');
        return;
    }

    // Показываем простой выбор метода оплаты
    const method = prompt(`Выберите метод оплаты для бронирования ${bookingId}:\n1. Карта\n2. PayPal\n3. Наличные\n\nВведите номер:`, '1');

    if (!method) return;

    let paymentMethod;
    switch(method) {
        case '1': paymentMethod = 'credit_card'; break;
        case '2': paymentMethod = 'paypal'; break;
        case '3': paymentMethod = 'cash'; break;
        default:
            showAlert('Неверный метод оплаты', 'warning');
            return;
    }

    if (confirm(`Подтвердить оплату бронирования ${bookingId} методом "${getPaymentMethodName(paymentMethod)}"?`)) {
        processPaymentSimple(bookingId, paymentMethod);
    }
}

// Упрощенная функция оплаты
async function processPaymentSimple(bookingId, paymentMethod) {
    console.log('💳 Начинаю оплату:', { bookingId, paymentMethod });

    try {
        // Находим кнопку оплаты
        const payButton = document.querySelector(`button.pay-button[data-booking-id="${bookingId}"]`);
        if (payButton) {
            payButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            payButton.disabled = true;
            payButton.classList.remove('btn-success');
            payButton.classList.add('btn-secondary');
        }

        // Выполняем платеж
        const payment = await api.createPayment({
            booking_id: bookingId,
            payment_method: paymentMethod
        });

        console.log('✅ Платеж успешен:', payment);

        // Немедленно обновляем интерфейс
        updateBookingAfterPayment(bookingId, payment);

        // Показываем уведомление
        alert(`✅ Платеж успешно проведен!\nID транзакции: ${payment.transaction_id || payment.id}\nСумма: ${payment.amount} ₽`);

        // Через 2 секунды перезагружаем
        setTimeout(() => {
            loadUserBookings();
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка оплаты:', error);

        // Восстанавливаем кнопку
        const payButton = document.querySelector(`button.pay-button[data-booking-id="${bookingId}"]`);
        if (payButton) {
            payButton.innerHTML = '<i class="bi bi-credit-card"></i> Оплатить';
            payButton.disabled = false;
            payButton.classList.remove('btn-secondary');
            payButton.classList.add('btn-success');
        }

        alert('❌ Ошибка оплаты: ' + error.message);
    }
}

// Функция обновления бронирования после оплаты
function updateBookingAfterPayment(bookingId, payment) {
    console.log('🔄 Обновляю бронирование:', bookingId);

    // 1. Обновляем блок информации об оплате
    const paymentInfo = document.getElementById(`payment-info-${bookingId}`);
    if (paymentInfo) {
        paymentInfo.innerHTML = `
            <div class="text-success">
                <i class="bi bi-check-circle-fill"></i> <strong>Оплачено</strong>
                <div class="text-muted small mt-1">
                    <i class="bi bi-credit-card"></i> ${getPaymentMethodName(payment.payment_method)}
                    ${payment.transaction_id ? `<br><small>ID: ${payment.transaction_id}</small>` : ''}
                </div>
            </div>
        `;
    }

    // 2. Меняем кнопку на статус
    const payButton = document.querySelector(`button.pay-button[data-booking-id="${bookingId}"]`);
    if (payButton) {
        payButton.outerHTML = `
            <span class="badge bg-success me-2">
                <i class="bi bi-credit-card"></i> Оплачено
            </span>
        `;
    }

    // 3. Подсвечиваем карточку
    const card = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);
    if (card) {
        card.style.borderLeft = '4px solid #28a745';
        card.style.backgroundColor = 'rgba(40, 167, 69, 0.05)';
    }

    console.log('✅ Бронирование обновлено');
}

// Выбор метода оплаты
function selectPaymentMethod(bookingId, method) {
    console.log('📝 Выбран метод оплаты:', method, 'для bookingId:', bookingId);

    // Убираем выделение у всех элементов
    document.querySelectorAll(`#payment-methods-${bookingId} .list-group-item`).forEach(item => {
        item.classList.remove('active');
    });

    // Выделяем выбранный
    event.target.closest('.list-group-item').classList.add('active');

    // Активируем кнопку подтверждения
    const confirmBtn = document.getElementById(`confirm-payment-btn-${bookingId}`);
    confirmBtn.disabled = false;

    // Сохраняем выбранный метод
    confirmBtn.dataset.paymentMethod = method;
}

// Подтверждение оплаты
async function confirmPayment(bookingId) {
    console.log('✅ Подтверждение оплаты для bookingId:', bookingId);

    const confirmBtn = document.getElementById(`confirm-payment-btn-${bookingId}`);
    const paymentMethod = confirmBtn.dataset.paymentMethod;

    if (!paymentMethod) {
        showAlert('Пожалуйста, выберите способ оплаты', 'warning');
        return;
    }

    try {
        // Меняем текст кнопки
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Обработка...';
        confirmBtn.disabled = true;

        console.log('📤 Отправляю платеж:', { bookingId, paymentMethod });

        // Вызываем оплату
        await processPayment(bookingId, paymentMethod);

        // Закрываем модальное окно
        const modalElement = document.getElementById(`payment-modal-${bookingId}`);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }

        // Восстанавливаем кнопку
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;

    } catch (error) {
        console.error('❌ Ошибка подтверждения оплаты:', error);

        // Восстанавливаем кнопку
        const confirmBtn = document.getElementById(`confirm-payment-btn-${bookingId}`);
        confirmBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Подтвердить оплату';
        confirmBtn.disabled = false;
    }
}

// Отмена бронирования (обновленная с проверкой офлайн-режима)
// Измените функцию cancelBooking:
async function cancelBooking(bookingId) {
    console.log('❌ Отмена бронирования:', bookingId);

    try {
        // 1. Получаем информацию о бронировании
        const booking = await api.getBooking(bookingId);
        if (!booking) {
            showAlert('Бронирование не найдено', 'danger');
            return;
        }

        // 2. Если есть платеж, получаем информацию о возврате
        let refundInfo = null;
        if (booking.payment && booking.payment.payment_status === 'completed') {
            try {
                refundInfo = await api.get(`/bookings/${bookingId}/refund-info`);
            } catch (error) {
                console.warn('Не удалось получить информацию о возврате:', error);
            }
        }

        // 3. Формируем сообщение подтверждения
        let confirmMessage = `Вы уверены, что хотите отменить бронирование №${booking.booking_reference}?\n\n`;

        if (refundInfo) {
            if (refundInfo.refund_amount > 0) {
                confirmMessage += `💰 Вам будет возвращено: ${refundInfo.refund_amount.toFixed(2)}₽\n`;
                confirmMessage += `📊 Возврат: ${refundInfo.refund_percentage}% от суммы\n`;
                confirmMessage += `⏱️ Возврат займет до ${refundInfo.refund_days || 5} рабочих дней\n`;
                confirmMessage += `📝 Причина: ${refundInfo.refund_reason}\n\n`;
            } else {
                confirmMessage += `⚠️ Возврат денег невозможен\n`;
                confirmMessage += `📝 Причина: ${refundInfo.refund_reason}\n\n`;
            }
        } else if (booking.payment) {
            confirmMessage += `ℹ️ Бронирование оплачено\n`;
            confirmMessage += `💰 Сумма: ${booking.payment.amount}₽\n\n`;
        }

        confirmMessage += 'Отменить бронирование?';

        // 4. Запрашиваем подтверждение
        if (!confirm(confirmMessage)) {
            return;
        }

        // 5. Показываем индикатор
        const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);
        let originalContent = '';
        if (bookingCard) {
            originalContent = bookingCard.innerHTML;
            bookingCard.innerHTML = `
                <div class="card-body text-center">
                    <div class="spinner-border ${refundInfo && refundInfo.refund_amount > 0 ? 'text-warning' : 'text-danger'}" role="status">
                        <span class="visually-hidden">Обработка отмены...</span>
                    </div>
                    <p class="mt-2">
                        ${refundInfo && refundInfo.refund_amount > 0 ?
                          'Обработка отмены и возврата денег...' :
                          'Обработка отмены...'}
                    </p>
                </div>
            `;
            bookingCard.style.opacity = '0.7';
        }

        // 6. Отправляем запрос на отмену
        const response = await api.cancelBooking(bookingId);

        // 7. Формируем сообщение об успехе
        let successMessage = '✅ Бронирование успешно отменено!';

        // Проверяем информацию о возврате
        const refundId = response.refund_transaction_id ||
                        (booking.payment && booking.payment.refund_transaction_id);
        const refundAmount = booking.payment ? booking.payment.amount : 0;

        if (refundId && refundAmount > 0) {
            successMessage += `\n\n💳 Возврат денег инициирован:\n`;
            successMessage += `💰 Сумма: ${refundAmount}₽\n`;
            successMessage += `📝 ID возврата: ${refundId}\n`;
            successMessage += `⏱️ Деньги поступят в течение 3-5 рабочих дней`;
        }

        // 8. Показываем сообщение
        showAlert(successMessage, 'success');

        // 9. Обновляем список бронирований
        setTimeout(() => {
            loadUserBookings();
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка отмены:', error);

        // Восстанавливаем карточку
        if (bookingCard && originalContent) {
            bookingCard.innerHTML = originalContent;
            bookingCard.style.opacity = '1';
        }

        // Показываем ошибку
        let errorMessage = 'Ошибка отмены бронирования';
        if (error.message.includes('404')) {
            errorMessage = 'Бронирование не найдено';
        } else if (error.message.includes('403')) {
            errorMessage = 'Нет прав на отмену';
        } else if (error.message.includes('уже отменено')) {
            errorMessage = 'Бронирование уже отменено';
        } else if (error.message.includes('Возврат невозможен')) {
            errorMessage = 'Нельзя отменить бронирование (менее 3 часов до вылета)';
        }

        showAlert(errorMessage, 'danger');
    }
}


// Обработка платежа
// Обработка платежа - ОБНОВЛЕННАЯ ВЕРСИЯ
// ОБНОВЛЕННАЯ версия processPayment в bookings.js
// Улучшенная версия processPayment
async function processPayment(bookingId, paymentMethod) {
    console.log('💰 Начинаю процесс оплаты:', { bookingId, paymentMethod });

    try {
        // Находим карточку бронирования
        const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);
        if (!bookingCard) {
            console.error('❌ Карточка бронирования не найдена:', bookingId);
            showAlert('Бронирование не найдено', 'danger');
            return;
        }

        // Сохраняем оригинальный HTML
        const originalHTML = bookingCard.innerHTML;

        // Показываем индикатор загрузки
        bookingCard.innerHTML = `
            <div class="card-body">
                <div class="text-center py-3">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Обработка платежа...</span>
                    </div>
                    <p class="mt-2 text-muted">Обработка платежа...</p>
                </div>
            </div>
        `;
        bookingCard.style.opacity = '0.7';

        // Выполняем платеж
        console.log('📤 Отправляю запрос на сервер...');
        const payment = await api.createPayment({
            booking_id: bookingId,
            payment_method: paymentMethod
        });

        console.log('✅ Платеж успешно обработан:', payment);

        // 1. Немедленно обновляем интерфейс
        updateBookingCardImmediately(bookingId, payment);

        // 2. Показываем уведомление
        showAlert(`
            <div class="alert-success">
                <h5><i class="bi bi-check-circle-fill"></i> Оплата успешно проведена!</h5>
                <p><strong>ID транзакции:</strong> ${payment.transaction_id || payment.id}</p>
                <p><strong>Метод:</strong> ${getPaymentMethodName(payment.payment_method)}</p>
                <p><strong>Сумма:</strong> ${payment.amount} ₽</p>
                <small>Статус: ${payment.payment_status}</small>
            </div>
        `, 'success');

        // 3. Через 3 секунды перезагружаем данные
        setTimeout(() => {
            console.log('🔄 Перезагружаю бронирования...');
            loadUserBookings();
        }, 3000);

    } catch (error) {
        console.error('❌ Ошибка при проведении платежа:', error);

        // Восстанавливаем карточку
        if (originalHTML && bookingCard) {
            bookingCard.innerHTML = originalHTML;
            bookingCard.style.opacity = '1';
        }

        // Показываем ошибку
        let errorMessage = 'Не удалось провести платеж';
        if (error.message.includes('Duplicate entry')) {
            errorMessage = 'Этот платеж уже был проведен ранее';
        } else if (error.message.includes('401')) {
            errorMessage = 'Ошибка авторизации. Попробуйте перезайти в систему';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка подключения к серверу';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Дополнительная информация для отладки
        console.error('Полная ошибка:', error);
    }
}

// Функция для немедленного обновления карточки
function updateBookingCardImmediately(bookingId, payment) {
    console.log('🔄 Немедленное обновление карточки:', bookingId);

    const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);
    if (!bookingCard) return;

    // Создаем новую карточку
    bookingCard.innerHTML = `
        <div class="card-body">
            <div class="row align-items-center">
                <div class="col-md-2">
                    <div class="fw-bold">${bookingId}</div>
                    <small class="text-muted">Бронирование</small>
                </div>
                <div class="col-md-3">
                    <div class="fw-bold">${getPaymentMethodName(payment.payment_method)}</div>
                    <small>${payment.amount} ₽</small>
                </div>
                <div class="col-md-3">
                    <div class="text-success fw-bold">
                        <i class="bi bi-check-circle-fill"></i> ОПЛАЧЕНО
                    </div>
                    <div class="text-muted small">
                        ID: ${payment.transaction_id || payment.id}
                    </div>
                </div>
                <div class="col-md-4 text-end">
                    <span class="badge bg-success me-2">
                        <i class="bi bi-credit-card"></i> Оплачено
                    </span>
                    <button class="btn btn-outline-info btn-sm" onclick="showBookingDetails(${bookingId})">
                        <i class="bi bi-info-circle"></i>
                    </button>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-12">
                    <div class="alert alert-success mb-0 py-1">
                        <small>
                            <i class="bi bi-clock-history"></i>
                            Платеж обработан: ${new Date().toLocaleTimeString('ru-RU')}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `;

    bookingCard.style.borderLeft = '4px solid #28a745';
    bookingCard.style.backgroundColor = 'rgba(40, 167, 69, 0.05)';
    bookingCard.style.opacity = '1';

    console.log('✅ Карточка успешно обновлена');
}


// Обновление бронирования после платежа
function updateBookingAfterPayment(bookingId, payment) {
    // Находим карточку бронирования
    const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);

    if (!bookingCard) return;

    // Обновляем часть с информацией о платеже
    const bookingInfoDiv = bookingCard.querySelector('.col-md-3');
    if (bookingInfoDiv) {
        const oldPriceDiv = bookingInfoDiv.querySelector('.fw-bold');
        if (oldPriceDiv) {
            // Добавляем информацию об оплате
            const paymentInfo = document.createElement('div');
            paymentInfo.className = 'payment-info';
            paymentInfo.innerHTML = `
                <div class="mt-1">
                    <small class="text-success">
                        <i class="bi bi-check-circle-fill"></i> Оплачено
                    </small>
                    <div class="text-muted small">
                        <i class="bi bi-credit-card"></i> ${getPaymentMethodName(payment.payment_method)}
                        <br><small>Транзакция: ${payment.transaction_id}</small>
                    </div>
                </div>
            `;

            bookingInfoDiv.appendChild(paymentInfo);
        }
    }

    // Обновляем кнопки
    const actionsDiv = bookingCard.querySelector('.text-end');
    if (actionsDiv) {
        // Убираем кнопку оплаты
        const payButton = actionsDiv.querySelector('button[onclick*="showPaymentModal"]');
        if (payButton) {
            payButton.style.display = 'none';
        }

        // Добавляем информацию об оплате
        const paymentBadge = document.createElement('span');
        paymentBadge.className = 'badge bg-success me-2';
        paymentBadge.innerHTML = '<i class="bi bi-credit-card"></i> Оплачено';
        actionsDiv.prepend(paymentBadge);
    }
}

// Вспомогательные функции
function getSeatClassName(seatClass) {
    const classes = {
        'economy': 'Эконом класс',
        'business': 'Бизнес класс',
        'first_class': 'Первый класс'
    };
    return classes[seatClass] || seatClass;
}

function getStatusName(status) {
    const statuses = {
        'confirmed': 'Подтверждено',
        'cancelled': 'Отменено',
        'completed': 'Завершено'
    };
    return statuses[status] || status;
}

function getStatusBadgeClass(status) {
    const classes = {
        'confirmed': 'bg-success',
        'cancelled': 'bg-danger',
        'completed': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
}

function getPaymentMethodName(method) {
    const methods = {
        'credit_card': 'Кредитная карта',
        'paypal': 'PayPal',
        'cash': 'Наличные'
    };
    return methods[method] || method;
}

function formatDate(dateString) {
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
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        return dateString;
    }
}

// Функция для проверки возможности апгрейда
function checkUpgradeEligibility(booking) {
    if (!booking || !booking.flight) return false;

    // Нельзя апгрейдить отмененные или завершенные бронирования
    if (booking.booking_status !== 'confirmed') return false;

    const now = new Date();
    const departureTime = new Date(booking.flight.departure_time);
    const hoursUntilFlight = (departureTime - now) / (1000 * 60 * 60);

    // Нельзя апгрейдить за 3 часа до вылета
    if (hoursUntilFlight < 3) return false;

    // Проверяем текущий класс и доступность более высоких классов
    const seatClasses = ['economy', 'business', 'first_class'];
    const currentClassIndex = seatClasses.indexOf(booking.seat_class);

    // Если уже первый класс - апгрейд невозможен
    if (currentClassIndex >= seatClasses.length - 1) return false;

    return {
        eligible: true,
        currentClass: booking.seat_class,
        currentClassIndex: currentClassIndex,
        availableUpgrades: []
    };
}

// Функция для получения доступных апгрейдов
async function getAvailableUpgrades(bookingId) {
    try {
        const response = await api.get(`/bookings/${bookingId}/upgrade-options`);
        return response;
    } catch (error) {
        console.error('Ошибка получения опций апгрейда:', error);

        // Возвращаем заглушку для демонстрации
        return {
            booking_id: bookingId,
            current_class: 'economy',
            available_upgrades: [
                {
                    target_class: 'business',
                    price_difference: 15000,
                    description: 'Апгрейд до бизнес-класса'
                },
                {
                    target_class: 'first_class',
                    price_difference: 35000,
                    description: 'Апгрейд до первого класса'
                }
            ]
        };
    }
}

// Функция для отображения модального окна апгрейда
async function showUpgradeModal(bookingId) {
    try {
        // Получаем информацию о бронировании
        const booking = await api.getBooking(bookingId);

        // Проверяем возможность апгрейда
        const eligibility = checkUpgradeEligibility(booking);
        if (!eligibility.eligible) {
            showAlert('Апгрейд для этого бронирования недоступен', 'warning');
            return;
        }

        // Получаем доступные опции апгрейда
        const upgradeOptions = await getAvailableUpgrades(bookingId);

        // Создаем HTML для модального окна
        const modalHtml = `
            <div class="modal fade" id="upgrade-modal-${bookingId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="bi bi-arrow-up-circle-fill me-2"></i>
                                Докупить уровень билета
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Информация о текущем бронировании -->
                            <div class="card mb-3">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0">Текущее бронирование</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>Номер:</strong> ${booking.booking_reference}</p>
                                            <p><strong>Рейс:</strong> ${booking.flight.departure_airport} → ${booking.flight.arrival_airport}</p>
                                            <p><strong>Вылет:</strong> ${formatDateTime(booking.flight.departure_time)}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>Текущий класс:</strong>
                                                <span class="badge ${getSeatClassBadge(booking.seat_class)}">
                                                    ${getSeatClassName(booking.seat_class)}
                                                </span>
                                            </p>
                                            <p><strong>Пассажиров:</strong> ${booking.passengers_count}</p>
                                            <p><strong>Оплачено:</strong> ${booking.total_price} ₽</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Доступные апгрейды -->
                            <h6 class="mb-3">Доступные варианты:</h6>
                            <div class="row" id="upgrade-options-${bookingId}">
                                ${upgradeOptions.available_upgrades.map((option, index) => `
                                    <div class="col-md-6 mb-3">
                                        <div class="card upgrade-option h-100 ${index === 0 ? 'border-warning' : ''}"
                                             onclick="selectUpgradeOption('${bookingId}', '${option.target_class}', ${option.price_difference})"
                                             style="cursor: pointer;">
                                            <div class="card-body text-center">
                                                <div class="mb-3">
                                                    <span class="badge ${getSeatClassBadge(option.target_class)} fs-6">
                                                        ${getSeatClassName(option.target_class)}
                                                    </span>
                                                </div>
                                                <h4 class="text-warning fw-bold">
                                                    +${option.price_difference.toLocaleString('ru-RU')} ₽
                                                </h4>
                                                <p class="text-muted mb-2">${option.description}</p>
                                                <div class="upgrade-benefits">
                                                    ${getUpgradeBenefits(option.target_class)}
                                                </div>
                                            </div>
                                            <div class="card-footer text-center">
                                                <small class="text-muted">
                                                    <i class="bi bi-check-circle text-success"></i>
                                                    ${index === 0 ? 'Рекомендуемый вариант' : 'Премиум уровень'}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Информация о выбранном апгрейде -->
                            <div class="card mt-3" id="selected-upgrade-info-${bookingId}" style="display: none;">
                                <div class="card-header bg-success text-white">
                                    <h6 class="mb-0">Выбранный апгрейд</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>Новый класс:</strong> <span id="selected-class-${bookingId}"></span></p>
                                            <p><strong>Доплата:</strong> <span id="selected-price-${bookingId}" class="fw-bold text-success"></span></p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>Итоговая стоимость:</strong> <span id="total-price-${bookingId}" class="fw-bold"></span></p>
                                            <p><strong>Сохранение данных:</strong>
                                                <i class="bi bi-check-circle text-success"></i> Все данные остаются
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> Отмена
                            </button>
                            <button type="button" class="btn btn-warning"
                                    id="confirm-upgrade-btn-${bookingId}"
                                    disabled
                                    onclick="confirmUpgrade('${bookingId}')">
                                <i class="bi bi-arrow-up-circle"></i> Докупить уровень
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Удаляем старую модалку если есть
        const oldModal = document.getElementById(`upgrade-modal-${bookingId}`);
        if (oldModal) oldModal.remove();

        // Добавляем новую модалку
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Показываем модалку
        const modal = new bootstrap.Modal(document.getElementById(`upgrade-modal-${bookingId}`));
        modal.show();

    } catch (error) {
        console.error('Ошибка открытия апгрейда:', error);
        showAlert(`Ошибка загрузки апгрейда: ${error.message}`, 'danger');
    }
}

// Функция для выбора опции апгрейда
function selectUpgradeOption(bookingId, targetClass, priceDifference) {
    // Убираем выделение у всех вариантов
    document.querySelectorAll(`#upgrade-options-${bookingId} .upgrade-option`).forEach(option => {
        option.classList.remove('border-warning', 'border-success');
        option.style.boxShadow = 'none';
    });

    // Выделяем выбранный вариант
    const selectedOption = event.target.closest('.upgrade-option');
    selectedOption.classList.add('border-success');
    selectedOption.style.boxShadow = '0 0 0 0.2rem rgba(25, 135, 84, 0.25)';

    // Обновляем информацию о выбранном апгрейде
    const infoDiv = document.getElementById(`selected-upgrade-info-${bookingId}`);
    const selectedClassSpan = document.getElementById(`selected-class-${bookingId}`);
    const selectedPriceSpan = document.getElementById(`selected-price-${bookingId}`);
    const totalPriceSpan = document.getElementById(`total-price-${bookingId}`);

    selectedClassSpan.textContent = getSeatClassName(targetClass);
    selectedPriceSpan.textContent = `+${priceDifference.toLocaleString('ru-RU')} ₽`;

    // Получаем исходную цену бронирования
    const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);
    const originalPrice = bookingCard ? parseFloat(bookingCard.dataset.originalPrice) : 0;
    const totalPrice = originalPrice + priceDifference;

    totalPriceSpan.textContent = `${totalPrice.toLocaleString('ru-RU')} ₽`;

    // Показываем блок с информацией
    infoDiv.style.display = 'block';

    // Активируем кнопку подтверждения
    const confirmBtn = document.getElementById(`confirm-upgrade-btn-${bookingId}`);
    confirmBtn.disabled = false;
    confirmBtn.dataset.targetClass = targetClass;
    confirmBtn.dataset.priceDifference = priceDifference;
}

// Функция для подтверждения апгрейда
async function confirmUpgrade(bookingId) {
    const confirmBtn = document.getElementById(`confirm-upgrade-btn-${bookingId}`);
    const targetClass = confirmBtn.dataset.targetClass;
    const priceDifference = parseFloat(confirmBtn.dataset.priceDifference);

    if (!targetClass || !priceDifference) {
        showAlert('Пожалуйста, выберите вариант апгрейда', 'warning');
        return;
    }

    // Показываем подтверждение
    const confirmMessage = `
        Подтвердите докупку уровня билета:

        📍 Новый класс: ${getSeatClassName(targetClass)}
        💰 Доплата: ${priceDifference.toLocaleString('ru-RU')} ₽

        Вы уверены, что хотите продолжить?
    `;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        // Показываем индикатор загрузки
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Обработка...';
        confirmBtn.disabled = true;

        // Отправляем запрос на апгрейд
        const response = await api.post(`/bookings/${bookingId}/upgrade`, {
            target_class: targetClass,
            price_difference: priceDifference
        });

        // Закрываем модальное окно
        const modalElement = document.getElementById(`upgrade-modal-${bookingId}`);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }

        // Показываем успешное сообщение
        showAlert(`
            <div class="alert alert-success">
                <h5><i class="bi bi-check-circle-fill"></i> Уровень успешно докуплен!</h5>
                <p><strong>Новый класс:</strong> ${getSeatClassName(targetClass)}</p>
                <p><strong>Доплата:</strong> ${priceDifference.toLocaleString('ru-RU')} ₽</p>
                <p><strong>ID транзакции:</strong> ${response.transaction_id || response.upgrade_id}</p>
            </div>
        `, 'success');

        // Обновляем интерфейс
        updateBookingAfterUpgrade(bookingId, targetClass, response);

        // Через 3 секунды перезагружаем бронирования
        setTimeout(() => {
            loadUserBookings();
        }, 3000);

    } catch (error) {
        console.error('Ошибка апгрейда:', error);

        // Восстанавливаем кнопку
        confirmBtn.innerHTML = '<i class="bi bi-arrow-up-circle"></i> Докупить уровень';
        confirmBtn.disabled = false;

        showAlert(`Ошибка докупки уровня: ${error.message}`, 'danger');
    }
}

// Функция для обновления карточки после апгрейда
function updateBookingAfterUpgrade(bookingId, newClass, upgradeData) {
    const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);
    if (!bookingCard) return;

    // Обновляем информацию о классе
    const classBadge = bookingCard.querySelector('.badge[class*="seat-class-"]');
    if (classBadge) {
        classBadge.className = `badge ${getSeatClassBadge(newClass)} me-1`;
        classBadge.textContent = getSeatClassName(newClass);
    }

    // Обновляем информацию о платеже
    const paymentInfo = bookingCard.querySelector('#payment-info');
    if (paymentInfo) {
        paymentInfo.innerHTML += `
            <div class="text-info mt-2">
                <i class="bi bi-arrow-up-circle-fill"></i> <strong>Апгрейд до ${getSeatClassName(newClass)}</strong>
                <div class="text-muted small">
                    Доплата: ${upgradeData.price_difference} ₽<br>
                    ID: ${upgradeData.upgrade_id || upgradeData.transaction_id}
                </div>
            </div>
        `;
    }

    // Добавляем бейдж апгрейда
    const actionsDiv = bookingCard.querySelector('.col-md-4.text-end');
    if (actionsDiv) {
        const upgradeBadge = document.createElement('span');
        upgradeBadge.className = 'badge bg-info me-2';
        upgradeBadge.innerHTML = '<i class="bi bi-arrow-up-circle"></i> Апгрейд';
        upgradeBadge.title = `Докуплен до ${getSeatClassName(newClass)}`;
        actionsDiv.prepend(upgradeBadge);
    }

    // Обновляем стиль карточки
    bookingCard.style.borderLeft = '4px solid #17a2b8';
    bookingCard.style.backgroundColor = 'rgba(23, 162, 184, 0.05)';
}

// Вспомогательные функции
function getSeatClassBadge(seatClass) {
    const badges = {
        'economy': 'bg-success',
        'business': 'bg-warning text-dark',
        'first_class': 'bg-danger'
    };
    return badges[seatClass] || 'bg-secondary';
}

function getUpgradeBenefits(seatClass) {
    const benefits = {
        'economy': `
            <ul class="list-unstyled small">
                <li><i class="bi bi-check text-success"></i> Стандартные места</li>
                <li><i class="bi bi-check text-success"></i> Бесплатный напиток</li>
            </ul>
        `,
        'business': `
            <ul class="list-unstyled small">
                <li><i class="bi bi-check text-success"></i> Широкие кресла</li>
                <li><i class="bi bi-check text-success"></i> Приоритетная посадка</li>
                <li><i class="bi bi-check text-success"></i> Премиум питание</li>
                <li><i class="bi bi-check text-success"></i> Доп. багаж</li>
            </ul>
        `,
        'first_class': `
            <ul class="list-unstyled small">
                <li><i class="bi bi-check text-success"></i> Люксовые кресла</li>
                <li><i class="bi bi-check text-success"></i> Персональный сервис</li>
                <li><i class="bi bi-check text-success"></i> Шампанское</li>
                <li><i class="bi bi-check text-success"></i> VIP-лаунж</li>
                <li><i class="bi bi-check text-success"></i> Лимузин до самолета</li>
            </ul>
        `
    };
    return benefits[seatClass] || '';
}


// Функция для отображения деталей бронирования
// Исправленная функция showBookingDetails
async function showBookingDetails(bookingId) {
    console.log('🔍 Показываю детали бронирования:', bookingId);

    try {
        // Получаем информацию о бронировании из API
        const booking = await api.getBooking(bookingId);

        if (!booking) {
            showAlert('Бронирование не найдено', 'danger');
            return;
        }

        console.log('📋 Получены данные бронирования:', booking);

        // Загружаем дополнительную информацию о рейсе, если есть flight_id
        let flightInfo = null;
        if (booking.flight_id) {
            try {
                // ПРАВИЛЬНО: передаем числовой flight_id
                flightInfo = await api.getFlight(booking.flight_id);
                console.log('✈️ Получена информация о рейсе:', flightInfo);
            } catch (flightError) {
                console.warn('Не удалось загрузить информацию о рейсе:', flightError);
            }
        } else {
            console.warn('У бронирования нет flight_id:', booking);
        }

        // Объединяем данные
        const fullBookingInfo = {
            ...booking,
            flight: flightInfo,
            // Добавляем отсутствующие поля для совместимости
            seat_class: booking.seat_class || 'economy',
            passengers_count: booking.passengers_count || 1,
            special_requests: booking.special_requests || '',
            // Форматируем даты
            formatted_booking_date: formatDate(booking.booking_date),
            formatted_seat_class: getSeatClassName(booking.seat_class || 'economy')
        };

        // Создаем и показываем модальное окно
        createBookingDetailsModal(bookingId, fullBookingInfo);

    } catch (error) {
        console.error('Ошибка загрузки деталей бронирования:', error);
        showAlert(`Не удалось загрузить детали бронирования: ${error.message}`, 'danger');

        // Показываем простую версию при ошибке
        showSimpleBookingDetails(bookingId);
    }
}

// Функция создания модального окна (оптимизированная для текущего API)
function createBookingDetailsModal(bookingId, booking) {
    console.log('🎨 Создаю модальное окно с данными:', booking);

    // Проверяем данные на шаблонные строки
    checkForTemplateStrings(booking, 'booking');

    // Форматируем flight_id для отображения
    const flightId = booking.flight_id;
    const hasFlightInfo = booking.flight && booking.flight.id;

    const modalHtml = `
        <div class="modal fade" id="booking-details-${bookingId}" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-ticket-detailed me-2"></i>
                            Детали бронирования
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <!-- Заголовок -->
                            <div class="row mb-4">
                                <div class="col-12">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h4 class="mb-0">${booking.booking_reference || `Бронирование #${bookingId}`}</h4>
                                        <span class="badge ${getStatusBadgeClass(booking.booking_status)} fs-6">
                                            ${getStatusName(booking.booking_status)}
                                        </span>
                                    </div>
                                    ${booking.booking_date ? `
                                        <small class="text-muted">
                                            <i class="bi bi-calendar me-1"></i>
                                            Создано: ${formatDate(booking.booking_date)}
                                        </small>
                                    ` : ''}
                                    ${flightId ? `
                                        <small class="text-muted d-block">
                                            <i class="bi bi-airplane me-1"></i>
                                            ID рейса: ${flightId}
                                        </small>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Информация о рейсе -->
                            <div class="row mb-3">
                                <div class="col-12">
                                    ${createFlightInfoCard(booking, hasFlightInfo)}
                                </div>
                            </div>

                            <!-- Остальной код модального окна без изменений -->
                            <!-- ... -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку если есть
    const oldModal = document.getElementById(`booking-details-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`booking-details-${bookingId}`));
    modal.show();
}

// Обновленная функция создания карточки информации о рейсе
function createFlightInfoCard(booking, hasFlightInfo) {
    const flightId = booking.flight_id;

    if (!hasFlightInfo) {
        return `
            <div class="card">
                <div class="card-header bg-light">
                    <h6 class="mb-0"><i class="bi bi-airplane me-2"></i>Информация о рейсе</h6>
                </div>
                <div class="card-body">
                    ${flightId ? `
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Информация о рейсе недоступна
                            <div class="mt-2">
                                <small class="text-muted">
                                    ID рейса: ${flightId}<br>
                                    Причина: Ошибка загрузки данных
                                </small>
                                <button class="btn btn-sm btn-outline-primary mt-2" onclick="retryLoadFlight(${booking.id}, ${flightId})">
                                    <i class="bi bi-arrow-clockwise"></i> Повторить загрузку
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            Информация о рейсе не указана
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // Код для отображения информации о рейсе, если она есть
    return `
        <div class="card">
            <div class="card-header bg-light">
                <h6 class="mb-0"><i class="bi bi-airplane me-2"></i>Информация о рейсе</h6>
            </div>
            <div class="card-body">
                <!-- Существующий код отображения рейса -->
                <!-- ... -->
            </div>
        </div>
    `;
}

// Функция для повторной загрузки информации о рейсе
window.retryLoadFlight = async function(bookingId, flightId) {
    console.log('🔄 Повторная загрузка рейса:', flightId, 'для бронирования:', bookingId);

    try {
        const flightInfo = await api.getFlight(flightId);
        console.log('✅ Повторная загрузка успешна:', flightInfo);

        // Обновляем информацию в модальном окне
        const modalBody = document.querySelector(`#booking-details-${bookingId} .modal-body`);
        if (modalBody && flightInfo) {
            // Находим карточку с информацией о рейсе и обновляем ее
            const flightCard = modalBody.querySelector('.card:has(.card-header:contains("Информация о рейсе"))');
            if (flightCard) {
                // Здесь можно обновить содержимое карточки
                showAlert('Информация о рейсе успешно загружена!', 'success');

                // Перезагружаем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById(`booking-details-${bookingId}`));
                if (modal) {
                    modal.hide();
                    setTimeout(() => showBookingDetails(bookingId), 500);
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка при повторной загрузке:', error);
        showAlert(`Не удалось загрузить информацию о рейсе: ${error.message}`, 'danger');
    }
};

// Создание карточки информации об оплате
function createPaymentInfoCard(booking) {
    const payment = booking.payment;
    if (!payment) return '';

    const isPaid = payment.payment_status === 'completed';
    const cardClass = isPaid ? 'border-success' : 'border-warning';
    const headerClass = isPaid ? 'bg-success text-white' : 'bg-warning';
    const statusText = isPaid ? 'Оплачено' : 'Ожидает оплаты';
    const statusIcon = isPaid ? 'bi-check-circle-fill' : 'bi-clock';
    const statusColor = isPaid ? 'text-success' : 'text-warning';

    return `
        <div class="row mt-3">
            <div class="col-12">
                <div class="card ${cardClass}">
                    <div class="card-header ${headerClass}">
                        <h6 class="mb-0"><i class="bi bi-credit-card me-2"></i>Информация об оплате</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <small class="text-muted d-block">Статус:</small>
                                <strong class="${statusColor}">
                                    <i class="bi ${statusIcon} me-1"></i>${statusText}
                                </strong>
                            </div>

                            ${payment.payment_method ? `
                                <div class="col-md-3 mb-3">
                                    <small class="text-muted d-block">Способ оплаты:</small>
                                    <strong>${getPaymentMethodName(payment.payment_method)}</strong>
                                </div>
                            ` : ''}

                            ${payment.amount ? `
                                <div class="col-md-3 mb-3">
                                    <small class="text-muted d-block">Сумма:</small>
                                    <strong class="text-success">${payment.amount} ₽</strong>
                                </div>
                            ` : ''}

                            ${payment.payment_date ? `
                                <div class="col-md-3 mb-3">
                                    <small class="text-muted d-block">Дата оплаты:</small>
                                    <strong>${formatDate(payment.payment_date)}</strong>
                                </div>
                            ` : ''}
                        </div>

                        ${payment.transaction_id ? `
                            <div class="row">
                                <div class="col-12">
                                    <small class="text-muted d-block">ID транзакции:</small>
                                    <div class="bg-light p-2 rounded">
                                        <code class="small">${payment.transaction_id}</code>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Создание карточки особых пожеланий
function createSpecialRequestsCard(booking) {
    return `
        <div class="row mt-3">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-light">
                        <h6 class="mb-0"><i class="bi bi-chat-left-text me-2"></i>Особые пожелания</h6>
                    </div>
                    <div class="card-body">
                        <div class="bg-light p-3 rounded">
                            <p class="mb-0">${booking.special_requests}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Создание таймлайна истории
function createHistoryTimeline(booking) {
    const items = [];

    if (booking.booking_date) {
        items.push({
            icon: 'bi-check-circle',
            color: 'text-success',
            title: 'Бронирование создано',
            date: booking.booking_date
        });
    }

    if (booking.payment && booking.payment.payment_date) {
        items.push({
            icon: 'bi-cash-coin',
            color: 'text-primary',
            title: 'Оплачено',
            date: booking.payment.payment_date
        });
    }

    if (items.length === 0) return '';

    return `
        <div class="mt-3">
            <small class="text-muted d-block mb-2">История событий:</small>
            <div class="timeline">
                ${items.map((item, index) => `
                    <div class="timeline-item ${index === items.length - 1 ? 'last' : ''}">
                        <div class="timeline-marker">
                            <i class="bi ${item.icon} ${item.color}"></i>
                        </div>
                        <div class="timeline-content">
                            <strong>${item.title}</strong>
                            <div class="text-muted small">${formatDate(item.date)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Простая версия деталей бронирования (для ошибок)
function showSimpleBookingDetails(bookingId) {
    const modalHtml = `
        <div class="modal fade" id="booking-details-${bookingId}" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Детали бронирования #${bookingId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            Не удалось загрузить полную информацию о бронировании.
                        </div>
                        <p>Основная информация:</p>
                        <ul>
                            <li>ID бронирования: ${bookingId}</li>
                            <li>Статус: Неизвестно</li>
                        </ul>
                        <p class="mb-0">Попробуйте обновить страницу или обратиться в поддержку.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку если есть
    const oldModal = document.getElementById(`booking-details-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`booking-details-${bookingId}`));
    modal.show();
}

// Функция печати (обновленная)
function printBookingDetails(bookingId, bookingData) {
    try {
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <html>
            <head>
                <title>Бронирование ${bookingData.booking_reference || `#${bookingId}`}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
                    .header h1 { color: #007bff; margin-bottom: 10px; }
                    .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                    .section h3 { color: #555; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                    .info-item { margin-bottom: 10px; }
                    .label { font-weight: bold; color: #666; display: inline-block; min-width: 150px; }
                    .value { color: #333; }
                    .badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin: 2px; }
                    .badge-success { background-color: #28a745; color: white; }
                    .badge-warning { background-color: #ffc107; color: black; }
                    .badge-danger { background-color: #dc3545; color: white; }
                    .badge-primary { background-color: #007bff; color: white; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
                    .company { font-size: 24px; font-weight: bold; color: #007bff; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">Авиасистема</div>
                    <h1>Бронирование ${bookingData.booking_reference || `#${bookingId}`}</h1>
                    <p>Документ сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
                </div>

                <div class="section">
                    <h3>Основная информация</h3>
                    <div class="info-grid">
                        ${bookingData.booking_reference ? `
                            <div class="info-item">
                                <span class="label">Номер бронирования:</span>
                                <span class="value">${bookingData.booking_reference}</span>
                            </div>
                        ` : ''}

                        ${bookingData.booking_date ? `
                            <div class="info-item">
                                <span class="label">Дата создания:</span>
                                <span class="value">${formatDate(bookingData.booking_date)}</span>
                            </div>
                        ` : ''}

                        ${bookingData.booking_status ? `
                            <div class="info-item">
                                <span class="label">Статус:</span>
                                <span class="value badge ${getStatusBadgeClass(bookingData.booking_status)}">
                                    ${getStatusName(bookingData.booking_status)}
                                </span>
                            </div>
                        ` : ''}

                        ${bookingData.seat_class ? `
                            <div class="info-item">
                                <span class="label">Класс:</span>
                                <span class="value">${getSeatClassName(bookingData.seat_class)}</span>
                            </div>
                        ` : ''}

                        ${bookingData.passengers_count ? `
                            <div class="info-item">
                                <span class="label">Пассажиров:</span>
                                <span class="value">${bookingData.passengers_count}</span>
                            </div>
                        ` : ''}

                        ${bookingData.total_price ? `
                            <div class="info-item">
                                <span class="label">Стоимость:</span>
                                <span class="value">${bookingData.total_price} ₽</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${bookingData.payment ? `
                    <div class="section">
                        <h3>Информация об оплате</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Статус оплаты:</span>
                                <span class="value">${bookingData.payment.payment_status === 'completed' ? 'Оплачено' : 'Ожидает оплаты'}</span>
                            </div>

                            ${bookingData.payment.payment_method ? `
                                <div class="info-item">
                                    <span class="label">Способ оплаты:</span>
                                    <span class="value">${getPaymentMethodName(bookingData.payment.payment_method)}</span>
                                </div>
                            ` : ''}

                            ${bookingData.payment.amount ? `
                                <div class="info-item">
                                    <span class="label">Сумма:</span>
                                    <span class="value">${bookingData.payment.amount} ₽</span>
                                </div>
                            ` : ''}

                            ${bookingData.payment.payment_date ? `
                                <div class="info-item">
                                    <span class="label">Дата оплаты:</span>
                                    <span class="value">${formatDate(bookingData.payment.payment_date)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="section">
                    <h3>Рекомендации</h3>
                    <p>• Прибывайте в аэропорт за 2 часа до вылета</p>
                    <p>• Имейте при себе документ, удостоверяющий личность</p>
                    <p>• Сохраните этот документ для предъявления при регистрации</p>
                </div>

                <div class="footer">
                    <p>Документ сгенерирован системой Авиасистема</p>
                    <p>По вопросам обращайтесь: support@aviasystem.ru | 8-800-555-35-35</p>
                    <p class="no-print">Для возврата к системе закройте это окно</p>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();

        // Даем время на загрузку контента
        setTimeout(() => {
            printWindow.print();
        }, 500);

    } catch (error) {
        console.error('Ошибка печати:', error);
        showAlert('Ошибка при печати документа. Пожалуйста, используйте Ctrl+P.', 'danger');
    }
}

// Функция расчета длительности полета
function calculateFlightDuration(departureTime, arrivalTime) {
    if (!departureTime || !arrivalTime) return 'Не указано';

    try {
        const departure = new Date(departureTime);
        const arrival = new Date(arrivalTime);
        const duration = arrival - departure;

        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}ч ${minutes}м`;
    } catch (error) {
        console.error('Ошибка расчета длительности:', error);
        return 'Ошибка расчета';
    }
}

// Функция для получения названия метода оплаты
function getPaymentMethodName(method) {
    if (!method) return 'Не указан';

    const methods = {
        'credit_card': 'Кредитная карта',
        'paypal': 'PayPal',
        'cash': 'Наличные',
        'card': 'Банковская карта',
        'bank_transfer': 'Банковский перевод'
    };
    return methods[method] || method;
}
// Функция для загрузки информации о рейсе - ИСПРАВЛЕННАЯ
async function loadFlightInfo(flightId) {
    console.log('🔄 Загружаю информацию о рейсе ID:', flightId, 'тип:', typeof flightId);

    // Проверяем, что flightId - валидное число
    const numericId = parseInt(flightId);
    if (isNaN(numericId) || numericId <= 0) {
        console.warn('❌ Некорректный ID рейса:', flightId);
        return null;
    }

    try {
        // Используем исправленный метод API
        const flight = await api.getFlight(numericId);
        console.log('✅ Получена информация о рейсе:', flight);
        return flight;
    } catch (error) {
        console.warn('❌ Не удалось загрузить информацию о рейсе:', error);
        return null;
    }
}

// Функция для загрузки информации о пассажирах
async function loadPassengersInfo(bookingId) {
    try {
        // Пробуем получить пассажиров из API
        // Временная заглушка - на реальном проекте должен быть endpoint /bookings/{id}/passengers
        return [];
    } catch (error) {
        console.warn('Не удалось загрузить информацию о пассажирах:', error);
        return [];
    }
}

// Функция создания модального окна
function createBookingDetailsModal(bookingId, booking) {
    // Форматируем данные
    const formattedData = formatBookingDetailsForDisplay(booking);

    const modalHtml = `
        <div class="modal fade" id="booking-details-${bookingId}" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-ticket-detailed me-2"></i>
                            Детали бронирования
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <!-- Заголовок -->
                            <div class="row mb-4">
                                <div class="col-12">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h4 class="mb-0">${booking.booking_reference || `Бронирование #${bookingId}`}</h4>
                                        <span class="badge ${getStatusBadgeClass(booking.booking_status)} fs-6">
                                            ${getStatusName(booking.booking_status)}
                                        </span>
                                    </div>
                                    ${booking.booking_date ? `
                                        <small class="text-muted">Создано: ${formatDate(booking.booking_date)}</small>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="row">
                                <!-- Левая колонка - информация о рейсе -->
                                <div class="col-md-6">
                                    ${createFlightInfoCard(booking)}
                                </div>

                                <!-- Правая колонка - детали бронирования -->
                                <div class="col-md-6">
                                    ${createBookingDetailsCard(booking)}
                                </div>
                            </div>

                            <!-- Особые пожелания -->
                            ${booking.special_requests ? createSpecialRequestsCard(booking) : ''}

                            <!-- История -->
                            ${createHistoryCard(booking)}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Закрыть
                        </button>
                        ${booking.booking_status === 'confirmed' ? `
                            <button type="button" class="btn btn-primary" onclick="printBookingDetails(${bookingId})">
                                <i class="bi bi-printer me-1"></i> Распечатать
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку если есть
    const oldModal = document.getElementById(`booking-details-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`booking-details-${bookingId}`));
    modal.show();
}

// Создание карточки информации о рейсе
function createFlightInfoCard(booking) {
    if (!booking.flight) {
        return `
            <div class="card h-100">
                <div class="card-header bg-light">
                    <h6 class="mb-0"><i class="bi bi-airplane me-2"></i>Информация о рейсе</h6>
                </div>
                <div class="card-body">
                    <div class="alert alert-warning">
                        Информация о рейсе недоступна
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="card h-100">
            <div class="card-header bg-light">
                <h6 class="mb-0"><i class="bi bi-airplane me-2"></i>Информация о рейсе</h6>
            </div>
            <div class="card-body">
                <div class="flight-info">
                    <div class="d-flex align-items-center mb-3">
                        <div class="flight-number-badge bg-primary text-white rounded px-3 py-1">
                            <strong>${booking.flight.flight_number || 'Номер не указан'}</strong>
                        </div>
                        <div class="ms-3">
                            ${booking.flight.status ? `
                                <span class="badge ${getFlightStatusClass(booking.flight.status)}">
                                    ${getFlightStatusName(booking.flight.status)}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    ${booking.flight.departure_airport && booking.flight.arrival_airport ? `
                        <div class="flight-route mb-4">
                            <div class="d-flex align-items-center">
                                <div class="text-center">
                                    <h5 class="mb-1">${booking.flight.departure_airport}</h5>
                                    ${booking.flight.departure_time ? `
                                        <div class="text-muted small">
                                            ${formatDateTime(booking.flight.departure_time)}
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="mx-4 position-relative">
                                    <i class="bi bi-arrow-right fs-4 text-primary"></i>
                                    ${booking.flight.departure_time && booking.flight.arrival_time ? `
                                        <div class="position-absolute top-50 start-50 translate-middle">
                                            <small class="bg-white px-1 text-muted">
                                                ${calculateFlightDuration(booking.flight.departure_time, booking.flight.arrival_time)}
                                            </small>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="text-center">
                                    <h5 class="mb-1">${booking.flight.arrival_airport}</h5>
                                    ${booking.flight.arrival_time ? `
                                        <div class="text-muted small">
                                            ${formatDateTime(booking.flight.arrival_time)}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="flight-meta">
                        <div class="row">
                            ${booking.flight.aircraft_type ? `
                                <div class="col-6">
                                    <small class="text-muted d-block">Самолет:</small>
                                    <strong>${booking.flight.aircraft_type}</strong>
                                </div>
                            ` : ''}
                            ${booking.flight.distance ? `
                                <div class="col-6">
                                    <small class="text-muted d-block">Расстояние:</small>
                                    <strong>${booking.flight.distance} км</strong>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Создание карточки деталей бронирования
function createBookingDetailsCard(booking) {
    const isPast = new Date(booking.flight.departure_time) < new Date();
        const canUpgrade = !isPast &&
                          booking.status === 'confirmed' &&
                          (booking.seat_class === 'economy' || booking.seat_class === 'business');
    return `
        <div class="card h-100">
            <div class="card-header bg-light">
                <h6 class="mb-0"><i class="bi bi-person-badge me-2"></i>Детали бронирования</h6>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-6">
                        <small class="text-muted d-block">Класс обслуживания:</small>
                        <strong>
                            <span class="badge ${getSeatClassBadge(booking.seat_class)}">
                                ${getSeatClassName(booking.seat_class)}
                            </span>
                        </strong>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block">Количество пассажиров:</small>
                        <strong>${booking.passengers_count || 1}</strong>
                    </div>
                </div>

                ${booking.seat_number ? `
                    <div class="row mb-3">
                        <div class="col-12">
                            <small class="text-muted d-block">Номер места:</small>
                            <strong>${booking.seat_number}</strong>
                        </div>
                    </div>
                ` : ''}

                ${booking.total_price ? `
                    <div class="row mb-3">
                        <div class="col-12">
                            <small class="text-muted d-block">Общая стоимость:</small>
                            <h4 class="text-primary">${booking.total_price} ₽</h4>
                        </div>
                    </div>
                ` : ''}

                <!-- Информация об оплате -->
                ${createPaymentInfoSection(booking)}
            </div>
        </div>
    `;
}

// Создание секции информации об оплате
function createPaymentInfoSection(booking) {
    if (!booking.payment) {
        return `
            <div class="alert alert-warning mt-3">
                <i class="bi bi-exclamation-triangle"></i> Бронирование не оплачено
            </div>
        `;
    }

    const paymentStatusClass = booking.payment.payment_status === 'completed' ?
        'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10';

    return `
        <div class="payment-info mt-3 p-3 rounded ${paymentStatusClass}">
            <h6><i class="bi bi-credit-card me-2"></i>Информация об оплате</h6>
            <div class="row">
                <div class="col-6">
                    <small class="text-muted d-block">Статус:</small>
                    <strong class="${booking.payment.payment_status === 'completed' ? 'text-success' : 'text-warning'}">
                        ${booking.payment.payment_status === 'completed' ? 'Оплачено' : 'Ожидает оплаты'}
                    </strong>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block">Способ:</small>
                    <strong>${getPaymentMethodName(booking.payment.payment_method)}</strong>
                </div>
            </div>
            ${booking.payment.transaction_id ? `
                <div class="row mt-2">
                    <div class="col-12">
                        <small class="text-muted d-block">ID транзакции:</small>
                        <code class="small">${booking.payment.transaction_id}</code>
                    </div>
                </div>
            ` : ''}
            ${booking.payment.payment_date ? `
                <div class="row mt-2">
                    <div class="col-12">
                        <small class="text-muted d-block">Дата оплаты:</small>
                        <strong>${formatDate(booking.payment.payment_date)}</strong>
                    </div>
                </div>
            ` : ''}
            ${booking.payment.amount ? `
                <div class="row mt-2">
                    <div class="col-12">
                        <small class="text-muted d-block">Сумма оплаты:</small>
                        <strong>${booking.payment.amount} ₽</strong>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Создание карточки особых пожеланий
function createSpecialRequestsCard(booking) {
    return `
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-light">
                        <h6 class="mb-0"><i class="bi bi-chat-left-text me-2"></i>Особые пожелания</h6>
                    </div>
                    <div class="card-body">
                        <p class="mb-0">${booking.special_requests}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Создание карточки истории
function createHistoryCard(booking) {
    const historyItems = [];

    if (booking.booking_date) {
        historyItems.push(`
            <li class="mb-2">
                <i class="bi bi-check-circle text-success me-2"></i>
                <strong>Создано:</strong> ${formatDate(booking.booking_date)}
            </li>
        `);
    }

    if (booking.payment && booking.payment.payment_date) {
        historyItems.push(`
            <li class="mb-2">
                <i class="bi bi-cash-coin text-primary me-2"></i>
                <strong>Оплачено:</strong> ${formatDate(booking.payment.payment_date)}
            </li>
        `);
    }

    return `
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-light">
                        <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>История</h6>
                    </div>
                    <div class="card-body">
                        <ul class="list-unstyled">
                            ${historyItems.join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Форматирование данных для отображения
function formatBookingDetailsForDisplay(booking) {
    return {
        ...booking,
        formatted_booking_date: formatDate(booking.booking_date),
        formatted_seat_class: getSeatClassName(booking.seat_class),
        seat_class_badge: getSeatClassBadge(booking.seat_class),
        status_name: getStatusName(booking.booking_status),
        status_badge: getStatusBadgeClass(booking.booking_status),
        payment_status_text: booking.payment ?
            (booking.payment.payment_status === 'completed' ? 'Оплачено' : 'Ожидает оплаты') :
            'Не оплачено'
    };
}

// ... остальные функции (calculateFlightDuration, showSimpleBookingDetails, printBookingDetails) остаются без изменений ...

// Функция для получения названия статуса рейса
function getFlightStatusName(status) {
    if (!status) return 'Неизвестно';

    const statuses = {
        'scheduled': 'По расписанию',
        'delayed': 'Задержан',
        'cancelled': 'Отменен',
        'completed': 'Завершен',
        'boarding': 'Посадка',
        'departed': 'Вылетел'
    };
    return statuses[status] || status;
}

// Функция для получения класса CSS статуса рейса
function getFlightStatusClass(status) {
    if (!status) return 'bg-secondary';

    const classes = {
        'scheduled': 'bg-success',
        'delayed': 'bg-warning',
        'cancelled': 'bg-danger',
        'completed': 'bg-secondary',
        'boarding': 'bg-info',
        'departed': 'bg-primary'
    };
    return classes[status] || 'bg-secondary';
}

// Функция для получения названия метода оплаты
function getPaymentMethodName(method) {
    if (!method) return 'Не указан';

    const methods = {
        'credit_card': 'Кредитная карта',
        'paypal': 'PayPal',
        'cash': 'Наличные'
    };
    return methods[method] || method;
}


// Функция для форматирования деталей бронирования
function formatBookingDetails(booking) {
    return {
        ...booking,
        formatted_booking_date: formatDate(booking.booking_date),
        formatted_seat_class: getSeatClassName(booking.seat_class),
        seat_class_badge: getSeatClassBadge(booking.seat_class),
        status_name: getStatusName(booking.booking_status),
        status_badge: getStatusBadgeClass(booking.booking_status)
    };
}

// Функция расчета длительности полета
function calculateFlightDuration(departureTime, arrivalTime) {
    if (!departureTime || !arrivalTime) return 'Не указано';

    try {
        const departure = new Date(departureTime);
        const arrival = new Date(arrivalTime);
        const duration = arrival - departure;

        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}ч ${minutes}м`;
    } catch (error) {
        console.error('Ошибка расчета длительности:', error);
        return 'Ошибка расчета';
    }
}

// Простая версия деталей бронирования (для ошибок)
function showSimpleBookingDetails(bookingId) {
    const modalHtml = `
        <div class="modal fade" id="booking-details-${bookingId}" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Детали бронирования #${bookingId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            Не удалось загрузить полную информацию о бронировании.
                        </div>
                        <p>Вы можете:</p>
                        <ul>
                            <li>Обновить страницу и попробовать снова</li>
                            <li>Обратиться в службу поддержки</li>
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку если есть
    const oldModal = document.getElementById(`booking-details-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`booking-details-${bookingId}`));
    modal.show();
}

// Функция печати деталей бронирования
function printBookingDetails(bookingId) {
    try {
        const modal = document.getElementById(`booking-details-${bookingId}`);
        if (!modal) {
            showAlert('Не удалось найти информацию для печати', 'warning');
            return;
        }

        // Создаем новое окно для печати
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Бронирование #${bookingId}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                    .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                    .label { font-weight: bold; color: #555; min-width: 150px; display: inline-block; }
                    .value { margin-left: 10px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .company { font-size: 24px; font-weight: bold; color: #007bff; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
                    .badge { padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                    .badge-success { background-color: #28a745; color: white; }
                    .badge-warning { background-color: #ffc107; color: black; }
                    .badge-danger { background-color: #dc3545; color: white; }
                    .badge-info { background-color: #17a2b8; color: white; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f8f9fa; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">Авиасистема</div>
                    <div>Детали бронирования</div>
                    <div><small>Распечатано: ${new Date().toLocaleString('ru-RU')}</small></div>
                </div>

                <div class="section">
                    <h2>Основная информация</h2>
                    <p><span class="label">Номер бронирования:</span><span class="value">${bookingId}</span></p>
                    <p><span class="label">Дата создания:</span><span class="value">${new Date().toLocaleDateString('ru-RU')}</span></p>
                    <p><span class="label">Статус:</span><span class="badge badge-success">Подтверждено</span></p>
                </div>

                <div class="section">
                    <h2>Рекомендация</h2>
                    <p>Сохраните эту информацию для предъявления при регистрации на рейс.</p>
                    <p>Прибывайте в аэропорт за 2 часа до вылета.</p>
                </div>

                <div class="footer">
                    <p>Документ сгенерирован системой Авиасистема</p>
                    <p>По вопросам обращайтесь по телефону: 8-800-555-35-35</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();

    } catch (error) {
        console.error('Ошибка печати:', error);
        showAlert('Ошибка при печати документа', 'danger');
    }
}

// Функция для получения названия статуса рейса (если нет в flights.js)
function getFlightStatusName(status) {
    const statuses = {
        'scheduled': 'По расписанию',
        'delayed': 'Задержан',
        'cancelled': 'Отменен',
        'completed': 'Завершен',
        'boarding': 'Посадка',
        'departed': 'Вылетел'
    };
    return statuses[status] || status;
}

// Функция для получения класса CSS статуса рейса
function getFlightStatusClass(status) {
    const classes = {
        'scheduled': 'bg-success',
        'delayed': 'bg-warning',
        'cancelled': 'bg-danger',
        'completed': 'bg-secondary',
        'boarding': 'bg-info',
        'departed': 'bg-primary'
    };
    return classes[status] || 'bg-secondary';
}

// Добавьте в bookings.js
function quickUpgradeToBusiness(bookingId) {
    if (!confirm('Вы уверены, что хотите выполнить апгрейд до бизнес-класса?')) {
        return;
    }

    const upgradeData = {
        new_class: 'business',
        confirm: true
    };

    const button = event.target;
    const originalText = button.innerHTML;

    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Апгрейд...';
    button.disabled = true;

    api.upgradeBooking(bookingId, upgradeData)
        .then(response => {
            showAlert('Апгрейд до бизнес-класса выполнен успешно!', 'success');
            loadUserBookings(); // Обновить список бронирований
        })
        .catch(error => {
            console.error('Ошибка апгрейда:', error);
            showAlert(`Ошибка апгрейда: ${error.message}`, 'danger');
        })
        .finally(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        });
}

// Добавьте функцию для расчета стоимости багажа
function calculateLuggagePrice(luggageType, weight = 0) {
    const pricing = {
        'none': { base: 0, perKg: 0 },
        'hand': { base: 0, perKg: 0, maxWeight: 10 },
        'checked': { base: 1000, perKg: 500 },
        'business': { base: 2000, perKg: 1000, maxWeight: 32 },
        'premium': { base: 3000, perKg: 1500, maxWeight: 50 }
    };

    const priceInfo = pricing[luggageType] || pricing.none;

    if (luggageType === 'none') return 0;

    let price = priceInfo.base;

    if (weight > 0) {
        const weightToCharge = Math.max(0, weight - (priceInfo.maxWeight || 0));
        price += weightToCharge * priceInfo.perKg;
    }

    return price;
}

// Функция для отображения выбора багажа
function showLuggageSelectionModal(bookingId, currentBooking = null) {
    const modalHtml = `
        <div class="modal fade" id="luggage-modal-${bookingId}" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-suitcase me-2"></i>
                            Выбор багажа
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            В стоимость билета включена ручная кладь до 10 кг
                        </div>

                        <div class="row" id="luggage-options-${bookingId}">
                            <div class="col-md-4 mb-3">
                                <div class="card h-100 luggage-option ${!currentBooking?.luggage || currentBooking.luggage.length === 0 ? 'border-primary' : ''}"
                                     onclick="selectLuggageOption('${bookingId}', 'none', 0)">
                                    <div class="card-body text-center">
                                        <div class="mb-3">
                                            <i class="bi bi-x-circle fs-1 text-secondary"></i>
                                        </div>
                                        <h5>Без багажа</h5>
                                        <p class="text-muted">Только ручная кладь</p>
                                        <h3 class="text-success">0 ₽</h3>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4 mb-3">
                                <div class="card h-100 luggage-option"
                                     onclick="selectLuggageOption('${bookingId}', 'checked', 20)">
                                    <div class="card-body text-center">
                                        <div class="mb-3">
                                            <i class="bi bi-suitcase fs-1 text-primary"></i>
                                        </div>
                                        <h5>Обычный багаж</h5>
                                        <p class="text-muted">20 кг регистрируемого багажа</p>
                                        <h3 class="text-success">1,000 ₽</h3>
                                        <small class="text-muted">+500 ₽/кг сверх нормы</small>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-4 mb-3">
                                <div class="card h-100 luggage-option"
                                     onclick="selectLuggageOption('${bookingId}', 'business', 32)">
                                    <div class="card-body text-center">
                                        <div class="mb-3">
                                            <i class="bi bi-stars fs-1 text-warning"></i>
                                        </div>
                                        <h5>Бизнес багаж</h5>
                                        <p class="text-muted">32 кг с приоритетной выдачей</p>
                                        <h3 class="text-success">2,000 ₽</h3>
                                        <small class="text-muted">+1,000 ₽/кг сверх нормы</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Дополнительный вес -->
                        <div class="row mt-4" id="extra-weight-section-${bookingId}" style="display: none;">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">
                                        <h6>Дополнительный вес</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <label class="form-label">Вес багажа (кг)</label>
                                            <input type="range" class="form-range" min="1" max="50"
                                                   value="20" id="luggage-weight-${bookingId}"
                                                   oninput="updateLuggagePrice('${bookingId}')">
                                            <div class="d-flex justify-content-between">
                                                <small>1 кг</small>
                                                <span id="current-weight-${bookingId}" class="fw-bold">20 кг</span>
                                                <small>50 кг</small>
                                            </div>
                                        </div>

                                        <div class="alert alert-warning">
                                            <small>
                                                <i class="bi bi-exclamation-triangle"></i>
                                                Вес свыше 32 кг требует специального согласования
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Особые требования -->
                        <div class="row mt-3">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">
                                        <h6>Особые требования к багажу</h6>
                                    </div>
                                    <div class="card-body">
                                        <textarea class="form-control" rows="3"
                                                  id="luggage-requirements-${bookingId}"
                                                  placeholder="Например: Хрупкий груз, спортивное снаряжение, музыкальные инструменты..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Итоговая стоимость -->
                        <div class="row mt-4">
                            <div class="col-12">
                                <div class="card border-success">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 class="mb-1">Итоговая стоимость багажа</h5>
                                                <small id="luggage-description-${bookingId}" class="text-muted"></small>
                                            </div>
                                            <h3 id="total-luggage-price-${bookingId}" class="text-success mb-0">0 ₽</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Отмена
                        </button>
                        <button type="button" class="btn btn-primary"
                                id="confirm-luggage-btn-${bookingId}"
                                onclick="confirmLuggageSelection('${bookingId}')"
                                disabled>
                            <i class="bi bi-check-circle"></i> Добавить багаж
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку если есть
    const oldModal = document.getElementById(`luggage-modal-${bookingId}`);
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById(`luggage-modal-${bookingId}`));
    modal.show();
}

// Функция для обновления информации о багаже в интерфейсе бронирования
function updateBookingWithLuggage(bookingId, luggageData) {
    const bookingCard = document.querySelector(`.booking-card[data-booking-id="${bookingId}"]`);

    if (!bookingCard) return;

    // Добавляем информацию о багаже
    const luggageInfo = document.createElement('div');
    luggageInfo.className = 'luggage-info mt-2';
    luggageInfo.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-suitcase text-primary me-2"></i>
            <div>
                <strong>Багаж:</strong>
                ${luggageData.map(item => `
                    <span class="badge bg-info me-1">
                        ${getLuggageTypeName(item.luggage_type)} (${item.weight}кг)
                    </span>
                `).join('')}
                <small class="text-muted d-block">
                    Доп. стоимость: ${luggageData.reduce((sum, item) => sum + item.price, 0)} ₽
                </small>
            </div>
        </div>
    `;

    // Находим место для вставки (перед кнопками действий)
    const actionsDiv = bookingCard.querySelector('.text-end');
    if (actionsDiv) {
        bookingCard.querySelector('.card-body').insertBefore(luggageInfo, actionsDiv.parentNode);
    }
}

// ДОБАВИТЬ в bookings.js или создать luggage.js

// Функция для расчета стоимости багажа
function calculateLuggagePrice(luggageType, weight = 0) {
    const pricing = {
        'none': { base: 0, perKg: 0, freeWeight: 0 },
        'hand': { base: 0, perKg: 0, freeWeight: 10 },
        'checked': { base: 1000, perKg: 500, freeWeight: 20 },
        'business': { base: 2000, perKg: 1000, freeWeight: 32 },
        'premium': { base: 3000, perKg: 1500, freeWeight: 50 }
    };

    const priceInfo = pricing[luggageType.toLowerCase()] || pricing.none;

    if (weight <= priceInfo.freeWeight) {
        return priceInfo.base;
    } else {
        const extraWeight = weight - priceInfo.freeWeight;
        return priceInfo.base + (extraWeight * priceInfo.perKg);
    }
}

// Функция для получения названия типа багажа
function getLuggageTypeName(type) {
    const names = {
        'none': 'Без багажа',
        'hand': 'Ручная кладь',
        'checked': 'Обычный багаж',
        'business': 'Бизнес багаж',
        'premium': 'Премиум багаж'
    };
    return names[type.toLowerCase()] || type;
}

// Функция для отображения модального окна выбора багажа
async function showLuggageModal(bookingId, currentLuggage = []) {
    try {
        // Получаем информацию о ценах
        const response = await fetch(`${API_CONFIG.BASE_URL}/luggage/pricing`);
        const pricing = await response.json();

        // Создаем модальное окно
        const modalHtml = `
            <div class="modal fade" id="luggage-modal-${bookingId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-suitcase me-2"></i>
                                Управление багажом
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i>
                                ${pricing.default_hand_luggage.description}
                            </div>

                            <h6 class="mt-3 mb-3">Дополнительные варианты багажа:</h6>
                            <div class="row" id="luggage-options-${bookingId}">
                                ${pricing.additional_options.map((option, index) => `
                                    <div class="col-md-6 mb-3">
                                        <div class="card luggage-option h-100"
                                             onclick="selectLuggageOption('${bookingId}', '${option.luggage_type}', ${option.max_weight || 0})">
                                            <div class="card-body text-center">
                                                <div class="mb-3">
                                                    <i class="bi bi-suitcase fs-1 ${index === 0 ? 'text-primary' : 'text-warning'}"></i>
                                                </div>
                                                <h5>${getLuggageTypeName(option.luggage_type)}</h5>
                                                <p class="text-muted">${option.description}</p>
                                                <h4 class="text-success">${option.price_per_kg} ₽/кг</h4>
                                                ${option.max_weight ? `<small>До ${option.max_weight} кг</small>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Вес багажа -->
                            <div class="row mt-4" id="luggage-weight-section-${bookingId}">
                                <div class="col-md-6">
                                    <label class="form-label">Вес багажа (кг)</label>
                                    <input type="range" class="form-range" min="1" max="50" value="20"
                                           id="luggage-weight-${bookingId}"
                                           oninput="updateLuggagePrice('${bookingId}')">
                                    <div class="d-flex justify-content-between">
                                        <small>1 кг</small>
                                        <span id="current-weight-${bookingId}" class="fw-bold">20 кг</span>
                                        <small>50 кг</small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Особые требования</label>
                                    <textarea class="form-control" rows="2"
                                              id="luggage-requirements-${bookingId}"
                                              placeholder="Хрупкий груз, спортивное снаряжение..."></textarea>
                                </div>
                            </div>

                            <!-- Итоговая стоимость -->
                            <div class="row mt-4">
                                <div class="col-12">
                                    <div class="card border-success">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h5 class="mb-1">Итоговая стоимость багажа</h5>
                                                    <small id="luggage-description-${bookingId}" class="text-muted"></small>
                                                </div>
                                                <h3 id="total-luggage-price-${bookingId}" class="text-success mb-0">0 ₽</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Существующий багаж -->
                            ${currentLuggage.length > 0 ? `
                                <div class="row mt-4">
                                    <div class="col-12">
                                        <h6>Текущий багаж:</h6>
                                        <div class="list-group">
                                            ${currentLuggage.map(item => `
                                                <div class="list-group-item">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <strong>${getLuggageTypeName(item.luggage_type)}</strong>
                                                            <div class="text-muted small">
                                                                ${item.weight} кг • ${item.price} ₽
                                                            </div>
                                                            ${item.special_requirements ? `
                                                                <small><i>${item.special_requirements}</i></small>
                                                            ` : ''}
                                                        </div>
                                                        <button class="btn btn-sm btn-outline-danger"
                                                                onclick="removeLuggageItem('${bookingId}', ${item.id})">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> Отмена
                            </button>
                            <button type="button" class="btn btn-primary"
                                    id="confirm-luggage-btn-${bookingId}"
                                    onclick="confirmLuggageSelection('${bookingId}')"
                                    disabled>
                                <i class="bi bi-check-circle"></i> Добавить багаж
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем модальное окно
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById(`luggage-modal-${bookingId}`));
        modal.show();

    } catch (error) {
        console.error('Ошибка загрузки цен на багаж:', error);
        showAlert('Не удалось загрузить информацию о багаже', 'danger');
    }
}

// Функция для добавления багажа к бронированию
async function addLuggageToBooking(bookingId, luggageData) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/bookings/${bookingId}/add-luggage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(`${currentAuth.username}:${currentAuth.password}`)}`
            },
            body: JSON.stringify(luggageData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка добавления багажа:', error);
        throw error;
    }
}

// Экспорт функций
window.calculateLuggagePrice = calculateLuggagePrice;
window.getLuggageTypeName = getLuggageTypeName;



function initBootstrapTooltips() {
    try {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    } catch (error) {
        console.error('Ошибка инициализации tooltips:', error);
    }
}

// Добавьте эти вспомогательные функции если их нет

function getLuggageTypeName(type) {
    const names = {
        'none': 'Без багажа',
        'hand': 'Ручная кладь',
        'checked': 'Обычный багаж',
        'business': 'Бизнес багаж',
        'premium': 'Премиум багаж'
    };
    return names[type] || type;
}

function calculateHoursUntilFlight(departureTime) {
    if (!departureTime) return Infinity;

    try {
        const flightTime = new Date(departureTime);
        const now = new Date();
        const diffMs = flightTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        return Math.max(0, diffHours);
    } catch (error) {
        console.error('Ошибка расчета времени:', error);
        return Infinity;
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';

    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        return dateTimeString;
    }
}

function getSeatClassName(seatClass) {
    const classes = {
        'economy': 'Эконом класс',
        'business': 'Бизнес класс',
        'first_class': 'Первый класс'
    };
    return classes[seatClass] || seatClass;
}

function getStatusName(status) {
    const statuses = {
        'confirmed': 'Подтверждено',
        'cancelled': 'Отменено',
        'completed': 'Завершено'
    };
    return statuses[status] || status;
}

function getStatusBadgeClass(status) {
    const classes = {
        'confirmed': 'bg-success',
        'cancelled': 'bg-danger',
        'completed': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
}

function getPaymentMethodName(method) {
    const methods = {
        'credit_card': 'Кредитная карта',
        'paypal': 'PayPal',
        'cash': 'Наличные'
    };
    return methods[method] || method;
}

function formatDate(dateString) {
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
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        return dateString;
    }
};


// Экспортируем функции
window.loadUserBookings = loadUserBookings;
window.cancelBooking = cancelBooking;
window.showPaymentModal = showPaymentModal;
window.showBookingDetails = showBookingDetails;
window.showUpgradeModal = showUpgradeModal;
window.showRefundDetails = showRefundDetails;
window.printRefundDetails = printRefundDetails;
window.printBookingDetails = printBookingDetails;
window.showRefundConfirmationModal = showRefundConfirmationModal;
window.processCancellation = processCancellation;
window.selectPaymentMethod = selectPaymentMethod;
window.confirmPayment = confirmPayment;
window.processPayment = processPayment;
window.updateBookingAfterPayment = updateBookingAfterPayment;
window.selectUpgradeOption = selectUpgradeOption;
window.confirmUpgrade = confirmUpgrade;
window.quickUpgradeToBusiness = quickUpgradeToBusiness;
window.addLuggageToBooking = addLuggageToBooking;
window.viewBookingDetails = showBookingDetails;