from datetime import datetime
from typing import Dict, List
import models


class UpgradeUtils:
    @staticmethod
    def get_class_hierarchy():
        """Получить иерархию классов обслуживания"""
        return {
            "economy": 1,
            "business": 2,
            "first_class": 3
        }

    @staticmethod
    def get_class_name(seat_class: str) -> str:
        """Получить человекочитаемое название класса"""
        names = {
            "economy": "Эконом",
            "business": "Бизнес",
            "first_class": "Первый класс"
        }
        return names.get(seat_class, seat_class)

    @staticmethod
    def get_class_benefits(seat_class: str) -> List[str]:
        """Получить список преимуществ класса"""
        benefits = {
            "economy": [
                "Стандартные места",
                "Бесплатный напиток",
                "Ручная кладь 8 кг"
            ],
            "business": [
                "Широкие кресла с увеличенным пространством",
                "Приоритетная посадка",
                "Премиум питание",
                "Дополнительный багаж (2x23 кг)",
                "Доступ в бизнес-зал"
            ],
            "first_class": [
                "Люксовые кресла с полным раскладыванием",
                "Персональный бортпроводник",
                "Премиум меню и шампанское",
                "Доступ в VIP-лаунж",
                "Личный багаж 3x32 кг",
                "Лимузин до самолета"
            ]
        }
        return benefits.get(seat_class, [])

    @staticmethod
    def get_class_badge(seat_class: str) -> Dict[str, str]:
        """Получить стили для отображения класса"""
        badges = {
            "economy": {
                "class": "bg-success",
                "text_color": "text-white",
                "icon": "bi-person"
            },
            "business": {
                "class": "bg-warning",
                "text_color": "text-dark",
                "icon": "bi-briefcase"
            },
            "first_class": {
                "class": "bg-danger",
                "text_color": "text-white",
                "icon": "bi-stars"
            }
        }
        return badges.get(seat_class, badges["economy"])

    @staticmethod
    def calculate_refund_for_upgrade(
            original_price: float,
            upgrade_price: float,
            hours_until_flight: float
    ) -> float:
        """Рассчитать возможный возврат при отмене апгрейда"""
        if hours_until_flight > 24:
            return upgrade_price * 0.9  # 90% возврата
        elif hours_until_flight > 12:
            return upgrade_price * 0.7  # 70% возврата
        elif hours_until_flight > 6:
            return upgrade_price * 0.5  # 50% возврата
        elif hours_until_flight > 3:
            return upgrade_price * 0.3  # 30% возврата
        else:
            return 0  # Нет возврата

    @staticmethod
    def validate_upgrade_timing(departure_time: datetime) -> bool:
        """Проверить возможность апгрейда по времени"""
        current_time = datetime.now(departure_time.tzinfo)
        time_until_flight = departure_time - current_time
        hours_until_flight = time_until_flight.total_seconds() / 3600

        # Минимальное время для апгрейда - 3 часа до вылета
        return hours_until_flight > 3