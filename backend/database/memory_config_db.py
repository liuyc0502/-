from typing import Any, Dict, List

from .client import filter_property, get_db_session
from .db_models import MemoryUserConfig


def get_all_configs_by_user_id(user_id: str) -> List[Dict[str, Any]]:
    """Return all config records for the specified user (soft-deleted excluded)."""
    with get_db_session() as session:
        result = session.query(MemoryUserConfig).filter(
            MemoryUserConfig.user_id == user_id,
            MemoryUserConfig.delete_flag == "N",
        ).all()

        record_info = []
        for item in result:
            record_info.append({
                "config_id": item.config_id,
                "config_key": item.config_key,
                "config_value": item.config_value,
                "value_type": item.value_type,
                "update_time": item.update_time,
            })
        return record_info


def get_memory_config_info(user_id: str, select_key: str) -> List[Dict[str, Any]]:
    """Get config records (could be multiple for multi type) for a user by key."""
    with get_db_session() as session:
        result = session.query(MemoryUserConfig).filter(
            MemoryUserConfig.user_id == user_id,
            MemoryUserConfig.config_key == select_key,
            MemoryUserConfig.delete_flag == "N",
        ).all()

        record_info = []
        for item in result:
            record_info.append({
                "config_id": item.config_id,
                "config_value": item.config_value,
                "value_type": item.value_type,
            })
        return record_info


def insert_config(insert_data: Dict[str, Any]) -> bool:
    """Insert a new config record. `insert_data` should already include created_by & updated_by."""
    with get_db_session() as session:
        try:
            insert_data = filter_property(insert_data, MemoryUserConfig)
            session.add(MemoryUserConfig(**insert_data))
            session.commit()
            return True
        except Exception:
            session.rollback()
            return False


def delete_config_by_config_id(config_id: int, updated_by: str) -> bool:
    """Hard delete a record by id."""
    with get_db_session() as session:
        try:
            session.query(MemoryUserConfig).filter(
                MemoryUserConfig.config_id == config_id
            ).delete()
            session.commit()
            return True
        except Exception:
            session.rollback()
            return False


def update_config_by_id(config_id: int, update_data: Dict[str, Any]) -> bool:
    """Update fields of a config record by id. `update_data` will be filtered automatically."""
    with get_db_session() as session:
        try:
            update_data = filter_property(update_data, MemoryUserConfig)
            session.query(MemoryUserConfig).filter(
                MemoryUserConfig.config_id == config_id,
                MemoryUserConfig.delete_flag == "N",
            ).update(update_data)
            session.commit()
            return True
        except Exception:
            session.rollback()
            return False


def delete_all_configs_by_user_id(user_id: str, actor: str) -> bool:
    """Hard delete all memory user config records for a user."""
    with get_db_session() as session:
        try:
            session.query(MemoryUserConfig).filter(
                MemoryUserConfig.user_id == user_id
            ).delete()
        except Exception:
            session.rollback()
            return False