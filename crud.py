from typing import Optional

import status
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, and_, or_
from sqlalchemy.orm import selectinload

import models
import schemas
from auth import get_password_hash
from datetime import datetime, timedelta
import random
import string


# User CRUD
async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(models.User).where(models.User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(
        select(models.User).where(models.User.username == username)
    )
    return result.scalar_one_or_none()


async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.User).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def create_user(db: AsyncSession, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


# Flight CRUD
async def get_flight(db: AsyncSession, flight_id: int):
    result = await db.execute(
        select(models.Flight).where(models.Flight.id == flight_id)
    )
    return result.scalar_one_or_none()


async def get_flights(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        departure_airport: str = None,
        arrival_airport: str = None,
        departure_date: datetime = None
):
    query = select(models.Flight)

    if departure_airport:
        query = query.where(models.Flight.departure_airport == departure_airport)
    if arrival_airport:
        query = query.where(models.Flight.arrival_airport == arrival_airport)
    if departure_date:
        # Преобразуем дату в начало дня и конец дня
        start_date = departure_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
        query = query.where(models.Flight.departure_time.between(start_date, end_date))

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def create_flight(db: AsyncSession, flight: schemas.FlightCreate):
    db_flight = models.Flight(**flight.dict())
    db_flight.status = db_flight.status.upper()
    db.add(db_flight)
    await db.commit()
    await db.refresh(db_flight)
    return db_flight


# Booking CRUD
def generate_booking_reference():
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=6))
    return f"{letters}{numbers}"


async def get_booking(db: AsyncSession, booking_id: int):
    """Получить бронирование по ID"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.payment))  # Загружаем платеж
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    # НЕ пытаемся преобразовать payment в словарь
    # SQLAlchemy сам обработает relationship
    return booking


async def get_bookings_by_user(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # Используем joinedload для предварительной загрузки платежей
    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.payment))  # Используем selectinload вместо joinedload
        .where(models.Booking.user_id == user_id)
        .order_by(models.Booking.booking_date.desc())
        .offset(skip)
        .limit(limit)
    )

    bookings = result.scalars().all()

    # Вручную преобразуем платежи в словари
    for booking in bookings:
        if booking.payment:
            booking.payment = {
                'id': booking.payment.id,
                'transaction_id': booking.payment.transaction_id,
                'payment_method': booking.payment.payment_method,
                'payment_status': booking.payment.payment_status,
                'amount': booking.payment.amount,
                'payment_date': booking.payment.payment_date
            }

    return bookings


async def create_booking(db: AsyncSession, booking: schemas.BookingCreate, user_id: int):
    # Получаем рейс для расчета цены и проверки доступности
    flight = await get_flight(db, booking.flight_id)
    if not flight:
        return None

    # Проверяем доступность мест
    if booking.seat_class == schemas.SeatClass.ECONOMY:
        available_seats = flight.available_economy_seats
        price = flight.economy_price
        seat_field = "available_economy_seats"
    elif booking.seat_class == schemas.SeatClass.BUSINESS:
        available_seats = flight.available_business_seats
        price = flight.business_price
        seat_field = "available_business_seats"
    else:  # FIRST_CLASS
        available_seats = flight.available_first_class_seats
        price = flight.first_class_price
        seat_field = "available_first_class_seats"

    if available_seats < booking.passengers_count:
        return None

    # Генерируем номер бронирования
    booking_reference = generate_booking_reference()

    # Создаем бронирование
    db_booking = models.Booking(
        booking_reference=booking_reference,
        user_id=user_id,
        flight_id=booking.flight_id,
        seat_class=booking.seat_class,
        passengers_count=booking.passengers_count,
        total_price=price * booking.passengers_count,
        special_requests=booking.special_requests
    )

    # Обновляем количество доступных мест
    await db.execute(
        update(models.Flight)
        .where(models.Flight.id == flight.id)
        .values(**{seat_field: available_seats - booking.passengers_count})
    )

    db.add(db_booking)
    await db.commit()
    await db.refresh(db_booking)
    return db_booking


async def cancel_booking(db: AsyncSession, booking_id: int, user_id: int):
    """Отмена бронирования с обработкой возврата денег"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # Получаем бронирование с платежом
    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.payment))
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking or booking.user_id != user_id:
        return None

    if booking.booking_status == "cancelled":
        return booking

    # Получаем рейс для возврата мест
    flight = await get_flight(db, booking.flight_id)

    # Возвращаем места
    if booking.seat_class == schemas.SeatClass.ECONOMY:
        seat_field = "available_economy_seats"
        current_seats = flight.available_economy_seats
    elif booking.seat_class == schemas.SeatClass.BUSINESS:
        seat_field = "available_business_seats"
        current_seats = flight.available_business_seats
    else:
        seat_field = "available_first_class_seats"
        current_seats = flight.available_first_class_seats

    await db.execute(
        update(models.Flight)
        .where(models.Flight.id == flight.id)
        .values(**{seat_field: current_seats + booking.passengers_count})
    )

    # Отменяем бронирование
    booking.booking_status = "cancelled"

    # Если есть платеж, обрабатываем возврат
    if booking.payment:
        if booking.payment.payment_status == "completed":
            # Генерируем ID возврата
            refund_id = f"REFUND_{random.randint(1000000000, 9999999999)}"

            # Обновляем платеж
            booking.payment.payment_status = "refunded"
            booking.payment.refund_transaction_id = refund_id
            booking.payment.refund_date = datetime.now()

            print(f"✅ Инициирован возврат денег за бронирование {booking_id}")
            print(f"💰 Сумма возврата: {booking.payment.amount}₽")
            print(f"📝 ID возврата: {refund_id}")
        elif booking.payment.payment_status == "pending":
            booking.payment.payment_status = "cancelled"

    await db.commit()
    await db.refresh(booking)
    return booking


