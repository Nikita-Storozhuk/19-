// flights-fixed.js - Полная версия с бронированием и багажом

// Глобальные переменные
let allFlights = [];
let searchedFlights = [];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    } catch {
        return dateString;
    }
}

// Форматирование времени
function formatTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

// Расчет длительности полета
function calculateDuration(departureTime, arrivalTime) {
    try {
        const dep = new Date(departureTime);
        const arr = new Date(arrivalTime);
        const diff = arr - dep;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}ч ${minutes}м`;
    } catch {
        return '';
    }
}

// flights-fixed.js - добавьте это в начало файла или обновите существующую функцию

function filterPastFlights(flights) {
    if (!flights || !Array.isArray(flights)) {
        return [];
    }

    const now = new Date();

    // Фильтруем рейсы, оставляем только те, у которых departure_time в будущем
    const futureFlights = flights.filter(flight => {
        try {
            if (!flight.departure_time) return false;

            const departureTime = new Date(flight.departure_time);

            // Разница в часах между текущим временем и временем вылета
            const timeDifference = departureTime - now;
            const hoursDifference = timeDifference / (1000 * 60 * 60);

            // Оставляем только рейсы, которые вылетают как минимум через 30 минут
            // Это чтобы пассажиры успели забронировать
            return hoursDifference > 0.5; // более чем 30 минут
        } catch (error) {
            console.error('Ошибка при фильтрации рейса:', error, flight);
            return false;
        }
    });

    console.log(`Фильтрация рейсов: было ${flights.length}, осталось ${futureFlights.length}`);
    return futureFlights;
}


// Получение названия статуса
function getFlightStatusName(status) {
    const statuses = {
        'scheduled': 'По расписанию',
        'on_time': 'По расписанию',
        'delayed': 'Задержан',
        'cancelled': 'Отменен',
        'completed': 'Завершен',
        'boarding': 'Посадка',
        'departed': 'Вылетел'
    };
    return statuses[status] || status;
}

// Получение класса CSS для статуса
function getFlightStatusClass(status) {
    const classes = {
        'scheduled': 'bg-success',
        'on_time': 'bg-success',
        'delayed': 'bg-warning text-dark',
        'cancelled': 'bg-danger',
        'completed': 'bg-secondary',
        'boarding': 'bg-info',
        'departed': 'bg-primary'
    };
    return classes[status] || 'bg-secondary';
}

// Получение названия класса обслуживания
function getSeatClassName(seatClass) {
    const classes = {
        'economy': 'Эконом класс',
        'business': 'Бизнес класс',
        'first_class': 'Первый класс',
        'premium_economy': 'Премиум эконом'
    };
    return classes[seatClass] || seatClass;
}

// Получение названия типа багажа
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

// Получение иконки для типа багажа
function getLuggageIconClass(type) {
    const colors = {
        'none': 'text-secondary',
        'hand': 'text-primary',
        'checked': 'text-success',
        'business': 'text-warning',
        'premium': 'text-danger'
    };
    return colors[type] || 'text-primary';
}

// Расчет стоимости багажа
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

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Функция генерации HTML карточки рейса
// flights-fixed.js - обновите функцию getFlightCardHTML

// flights-fixed.js - исправленная функция getFlightCardHTML

function getFlightCardHTML(flight) {
    console.log('🎫 Генерация карточки для рейса:', flight.flight_number);

    // Проверка данных
    if (!flight) {
        return '<div class="card"><div class="card-body">Ошибка данных</div></div>';
    }

    // Форматирование данных
    const departureDate = formatDate(flight.departure_time);
    const departureTime = formatTime(flight.departure_time);
    const arrivalTime = formatTime(flight.arrival_time);
    const duration = calculateDuration(flight.departure_time, flight.arrival_time);

    // Статус
    const statusName = getFlightStatusName(flight.status);
    const statusClass = getFlightStatusClass(flight.status);

    // Проверка времени вылета
    const now = new Date();
    const departureDateTime = new Date(flight.departure_time);
    const timeDifference = departureDateTime - now;
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    // Проверка возможности бронирования

    const statusLower = (flight.status || '').toLowerCase();
    const isAvailable = statusLower === 'scheduled' || statusLower === 'on_time';
    const isFutureFlight = hoursDifference > 0.5; // более чем 30 минут до вылета

    // ВАЖНО: Используем безопасную проверку API
    const hasApi = window.api && typeof window.api.isAuthenticated === 'function';
    const isAuthenticated = hasApi ? window.api.isAuthenticated() : false;


    const canBook = isAvailable && isFutureFlight;
    const canBookWithLogin = canBook && isAuthenticated;

    let warningMessage = '';
    if (hoursDifference <= 0.5 && hoursDifference > 0) {
        warningMessage = '<span class="badge bg-danger ms-1">Вылет менее чем через 30 мин</span>';
    } else if (hoursDifference <= 0) {
        warningMessage = '<span class="badge bg-danger ms-1">Рейс уже вылетел</span>';
    }

    // Данные рейса для передачи в кнопку
    const flightDataStr = encodeURIComponent(JSON.stringify(flight));

    console.log('🔍 Отладка доступности бронирования:', {
        flightNumber: flight.flight_number,
        status: flight.status,
        statusName: statusName,
        departureTime: flight.departure_time,
        now: now,
        hoursDifference: hoursDifference,
        isAvailable: isAvailable,
        isFutureFlight: isFutureFlight,
        hasApi: hasApi,
        isAuthenticated: isAuthenticated,
        canBook: canBook,
        canBookWithLogin: canBookWithLogin
    });

    return `
        <div class="card flight-card mb-3 ${hoursDifference <= 0 ? 'bg-light text-muted' : ''}">
            <div class="card-body">
                <div class="row align-items-center">
                    <!-- Информация о рейсе -->
                    <div class="col-md-3">
                        <h5 class="flight-number fw-bold mb-1">${flight.flight_number}</h5>
                        <div class="flight-date text-muted small">
                            <i class="bi bi-calendar me-1"></i>${departureDate}
                        </div>
                        <div class="mt-2">
                            <span class="badge ${statusClass}">
                                ${statusName}
                            </span>
                            ${warningMessage}
                            ${flight.aircraft_type ? `
                                <span class="badge bg-secondary ms-1">
                                    ${flight.aircraft_type}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Маршрут и время -->
                    <div class="col-md-4">
                        <div class="flight-route">
                            <div class="d-flex align-items-center">
                                <div class="text-center">
                                    <div class="fw-bold">${flight.departure_airport}</div>
                                    <div class="text-primary fw-bold">${departureTime}</div>
                                    <small class="text-muted">Вылет</small>
                                </div>
                                <div class="mx-3 position-relative">
                                    <i class="bi bi-arrow-right text-primary"></i>
                                    <div class="position-absolute top-50 start-50 translate-middle">
                                        <small class="text-muted">${duration}</small>
                                    </div>
                                </div>
                                <div class="text-center">
                                    <div class="fw-bold">${flight.arrival_airport}</div>
                                    <div class="text-primary fw-bold">${arrivalTime}</div>
                                    <small class="text-muted">Прибытие</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Цены -->
                    <div class="col-md-3">
                        <div class="row g-2">
                            <div class="col-4">
                                <div class="text-center bg-success text-white p-2 rounded">
                                    <small>Эконом</small>
                                    <div class="fw-bold">${flight.economy_price || 0}₽</div>
                                    <small>${flight.available_economy_seats || 0} мест</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="text-center bg-warning p-2 rounded">
                                    <small>Бизнес</small>
                                    <div class="fw-bold">${flight.business_price || 0}₽</div>
                                    <small>${flight.available_business_seats || 0} мест</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="text-center bg-danger text-white p-2 rounded">
                                    <small>Первый</small>
                                    <div class="fw-bold">${flight.first_class_price || 0}₽</div>
                                    <small>${flight.available_first_class_seats || 0} мест</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Кнопка бронирования -->
                    <div class="col-md-2 text-end">
                        <div class="price-tag mb-2">
                            от ${flight.economy_price || 0} ₽
                        </div>
                        <button class="btn ${canBookWithLogin ? 'btn-primary' : canBook ? 'btn-warning' : 'btn-secondary'} btn-sm book-flight-btn"
                            data-flight="${flightDataStr}"
                            ${!canBook ? 'disabled' : ''}>
                            ${canBookWithLogin ? 'Забронировать' : canBook ? 'Войти для бронирования' : 'Недоступно'}
                        </button>
                        ${!isFutureFlight ? `
                            <div class="mt-2 small text-danger">
                                <i class="bi bi-exclamation-triangle"></i>
                                ${hoursDifference <= 0 ? 'Рейс уже вылетел' : 'Вылет менее чем через 30 мин'}
                            </div>
                        ` : !isAuthenticated && canBook ? `
                            <div class="mt-2 small text-warning">
                                <i class="bi bi-person-circle"></i>
                                Для бронирования войдите в систему
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Показать форму бронирования
function showFlightBookingForm(flight) {
    console.log('📋 Показываю форму бронирования для:', flight.flight_number);

    // Проверка авторизации
    if (!window.api || !window.api.isAuthenticated()) {
        showAlert('Для бронирования необходимо войти в систему', 'warning');
        showSection('login');
        return;
    }

    // Данные по умолчанию для багажа
    const luggagePricing = {
        default_hand_luggage: {
            description: "Ручная кладь до 10 кг (включена в стоимость)"
        },
        additional_options: [
            {
                luggage_type: "checked",
                price_per_kg: 500,
                max_weight: 50,
                description: "Регистрируемый багаж"
            },
            {
                luggage_type: "business",
                price_per_kg: 1000,
                max_weight: 50,
                description: "Бизнес-багаж"
            }
        ]
    };

    // Форматируем данные
    const departureDate = formatDate(flight.departure_time);
    const departureTime = formatTime(flight.departure_time);
    const arrivalTime = formatTime(flight.arrival_time);
    const duration = calculateDuration(flight.departure_time, flight.arrival_time);

    // HTML формы
    const formHtml = `
        <div class="modal fade" id="booking-form-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-airplane me-2"></i>
                            Бронирование рейса ${flight.flight_number}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Информация о рейсе -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <h6 class="fw-bold">${flight.departure_airport} → ${flight.arrival_airport}</h6>
                                        <div class="row mt-2">
                                            <div class="col-6">
                                                <div class="text-muted small">Вылет</div>
                                                <div class="fw-bold">${departureDate}</div>
                                                <div class="text-primary">${departureTime}</div>
                                            </div>
                                            <div class="col-6">
                                                <div class="text-muted small">Прибытие</div>
                                                <div class="fw-bold">${departureDate}</div>
                                                <div class="text-primary">${arrivalTime}</div>
                                            </div>
                                        </div>
                                        <div class="text-center mt-2">
                                            <small class="text-muted">Время в пути: ${duration}</small>
                                        </div>
                                    </div>
                                    <div class="col-md-4 text-end">
                                        <h4 class="text-primary">${flight.economy_price} ₽</h4>
                                        <small class="text-muted">за пассажира (эконом)</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Форма бронирования -->
                        <form id="booking-form">
                            <input type="hidden" id="flight_id" value="${flight.id}" data-price="${flight.economy_price}">

                            <!-- Пассажиры и класс -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <label for="passengers_count" class="form-label">Количество пассажиров *</label>
                                    <select class="form-select" id="passengers_count" required onchange="updateBookingPrice()">
                                        ${[1,2,3,4,5].map(num => `
                                            <option value="${num}">${num} пассажир${num > 1 ? 'ов' : ''}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="seat_class" class="form-label">Класс обслуживания *</label>
                                    <select class="form-select" id="seat_class" required onchange="updateBookingPrice()">
                                        <option value="economy">Эконом класс</option>
                                        <option value="business">Бизнес класс (+50%)</option>
                                        <option value="first_class">Первый класс (+100%)</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Выбор багажа -->
                            <div class="card mb-4">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="bi bi-suitcase me-2"></i>Багаж</h6>
                                </div>
                                <div class="card-body">
                                    <div class="alert alert-info mb-3">
                                        <i class="bi bi-info-circle me-2"></i>
                                        ${luggagePricing.default_hand_luggage.description}
                                    </div>

                                    <!-- Опции багажа -->
                                    <div class="row mb-3">
                                        <div class="col-md-4 mb-2">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="luggageType"
                                                       id="luggage-none" value="none" checked onchange="updateLuggageSelection()">
                                                <label class="form-check-label w-100" for="luggage-none">
                                                    <div class="card text-center h-100">
                                                        <div class="card-body">
                                                            <i class="bi bi-x-circle fs-1 text-secondary mb-2"></i>
                                                            <h6>Без багажа</h6>
                                                            <p class="text-muted small">Только ручная кладь</p>
                                                            <h5 class="text-success">0 ₽</h5>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        ${luggagePricing.additional_options.map(option => `
                                            <div class="col-md-4 mb-2">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="luggageType"
                                                           id="luggage-${option.luggage_type}" value="${option.luggage_type}"
                                                           onchange="updateLuggageSelection()">
                                                    <label class="form-check-label w-100" for="luggage-${option.luggage_type}">
                                                        <div class="card text-center h-100">
                                                            <div class="card-body">
                                                                <i class="bi bi-suitcase fs-1 ${getLuggageIconClass(option.luggage_type)} mb-2"></i>
                                                                <h6>${getLuggageTypeName(option.luggage_type)}</h6>
                                                                <p class="text-muted small">${option.description}</p>
                                                                <h5 class="text-success">${option.price_per_kg} ₽/кг</h5>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>

                                    <!-- Вес багажа -->
                                    <div class="row mt-3" id="luggage-weight-section" style="display: none;">
                                        <div class="col-md-6">
                                            <label for="luggageWeight" class="form-label">Вес багажа (кг)</label>
                                            <input type="range" class="form-range" id="luggageWeight"
                                                   min="1" max="50" value="20" oninput="updateLuggageCost()">
                                            <div class="d-flex justify-content-between">
                                                <small>1 кг</small>
                                                <span id="currentLuggageWeight" class="fw-bold">20 кг</span>
                                                <small>50 кг</small>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="luggageRequirements" class="form-label">Особые требования</label>
                                            <textarea class="form-control" id="luggageRequirements"
                                                      rows="2" placeholder="Хрупкий груз, спортивное снаряжение..."></textarea>
                                        </div>
                                    </div>

                                    <!-- Итог по багажу -->
                                    <div class="row mt-3">
                                        <div class="col-12">
                                            <div class="card bg-light">
                                                <div class="card-body py-2">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <strong>Стоимость багажа:</strong>
                                                            <div id="luggage-description" class="text-muted small">Не выбрано</div>
                                                        </div>
                                                        <h5 id="luggage-total-price" class="text-success mb-0">0 ₽</h5>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Особые пожелания -->
                            <div class="mb-4">
                                <label for="special_requests" class="form-label">Особые пожелания</label>
                                <textarea class="form-control" id="special_requests" rows="3"
                                          placeholder="Пожелания к рейсу, особые требования..."></textarea>
                            </div>

                            <!-- Итоговая стоимость -->
                            <div class="card border-success mb-4">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-7">
                                            <h6>Итоговая стоимость:</h6>
                                            <div id="price-breakdown" class="text-muted small">
                                                Расчет...
                                            </div>
                                        </div>
                                        <div class="col-md-5 text-end">
                                            <h2 id="total-price" class="text-success mb-0">0 ₽</h2>
                                            <small class="text-muted">за всех пассажиров</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Отмена
                        </button>
                        <button type="button" class="btn btn-primary" onclick="submitBookingForm()" id="submit-booking-btn">
                            <i class="bi bi-check-circle"></i> Забронировать
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку
    const oldModal = document.getElementById('booking-form-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую
    document.body.insertAdjacentHTML('beforeend', formHtml);

    // Показываем
    const modalElement = document.getElementById('booking-form-modal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Инициализируем расчеты
        setTimeout(() => {
            updateBookingPrice();
            updateLuggageSelection();
        }, 100);
    }
}

// Обновление выбора багажа
function updateLuggageSelection() {
    const luggageType = document.querySelector('input[name="luggageType"]:checked');
    if (!luggageType) return;

    const luggageValue = luggageType.value;
    const weightSection = document.getElementById('luggage-weight-section');
    const luggageDescription = document.getElementById('luggage-description');

    if (luggageValue === 'none') {
        if (weightSection) weightSection.style.display = 'none';
        if (luggageDescription) luggageDescription.textContent = 'Ручная кладь (включена)';
        document.getElementById('luggage-total-price').textContent = '0 ₽';
    } else {
        if (weightSection) weightSection.style.display = 'block';
        updateLuggageCost();
    }

    updateBookingPrice();
}

// Обновление стоимости багажа
function updateLuggageCost() {
    const luggageType = document.querySelector('input[name="luggageType"]:checked');
    if (!luggageType || luggageType.value === 'none') return;

    const weightInput = document.getElementById('luggageWeight');
    const currentWeightSpan = document.getElementById('currentLuggageWeight');
    const luggageTotalPrice = document.getElementById('luggage-total-price');
    const luggageDescription = document.getElementById('luggage-description');

    if (!weightInput || !currentWeightSpan || !luggageTotalPrice || !luggageDescription) return;

    const weight = parseInt(weightInput.value);
    currentWeightSpan.textContent = `${weight} кг`;

    // Рассчитываем стоимость
    const cost = calculateLuggagePrice(luggageType.value, weight);
    const typeName = getLuggageTypeName(luggageType.value);

    luggageTotalPrice.textContent = `${cost} ₽`;
    luggageDescription.textContent = `${typeName} ${weight} кг`;

    updateBookingPrice();
}

// Обновление общей стоимости
function updateBookingPrice() {
    const flightIdElement = document.getElementById('flight_id');
    if (!flightIdElement) return;

    const flightPrice = parseFloat(flightIdElement.dataset.price) || 0;
    const passengersCount = parseInt(document.getElementById('passengers_count')?.value) || 1;
    const seatClass = document.getElementById('seat_class')?.value || 'economy';
    const luggageTotalElement = document.getElementById('luggage-total-price');

    // Стоимость багажа
    let luggageCost = 0;
    if (luggageTotalElement) {
        const luggageText = luggageTotalElement.textContent;
        luggageCost = parseFloat(luggageText.replace(/[^\d.]/g, '')) || 0;
    }

    // Наценка за класс
    let classMultiplier = 1;
    switch(seatClass) {
        case 'economy': classMultiplier = 1.0; break;
        case 'business': classMultiplier = 1.5; break;
        case 'first_class': classMultiplier = 2.0; break;
    }

    // Итог
    const basePrice = flightPrice * classMultiplier;
    const totalPrice = (basePrice + luggageCost) * passengersCount;

    // Обновляем отображение
    const totalPriceElement = document.getElementById('total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = `${totalPrice.toLocaleString('ru-RU')} ₽`;
    }

    // Детализация
    const priceBreakdown = document.getElementById('price-breakdown');
    if (priceBreakdown) {
        priceBreakdown.innerHTML = `
            • Билет (${getSeatClassName(seatClass)}): ${(flightPrice * classMultiplier).toLocaleString('ru-RU')} ₽<br>
            • Багаж: ${luggageCost.toLocaleString('ru-RU')} ₽<br>
            • Пассажиров: ${passengersCount}
        `;
    }
}

// Отправка формы бронирования
// Отправка формы бронирования
async function submitBookingForm() {
    console.log('🚀 Отправка формы бронирования');

    // Проверка авторизации
    if (!window.api || !window.api.isAuthenticated()) {
        showAlert('Для бронирования необходимо войти в систему', 'warning');
        return;
    }

    // Получаем данные
    const flightIdElement = document.getElementById('flight_id');
    const seatClassElement = document.getElementById('seat_class');
    const passengersCountElement = document.getElementById('passengers_count');

    if (!flightIdElement || !seatClassElement || !passengersCountElement) {
        showAlert('Пожалуйста, заполните все обязательные поля', 'warning');
        return;
    }

    // Получаем базовую цену рейса
    const flightPrice = parseFloat(flightIdElement.dataset.price) || 0;
    const passengersCount = parseInt(passengersCountElement.value) || 1;
    const seatClass = seatClassElement.value;

    // Рассчитываем стоимость билетов
    let classMultiplier = 1;
    switch(seatClass) {
        case 'economy': classMultiplier = 1.0; break;
        case 'business': classMultiplier = 1.5; break; // +50%
        case 'first_class': classMultiplier = 2.0; break; // +100%
    }

    const ticketPrice = flightPrice * classMultiplier * passengersCount;

    // Рассчитываем стоимость багажа
    const luggageType = document.querySelector('input[name="luggageType"]:checked')?.value;
    let luggageCost = 0;
    let luggageItems = [];

    if (luggageType && luggageType !== 'none') {
        const weight = parseInt(document.getElementById('luggageWeight')?.value || 20);
        const specialRequirements = document.getElementById('luggageRequirements')?.value || '';

        // Рассчитываем стоимость багажа
        luggageCost = calculateLuggagePrice(luggageType, weight);

        luggageItems.push({
            luggage_type: luggageType,
            weight: weight,
            price: luggageCost, // ВАЖНО: отправляем цену
            special_requirements: specialRequirements || null
        });
    }

    // Общая стоимость
    const totalPrice = ticketPrice + luggageCost;

    console.log('💰 Расчет стоимости:', {
        flightPrice,
        passengersCount,
        seatClass,
        classMultiplier,
        ticketPrice,
        luggageCost,
        totalPrice
    });

    // Подготавливаем данные для отправки
    const bookingData = {
        flight_id: parseInt(flightIdElement.value),
        seat_class: seatClass,
        passengers_count: passengersCount,
        special_requests: document.getElementById('special_requests')?.value || '',
        total_price: totalPrice, // ВАЖНО: отправляем общую стоимость
        luggage: luggageItems
    };

    console.log('📦 Данные для отправки:', bookingData);

    // Показываем индикатор загрузки
    const submitBtn = document.getElementById('submit-booking-btn');
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Обработка...';
        submitBtn.disabled = true;
    }

    try {
        // Отправляем запрос на правильный endpoint
        let response;

        if (luggageItems.length > 0) {
            // Используем endpoint с багажом
            console.log('📤 Отправляю с багажом на /bookings/with-luggage/');
            response = await window.api.post('/bookings/with-luggage/', bookingData);
        } else {
            // Используем обычный endpoint
            console.log('📤 Отправляю без багажа на /bookings/');

            // Удаляем поле luggage для обычного бронирования
            const bookingDataWithoutLuggage = { ...bookingData };
            delete bookingDataWithoutLuggage.luggage;

            response = await window.api.createBooking(bookingDataWithoutLuggage);
        }

        console.log('✅ Бронирование создано:', response);

        // Закрываем модалку
        const modalElement = document.getElementById('booking-form-modal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }

        // Показываем успешное сообщение
        let successMessage = `
            <div class="alert alert-success">
                <h5><i class="bi bi-check-circle-fill"></i> Бронирование успешно создано!</h5>
                <p><strong>Номер бронирования:</strong> ${response.booking_reference || response.id}</p>
                <p><strong>Рейс ID:</strong> ${bookingData.flight_id}</p>
                <p><strong>Класс:</strong> ${getSeatClassName(bookingData.seat_class)}</p>
                <p><strong>Пассажиров:</strong> ${bookingData.passengers_count}</p>
                <p><strong>Общая стоимость:</strong> ${totalPrice} ₽</p>
        `;

        if (luggageItems.length > 0) {
            successMessage += `
                <p><strong>Багаж:</strong> ${luggageItems[0].weight} кг (${luggageCost} ₽)</p>
            `;
        }

        successMessage += `
                <p class="mb-0">Детали бронирования доступны в разделе "Мои бронирования"</p>
            </div>
        `;

        showAlert(successMessage, 'success');

        // Обновляем список бронирований
        setTimeout(() => {
            if (typeof loadUserBookings === 'function') {
                loadUserBookings();
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Ошибка бронирования:', error);

        // Пытаемся получить детали ошибки
        let errorMessage = error.message || 'Неизвестная ошибка';
        try {
            if (error.message && error.message.includes('{')) {
                const errorObj = JSON.parse(error.message);
                errorMessage = errorObj.detail || errorObj.message || errorMessage;

                // Показываем детали ошибки
                if (errorObj.detail) {
                    console.log('📋 Детали ошибки:', errorObj.detail);
                }
            }
        } catch (parseError) {
            console.log('Не удалось распарсить ошибку');
        }

        showAlert(`Ошибка бронирования: ${errorMessage}`, 'danger');

    } finally {
        // Восстанавливаем кнопку
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Загрузка всех рейсов
// flights-fixed.js - обновите функцию loadAllFlights

async function loadAllFlights() {
    try {
        console.log('🔄 Загрузка рейсов...');

        const flightsList = document.getElementById('flights-list');
        if (flightsList) {
            flightsList.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                    <p class="mt-2">Загрузка доступных рейсов...</p>
                </div>
            `;
        }

        const flights = await window.api.getFlights({ limit: 100 });

        // ФИЛЬТРУЕМ ПРОШЕДШИЕ РЕЙСЫ
        const availableFlights = filterPastFlights(flights);
        allFlights = availableFlights;

        // Отображаем рейсы
        if (flightsList) {
            if (availableFlights.length > 0) {
                flightsList.innerHTML = '';
                availableFlights.forEach(flight => {
                    const flightCard = document.createElement('div');
                    flightCard.innerHTML = getFlightCardHTML(flight);
                    flightsList.appendChild(flightCard);
                });

                // Инициализируем tooltips
                setTimeout(() => {
                    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                    tooltips.forEach(el => new bootstrap.Tooltip(el));
                }, 100);
            } else {
                flightsList.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        Нет доступных рейсов для бронирования
                        <p class="mt-2 small">Все рейсы уже вылетели или скоро вылетают</p>
                    </div>
                `;
            }
        }

    } catch (error) {
        console.error('❌ Ошибка загрузки рейсов:', error);

        const flightsList = document.getElementById('flights-list');
        if (flightsList) {
            flightsList.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Не удалось загрузить рейсы: ${error.message}
                </div>
            `;
        }
    }
}

// Поиск рейсов
// flights-fixed.js - обновите функцию searchFlights

async function searchFlights(event) {
    if (event) event.preventDefault();

    console.log('🔍 Поиск рейсов...');

    const departureAirport = document.getElementById('departure-airport')?.value;
    const arrivalAirport = document.getElementById('arrival-airport')?.value;
    const departureDate = document.getElementById('departure-date')?.value;

    const params = {};
    if (departureAirport) params.departure_airport = departureAirport;
    if (arrivalAirport) params.arrival_airport = arrivalAirport;
    if (departureDate) params.departure_date = departureDate;

    try {
        const flightsList = document.getElementById('flights-list');
        if (flightsList) {
            flightsList.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Поиск...</span>
                    </div>
                    <p class="mt-2">Поиск рейсов...</p>
                </div>
            `;
        }

        const flights = await window.api.getFlights(params);

        // ФИЛЬТРУЕМ ПРОШЕДШИЕ РЕЙСЫ
        const availableFlights = filterPastFlights(flights);
        searchedFlights = availableFlights;

        // Отображаем результаты
        if (flightsList) {
            if (availableFlights.length > 0) {
                flightsList.innerHTML = '';
                availableFlights.forEach(flight => {
                    const flightCard = document.createElement('div');
                    flightCard.innerHTML = getFlightCardHTML(flight);
                    flightsList.appendChild(flightCard);
                });

                showAlert(`Найдено ${availableFlights.length} доступных рейсов`, 'success');
            } else {
                flightsList.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-search"></i>
                        Доступные рейсы по вашему запросу не найдены
                        <p class="mt-2 small">Попробуйте изменить дату или направление</p>
                    </div>
                `;
            }
        }

    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        showAlert(`Ошибка поиска: ${error.message}`, 'danger');
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Инициализация обработчиков
function initFlightsHandlers() {
        console.log('🎯 Инициализация обработчиков рейсов');

        // Обработчик для кнопок бронирования
        document.addEventListener('click', function(event) {
        const bookButton = event.target.closest('.book-flight-btn');
        if (bookButton && !bookButton.disabled) {
            event.preventDefault();
            event.stopPropagation();

            console.log('🎯 Нажата кнопка бронирования');

            const flightData = bookButton.getAttribute('data-flight');
            if (flightData) {
                try {
                    // Декодируем данные
                    const flightJson = decodeURIComponent(flightData);
                    console.log('📊 JSON данные:', flightJson);

                    const flight = JSON.parse(flightJson);
                    console.log('✅ Данные рейса успешно распарсены:', flight);

                    showFlightBookingForm(flight);
                } catch (error) {
                    console.error('❌ Ошибка парсинга данных рейса:', error);
                    console.error('❌ Данные которые не парсятся:', flightData);

                    // Альтернативный способ - попробуем eval (только для доверенных данных)
                    try {
                        console.log('🔄 Пробую альтернативный парсинг...');
                        const flight = eval('(' + decodeURIComponent(flightData) + ')');
                        console.log('✅ Альтернативный парсинг успешен:', flight);
                        showFlightBookingForm(flight);
                    } catch (evalError) {
                        console.error('❌ Альтернативный парсинг также не удался:', evalError);
                        showAlert('Ошибка загрузки данных рейса', 'danger');
                    }
                }
            } else {
                console.error('❌ Нет данных рейса в атрибуте data-flight');
                showAlert('Ошибка: данные рейса не найдены', 'danger');
            }
        }
    });

    // Инициализация при загрузке
    if (document.getElementById('flights-list')) {
        loadAllFlights();
    }
}

// Запуск при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ flights-fixed.js загружен');
    setTimeout(initFlightsHandlers, 500);
});


// ==================== ФУНКЦИИ ДЛЯ ОТОБРАЖЕНИЯ БРОНИРОВАНИЙ ====================

function displayBookings(bookings) {
    console.log('🎫 Отображение бронирований:', bookings);

    const bookingsList = document.getElementById('bookings-list');
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

        // Обнуляем статистику
        updateUserStats(0, 0, 0, '-');
        return;
    }

    // Обновляем статистику
    updateUserStatsFromBookings(bookings);

    // Сортируем по дате (новые сначала)
    const sortedBookings = [...bookings].sort((a, b) => {
        const dateA = new Date(a.booking_date || a.created_at || 0);
        const dateB = new Date(b.booking_date || b.created_at || 0);
        return dateB - dateA;
    });

    // Создаем HTML
    let html = `
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0"><i class="bi bi-list-check me-2"></i>Мои бронирования</h4>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
    `;

    sortedBookings.forEach(booking => {
        const statusInfo = getBookingStatusInfo(booking.booking_status || booking.status);
        const bookingDate = formatBookingDate(booking.booking_date || booking.created_at);
        const flightInfo = booking.flight ?
            `${booking.flight.departure_airport} → ${booking.flight.arrival_airport}` :
            `Рейс #${booking.flight_id}`;

        html += `
            <div class="col-md-6 mb-4">
                <div class="card booking-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-ticket-perforated me-2"></i>
                            ${booking.booking_reference || `#${booking.id}`}
                        </h5>
                        <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
                    </div>

                    <div class="card-body">
                        <div class="booking-info">
                            <div class="mb-3">
                                <h6>${flightInfo}</h6>
                                <div class="text-muted small">
                                    <i class="bi bi-calendar me-1"></i>${bookingDate}
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-6">
                                    <div class="mb-2">
                                        <strong>Класс:</strong>
                                        <div class="text-primary">${getSeatClassName(booking.seat_class)}</div>
                                    </div>
                                    <div class="mb-2">
                                        <strong>Пассажиров:</strong>
                                        <div>${booking.passengers_count || 1}</div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="mb-2">
                                        <strong>Стоимость:</strong>
                                        <div class="text-success fw-bold">${booking.total_price || 0} ₽</div>
                                    </div>
                                    <div class="mb-2">
                                        <strong>Статус оплаты:</strong>
                                        <div>${booking.payment?.payment_status || 'Не оплачено'}</div>
                                    </div>
                                </div>
                            </div>

                            ${booking.special_requests ? `
                                <div class="alert alert-light border mt-3 mb-0">
                                    <strong>Особые пожелания:</strong>
                                    <p class="mb-0 small">${booking.special_requests}</p>
                                </div>
                            ` : ''}

                            ${booking.luggage && booking.luggage.length > 0 ? `
                                <div class="mt-3">
                                    <strong><i class="bi bi-suitcase me-1"></i>Багаж:</strong>
                                    <div class="mt-1">
                                        ${booking.luggage.map(item => `
                                            <span class="badge bg-info me-1 mb-1">
                                                ${item.luggage_type}: ${item.weight} кг (${item.price} ₽)
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="card-footer bg-light">
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewBookingDetails(${booking.id})">
                                <i class="bi bi-eye"></i> Детали
                            </button>
                            ${(booking.booking_status === 'confirmed' || booking.booking_status === 'paid') ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="cancelBooking(${booking.id})">
                                    <i class="bi bi-x-circle"></i> Отменить
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    bookingsList.innerHTML = html;

    // Инициализируем tooltips
    setTimeout(() => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => new bootstrap.Tooltip(el));
    }, 100);
}

function updateUserStatsFromBookings(bookings) {
    if (!bookings || bookings.length === 0) {
        updateUserStats(0, 0, 0, '-');
        return;
    }

    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b =>
        b.booking_status === 'confirmed' || b.booking_status === 'paid'
    ).length;

    const totalSpent = bookings.reduce((sum, booking) => {
        return sum + (parseFloat(booking.total_price) || 0);
    }, 0);

    // Любимый класс
    const classCounts = {};
    bookings.forEach(booking => {
        if (booking.seat_class) {
            const className = booking.seat_class;
            classCounts[className] = (classCounts[className] || 0) + 1;
        }
    });

    let favoriteClass = '-';
    if (Object.keys(classCounts).length > 0) {
        const maxClass = Object.entries(classCounts).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];
        favoriteClass = getSeatClassName(maxClass);
    }

    updateUserStats(totalBookings, activeBookings, totalSpent, favoriteClass);
}

function updateUserStats(total, active, spent, favoriteClass) {
    console.log('📊 Обновление статистики:', { total, active, spent, favoriteClass });

    const totalElement = document.getElementById('total-bookings');
    const activeElement = document.getElementById('active-bookings');
    const spentElement = document.getElementById('total-spent');
    const classElement = document.getElementById('favorite-class');

    if (totalElement) totalElement.textContent = total;
    if (activeElement) activeElement.textContent = active;
    if (spentElement) spentElement.textContent = `${spent.toLocaleString('ru-RU')} ₽`;
    if (classElement) classElement.textContent = favoriteClass;
}

// В функции getBookingStatusInfo добавьте поддержку booking_status
function getBookingStatusInfo(status) {
    const statuses = {
        'confirmed': { class: 'bg-success', text: 'Подтверждено' },
        'cancelled': { class: 'bg-danger', text: 'Отменено' },
        'completed': { class: 'bg-secondary', text: 'Завершено' },
        'waiting': { class: 'bg-warning', text: 'Ожидает подтверждения' },
        'paid': { class: 'bg-primary', text: 'Оплачено' }
    };
    return statuses[status] || { class: 'bg-secondary', text: status };
}

function formatBookingDate(dateString) {
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
}

// Функции для работы с бронированиями
function viewBookingDetails(bookingId) {
    console.log('🔍 Просмотр деталей бронирования:', bookingId);
    showAlert(`Детали бронирования #${bookingId}`, 'info');
    // Здесь можно реализовать модальное окно с деталями
}

async function cancelBooking(bookingId) {
    console.log('🗑️ Отмена бронирования:', bookingId);

    if (!confirm('Вы уверены, что хотите отменить это бронирование?')) {
        return;
    }

    try {
        const response = await window.api.cancelBooking(bookingId);
        console.log('✅ Бронирование отменено:', response);
        showAlert('Бронирование успешно отменено!', 'success');

        // Обновляем список
        if (typeof loadUserBookings === 'function') {
            setTimeout(() => loadUserBookings(), 1000);
        }
    } catch (error) {
        console.error('❌ Ошибка отмены:', error);
        showAlert(`Ошибка отмены: ${error.message}`, 'danger');
    }
}

// ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С БРОНИРОВАНИЯМИ ====================

// Эта функция вызывается из bookings.js
function displayBookings(bookings) {
    console.log('🎫 displayBookings вызвана с данными:', bookings);

    const bookingsList = document.getElementById('bookings-list');
    if (!bookingsList) {
        console.error('❌ Элемент bookings-list не найден');
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

    // Обновляем статистику
    updateUserStatsFromBookings(bookings);

    // Группируем по статусу
    const groupedBookings = {
        active: bookings.filter(b => ['confirmed', 'paid', 'waiting'].includes(b.booking_status || b.status)),
        cancelled: bookings.filter(b => (b.booking_status || b.status) === 'cancelled'),
        completed: bookings.filter(b => (b.booking_status || b.status) === 'completed')
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

    // Отображаем завершенные
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

    // Отображаем отмененные
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

// Создание карточки бронирования
function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'card booking-card mb-3';
    card.setAttribute('data-booking-id', booking.id || booking.booking_id);

    const statusInfo = getBookingStatusInfo(booking.booking_status || booking.status);
    const createdDate = formatBookingDate(booking.booking_date || booking.created_at);

    // Информация о багаже
    let luggageHtml = '';
    if (booking.luggage && booking.luggage.length > 0) {
        const totalLuggagePrice = booking.luggage.reduce((sum, item) => sum + (item.price || 0), 0);
        luggageHtml = `
            <div class="mb-2">
                <strong><i class="bi bi-suitcase"></i> Багаж:</strong>
                <div class="mt-1">
                    ${booking.luggage.map(item => `
                        <span class="badge bg-info me-1 mb-1">
                            ${item.luggage_type}: ${item.weight} кг
                            ${item.price ? `(${item.price} ₽)` : ''}
                        </span>
                    `).join('')}
                    ${totalLuggagePrice > 0 ? `
                        <small class="text-muted ms-2">Итого по багажу: ${totalLuggagePrice} ₽</small>
                    ` : ''}
                </div>
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
                </div>
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

            <div class="mb-2">
                <strong><i class="bi bi-people"></i> Пассажиры:</strong>
                <span class="ms-2">${booking.passengers_count || 1} человек</span>
            </div>

            ${luggageHtml}

            ${booking.special_requests ? `
                <div class="alert alert-light border mt-2 p-2">
                    <small><i class="bi bi-chat-left-text"></i> <strong>Особые пожелания:</strong> ${booking.special_requests}</small>
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

// Вспомогательные функции
function getBookingStatusInfo(status) {
    const statuses = {
        'confirmed': { text: 'Подтверждено', class: 'bg-success' },
        'paid': { text: 'Оплачено', class: 'bg-primary' },
        'waiting': { text: 'Ожидает подтверждения', class: 'bg-warning' },
        'cancelled': { text: 'Отменено', class: 'bg-danger' },
        'completed': { text: 'Завершено', class: 'bg-secondary' }
    };
    return statuses[status] || { text: status, class: 'bg-secondary' };
}

function formatBookingDate(dateString) {
    if (!dateString) return 'Не указана';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

function updateUserStatsFromBookings(bookings) {
    if (!bookings || bookings.length === 0) {
        updateUserStats(0, 0, 0, '-');
        return;
    }

    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b =>
        b.booking_status === 'confirmed' || b.booking_status === 'paid'
    ).length;

    const totalSpent = bookings.reduce((sum, booking) => {
        return sum + (parseFloat(booking.total_price) || 0);
    }, 0);

    // Любимый класс
    const classCounts = {};
    bookings.forEach(booking => {
        if (booking.seat_class) {
            const className = booking.seat_class;
            classCounts[className] = (classCounts[className] || 0) + 1;
        }
    });

    let favoriteClass = '-';
    if (Object.keys(classCounts).length > 0) {
        const maxClass = Object.entries(classCounts).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];
        favoriteClass = getSeatClassName(maxClass);
    }

    updateUserStats(totalBookings, activeBookings, totalSpent, favoriteClass);
}

function updateUserStats(total, active, spent, favoriteClass) {
    console.log('📊 Обновление статистики:', { total, active, spent, favoriteClass });

    const totalElement = document.getElementById('total-bookings');
    const activeElement = document.getElementById('active-bookings');
    const spentElement = document.getElementById('total-spent');
    const classElement = document.getElementById('favorite-class');

    if (totalElement) totalElement.textContent = total;
    if (activeElement) activeElement.textContent = active;
    if (spentElement) spentElement.textContent = `${spent.toLocaleString('ru-RU')} ₽`;
    if (classElement) classElement.textContent = favoriteClass;
}

// Экспорт функций
window.displayBookings = displayBookings;
window.updateUserStats = updateUserStats;

// ==================== ЭКСПОРТ ФУНКЦИЙ ====================

window.loadAllFlights = loadAllFlights;
window.searchFlights = searchFlights;
window.showFlightBookingForm = showFlightBookingForm;
window.updateLuggageSelection = updateLuggageSelection;
window.updateLuggageCost = updateLuggageCost;
window.updateBookingPrice = updateBookingPrice;
window.submitBookingForm = submitBookingForm;
window.calculateLuggagePrice = calculateLuggagePrice;
window.getFlightCardHTML = getFlightCardHTML;
window.getFlightStatusName = getFlightStatusName;
window.getFlightStatusClass = getFlightStatusClass;
window.getSeatClassName = getSeatClassName;
window.getLuggageTypeName = getLuggageTypeName;
window.getLuggageIconClass = getLuggageIconClass;
// Экспортируем новые функции
window.displayBookings = displayBookings;
window.updateUserStats = updateUserStats;
window.viewBookingDetails = viewBookingDetails;
window.cancelBooking = cancelBooking;
