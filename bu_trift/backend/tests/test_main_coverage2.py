# backend/tests/test_main_coverage2.py
# Additional tests to improve coverage - focusing on missing endpoints

import sys
from pathlib import Path
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# -------------------------------------------------------------------
# Make sure backend modules are importable
# -------------------------------------------------------------------
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models.user import UserDB
from models.item import ItemDB
from models.conversation import ConversationDB
from models.message import MessageDB


# -------------------------------------------------------------------
# Helper functions
# -------------------------------------------------------------------

def get_or_create_current_user(db: Session) -> UserDB:
    firebase_uid = "test-firebase-uid-123"
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if user:
        return user

    user = UserDB(
        id=str(uuid.uuid4()),
        email="user@bu.edu",
        firebase_uid=firebase_uid,
        display_name="Test User",
        is_verified=True,
        bio="Test",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_other_user(db: Session, email: str = "other@bu.edu") -> UserDB:
    user = UserDB(
        id=str(uuid.uuid4()),
        email=email,
        firebase_uid=f"firebase-uid-{uuid.uuid4()}",
        display_name="Other User",
        is_verified=True,
        bio="Other",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_item_for_user(db: Session, seller: UserDB) -> ItemDB:
    item = ItemDB(
        id=str(uuid.uuid4()),
        title="Test Item",
        description="Test",
        price=25.0,
        category="furniture",
        condition="good",
        seller_id=seller.id,
        status="available",
        location="West Campus",
        is_negotiable=True,
        images=["https://example.com/item.jpg"],
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
# Conversation Delete Tests
# -------------------------------------------------------------------

def test_delete_conversation_success(client: TestClient, db: Session):
    """Test deleting a conversation"""
    user = get_or_create_current_user(db)
    other = create_other_user(db)
    item = create_item_for_user(db, other)
    conv = create_conversation(db, user, other, item)

    resp = client.delete(f"/api/conversations/{conv.id}")
    assert resp.status_code == 200
    assert "deleted successfully" in resp.json()["message"].lower()


def test_delete_conversation_unauthorized(client: TestClient, db: Session):
    """Test deleting conversation when user is not participant"""
    user = get_or_create_current_user(db)
    other1 = create_other_user(db, "other1@bu.edu")
    other2 = create_other_user(db, "other2@bu.edu")
    item = create_item_for_user(db, other1)
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=other1.id,
        participant2_id=other2.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()

    resp = client.delete(f"/api/conversations/{conv.id}")
    assert resp.status_code == 403


# -------------------------------------------------------------------
# Message Endpoint Tests
# -------------------------------------------------------------------

def test_get_message_success(client: TestClient, db: Session):
    """Test getting a specific message"""
    user = get_or_create_current_user(db)
    other = create_other_user(db)
    item = create_item_for_user(db, other)
    conv = create_conversation(db, user, other, item)

    msg = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        sender_id=user.id,
        content="Test message",
    )
    db.add(msg)
    db.commit()

    resp = client.get(f"/api/messages/{msg.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == msg.id
    assert data["content"] == "Test message"


def test_get_message_unauthorized(client: TestClient, db: Session):
    """Test getting message when user is not participant"""
    user = get_or_create_current_user(db)
    other1 = create_other_user(db, "other1@bu.edu")
    other2 = create_other_user(db, "other2@bu.edu")
    item = create_item_for_user(db, other1)
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=other1.id,
        participant2_id=other2.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()

    msg = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        sender_id=other1.id,
        content="Private message",
    )
    db.add(msg)
    db.commit()

    resp = client.get(f"/api/messages/{msg.id}")
    assert resp.status_code == 403


def test_get_messages_unauthorized(client: TestClient, db: Session):
    """Test getting messages when user is not participant"""
    user = get_or_create_current_user(db)
    other1 = create_other_user(db, "other1@bu.edu")
    other2 = create_other_user(db, "other2@bu.edu")
    item = create_item_for_user(db, other1)
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=other1.id,
        participant2_id=other2.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()

    resp = client.get(f"/api/messages?conversation_id={conv.id}")
    assert resp.status_code == 403


def test_create_message_too_long(client: TestClient, db: Session):
    """Test creating message with content exceeding 5000 characters"""
    user = get_or_create_current_user(db)
    other = create_other_user(db)
    item = create_item_for_user(db, other)
    conv = create_conversation(db, user, other, item)

    # Create message with content > 5000 chars (tests line 1157)
    long_content = "x" * 5001
    resp = client.post("/api/messages", json={
        "conversation_id": conv.id,
        "sender_id": user.id,
        "content": long_content,
    })
    assert resp.status_code == 400
    assert "cannot exceed 5000 characters" in resp.text


def test_create_message_wrong_sender(client: TestClient, db: Session):
    """Test creating message with wrong sender_id"""
    user = get_or_create_current_user(db)
    other = create_other_user(db)
    item = create_item_for_user(db, other)
    conv = create_conversation(db, user, other, item)

    # Try to send message as other user (tests line 1160-1161)
    resp = client.post("/api/messages", json={
        "conversation_id": conv.id,
        "sender_id": other.id,  # Wrong - should be user.id
        "content": "Test",
    })
    assert resp.status_code == 403
    assert "can only send messages as yourself" in resp.text


def test_create_message_not_participant(client: TestClient, db: Session):
    """Test creating message when user is not participant"""
    user = get_or_create_current_user(db)
    other1 = create_other_user(db, "other1@bu.edu")
    other2 = create_other_user(db, "other2@bu.edu")
    item = create_item_for_user(db, other1)
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=other1.id,
        participant2_id=other2.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()

    # User tries to send message to conversation they're not part of (tests line 1167-1168)
    resp = client.post("/api/messages", json={
        "conversation_id": conv.id,
        "sender_id": user.id,
        "content": "Test",
    })
    assert resp.status_code == 403
    assert "not a participant" in resp.text


def test_update_message_not_sender(client: TestClient, db: Session):
    """Test updating message when user is not sender"""
    user = get_or_create_current_user(db)
    other = create_other_user(db)
    item = create_item_for_user(db, other)
    conv = create_conversation(db, user, other, item)

    # Create message from other user
    msg = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        sender_id=other.id,
        content="Original",
        is_read=False,
    )
    db.add(msg)
    db.commit()

    # User can update message if they're a participant (endpoint doesn't check sender)
    # This tests the update endpoint (lines 1243-1267)
    resp = client.put(f"/api/messages/{msg.id}", json={
        "is_read": True,
    })
    # User is a participant, so they can mark message as read
    assert resp.status_code == 200


def test_get_message_not_participant(client: TestClient, db: Session):
    """Test getting message when user is not participant in conversation"""
    user = get_or_create_current_user(db)
    other1 = create_other_user(db, "other1@bu.edu")
    other2 = create_other_user(db, "other2@bu.edu")
    item = create_item_for_user(db, other1)
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=other1.id,
        participant2_id=other2.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()

    msg = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        sender_id=other1.id,
        content="Private",
    )
    db.add(msg)
    db.commit()

    # User tries to get message from conversation they're not part of (tests line 1238-1239)
    resp = client.get(f"/api/messages/{msg.id}")
    assert resp.status_code == 403


def test_mark_conversation_read_wrong_user(client: TestClient, db: Session):
    """Test marking conversation read with wrong user_id"""
    user = get_or_create_current_user(db)
    other = create_other_user(db)
    item = create_item_for_user(db, other)
    conv = create_conversation(db, user, other, item)

    # Try to mark as read for wrong user (tests line 1278-1279)
    fake_user_id = str(uuid.uuid4())
    resp = client.put(f"/api/conversations/{conv.id}/mark-read?user_id={fake_user_id}")
    assert resp.status_code == 403
    assert "can only mark your own messages" in resp.text


def test_mark_conversation_read_not_participant(client: TestClient, db: Session):
    """Test marking conversation read when user is not participant"""
    user = get_or_create_current_user(db)
    other1 = create_other_user(db, "other1@bu.edu")
    other2 = create_other_user(db, "other2@bu.edu")
    item = create_item_for_user(db, other1)
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=other1.id,
        participant2_id=other2.id,
        item_id=item.id,
    )
    db.add(conv)
    db.commit()

    # User tries to mark conversation they're not part of as read (tests line 1284-1285)
    resp = client.put(f"/api/conversations/{conv.id}/mark-read?user_id={user.id}")
    assert resp.status_code == 403
    assert "not a participant" in resp.text