async def refund_payment(db: AsyncSession, booking_id: int, user_id: int):
    """Возврат денег за отмененное бронирование"""
    from sqlalchemy import select

    # Получаем бронирование с платежом
    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.payment))
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking or booking.user_id != user_id:
        return None

    if not booking.payment or booking.payment.payment_status != "completed":
        return None

    # Обновляем статус платежа
    booking.payment.payment_status = "refunded"
    booking.payment.payment_date = datetime.now()

    # Генерируем новый transaction_id для возврата
    booking.payment.transaction_id = f"REFUND_{booking.payment.transaction_id}"

    await db.commit()
    await db.refresh(booking.payment)

    print(f"✅ Возврат денег за бронирование {booking_id}")
    return booking.payment

# Payment CRUD
# Payment CRUD
# Payment CRUD - ИСПРАВЛЕННАЯ ВЕРСИЯ
async def create_payment(db: AsyncSession, payment: schemas.PaymentCreate, user_id: int):
    from sqlalchemy import select

    # 1. Проверяем бронирование
    booking = await get_booking(db, payment.booking_id)
    if not booking or booking.user_id != user_id:
        raise HTTPException(
            status_code=404,
            detail="Бронирование не найдено или у вас нет прав"
        )

    # 2. Проверяем, есть ли уже платеж для этого бронирования
    existing_payment = await db.execute(
        select(models.Payment).where(models.Payment.booking_id == payment.booking_id)
    )
    existing_payment = existing_payment.scalar_one_or_none()

    if existing_payment:
        # Возвращаем существующий платеж
        print(f"⚠️ Платеж для бронирования {payment.booking_id} уже существует")
        return existing_payment

    # 3. Проверяем статус бронирования
    if booking.booking_status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Нельзя оплатить отмененное или завершенное бронирование"
        )

    # 4. Создаем новый платеж
    transaction_id = f"TXN{random.randint(1000000000, 9999999999)}"

    db_payment = models.Payment(
        booking_id=payment.booking_id,
        user_id=user_id,
        amount=booking.total_price,
        payment_method=payment.payment_method,
        transaction_id=transaction_id,
        payment_status="completed"
    )

    # 5. Обновляем статус бронирования (опционально)
    # booking.booking_status = "paid"  # Можно добавить новый статус

    db.add(db_payment)
    await db.commit()
    await db.refresh(db_payment)

    print(f"✅ Создан платеж для бронирования {payment.booking_id}: {transaction_id}")
    return db_payment


# Airport CRUD
async def create_airport(db: AsyncSession, airport: schemas.AirportBase):
    db_airport = models.Airport(**airport.dict())
    db.add(db_airport)
    await db.commit()
    await db.refresh(db_airport)
    return db_airport


async def get_airports(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Airport).offset(skip).limit(limit)
    )
    return result.scalars().all()


# В crud.py добавьте следующие функции:

# Flight CRUD - update function
async def update_flight(db: AsyncSession, flight_id: int, flight_update: dict):
    """Обновление рейса"""
    from sqlalchemy import update

    # Удаляем None значения из словаря обновления
    update_data = {k: v for k, v in flight_update.items() if v is not None}

    if not update_data:
        return None

    stmt = (
        update(models.Flight)
        .where(models.Flight.id == flight_id)
        .values(**update_data)
    )

    await db.execute(stmt)
    await db.commit()

    # Получаем обновленный рейс
    return await get_flight(db, flight_id)


async def delete_flight(db: AsyncSession, flight_id: int):
    """Удаление рейса"""
    from sqlalchemy import delete

    # Сначала проверяем, есть ли бронирования на этот рейс
    result = await db.execute(
        select(models.Booking).where(models.Booking.flight_id == flight_id)
    )
    bookings = result.scalars().all()

    if bookings:
        # Можно либо запретить удаление, либо отменить все бронирования
        raise HTTPException(
            status_code=400,
            detail="Невозможно удалить рейс с существующими бронированиями"
        )

    stmt = delete(models.Flight).where(models.Flight.id == flight_id)
    await db.execute(stmt)
    await db.commit()

    return {"message": f"Рейс {flight_id} удален"}


# Airport CRUD - update and delete functions
async def update_airport(db: AsyncSession, airport_id: int, airport_update: dict):
    """Обновление аэропорта"""
    from sqlalchemy import update

    update_data = {k: v for k, v in airport_update.items() if v is not None}

    if not update_data:
        return None

    stmt = (
        update(models.Airport)
        .where(models.Airport.id == airport_id)
        .values(**update_data)
    )

    await db.execute(stmt)
    await db.commit()

    # Получаем обновленный аэропорт
    result = await db.execute(
        select(models.Airport).where(models.Airport.id == airport_id)
    )
    return result.scalar_one_or_none()


