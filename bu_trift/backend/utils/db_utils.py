"""
Database utility functions to reduce code duplication.

This module provides helper functions for common database operations
that are repeated throughout the codebase.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Type, TypeVar
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

# Type variable for SQLAlchemy models
ModelType = TypeVar('ModelType')


def get_or_404(
    model_class: Type[ModelType],
    item_id: str,
    db: Session,
    error_message: str = None,
) -> ModelType:
    """
    Get a model instance by ID or raise 404 error.
    
    This function extracts the common pattern of:
    1. Querying model by ID
    2. Checking if instance exists
    3. Raising 404 if not found
    4. Returning instance
    
    Args:
        model_class: The SQLAlchemy model class to query
        item_id: The ID of the item to retrieve
        db: Database session
        error_message: Custom error message (default: "{ModelName} not found")
    
    Returns:
        Model instance if found
    
    Raises:
        HTTPException: 404 if item not found
    
    Usage:
        item = get_or_404(ItemDB, item_id, db, "Item not found")
        user = get_or_404(UserDB, user_id, db)
    """
    instance = db.query(model_class).filter(model_class.id == item_id).first()
    
    if not instance:
        error_msg = error_message or f"{model_class.__name__} not found"
        raise HTTPException(status_code=404, detail=error_msg)
    
    return instance


def handle_db_operation(
    operation,
    db: Session,
    error_message: str = "Database operation failed",
):
    """
    Execute a database operation with automatic commit/rollback handling.
    
    This context manager-like function handles the common pattern of:
    1. Executing database operations
    2. Committing on success
    3. Rolling back on error
    4. Raising appropriate HTTP exceptions
    
    Args:
        operation: Callable that performs database operations
        db: Database session
        error_message: Custom error message for failures
    
    Returns:
        Result of the operation
    
    Raises:
        HTTPException: 500 with error_message on database errors
    
    Usage:
        result = handle_db_operation(
            lambda: db.add(new_item) or new_item,
            db,
            "Failed to create item"
        )
        db.commit()
        db.refresh(result)
    """
    try:
        return operation()
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"{error_message}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{error_message}: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"{error_message}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{error_message}: {str(e)}")

