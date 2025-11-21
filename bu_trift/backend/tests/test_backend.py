# backend/tests/test_backend.py

import sys
from pathlib import Path
import uuid

from fastapi.testclient import TestClient

# -------------------------------------------------------------------
# Make sure Python can find backend/main.py and backend/database.py
# -------------------------------------------------------------------
CURRENT_DIR = Path(__file__).resolve().parent          # .../backend/tests
BACKEND_DIR = CURRENT_DIR.parent                       # .../backend

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Now these imports will work even when pytest rootdir is backend/
from main import app, get_password_hash, verify_password, validate_bu_email  # type: ignore
from database import Base, engine  # type: ignore

# Create a single TestClient for all tests
client = TestClient(app)


# -------------------------------------------------------------------
# Test setup: reset DB once for the whole module
# -------------------------------------------------------------------
def setup_module(module):
    """
    Run once before all tests in this module.
    Drops and recreates tables so tests start from a clean DB.

    WARNING: This will wipe existing data in butrift.db.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# -------------------------------------------------------------------
# Basic health-check endpoints
# -------------------------------------------------------------------
def test_root_health():
    response = client.get("/")
    assert response.status_code == 200


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy"


# -------------------------------------------------------------------
# Helper for random BU emails
# -------------------------------------------------------------------
def _random_bu_email() -> str:
    return f"test_{uuid.uuid4().hex}@bu.edu"


# -------------------------------------------------------------------
# Unit-ish tests: password hashing + email validation
# -------------------------------------------------------------------
def test_get_password_hash_and_verify_password_round_trip():
    password = "secret123"
    hashed = get_password_hash(password)

    # Hash should not equal plain text
    assert hashed != password
    assert isinstance(hashed, str)

    # Correct password passes
    assert verify_password(password, hashed)

    # Wrong password fails
    assert not verify_password("wrong-password", hashed)


def test_validate_bu_email():
    assert validate_bu_email("student@bu.edu")
    assert validate_bu_email("STUDENT@BU.EDU")  # case-insensitive
    assert not validate_bu_email("student@gmail.com")
    assert not validate_bu_email("student@bu.com")


# -------------------------------------------------------------------
# User registration & login
# -------------------------------------------------------------------
def test_register_user_success_with_bu_email():
    email = _random_bu_email()
    payload = {
        "email": email,
        "password": "strongpass",
        "display_name": "Test User",
        "bio": "Just a test",
    }

    resp = client.post("/api/users/register", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert data["email"] == email.lower()
    assert data["display_name"] == "Test User"
    assert data["is_verified"] is True
    assert "id" in data


def test_register_user_rejects_non_bu_email():
    payload = {
        "email": "notbu@gmail.com",
        "password": "strongpass",
        "display_name": "Bad Email",
        "bio": "Should fail",
    }

    resp = client.post("/api/users/register", json=payload)
    assert resp.status_code == 400
    assert "Email must be a @bu.edu email address" in resp.text


def test_register_user_rejects_duplicate_email():
    email = _random_bu_email()
    payload = {
        "email": email,
        "password": "strongpass",
        "display_name": "Original",
    }

    # First registration – should succeed
    resp1 = client.post("/api/users/register", json=payload)
    assert resp1.status_code == 200

    # Second registration with same email – should fail
    resp2 = client.post("/api/users/register", json=payload)
    assert resp2.status_code == 400
    assert "Email already registered" in resp2.text


def test_register_user_rejects_short_password():
    email = _random_bu_email()
    payload = {
        "email": email,
        "password": "123",  # too short
        "display_name": "Short Pass",
    }

    resp = client.post("/api/users/register", json=payload)
    assert resp.status_code == 400
    assert "Password must be at least 6 characters long" in resp.text


def test_login_user_success_and_wrong_password():
    email = _random_bu_email()
    password = "strongpass"

    # Register user
    reg_payload = {
        "email": email,
        "password": password,
        "display_name": "Login User",
    }
    reg_resp = client.post("/api/users/register", json=reg_payload)
    assert reg_resp.status_code == 200

    # Correct login
    login_payload = {"email": email, "password": password}
    login_resp_ok = client.post("/api/users/login", json=login_payload)
    assert login_resp_ok.status_code == 200
    data = login_resp_ok.json()
    assert data["email"] == email.lower()

    # Wrong password
    login_payload_bad = {"email": email, "password": "wrong-password"}
    login_resp_bad = client.post("/api/users/login", json=login_payload_bad)
    assert login_resp_bad.status_code == 401
    assert "Incorrect email or password" in login_resp_bad.text


def test_login_user_unknown_email():
    payload = {"email": "unknown@bu.edu", "password": "whatever"}
    resp = client.post("/api/users/login", json=payload)
    assert resp.status_code == 401
    assert "Incorrect email or password" in resp.text


# -------------------------------------------------------------------
# Items: create & fetch
# -------------------------------------------------------------------
def test_create_item_and_fetch_by_id_and_filter():
    # First register a seller
    email = _random_bu_email()
    reg_payload = {
        "email": email,
        "password": "strongpass",
        "display_name": "Seller User",
    }
    reg_resp = client.post("/api/users/register", json=reg_payload)
    assert reg_resp.status_code == 200
    seller = reg_resp.json()
    seller_id = seller["id"]

    # Create new item
    item_payload = {
        "title": "Test Chair",
        "description": "Comfy chair for sale",
        "price": 25.0,
        "category": "Furniture",
        "condition": "Good",
        "seller_id": seller_id,
        "status": "available",
        "location": "Warren Towers",
        "is_negotiable": True,
        "images": ["http://localhost:8000/uploads/chair.jpg"],
    }

    create_resp = client.post("/api/items", json=item_payload)
    assert create_resp.status_code == 200
    item_data = create_resp.json()
    item_id = item_data["id"]

    # Fetch by ID
    get_resp = client.get(f"/api/items/{item_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["title"] == "Test Chair"
    assert get_data["seller_id"] == seller_id
    assert get_data["images"] == item_payload["images"]

    # Fetch via GET /api/items with seller_id filter
    list_resp = client.get(f"/api/items?seller_id={seller_id}")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(i["id"] == item_id for i in items)
