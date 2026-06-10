// Показать секцию админ-панели
// Обновите функцию showAdminSection в admin.js:

// Показать секцию админ-панели
function showAdminSection(section) {
    const adminContent = document.getElementById('admin-content');

    switch(section) {
        case 'manage-flights':
            loadManageFlightsSection();
            break;
        case 'manage-users':
            loadManageUsersSection();
            break;
        case 'manage-airports':
            loadManageAirportsSection();
            break;
        case 'manage-aircrafts':
            loadManageAircraftsSection();
            break;
    }
}

// Загрузка секции управления рейсами
async function loadManageFlightsSection() {
    const adminContent = document.getElementById('admin-content');

    adminContent.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-airplane"></i> Управление рейсами</h5>
            </div>
            <div class="card-body">
                <button class="btn btn-primary mb-3" onclick="showCreateFlightModal()">
                    <i class="bi bi-plus-circle"></i> Добавить рейс
                </button>
                <div id="admin-flights-list">
                    Загрузка...
                </div>
            </div>
        </div>
    `;

    await loadAdminFlights();
}

// Загрузка списка рейсов для админа
async function loadAdminFlights() {
    try {
        const flights = await api.getFlights({ limit: 50 });
        const flightsList = document.getElementById('admin-flights-list');

        flightsList.innerHTML = flights.map(flight => `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <strong>${flight.flight_number}</strong>
                        </div>
                        <div class="col-md-4">
                            ${flight.departure_airport} → ${flight.arrival_airport}
                        </div>
                        <div class="col-md-3">
                            <span class="badge ${flight.status === 'scheduled' ? 'bg-success' : 'bg-warning'}">
                                ${getFlightStatusName(flight.status)}
                            </span>
                        </div>
                        <div class="col-md-2 text-end">
                            <button class="btn btn-sm btn-outline-primary"
                                    onclick="editFlight(${flight.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('admin-flights-list').innerHTML = `
            <div class="alert alert-danger">
                Ошибка загрузки: ${error.message}
            </div>
        `;
    }
}

// Загрузка секции управления пользователями
async function loadManageUsersSection() {
    const adminContent = document.getElementById('admin-content');

    adminContent.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-people"></i> Управление пользователями</h5>
            </div>
            <div class="card-body">
                <div id="admin-users-list">
                    Загрузка...
                </div>
            </div>
        </div>
    `;

    await loadAdminUsers();
}

// Загрузка списка пользователей
async function loadAdminUsers() {
    try {
        const users = await api.getUsers();
        const usersList = document.getElementById('admin-users-list');

        usersList.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Имя пользователя</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th>Дата регистрации</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.email}</td>
                                <td>${user.username}</td>
                                <td>
                                    <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                                        ${user.role === 'admin' ? 'Админ' : 'Пользователь'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-secondary'}">
                                        ${user.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                </td>
                                <td>${formatDate(user.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        document.getElementById('admin-users-list').innerHTML = `
            <div class="alert alert-danger">
                Ошибка загрузки: ${error.message}
            </div>
        `;
    }
}

// Загрузка секции управления аэропортами
async function loadManageAirportsSection() {
    const adminContent = document.getElementById('admin-content');

    adminContent.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-geo-alt"></i> Управление аэропортами</h5>
            </div>
            <div class="card-body">
                <button class="btn btn-primary mb-3" onclick="showCreateAirportModal()">
                    <i class="bi bi-plus-circle"></i> Добавить аэропорт
                </button>
                <div id="admin-airports-list">
                    Загрузка...
                </div>
            </div>
        </div>
    `;

    await loadAdminAirports();
}

// Загрузка списка аэропортов
async function loadAdminAirports() {
    try {
        const airports = await api.getAirports();
        const airportsList = document.getElementById('admin-airports-list');

        if (airports.length === 0) {
            airportsList.innerHTML = '<div class="alert alert-info">Аэропорты не найдены</div>';
            return;
        }

        airportsList.innerHTML = airports.map(airport => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-1">
                            <span class="badge bg-primary">${airport.code}</span>
                        </div>
                        <div class="col-md-4">
                            <strong>${airport.name}</strong>
                        </div>
                        <div class="col-md-4">
                            ${airport.city}, ${airport.country}
                        </div>
                        <div class="col-md-3">
                            ${airport.timezone || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        airportsList.innerHTML = `
            <div class="alert alert-danger">
                Ошибка загрузки: ${error.message}
            </div>
        `;
    }
}

// Показать модальное окно создания рейса
function showCreateFlightModal() {
    const modalHtml = `
        <div class="modal fade" id="create-flight-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-plus-circle"></i> Добавить рейс</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="create-flight-form">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="flight-number" class="form-label">Номер рейса *</label>
                                    <input type="text" class="form-control" id="flight-number" required
                                           placeholder="Например: SU-123, S7-456">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="aircraft-id" class="form-label">ID самолета *</label>
                                    <input type="number" class="form-control" id="aircraft-id" required
                                           placeholder="Например: 1">
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="departure-airport" class="form-label">Аэропорт вылета *</label>
                                    <input type="text" class="form-control" id="departure-airport" required
                                           placeholder="Например: SVO">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="arrival-airport" class="form-label">Аэропорт прибытия *</label>
                                    <input type="text" class="form-control" id="arrival-airport" required
                                           placeholder="Например: LED">
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="departure-time" class="form-label">Дата и время вылета *</label>
                                    <input type="datetime-local" class="form-control" id="departure-time" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="arrival-time" class="form-label">Дата и время прибытия *</label>
                                    <input type="datetime-local" class="form-control" id="arrival-time" required>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="economy-price" class="form-label">Цена эконом (₽) *</label>
                                    <input type="number" class="form-control" id="economy-price" required
                                           min="0" step="100" placeholder="5000">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="business-price" class="form-label">Цена бизнес (₽) *</label>
                                    <input type="number" class="form-control" id="business-price" required
                                           min="0" step="100" placeholder="15000">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="first-class-price" class="form-label">Цена первый класс (₽) *</label>
                                    <input type="number" class="form-control" id="first-class-price" required
                                           min="0" step="100" placeholder="30000">
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="economy-seats" class="form-label">Места эконом *</label>
                                    <input type="number" class="form-control" id="economy-seats" required
                                           min="0" placeholder="150">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="business-seats" class="form-label">Места бизнес *</label>
                                    <input type="number" class="form-control" id="business-seats" required
                                           min="0" placeholder="30">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="first-class-seats" class="form-label">Места первый класс *</label>
                                    <input type="number" class="form-control" id="first-class-seats" required
                                           min="0" placeholder="10">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="flight-status" class="form-label">Статус рейса</label>
                                <select class="form-select" id="flight-status">
                                    <option value="scheduled" selected>По расписанию</option>
                                    <option value="delayed">Задержан</option>
                                    <option value="boarding">Посадка</option>
                                    <option value="departed">Вылетел</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" onclick="submitCreateFlightForm()">Создать рейс</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку, если есть
    const oldModal = document.getElementById('create-flight-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById('create-flight-modal'));
    modal.show();
}

// ЗАМЕНИТЕ текущую функцию submitCreateFlightForm на эту улучшенную версию:

// Отправка формы создания рейса - УЛУЧШЕННАЯ ВЕРСИЯ С ВАЛИДАЦИЕЙ
async function submitCreateFlightForm() {
    console.log('🔄 Начинаю создание рейса...');

    // Собираем данные с проверкой на пустоту
    const flightData = {
        flight_number: document.getElementById('flight-number')?.value.trim(),
        aircraft_id: parseInt(document.getElementById('aircraft-id')?.value),
        departure_airport: document.getElementById('departure-airport')?.value.trim().toUpperCase(),
        arrival_airport: document.getElementById('arrival-airport')?.value.trim().toUpperCase(),
        departure_time: document.getElementById('departure-time')?.value,
        arrival_time: document.getElementById('arrival-time')?.value,
        economy_price: parseFloat(document.getElementById('economy-price')?.value) || 0,
        business_price: parseFloat(document.getElementById('business-price')?.value) || 0,
        first_class_price: parseFloat(document.getElementById('first-class-price')?.value) || 0,
        available_economy_seats: parseInt(document.getElementById('economy-seats')?.value) || 0,
        available_business_seats: parseInt(document.getElementById('business-seats')?.value) || 0,
        available_first_class_seats: parseInt(document.getElementById('first-class-seats')?.value) || 0,
        status: document.getElementById('flight-status')?.value || 'scheduled'
    };

    console.log('📋 Собранные данные:', flightData);

    // Проверяем каждое поле по отдельности для точного сообщения об ошибке
    const validationErrors = [];

    if (!flightData.flight_number) validationErrors.push('Номер рейса');
    if (!flightData.aircraft_id || isNaN(flightData.aircraft_id)) validationErrors.push('ID самолета');
    //if (!flightData.departure_airport || flightData.departure_airport.length !== 3) validationErrors.push('Аэропорт вылета (3 буквы)');
    //if (!flightData.arrival_airport || flightData.arrival_airport.length !== 3) validationErrors.push('Аэропорт прибытия (3 буквы)');
    if (!flightData.departure_time) validationErrors.push('Дата и время вылета');
    if (!flightData.arrival_time) validationErrors.push('Дата и время прибытия');

    // Цены
    if (flightData.economy_price <= 0) validationErrors.push('Цена эконом класса');
    if (flightData.business_price <= 0) validationErrors.push('Цена бизнес класса');
    if (flightData.first_class_price <= 0) validationErrors.push('Цена первого класса');

    // Места
    if (flightData.available_economy_seats < 0) validationErrors.push('Количество мест эконом');
    if (flightData.available_business_seats < 0) validationErrors.push('Количество мест бизнес');
    if (flightData.available_first_class_seats < 0) validationErrors.push('Количество мест первый класс');

    if (validationErrors.length > 0) {
        const errorMessage = `Пожалуйста, заполните корректно следующие поля:\n\n• ${validationErrors.join('\n• ')}`;
        showAlert(errorMessage, 'warning');

        // Подсвечиваем проблемные поля
        highlightInvalidFields(validationErrors);
        return;
    }

    // Проверка кодов аэропортов
    /*if (!/^[A-Z]{3}$/.test(flightData.departure_airport)) {
        showAlert('Код аэропорта вылета должен содержать ровно 3 латинские буквы (например: SVO, LED)', 'warning');
        highlightField('departure-airport');
        return;
    }

    if (!/^[A-Z]{3}$/.test(flightData.arrival_airport)) {
        showAlert('Код аэропорта прибытия должен содержать ровно 3 латинские буквы (например: SVO, LED)', 'warning');
        highlightField('arrival-airport');
        return;
    }*/

    // Проверка дат
    try {
        const departureDate = new Date(flightData.departure_time + ':00');
        const arrivalDate = new Date(flightData.arrival_time + ':00');

        if (isNaN(departureDate.getTime())) {
            showAlert('Неверный формат даты вылета', 'warning');
            highlightField('departure-time');
            return;
        }

        if (isNaN(arrivalDate.getTime())) {
            showAlert('Неверный формат даты прибытия', 'warning');
            highlightField('arrival-time');
            return;
        }

        if (arrivalDate <= departureDate) {
            showAlert('Время прибытия должно быть позже времени вылета', 'warning');
            highlightField('arrival-time');
            return;
        }

        // Проверка что рейс не в прошлом
        const now = new Date();
        if (departureDate < now) {
            showAlert('Дата вылета не может быть в прошлом', 'warning');
            highlightField('departure-time');
            return;
        }

    } catch (error) {
        showAlert('Ошибка при обработке дат: ' + error.message, 'danger');
        return;
    }

    // Проверка цен (бизнес должен быть дороже эконом и т.д.)
    if (flightData.business_price < flightData.economy_price) {
        showAlert('Цена бизнес класса должна быть выше цены эконом класса', 'warning');
        highlightField('business-price');
        return;
    }

    if (flightData.first_class_price < flightData.business_price) {
        showAlert('Цена первого класса должна быть выше цены бизнес класса', 'warning');
        highlightField('first-class-price');
        return;
    }

    // Проверка доступных мест
    const totalSeats = flightData.available_economy_seats +
                      flightData.available_business_seats +
                      flightData.available_first_class_seats;

    if (totalSeats <= 0) {
        showAlert('Самолет должен иметь хотя бы одно доступное место', 'warning');
        return;
    }

    try {
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#create-flight-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Создание рейса...';
        submitBtn.disabled = true;

        console.log('📤 Отправляю данные рейса на сервер:', flightData);

        // Форматируем даты для отправки
        const formattedFlightData = {
            ...flightData,
            departure_time: flightData.departure_time + ':00',
            arrival_time: flightData.arrival_time + ':00'
        };

        const response = await api.createFlight(formattedFlightData);
        console.log('✅ Рейс создан успешно:', response);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('create-flight-modal'));
        modal.hide();

        showAlert(`Рейс ${flightData.flight_number} успешно создан!`, 'success');

        // Обновляем список рейсов
        loadAdminFlights();

    } catch (error) {
        console.error('❌ Ошибка создания рейса:', error);

        let errorMessage = 'Ошибка создания рейса';
        if (error.message.includes('already exists') || error.message.includes('уже существует')) {
            errorMessage = `Рейс с номером ${flightData.flight_number} уже существует`;
        } else if (error.message.includes('aircraft not found') || error.message.includes('самолет не найден')) {
            errorMessage = 'Самолет с указанным ID не найден';
        } else if (error.message.includes('airport not found') || error.message.includes('аэропорт не найден')) {
            if (error.message.includes('departure')) {
                errorMessage = `Аэропорт вылета ${flightData.departure_airport} не найден`;
            } else {
                errorMessage = `Аэропорт прибытия ${flightData.arrival_airport} не найден`;
            }
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Ошибка подключения к серверу. Проверьте интернет-соединение';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#create-flight-modal .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = 'Создать рейс';
            submitBtn.disabled = false;
        }
    }
}

// Вспомогательная функция для подсветки невалидных полей
function highlightInvalidFields(fieldNames) {
    // Сначала убираем подсветку у всех полей
    clearAllHighlights();

    fieldNames.forEach(fieldName => {
        switch(fieldName) {
            case 'Номер рейса':
                highlightField('flight-number');
                break;
            case 'ID самолета':
                highlightField('aircraft-id');
                break;
            case 'Аэропорт вылета (3 буквы)':
                highlightField('departure-airport');
                break;
            case 'Аэропорт прибытия (3 буквы)':
                highlightField('arrival-airport');
                break;
            case 'Дата и время вылета':
                highlightField('departure-time');
                break;
            case 'Дата и время прибытия':
                highlightField('arrival-time');
                break;
            case 'Цена эконом класса':
                highlightField('economy-price');
                break;
            case 'Цена бизнес класса':
                highlightField('business-price');
                break;
            case 'Цена первого класса':
                highlightField('first-class-price');
                break;
            case 'Количество мест эконом':
                highlightField('economy-seats');
                break;
            case 'Количество мест бизнес':
                highlightField('business-seats');
                break;
            case 'Количество мест первый класс':
                highlightField('first-class-seats');
                break;
        }
    });
}

// Подсветка конкретного поля
function highlightField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');

        // Добавляем сообщение об ошибке, если его нет
        if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('invalid-feedback')) {
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = getFieldErrorMessage(fieldId);
            field.parentNode.appendChild(feedback);
        }

        // Фокус на поле
        field.focus();
    }
}

