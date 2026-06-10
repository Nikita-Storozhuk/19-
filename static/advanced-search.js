// advanced-search.js - ОБНОВЛЕННАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
class AdvancedSearch {
    constructor() {
        this.isExpanded = false;
        this.searchParams = {
            departure_airport: '',
            arrival_airport: '',
            departure_date: '',
            min_price: null,
            max_price: null,
            airline: '',
            seat_class: '',
            departure_time_range: '',
            sort_by: 'departure_time',
            sort_order: 'asc'
        };
        this.airports = [];
        this.init();
    }

    init() {
        this.setupAutocomplete();
        this.loadAirportSuggestions();
    }

    async loadAirportSuggestions() {
        try {
            // Загружаем список аэропортов для автодополнения
            if (api && api.getAirports) {
                const airports = await api.getAirports({ limit: 500 });
                this.airports = airports;
                this.setupAutocomplete();
            }
        } catch (error) {
            console.log('Не удалось загрузить список аэропортов:', error);
        }
    }

    setupAutocomplete() {
        // Настройка автодополнения для полей аэропортов
        const departureInput = document.getElementById('departure-airport');
        const arrivalInput = document.getElementById('arrival-airport');
        const airlineInput = document.getElementById('airline-filter');

        if (departureInput && this.airports) {
            this.setupAirportAutocomplete(departureInput);
        }

        if (arrivalInput && this.airports) {
            this.setupAirportAutocomplete(arrivalInput);
        }

        // Автодополнение для авиакомпаний
        if (airlineInput) {
            this.setupAirlineAutocomplete(airlineInput);
        }
    }

    setupAirportAutocomplete(inputElement) {
        let timeout;
        const containerId = `${inputElement.id}-suggestions`;

        inputElement.addEventListener('input', async (e) => {
            const value = e.target.value.trim();

            if (timeout) clearTimeout(timeout);

            if (value.length < 2) {
                this.hideSuggestions(containerId);
                return;
            }

            timeout = setTimeout(async () => {
                try {
                    // Используем search API для поиска аэропортов
                    const airports = await api.searchAirports({
                        query: value,
                        limit: 10
                    });

                    this.showAirportSuggestions(inputElement, containerId, airports);
                } catch (error) {
                    console.error('Ошибка поиска аэропортов:', error);
                }
            }, 300);
        });

        inputElement.addEventListener('blur', () => {
            setTimeout(() => this.hideSuggestions(containerId), 200);
        });

        inputElement.addEventListener('focus', () => {
            const value = inputElement.value.trim();
            if (value.length >= 2) {
                inputElement.dispatchEvent(new Event('input'));
            }
        });
    }

    setupAirlineAutocomplete(inputElement) {
        let timeout;
        const containerId = `${inputElement.id}-suggestions`;

        inputElement.addEventListener('input', async (e) => {
            const value = e.target.value.trim();

            if (timeout) clearTimeout(timeout);

            if (value.length < 2) {
                this.hideSuggestions(containerId);
                return;
            }

            timeout = setTimeout(async () => {
                try {
                    // Получаем подсказки по рейсам
                    const suggestions = await api.getFlightSuggestions(value, 5);

                    // Извлекаем уникальные авиакомпании
                    const airlines = [...new Set(suggestions.map(f => f.airline || f.flight_number?.split(' ')[0] || ''))];

                    this.showAirlineSuggestions(inputElement, containerId, airlines);
                } catch (error) {
                    console.error('Ошибка поиска авиакомпаний:', error);
                }
            }, 300);
        });

        inputElement.addEventListener('blur', () => {
            setTimeout(() => this.hideSuggestions(containerId), 200);
        });
    }

