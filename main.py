from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime
import uvicorn

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.responses import JSONResponse

import crud, models, schemas
from database import get_db, setup_database
from auth import get_current_user, get_current_admin_user, logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    await setup_database()
    print("✅ Application started - Database tables created")
    yield
    print("🛑 Application shutting down")


app = FastAPI(
    title="Airline Booking System API",
    description="Асинхронная API система бронирования авиабилетов",
    version="1.0.0",
    lifespan=lifespan
)

# Настройка CORS - ВАЖНО: размещайте этот middleware ПЕРВЫМ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки разрешаем все источники
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# User endpoints
@app.post("/register/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
        user: schemas.UserCreate,
        db: AsyncSession = Depends(get_db)
):
    db_user = await crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = await crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    return await crud.create_user(db=db, user=user)


@app.get("/users/me/", response_model=schemas.UserResponse)
async def read_users_me(
        current_user: models.User = Depends(get_current_user)
):
    return current_user


# Flight endpoints (публичный - не требует аутентификации)
@app.get("/flights/", response_model=List[schemas.FlightResponse])
async def read_flights(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=200),
        departure_airport: Optional[str] = None,
        arrival_airport: Optional[str] = None,
        departure_date: Optional[datetime] = None,
        db: AsyncSession = Depends(get_db)
):
    flights = await crud.get_flights(
        db,
        skip=skip,
        limit=limit,
        departure_airport=departure_airport,
        arrival_airport=arrival_airport,
        departure_date=departure_date
    )
    return flights


@app.get("/flights/{flight_id}", response_model=schemas.FlightResponse)
async def read_flight(
        flight_id: int,
        db: AsyncSession = Depends(get_db)
):
    db_flight = await crud.get_flight(db, flight_id=flight_id)
    if db_flight is None:
        raise HTTPException(status_code=404, detail="Flight not found")
    return db_flight