// Убрать подсветку со всех полей
function clearAllHighlights() {
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');

        // Удаляем сообщения об ошибках
        const feedback = field.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.remove();
        }
    });
}

// Получить сообщение об ошибке для поля
function getFieldErrorMessage(fieldId) {
    const messages = {
        'flight-number': 'Введите номер рейса (например: SU-123, S7-456)',
        'aircraft-id': 'Введите ID самолета (например: 1, 2, 3)',
        'departure-airport': 'Введите 3-буквенный код аэропорта (например: SVO, LED, DME)',
        'arrival-airport': 'Введите 3-буквенный код аэропорта (например: SVO, LED, DME)',
        'departure-time': 'Выберите дату и время вылета',
        'arrival-time': 'Выберите дату и время прибытия',
        'economy-price': 'Цена должна быть больше 0',
        'business-price': 'Цена должна быть больше 0 и выше эконом класса',
        'first-class-price': 'Цена должна быть больше 0 и выше бизнес класса',
        'economy-seats': 'Количество мест должно быть 0 или больше',
        'business-seats': 'Количество мест должно быть 0 или больше',
        'first-class-seats': 'Количество мест должно быть 0 или больше'
    };

    return messages[fieldId] || 'Заполните это поле';
}


// Создание рейса
async function createFlight(flightData) {
    try {
        await api.createFlight(flightData);
        showAlert('Рейс успешно создан', 'success');
        loadAdminFlights(); // Обновляем список
    } catch (error) {
        showAlert(`Ошибка создания рейса: ${error.message}`, 'danger');
    }
}

// Показать модальное окно создания аэропорта
function showCreateAirportModal() {
    const code = prompt('Код аэропорта (IATA):');
    if (!code) return;

    const name = prompt('Название аэропорта:');
    if (!name) return;

    const city = prompt('Город:');
    if (!city) return;

    const country = prompt('Страна:');
    if (!country) return;

    const timezone = prompt('Часовой пояс (например: Europe/Moscow):');

    const airportData = {
        code: code.toUpperCase(),
        name: name,
        city: city,
        country: country,
        timezone: timezone || undefined
    };

    if (confirm('Создать аэропорт с указанными параметрами?')) {
        createAirport(airportData);
    }
}

// Показать модальное окно создания аэропорта
function showCreateAirportModal() {
    const modalHtml = `
        <div class="modal fade" id="create-airport-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-geo-alt me-2"></i>Добавить новый аэропорт</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="create-airport-form">
                            <div class="row g-3">
                                <!-- Код аэропорта -->
                                <div class="col-md-6">
                                    <label for="airport-code" class="form-label required">Код IATA</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-tag"></i></span>
                                        <input type="text" class="form-control" id="airport-code"
                                               required maxlength="3" placeholder="SVO, LED, DME..."
                                               oninput="this.value = this.value.toUpperCase()">
                                    </div>
                                    <div class="form-text">3 буквы международного кода</div>
                                    <div class="invalid-feedback" id="code-feedback">
                                        Код аэропорта должен содержать 3 буквы
                                    </div>
                                </div>

                                <!-- Название аэропорта -->
                                <div class="col-md-6">
                                    <label for="airport-name" class="form-label required">Название аэропорта</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-building"></i></span>
                                        <input type="text" class="form-control" id="airport-name"
                                               required placeholder="Шереметьево, Домодедово...">
                                    </div>
                                    <div class="form-text">Полное официальное название</div>
                                </div>

                                <!-- Город -->
                                <div class="col-md-6">
                                    <label for="airport-city" class="form-label required">Город</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-geo"></i></span>
                                        <input type="text" class="form-control" id="airport-city"
                                               required placeholder="Москва, Санкт-Петербург...">
                                    </div>
                                    <div class="form-text">Город расположения аэропорта</div>
                                </div>

                                <!-- Страна -->
                                <div class="col-md-6">
                                    <label for="airport-country" class="form-label required">Страна</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-globe"></i></span>
                                        <input type="text" class="form-control" id="airport-country"
                                               required placeholder="Россия">
                                    </div>
                                    <div class="form-text">Страна расположения</div>
                                </div>

                                <!-- Часовой пояс -->
                                <div class="col-md-6">
                                    <label for="airport-timezone" class="form-label">Часовой пояс</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-clock"></i></span>
                                        <select class="form-select" id="airport-timezone">
                                            <option value="">Выберите часовой пояс</option>
                                            <option value="Europe/Moscow">Europe/Moscow (MSK, UTC+3)</option>
                                            <option value="Europe/Kaliningrad">Europe/Kaliningrad (UTC+2)</option>
                                            <option value="Asia/Yekaterinburg">Asia/Yekaterinburg (YEKT, UTC+5)</option>
                                            <option value="Asia/Novosibirsk">Asia/Novosibirsk (NOVT, UTC+7)</option>
                                            <option value="Asia/Krasnoyarsk">Asia/Krasnoyarsk (KRAT, UTC+7)</option>
                                            <option value="Asia/Irkutsk">Asia/Irkutsk (IRKT, UTC+8)</option>
                                            <option value="Asia/Yakutsk">Asia/Yakutsk (YAKT, UTC+9)</option>
                                            <option value="Asia/Vladivostok">Asia/Vladivostok (VLAT, UTC+10)</option>
                                            <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
                                            <option value="Europe/Paris">Europe/Paris (CEST, UTC+2)</option>
                                            <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                                            <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                                        </select>
                                    </div>
                                    <div class="form-text">Основной часовой пояс региона</div>
                                </div>

                                <!-- Координаты -->
                                <div class="col-md-6">
                                    <label class="form-label">Координаты</label>
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <div class="input-group input-group-sm">
                                                <span class="input-group-text">Широта</span>
                                                <input type="number" class="form-control" id="airport-latitude"
                                                       step="0.000001" placeholder="55.972641">
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="input-group input-group-sm">
                                                <span class="input-group-text">Долгота</span>
                                                <input type="number" class="form-control" id="airport-longitude"
                                                       step="0.000001" placeholder="37.414581">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-text">Необязательно, для отображения на карте</div>
                                </div>

                                <!-- Дополнительная информация -->
                                <div class="col-12">
                                    <div class="accordion" id="airport-advanced">
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button"
                                                        data-bs-toggle="collapse" data-bs-target="#advanced-fields">
                                                    <i class="bi bi-gear me-2"></i>Дополнительные параметры
                                                </button>
                                            </h2>
                                            <div id="advanced-fields" class="accordion-collapse collapse"
                                                 data-bs-parent="#airport-advanced">
                                                <div class="accordion-body">
                                                    <div class="row g-3">
                                                        <div class="col-md-6">
                                                            <label for="airport-website" class="form-label">Веб-сайт</label>
                                                            <div class="input-group">
                                                                <span class="input-group-text"><i class="bi bi-link"></i></span>
                                                                <input type="url" class="form-control" id="airport-website"
                                                                       placeholder="https://www.svo.aero">
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <label for="airport-phone" class="form-label">Телефон</label>
                                                            <div class="input-group">
                                                                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                                                                <input type="tel" class="form-control" id="airport-phone"
                                                                       placeholder="+7 (495) 578-65-65">
                                                            </div>
                                                        </div>
                                                        <div class="col-12">
                                                            <label for="airport-description" class="form-label">Описание</label>
                                                            <textarea class="form-control" id="airport-description"
                                                                      rows="2" placeholder="Дополнительная информация..."></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Быстрые шаблоны -->
                                <div class="col-12">
                                    <div class="card border-info">
                                        <div class="card-header bg-info-subtle py-2">
                                            <small><i class="bi bi-lightning me-1"></i>Быстрые шаблоны</small>
                                        </div>
                                        <div class="card-body py-2">
                                            <div class="d-flex flex-wrap gap-2">
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAirportTemplate('SVO', 'Шереметьево', 'Москва')">
                                                    Шереметьево (SVO)
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAirportTemplate('DME', 'Домодедово', 'Москва')">
                                                    Домодедово (DME)
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAirportTemplate('LED', 'Пулково', 'Санкт-Петербург')">
                                                    Пулково (LED)
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAirportTemplate('KZN', 'Казань', 'Казань')">
                                                    Казань (KZN)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Отмена
                        </button>
                        <button type="button" class="btn btn-primary" onclick="submitCreateAirportForm()">
                            <i class="bi bi-plus-circle me-1"></i>Создать аэропорт
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку, если есть
    const oldModal = document.getElementById('create-airport-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById('create-airport-modal'));
    modal.show();

    // Добавляем обработчики валидации
    setupAirportFormValidation();
}

// Функция для заполнения шаблона
function fillAirportTemplate(code, name, city) {
    document.getElementById('airport-code').value = code;
    document.getElementById('airport-name').value = name;
    document.getElementById('airport-city').value = city;
    document.getElementById('airport-country').value = 'Россия';
    document.getElementById('airport-timezone').value = 'Europe/Moscow';

    // Пример координат для популярных аэропортов
    const coordinates = {
        'SVO': { lat: 55.972641, lng: 37.414581 },
        'DME': { lat: 55.414566, lng: 37.899494 },
        'LED': { lat: 59.800292, lng: 30.262503 },
        'KZN': { lat: 55.608178, lng: 49.298183 }
    };

    if (coordinates[code]) {
        document.getElementById('airport-latitude').value = coordinates[code].lat;
        document.getElementById('airport-longitude').value = coordinates[code].lng;
    }

    // Показываем сообщение
    const feedback = document.getElementById('code-feedback');
    feedback.textContent = `Шаблон "${name}" загружен`;
    feedback.className = 'valid-feedback';
    feedback.style.display = 'block';

    setTimeout(() => {
        feedback.style.display = 'none';
    }, 2000);
}

// Настройка валидации формы
function setupAirportFormValidation() {
    const form = document.getElementById('create-airport-form');
    const codeInput = document.getElementById('airport-code');
    const feedback = document.getElementById('code-feedback');

    if (!form || !codeInput) return;

    // Валидация кода IATA
    codeInput.addEventListener('input', function() {
        const value = this.value.trim().toUpperCase();
        const isValid = /^[A-Z]{3}$/.test(value);

        if (value.length > 0 && !isValid) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
            feedback.className = 'invalid-feedback';
            feedback.textContent = 'Код аэропорта должен содержать 3 латинские буквы';
            feedback.style.display = 'block';
        } else if (value.length === 3 && isValid) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
            feedback.className = 'valid-feedback';
            feedback.textContent = 'Код корректен ✓';
            feedback.style.display = 'block';
        } else {
            this.classList.remove('is-invalid', 'is-valid');
            feedback.style.display = 'none';
        }
    });

    // Автодополнение для страны
    const countryInput = document.getElementById('airport-country');
    if (countryInput) {
        const countries = [
            'Россия', 'США', 'Китай', 'Германия', 'Франция', 'Великобритания',
            'Италия', 'Испания', 'Турция', 'Япония', 'Южная Корея', 'ОАЭ'
        ];

        countryInput.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const datalist = this.nextElementSibling;

            // Создаем datalist если его нет
            if (!datalist || datalist.tagName !== 'DATALIST') {
                const newDatalist = document.createElement('datalist');
                newDatalist.id = 'country-list';
                this.setAttribute('list', 'country-list');
                this.parentNode.appendChild(newDatalist);
            }

            const filtered = countries.filter(country =>
                country.toLowerCase().includes(value)
            );

            const datalistElement = document.getElementById('country-list');
            if (datalistElement) {
                datalistElement.innerHTML = filtered.map(country =>
                    `<option value="${country}">`
                ).join('');
            }
        });
    }
}

// Отправка формы создания аэропорта
async function submitCreateAirportForm() {
    // Собираем данные
    const airportData = {
        code: document.getElementById('airport-code').value.toUpperCase().trim(),
        name: document.getElementById('airport-name').value.trim(),
        city: document.getElementById('airport-city').value.trim(),
        country: document.getElementById('airport-country').value.trim(),
        timezone: document.getElementById('airport-timezone').value || undefined,
        latitude: document.getElementById('airport-latitude').value ?
                  parseFloat(document.getElementById('airport-latitude').value) : undefined,
        longitude: document.getElementById('airport-longitude').value ?
                   parseFloat(document.getElementById('airport-longitude').value) : undefined,
        website: document.getElementById('airport-website')?.value.trim() || undefined,
        phone: document.getElementById('airport-phone')?.value.trim() || undefined,
        description: document.getElementById('airport-description')?.value.trim() || undefined
    };

    // Валидация обязательных полей
    const requiredFields = [
        { field: airportData.code, name: 'Код аэропорта' },
        { field: airportData.name, name: 'Название аэропорта' },
        { field: airportData.city, name: 'Город' },
        { field: airportData.country, name: 'Страна' }
    ];

    for (const req of requiredFields) {
        if (!req.field) {
            showAlert(`Пожалуйста, заполните поле: ${req.name}`, 'warning');
            return;
        }
    }

    // Валидация кода IATA
    if (!/^[A-Z]{3}$/.test(airportData.code)) {
        showAlert('Код аэропорта должен содержать ровно 3 латинские буквы', 'warning');
        return;
    }

    // Валидация координат если указаны
    if (airportData.latitude !== undefined) {
        if (airportData.latitude < -90 || airportData.latitude > 90) {
            showAlert('Широта должна быть в диапазоне от -90 до 90', 'warning');
            return;
        }
    }

    if (airportData.longitude !== undefined) {
        if (airportData.longitude < -180 || airportData.longitude > 180) {
            showAlert('Долгота должна быть в диапазоне от -180 до 180', 'warning');
            return;
        }
    }

    try {
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#create-airport-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Создание...';
        submitBtn.disabled = true;

        await api.createAirport(airportData);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('create-airport-modal'));
        modal.hide();

        showAlert(`Аэропорт ${airportData.code} успешно создан!`, 'success');
        loadAdminAirports(); // Обновляем список

    } catch (error) {
        console.error('Ошибка создания аэропорта:', error);

        let errorMessage = 'Ошибка создания аэропорта';
        if (error.message.includes('already exists') || error.message.includes('уже существует')) {
            errorMessage = `Аэропорт с кодом ${airportData.code} уже существует`;
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка подключения к серверу';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#create-airport-modal .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Создать аэропорт';
            submitBtn.disabled = false;
        }
    }
}

// Обновляем функцию загрузки списка аэропортов для админа
async function loadAdminAirports() {
    try {
        const airports = await api.getAirports();
        const airportsList = document.getElementById('admin-airports-list');

        if (airports.length === 0) {
            airportsList.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Аэропорты не найдены. Создайте первый аэропорт.
                </div>
            `;
            return;
        }

        airportsList.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover table-sm align-middle">
                    <thead class="table-light">
                        <tr>
                            <th width="80">Код</th>
                            <th>Название</th>
                            <th>Город</th>
                            <th>Страна</th>
                            <th>Часовой пояс</th>
                            <th width="100" class="text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${airports.map(airport => `
                            <tr>
                                <td>
                                    <span class="badge bg-primary fs-6">${airport.code}</span>
                                </td>
                                <td>
                                    <div class="fw-bold">${airport.name}</div>
                                    ${airport.description ? `
                                        <small class="text-muted">${airport.description.substring(0, 50)}...</small>
                                    ` : ''}
                                </td>
                                <td>${airport.city}</td>
                                <td>
                                    <span class="badge bg-secondary">${airport.country}</span>
                                </td>
                                <td>
                                    <small class="text-muted">${airport.timezone || 'Не указан'}</small>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-outline-primary" title="Редактировать"
                                                onclick="editAirport(${airport.id})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" title="Удалить"
                                                onclick="deleteAirport(${airport.id}, '${airport.code}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="text-muted small mt-2">
                    <i class="bi bi-info-circle me-1"></i>
                    Всего аэропортов: ${airports.length}
                </div>
            </div>
        `;
    } catch (error) {
        airportsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Ошибка загрузки аэропортов: ${error.message}
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadAdminAirports()">
                        <i class="bi bi-arrow-clockwise"></i> Повторить
                    </button>
                </div>
            </div>
        `;
    }
}