    showAirportSuggestions(inputElement, containerId, airports) {
        this.hideSuggestions(containerId);

        if (!airports || airports.length === 0) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = containerId;
        suggestionsDiv.className = 'autocomplete-suggestions';
        suggestionsDiv.style.cssText = `
            position: absolute;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 5px;
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
            width: ${inputElement.offsetWidth}px;
            box-shadow: 0 2px 10px var(--shadow-color);
            margin-top: 2px;
        `;

        airports.forEach(airport => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-bottom: 1px solid var(--border-color);
            `;
            suggestionItem.innerHTML = `
                <strong>${airport.code}</strong> - ${airport.name}<br>
                <small class="text-muted">${airport.city}, ${airport.country}</small>
            `;

            suggestionItem.addEventListener('mouseenter', () => {
                suggestionItem.style.backgroundColor = 'var(--table-hover)';
            });

            suggestionItem.addEventListener('mouseleave', () => {
                suggestionItem.style.backgroundColor = '';
            });

            suggestionItem.addEventListener('click', () => {
                inputElement.value = airport.code;
                this.hideSuggestions(containerId);

                // Обновляем параметры поиска
                if (inputElement.id === 'departure-airport') {
                    this.searchParams.departure_airport = airport.code;
                } else {
                    this.searchParams.arrival_airport = airport.code;
                }
            });

            suggestionsDiv.appendChild(suggestionItem);
        });

        inputElement.parentNode.appendChild(suggestionsDiv);
    }

    showAirlineSuggestions(inputElement, containerId, airlines) {
        this.hideSuggestions(containerId);

        if (!airlines || airlines.length === 0) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = containerId;
        suggestionsDiv.className = 'autocomplete-suggestions';
        suggestionsDiv.style.cssText = `
            position: absolute;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 5px;
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
            width: ${inputElement.offsetWidth}px;
            box-shadow: 0 2px 10px var(--shadow-color);
            margin-top: 2px;
        `;

        airlines.forEach(airline => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-bottom: 1px solid var(--border-color);
            `;
            suggestionItem.textContent = airline;

            suggestionItem.addEventListener('mouseenter', () => {
                suggestionItem.style.backgroundColor = 'var(--table-hover)';
            });

            suggestionItem.addEventListener('mouseleave', () => {
                suggestionItem.style.backgroundColor = '';
            });

            suggestionItem.addEventListener('click', () => {
                inputElement.value = airline;
                this.hideSuggestions(containerId);
                this.searchParams.airline = airline;
            });

            suggestionsDiv.appendChild(suggestionItem);
        });