async def delete_airport(db: AsyncSession, airport_id: int):
    """Удаление аэропорта"""
    from sqlalchemy import delete

    # Проверяем, есть ли рейсы, связанные с этим аэропортом
    result_departure = await db.execute(
        select(models.Flight).where(models.Flight.departure_airport == airport_id)
    )
    result_arrival = await db.execute(
        select(models.Flight).where(models.Flight.arrival_airport == airport_id)
    )

    if result_departure.scalars().first() or result_arrival.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Невозможно удалить аэропорт, связанный с рейсами"
        )

    stmt = delete(models.Airport).where(models.Airport.id == airport_id)
    await db.execute(stmt)
    await db.commit()

    return {"message": f"Аэропорт {airport_id} удален"}


async def get_airport(db: AsyncSession, airport_id: int):
    """Получить аэропорт по ID"""
    result = await db.execute(
        select(models.Airport).where(models.Airport.id == airport_id)
    )
    return result.scalar_one_or_none()


async def get_airport_by_code(db: AsyncSession, code: str):
    """Получить аэропорт по коду"""
    result = await db.execute(
        select(models.Airport).where(models.Airport.code == code)
    )
    return result.scalar_one_or_none()


# Aircraft CRUD operations
async def create_aircraft(db: AsyncSession, aircraft: schemas.AircraftCreate):
    """Создание самолета"""
    db_aircraft = models.Aircraft(**aircraft.dict())
    db.add(db_aircraft)
    await db.commit()
    await db.refresh(db_aircraft)
    return db_aircraft


async def get_aircraft(db: AsyncSession, aircraft_id: int):
    """Получить самолет по ID"""
    result = await db.execute(
        select(models.Aircraft).where(models.Aircraft.id == aircraft_id)
    )
    return result.scalar_one_or_none()


