from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    role = Column(String(20), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"


class Aircraft(Base):
    __tablename__ = "aircrafts"

    id = Column(Integer, primary_key=True, index=True)
    model = Column(String(100), nullable=False)
    manufacturer = Column(String(100))
    registration_number = Column(String(50), unique=True, nullable=False)
    total_seats = Column(Integer, nullable=False)
    economy_seats = Column(Integer, nullable=False)
    business_seats = Column(Integer, nullable=False)
    first_class_seats = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    flights = relationship("Flight", back_populates="aircraft", cascade="all, delete-orphan")
    luggage = relationship(
        "Luggage",
        secondary="bookings",  # используем bookings как промежуточную таблицу
        primaryjoin="Aircraft.id == Flight.aircraft_id",
        secondaryjoin="Booking.id == Luggage.booking_id",
        viewonly=True,
        lazy="dynamic"
    )
class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String(20), unique=True, nullable=False)
    aircraft_id = Column(Integer, ForeignKey("aircrafts.id"), nullable=False)
    departure_airport = Column(String(100), nullable=False)
    arrival_airport = Column(String(100), nullable=False)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    arrival_time = Column(DateTime(timezone=True), nullable=False)
    economy_price = Column(Float, nullable=False)
    business_price = Column(Float, nullable=False)
    first_class_price = Column(Float, nullable=False)
    available_economy_seats = Column(Integer, nullable=False)
    available_business_seats = Column(Integer, nullable=False)
    available_first_class_seats = Column(Integer, nullable=False)
    status = Column(String(20), default="scheduled".upper())  # scheduled, delayed, cancelled, completed

    # Relationships
    aircraft = relationship("Aircraft", back_populates="flights")
    bookings = relationship("Booking", back_populates="flight", cascade="all, delete-orphan")


class SeatClass(enum.Enum):
    """Перечисление для классов обслуживания"""
    ECONOMY = "economy"
    BUSINESS = "business"
    FIRST_CLASS = "first_class"

    @classmethod
    def get_value(cls, seat_class_str):
        """Получение значения Enum из строки"""
        if not seat_class_str:
            return cls.ECONOMY

        seat_class_str = str(seat_class_str).lower().strip()

        if seat_class_str == "economy":
            return cls.ECONOMY
        elif seat_class_str == "business":
            return cls.BUSINESS
        elif seat_class_str == "first_class":
            return cls.FIRST_CLASS
        else:
            return cls.ECONOMY


# Обновите класс Booking для связи с багажом
class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(20), unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    flight_id = Column(Integer, ForeignKey("flights.id"), nullable=False)
    seat_class = Column(Enum(SeatClass, values_callable=lambda x: [e.value for e in x]), nullable=False)
    seat_number = Column(String(10), nullable=True)
    passengers_count = Column(Integer, nullable=False, default=1)
    total_price = Column(Numeric(10, 2), nullable=False)
    booking_status = Column(String(20), default="confirmed")
    booking_date = Column(DateTime, default=datetime.utcnow)
    special_requests = Column(String(500), nullable=True)

    # Связи
    luggage = relationship("Luggage", back_populates="booking", cascade="all, delete-orphan")  # НОВОЕ

    user = relationship("User", back_populates="bookings", lazy="joined")
    flight = relationship("Flight", back_populates="bookings", lazy="joined")
    payment = relationship("Payment", back_populates="booking", uselist=False, lazy="joined")

    def __repr__(self):
        return f"<Booking {self.booking_reference}>"

# Добавьте этот класс в models.py после модели Payment

class UpgradeRequest(Base):
    __tablename__ = "upgrade_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_class = Column(Enum(SeatClass, values_callable=lambda x: [e.value for e in x]), nullable=False)
    target_class = Column(Enum(SeatClass, values_callable=lambda x: [e.value for e in x]), nullable=False)
    price_difference = Column(Float, nullable=False)
    status = Column(String(20), default="pending")  # pending, completed, cancelled, failed
    transaction_id = Column(String(100), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    booking = relationship("Booking", backref="upgrade_requests", lazy="joined")
    user = relationship("User", lazy="joined")

    def __repr__(self):
        return f"<UpgradeRequest(id={self.id}, booking_id={self.booking_id}, status={self.status})>"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(
        String(20),
        default="pending",
        nullable=False,
        comment="pending, completed, failed, refunded, refund_pending"
    )
    transaction_id = Column(String(100), unique=True)
    refund_transaction_id = Column(String(100), unique=True)  # Добавим ID возврата
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    refund_date = Column(DateTime(timezone=True))  # Дата возврата

    # Relationships
    user = relationship("User", back_populates="payments")
    booking = relationship("Booking", back_populates="payment")


class Airport(Base):
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    timezone = Column(String(50))


class LuggageType(str, Enum):
    NONE = "none"
    HAND = "hand"
    CHECKED = "checked"
    BUSINESS = "business"
    PREMIUM = "premium"


# Добавьте новую таблицу Luggage
class Luggage(Base):
    __tablename__ = "luggage"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    luggage_type = Column(String(20), nullable=False)
    weight = Column(Integer)  # Вес в кг
    price = Column(Numeric(10, 2), nullable=False)
    special_requirements = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    booking = relationship("Booking", back_populates="luggage")

    def __repr__(self):
        return f"<Luggage {self.id} for booking {self.booking_id}>"