        inputElement.parentNode.appendChild(suggestionsDiv);
    }

    hideSuggestions(containerId) {
        const suggestions = document.getElementById(containerId);
        if (suggestions) {
            suggestions.remove();
        }
    }

    showAdvancedSearch() {
        const container = document.getElementById('advanced-search-container');
        if (!container) return;

        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            container.innerHTML = this.getAdvancedSearchForm();
            this.setupAdvancedFormListeners();
            container.style.display = 'block';

            // Анимация появления
            container.style.opacity = '0';
            container.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                container.style.transition = 'all 0.3s ease';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 10);

        } else {
            // Анимация скрытия
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '0';
            container.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                container.style.display = 'none';
                container.innerHTML = '';
            }, 300);
        }
    }

    getAdvancedSearchForm() {
        return `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-light">
                    <h5 class="mb-0"><i class="bi bi-funnel me-2"></i>Расширенный поиск</h5>
                </div>
                <div class="card-body">
                    <form id="advanced-search-form" onsubmit="return advancedSearch.search(event)">
                        <div class="row g-3">
                            <!-- Цена -->
                            <div class="col-md-6">
                                <label for="min-price" class="form-label">Цена от (₽)</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="min-price"
                                           placeholder="0" min="0" step="100">
                                    <span class="input-group-text">₽</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label for="max-price" class="form-label">Цена до (₽)</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="max-price"
                                           placeholder="100000" min="0" step="100">
                                    <span class="input-group-text">₽</span>
                                </div>
                            </div>

                            <!-- Время вылета -->
                            <div class="col-md-6">
                                <label for="departure-time-range" class="form-label">Время вылета</label>
                                <select class="form-select" id="departure-time-range">
                                    <option value="">Любое время</option>
                                    <option value="morning">Утро (06:00-12:00)</option>
                                    <option value="day">День (12:00-18:00)</option>
                                    <option value="evening">Вечер (18:00-00:00)</option>
                                    <option value="night">Ночь (00:00-06:00)</option>
                                </select>
                            </div>

                            <!-- Класс обслуживания -->
                            <div class="col-md-6">
                                <label for="seat-class-filter" class="form-label">Класс обслуживания</label>
                                <select class="form-select" id="seat-class-filter">
                                    <option value="">Любой класс</option>
                                    <option value="economy">Эконом класс</option>
                                    <option value="business">Бизнес класс</option>
                                    <option value="first_class">Первый класс</option>
                                </select>
                            </div>

                            <!-- Авиакомпания -->
                            <div class="col-md-12">
                                <label for="airline-filter" class="form-label">Авиакомпания или номер рейса</label>
                                <input type="text" class="form-control" id="airline-filter"
                                       placeholder="Например: SU, S7, Aeroflot">
                                <div class="form-text">Начните вводить для получения подсказок</div>
                            </div>

                            <!-- Сортировка -->
                            <div class="col-md-12">
                                <label for="sort-by" class="form-label">Сортировать по</label>
                                <div class="row g-2">
                                    <div class="col-8">
                                        <select class="form-select" id="sort-by">
                                            <option value="departure_time">Времени вылета</option>
                                            <option value="price">Цене</option>
                                            <option value="duration">Длительности полета</option>
                                        </select>
                                    </div>
                                    <div class="col-4">
                                        <select class="form-select" id="sort-order">
                                            <option value="asc">По возрастанию</option>
                                            <option value="desc">По убыванию</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Быстрые фильтры -->
                            <div class="col-12">
                                <div class="card bg-light">
                                    <div class="card-body py-2">
                                        <div class="d-flex flex-wrap gap-2">
                                            <button type="button" class="btn btn-sm btn-outline-primary"
                                                    onclick="advancedSearch.applyQuickFilter('cheapest')">
                                                <i class="bi bi-currency-dollar"></i> Самые дешевые
                                            </button>
                                            <button type="button" class="btn btn-sm btn-outline-primary"
                                                    onclick="advancedSearch.applyQuickFilter('upcoming')">
                                                <i class="bi bi-clock"></i> Ближайшие рейсы
                                            </button>
                                            <button type="button" class="btn btn-sm btn-outline-primary"
                                                    onclick="advancedSearch.applyQuickFilter('morning')">
                                                <i class="bi bi-sun"></i> Утренние вылеты
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Кнопки -->
                            <div class="col-12">
                                <div class="d-flex justify-content-between">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-search me-2"></i>Применить фильтры
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" onclick="advancedSearch.resetFilters()">
                                        <i class="bi bi-x-circle me-2"></i>Сбросить фильтры
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupAdvancedFormListeners() {
        const form = document.getElementById('advanced-search-form');
        if (!form) return;

        // Заполняем значения из базового поиска
        this.syncWithBasicSearch();

        // Обработчик изменения цены
        const minPrice = document.getElementById('min-price');
        const maxPrice = document.getElementById('max-price');

        if (minPrice && maxPrice) {
            minPrice.addEventListener('change', () => this.validatePriceRange(minPrice, maxPrice));
            maxPrice.addEventListener('change', () => this.validatePriceRange(minPrice, maxPrice));
        }

        // Обработчик изменения времени вылета
        const timeRange = document.getElementById('departure-time-range');
        if (timeRange) {
            timeRange.addEventListener('change', (e) => {
                this.searchParams.departure_time_range = e.target.value;
            });
        }
    }

    syncWithBasicSearch() {
        // Синхронизируем с полями базового поиска
        const departureInput = document.getElementById('departure-airport');
        const arrivalInput = document.getElementById('arrival-airport');
        const dateInput = document.getElementById('departure-date');

        if (departureInput) this.searchParams.departure_airport = departureInput.value;
        if (arrivalInput) this.searchParams.arrival_airport = arrivalInput.value;
        if (dateInput) {
            if (dateInput.value) {
                const date = new Date(dateInput.value);
                this.searchParams.departure_date = date.toISOString();
            } else {
                this.searchParams.departure_date = '';
            }
        }
    }

    validatePriceRange(minInput, maxInput) {
        const minValue = parseInt(minInput.value) || 0;
        const maxValue = parseInt(maxInput.value) || 0;

        if (minValue > maxValue && maxValue > 0) {
            showAlert('Минимальная цена не может быть больше максимальной', 'warning');
            minInput.value = maxValue;
        }

        this.searchParams.min_price = minValue || null;
        this.searchParams.max_price = maxValue || null;
    }

    async search(event) {
        if (event) event.preventDefault();

        try {
            // Показываем индикатор загрузки
            const submitBtn = event?.target?.querySelector('button[type="submit"]');
            let originalText = 'Применить фильтры';
            if (submitBtn) {
                originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Поиск...';
                submitBtn.disabled = true;
            }

            // Собираем параметры поиска
            const params = this.collectSearchParams();

            console.log('Параметры поиска:', params);

            // Выполняем расширенный поиск через API
            const flights = await api.searchFlights(params);

            // Фильтруем прошедшие рейсы
            let filteredFlights = flights;
            if (typeof window.filterPastFlights === 'function') {
                filteredFlights = window.filterPastFlights(flights);
            }

            // Отображаем результаты
            if (window.displayFlights) {
                window.displayFlights(filteredFlights, true);
            }

            if (filteredFlights.length === 0) {
                showAlert('Доступных рейсов по вашему запросу не найдено', 'warning');
            } else {
                showAlert(`Найдено ${filteredFlights.length} доступных рейсов`, 'success');
            }

        } catch (error) {
            console.error('Ошибка расширенного поиска:', error);
            showAlert(`Ошибка поиска: ${error.message}`, 'danger');
        } finally {
            // Восстанавливаем кнопку
            const submitBtn = event?.target?.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }

        return false;
    }

    collectSearchParams() {
        const params = {};

        // Базовые параметры из основной формы поиска
        const departureInput = document.getElementById('departure-airport');
        const arrivalInput = document.getElementById('arrival-airport');
        const dateInput = document.getElementById('departure-date');

        if (departureInput && departureInput.value) {
            params.departure_airport = departureInput.value;
        }

        if (arrivalInput && arrivalInput.value) {
            params.arrival_airport = arrivalInput.value;
        }

        if (dateInput && dateInput.value) {
            const date = new Date(dateInput.value);
            params.departure_date = date.toISOString();
        }

        // Расширенные параметры
        const minPrice = document.getElementById('min-price');
        const maxPrice = document.getElementById('max-price');
        const timeRange = document.getElementById('departure-time-range');
        const seatClass = document.getElementById('seat-class-filter');
        const airline = document.getElementById('airline-filter');
        const sortBy = document.getElementById('sort-by');
        const sortOrder = document.getElementById('sort-order');

        // Цена
        if (minPrice && minPrice.value) {
            params.min_price = parseFloat(minPrice.value);
        }

        if (maxPrice && maxPrice.value) {
            params.max_price = parseFloat(maxPrice.value);
        }

        // Время вылета
        if (timeRange && timeRange.value) {
            params.departure_time_range = timeRange.value;
        }

        // Класс обслуживания
        if (seatClass && seatClass.value) {
            params.seat_class = seatClass.value;
        }

        // Авиакомпания
        if (airline && airline.value) {
            params.airline = airline.value;
        }

        // Сортировка
        if (sortBy && sortBy.value) {
            params.sort_by = sortBy.value;
        }

        if (sortOrder && sortOrder.value) {
            params.sort_order = sortOrder.value;
        }

        // Лимит результатов
        params.limit = 100;
        params.skip = 0;

        return params;
    }

    async applyQuickFilter(filterType) {
        try {
            let flights = [];

            switch(filterType) {
                case 'cheapest':
                    // Получаем самые дешевые рейсы
                    const departure = document.getElementById('departure-airport')?.value;
                    const arrival = document.getElementById('arrival-airport')?.value;

                    flights = await api.getCheapestFlights({
                        departure_airport: departure,
                        arrival_airport: arrival,
                        limit: 10
                    });
                    // Фильтруем прошедшие рейсы
                    if (typeof window.filterPastFlights === 'function') {
                        flights = window.filterPastFlights(flights);
                    }
                    showAlert('Показаны самые дешевые рейсы', 'info');
                    break;

                case 'upcoming':
                    // Получаем ближайшие рейсы
                    flights = await api.getUpcomingFlights(24, 0, 20);
                    // Фильтруем прошедшие рейсы
                    if (typeof window.filterPastFlights === 'function') {
                        flights = window.filterPastFlights(flights);
                    }
                    showAlert('Показаны ближайшие рейсы (24 часа)', 'info');
                    break;

                case 'morning':
                    // Устанавливаем фильтр утренних рейсов
                    const timeSelect = document.getElementById('departure-time-range');
                    if (timeSelect) {
                        timeSelect.value = 'morning';
                        this.searchParams.departure_time_range = 'morning';
                    }
                    showAlert('Установлен фильтр утренних рейсов', 'info');
                    return; // Не выполнять поиск сразу
            }

            if (flights.length > 0 && window.displayFlights) {
                window.displayFlights(flights, true);
            } else if (filterType !== 'morning') {
                showAlert('Доступных рейсов не найдено', 'warning');
            }

        } catch (error) {
            console.error('Ошибка применения быстрого фильтра:', error);
            showAlert(`Ошибка: ${error.message}`, 'danger');
        }
    }

    resetFilters() {
        // Сбрасываем поля расширенного поиска
        const form = document.getElementById('advanced-search-form');
        if (form) {
            form.reset();
        }

        // Сбрасываем параметры
        this.searchParams = {
            departure_airport: '',
            arrival_airport: '',
            departure_date: '',
            min_price: null,
            max_price: null,
            airline: '',
            seat_class: '',
            departure_time_range: '',
            sort_by: 'departure_time',
            sort_order: 'asc'
        };

        // Сбрасываем базовые поля
        const departureInput = document.getElementById('departure-airport');
        const arrivalInput = document.getElementById('arrival-airport');
        const dateInput = document.getElementById('departure-date');

        if (departureInput) departureInput.value = '';
        if (arrivalInput) arrivalInput.value = '';
        if (dateInput) dateInput.value = '';

        showAlert('Все фильтры сброшены', 'info');
    }

    // Метод для поиска бронирований пользователя
    async searchBookings(params = {}) {
        try {
            if (!api.isAuthenticated()) {
                throw new Error('Требуется авторизация');
            }

            const bookings = await api.searchBookings(params);
            return bookings;
        } catch (error) {
            console.error('Ошибка поиска бронирований:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр (только если он еще не создан)
if (!window.advancedSearch) {
    window.advancedSearch = new AdvancedSearch();
}

// Экспортируем функции
window.showAdvancedSearch = () => window.advancedSearch.showAdvancedSearch();
window.searchBookings = (params) => window.advancedSearch.searchBookings(params);
window.filterPastFlights = filterPastFlights;
window.loadUpcomingFlights = loadUpcomingFlights;