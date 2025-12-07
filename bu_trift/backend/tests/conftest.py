import sys
from pathlib import Path
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# -------------------------------------------------------------------
# Make sure we can import backend modules (main, database, models, etc.)
# -------------------------------------------------------------------
CURRENT_DIR = Path(__file__).resolve().parent       # .../backend/tests
BACKEND_DIR = CURRENT_DIR.parent                    # .../backend

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import Base, get_db  # type: ignore
from main import app               # type: ignore
from auth import verify_token      # type: ignore


# -------------------------------------------------------------------
# In-memory SQLite engine for tests
# -------------------------------------------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # reuse the same in-memory DB connection
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """
    Fresh in-memory database per test.
    Creates all tables before each test and drops them afterwards.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """
    FastAPI TestClient with:
    - get_db overridden to use the in-memory test DB
    - verify_token overridden to bypass real Firebase
    """
    # Override get_db to use our TestingSessionLocal
    def override_get_db():
        try:
            yield db
        finally:
            # session closed in db() fixture
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Override Firebase token verification so tests don't hit real Firebase
    async def override_verify_token(credentials=None):
        """
        Return a fake decoded Firebase token.
        All protected endpoints that depend on verify_token/get_current_user
        will see this as the authenticated user.
        """
        return {
            "uid": "test-firebase-uid-123",
            "email": "test@bu.edu",
        }

    app.dependency_overrides[verify_token] = override_verify_token

    with TestClient(app) as test_client:
        yield test_client

    # Clean up overrides AFTER the test
    app.dependency_overrides.clear()
