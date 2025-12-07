# backend/tests/test_utils.py

import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

# -------------------------------------------------------------------
# Ensure backend modules are importable (same trick as conftest/test_backend)
# -------------------------------------------------------------------
CURRENT_DIR = Path(__file__).resolve().parent      # .../backend/tests
BACKEND_DIR = CURRENT_DIR.parent                   # .../backend

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Now we can import from backend code
from utils import db_utils  # type: ignore
from utils import websocket_auth  # type: ignore
from models.user import UserDB  # type: ignore


# -------------------------------------------------------------------
# Fixtures
# We reuse the `db` fixture defined in conftest.py (in-memory SQLite).
# -------------------------------------------------------------------
# NOTE: Don't redefine db/client fixtures here – pytest will pick up
# the ones already defined in backend/tests/conftest.py.


# ===================================================================
# Part C – Tests for utils/db_utils.py
#   - get_or_404
#   - handle_db_operation
# ===================================================================

def test_get_or_404_returns_instance_when_found(db):
    """
    Happy path: get_or_404 should return the instance when it exists.
    """
    user = UserDB(
        id="user-123",
        email="user123@bu.edu",
        firebase_uid="firebase-uid-123",
        display_name="Test User",
        is_verified=True,
    )
    db.add(user)
    db.commit()

    result = db_utils.get_or_404(UserDB, "user-123", db, "User not found")
    assert isinstance(result, UserDB)
    assert result.id == "user-123"
    assert result.email == "user123@bu.edu"


def test_get_or_404_raises_404_when_not_found(db):
    """
    When the row doesn't exist, get_or_404 should raise HTTPException(404).
    """
    with pytest.raises(HTTPException) as exc:
        db_utils.get_or_404(UserDB, "missing-id", db, "User not found")

    err = exc.value
    assert err.status_code == 404
    # Either the custom message or default pattern
    assert "not found" in err.detail


def test_handle_db_operation_success_commits_logic(db):
    """
    Happy path: handle_db_operation should return the result of the callable
    without raising, and NOT roll back.

    We still need to commit explicitly outside the helper (by design).
    """
    def operation():
        user = UserDB(
            id="user-op-success",
            email="op-success@bu.edu",
            firebase_uid="firebase-op-success",
            display_name="Op Success",
            is_verified=False,
        )
        db.add(user)
        # Return the object so caller can commit/refresh
        return user

    result = db_utils.handle_db_operation(operation, db, "Failed to create user")
    # We got the fresh object back
    assert isinstance(result, UserDB)
    assert result.id == "user-op-success"

    # Commit on caller side, then verify it actually hit the DB
    db.commit()
    stored = db.query(UserDB).filter_by(id="user-op-success").first()
    assert stored is not None
    assert stored.email == "op-success@bu.edu"


def test_handle_db_operation_wraps_sqlalchemy_error(db):
    """
    If the operation raises SQLAlchemyError, handle_db_operation should:
      - call db.rollback()
      - log the error
      - raise HTTPException(500) with the configured error_message.
    """

    def failing_operation():
        # Simulate a genuine SQLAlchemy failure
        raise SQLAlchemyError("Low-level DB failure")

    with pytest.raises(HTTPException) as exc:
        db_utils.handle_db_operation(
            failing_operation,
            db,
            error_message="Custom DB failure",
        )

    err = exc.value
    assert err.status_code == 500
    assert "Custom DB failure" in err.detail
    assert "Low-level DB failure" in err.detail


def test_handle_db_operation_wraps_generic_exception(db):
    """
    If the operation raises a generic Exception (not SQLAlchemyError),
    handle_db_operation should still:
      - rollback
      - log
      - raise HTTPException(500) with the configured error_message.
    """

    def failing_operation():
        raise RuntimeError("Something unexpected happened")

    with pytest.raises(HTTPException) as exc:
        db_utils.handle_db_operation(
            failing_operation,
            db,
            error_message="Generic operation failed",
        )

    err = exc.value
    assert err.status_code == 500
    assert "Generic operation failed" in err.detail
    assert "Something unexpected happened" in err.detail


# ===================================================================
# Part D – Tests for utils/websocket_auth.py
#   - verify_websocket_token
#   - get_user_from_firebase_uid
# ===================================================================

import pytest

@pytest.mark.anyio
async def test_verify_websocket_token_success(monkeypatch):
    """
    Happy path: verify_websocket_token should call firebase_auth.verify_id_token
    and return the decoded payload when verification succeeds.
    """
    calls = {}

    def fake_verify_id_token(token: str):
        # record which token was used
        calls["token"] = token
        return {
            "uid": "firebase-uid-999",
            "email": "ws-user@bu.edu",
        }

    # Patch the firebase_auth inside websocket_auth module
    monkeypatch.setattr(
        websocket_auth.firebase_auth,
        "verify_id_token",
        fake_verify_id_token,
    )

    decoded = await websocket_auth.verify_websocket_token("valid-ws-token")

    assert decoded is not None
    assert decoded["uid"] == "firebase-uid-999"
    assert decoded["email"] == "ws-user@bu.edu"
    assert calls["token"] == "valid-ws-token"



@pytest.mark.anyio
async def test_verify_websocket_token_failure_returns_none(monkeypatch):
    """
    When firebase_auth.verify_id_token raises, verify_websocket_token
    should catch and return None (instead of bubbling raw errors up).
    """

    def fake_verify_id_token(_token: str):
        raise Exception("Token invalid or expired")

    monkeypatch.setattr(
        websocket_auth.firebase_auth,
        "verify_id_token",
        fake_verify_id_token,
    )

    decoded = await websocket_auth.verify_websocket_token("bad-token")
    assert decoded is None  # gracefully handled



def test_get_user_from_firebase_uid_returns_user(db):
    """
    get_user_from_firebase_uid should return the matching UserDB row
    when a user with the given firebase_uid exists.
    """
    user = UserDB(
        id="ws-user-1",
        email="ws-uid-user@bu.edu",
        firebase_uid="firebase-uid-ws-1",
        display_name="WS User",
        is_verified=True,
    )
    db.add(user)
    db.commit()

    found = websocket_auth.get_user_from_firebase_uid("firebase-uid-ws-1", db)
    assert isinstance(found, UserDB)
    assert found.id == "ws-user-1"
    assert found.email == "ws-uid-user@bu.edu"


def test_get_user_from_firebase_uid_returns_none_when_missing(db):
    """
    If there is no user with the given firebase_uid, the helper should
    return None instead of raising.
    """
    found = websocket_auth.get_user_from_firebase_uid("non-existent-uid", db)
    assert found is None
