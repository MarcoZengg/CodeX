# backend/tests/test_auth.py

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import auth as auth_module  # type: ignore


def make_creds(token: str) -> HTTPAuthorizationCredentials:
    """
    Helper to create HTTPAuthorizationCredentials like FastAPI's HTTPBearer does.
    """
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.mark.anyio(backend="asyncio")
async def test_verify_firebase_token_success(monkeypatch):
    """
    Happy path:
    - verify_id_token returns a decoded payload
    - verify_firebase_token should return that payload
    """

    def fake_verify_id_token(id_token: str):
        assert id_token == "good-token"
        return {"uid": "fake-uid-123", "email": "student@bu.edu"}

    # Patch firebase_auth.verify_id_token
    class DummyFirebaseAuth:
        pass

    dummy = DummyFirebaseAuth()
    dummy.verify_id_token = fake_verify_id_token
    monkeypatch.setattr(auth_module, "firebase_auth", dummy)

    creds = make_creds("good-token")
    decoded = await auth_module.verify_firebase_token(credentials=creds)  # type: ignore

    assert decoded["uid"] == "fake-uid-123"
    assert decoded["email"] == "student@bu.edu"


@pytest.mark.anyio(backend="asyncio")
async def test_verify_firebase_token_invalid_format(monkeypatch):
    """
    verify_id_token raises ValueError → should become HTTP 401 with
    'Invalid Firebase token format'.
    """

    def fake_verify_id_token(id_token: str):
        raise ValueError("Malformed token")

    class DummyFirebaseAuth:
        pass

    dummy = DummyFirebaseAuth()
    dummy.verify_id_token = fake_verify_id_token
    monkeypatch.setattr(auth_module, "firebase_auth", dummy)

    creds = make_creds("bad-format-token")
    with pytest.raises(HTTPException) as exc:
        await auth_module.verify_firebase_token(credentials=creds)  # type: ignore

    err = exc.value
    assert err.status_code == 401
    assert "Invalid Firebase token format" in err.detail


@pytest.mark.anyio(backend="asyncio")
async def test_verify_firebase_token_expired(monkeypatch):
    """
    verify_id_token raises ExpiredIdTokenError → should become HTTP 401 with
    'Firebase token has expired'.
    """

    class DummyFirebaseAuth:
        class ExpiredIdTokenError(Exception):
            pass

        class InvalidIdTokenError(Exception):
            pass

    def fake_verify_id_token(id_token: str):
        raise DummyFirebaseAuth.ExpiredIdTokenError("expired")

    dummy = DummyFirebaseAuth()
    dummy.verify_id_token = fake_verify_id_token
    monkeypatch.setattr(auth_module, "firebase_auth", dummy)

    creds = make_creds("expired-token")
    with pytest.raises(HTTPException) as exc:
        await auth_module.verify_firebase_token(credentials=creds)  # type: ignore

    err = exc.value
    assert err.status_code == 401
    assert "Firebase token has expired" in err.detail


@pytest.mark.anyio(backend="asyncio")
async def test_verify_firebase_token_invalid(monkeypatch):
    """
    verify_id_token raises InvalidIdTokenError → should become HTTP 401 with
    'Invalid Firebase token'.
    """

    class DummyFirebaseAuth:
        class ExpiredIdTokenError(Exception):
            pass

        class InvalidIdTokenError(Exception):
            pass

    def fake_verify_id_token(id_token: str):
        raise DummyFirebaseAuth.InvalidIdTokenError("invalid")

    dummy = DummyFirebaseAuth()
    dummy.verify_id_token = fake_verify_id_token
    monkeypatch.setattr(auth_module, "firebase_auth", dummy)

    creds = make_creds("invalid-token")
    with pytest.raises(HTTPException) as exc:
        await auth_module.verify_firebase_token(credentials=creds)  # type: ignore

    err = exc.value
    assert err.status_code == 401
    assert "Invalid Firebase token" in err.detail


@pytest.mark.anyio(backend="asyncio")
async def test_verify_firebase_token_unexpected_error(monkeypatch):
    """
    Any other exception → HTTP 401 with 'Failed to verify Firebase token'.
    """

    class DummyFirebaseAuth:
        class ExpiredIdTokenError(Exception):
            pass

        class InvalidIdTokenError(Exception):
            pass

    def fake_verify_id_token(id_token: str):
        raise RuntimeError("some weird error")

    dummy = DummyFirebaseAuth()
    dummy.verify_id_token = fake_verify_id_token
    monkeypatch.setattr(auth_module, "firebase_auth", dummy)

    creds = make_creds("weird-token")
    with pytest.raises(HTTPException) as exc:
        await auth_module.verify_firebase_token(credentials=creds)  # type: ignore

    err = exc.value
    assert err.status_code == 401
    assert "Failed to verify Firebase token" in err.detail
