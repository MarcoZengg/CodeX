# backend/tests/test_backend.py

import uuid
from typing import Tuple

import pytest
from sqlalchemy.orm import Session

from models.user import UserDB  # type: ignore
from models.item import ItemDB  # type: ignore
from models.conversation import ConversationDB  # type: ignore
from models.message import MessageDB  # type: ignore
from main import validate_bu_email  # type: ignore


# -------------------------------------------------------------------
# Helper functions for creating test data in the in-memory DB
# -------------------------------------------------------------------

def create_current_user(db: Session) -> UserDB:
    """
    Create the 'authenticated' user that get_current_user will find.

    Our override_verify_token returns uid='test-firebase-uid-123',
    so we must create a user with that firebase_uid.
    """
    user = UserDB(
        id=str(uuid.uuid4()),
        email="buyer@bu.edu",
        firebase_uid="test-firebase-uid-123",
        display_name="Buyer User",
        is_verified=True,
        bio="Test buyer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_other_user(db: Session) -> UserDB:
    """Create a second user (e.g., seller) with a different firebase UID."""
    user = UserDB(
        id=str(uuid.uuid4()),
        email="seller@bu.edu",
        firebase_uid="other-firebase-uid-456",
        display_name="Seller User",
        is_verified=True,
        bio="Test seller",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_item_for_seller(db: Session, seller: UserDB) -> ItemDB:
    """Create a simple test item for the given seller."""
    item = ItemDB(
        id=str(uuid.uuid4()),
        title="Test Chair",
        description="Comfortable chair",
        price=25.0,
        category="furniture",
        condition="good",
        seller_id=seller.id,
        status="available",
        location="West Campus",
        is_negotiable=True,
        images=["https://example.com/chair.jpg"],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_conversation(
    db: Session,
    buyer: UserDB,
    seller: UserDB,
    item: ItemDB,
) -> ConversationDB:
    """Create a conversation between buyer and seller about an item."""
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=buyer.id,
        participant2_id=seller.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


# -------------------------------------------------------------------
# Basic health / utility
# -------------------------------------------------------------------

def test_root_health(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    # from main.root()
    assert data == {"message": "BUThrift API is running!"}


def test_validate_bu_email():
    assert validate_bu_email("student@bu.edu")
    assert validate_bu_email("STUDENT@BU.EDU")
    assert not validate_bu_email("student@gmail.com")
    assert not validate_bu_email("student@bu.com")


# -------------------------------------------------------------------
# User endpoints (Firebase-based profiles)
# -------------------------------------------------------------------

def test_create_profile_and_get_me(client, db):
    payload = {
        "email": "student@bu.edu",
        "display_name": "Test Student",
        "bio": "I love thrifting.",
    }

    # First call should create the profile for the Firebase uid from the token
    resp = client.post("/api/users/create-profile", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    user_id = data["id"]
    assert data["email"] == payload["email"].lower()
    assert data["display_name"] == payload["display_name"]
    assert data["is_verified"] is True

    # /api/users/me should return the same user
    me_resp = client.get("/api/users/me")
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["id"] == user_id
    assert me_data["email"] == payload["email"].lower()

    # /api/users/{user_id} (public endpoint)
    by_id_resp = client.get(f"/api/users/{user_id}")
    assert by_id_resp.status_code == 200
    by_id_data = by_id_resp.json()
    assert by_id_data["display_name"] == payload["display_name"]



def test_create_profile_rejects_non_bu_email(client, db):
    payload = {
        "email": "not_bu@gmail.com",
        "display_name": "Bad Email",
        "bio": "Should fail",
    }

    resp = client.post("/api/users/create-profile", json=payload)
    assert resp.status_code == 400
    assert "Email must be @bu.edu" in resp.text



def test_create_profile_rejects_duplicate(client, db):
    payload = {
        "email": "student@bu.edu",
        "display_name": "Test Student",
        "bio": "First time",
    }

    first = client.post("/api/users/create-profile", json=payload)
    assert first.status_code == 200

    second = client.post("/api/users/create-profile", json=payload)
    assert second.status_code == 400
    assert "User already exists" in second.text


# -------------------------------------------------------------------
# Item endpoints
# -------------------------------------------------------------------

def test_create_item_and_fetch_and_filter(client, db):
    # Create backing user row so get_current_user can resolve the Firebase uid
    user = create_current_user(db)

    item_payload = {
        "title": "Test Chair",
        "description": "Comfortable chair",
        "price": 25.0,
        "category": "furniture",
        "condition": "good",
        "location": "West Campus",
        "is_negotiable": True,
        "images": ["https://example.com/chair.jpg"],
    }

    # Create item
    create_resp = client.post("/api/items", json=item_payload)
    assert create_resp.status_code == 200
    created = create_resp.json()

    assert created["title"] == item_payload["title"]
    assert created["seller_id"] == user.id
    assert created["status"] == "available"
    assert created["images"] == item_payload["images"]

    item_id = created["id"]

    # GET by id
    get_resp = client.get(f"/api/items/{item_id}")
    assert get_resp.status_code == 200
    got = get_resp.json()
    assert got["id"] == item_id
    assert got["seller_id"] == user.id

    # GET /api/items with filters
    list_resp = client.get(
        f"/api/items?seller_id={user.id}&category=furniture&status=available"
    )
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(i["id"] == item_id for i in items)


def test_create_item_rejects_non_positive_price(client, db):
    # backing user for get_current_user()
    create_current_user(db)

    bad_payload = {
        "title": "Bad Item",
        "description": "Should fail",
        "price": 0.0,
        "category": "furniture",
        "condition": "good",
    }

    resp = client.post("/api/items", json=bad_payload)
    assert resp.status_code == 400
    assert "Price must be greater than 0" in resp.text


def test_update_item_status_and_delete(client, db):
    # Prepare seller + item: just need a DB user that matches the Firebase uid
    seller = create_current_user(db)
    item = create_item_for_seller(db, seller)

    # Happy path: valid status update
    resp = client.put(
        f"/api/items/{item.id}/status",
        json={"status": "sold"},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["status"] == "sold"

    # Invalid status
    bad_resp = client.put(
        f"/api/items/{item.id}/status",
        json={"status": "pending"},
    )
    assert bad_resp.status_code == 400
    assert "Invalid status" in bad_resp.text

    # Delete item
    delete_resp = client.delete(f"/api/items/{item.id}")
    assert delete_resp.status_code == 200
    assert "Item deleted successfully" in delete_resp.text

    # Now GET by id should 404
    not_found = client.get(f"/api/items/{item.id}")
    assert not_found.status_code == 404
    assert "Item not found" in not_found.text



# -------------------------------------------------------------------
# Conversations + Messages
# -------------------------------------------------------------------

def test_conversation_and_message_flow(client, db):
    # buyer is the authenticated user (firebase_uid = test-firebase-uid-123)
    buyer = create_current_user(db)
    seller = create_other_user(db)
    item = create_item_for_seller(db, seller)

    # Create conversation (buyer must be participant1)
    conv_resp = client.post(
        "/api/conversations",
        json={
            "participant1_id": buyer.id,
            "participant2_id": seller.id,
            "item_id": item.id,
        },
    )
    assert conv_resp.status_code == 200
    conv = conv_resp.json()
    conv_id = conv["id"]
    assert conv["participant1_id"] == buyer.id
    assert conv["participant2_id"] == seller.id

    # Create a message in this conversation
    msg_resp = client.post(
        "/api/messages",
        json={
            "conversation_id": conv_id,
            "sender_id": buyer.id,
            "content": "Is this still available?",
        },
    )
    assert msg_resp.status_code == 200
    msg_data = msg_resp.json()
    msg_id = msg_data["id"]
    assert msg_data["conversation_id"] == conv_id
    assert msg_data["sender_id"] == buyer.id
    assert msg_data["content"] == "Is this still available?"

    # List messages by conversation_id
    list_msg_resp = client.get(f"/api/messages?conversation_id={conv_id}")
    assert list_msg_resp.status_code == 200
    msgs = list_msg_resp.json()
    assert len(msgs) == 1
    assert msgs[0]["id"] == msg_id

    # List conversations for buyer
    list_conv_resp = client.get(f"/api/conversations?user_id={buyer.id}")
    assert list_conv_resp.status_code == 200
    convs = list_conv_resp.json()
    assert len(convs) == 1
    assert convs[0]["id"] == conv_id


def test_create_message_rejects_empty_content(client, db):
    buyer = create_current_user(db)
    seller = create_other_user(db)
    item = create_item_for_seller(db, seller)
    conv = create_conversation(db, buyer, seller, item)

    # Empty / whitespace-only content should be rejected
    resp = client.post(
        "/api/messages",
        json={
            "conversation_id": conv.id,
            "sender_id": buyer.id,
            "content": "   ",
        },
    )
    assert resp.status_code == 400
    assert "Message content cannot be empty" in resp.text


# -------------------------------------------------------------------
# Image upload (Cloudinary helper)
# -------------------------------------------------------------------

def test_upload_image_success(client, db, monkeypatch):
    """
    Test /api/upload-image without hitting real Cloudinary.
    We monkeypatch main.upload_file_to_cloudinary to return a fake URL.
    """
    # Ensure current user exists so get_current_user works
    create_current_user(db)

    # Monkeypatch Cloudinary uploader used inside main.upload_image
    import main as main_module  # type: ignore

    def fake_upload_file_to_cloudinary(file_content: bytes, filename: str, folder: str):
        # Basic sanity checks on the file we received
        assert file_content == b"fake-image-bytes"
        # Backend prefixes filename with a timestamp; just check the suffix
        assert filename.endswith("test-image.jpg")
        # If your main.py uses a different folder name, you can relax or remove this:
        # assert folder == "butrift/uploads"
        return "https://example.com/fake-image-url.jpg"

    monkeypatch.setattr(main_module, "upload_file_to_cloudinary", fake_upload_file_to_cloudinary)

    files = {
        "file": ("test-image.jpg", b"fake-image-bytes", "image/jpeg"),
    }

    resp = client.post("/api/upload-image", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["url"] == "https://example.com/fake-image-url.jpg"



def test_upload_image_rejects_invalid_extension(client, db):
    create_current_user(db)

    files = {
        "file": ("not-an-image.txt", b"some-bytes", "text/plain"),
    }

    resp = client.post("/api/upload-image", files=files)
    assert resp.status_code == 400
    assert "Invalid file type" in resp.text