// Функции редактирования и удаления (заглушки)
function editAirport(airportId) {
    showAlert(`Редактирование аэропорта ID: ${airportId} (функционал в разработке)`, 'info');
}

function deleteAirport(airportId, airportCode) {
    if (confirm(`Вы уверены, что хотите удалить аэропорт ${airportCode}?`)) {
        showAlert(`Удаление аэропорта ${airportCode} (функционал в разработке)`, 'warning');
    }
}

// Вспомогательные функции
function getFlightStatusName(status) {
    const statuses = {
        'scheduled': 'По расписанию',
        'delayed': 'Задержан',
        'cancelled': 'Отменен',
        'completed': 'Завершен'
    };
    return statuses[status] || status;
}

// Замените функцию editFlight в admin.js:

// Функция редактирования рейса - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function editFlight(flightId) {
    try {
        console.log('✏️ Загрузка данных рейса для редактирования:', flightId);

        // Загружаем данные рейса
        const flight = await api.getFlight(flightId);

        if (!flight) {
            showAlert('Рейс не найден', 'danger');
            return;
        }

        console.log('📋 Данные рейса для редактирования:', flight);

        // Создаем модальное окно редактирования
        showEditFlightModal(flight);

    } catch (error) {
        console.error('❌ Ошибка загрузки рейса для редактирования:', error);
        showAlert(`Ошибка загрузки рейса: ${error.message}`, 'danger');
    }
}



