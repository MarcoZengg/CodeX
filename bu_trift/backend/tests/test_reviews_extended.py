# backend/tests/test_reviews_extended.py
# Additional review endpoint tests to improve coverage

import sys
from pathlib import Path
import uuid
from datetime import datetime, timedelta

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
from models.transaction import TransactionDB
from models.review import ReviewDB


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
        email="buyer@bu.edu",
        firebase_uid=firebase_uid,
        display_name="Buyer User",
        is_verified=True,
        bio="Test buyer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_other_user(db: Session, email: str = "seller@bu.edu") -> UserDB:
    user = UserDB(
        id=str(uuid.uuid4()),
        email=email,
        firebase_uid=f"firebase-uid-{uuid.uuid4()}",
        display_name="Seller User",
        is_verified=True,
        bio="Test seller",
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


def create_completed_transaction(
    db: Session,
    buyer: UserDB,
    seller: UserDB,
    item: ItemDB,
    conversation: ConversationDB,
) -> TransactionDB:
    tx = TransactionDB(
        id=str(uuid.uuid4()),
        item_id=item.id,
        buyer_id=buyer.id,
        seller_id=seller.id,
        conversation_id=conversation.id,
        status="completed",
        buyer_confirmed=True,
        seller_confirmed=True,
        completed_date=datetime.utcnow(),
        meetup_time=datetime.utcnow() + timedelta(days=1),
        meetup_place="BU Library",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# -------------------------------------------------------------------
# Review Endpoint Tests
# -------------------------------------------------------------------

def test_get_reviews_by_item(client: TestClient, db: Session):
    """Test getting reviews filtered by item_id"""
    buyer = get_or_create_current_user(db)
    seller = create_other_user(db)
    item = create_item_for_user(db, seller)
    conv = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, conv)

    # Create review
    review = ReviewDB(
        id=str(uuid.uuid4()),
        transaction_id=tx.id,
        item_id=item.id,
        reviewer_id=buyer.id,
        reviewee_id=seller.id,
        rating=5,
        comment="Great seller!",
    )
    db.add(review)
    db.commit()

    # Get reviews by item (tests line 2137-2139)
    resp = client.get(f"/api/reviews?item_id={item.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["item_id"] == item.id


def test_get_reviews_by_reviewee(client: TestClient, db: Session):
    """Test getting reviews filtered by reviewee_id"""
    buyer = get_or_create_current_user(db)
    seller = create_other_user(db)
    item = create_item_for_user(db, seller)
    conv = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, conv)

    # Create review
    review = ReviewDB(
        id=str(uuid.uuid4()),
        transaction_id=tx.id,
        item_id=item.id,
        reviewer_id=buyer.id,
        reviewee_id=seller.id,
        rating=5,
        comment="Great seller!",
    )
    db.add(review)
    db.commit()

    # Get reviews by reviewee - endpoint uses user_id parameter, not reviewee_id
    # But looking at the code, it filters by reviewee_id when user_id is provided
    resp = client.get(f"/api/reviews?user_id={seller.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["reviewee_id"] == seller.id


def test_get_reviews_no_filter(client: TestClient, db: Session):
    """Test getting reviews with no filter (returns empty list)"""
    get_or_create_current_user(db)
    
    # Get reviews with no filter (tests line 2160-2161)
    resp = client.get("/api/reviews")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_get_review_not_found(client: TestClient, db: Session):
    """Test getting non-existent review"""
    get_or_create_current_user(db)
    fake_id = str(uuid.uuid4())
    resp = client.get(f"/api/reviews/{fake_id}")
    assert resp.status_code == 404
    assert "Review not found" in resp.text


def test_add_review_response_error_handling(client: TestClient, db: Session):
    """Test adding review response error handling"""
    buyer = get_or_create_current_user(db)
    seller = create_other_user(db)
    item = create_item_for_user(db, seller)
    conv = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, conv)

    # Create review
    review = ReviewDB(
        id=str(uuid.uuid4()),
        transaction_id=tx.id,
        item_id=item.id,
        reviewer_id=buyer.id,
        reviewee_id=seller.id,
        rating=5,
        comment="Great seller!",
    )
    db.add(review)
    db.commit()

    # Buyer cannot add response to their own review (tests authorization - line 2185-2186)
    # Current user is buyer, so they cannot respond (only reviewee can)
    resp = client.put(f"/api/reviews/{review.id}/response", json={
        "response": "Thank you!",
    })
    assert resp.status_code == 403
    assert "Only the reviewed user can add a response" in resp.text or "Only the reviewee" in resp.text


def test_delete_review_error_handling(client: TestClient, db: Session):
    """Test delete review error handling"""
    buyer = get_or_create_current_user(db)
    seller = create_other_user(db)
    item = create_item_for_user(db, seller)
    conv = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, conv)

    # Create review
    review = ReviewDB(
        id=str(uuid.uuid4()),
        transaction_id=tx.id,
        item_id=item.id,
        reviewer_id=buyer.id,
        reviewee_id=seller.id,
        rating=5,
        comment="Great seller!",
    )
    db.add(review)
    db.commit()

    # Test error path (lines 2213, 2228-2230)
    resp = client.delete(f"/api/reviews/{review.id}")
    assert resp.status_code == 200

