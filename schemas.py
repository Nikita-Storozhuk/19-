from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class SeatClass(str, Enum):
    ECONOMY = "economy"
    BUSINESS = "business"
    FIRST_CLASS = "first_class"


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Flight Schemas
class FlightBase(BaseModel):
    flight_number: str
    departure_airport: str
    arrival_airport: str
    departure_time: datetime
    arrival_time: datetime
    economy_price: float
    business_price: float
    first_class_price: float


class FlightCreate(FlightBase):
    aircraft_id: int
    available_economy_seats: int
    available_business_seats: int
    available_first_class_seats: int


class FlightResponse(FlightBase):
    id: int
    status: str
    available_economy_seats: int
    available_business_seats: int
    available_first_class_seats: int

    class Config:
        from_attributes = True


# Booking Schemas
class BookingBase(BaseModel):
    flight_id: int
    seat_class: SeatClass
    passengers_count: int = 1
    total_price: float
    special_requests: Optional[str] = None
    seat_number: Optional[str] = None


# В schemas.py измените BookingResponse

class PaymentBase(BaseModel):
    payment_method: str
class PaymentResponse(PaymentBase):
    id: int
    booking_id: int
    user_id: int
    amount: float
    payment_status: str
    transaction_id: Optional[str] = None
    refund_transaction_id: Optional[str] = None  # Добавляем
    payment_date: datetime
    refund_date: Optional[datetime] = None  # Добавляем

    class Config:
        from_attributes = True




# Payment Schemas


class PaymentCreate(PaymentBase):
    booking_id: int


# В schemas.py добавьте:
class BookingWithPaymentResponse(BookingBase):
    id: int
    booking_reference: str
    user_id: int
    total_price: float
    booking_status: str
    booking_date: datetime
    seat_number: Optional[str] = None
    payment: Optional["PaymentResponse"] = None

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True  # Разрешаем произвольные типы

    @validator('payment', pre=True)
    def validate_payment(cls, v):
        """Валидация платежа"""
        if v is None:
            return None
        # Если это уже словарь или PaymentResponse
        if isinstance(v, (dict, PaymentResponse)):
            return v
        # Если это SQLAlchemy объект, преобразуем в словарь
        if hasattr(v, 'id'):
            return PaymentResponse(
                id=v.id,
                booking_id=v.booking_id,
                user_id=v.user_id,
                amount=v.amount,
                payment_method=v.payment_method,
                payment_status=v.payment_status,
                transaction_id=v.transaction_id,
                payment_date=v.payment_date
            )
        return None






# Airport Schemas
class AirportBase(BaseModel):
    code: str
    name: str
    city: str
    country: str
    timezone: Optional[str] = None


class AirportResponse(AirportBase):
    id: int

    class Config:
        from_attributes = True


# Token Schema (for future use)
class Token(BaseModel):
    access_token: str
    token_type: str

# В schemas.py добавьте:
class BookingSimpleResponse(BookingBase):
    id: int
    booking_reference: str
    user_id: int
    total_price: float
    booking_status: str
    booking_date: datetime
    seat_number: Optional[str] = None

    class Config:
        from_attributes = True


# В schemas.py добавьте следующие схемы:

# Flight Update Schemas
class FlightUpdate(BaseModel):
    flight_number: Optional[str] = None
    aircraft_id: Optional[int] = None
    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    economy_price: Optional[float] = None
    business_price: Optional[float] = None
    first_class_price: Optional[float] = None
    available_economy_seats: Optional[int] = None
    available_business_seats: Optional[int] = None
    available_first_class_seats: Optional[int] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


# Airport Update Schemas
class AirportUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None

    class Config:
        from_attributes = True


# Aircraft Update Schemas
class AircraftBase(BaseModel):
    model: str
    manufacturer: Optional[str] = None
    registration_number: str
    total_seats: int
    economy_seats: int
    business_seats: int
    first_class_seats: int
    is_active: bool = True


class AircraftCreate(AircraftBase):
    pass


class AircraftUpdate(BaseModel):
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    registration_number: Optional[str] = None
    total_seats: Optional[int] = None
    economy_seats: Optional[int] = None
    business_seats: Optional[int] = None
    first_class_seats: Optional[int] = None
    is_active: Optional[bool] = None


class AircraftResponse(AircraftBase):
    id: int

    class Config:
        from_attributes = True

# Добавьте в schemas.py UserUpdate схему:

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    @validator('password')
    def password_strength(cls, v):
        if v and len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

    class Config:
        from_attributes = True


# В schemas.py добавьте:

class UpgradeRequestBase(BaseModel):
    target_class: SeatClass


class UpgradeRequestCreate(UpgradeRequestBase):
    booking_id: int


class UpgradeRequestResponse(UpgradeRequestBase):
    id: int
    booking_id: int
    user_id: int
    current_class: SeatClass
    target_class: SeatClass
    price_difference: float
    status: str
    transaction_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpgradeOptionsResponse(BaseModel):
    booking_id: int
    current_class: SeatClass
    available_upgrades: List[dict]
    eligibility_check: dict

    class Config:
        from_attributes = True


class UpgradeCompleteRequest(BaseModel):
    payment_method: str = "credit_card"


class LuggageType(str, Enum):
    NONE = "none"
    HAND = "hand"
    CHECKED = "checked"
    BUSINESS = "business"
    PREMIUM = "premium"


class LuggageBase(BaseModel):
    luggage_type: LuggageType
    weight: Optional[int] = None
    price: float
    special_requirements: Optional[str] = None


class LuggageCreate(LuggageBase):
    booking_id: int


class LuggageResponse(LuggageBase):
    id: int
    booking_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class BookingCreate(BookingBase):
    luggage: Optional[list[LuggageBase]] = []  # НОВОЕ: список багажа




# Добавьте схему для информации о ценах на багаж
class LuggagePrice(BaseModel):
    luggage_type: LuggageType
    price_per_kg: float
    max_weight: Optional[int] = None
    description: str


class LuggagePricingResponse(BaseModel):
    default_hand_luggage: LuggagePrice
    additional_options: list[LuggagePrice]


class BookingResponse(BaseModel):
    id: int
    booking_reference: str
    user_id: int
    flight_id: int
    seat_class: SeatClass  # Измените с SeatClass на str
    seat_number: Optional[str] = None
    passengers_count: int = 1
    total_price: float
    booking_status: str
    booking_date: datetime
    special_requests: Optional[str] = None
    payment: Optional[PaymentResponse] = None

    luggage: list[LuggageResponse] = []  # НОВОЕ: список багажа в ответе

    @validator('seat_class', pre=True)
    def normalize_seat_class(cls, v):
        """Нормализация seat_class"""
        if v is None:
            return "economy"

        # Если это Enum, получаем значение
        if hasattr(v, 'value'):
            v = v.value

        # Преобразуем в строку
        v = str(v).strip()

        # Преобразуем в нижний регистр с подчеркиванием
        if v == 'FIRST_CLASS':
            return "first_class"
        elif v == 'ECONOMY':
            return "economy"
        elif v == 'BUSINESS':
            return "business"
        elif v == 'First_Class':
            return "first_class"
        elif v == 'Economy':
            return "economy"
        elif v == 'Business':
            return "business"
        else:
            # Если другое значение, приводим к нижнему регистру
            return v.lower()

    class Config:
        from_attributes = True


class LuggageUpdate(BaseModel):
    luggage_type: Optional[LuggageType] = None
    weight: Optional[int] = Field(None, ge=1, le=100)
    price: Optional[float] = Field(None, ge=0)
    special_requirements: Optional[str] = Field(None, max_length=500)