// Показать модальное окно редактирования рейса
function showEditFlightModal(flight) {
    // Форматируем даты для input[type="datetime-local"]
    const formatDateTimeForInput = (dateTimeString) => {
        if (!dateTimeString) return '';
        try {
            const date = new Date(dateTimeString);
            // Убираем секунды и миллисекунды для формата datetime-local
            return date.toISOString().slice(0, 16);
        } catch (error) {
            console.error('Ошибка форматирования даты:', error);
            return dateTimeString;
        }
    };

    const modalHtml = `
        <div class="modal fade" id="edit-flight-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square me-2"></i>Редактирование рейса ${flight.flight_number}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-flight-form">
                            <input type="hidden" id="edit-flight-id" value="${flight.id}">

                            <!-- Информация о рейсе -->
                            <div class="alert alert-info mb-4">
                                <div class="row">
                                    <div class="col-md-6">
                                        <strong>Текущий статус:</strong>
                                        <span class="badge ${getFlightStatusClass(flight.status)} ms-2">
                                            ${getFlightStatusName(flight.status)}
                                        </span>
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Создан:</strong> ${formatDate(flight.created_at)}
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="edit-flight-number" class="form-label required">Номер рейса</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-ticket-detailed"></i></span>
                                        <input type="text" class="form-control" id="edit-flight-number"
                                               value="${flight.flight_number || ''}" required
                                               placeholder="Например: SU-123, S7-456">
                                    </div>
                                    <div class="form-text">Уникальный номер рейса</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="edit-aircraft-id" class="form-label required">ID самолета</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-airplane"></i></span>
                                        <input type="number" class="form-control" id="edit-aircraft-id"
                                               value="${flight.aircraft_id || ''}" required
                                               placeholder="Например: 1" min="1">
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="edit-departure-airport" class="form-label required">Аэропорт вылета</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
                                        <input type="text" class="form-control" id="edit-departure-airport"
                                               value="${flight.departure_airport || ''}" required
                                               placeholder="Например: SVO" maxlength="3"
                                               oninput="this.value = this.value.toUpperCase()">
                                    </div>
                                    <div class="form-text">3-буквенный код IATA</div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="edit-arrival-airport" class="form-label required">Аэропорт прибытия</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-geo-alt-fill"></i></span>
                                        <input type="text" class="form-control" id="edit-arrival-airport"
                                               value="${flight.arrival_airport || ''}" required
                                               placeholder="Например: LED" maxlength="3"
                                               oninput="this.value = this.value.toUpperCase()">
                                    </div>
                                    <div class="form-text">3-буквенный код IATA</div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="edit-departure-time" class="form-label required">Дата и время вылета</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-calendar-event"></i></span>
                                        <input type="datetime-local" class="form-control" id="edit-departure-time"
                                               value="${formatDateTimeForInput(flight.departure_time)}" required>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="edit-arrival-time" class="form-label required">Дата и время прибытия</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-calendar-check"></i></span>
                                        <input type="datetime-local" class="form-control" id="edit-arrival-time"
                                               value="${formatDateTimeForInput(flight.arrival_time)}" required>
                                    </div>
                                </div>
                            </div>

                            <!-- Цены -->
                            <div class="card mb-3">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="bi bi-cash-stack me-2"></i>Цены (₽)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4 mb-3">
                                            <label for="edit-economy-price" class="form-label required">Эконом класс</label>
                                            <div class="input-group">
                                                <span class="input-group-text">₽</span>
                                                <input type="number" class="form-control" id="edit-economy-price"
                                                       value="${flight.economy_price || ''}" required
                                                       min="0" step="100" placeholder="5000">
                                            </div>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label for="edit-business-price" class="form-label required">Бизнес класс</label>
                                            <div class="input-group">
                                                <span class="input-group-text">₽</span>
                                                <input type="number" class="form-control" id="edit-business-price"
                                                       value="${flight.business_price || ''}" required
                                                       min="0" step="100" placeholder="15000">
                                            </div>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label for="edit-first-class-price" class="form-label required">Первый класс</label>
                                            <div class="input-group">
                                                <span class="input-group-text">₽</span>
                                                <input type="number" class="form-control" id="edit-first-class-price"
                                                       value="${flight.first_class_price || ''}" required
                                                       min="0" step="100" placeholder="30000">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Доступные места -->
                            <div class="card mb-3">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="bi bi-people me-2"></i>Доступные места</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4 mb-3">
                                            <label for="edit-economy-seats" class="form-label required">Эконом</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="bi bi-person"></i></span>
                                                <input type="number" class="form-control" id="edit-economy-seats"
                                                       value="${flight.available_economy_seats || ''}" required
                                                       min="0" placeholder="150">
                                            </div>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label for="edit-business-seats" class="form-label required">Бизнес</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                                                <input type="number" class="form-control" id="edit-business-seats"
                                                       value="${flight.available_business_seats || ''}" required
                                                       min="0" placeholder="30">
                                            </div>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label for="edit-first-class-seats" class="form-label required">Первый класс</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="bi bi-person-vip"></i></span>
                                                <input type="number" class="form-control" id="edit-first-class-seats"
                                                       value="${flight.available_first_class_seats || ''}" required
                                                       min="0" placeholder="10">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Статус и дополнительные настройки -->
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="edit-flight-status" class="form-label">Статус рейса</label>
                                    <select class="form-select" id="edit-flight-status">
                                        <option value="scheduled" ${flight.status === 'scheduled' ? 'selected' : ''}>По расписанию</option>
                                        <option value="delayed" ${flight.status === 'delayed' ? 'selected' : ''}>Задержан</option>
                                        <option value="boarding" ${flight.status === 'boarding' ? 'selected' : ''}>Посадка</option>
                                        <option value="departed" ${flight.status === 'departed' ? 'selected' : ''}>Вылетел</option>
                                        <option value="completed" ${flight.status === 'completed' ? 'selected' : ''}>Завершен</option>
                                        <option value="cancelled" ${flight.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                                    </select>
                                </div>

                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Дополнительно</label>
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="edit-flight-active"
                                               ${flight.is_active !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="edit-flight-active">
                                            Рейс активен
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Расширенная информация -->
                            <div class="accordion mb-3" id="flight-advanced-edit">
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button"
                                                data-bs-toggle="collapse" data-bs-target="#advanced-edit-fields">
                                            <i class="bi bi-gear me-2"></i>Дополнительные параметры
                                        </button>
                                    </h2>
                                    <div id="advanced-edit-fields" class="accordion-collapse collapse"
                                         data-bs-parent="#flight-advanced-edit">
                                        <div class="accordion-body">
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label for="edit-flight-duration" class="form-label">Продолжительность (минут)</label>
                                                    <input type="number" class="form-control" id="edit-flight-duration"
                                                           value="${flight.duration_minutes || ''}"
                                                           min="0" placeholder="Автоматически">
                                                    <div class="form-text">Оставьте пустым для автоматического расчета</div>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label for="edit-flight-gate" class="form-label">Выход (Gate)</label>
                                                    <input type="text" class="form-control" id="edit-flight-gate"
                                                           value="${flight.gate || ''}"
                                                           placeholder="Например: A15, B23">
                                                </div>
                                                <div class="col-12 mb-3">
                                                    <label for="edit-flight-notes" class="form-label">Примечания</label>
                                                    <textarea class="form-control" id="edit-flight-notes" rows="2"
                                                              placeholder="Дополнительная информация о рейсе...">${flight.notes || ''}</textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Информация о заполненности -->
                            <div class="alert alert-secondary">
                                <h6><i class="bi bi-bar-chart me-2"></i>Статистика бронирований</h6>
                                <div class="row mt-2">
                                    <div class="col-md-4">
                                        <small>Эконом: ${flight.booked_economy_seats || 0}/${flight.available_economy_seats || 0}</small>
                                        <div class="progress mt-1" style="height: 5px;">
                                            <div class="progress-bar bg-success" style="width: ${flight.available_economy_seats ? Math.min(100, ((flight.booked_economy_seats || 0) / flight.available_economy_seats) * 100) : 0}%"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <small>Бизнес: ${flight.booked_business_seats || 0}/${flight.available_business_seats || 0}</small>
                                        <div class="progress mt-1" style="height: 5px;">
                                            <div class="progress-bar bg-warning" style="width: ${flight.available_business_seats ? Math.min(100, ((flight.booked_business_seats || 0) / flight.available_business_seats) * 100) : 0}%"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <small>Первый класс: ${flight.booked_first_class_seats || 0}/${flight.available_first_class_seats || 0}</small>
                                        <div class="progress mt-1" style="height: 5px;">
                                            <div class="progress-bar bg-danger" style="width: ${flight.available_first_class_seats ? Math.min(100, ((flight.booked_first_class_seats || 0) / flight.available_first_class_seats) * 100) : 0}%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Отмена
                        </button>
                        <button type="button" class="btn btn-danger" onclick="deleteFlight(${flight.id})"
                                data-bs-toggle="tooltip" title="Удалить рейс">
                            <i class="bi bi-trash me-1"></i>Удалить
                        </button>
                        <button type="button" class="btn btn-primary" onclick="submitEditFlightForm()">
                            <i class="bi bi-save me-1"></i>Сохранить изменения
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку, если есть
    const oldModal = document.getElementById('edit-flight-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById('edit-flight-modal'));
    modal.show();

    // Инициализируем всплывающие подсказки
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Устанавливаем валидацию
    setupEditFlightValidation();
}

// Настройка валидации формы редактирования
function setupEditFlightValidation() {
    const form = document.getElementById('edit-flight-form');
    if (!form) return;

    // Валидация кодов аэропортов
    const departureInput = document.getElementById('edit-departure-airport');
    const arrivalInput = document.getElementById('edit-arrival-airport');

    if (departureInput) {
        departureInput.addEventListener('input', function() {
            validateAirportCode(this);
        });
    }

    if (arrivalInput) {
        arrivalInput.addEventListener('input', function() {
            validateAirportCode(this);
        });
    }

    // Валидация дат
    const departureTime = document.getElementById('edit-departure-time');
    const arrivalTime = document.getElementById('edit-arrival-time');

    if (departureTime && arrivalTime) {
        departureTime.addEventListener('change', validateDates);
        arrivalTime.addEventListener('change', validateDates);
    }

    // Валидация цен
    const priceInputs = [
        'edit-economy-price',
        'edit-business-price',
        'edit-first-class-price'
    ];

    priceInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', validatePrices);
        }
    });
}

// Валидация кода аэропорта
function validateAirportCode(input) {
    const value = input.value.trim().toUpperCase();
    const isValid = /^[A-Z]{3}$/.test(value);

    if (value && !isValid) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
    } else if (value && isValid) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    } else {
        input.classList.remove('is-invalid', 'is-valid');
    }
}

// Валидация дат
function validateDates() {
    const departureTime = document.getElementById('edit-departure-time');
    const arrivalTime = document.getElementById('edit-arrival-time');

    if (!departureTime.value || !arrivalTime.value) return;

    const departureDate = new Date(departureTime.value);
    const arrivalDate = new Date(arrivalTime.value);

    if (arrivalDate <= departureDate) {
        arrivalTime.classList.add('is-invalid');
        arrivalTime.classList.remove('is-valid');

        // Показываем сообщение об ошибке
        const feedback = arrivalTime.nextElementSibling || document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = 'Время прибытия должно быть позже времени вылета';

        if (!arrivalTime.nextElementSibling) {
            arrivalTime.parentNode.appendChild(feedback);
        }
    } else {
        arrivalTime.classList.remove('is-invalid');
        arrivalTime.classList.add('is-valid');

        const feedback = arrivalTime.nextElementSibling;
        if (feedback && feedback.className.includes('invalid-feedback')) {
            feedback.remove();
        }
    }
}

// Валидация цен
function validatePrices() {
    const economyPrice = parseFloat(document.getElementById('edit-economy-price')?.value) || 0;
    const businessPrice = parseFloat(document.getElementById('edit-business-price')?.value) || 0;
    const firstClassPrice = parseFloat(document.getElementById('edit-first-class-price')?.value) || 0;

    if (businessPrice < economyPrice) {
        showInlineError('edit-business-price', 'Цена бизнес класса должна быть выше эконом класса');
    } else {
        clearInlineError('edit-business-price');
    }

    if (firstClassPrice < businessPrice) {
        showInlineError('edit-first-class-price', 'Цена первого класса должна быть выше бизнес класса');
    } else {
        clearInlineError('edit-first-class-price');
    }
}

// Показать inline ошибку
function showInlineError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.add('is-invalid');
    element.classList.remove('is-valid');

    const feedback = element.nextElementSibling || document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;

    if (!element.nextElementSibling) {
        element.parentNode.appendChild(feedback);
    }
}

// Очистить inline ошибку
function clearInlineError(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.remove('is-invalid');
    element.classList.add('is-valid');

    const feedback = element.nextElementSibling;
    if (feedback && feedback.className.includes('invalid-feedback')) {
        feedback.remove();
    }
}

// Отправка формы редактирования рейса
async function submitEditFlightForm() {
    try {
        // Собираем данные
        const flightData = {
            flight_number: document.getElementById('edit-flight-number').value,
            aircraft_id: parseInt(document.getElementById('edit-aircraft-id').value),
            departure_airport: document.getElementById('edit-departure-airport').value.toUpperCase(),
            arrival_airport: document.getElementById('edit-arrival-airport').value.toUpperCase(),
            departure_time: document.getElementById('edit-departure-time').value + ':00',
            arrival_time: document.getElementById('edit-arrival-time').value + ':00',
            economy_price: parseFloat(document.getElementById('edit-economy-price').value),
            business_price: parseFloat(document.getElementById('edit-business-price').value),
            first_class_price: parseFloat(document.getElementById('edit-first-class-price').value),
            available_economy_seats: parseInt(document.getElementById('edit-economy-seats').value),
            available_business_seats: parseInt(document.getElementById('edit-business-seats').value),
            available_first_class_seats: parseInt(document.getElementById('edit-first-class-seats').value),
            status: document.getElementById('edit-flight-status').value,
            is_active: document.getElementById('edit-flight-active').checked,
            duration_minutes: document.getElementById('edit-flight-duration').value ?
                            parseInt(document.getElementById('edit-flight-duration').value) : undefined,
            gate: document.getElementById('edit-flight-gate').value || undefined,
            notes: document.getElementById('edit-flight-notes').value || undefined
        };

        const flightId = parseInt(document.getElementById('edit-flight-id').value);

        // Валидация обязательных полей
        const requiredFields = [
            { field: flightData.flight_number, name: 'Номер рейса' },
            { field: flightData.aircraft_id, name: 'ID самолета' },
            { field: flightData.departure_airport, name: 'Аэропорт вылета' },
            { field: flightData.arrival_airport, name: 'Аэропорт прибытия' },
            { field: flightData.departure_time, name: 'Время вылета' },
            { field: flightData.arrival_time, name: 'Время прибытия' }
        ];

        for (const req of requiredFields) {
            if (!req.field && req.field !== 0) {
                showAlert(`Пожалуйста, заполните поле: ${req.name}`, 'warning');
                return;
            }
        }

        // Валидация кодов аэропортов
        if (!/^[A-Z]{3}$/.test(flightData.departure_airport)) {
            showAlert('Код аэропорта вылета должен содержать 3 латинские буквы', 'warning');
            return;
        }

        if (!/^[A-Z]{3}$/.test(flightData.arrival_airport)) {
            showAlert('Код аэропорта прибытия должен содержать 3 латинские буквы', 'warning');
            return;
        }

        // Валидация дат
        const departureDate = new Date(flightData.departure_time);
        const arrivalDate = new Date(flightData.arrival_time);

        if (arrivalDate <= departureDate) {
            showAlert('Время прибытия должно быть позже времени вылета', 'warning');
            return;
        }

        // Валидация цен
        if (flightData.business_price < flightData.economy_price) {
            showAlert('Цена бизнес класса должна быть выше эконом класса', 'warning');
            return;
        }

        if (flightData.first_class_price < flightData.business_price) {
            showAlert('Цена первого класса должна быть выше бизнес класса', 'warning');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#edit-flight-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Сохранение...';
        submitBtn.disabled = true;

        console.log('📤 Отправка обновленных данных рейса:', flightData);

        // Отправляем запрос на обновление
        // Нужно добавить метод updateFlight в api.js или использовать существующий
        const updatedFlight = await updateFlight(flightId, flightData);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-flight-modal'));
        modal.hide();

        showAlert(`Рейс ${flightData.flight_number} успешно обновлен!`, 'success');

        // Обновляем список рейсов
        loadAdminFlights();

    } catch (error) {
        console.error('❌ Ошибка обновления рейса:', error);

        let errorMessage = 'Ошибка обновления рейса';
        if (error.message.includes('404')) {
            errorMessage = 'Рейс не найден';
        } else if (error.message.includes('409')) {
            errorMessage = 'Рейс с таким номером уже существует';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка подключения к серверу';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#edit-flight-modal .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>Сохранить изменения';
            submitBtn.disabled = false;
        }
    }
}

// Функция обновления рейса (нужно добавить в api.js)
// Замените функцию updateFlight в admin.js:

// Функция обновления рейса (использует правильный эндпоинт)
async function updateFlight(flightId, flightData) {
    try {
        console.log('🔄 Обновление рейса:', { flightId, flightData });

        // Используем правильный админ-эндпоинт
        const response = await api.updateFlight(flightId, flightData);
        console.log('✅ Рейс обновлен:', response);
        return response;
    } catch (error) {
        console.error('❌ Ошибка обновления рейса:', error);
        throw error;
    }
}

// Функция удаления рейса
async function deleteFlight(flightId) {
    if (!confirm('Вы уверены, что хотите удалить этот рейс? Все связанные бронирования будут отменены.')) {
        return;
    }

    try {
        const flightNumber = document.getElementById('edit-flight-number')?.value || flightId;

        // Показываем индикатор загрузки
        const deleteBtn = document.querySelector('#edit-flight-modal .btn-danger');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Удаление...';
        deleteBtn.disabled = true;

        // Отправляем запрос на удаление
        // Нужно добавить метод deleteFlight в api.js или использовать существующий
        await deleteFlightRequest(flightId);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-flight-modal'));
        modal.hide();

        showAlert(`Рейс ${flightNumber} успешно удален!`, 'success');

        // Обновляем список рейсов
        loadAdminFlights();

    } catch (error) {
        console.error('❌ Ошибка удаления рейса:', error);

        let errorMessage = 'Ошибка удаления рейса';
        if (error.message.includes('404')) {
            errorMessage = 'Рейс не найден';
        } else if (error.message.includes('403')) {
            errorMessage = 'Нет прав на удаление';
        } else if (error.message.includes('409')) {
            errorMessage = 'Нельзя удалить рейс с активными бронированиями';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const deleteBtn = document.querySelector('#edit-flight-modal .btn-danger');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Удалить';
            deleteBtn.disabled = false;
        }
    }
}

// Замените функцию deleteFlightRequest в admin.js:

// Функция запроса удаления рейса
async function deleteFlightRequest(flightId) {
    try {
        console.log('🗑️ Удаление рейса:', flightId);

        // Используем правильный админ-эндпоинт
        const response = await api.deleteFlight(flightId);
        console.log('✅ Рейс удален:', response);
        return response;
    } catch (error) {
        console.error('❌ Ошибка удаления рейса:', error);
        throw error;
    }
}

// Добавьте также в конец admin.js перед экспортом:
// Обновляем функцию getFlightStatusClass для новых статусов
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

// Добавьте в admin.js после функций редактирования рейсов:

// ========== ФУНКЦИИ ДЛЯ АЭРОПОРТОВ ==========

// Редактирование аэропорта - ПОЛНАЯ ВЕРСИЯ
async function editAirport(airportId) {
    try {
        console.log('✏️ Загрузка данных аэропорта для редактирования:', airportId);

        // Загружаем данные аэропорта
        const airport = await api.getAirports().then(airports =>
            airports.find(a => a.id === airportId)
        );

        if (!airport) {
            showAlert('Аэропорт не найден', 'danger');
            return;
        }

        console.log('📋 Данные аэропорта для редактирования:', airport);

        // Создаем модальное окно редактирования
        showEditAirportModal(airport);

    } catch (error) {
        console.error('❌ Ошибка загрузки аэропорта для редактирования:', error);
        showAlert(`Ошибка загрузки аэропорта: ${error.message}`, 'danger');
    }
}

// Показать модальное окно редактирования аэропорта
function showEditAirportModal(airport) {
    const modalHtml = `
        <div class="modal fade" id="edit-airport-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square me-2"></i>Редактирование аэропорта ${airport.code}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-airport-form">
                            <input type="hidden" id="edit-airport-id" value="${airport.id}">

                            <!-- Информация об аэропорте -->
                            <div class="alert alert-info mb-4">
                                <div class="row">
                                    <div class="col-md-6">
                                        <strong>Код IATA:</strong> ${airport.code}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Создан:</strong> ${formatDate(airport.created_at)}
                                    </div>
                                </div>
                            </div>

                            <div class="row g-3">
                                <!-- Код аэропорта (неизменяемый) -->
                                <div class="col-md-6">
                                    <label class="form-label">Код IATA</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-tag"></i></span>
                                        <input type="text" class="form-control" value="${airport.code}"
                                               disabled style="background-color: #f8f9fa;">
                                    </div>
                                    <div class="form-text">Код IATA нельзя изменить</div>
                                </div>

                                <!-- Название аэропорта -->
                                <div class="col-md-6">
                                    <label for="edit-airport-name" class="form-label required">Название аэропорта</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-building"></i></span>
                                        <input type="text" class="form-control" id="edit-airport-name"
                                               value="${airport.name || ''}" required
                                               placeholder="Шереметьево, Домодедово...">
                                    </div>
                                </div>

                                <!-- Город -->
                                <div class="col-md-6">
                                    <label for="edit-airport-city" class="form-label required">Город</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-geo"></i></span>
                                        <input type="text" class="form-control" id="edit-airport-city"
                                               value="${airport.city || ''}" required
                                               placeholder="Москва, Санкт-Петербург...">
                                    </div>
                                </div>

                                <!-- Страна -->
                                <div class="col-md-6">
                                    <label for="edit-airport-country" class="form-label required">Страна</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-globe"></i></span>
                                        <input type="text" class="form-control" id="edit-airport-country"
                                               value="${airport.country || ''}" required
                                               placeholder="Россия">
                                    </div>
                                </div>

                                <!-- Часовой пояс -->
                                <div class="col-md-6">
                                    <label for="edit-airport-timezone" class="form-label">Часовой пояс</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-clock"></i></span>
                                        <select class="form-select" id="edit-airport-timezone">
                                            <option value="">Выберите часовой пояс</option>
                                            <option value="Europe/Moscow" ${airport.timezone === 'Europe/Moscow' ? 'selected' : ''}>Europe/Moscow (MSK, UTC+3)</option>
                                            <option value="Europe/Kaliningrad" ${airport.timezone === 'Europe/Kaliningrad' ? 'selected' : ''}>Europe/Kaliningrad (UTC+2)</option>
                                            <option value="Asia/Yekaterinburg" ${airport.timezone === 'Asia/Yekaterinburg' ? 'selected' : ''}>Asia/Yekaterinburg (YEKT, UTC+5)</option>
                                            <option value="Asia/Novosibirsk" ${airport.timezone === 'Asia/Novosibirsk' ? 'selected' : ''}>Asia/Novosibirsk (NOVT, UTC+7)</option>
                                            <option value="Asia/Krasnoyarsk" ${airport.timezone === 'Asia/Krasnoyarsk' ? 'selected' : ''}>Asia/Krasnoyarsk (KRAT, UTC+7)</option>
                                            <option value="Asia/Irkutsk" ${airport.timezone === 'Asia/Irkutsk' ? 'selected' : ''}>Asia/Irkutsk (IRKT, UTC+8)</option>
                                            <option value="Asia/Yakutsk" ${airport.timezone === 'Asia/Yakutsk' ? 'selected' : ''}>Asia/Yakutsk (YAKT, UTC+9)</option>
                                            <option value="Asia/Vladivostok" ${airport.timezone === 'Asia/Vladivostok' ? 'selected' : ''}>Asia/Vladivostok (VLAT, UTC+10)</option>
                                            <option value="Europe/London" ${airport.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London (GMT, UTC+0)</option>
                                            <option value="Europe/Paris" ${airport.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris (CEST, UTC+2)</option>
                                            <option value="America/New_York" ${airport.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York (EST, UTC-5)</option>
                                            <option value="Asia/Tokyo" ${airport.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Asia/Tokyo (JST, UTC+9)</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Координаты -->
                                <div class="col-md-6">
                                    <label class="form-label">Координаты</label>
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <div class="input-group input-group-sm">
                                                <span class="input-group-text">Широта</span>
                                                <input type="number" class="form-control" id="edit-airport-latitude"
                                                       step="0.000001" placeholder="55.972641"
                                                       value="${airport.latitude || ''}">
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="input-group input-group-sm">
                                                <span class="input-group-text">Долгота</span>
                                                <input type="number" class="form-control" id="edit-airport-longitude"
                                                       step="0.000001" placeholder="37.414581"
                                                       value="${airport.longitude || ''}">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Дополнительная информация -->
                                <div class="col-12">
                                    <div class="accordion" id="airport-advanced-edit">
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button"
                                                        data-bs-toggle="collapse" data-bs-target="#advanced-edit-airport-fields">
                                                    <i class="bi bi-gear me-2"></i>Дополнительные параметры
                                                </button>
                                            </h2>
                                            <div id="advanced-edit-airport-fields" class="accordion-collapse collapse"
                                                 data-bs-parent="#airport-advanced-edit">
                                                <div class="accordion-body">
                                                    <div class="row g-3">
                                                        <div class="col-md-6">
                                                            <label for="edit-airport-website" class="form-label">Веб-сайт</label>
                                                            <div class="input-group">
                                                                <span class="input-group-text"><i class="bi bi-link"></i></span>
                                                                <input type="url" class="form-control" id="edit-airport-website"
                                                                       placeholder="https://www.svo.aero"
                                                                       value="${airport.website || ''}">
                                                            </div>
                                                        </div>
                                                        <div class="col-md-6">
                                                            <label for="edit-airport-phone" class="form-label">Телефон</label>
                                                            <div class="input-group">
                                                                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                                                                <input type="tel" class="form-control" id="edit-airport-phone"
                                                                       placeholder="+7 (495) 578-65-65"
                                                                       value="${airport.phone || ''}">
                                                            </div>
                                                        </div>
                                                        <div class="col-12">
                                                            <label for="edit-airport-description" class="form-label">Описание</label>
                                                            <textarea class="form-control" id="edit-airport-description"
                                                                      rows="2" placeholder="Дополнительная информация...">${airport.description || ''}</textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Отмена
                        </button>
                        <button type="button" class="btn btn-danger" onclick="deleteAirportRequest(${airport.id})"
                                data-bs-toggle="tooltip" title="Удалить аэропорт">
                            <i class="bi bi-trash me-1"></i>Удалить
                        </button>
                        <button type="button" class="btn btn-primary" onclick="submitEditAirportForm()">
                            <i class="bi bi-save me-1"></i>Сохранить изменения
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку, если есть
    const oldModal = document.getElementById('edit-airport-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById('edit-airport-modal'));
    modal.show();

    // Инициализируем всплывающие подсказки
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Отправка формы редактирования аэропорта
async function submitEditAirportForm() {
    try {
        // Собираем данные
        const airportData = {
            name: document.getElementById('edit-airport-name').value.trim(),
            city: document.getElementById('edit-airport-city').value.trim(),
            country: document.getElementById('edit-airport-country').value.trim(),
            timezone: document.getElementById('edit-airport-timezone').value || undefined,
            latitude: document.getElementById('edit-airport-latitude').value ?
                     parseFloat(document.getElementById('edit-airport-latitude').value) : undefined,
            longitude: document.getElementById('edit-airport-longitude').value ?
                      parseFloat(document.getElementById('edit-airport-longitude').value) : undefined,
            website: document.getElementById('edit-airport-website')?.value.trim() || undefined,
            phone: document.getElementById('edit-airport-phone')?.value.trim() || undefined,
            description: document.getElementById('edit-airport-description')?.value.trim() || undefined
        };

        const airportId = parseInt(document.getElementById('edit-airport-id').value);

        // Валидация обязательных полей
        const requiredFields = [
            { field: airportData.name, name: 'Название аэропорта' },
            { field: airportData.city, name: 'Город' },
            { field: airportData.country, name: 'Страна' }
        ];

        for (const req of requiredFields) {
            if (!req.field) {
                showAlert(`Пожалуйста, заполните поле: ${req.name}`, 'warning');
                return;
            }
        }

        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#edit-airport-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Сохранение...';
        submitBtn.disabled = true;

        console.log('📤 Отправка обновленных данных аэропорта:', airportData);

        // Отправляем запрос на обновление
        const updatedAirport = await api.updateAirport(airportId, airportData);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-airport-modal'));
        modal.hide();

        showAlert(`Аэропорт успешно обновлен!`, 'success');

        // Обновляем список аэропортов
        loadAdminAirports();

    } catch (error) {
        console.error('❌ Ошибка обновления аэропорта:', error);

        let errorMessage = 'Ошибка обновления аэропорта';
        if (error.message.includes('404')) {
            errorMessage = 'Аэропорт не найден';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка подключения к серверу';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#edit-airport-modal .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>Сохранить изменения';
            submitBtn.disabled = false;
        }
    }
}

// Удаление аэропорта (обновленная версия)
async function deleteAirport(airportId, airportCode) {
    if (!confirm(`Вы уверены, что хотите удалить аэропорт ${airportCode}?`)) {
        return;
    }

    try {
        // Показываем индикатор загрузки
        const airportCard = document.querySelector(`.booking-card[data-airport-id="${airportId}"]`);
        if (airportCard) {
            airportCard.style.opacity = '0.7';
            airportCard.innerHTML = `
                <div class="card-body text-center">
                    <div class="spinner-border text-danger" role="status">
                        <span class="visually-hidden">Удаление...</span>
                    </div>
                    <p class="mt-2">Удаление аэропорта...</p>
                </div>
            `;
        }

        // Отправляем запрос на удаление
        await api.deleteAirport(airportId);

        showAlert(`Аэропорт ${airportCode} успешно удален!`, 'success');

        // Обновляем список аэропортов
        loadAdminAirports();

    } catch (error) {
        console.error('❌ Ошибка удаления аэропорта:', error);

        let errorMessage = 'Ошибка удаления аэропорта';
        if (error.message.includes('404')) {
            errorMessage = 'Аэропорт не найден';
        } else if (error.message.includes('403')) {
            errorMessage = 'Нет прав на удаление';
        } else if (error.message.includes('409')) {
            errorMessage = 'Нельзя удалить аэропорт, используемый в рейсах';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем карточку
        if (airportCard) {
            loadAdminAirports();
        }
    }
}

// Функция для удаления аэропорта из модального окна
async function deleteAirportRequest(airportId) {
    const airportCode = document.getElementById('edit-airport-name')?.value || airportId;

    if (!confirm(`Вы уверены, что хотите удалить аэропорт ${airportCode}?`)) {
        return;
    }

    try {
        // Показываем индикатор загрузки
        const deleteBtn = document.querySelector('#edit-airport-modal .btn-danger');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Удаление...';
        deleteBtn.disabled = true;

        // Отправляем запрос на удаление
        await api.deleteAirport(airportId);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-airport-modal'));
        modal.hide();

        showAlert(`Аэропорт ${airportCode} успешно удален!`, 'success');

        // Обновляем список аэропортов
        loadAdminAirports();

    } catch (error) {
        console.error('❌ Ошибка удаления аэропорта:', error);

        let errorMessage = 'Ошибка удаления аэропорта';
        if (error.message.includes('404')) {
            errorMessage = 'Аэропорт не найден';
        } else if (error.message.includes('403')) {
            errorMessage = 'Нет прав на удаление';
        } else if (error.message.includes('409')) {
            errorMessage = 'Нельзя удалить аэропорт, используемый в рейсах';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const deleteBtn = document.querySelector('#edit-airport-modal .btn-danger');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Удалить';
            deleteBtn.disabled = false;
        }
    }
}

// Добавьте в admin.js новую функцию для загрузки секции управления самолетами:

// Загрузка секции управления самолетами
async function loadManageAircraftsSection() {
    const adminContent = document.getElementById('admin-content');

    adminContent.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-airplane-fill"></i> Управление самолетами</h5>
            </div>
            <div class="card-body">
                <button class="btn btn-primary mb-3" onclick="showCreateAircraftModal()">
                    <i class="bi bi-plus-circle"></i> Добавить самолет
                </button>
                <div id="admin-aircrafts-list">
                    Загрузка...
                </div>
            </div>
        </div>
    `;

    await loadAdminAircrafts();
}

// Загрузка списка самолетов
async function loadAdminAircrafts() {
    try {
        const aircrafts = await api.getAircrafts();
        const aircraftsList = document.getElementById('admin-aircrafts-list');

        if (!aircrafts || aircrafts.length === 0) {
            aircraftsList.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Самолеты не найдены. Создайте первый самолет.
                </div>
            `;
            return;
        }

        aircraftsList.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover table-sm align-middle">
                    <thead class="table-light">
                        <tr>
                            <th width="100">Рег. номер</th>
                            <th>Модель</th>
                            <th width="100" class="text-center">Всего мест</th>
                            <th width="100" class="text-center">Эконом</th>
                            <th width="100" class="text-center">Бизнес</th>
                            <th width="100" class="text-center">Первый кл.</th>
                            <th width="100" class="text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${aircrafts.map(aircraft => `
                            <tr>
                                <td>
                                    <span class="badge bg-primary">${aircraft.registration_number}</span>
                                </td>
                                <td>
                                    <div class="fw-bold">${aircraft.model}</div>
                                    <small class="text-muted">ID: ${aircraft.id}</small>
                                </td>
                                <td class="text-center fw-bold">${aircraft.total_seats}</td>
                                <td class="text-center">
                                    <span class="badge bg-success">${aircraft.economy_seats}</span>
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-warning text-dark">${aircraft.business_seats}</span>
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-danger">${aircraft.first_class_seats}</span>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-outline-primary" title="Редактировать"
                                                onclick="editAircraft(${aircraft.id})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" title="Удалить"
                                                onclick="deleteAircraft(${aircraft.id}, '${aircraft.registration_number}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="text-muted small mt-2">
                    <i class="bi bi-info-circle me-1"></i>
                    Всего самолетов: ${aircrafts.length}
                </div>
            </div>
        `;
    } catch (error) {
        aircraftsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Ошибка загрузки самолетов: ${error.message}
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadAdminAircrafts()">
                        <i class="bi bi-arrow-clockwise"></i> Повторить
                    </button>
                </div>
            </div>
        `;
    }
}

// ========== УПРАВЛЕНИЕ САМОЛЕТАМИ ==========

// Загрузка секции управления самолетами
async function loadManageAircraftsSection() {
    const adminContent = document.getElementById('admin-content');

    adminContent.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-airplane-fill"></i> Управление самолетами</h5>
            </div>
            <div class="card-body">
                <button class="btn btn-primary mb-3" onclick="showCreateAircraftModal()">
                    <i class="bi bi-plus-circle"></i> Добавить самолет
                </button>

                <!-- Фильтры и поиск -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="text" class="form-control" id="aircraft-search"
                                   placeholder="Поиск по модели или рег. номеру..."
                                   onkeyup="filterAircrafts()">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <select class="form-select" id="aircraft-sort" onchange="sortAircrafts()">
                            <option value="id">Сортировка: ID</option>
                            <option value="model">Сортировка: Модель</option>
                            <option value="registration_number">Сортировка: Рег. номер</option>
                            <option value="total_seats">Сортировка: Количество мест</option>
                        </select>
                    </div>
                </div>

                <div id="admin-aircrafts-list">
                    Загрузка...
                </div>
            </div>
        </div>
    `;

    await loadAdminAircrafts();
}

// Загрузка списка самолетов
async function loadAdminAircrafts() {
    try {
        const aircrafts = await api.getAircrafts();
        const aircraftsList = document.getElementById('admin-aircrafts-list');

        if (!aircrafts || aircrafts.length === 0) {
            aircraftsList.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-info-circle me-3 fs-4"></i>
                        <div>
                            <h5>Самолеты не найдены</h5>
                            <p class="mb-0">Создайте первый самолет для начала работы</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="showCreateAircraftModal()">
                                <i class="bi bi-plus-circle"></i> Добавить самолет
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Сохраняем самолеты в глобальной переменной для фильтрации
        window.allAircrafts = aircrafts;

        aircraftsList.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover table-sm align-middle">
                    <thead class="table-light">
                        <tr>
                            <th width="120">Рег. номер</th>
                            <th>Модель</th>
                            <th width="100" class="text-center">Всего мест</th>
                            <th width="80" class="text-center">Эконом</th>
                            <th width="80" class="text-center">Бизнес</th>
                            <th width="80" class="text-center">Первый кл.</th>
                            <th width="40" class="text-center">Статус</th>
                            <th width="120" class="text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody id="aircrafts-table-body">
                        ${aircrafts.map(aircraft => `
                            <tr data-aircraft-id="${aircraft.id}" data-search="${(aircraft.model + ' ' + aircraft.registration_number).toLowerCase()}">
                                <td>
                                    <span class="badge bg-primary">${aircraft.registration_number}</span>
                                </td>
                                <td>
                                    <div class="fw-bold">${aircraft.model}</div>
                                    <small class="text-muted">ID: ${aircraft.id}</small>
                                    ${aircraft.notes ? `<div class="text-muted small mt-1">${aircraft.notes.substring(0, 50)}...</div>` : ''}
                                </td>
                                <td class="text-center fw-bold">${aircraft.total_seats}</td>
                                <td class="text-center">
                                    <span class="badge bg-success">${aircraft.economy_seats}</span>
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-warning text-dark">${aircraft.business_seats}</span>
                                </td>
                                <td class="text-center">
                                    <span class="badge bg-danger">${aircraft.first_class_seats}</span>
                                </td>
                                <td class="text-center">
                                    ${aircraft.is_active !== false ? `
                                        <span class="badge bg-success" title="Активен">
                                            <i class="bi bi-check-circle"></i>
                                        </span>
                                    ` : `
                                        <span class="badge bg-secondary" title="Неактивен">
                                            <i class="bi bi-x-circle"></i>
                                        </span>
                                    `}
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <button class="btn btn-outline-primary" title="Редактировать"
                                                onclick="editAircraft(${aircraft.id})">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" title="Удалить"
                                                onclick="deleteAircraft(${aircraft.id}, '${aircraft.registration_number}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div class="text-muted small">
                        <i class="bi bi-info-circle me-1"></i>
                        Всего самолетов: ${aircrafts.length}
                        <span class="ms-3">Всего мест: ${aircrafts.reduce((sum, a) => sum + a.total_seats, 0)}</span>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" onclick="exportAircraftsToCSV()">
                            <i class="bi bi-download"></i> Экспорт CSV
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        const aircraftsList = document.getElementById('admin-aircrafts-list');
        aircraftsList.innerHTML = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle me-3 fs-4"></i>
                    <div>
                        <h5>Ошибка загрузки самолетов</h5>
                        <p class="mb-2">${error.message}</p>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="loadAdminAircrafts()">
                                <i class="bi bi-arrow-clockwise"></i> Повторить попытку
                            </button>
                            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="showCreateAircraftModal()">
                                <i class="bi bi-plus-circle"></i> Создать самолет
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Фильтрация самолетов
function filterAircrafts() {
    const searchTerm = document.getElementById('aircraft-search').value.toLowerCase();
    const rows = document.querySelectorAll('#aircrafts-table-body tr');

    rows.forEach(row => {
        const searchData = row.getAttribute('data-search');
        if (searchData.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Сортировка самолетов
function sortAircrafts() {
    const sortBy = document.getElementById('aircraft-sort').value;
    const rows = Array.from(document.querySelectorAll('#aircrafts-table-body tr'));

    rows.sort((a, b) => {
        const aData = a.querySelector('td');
        const bData = b.querySelector('td');

        switch(sortBy) {
            case 'model':
                const aModel = a.querySelector('td:nth-child(2) .fw-bold').textContent;
                const bModel = b.querySelector('td:nth-child(2) .fw-bold').textContent;
                return aModel.localeCompare(bModel);
            case 'registration_number':
                const aReg = a.querySelector('td:nth-child(1) .badge').textContent;
                const bReg = b.querySelector('td:nth-child(1) .badge').textContent;
                return aReg.localeCompare(bReg);
            case 'total_seats':
                const aSeats = parseInt(a.querySelector('td:nth-child(3)').textContent);
                const bSeats = parseInt(b.querySelector('td:nth-child(3)').textContent);
                return bSeats - aSeats;
            default: // ID
                const aId = parseInt(a.getAttribute('data-aircraft-id'));
                const bId = parseInt(b.getAttribute('data-aircraft-id'));
                return aId - bId;
        }
    });

    const tbody = document.getElementById('aircrafts-table-body');
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// Экспорт самолетов в CSV
function exportAircraftsToCSV() {
    if (!window.allAircrafts || window.allAircrafts.length === 0) {
        showAlert('Нет данных для экспорта', 'warning');
        return;
    }

    let csv = 'ID;Рег. номер;Модель;Всего мест;Эконом;Бизнес;Первый класс;Статус;Примечания\n';

    window.allAircrafts.forEach(aircraft => {
        csv += `${aircraft.id};`;
        csv += `${aircraft.registration_number};`;
        csv += `${aircraft.model};`;
        csv += `${aircraft.total_seats};`;
        csv += `${aircraft.economy_seats};`;
        csv += `${aircraft.business_seats};`;
        csv += `${aircraft.first_class_seats};`;
        csv += `${aircraft.is_active !== false ? 'Активен' : 'Неактивен'};`;
        csv += `"${(aircraft.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `самолеты_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('Список самолетов экспортирован в CSV', 'success');
}

// ========== СОЗДАНИЕ САМОЛЕТА ==========

// Показать модальное окно создания самолета
function showCreateAircraftModal() {
    const modalHtml = `
        <div class="modal fade" id="create-aircraft-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-plus-circle me-2"></i>Добавить новый самолет
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="create-aircraft-form">
                            <div class="row g-3">
                                <!-- Регистрационный номер -->
                                <div class="col-md-6">
                                    <label for="aircraft-registration" class="form-label required">Регистрационный номер</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-tag"></i></span>
                                        <input type="text" class="form-control" id="aircraft-registration"
                                               required maxlength="20" placeholder="RA-12345, VQ-BGD"
                                               oninput="this.value = this.value.toUpperCase()">
                                    </div>
                                    <div class="form-text">Уникальный номер самолета</div>
                                    <div class="invalid-feedback" id="registration-feedback">
                                        Введите регистрационный номер
                                    </div>
                                </div>

                                <!-- Модель самолета -->
                                <div class="col-md-6">
                                    <label for="aircraft-model" class="form-label required">Модель самолета</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-airplane"></i></span>
                                        <select class="form-select" id="aircraft-model" required>
                                            <option value="">Выберите модель</option>
                                            <option value="Airbus A320">Airbus A320</option>
                                            <option value="Airbus A321">Airbus A321</option>
                                            <option value="Airbus A330">Airbus A330</option>
                                            <option value="Boeing 737-800">Boeing 737-800</option>
                                            <option value="Boeing 737-900">Boeing 737-900</option>
                                            <option value="Boeing 777">Boeing 777</option>
                                            <option value="Sukhoi Superjet 100">Sukhoi Superjet 100</option>
                                            <option value="Irkut MC-21">Irkut MC-21</option>
                                            <option value="Embraer E190">Embraer E190</option>
                                        </select>
                                    </div>
                                    <div class="form-text">Основная модель самолета</div>
                                </div>

                                <!-- Всего мест -->
                                <div class="col-md-12">
                                    <label class="form-label required">Конфигурация мест</label>
                                    <div class="card border-secondary">
                                        <div class="card-body">
                                            <div class="row g-3">
                                                <div class="col-md-4">
                                                    <label for="aircraft-total-seats" class="form-label">Всего мест</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-people"></i></span>
                                                        <input type="number" class="form-control" id="aircraft-total-seats"
                                                               required min="1" max="500" value="189" readonly
                                                               style="background-color: #f8f9fa;">
                                                    </div>
                                                    <div class="form-text">Рассчитывается автоматически</div>
                                                </div>
                                                <div class="col-md-4">
                                                    <label for="aircraft-economy-seats" class="form-label">Эконом класс</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-person"></i></span>
                                                        <input type="number" class="form-control" id="aircraft-economy-seats"
                                                               required min="0" max="500" value="162"
                                                               oninput="calculateTotalSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <label for="aircraft-business-seats" class="form-label">Бизнес класс</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                                                        <input type="number" class="form-control" id="aircraft-business-seats"
                                                               required min="0" max="500" value="24"
                                                               oninput="calculateTotalSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-md-4">
                                                    <label for="aircraft-first-class-seats" class="form-label">Первый класс</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-person-vip"></i></span>
                                                        <input type="number" class="form-control" id="aircraft-first-class-seats"
                                                               required min="0" max="500" value="3"
                                                               oninput="calculateTotalSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-md-8">
                                                    <div class="alert alert-info mb-0 h-100 d-flex align-items-center">
                                                        <div>
                                                            <small>
                                                                <i class="bi bi-info-circle me-1"></i>
                                                                Сумма мест по классам должна быть равна общему количеству мест
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Быстрые шаблоны -->
                                <div class="col-12">
                                    <div class="card border-info">
                                        <div class="card-header bg-info-subtle py-2">
                                            <small><i class="bi bi-lightning me-1"></i>Быстрые шаблоны</small>
                                        </div>
                                        <div class="card-body py-2">
                                            <div class="d-flex flex-wrap gap-2">
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAircraftTemplate('Boeing 737-800', 'RA-12345', 162, 24, 3)">
                                                    Boeing 737-800 (189 мест)
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAircraftTemplate('Airbus A320', 'RA-67890', 150, 0, 0)">
                                                    Airbus A320 (150 мест)
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAircraftTemplate('Boeing 777', 'VQ-BGD', 300, 40, 10)">
                                                    Boeing 777 (350 мест)
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info"
                                                        onclick="fillAircraftTemplate('Sukhoi Superjet 100', 'RA-89012', 87, 8, 0)">
                                                    Sukhoi Superjet 100 (95 мест)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Дополнительная информация -->
                                <div class="col-12">
                                    <div class="accordion" id="aircraft-advanced">
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button"
                                                        data-bs-toggle="collapse" data-bs-target="#aircraft-advanced-fields">
                                                    <i class="bi bi-gear me-2"></i>Дополнительные параметры
                                                </button>
                                            </h2>
                                            <div id="aircraft-advanced-fields" class="accordion-collapse collapse"
                                                 data-bs-parent="#aircraft-advanced">
                                                <div class="accordion-body">
                                                    <div class="row g-3">
                                                        <div class="col-md-6">
                                                            <label for="aircraft-manufacturer" class="form-label">Производитель</label>
                                                            <input type="text" class="form-control" id="aircraft-manufacturer"
                                                                   placeholder="Например: Boeing, Airbus">
                                                        </div>
                                                        <div class="col-md-6">
                                                            <label for="aircraft-year" class="form-label">Год выпуска</label>
                                                            <input type="number" class="form-control" id="aircraft-year"
                                                                   min="1950" max="${new Date().getFullYear()}"
                                                                   placeholder="Например: 2018">
                                                        </div>
                                                        <div class="col-12">
                                                            <label for="aircraft-notes" class="form-label">Примечания</label>
                                                            <textarea class="form-control" id="aircraft-notes"
                                                                      rows="2" placeholder="Дополнительная информация о самолете..."></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Отмена
                        </button>
                        <button type="button" class="btn btn-primary" onclick="submitCreateAircraftForm()">
                            <i class="bi bi-plus-circle me-1"></i>Создать самолет
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку, если есть
    const oldModal = document.getElementById('create-aircraft-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById('create-aircraft-modal'));
    modal.show();

    // Инициализируем валидацию
    setupAircraftFormValidation();
}

// Заполнение шаблона самолета
function fillAircraftTemplate(model, registration, economy, business, firstClass) {
    document.getElementById('aircraft-model').value = model;
    document.getElementById('aircraft-registration').value = registration;
    document.getElementById('aircraft-economy-seats').value = economy;
    document.getElementById('aircraft-business-seats').value = business;
    document.getElementById('aircraft-first-class-seats').value = firstClass;

    // Обновляем общее количество мест
    calculateTotalSeats();

    showAlert(`Шаблон "${model}" загружен`, 'success');
}

// Расчет общего количества мест
function calculateTotalSeats() {
    const economy = parseInt(document.getElementById('aircraft-economy-seats').value) || 0;
    const business = parseInt(document.getElementById('aircraft-business-seats').value) || 0;
    const firstClass = parseInt(document.getElementById('aircraft-first-class-seats').value) || 0;

    const totalSeats = economy + business + firstClass;
    document.getElementById('aircraft-total-seats').value = totalSeats;

    // Валидация
    if (totalSeats > 500) {
        document.getElementById('aircraft-total-seats').classList.add('is-invalid');
        showAlert('Общее количество мест не должно превышать 500', 'warning');
    } else if (totalSeats < 1) {
        document.getElementById('aircraft-total-seats').classList.add('is-invalid');
        showAlert('Самолет должен иметь хотя бы 1 место', 'warning');
    } else {
        document.getElementById('aircraft-total-seats').classList.remove('is-invalid');
    }
}

// Настройка валидации формы
function setupAircraftFormValidation() {
    const registrationInput = document.getElementById('aircraft-registration');
    const feedback = document.getElementById('registration-feedback');

    if (registrationInput && feedback) {
        registrationInput.addEventListener('input', function() {
            const value = this.value.trim().toUpperCase();
            const isValid = value.length >= 3 && value.length <= 20 && /^[A-Z0-9-]+$/.test(value);

            if (value && !isValid) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
                feedback.textContent = 'Некорректный регистрационный номер (только буквы, цифры и дефисы)';
            } else if (value && isValid) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
                feedback.textContent = 'Корректный номер ✓';
            } else {
                this.classList.remove('is-invalid', 'is-valid');
                feedback.textContent = 'Введите регистрационный номер';
            }
        });
    }
}

// Отправка формы создания самолета
async function submitCreateAircraftForm() {
    try {
        // Собираем данные
        const aircraftData = {
            model: document.getElementById('aircraft-model').value,
            registration_number: document.getElementById('aircraft-registration').value.toUpperCase().trim(),
            total_seats: parseInt(document.getElementById('aircraft-total-seats').value),
            economy_seats: parseInt(document.getElementById('aircraft-economy-seats').value),
            business_seats: parseInt(document.getElementById('aircraft-business-seats').value),
            first_class_seats: parseInt(document.getElementById('aircraft-first-class-seats').value),
            manufacturer: document.getElementById('aircraft-manufacturer')?.value.trim() || undefined,
            year: document.getElementById('aircraft-year')?.value ? parseInt(document.getElementById('aircraft-year').value) : undefined,
            notes: document.getElementById('aircraft-notes')?.value.trim() || undefined
        };

        // Валидация обязательных полей
        const requiredFields = [
            { field: aircraftData.model, name: 'Модель самолета' },
            { field: aircraftData.registration_number, name: 'Регистрационный номер' },
            { field: aircraftData.total_seats, name: 'Общее количество мест' },
            { field: aircraftData.economy_seats, name: 'Места эконом класса' },
            { field: aircraftData.business_seats, name: 'Места бизнес класса' },
            { field: aircraftData.first_class_seats, name: 'Места первого класса' }
        ];

        for (const req of requiredFields) {
            if (req.field === undefined || req.field === null || req.field === '') {
                showAlert(`Пожалуйста, заполните поле: ${req.name}`, 'warning');
                return;
            }
        }

        // Проверка уникальности регистрационного номера (на фронтенде)
        if (window.allAircrafts) {
            const existing = window.allAircrafts.find(a =>
                a.registration_number.toUpperCase() === aircraftData.registration_number
            );
            if (existing) {
                showAlert(`Самолет с номером ${aircraftData.registration_number} уже существует`, 'warning');
                return;
            }
        }

        // Проверка суммы мест
        const calculatedTotal = aircraftData.economy_seats + aircraftData.business_seats + aircraftData.first_class_seats;
        if (calculatedTotal !== aircraftData.total_seats) {
            showAlert('Сумма мест по классам не совпадает с общим количеством мест', 'warning');
            return;
        }

        if (aircraftData.total_seats > 500 || aircraftData.total_seats < 1) {
            showAlert('Общее количество мест должно быть от 1 до 500', 'warning');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#create-aircraft-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Создание...';
        submitBtn.disabled = true;

        console.log('📤 Отправка данных самолета:', aircraftData);

        // Отправляем запрос на создание
        const newAircraft = await api.createAircraft(aircraftData);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('create-aircraft-modal'));
        modal.hide();

        showAlert(`Самолет ${aircraftData.registration_number} успешно создан!`, 'success');

        // Обновляем список самолетов
        loadAdminAircrafts();

    } catch (error) {
        console.error('❌ Ошибка создания самолета:', error);

        let errorMessage = 'Ошибка создания самолета';
        if (error.message.includes('already exists') || error.message.includes('уже существует')) {
            errorMessage = `Самолет с номером ${aircraftData.registration_number} уже существует`;
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка подключения к серверу';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#create-aircraft-modal .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Создать самолет';
            submitBtn.disabled = false;
        }
    }
}

// ========== РЕДАКТИРОВАНИЕ САМОЛЕТА ==========

// Редактирование самолета
async function editAircraft(aircraftId) {
    try {
        console.log('✏️ Загрузка данных самолета для редактирования:', aircraftId);

        // Загружаем данные самолета
        const aircraft = await api.getAircraft(aircraftId);

        if (!aircraft) {
            showAlert('Самолет не найден', 'danger');
            return;
        }

        console.log('📋 Данные самолета для редактирования:', aircraft);

        // Создаем модальное окно редактирования
        showEditAircraftModal(aircraft);

    } catch (error) {
        console.error('❌ Ошибка загрузки самолета для редактирования:', error);
        showAlert(`Ошибка загрузки самолета: ${error.message}`, 'danger');
    }
}

// Показать модальное окно редактирования самолета
function showEditAircraftModal(aircraft) {
    const modalHtml = `
        <div class="modal fade" id="edit-aircraft-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square me-2"></i>Редактирование самолета ${aircraft.registration_number}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-aircraft-form">
                            <input type="hidden" id="edit-aircraft-id" value="${aircraft.id}">

                            <!-- Информация о самолете -->
                            <div class="alert alert-info mb-4">
                                <div class="row">
                                    <div class="col-md-6">
                                        <strong>ID:</strong> ${aircraft.id}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Создан:</strong> ${formatDate(aircraft.created_at)}
                                    </div>
                                </div>
                            </div>

                            <div class="row g-3">
                                <!-- Регистрационный номер -->
                                <div class="col-md-6">
                                    <label for="edit-aircraft-registration" class="form-label required">Регистрационный номер</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-tag"></i></span>
                                        <input type="text" class="form-control" id="edit-aircraft-registration"
                                               value="${aircraft.registration_number || ''}" required
                                               maxlength="20" oninput="this.value = this.value.toUpperCase()">
                                    </div>
                                </div>

                                <!-- Модель самолета -->
                                <div class="col-md-6">
                                    <label for="edit-aircraft-model" class="form-label required">Модель самолета</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-airplane"></i></span>
                                        <input type="text" class="form-control" id="edit-aircraft-model"
                                               value="${aircraft.model || ''}" required
                                               placeholder="Например: Boeing 737-800">
                                    </div>
                                </div>

                                <!-- Конфигурация мест -->
                                <div class="col-md-12">
                                    <label class="form-label required">Конфигурация мест</label>
                                    <div class="card border-secondary">
                                        <div class="card-body">
                                            <div class="row g-3">
                                                <div class="col-md-3">
                                                    <label for="edit-aircraft-total-seats" class="form-label">Всего мест</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-people"></i></span>
                                                        <input type="number" class="form-control" id="edit-aircraft-total-seats"
                                                               value="${aircraft.total_seats || 0}" required min="1" max="500"
                                                               oninput="validateEditAircraftSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <label for="edit-aircraft-economy-seats" class="form-label">Эконом</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-person"></i></span>
                                                        <input type="number" class="form-control" id="edit-aircraft-economy-seats"
                                                               value="${aircraft.economy_seats || 0}" required min="0" max="500"
                                                               oninput="validateEditAircraftSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <label for="edit-aircraft-business-seats" class="form-label">Бизнес</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                                                        <input type="number" class="form-control" id="edit-aircraft-business-seats"
                                                               value="${aircraft.business_seats || 0}" required min="0" max="500"
                                                               oninput="validateEditAircraftSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <label for="edit-aircraft-first-class-seats" class="form-label">Первый кл.</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text"><i class="bi bi-person-vip"></i></span>
                                                        <input type="number" class="form-control" id="edit-aircraft-first-class-seats"
                                                               value="${aircraft.first_class_seats || 0}" required min="0" max="500"
                                                               oninput="validateEditAircraftSeats()">
                                                    </div>
                                                </div>
                                                <div class="col-12">
                                                    <div class="alert" id="edit-seats-alert" style="display: none;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Статус самолета -->
                                <div class="col-md-6">
                                    <label class="form-label">Статус самолета</label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="edit-aircraft-active"
                                               ${aircraft.is_active !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="edit-aircraft-active">
                                            Самолет активен и доступен для полетов
                                        </label>
                                    </div>
                                </div>

                                <!-- Производитель -->
                                <div class="col-md-6">
                                    <label for="edit-aircraft-manufacturer" class="form-label">Производитель</label>
                                    <input type="text" class="form-control" id="edit-aircraft-manufacturer"
                                           value="${aircraft.manufacturer || ''}"
                                           placeholder="Например: Boeing, Airbus">
                                </div>

                                <!-- Год выпуска -->
                                <div class="col-md-6">
                                    <label for="edit-aircraft-year" class="form-label">Год выпуска</label>
                                    <input type="number" class="form-control" id="edit-aircraft-year"
                                           value="${aircraft.year || ''}"
                                           min="1950" max="${new Date().getFullYear()}"
                                           placeholder="Например: 2018">
                                </div>

                                <!-- Примечания -->
                                <div class="col-12">
                                    <label for="edit-aircraft-notes" class="form-label">Примечания</label>
                                    <textarea class="form-control" id="edit-aircraft-notes" rows="3"
                                              placeholder="Дополнительная информация о самолете...">${aircraft.notes || ''}</textarea>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Отмена
                        </button>
                        <button type="button" class="btn btn-danger" onclick="deleteAircraftRequest(${aircraft.id})"
                                data-bs-toggle="tooltip" title="Удалить самолет">
                            <i class="bi bi-trash me-1"></i>Удалить
                        </button>
                        <button type="button" class="btn btn-primary" onclick="submitEditAircraftForm()">
                            <i class="bi bi-save me-1"></i>Сохранить изменения
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Удаляем старую модалку, если есть
    const oldModal = document.getElementById('edit-aircraft-modal');
    if (oldModal) oldModal.remove();

    // Добавляем новую модалку
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Показываем модалку
    const modal = new bootstrap.Modal(document.getElementById('edit-aircraft-modal'));
    modal.show();

    // Инициализируем валидацию
    validateEditAircraftSeats();
}

// Валидация мест при редактировании
function validateEditAircraftSeats() {
    const totalSeats = parseInt(document.getElementById('edit-aircraft-total-seats')?.value) || 0;
    const economySeats = parseInt(document.getElementById('edit-aircraft-economy-seats')?.value) || 0;
    const businessSeats = parseInt(document.getElementById('edit-aircraft-business-seats')?.value) || 0;
    const firstClassSeats = parseInt(document.getElementById('edit-aircraft-first-class-seats')?.value) || 0;

    const sumSeats = economySeats + businessSeats + firstClassSeats;
    const alertDiv = document.getElementById('edit-seats-alert');

    if (alertDiv) {
        if (sumSeats !== totalSeats) {
            alertDiv.className = 'alert alert-warning';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>
                Сумма мест по классам (${sumSeats}) не совпадает с общим количеством мест (${totalSeats})
            `;
            alertDiv.style.display = 'block';
        } else if (totalSeats > 500) {
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-octagon me-2"></i>
                Общее количество мест не должно превышать 500
            `;
            alertDiv.style.display = 'block';
        } else if (totalSeats < 1) {
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-octagon me-2"></i>
                Самолет должен иметь хотя бы 1 место
            `;
            alertDiv.style.display = 'block';
        } else {
            alertDiv.className = 'alert alert-success';
            alertDiv.innerHTML = `
                <i class="bi bi-check-circle me-2"></i>
                Конфигурация мест корректна
            `;
            alertDiv.style.display = 'block';
        }
    }
}

// Отправка формы редактирования самолета
async function submitEditAircraftForm() {
    try {
        // Собираем данные
        const aircraftData = {
            model: document.getElementById('edit-aircraft-model').value.trim(),
            registration_number: document.getElementById('edit-aircraft-registration').value.toUpperCase().trim(),
            total_seats: parseInt(document.getElementById('edit-aircraft-total-seats').value),
            economy_seats: parseInt(document.getElementById('edit-aircraft-economy-seats').value),
            business_seats: parseInt(document.getElementById('edit-aircraft-business-seats').value),
            first_class_seats: parseInt(document.getElementById('edit-aircraft-first-class-seats').value),
            is_active: document.getElementById('edit-aircraft-active').checked,
            manufacturer: document.getElementById('edit-aircraft-manufacturer')?.value.trim() || undefined,
            year: document.getElementById('edit-aircraft-year')?.value ? parseInt(document.getElementById('edit-aircraft-year').value) : undefined,
            notes: document.getElementById('edit-aircraft-notes')?.value.trim() || undefined
        };

        const aircraftId = parseInt(document.getElementById('edit-aircraft-id').value);

        // Валидация обязательных полей
        const requiredFields = [
            { field: aircraftData.model, name: 'Модель самолета' },
            { field: aircraftData.registration_number, name: 'Регистрационный номер' },
            { field: aircraftData.total_seats, name: 'Общее количество мест' },
            { field: aircraftData.economy_seats, name: 'Места эконом класса' },
            { field: aircraftData.business_seats, name: 'Места бизнес класса' },
            { field: aircraftData.first_class_seats, name: 'Места первого класса' }
        ];

        for (const req of requiredFields) {
            if (req.field === undefined || req.field === null || req.field === '') {
                showAlert(`Пожалуйста, заполните поле: ${req.name}`, 'warning');
                return;
            }
        }

        // Проверка суммы мест
        const sumSeats = aircraftData.economy_seats + aircraftData.business_seats + aircraftData.first_class_seats;
        if (sumSeats !== aircraftData.total_seats) {
            showAlert('Сумма мест по классам не совпадает с общим количеством мест', 'warning');
            return;
        }

        if (aircraftData.total_seats > 500 || aircraftData.total_seats < 1) {
            showAlert('Общее количество мест должно быть от 1 до 500', 'warning');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('#edit-aircraft-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Сохранение...';
        submitBtn.disabled = true;

        console.log('📤 Отправка обновленных данных самолета:', aircraftData);

        // Отправляем запрос на обновление
        const updatedAircraft = await api.updateAircraft(aircraftId, aircraftData);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-aircraft-modal'));
        modal.hide();

        showAlert(`Самолет ${aircraftData.registration_number} успешно обновлен!`, 'success');

        // Обновляем список самолетов
        loadAdminAircrafts();

    } catch (error) {
        console.error('❌ Ошибка обновления самолета:', error);

        let errorMessage = 'Ошибка обновления самолета';
        if (error.message.includes('404')) {
            errorMessage = 'Самолет не найден';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка подключения к серверу';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#edit-aircraft-modal .btn-primary');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>Сохранить изменения';
            submitBtn.disabled = false;
        }
    }
}

// ========== УДАЛЕНИЕ САМОЛЕТА ==========

// Удаление самолета из списка
async function deleteAircraft(aircraftId, registrationNumber) {
    if (!confirm(`Вы уверены, что хотите удалить самолет ${registrationNumber}?\n\nВНИМАНИЕ: Если самолет используется в активных рейсах, удаление будет невозможно.`)) {
        return;
    }

    try {
        // Находим строку в таблице
        const aircraftRow = document.querySelector(`tr[data-aircraft-id="${aircraftId}"]`);
        if (aircraftRow) {
            aircraftRow.style.opacity = '0.7';
            aircraftRow.innerHTML = `
                <td colspan="8" class="text-center">
                    <div class="spinner-border spinner-border-sm text-danger" role="status">
                        <span class="visually-hidden">Удаление...</span>
                    </div>
                    Удаление самолета...
                </td>
            `;
        }

        // Отправляем запрос на удаление
        await api.deleteAircraft(aircraftId);

        showAlert(`Самолет ${registrationNumber} успешно удален!`, 'success');

        // Обновляем список самолетов
        loadAdminAircrafts();

    } catch (error) {
        console.error('❌ Ошибка удаления самолета:', error);

        let errorMessage = 'Ошибка удаления самолета';
        if (error.message.includes('404')) {
            errorMessage = 'Самолет не найден';
        } else if (error.message.includes('403')) {
            errorMessage = 'Нет прав на удаление';
        } else if (error.message.includes('409')) {
            errorMessage = 'Нельзя удалить самолет, используемый в активных рейсах';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем строку
        loadAdminAircrafts();
    }
}

// Удаление самолета из модального окна
async function deleteAircraftRequest(aircraftId) {
    const registrationNumber = document.getElementById('edit-aircraft-registration')?.value || aircraftId;

    if (!confirm(`Вы уверены, что хотите удалить самолет ${registrationNumber}?\n\nВНИМАНИЕ: Если самолет используется в активных рейсах, удаление будет невозможно.`)) {
        return;
    }

    try {
        // Показываем индикатор загрузки
        const deleteBtn = document.querySelector('#edit-aircraft-modal .btn-danger');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Удаление...';
        deleteBtn.disabled = true;

        // Отправляем запрос на удаление
        await api.deleteAircraft(aircraftId);

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('edit-aircraft-modal'));
        modal.hide();

        showAlert(`Самолет ${registrationNumber} успешно удален!`, 'success');

        // Обновляем список самолетов
        loadAdminAircrafts();

    } catch (error) {
        console.error('❌ Ошибка удаления самолета:', error);

        let errorMessage = 'Ошибка удаления самолета';
        if (error.message.includes('404')) {
            errorMessage = 'Самолет не найден';
        } else if (error.message.includes('403')) {
            errorMessage = 'Нет прав на удаление';
        } else if (error.message.includes('409')) {
            errorMessage = 'Нельзя удалить самолет, используемый в активных рейсах';
        } else {
            errorMessage = `Ошибка: ${error.message}`;
        }

        showAlert(errorMessage, 'danger');

        // Восстанавливаем кнопку
        const deleteBtn = document.querySelector('#edit-aircraft-modal .btn-danger');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Удалить';
            deleteBtn.disabled = false;
        }
    }
}

// Обновляем функцию showAdminSection для поддержки самолетов
function showAdminSection(section) {
    const adminContent = document.getElementById('admin-content');

    switch(section) {
        case 'manage-flights':
            loadManageFlightsSection();
            break;
        case 'manage-users':
            loadManageUsersSection();
            break;
        case 'manage-airports':
            loadManageAirportsSection();
            break;
        case 'manage-aircrafts':
            loadManageAircraftsSection();
            break;
    }
}

// Экспортируем новые функции
window.loadManageAircraftsSection = loadManageAircraftsSection;
window.showCreateAircraftModal = showCreateAircraftModal;
window.editAircraft = editAircraft;
window.deleteAircraft = deleteAircraft;
window.submitCreateAircraftForm = submitCreateAircraftForm;
window.submitEditAircraftForm = submitEditAircraftForm;
window.fillAircraftTemplate = fillAircraftTemplate;
window.calculateTotalSeats = calculateTotalSeats;
window.filterAircrafts = filterAircrafts;
window.sortAircrafts = sortAircrafts;
window.exportAircraftsToCSV = exportAircraftsToCSV