async def get_aircrafts(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Получить список самолетов"""
    result = await db.execute(
        select(models.Aircraft)
        .order_by(models.Aircraft.model)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def update_aircraft(db: AsyncSession, aircraft_id: int, aircraft_update: dict):
    """Обновление самолета"""
    from sqlalchemy import update

    update_data = {k: v for k, v in aircraft_update.items() if v is not None}

    if not update_data:
        return None

    stmt = (
        update(models.Aircraft)
        .where(models.Aircraft.id == aircraft_id)
        .values(**update_data)
    )

    await db.execute(stmt)
    await db.commit()

    return await get_aircraft(db, aircraft_id)


async def delete_aircraft(db: AsyncSession, aircraft_id: int):
    """Удаление самолета"""
    from sqlalchemy import delete

    # Проверяем, есть ли рейсы, связанные с этим самолетом
    result = await db.execute(
        select(models.Flight).where(models.Flight.aircraft_id == aircraft_id)
    )

    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Невозможно удалить самолет, связанный с рейсами"
        )

    stmt = delete(models.Aircraft).where(models.Aircraft.id == aircraft_id)
    await db.execute(stmt)
    await db.commit()

    return {"message": f"Самолет {aircraft_id} удален"}


# User CRUD - update function
async def update_user(db: AsyncSession, user_id: int, user_update: dict):
    """Обновление пользователя"""
    from sqlalchemy import update

    update_data = {k: v for k, v in user_update.items() if v is not None}

    if not update_data:
        return None

    # Если обновляется пароль - хешируем его
    if 'password' in update_data:
        update_data['hashed_password'] = get_password_hash(update_data.pop('password'))

    stmt = (
        update(models.User)
        .where(models.User.id == user_id)
        .values(**update_data)
    )

    await db.execute(stmt)
    await db.commit()

    return await get_user(db, user_id)


# В crud.py добавьте:

async def get_upgrade_options(db: AsyncSession, booking_id: int, user_id: int):
    """Получить доступные варианты апгрейда для бронирования"""
    from sqlalchemy import select

    # Получаем бронирование с рейсом
    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.flight))
        .where(
            and_(
                models.Booking.id == booking_id,
                models.Booking.user_id == user_id
            )
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Проверяем возможность апгрейда
    eligibility = await check_upgrade_eligibility(db, booking)

    if not eligibility["can_upgrade"]:
        return {
            "booking_id": booking_id,
            "current_class": booking.seat_class.value,
            "available_upgrades": [],
            "eligibility_check": eligibility
        }

    # Получаем доступные классы для апгрейда
    available_upgrades = await calculate_upgrade_options(db, booking)

    return {
        "booking_id": booking_id,
        "current_class": booking.seat_class.value,
        "available_upgrades": available_upgrades,
        "eligibility_check": eligibility
    }


async def check_upgrade_eligibility(db: AsyncSession, booking: models.Booking):
    """Проверка возможности апгрейда для бронирования"""
    from datetime import datetime

    current_time = datetime.now(booking.flight.departure_time.tzinfo)
    time_until_flight = booking.flight.departure_time - current_time
    hours_until_flight = time_until_flight.total_seconds() / 3600

    # Проверяем условия для апгрейда
    conditions = {
        "booking_active": booking.booking_status == "confirmed",
        "not_cancelled": booking.booking_status != "cancelled",
        "flight_upcoming": booking.flight.departure_time > current_time,
        "min_time_before_flight": hours_until_flight > 3,  # Не менее 3 часов до вылета
        "flight_not_cancelled": booking.flight.status != "cancelled",
        "no_pending_upgrade": await check_pending_upgrades(db, booking.id) == 0
    }

    can_upgrade = all(conditions.values())

    return {
        "can_upgrade": can_upgrade,
        "conditions": conditions,
        "hours_until_flight": hours_until_flight,
        "message": "Апгрейд доступен" if can_upgrade else "Апгрейд недоступен"
    }


async def calculate_upgrade_options(db: AsyncSession, booking: models.Booking):
    """Расчет доступных вариантов апгрейда и их стоимости"""
    flight = booking.flight
    current_class = booking.seat_class

    # Определяем порядок классов
    class_order = {
        models.SeatClass.ECONOMY: 1,
        models.SeatClass.BUSINESS: 2,
        models.SeatClass.FIRST_CLASS: 3
    }

    current_order = class_order.get(current_class, 1)
    available_upgrades = []

    # Проверяем апгрейд до бизнес-класса
    if current_order < 2 and flight.available_business_seats >= booking.passengers_count:
        price_difference = flight.business_price - flight.economy_price
        available_upgrades.append({
            "target_class": models.SeatClass.BUSINESS.value,
            "price_difference": price_difference * booking.passengers_count,
            "description": f"Апгрейд до бизнес-класса для {booking.passengers_count} пассажиров",
            "per_person": price_difference,
            "benefits": [
                "Широкие кресла с увеличенным пространством",
                "Приоритетная посадка",
                "Премиум питание",
                "Дополнительный багаж (2x23 кг)",
                "Доступ в бизнес-зал"
            ]
        })

    # Проверяем апгрейд до первого класса
    if current_order < 3 and flight.available_first_class_seats >= booking.passengers_count:
        if current_class == models.SeatClass.ECONOMY:
            price_difference = flight.first_class_price - flight.economy_price
        else:  # business to first
            price_difference = flight.first_class_price - flight.business_price

        available_upgrades.append({
            "target_class": models.SeatClass.FIRST_CLASS.value,
            "price_difference": price_difference * booking.passengers_count,
            "description": f"Апгрейд до первого класса для {booking.passengers_count} пассажиров",
            "per_person": price_difference,
            "benefits": [
                "Люксовые кресла с полным раскладыванием",
                "Персональный бортпроводник",
                "Премиум меню и шампанское",
                "Доступ в VIP-лаунж",
                "Личный багаж 3x32 кг",
                "Лимузин до самолета"
            ]
        })

    return available_upgrades


async def create_upgrade_request(db: AsyncSession, upgrade_request: schemas.UpgradeRequestCreate, user_id: int):
    """Создание запроса на апгрейд"""
    from sqlalchemy import select
    import random

    # Получаем бронирование
    booking = await get_booking(db, upgrade_request.booking_id)
    if not booking or booking.user_id != user_id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Проверяем возможность апгрейда
    eligibility = await check_upgrade_eligibility(db, booking)
    if not eligibility["can_upgrade"]:
        raise HTTPException(
            status_code=400,
            detail=f"Апгрейд недоступен: {eligibility.get('message', 'Неизвестная причина')}"
        )

    # Проверяем, что целевой класс выше текущего
    current_order = {"economy": 1, "business": 2, "first_class": 3}
    if current_order.get(upgrade_request.target_class.value, 0) <= current_order.get(booking.seat_class.value, 0):
        raise HTTPException(
            status_code=400,
            detail="Целевой класс должен быть выше текущего"
        )

    # Рассчитываем разницу в цене
    price_difference = await calculate_upgrade_price(
        db,
        booking,
        upgrade_request.target_class
    )

    if price_difference <= 0:
        raise HTTPException(
            status_code=400,
            detail="Неверная разница в цене"
        )

    # Создаем запрос на апгрейд
    transaction_id = f"UPGRADE_{random.randint(1000000000, 9999999999)}"

    db_upgrade = models.UpgradeRequest(
        booking_id=upgrade_request.booking_id,
        user_id=user_id,
        current_class=booking.seat_class,
        target_class=upgrade_request.target_class,
        price_difference=price_difference,
        transaction_id=transaction_id,
        status="pending"
    )

    db.add(db_upgrade)
    await db.commit()
    await db.refresh(db_upgrade)

    print(f"✅ Создан запрос на апгрейд: {transaction_id}")
    return db_upgrade


async def calculate_upgrade_price(db: AsyncSession, booking: models.Booking, target_class: models.SeatClass):
    """Расчет стоимости апгрейда"""
    flight = booking.flight

    # Определяем цены для каждого класса
    prices = {
        models.SeatClass.ECONOMY: flight.economy_price,
        models.SeatClass.BUSINESS: flight.business_price,
        models.SeatClass.FIRST_CLASS: flight.first_class_price
    }

    current_price = prices.get(booking.seat_class, 0)
    target_price = prices.get(target_class, 0)

    # Разница в цене умноженная на количество пассажиров
    price_difference = (target_price - current_price) * booking.passengers_count

    return max(price_difference, 0)  # Не может быть отрицательным


async def process_upgrade_payment(db: AsyncSession, upgrade_id: int, user_id: int):
    """Обработка оплаты апгрейда"""
    from sqlalchemy import select
    import random

    # Получаем запрос на апгрейд
    result = await db.execute(
        select(models.UpgradeRequest)
        .options(selectinload(models.UpgradeRequest.booking))
        .where(
            and_(
                models.UpgradeRequest.id == upgrade_id,
                models.UpgradeRequest.user_id == user_id
            )
        )
    )
    upgrade_request = result.scalar_one_or_none()

    if not upgrade_request:
        raise HTTPException(status_code=404, detail="Запрос на апгрейд не найден")

    if upgrade_request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Запрос уже обработан: статус {upgrade_request.status}"
        )

    # Проверяем бронирование
    booking = upgrade_request.booking
    if not booking or booking.booking_status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Бронирование недоступно для апгрейда"
        )

    # Проверяем доступность мест
    flight = booking.flight
    target_class = upgrade_request.target_class

    # Проверяем доступность мест в целевом классе
    if target_class == models.SeatClass.BUSINESS:
        if flight.available_business_seats < booking.passengers_count:
            raise HTTPException(
                status_code=400,
                detail="Недостаточно мест в бизнес-классе"
            )
        seat_field = "available_business_seats"
    elif target_class == models.SeatClass.FIRST_CLASS:
        if flight.available_first_class_seats < booking.passengers_count:
            raise HTTPException(
                status_code=400,
                detail="Недостаточно мест в первом классе"
            )
        seat_field = "available_first_class_seats"
    else:
        raise HTTPException(status_code=400, detail="Некорректный целевой класс")

    # Освобождаем места в текущем классе
    current_class = upgrade_request.current_class
    if current_class == models.SeatClass.ECONOMY:
        flight.available_economy_seats += booking.passengers_count
    elif current_class == models.SeatClass.BUSINESS:
        flight.available_business_seats += booking.passengers_count

    # Занимаем места в целевом классе
    if seat_field == "available_business_seats":
        flight.available_business_seats -= booking.passengers_count
    else:
        flight.available_first_class_seats -= booking.passengers_count

    # Обновляем класс в бронировании
    booking.seat_class = target_class
    booking.total_price += upgrade_request.price_difference

    # Обновляем статус апгрейда
    upgrade_request.status = "completed"
    upgrade_request.completed_at = datetime.now()

    # Создаем запись о платеже за апгрейд
    payment_transaction_id = f"UPG_PAY_{random.randint(1000000000, 9999999999)}"

    db_payment = models.Payment(
        booking_id=booking.id,
        user_id=user_id,
        amount=upgrade_request.price_difference,
        payment_method="upgrade",
        payment_status="completed",
        transaction_id=payment_transaction_id,
        payment_date=datetime.now()
    )

    db.add(db_payment)
    await db.commit()
    await db.refresh(upgrade_request)
    await db.refresh(booking)

    print(f"✅ Апгрейд завершен: {upgrade_request.transaction_id}")
    print(f"💰 Доплата: {upgrade_request.price_difference}₽")
    print(f"📝 Новый класс: {target_class.value}")

    return {
        "upgrade": upgrade_request,
        "booking": booking,
        "payment": db_payment
    }


async def check_pending_upgrades(db: AsyncSession, booking_id: int):
    """Проверка наличия ожидающих апгрейдов"""
    from sqlalchemy import select, func

    result = await db.execute(
        select(func.count(models.UpgradeRequest.id))
        .where(
            and_(
                models.UpgradeRequest.booking_id == booking_id,
                models.UpgradeRequest.status == "pending"
            )
        )
    )
    return result.scalar()


async def get_upgrade_history(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100):
    """Получить историю апгрейдов пользователя"""
    from sqlalchemy import select

    result = await db.execute(
        select(models.UpgradeRequest)
        .options(selectinload(models.UpgradeRequest.booking))
        .where(models.UpgradeRequest.user_id == user_id)
        .order_by(models.UpgradeRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return result.scalars().all()


# В crud.py добавьте функции для работы с багажом

async def create_luggage(db: AsyncSession, luggage: schemas.LuggageCreate, user_id: int):
    """Создание записи о багаже"""
    db_luggage = models.Luggage(
        booking_id=luggage.booking_id,
        luggage_type=luggage.luggage_type,
        weight=luggage.weight,
        price=luggage.price,
        special_requirements=luggage.special_requirements
    )

    db.add(db_luggage)
    await db.commit()
    await db.refresh(db_luggage)

    return db_luggage


async def create_booking_with_luggage(
        db: AsyncSession,
        booking: schemas.BookingCreate,
        user_id: int
):
    """Создание бронирования с багажом"""
    from sqlalchemy.orm import selectinload

    # Создаем бронирование
    db_booking = await create_booking(db, booking, user_id)

    # Добавляем багаж
    if booking.luggage:
        for luggage_item in booking.luggage:
            luggage_create = schemas.LuggageCreate(
                booking_id=db_booking.id,
                luggage_type=luggage_item.luggage_type,
                weight=luggage_item.weight,
                price=luggage_item.price,
                special_requirements=luggage_item.special_requirements
            )
            await create_luggage(db, luggage_create, user_id)

    # Загружаем полные данные
    result = await db.execute(
        select(models.Booking)
        .options(
            selectinload(models.Booking.payment),
            selectinload(models.Booking.luggage)
        )
        .where(models.Booking.id == db_booking.id)
    )

    return result.scalar_one_or_none()


async def get_luggage_pricing(db: AsyncSession):
    """Получить информацию о ценах на багаж"""
    # Здесь можно получать цены из базы данных или использовать фиксированные
    return {
        "default_hand_luggage": {
            "luggage_type": "hand",
            "price_per_kg": 0,
            "max_weight": 10,
            "description": "Ручная кладь (включена в стоимость)"
        },
        "additional_options": [
            {
                "luggage_type": "checked",
                "price_per_kg": 500,
                "description": "Регистрируемый багаж"
            },
            {
                "luggage_type": "business",
                "price_per_kg": 1000,
                "max_weight": 32,
                "description": "Бизнес-багаж"
            },
            {
                "luggage_type": "premium",
                "price_per_kg": 1500,
                "max_weight": 50,
                "description": "Премиум багаж"
            }
        ]
    }


# ========== ADVANCED SEARCH FUNCTIONS ==========
async def search_flights(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        departure_airport: Optional[str] = None,
        arrival_airport: Optional[str] = None,
        departure_date: Optional[datetime] = None,
        # Расширенные параметры
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        airline: Optional[str] = None,
        seat_class: Optional[str] = None,
        departure_time_range: Optional[str] = None,
        sort_by: str = "departure_time",
        sort_order: str = "asc"
):
    """Расширенный поиск рейсов со всеми фильтрами"""
    from sqlalchemy.sql import extract

    query = select(models.Flight)

    # Базовые фильтры
    if departure_airport:
        query = query.where(models.Flight.departure_airport == departure_airport)

    if arrival_airport:
        query = query.where(models.Flight.arrival_airport == arrival_airport)

    if departure_date:
        # Фильтрация по дате (целый день)
        start_date = departure_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
        query = query.where(models.Flight.departure_time.between(start_date, end_date))

    # Фильтр по цене (используем economy_price как базовую цену)
    if min_price is not None:
        query = query.where(models.Flight.economy_price >= min_price)

    if max_price is not None:
        query = query.where(models.Flight.economy_price <= max_price)

    # Фильтр по авиакомпании (первые 2 символа номера рейса)
    if airline:
        airline_code = airline.upper()[:2]
        query = query.where(models.Flight.flight_number.like(f"{airline_code}%"))

    # Фильтр по классу обслуживания (наличие мест)
    if seat_class:
        seat_class_lower = seat_class.lower()
        if seat_class_lower == "economy":
            query = query.where(models.Flight.available_economy_seats > 0)
        elif seat_class_lower == "business":
            query = query.where(models.Flight.available_business_seats > 0)
        elif seat_class_lower == "first_class":
            query = query.where(models.Flight.available_first_class_seats > 0)

    # Фильтр по времени вылета
    if departure_time_range:
        hour = extract('hour', models.Flight.departure_time)
        if departure_time_range == "morning":
            query = query.where(and_(hour >= 6, hour < 12))
        elif departure_time_range == "day":
            query = query.where(and_(hour >= 12, hour < 18))
        elif departure_time_range == "evening":
            query = query.where(and_(hour >= 18, hour <= 23))
        elif departure_time_range == "night":
            query = query.where(or_(hour >= 0, hour < 6))

    # Сортировка
    if sort_by == "price":
        if sort_order == "desc":
            query = query.order_by(models.Flight.economy_price.desc())
        else:
            query = query.order_by(models.Flight.economy_price.asc())
    elif sort_by == "duration":
        # Сортировка по продолжительности полета
        duration = models.Flight.arrival_time - models.Flight.departure_time
        if sort_order == "desc":
            query = query.order_by(duration.desc())
        else:
            query = query.order_by(duration.asc())
    else:  # departure_time по умолчанию
        if sort_order == "desc":
            query = query.order_by(models.Flight.departure_time.desc())
        else:
            query = query.order_by(models.Flight.departure_time.asc())

    # Пагинация
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def search_airports(
        db: AsyncSession,
        query_str: Optional[str] = None,
        city: Optional[str] = None,
        country: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
):
    """Поиск аэропортов по различным критериям"""
    from sqlalchemy import or_

    stmt = select(models.Airport)

    if query_str:
        search_term = f"%{query_str}%"
        stmt = stmt.where(
            or_(
                models.Airport.code.ilike(search_term),
                models.Airport.name.ilike(search_term),
                models.Airport.city.ilike(search_term),
                models.Airport.country.ilike(search_term)
            )
        )

    if city:
        stmt = stmt.where(models.Airport.city.ilike(f"%{city}%"))

    if country:
        stmt = stmt.where(models.Airport.country.ilike(f"%{country}%"))

    stmt = stmt.order_by(models.Airport.code).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def search_bookings(
        db: AsyncSession,
        user_id: int,
        booking_reference: Optional[str] = None,
        flight_number: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
):
    """Поиск бронирований пользователя"""
    from sqlalchemy import and_

    stmt = select(models.Booking).where(models.Booking.user_id == user_id)

    if booking_reference:
        stmt = stmt.where(models.Booking.booking_reference.ilike(f"%{booking_reference}%"))

    if status:
        stmt = stmt.where(models.Booking.booking_status == status)

    if start_date:
        stmt = stmt.where(models.Booking.booking_date >= start_date)

    if end_date:
        stmt = stmt.where(models.Booking.booking_date <= end_date)

    # Если указан номер рейса, ищем через связь
    if flight_number:
        stmt = stmt.join(models.Flight).where(models.Flight.flight_number.ilike(f"%{flight_number}%"))

    stmt = stmt.order_by(models.Booking.booking_date.desc()).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def search_users(
        db: AsyncSession,
        query_str: Optional[str] = None,
        email: Optional[str] = None,
        username: Optional[str] = None,
        role: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
):
    """Поиск пользователей (для админов)"""
    from sqlalchemy import or_

    stmt = select(models.User)

    if query_str:
        search_term = f"%{query_str}%"
        stmt = stmt.where(
            or_(
                models.User.email.ilike(search_term),
                models.User.username.ilike(search_term),
                models.User.first_name.ilike(search_term),
                models.User.last_name.ilike(search_term)
            )
        )

    if email:
        stmt = stmt.where(models.User.email.ilike(f"%{email}%"))

    if username:
        stmt = stmt.where(models.User.username.ilike(f"%{username}%"))

    if role:
        stmt = stmt.where(models.User.role == role)

    stmt = stmt.order_by(models.User.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def search_payments(
        db: AsyncSession,
        user_id: int,
        transaction_id: Optional[str] = None,
        status: Optional[str] = None,
        payment_method: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
):
    """Поиск платежей пользователя"""
    stmt = select(models.Payment).where(models.Payment.user_id == user_id)

    if transaction_id:
        stmt = stmt.where(models.Payment.transaction_id.ilike(f"%{transaction_id}%"))

    if status:
        stmt = stmt.where(models.Payment.payment_status == status)

    if payment_method:
        stmt = stmt.where(models.Payment.payment_method == payment_method)

    if min_amount:
        stmt = stmt.where(models.Payment.amount >= min_amount)

    if max_amount:
        stmt = stmt.where(models.Payment.amount <= max_amount)

    if start_date:
        stmt = stmt.where(models.Payment.payment_date >= start_date)

    if end_date:
        stmt = stmt.where(models.Payment.payment_date <= end_date)

    stmt = stmt.order_by(models.Payment.payment_date.desc()).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def search_aircrafts(
        db: AsyncSession,
        model: Optional[str] = None,
        manufacturer: Optional[str] = None,
        registration_number: Optional[str] = None,
        min_seats: Optional[int] = None,
        max_seats: Optional[int] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
):
    """Поиск самолетов"""
    from sqlalchemy import or_

    stmt = select(models.Aircraft)

    if model:
        stmt = stmt.where(models.Aircraft.model.ilike(f"%{model}%"))

    if manufacturer:
        stmt = stmt.where(models.Aircraft.manufacturer.ilike(f"%{manufacturer}%"))

    if registration_number:
        stmt = stmt.where(models.Aircraft.registration_number.ilike(f"%{registration_number}%"))

    if min_seats:
        stmt = stmt.where(models.Aircraft.total_seats >= min_seats)

    if max_seats:
        stmt = stmt.where(models.Aircraft.total_seats <= max_seats)

    if is_active is not None:
        stmt = stmt.where(models.Aircraft.is_active == is_active)

    stmt = stmt.order_by(models.Aircraft.model).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def search_flights_by_route(
        db: AsyncSession,
        departure_city: Optional[str] = None,
        arrival_city: Optional[str] = None,
        departure_country: Optional[str] = None,
        arrival_country: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
):
    """Поиск рейсов по городам и странам (через аэропорты)"""
    from sqlalchemy.orm import aliased

    # Создаем алиасы для аэропортов
    departure_airport_alias = aliased(models.Airport)
    arrival_airport_alias = aliased(models.Airport)

    stmt = (
        select(models.Flight)
        .join(departure_airport_alias, models.Flight.departure_airport == departure_airport_alias.code)
        .join(arrival_airport_alias, models.Flight.arrival_airport == arrival_airport_alias.code)
    )

    if departure_city:
        stmt = stmt.where(departure_airport_alias.city.ilike(f"%{departure_city}%"))

    if arrival_city:
        stmt = stmt.where(arrival_airport_alias.city.ilike(f"%{arrival_city}%"))

    if departure_country:
        stmt = stmt.where(departure_airport_alias.country.ilike(f"%{departure_country}%"))

    if arrival_country:
        stmt = stmt.where(arrival_airport_alias.country.ilike(f"%{arrival_country}%"))

    stmt = stmt.order_by(models.Flight.departure_time).offset(skip).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_available_seats_by_class(
        db: AsyncSession,
        flight_id: int,
        seat_class: str
):
    """Получить доступные места по классу обслуживания"""
    flight = await get_flight(db, flight_id)

    if not flight:
        raise HTTPException(status_code=404, detail="Рейс не найден")

    seat_class_lower = seat_class.lower()

    if seat_class_lower == "economy":
        return flight.available_economy_seats
    elif seat_class_lower == "business":
        return flight.available_business_seats
    elif seat_class_lower == "first_class":
        return flight.available_first_class_seats
    else:
        raise HTTPException(status_code=400, detail="Некорректный класс обслуживания")


async def search_flights_with_filters(
        db: AsyncSession,
        filters: dict,
        skip: int = 0,
        limit: int = 100
):
    """Универсальный поиск рейсов с фильтрами в виде словаря"""
    from sqlalchemy.sql import extract

    query = select(models.Flight)

    # Применяем фильтры из словаря
    if filters.get("departure_airport"):
        query = query.where(models.Flight.departure_airport == filters["departure_airport"])

    if filters.get("arrival_airport"):
        query = query.where(models.Flight.arrival_airport == filters["arrival_airport"])

    if filters.get("departure_date"):
        departure_date = filters["departure_date"]
        if isinstance(departure_date, str):
            departure_date = datetime.fromisoformat(departure_date.replace("Z", "+00:00"))

        start_date = departure_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
        query = query.where(models.Flight.departure_time.between(start_date, end_date))

    if filters.get("min_price") is not None:
        query = query.where(models.Flight.economy_price >= float(filters["min_price"]))

    if filters.get("max_price") is not None:
        query = query.where(models.Flight.economy_price <= float(filters["max_price"]))

    if filters.get("airline"):
        airline_code = filters["airline"].upper()[:2]
        query = query.where(models.Flight.flight_number.like(f"{airline_code}%"))

    if filters.get("seat_class"):
        seat_class_lower = filters["seat_class"].lower()
        if seat_class_lower == "economy":
            query = query.where(models.Flight.available_economy_seats > 0)
        elif seat_class_lower == "business":
            query = query.where(models.Flight.available_business_seats > 0)
        elif seat_class_lower == "first_class":
            query = query.where(models.Flight.available_first_class_seats > 0)

    if filters.get("departure_time_range"):
        hour = extract('hour', models.Flight.departure_time)
        time_range = filters["departure_time_range"]

        if time_range == "morning":
            query = query.where(and_(hour >= 6, hour < 12))
        elif time_range == "day":
            query = query.where(and_(hour >= 12, hour < 18))
        elif time_range == "evening":
            query = query.where(and_(hour >= 18, hour <= 23))
        elif time_range == "night":
            query = query.where(or_(hour >= 0, hour < 6))

    # Сортировка
    sort_by = filters.get("sort_by", "departure_time")
    sort_order = filters.get("sort_order", "asc")

    if sort_by == "price":
        if sort_order == "desc":
            query = query.order_by(models.Flight.economy_price.desc())
        else:
            query = query.order_by(models.Flight.economy_price.asc())
    elif sort_by == "duration":
        duration = models.Flight.arrival_time - models.Flight.departure_time
        if sort_order == "desc":
            query = query.order_by(duration.desc())
        else:
            query = query.order_by(duration.asc())
    else:  # departure_time по умолчанию
        if sort_order == "desc":
            query = query.order_by(models.Flight.departure_time.desc())
        else:
            query = query.order_by(models.Flight.departure_time.asc())

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def get_flight_suggestions(
        db: AsyncSession,
        query_str: str,
        limit: int = 10
):
    """Получить подсказки для поиска рейсов"""
    from sqlalchemy import or_, and_

    # Поиск по номеру рейса
    flight_result = await db.execute(
        select(models.Flight)
        .where(models.Flight.flight_number.ilike(f"%{query_str}%"))
        .limit(limit)
    )
    flights = flight_result.scalars().all()

    # Поиск по городам вылета/прилета
    airport_result = await db.execute(
        select(models.Flight)
        .join(models.Airport, models.Flight.departure_airport == models.Airport.code)
        .where(
            or_(
                models.Airport.city.ilike(f"%{query_str}%"),
                models.Airport.country.ilike(f"%{query_str}%"),
                models.Airport.name.ilike(f"%{query_str}%")
            )
        )
        .limit(limit)
    )
    flights_by_airport = airport_result.scalars().all()

    # Объединяем результаты
    all_flights = list(flights)
    flight_ids = {f.id for f in all_flights}

    for flight in flights_by_airport:
        if flight.id not in flight_ids:
            all_flights.append(flight)
            flight_ids.add(flight.id)

    return all_flights[:limit]


async def get_popular_routes(
        db: AsyncSession,
        limit: int = 10
):
    """Получить популярные маршруты (по количеству бронирований)"""
    from sqlalchemy import func, desc

    result = await db.execute(
        select(
            models.Flight.departure_airport,
            models.Flight.arrival_airport,
            func.count(models.Booking.id).label("booking_count")
        )
        .join(models.Booking, models.Booking.flight_id == models.Flight.id)
        .group_by(models.Flight.departure_airport, models.Flight.arrival_airport)
        .order_by(desc("booking_count"))
        .limit(limit)
    )

    return result.all()


async def get_cheapest_flights(
        db: AsyncSession,
        departure_airport: Optional[str] = None,
        arrival_airport: Optional[str] = None,
        limit: int = 10
):
    """Получить самые дешевые рейсы"""
    query = select(models.Flight)

    if departure_airport:
        query = query.where(models.Flight.departure_airport == departure_airport)

    if arrival_airport:
        query = query.where(models.Flight.arrival_airport == arrival_airport)

    query = query.order_by(models.Flight.economy_price.asc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def get_upcoming_flights(
        db: AsyncSession,
        hours_ahead: int = 24,
        skip: int = 0,
        limit: int = 100
):
    """Получить ближайшие рейсы (в течение следующих N часов)"""
    from datetime import datetime

    now = datetime.now()
    future_time = now + timedelta(hours=hours_ahead)

    query = (
        select(models.Flight)
        .where(models.Flight.departure_time.between(now, future_time))
        .order_by(models.Flight.departure_time.asc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    return result.scalars().all()