# Booking endpoints (требуют аутентификации)
@app.post("/bookings/", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
        booking: schemas.BookingCreate,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Создание бронирования - ИСПРАВЛЕННАЯ ВЕРСИЯ"""
    try:
        db_booking = await crud.create_booking(db=db, booking=booking, user_id=current_user.id)
        if db_booking is None:
            raise HTTPException(
                status_code=400,
                detail="Booking failed. Check flight availability or flight ID."
            )

        # Создаем словарь ответа без попытки загрузить платеж
        response_data = {
            "id": db_booking.id,
            "booking_reference": db_booking.booking_reference,
            "user_id": db_booking.user_id,
            "flight_id": db_booking.flight_id,
            "seat_class": db_booking.seat_class.value if db_booking.seat_class else db_booking.seat_class,
            "seat_number": db_booking.seat_number,
            "passengers_count": db_booking.passengers_count,
            "total_price": db_booking.total_price,
            "booking_status": db_booking.booking_status,
            "booking_date": db_booking.booking_date,
            "special_requests": db_booking.special_requests,
            "payment": None  # Явно указываем, что платежа нет
        }

        return response_data

    except Exception as e:
        print(f"❌ Ошибка создания бронирования: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.get("/bookings/", response_model=List[schemas.BookingResponse])
async def read_bookings(
        current_user: models.User = Depends(get_current_user),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=200),
        db: AsyncSession = Depends(get_db)
):
    """Получить бронирования пользователя - ИСПРАВЛЕННАЯ ВЕРСИЯ"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    try:
        # Явно загружаем данные с платежами
        result = await db.execute(
            select(models.Booking)
            .options(selectinload(models.Booking.payment))  # Загружаем платежи
            .where(models.Booking.user_id == current_user.id)
            .order_by(models.Booking.booking_date.desc())
            .offset(skip)
            .limit(limit)
        )

        bookings = result.scalars().all()

        # Преобразуем в словари для правильной сериализации
        serialized_bookings = []
        for booking in bookings:
            booking_dict = {
                "id": booking.id,
                "booking_reference": booking.booking_reference,
                "user_id": booking.user_id,
                "flight_id": booking.flight_id,
                "seat_class": booking.seat_class.value if booking.seat_class else booking.seat_class,
                "seat_number": booking.seat_number,
                "passengers_count": booking.passengers_count,
                "total_price": booking.total_price,
                "booking_status": booking.booking_status,
                "booking_date": booking.booking_date,
                "special_requests": booking.special_requests
            }

            # Если есть платеж, добавляем его
            if booking.payment:
                booking_dict["payment"] = {
                    "id": booking.payment.id,
                    "booking_id": booking.payment.booking_id,
                    "user_id": booking.payment.user_id,
                    "amount": booking.payment.amount,
                    "payment_method": booking.payment.payment_method,
                    "payment_status": booking.payment.payment_status,
                    "transaction_id": booking.payment.transaction_id,
                    "payment_date": booking.payment.payment_date
                }
            serialized_bookings.append(booking_dict)

        return serialized_bookings

    except Exception as e:
        print(f"❌ Ошибка при получении бронирований: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.get("/bookings/{booking_id}", response_model=schemas.BookingWithPaymentResponse)
async def read_booking(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить конкретное бронирование"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.payment))
        .where(models.Booking.id == booking_id)
    )
    db_booking = result.scalar_one_or_none()

    if db_booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    if db_booking.user_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")

    # Подготавливаем данные для ответа
    booking_dict = {
        "id": db_booking.id,
        "booking_reference": db_booking.booking_reference,
        "user_id": db_booking.user_id,
        "flight_id": db_booking.flight_id,
        "seat_class": db_booking.seat_class.value if db_booking.seat_class else db_booking.seat_class,
        "seat_number": db_booking.seat_number,
        "passengers_count": db_booking.passengers_count,
        "total_price": db_booking.total_price,
        "booking_status": db_booking.booking_status,
        "booking_date": db_booking.booking_date,
        "special_requests": db_booking.special_requests
    }

    # Добавляем платеж если есть
    if db_booking.payment:
        booking_dict["payment"] = {
            "id": db_booking.payment.id,
            "booking_id": db_booking.payment.booking_id,
            "user_id": db_booking.payment.user_id,
            "amount": db_booking.payment.amount,
            "payment_method": db_booking.payment.payment_method,
            "payment_status": db_booking.payment.payment_status,
            "transaction_id": db_booking.payment.transaction_id,
            "payment_date": db_booking.payment.payment_date
        }

    return booking_dict


@app.post("/bookings/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Отмена бронирования с возвратом денег"""
    try:
        db_booking = await crud.cancel_booking(db, booking_id=booking_id, user_id=current_user.id)
        if db_booking is None:
            raise HTTPException(
                status_code=404,
                detail="Бронирование не найдено или у вас нет прав"
            )

        # Подготавливаем ответ с правильной сериализацией дат
        response_data = {
            "id": db_booking.id,
            "booking_reference": db_booking.booking_reference,
            "user_id": db_booking.user_id,
            "flight_id": db_booking.flight_id,
            "seat_class": db_booking.seat_class.value,
            "seat_number": db_booking.seat_number,
            "passengers_count": db_booking.passengers_count,
            "total_price": db_booking.total_price,
            "booking_status": db_booking.booking_status,
            "booking_date": db_booking.booking_date.isoformat() if db_booking.booking_date else None,
            "special_requests": db_booking.special_requests
        }

        # Добавляем информацию о возврате в response headers
        response_headers = {}
        if db_booking.payment and db_booking.payment.payment_status == "refunded":
            response_headers["X-Refund-Id"] = db_booking.payment.refund_transaction_id
            response_headers["X-Refund-Amount"] = str(db_booking.payment.amount)

        return JSONResponse(
            content=response_data,
            headers=response_headers
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка отмены бронирования: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.get("/refunds/history")
async def get_refund_history(
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить историю возвратов пользователя"""
    from sqlalchemy import select

    result = await db.execute(
        select(models.Payment)
        .where(
            models.Payment.user_id == current_user.id,
            models.Payment.payment_status == "refunded"
        )
        .order_by(models.Payment.refund_date.desc())
    )

    payments = result.scalars().all()

    return {
        "count": len(payments),
        "refunds": [
            {
                "id": p.id,
                "booking_id": p.booking_id,
                "amount": p.amount,
                "refund_transaction_id": p.refund_transaction_id,
                "original_transaction_id": p.transaction_id,
                "payment_method": p.payment_method,
                "refund_date": p.refund_date.isoformat() if p.refund_date else None,
                "status": p.payment_status
            }
            for p in payments
        ]
    }

@app.get("/bookings/{booking_id}/payment")
async def get_payment_for_booking(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о платеже для конкретного бронирования"""
    from sqlalchemy import select

    # 1. Проверяем, что бронирование принадлежит пользователю
    booking = await crud.get_booking(db, booking_id)
    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # 2. Ищем платеж
    result = await db.execute(
        select(models.Payment).where(models.Payment.booking_id == booking_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    return payment


@app.get("/bookings/{booking_id}/refund-info")
async def get_refund_info(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о возможном возврате денег"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # Используем явную загрузку всех связей
    result = await db.execute(
        select(models.Booking)
        .options(
            selectinload(models.Booking.payment),
            selectinload(models.Booking.flight)
        )
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    if booking.user_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Нет прав")

    # Рассчитываем сумму возврата
    refund_amount = 0
    can_refund = False
    refund_days = 0
    hours_until_flight = None

    if booking.payment and booking.payment.payment_status == "completed":
        # Простая логика: если до вылета больше 24 часов - полный возврат
        if booking.flight and booking.flight.departure_time:
            time_until_flight = booking.flight.departure_time - datetime.now(booking.flight.departure_time.tzinfo)
            hours_until_flight = time_until_flight.total_seconds() / 3600

            if hours_until_flight > 24:
                refund_amount = booking.payment.amount  # Полный возврат
                refund_days = 3
                can_refund = True
            elif hours_until_flight > 3:
                refund_amount = booking.payment.amount * 0.5  # 50% возврат
                refund_days = 5
                can_refund = True
            else:
                refund_amount = 0  # Нет возврата
                can_refund = False

    # Форматируем даты в строки для корректной JSON сериализации
    flight_departure_str = None
    if booking.flight and booking.flight.departure_time:
        flight_departure_str = booking.flight.departure_time.isoformat()

    return {
        "booking_id": booking.id,
        "booking_status": booking.booking_status,
        "payment_status": booking.payment.payment_status if booking.payment else None,
        "can_cancel": booking.booking_status != "cancelled",
        "can_refund": can_refund,
        "refund_amount": refund_amount,
        "original_amount": booking.payment.amount if booking.payment else 0,
        "refund_days": refund_days,
        "payment_method": booking.payment.payment_method if booking.payment else None,
        "flight_departure": flight_departure_str,
        "hours_until_flight": hours_until_flight
    }

@app.get("/bookings/{booking_id}/cancel-check")
async def check_cancel_booking(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Проверить возможность отмены бронирования"""
    from sqlalchemy import select

    # Получаем бронирование с платежом
    result = await db.execute(
        select(models.Booking)
        .options(selectinload(models.Booking.payment))
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    if booking.user_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Нет прав")

    # Проверяем возможность отмены
    can_cancel = True
    reason = None

    if booking.booking_status == "cancelled":
        can_cancel = False
        reason = "Бронирование уже отменено"
    elif booking.payment and booking.payment.payment_status == "completed":
        can_cancel = False
        reason = "Бронирование уже оплачено. Для отмены обратитесь в поддержку."
    elif booking.payment and booking.payment.payment_status == "refunded":
        can_cancel = False
        reason = "Возврат уже осуществлен"

    return {
        "booking_id": booking.id,
        "booking_status": booking.booking_status,
        "can_cancel": can_cancel,
        "reason": reason,
        "has_payment": booking.payment is not None,
        "payment_status": booking.payment.payment_status if booking.payment else None
    }





# Payment endpoints (требуют аутентификации)
@app.post("/payments/", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
        payment: schemas.PaymentCreate,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    try:
        db_payment = await crud.create_payment(db=db, payment=payment, user_id=current_user.id)
        return db_payment
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка при создании платежа: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )




@app.get("/payments/history")
async def get_payment_history(
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить историю платежей пользователя"""
    from sqlalchemy import select

    result = await db.execute(
        select(models.Payment)
        .where(models.Payment.user_id == current_user.id)
        .order_by(models.Payment.payment_date.desc())
    )

    payments = result.scalars().all()

    return {
        "count": len(payments),
        "payments": [
            {
                "id": p.id,
                "booking_id": p.booking_id,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "status": p.payment_status,
                "transaction_id": p.transaction_id,
                "date": p.payment_date.isoformat() if p.payment_date else None
            }
            for p in payments
        ]
    }

# Airport endpoints (требуют админских прав)
@app.post("/airports/", response_model=schemas.AirportResponse, status_code=status.HTTP_201_CREATED)
async def create_airport(
        airport: schemas.AirportBase,
        db: AsyncSession = Depends(get_db),
        current_user: models.User = Depends(get_current_admin_user)
):
    return await crud.create_airport(db=db, airport=airport)


@app.get("/airports/", response_model=List[schemas.AirportResponse])
async def read_airports(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=200),
        db: AsyncSession = Depends(get_db)
):
    return await crud.get_airports(db, skip=skip, limit=limit)


# Admin endpoints (требуют админских прав)
@app.post("/admin/flights/", response_model=schemas.FlightResponse, status_code=status.HTTP_201_CREATED)
async def create_flight(
        flight: schemas.FlightCreate,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    return await crud.create_flight(db=db, flight=flight)


@app.get("/admin/users/", response_model=List[schemas.UserResponse])
async def read_all_users(
        current_user: models.User = Depends(get_current_admin_user),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=200),
        db: AsyncSession = Depends(get_db)
):
    return await crud.get_users(db, skip=skip, limit=limit)


# Health check (публичный)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/")
async def root():
    return {
        "message": "Airline Booking System API",
        "docs": "/docs",
        "redoc": "/redoc"
    }


# В main.py добавьте следующие endpoints после существующих:

# Flight endpoints для админов (редактирование и удаление)
@app.put("/admin/flights/{flight_id}", response_model=schemas.FlightResponse)
async def update_flight(
        flight_id: int,
        flight_update: schemas.FlightUpdate,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Обновление рейса (только для админов)"""
    # Проверяем, существует ли рейс
    existing_flight = await crud.get_flight(db, flight_id)
    if not existing_flight:
        raise HTTPException(status_code=404, detail="Рейс не найден")

    # Обновляем рейс
    updated_flight = await crud.update_flight(
        db,
        flight_id=flight_id,
        flight_update=flight_update.dict(exclude_unset=True)
    )

    if not updated_flight:
        raise HTTPException(status_code=400, detail="Нечего обновлять")

    return updated_flight


@app.delete("/admin/flights/{flight_id}")
async def delete_flight_endpoint(
        flight_id: int,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Удаление рейса (только для админов)"""
    # Проверяем, существует ли рейс
    existing_flight = await crud.get_flight(db, flight_id)
    if not existing_flight:
        raise HTTPException(status_code=404, detail="Рейс не найден")

    result = await crud.delete_flight(db, flight_id)
    return result


# Airport endpoints для админов (редактирование и удаление)
@app.put("/admin/airports/{airport_id}", response_model=schemas.AirportResponse)
async def update_airport(
        airport_id: int,
        airport_update: schemas.AirportUpdate,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Обновление аэропорта (только для админов)"""
    # Проверяем, существует ли аэропорт
    existing_airport = await crud.get_airport(db, airport_id)
    if not existing_airport:
        raise HTTPException(status_code=404, detail="Аэропорт не найден")

    # Обновляем аэропорт
    updated_airport = await crud.update_airport(
        db,
        airport_id=airport_id,
        airport_update=airport_update.dict(exclude_unset=True)
    )

    if not updated_airport:
        raise HTTPException(status_code=400, detail="Нечего обновлять")

    return updated_airport


@app.delete("/admin/airports/{airport_id}")
async def delete_airport_endpoint(
        airport_id: int,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Удаление аэропорта (только для админов)"""
    # Проверяем, существует ли аэропорт
    existing_airport = await crud.get_airport(db, airport_id)
    if not existing_airport:
        raise HTTPException(status_code=404, detail="Аэропорт не найден")

    result = await crud.delete_airport(db, airport_id)
    return result


# Endpoint для получения конкретного аэропорта
@app.get("/airports/{airport_id}", response_model=schemas.AirportResponse)
async def read_airport(
        airport_id: int,
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию об аэропорте"""
    airport = await crud.get_airport(db, airport_id)
    if airport is None:
        raise HTTPException(status_code=404, detail="Аэропорт не найден")
    return airport


# Aircraft endpoints для админов
@app.post("/admin/aircrafts/", response_model=schemas.AircraftResponse, status_code=status.HTTP_201_CREATED)
async def create_aircraft(
        aircraft: schemas.AircraftCreate,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Создание самолета (только для админов)"""
    return await crud.create_aircraft(db=db, aircraft=aircraft)


@app.get("/admin/aircrafts/", response_model=List[schemas.AircraftResponse])
async def read_aircrafts(
        current_user: models.User = Depends(get_current_admin_user),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=200),
        db: AsyncSession = Depends(get_db)
):
    """Получить список самолетов (только для админов)"""
    return await crud.get_aircrafts(db, skip=skip, limit=limit)


@app.get("/admin/aircrafts/{aircraft_id}", response_model=schemas.AircraftResponse)
async def read_aircraft(
        aircraft_id: int,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о самолете (только для админов)"""
    aircraft = await crud.get_aircraft(db, aircraft_id)
    if aircraft is None:
        raise HTTPException(status_code=404, detail="Самолет не найден")
    return aircraft


@app.put("/admin/aircrafts/{aircraft_id}", response_model=schemas.AircraftResponse)
async def update_aircraft(
        aircraft_id: int,
        aircraft_update: schemas.AircraftUpdate,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Обновление самолета (только для админов)"""
    # Проверяем, существует ли самолет
    existing_aircraft = await crud.get_aircraft(db, aircraft_id)
    if not existing_aircraft:
        raise HTTPException(status_code=404, detail="Самолет не найден")

    # Обновляем самолет
    updated_aircraft = await crud.update_aircraft(
        db,
        aircraft_id=aircraft_id,
        aircraft_update=aircraft_update.dict(exclude_unset=True)
    )

    if not updated_aircraft:
        raise HTTPException(status_code=400, detail="Нечего обновлять")

    return updated_aircraft


@app.delete("/admin/aircrafts/{aircraft_id}")
async def delete_aircraft_endpoint(
        aircraft_id: int,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Удаление самолета (только для админов)"""
    # Проверяем, существует ли самолет
    existing_aircraft = await crud.get_aircraft(db, aircraft_id)
    if not existing_aircraft:
        raise HTTPException(status_code=404, detail="Самолет не найден")

    result = await crud.delete_aircraft(db, aircraft_id)
    return result


# User endpoints для админов (редактирование пользователей)
@app.put("/admin/users/{user_id}", response_model=schemas.UserResponse)
async def update_user_admin(
        user_id: int,
        user_update: schemas.UserCreate,  # Используем UserCreate для простоты, можно создать UserUpdate схему
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Обновление пользователя (только для админов)"""
    # Проверяем, существует ли пользователь
    existing_user = await crud.get_user(db, user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Создаем словарь для обновления
    update_data = user_update.dict(exclude_unset=True)

    # Обновляем пользователя
    updated_user = await crud.update_user(db, user_id=user_id, user_update=update_data)

    if not updated_user:
        raise HTTPException(status_code=400, detail="Нечего обновлять")

    return updated_user


@app.delete("/admin/users/{user_id}")
async def delete_user_admin(
        user_id: int,
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Удаление пользователя (только для админов)"""
    from sqlalchemy import delete

    # Нельзя удалить самого себя
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить свой аккаунт")

    # Проверяем, существует ли пользователь
    existing_user = await crud.get_user(db, user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Удаляем пользователя
    stmt = delete(models.User).where(models.User.id == user_id)
    await db.execute(stmt)
    await db.commit()

    return {"message": f"Пользователь {user_id} удален"}


# Endpoint для поиска аэропорта по коду
@app.get("/airports/code/{code}", response_model=schemas.AirportResponse)
async def read_airport_by_code(
        code: str,
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию об аэропорте по коду"""
    airport = await crud.get_airport_by_code(db, code)
    if airport is None:
        raise HTTPException(status_code=404, detail="Аэропорт не найден")
    return airport


# Endpoint для получения статистики (админ)
@app.get("/admin/statistics")
async def get_statistics(
        current_user: models.User = Depends(get_current_admin_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить статистику системы (только для админов)"""
    from sqlalchemy import func, select

    # Количество пользователей
    user_count_result = await db.execute(select(func.count(models.User.id)))
    user_count = user_count_result.scalar()

    # Количество рейсов
    flight_count_result = await db.execute(select(func.count(models.Flight.id)))
    flight_count = flight_count_result.scalar()

    # Количество бронирований
    booking_count_result = await db.execute(select(func.count(models.Booking.id)))
    booking_count = booking_count_result.scalar()

    # Количество аэропортов
    airport_count_result = await db.execute(select(func.count(models.Airport.id)))
    airport_count = airport_count_result.scalar()

    # Количество самолетов
    aircraft_count_result = await db.execute(select(func.count(models.Aircraft.id)))
    aircraft_count = aircraft_count_result.scalar()

    # Общая сумма платежей
    payment_sum_result = await db.execute(
        select(func.sum(models.Payment.amount))
        .where(models.Payment.payment_status == "completed")
    )
    total_revenue = payment_sum_result.scalar() or 0

    # Статистика по статусам бронирований
    booking_status_result = await db.execute(
        select(
            models.Booking.booking_status,
            func.count(models.Booking.id)
        )
        .group_by(models.Booking.booking_status)
    )
    booking_status_stats = dict(booking_status_result.all())

    return {
        "users": user_count,
        "flights": flight_count,
        "bookings": booking_count,
        "airports": airport_count,
        "aircrafts": aircraft_count,
        "total_revenue": float(total_revenue),
        "booking_statuses": booking_status_stats
    }


# В main.py добавьте следующие эндпоинты:

@app.get("/bookings/{booking_id}/upgrade-options")
async def get_upgrade_options(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить доступные варианты апгрейда для бронирования"""
    try:
        options = await crud.get_upgrade_options(db, booking_id, current_user.id)
        return options
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения опций апгрейда: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.post("/bookings/{booking_id}/upgrade-request")
async def create_upgrade_request(
        booking_id: int,
        upgrade_request: schemas.UpgradeRequestBase,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Создать запрос на апгрейд"""
    try:
        # Создаем объект запроса на апгрейд
        create_request = schemas.UpgradeRequestCreate(
            booking_id=booking_id,
            target_class=upgrade_request.target_class
        )

        db_upgrade = await crud.create_upgrade_request(
            db=db,
            upgrade_request=create_request,
            user_id=current_user.id
        )

        return {
            "message": "Запрос на апгрейд создан",
            "upgrade_id": db_upgrade.id,
            "transaction_id": db_upgrade.transaction_id,
            "price_difference": db_upgrade.price_difference,
            "current_class": db_upgrade.current_class.value,
            "target_class": db_upgrade.target_class.value,
            "status": db_upgrade.status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания запроса на апгрейд: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.post("/upgrades/{upgrade_id}/pay")
async def pay_for_upgrade(
        upgrade_id: int,
        payment_request: schemas.UpgradeCompleteRequest,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Оплатить и завершить апгрейд"""
    try:
        result = await crud.process_upgrade_payment(
            db=db,
            upgrade_id=upgrade_id,
            user_id=current_user.id
        )

        return {
            "message": "Апгрейд успешно завершен",
            "upgrade_id": result["upgrade"].id,
            "transaction_id": result["upgrade"].transaction_id,
            "payment_transaction_id": result["payment"].transaction_id,
            "price_difference": result["upgrade"].price_difference,
            "new_class": result["booking"].seat_class.value,
            "new_total_price": result["booking"].total_price,
            "booking_reference": result["booking"].booking_reference
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка оплаты апгрейда: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.get("/upgrades/history")
async def get_user_upgrade_history(
        current_user: models.User = Depends(get_current_user),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=200),
        db: AsyncSession = Depends(get_db)
):
    """Получить историю апгрейдов пользователя"""
    try:
        upgrades = await crud.get_upgrade_history(
            db=db,
            user_id=current_user.id,
            skip=skip,
            limit=limit
        )

        return {
            "count": len(upgrades),
            "upgrades": [
                {
                    "id": u.id,
                    "booking_id": u.booking_id,
                    "booking_reference": u.booking.booking_reference if u.booking else None,
                    "current_class": u.current_class.value,
                    "target_class": u.target_class.value,
                    "price_difference": u.price_difference,
                    "status": u.status,
                    "transaction_id": u.transaction_id,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                    "completed_at": u.completed_at.isoformat() if u.completed_at else None
                }
                for u in upgrades
            ]
        }

    except Exception as e:
        logger.error(f"Ошибка получения истории апгрейдов: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.get("/bookings/{booking_id}/upgrade-status")
async def get_booking_upgrade_status(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить статус апгрейдов для конкретного бронирования"""
    from sqlalchemy import select

    # Проверяем права доступа
    booking = await crud.get_booking(db, booking_id)
    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Получаем все апгрейды для этого бронирования
    result = await db.execute(
        select(models.UpgradeRequest)
        .where(models.UpgradeRequest.booking_id == booking_id)
        .order_by(models.UpgradeRequest.created_at.desc())
    )

    upgrades = result.scalars().all()

    return {
        "booking_id": booking_id,
        "booking_reference": booking.booking_reference,
        "current_class": booking.seat_class.value,
        "has_upgrades": len(upgrades) > 0,
        "upgrades": [
            {
                "id": u.id,
                "current_class": u.current_class.value,
                "target_class": u.target_class.value,
                "price_difference": u.price_difference,
                "status": u.status,
                "transaction_id": u.transaction_id,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "completed_at": u.completed_at.isoformat() if u.completed_at else None
            }
            for u in upgrades
        ]
    }


@app.post("/upgrades/{upgrade_id}/cancel")
async def cancel_upgrade_request(
        upgrade_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Отменить запрос на апгрейд"""
    from sqlalchemy import select, update

    # Получаем запрос на апгрейд
    result = await db.execute(
        select(models.UpgradeRequest)
        .where(
            and_(
                models.UpgradeRequest.id == upgrade_id,
                models.UpgradeRequest.user_id == current_user.id
            )
        )
    )
    upgrade = result.scalar_one_or_none()

    if not upgrade:
        raise HTTPException(status_code=404, detail="Запрос на апгрейд не найден")

    if upgrade.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Нельзя отменить апгрейд со статусом: {upgrade.status}"
        )

    # Отменяем апгрейд
    upgrade.status = "cancelled"
    await db.commit()

    return {
        "message": "Запрос на апгрейд отменен",
        "upgrade_id": upgrade_id,
        "status": "cancelled"
    }


# В main.py добавьте endpoints для работы с багажом

@app.get("/luggage/pricing")
async def get_luggage_prices(
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о ценах на багаж"""
    try:
        pricing = await crud.get_luggage_pricing(db)
        return pricing
    except Exception as e:
        logger.error(f"Ошибка получения цен на багаж: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.post("/bookings/with-luggage/", response_model=schemas.BookingResponse)
async def create_booking_with_luggage_endpoint(
        booking: schemas.BookingCreate,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Создание бронирования с багажом - ИСПРАВЛЕННАЯ ВЕРСИЯ"""
    try:
        db_booking = await crud.create_booking_with_luggage(
            db=db,
            booking=booking,
            user_id=current_user.id
        )

        if db_booking is None:
            raise HTTPException(
                status_code=400,
                detail="Booking failed. Check flight availability or flight ID."
            )

        # Явно загружаем связанный багаж
        from sqlalchemy.orm import selectinload
        from sqlalchemy import select

        # Получаем бронирование с багажом
        result = await db.execute(
            select(models.Booking)
            .options(selectinload(models.Booking.luggage))
            .where(models.Booking.id == db_booking.id)
        )
        db_booking_with_luggage = result.scalar_one_or_none()

        if not db_booking_with_luggage:
            raise HTTPException(status_code=404, detail="Бронирование не найдено после создания")

        # Создаем словарь для ответа
        response_data = {
            "id": db_booking_with_luggage.id,
            "booking_reference": db_booking_with_luggage.booking_reference,
            "user_id": db_booking_with_luggage.user_id,
            "flight_id": db_booking_with_luggage.flight_id,
            "seat_class": db_booking_with_luggage.seat_class.value if db_booking_with_luggage.seat_class else db_booking_with_luggage.seat_class,
            "seat_number": db_booking_with_luggage.seat_number,
            "passengers_count": db_booking_with_luggage.passengers_count,
            "total_price": db_booking_with_luggage.total_price,
            "booking_status": db_booking_with_luggage.booking_status,
            "booking_date": db_booking_with_luggage.booking_date,
            "special_requests": db_booking_with_luggage.special_requests,
            "luggage": []
        }

        # Добавляем багаж если есть
        if hasattr(db_booking_with_luggage, 'luggage') and db_booking_with_luggage.luggage:
            response_data["luggage"] = [
                {
                    "id": lug.id,
                    "booking_id": lug.booking_id,
                    "luggage_type": lug.luggage_type,
                    "weight": float(lug.weight) if lug.weight else 0.0,
                    "price": float(lug.price) if lug.price else 0.0,
                    "special_requirements": lug.special_requirements,
                    "created_at": lug.created_at
                }
                for lug in db_booking_with_luggage.luggage
            ]

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания бронирования с багажом: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


@app.get("/bookings/{booking_id}/luggage")
async def get_booking_luggage(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о багаже для бронирования"""
    from sqlalchemy import select

    # Проверяем права доступа
    result = await db.execute(
        select(models.Booking)
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Получаем багаж
    luggage_result = await db.execute(
        select(models.Luggage)
        .where(models.Luggage.booking_id == booking_id)
    )

    luggage_items = luggage_result.scalars().all()

    return {
        "booking_id": booking_id,
        "luggage_count": len(luggage_items),
        "total_luggage_price": sum(item.price for item in luggage_items),
        "luggage": [
            {
                "id": item.id,
                "luggage_type": item.luggage_type,
                "weight": item.weight,
                "price": float(item.price),
                "special_requirements": item.special_requirements,
                "created_at": item.created_at.isoformat() if item.created_at else None
            }
            for item in luggage_items
        ]
    }


@app.post("/bookings/{booking_id}/add-luggage")
async def add_luggage_to_booking(
        booking_id: int,
        luggage: schemas.LuggageBase,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Добавить багаж к существующему бронированию"""
    from sqlalchemy import select

    # Проверяем права доступа
    result = await db.execute(
        select(models.Booking)
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Проверяем, можно ли добавить багаж
    if booking.booking_status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Нельзя добавить багаж к отмененному или завершенному бронированию"
        )

    # Создаем запись о багаже
    luggage_create = schemas.LuggageCreate(
        booking_id=booking_id,
        luggage_type=luggage.luggage_type,
        weight=luggage.weight,
        price=luggage.price,
        special_requirements=luggage.special_requirements
    )

    db_luggage = await crud.create_luggage(db, luggage_create, current_user.id)

    # Обновляем общую стоимость бронирования
    booking.total_price += luggage.price
    await db.commit()

    return {
        "message": "Багаж успешно добавлен",
        "luggage_id": db_luggage.id,
        "new_total_price": float(booking.total_price),
        "luggage": schemas.LuggageResponse.from_orm(db_luggage)
    }


# В main.py добавьте новые endpoints для багажа

# ДОБАВИТЬ endpoint для получения цен на багаж
@app.get("/luggage/pricing", response_model=schemas.LuggagePricingResponse)
async def get_luggage_prices(
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о ценах на багаж"""
    try:
        pricing = await crud.get_luggage_pricing(db)
        return pricing
    except Exception as e:
        logger.error(f"Ошибка получения цен на багаж: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


# ДОБАВИТЬ endpoint для получения багажа бронирования
@app.get("/bookings/{booking_id}/luggage")
async def get_booking_luggage(
        booking_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Получить информацию о багаже для бронирования"""
    from sqlalchemy import select

    # Проверяем права доступа
    result = await db.execute(
        select(models.Booking)
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Получаем багаж
    luggage_result = await db.execute(
        select(models.Luggage)
        .where(models.Luggage.booking_id == booking_id)
        .order_by(models.Luggage.created_at.desc())
    )

    luggage_items = luggage_result.scalars().all()

    return {
        "booking_id": booking_id,
        "luggage_count": len(luggage_items),
        "total_luggage_price": sum(float(item.price) for item in luggage_items),
        "luggage": [
            {
                "id": item.id,
                "luggage_type": item.luggage_type,
                "weight": item.weight,
                "price": float(item.price),
                "special_requirements": item.special_requirements,
                "created_at": item.created_at.isoformat() if item.created_at else None
            }
            for item in luggage_items
        ]
    }


# ДОБАВИТЬ endpoint для добавления багажа к бронированию
@app.post("/bookings/{booking_id}/add-luggage")
async def add_luggage_to_booking(
        booking_id: int,
        luggage: schemas.LuggageBase,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Добавить багаж к существующему бронированию"""
    from sqlalchemy import select

    # Проверяем права доступа
    result = await db.execute(
        select(models.Booking)
        .where(models.Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Проверяем, можно ли добавить багаж
    if booking.booking_status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Нельзя добавить багаж к отмененному или завершенному бронированию"
        )

    # Рассчитываем стоимость если не указана
    if not luggage.price and luggage.weight:
        luggage.price = await crud.calculate_luggage_price(
            luggage.luggage_type,
            luggage.weight or 0
        )

    # Создаем запись о багаже
    luggage_create = schemas.LuggageCreate(
        booking_id=booking_id,
        luggage_type=luggage.luggage_type,
        weight=luggage.weight,
        price=luggage.price,
        special_requirements=luggage.special_requirements
    )

    db_luggage = await crud.create_luggage(db, luggage_create, current_user.id)

    # Обновляем общую стоимость бронирования
    booking.total_price += luggage.price
    await db.commit()
    await db.refresh(booking)

    return {
        "message": "Багаж успешно добавлен",
        "luggage_id": db_luggage.id,
        "new_total_price": float(booking.total_price),
        "luggage": schemas.LuggageResponse.from_orm(db_luggage)
    }


# ДОБАВИТЬ endpoint для обновления багажа
@app.put("/luggage/{luggage_id}", response_model=schemas.LuggageResponse)
async def update_luggage_endpoint(
        luggage_id: int,
        luggage_update: schemas.LuggageUpdate,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Обновить информацию о багаже"""
    try:
        db_luggage = await crud.update_luggage(
            db=db,
            luggage_id=luggage_id,
            luggage_update=luggage_update,
            user_id=current_user.id
        )

        if not db_luggage:
            raise HTTPException(status_code=404, detail="Багаж не найден")

        return schemas.LuggageResponse.from_orm(db_luggage)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка обновления багажа: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


# ДОБАВИТЬ endpoint для удаления багажа
@app.delete("/luggage/{luggage_id}")
async def delete_luggage_endpoint(
        luggage_id: int,
        current_user: models.User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    """Удалить багаж"""
    try:
        result = await crud.delete_luggage(
            db=db,
            luggage_id=luggage_id,
            user_id=current_user.id
        )

        if not result:
            raise HTTPException(status_code=404, detail="Багаж не найден")

        return {"message": "Багаж успешно удален"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка удаления багажа: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сервера: {str(e)}"
        )


# ДОБАВИТЬ endpoint для расчета стоимости багажа
@app.get("/luggage/calculate-price")
async def calculate_luggage_price_endpoint(
        luggage_type: str = Query(..., description="Тип багажа"),
        weight: int = Query(0, ge=0, le=100, description="Вес в кг"),
        db: AsyncSession = Depends(get_db)
):
    """Рассчитать стоимость багажа"""
    try:
        price = await crud.calculate_luggage_price(luggage_type, weight)

        return {
            "luggage_type": luggage_type,
            "weight": weight,
            "price": price,
            "currency": "RUB"
        }
    except Exception as e:
        logger.error(f"Ошибка расчета стоимости багажа: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Некорректные параметры: {str(e)}"
        )

# Добавьте эти endpoints в main.py после существующих flight endpoints

@app.get("/flights/search/", response_model=List[schemas.FlightResponse])
async def search_flights_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    departure_airport: Optional[str] = Query(None, description="Аэропорт вылета"),
    arrival_airport: Optional[str] = Query(None, description="Аэропорт прилета"),
    departure_date: Optional[datetime] = Query(None, description="Дата вылета"),
    min_price: Optional[float] = Query(None, ge=0, description="Минимальная цена"),
    max_price: Optional[float] = Query(None, ge=0, description="Максимальная цена"),
    airline: Optional[str] = Query(None, description="Авиакомпания"),
    seat_class: Optional[str] = Query(None, description="Класс обслуживания"),
    departure_time_range: Optional[str] = Query(
        None,
        description="Время вылета: morning, day, evening, night"
    ),
    sort_by: str = Query("departure_time", description="Сортировка: departure_time, price, duration"),
    sort_order: str = Query("asc", description="Порядок: asc, desc"),
    db: AsyncSession = Depends(get_db)
):
    """Расширенный поиск рейсов со всеми фильтрами"""
    flights = await crud.search_flights(
        db,
        skip=skip,
        limit=limit,
        departure_airport=departure_airport,
        arrival_airport=arrival_airport,
        departure_date=departure_date,
        min_price=min_price,
        max_price=max_price,
        airline=airline,
        seat_class=seat_class,
        departure_time_range=departure_time_range,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return flights


@app.get("/airports/search/", response_model=List[schemas.AirportResponse])
async def search_airports_endpoint(
    query: Optional[str] = Query(None, description="Поиск по коду, названию, городу или стране"),
    city: Optional[str] = Query(None, description="Город"),
    country: Optional[str] = Query(None, description="Страна"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Поиск аэропортов"""
    airports = await crud.search_airports(
        db,
        query_str=query,
        city=city,
        country=country,
        skip=skip,
        limit=limit
    )
    return airports


@app.get("/bookings/search/", response_model=List[schemas.BookingResponse])
async def search_bookings_endpoint(
    booking_reference: Optional[str] = Query(None, description="Номер бронирования"),
    flight_number: Optional[str] = Query(None, description="Номер рейса"),
    status: Optional[str] = Query(None, description="Статус бронирования"),
    start_date: Optional[datetime] = Query(None, description="Начальная дата"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Поиск бронирований пользователя"""
    bookings = await crud.search_bookings(
        db,
        user_id=current_user.id,
        booking_reference=booking_reference,
        flight_number=flight_number,
        status=status,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )
    return bookings


@app.get("/flights/suggestions/", response_model=List[schemas.FlightResponse])
async def get_flight_suggestions_endpoint(
    query: str = Query(..., description="Поисковый запрос"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Получить подсказки для поиска рейсов"""
    flights = await crud.get_flight_suggestions(db, query_str=query, limit=limit)
    return flights


@app.get("/flights/cheapest/", response_model=List[schemas.FlightResponse])
async def get_cheapest_flights_endpoint(
    departure_airport: Optional[str] = Query(None, description="Аэропорт вылета"),
    arrival_airport: Optional[str] = Query(None, description="Аэропорт прилета"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Получить самые дешевые рейсы"""
    flights = await crud.get_cheapest_flights(
        db,
        departure_airport=departure_airport,
        arrival_airport=arrival_airport,
        limit=limit
    )
    return flights


@app.get("/flights/upcoming/", response_model=List[schemas.FlightResponse])
async def get_upcoming_flights_endpoint(
    hours_ahead: int = Query(24, ge=1, le=168, description="Часов вперед"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Получить ближайшие рейсы"""
    flights = await crud.get_upcoming_flights(
        db,
        hours_ahead=hours_ahead,
        skip=skip,
        limit=limit
    )
    return flights


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="localhost",
        port=8000

    )