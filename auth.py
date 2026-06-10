# auth_simple.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import base64
import logging
from database import get_db
from typing import Optional

from models import User

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

security = HTTPBasic()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля"""
    try:
        if not plain_password or not hashed_password:
            return False

        plain_password = plain_password.strip()
        hashed_password = hashed_password.strip()

        if hashed_password.startswith('sha256$'):
            stored_hash = hashed_password[7:]
            computed_hash = hashlib.sha256(plain_password.encode()).hexdigest()
            return computed_hash == stored_hash
        else:
            computed_hash = hashlib.sha256(plain_password.encode()).hexdigest()
            return computed_hash == hashed_password
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Генерация хеша пароля"""
    if not password:
        raise ValueError("Password cannot be empty")

    password = password.strip()
    hashed = hashlib.sha256(password.encode()).hexdigest()
    return f"sha256${hashed}"


async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[dict]:
    """Аутентификация пользователя - возвращает dict"""
    try:
        logger.debug(f"Authenticating user: {username}")

        if not username or not password:
            return None

        # Прямой SQL запрос
        from sqlalchemy import text
        query = text("""
            SELECT 
                id, username, email, hashed_password, 
                role, is_active, first_name, last_name, phone, created_at
            FROM users 
            WHERE username = :username
        """)

        result = await db.execute(query, {"username": username})
        row = result.fetchone()

        if not row:
            logger.warning(f"User not found: {username}")
            return None

        # Преобразуем в dict
        user_dict = {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "hashed_password": row[3],
            "role": row[4] or "user",
            "is_active": bool(row[5]),
            "first_name": row[6],
            "last_name": row[7],
            "phone": row[8],
            "created_at": row[9]
        }

        # Проверяем активность
        if not user_dict["is_active"]:
            logger.warning(f"User inactive: {username}")
            return None

        # Проверяем пароль
        if not verify_password(password, user_dict["hashed_password"]):
            logger.warning(f"Invalid password for user: {username}")
            return None

        logger.info(f"User authenticated: {username}")
        return user_dict

    except Exception as e:
        logger.error(f"Authentication error: {e}", exc_info=True)
        return None


# auth.py - исправленная версия
async def get_current_user(
        credentials: HTTPBasicCredentials = Depends(security),
        db: AsyncSession = Depends(get_db)
) -> User:
    """Получение текущего пользователя - возвращает объект модели User"""
    try:
        user_dict = await authenticate_user(db, credentials.username, credentials.password)

        if not user_dict:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Basic"},
            )

        # Создаем объект модели User из словаря
        user = User(
            id=user_dict["id"],
            username=user_dict["username"],
            email=user_dict["email"],
            hashed_password=user_dict["hashed_password"],
            role=user_dict["role"],
            is_active=user_dict["is_active"],
            first_name=user_dict.get("first_name"),
            last_name=user_dict.get("last_name"),
            phone=user_dict.get("phone"),
            created_at=user_dict["created_at"],
        )

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


async def get_current_admin_user(
        current_user: dict = Depends(get_current_user)
) -> dict:
    """Проверка прав администратора"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user