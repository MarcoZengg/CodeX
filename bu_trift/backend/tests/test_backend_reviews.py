# backend/tests/test_backend_reviews.py
import uuid
from typing import Dict, Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from models.user import UserDB
from models.item import ItemDB
from models.review import ReviewDB
from models.conversation import ConversationDB
from models.transaction import TransactionDB


# -------------------------------------------------------------------
# Helper functions
# -------------------------------------------------------------------

def create_auth_user(db: Session, email: str = "buyer-reviews@bu.edu") -> UserDB:
    """
    Create the 'authenticated' user that get_current_user will find.

    Our override_verify_token returns uid='test-firebase-uid-123'
    in conftest.py, so this user's firebase_uid must match that.
    """
    user = UserDB(
        id=str(uuid.uuid4()),
        email=email,
        firebase_uid="test-firebase-uid-123",
        display_name="Auth User",
        is_verified=True,
        profile_image_url=None,
        bio="",
        rating=0.0,
        total_sales=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_other_user(db: Session, email: str = "other-reviews@bu.edu") -> UserDB:
    """Create a second user (e.g., seller/buyer) with a different firebase UID."""
    user = UserDB(
        id=str(uuid.uuid4()),
        email=email,
        firebase_uid=f"uid-{uuid.uuid4()}",
        display_name="Other User",
        is_verified=True,
        profile_image_url=None,
        bio="",
        rating=0.0,
        total_sales=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_item(db: Session, seller: UserDB) -> ItemDB:
    item = ItemDB(
        id=str(uuid.uuid4()),
        title="Reviewable Item",
        description="Item for review tests",
        price=10.0,
        category="furniture",
        condition="good",
        seller_id=seller.id,
        status="available",
        location="BU West",
        is_negotiable=True,
        images=[],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_conversation(db: Session, buyer: UserDB, seller: UserDB, item: ItemDB) -> ConversationDB:
    convo = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=buyer.id,
        participant2_id=seller.id,
        item_id=item.id,
        last_message_at=None,
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


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
        buy_request_id=None,
        status="completed",
        buyer_confirmed=True,
        seller_confirmed=True,
        buyer_cancel_confirmed=False,
        seller_cancel_confirmed=False,
        meetup_time=None,
        meetup_place=None,
        meetup_lat=None,
        meetup_lng=None,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# -------------------------------------------------------------------
# Tests
# -------------------------------------------------------------------

def test_create_and_get_review_flow(client: TestClient, db: Session):
    """
    Full happy-path review flow:
    - buyer (current user) leaves a review for seller about a completed transaction
    - we can list that seller's reviews
    - we can get a specific review by id
    """
    # Authenticated user will act as the BUYER in this test
    buyer = create_auth_user(db, email="buyer1-reviews@bu.edu")
    seller = create_other_user(db, email="seller-reviews@bu.edu")
    item = create_item(db, seller)
    convo = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, convo)

    payload: Dict[str, Any] = {
        "transaction_id": tx.id,
        "rating": 5,
        "comment": "Great seller, smooth meetup!",
    }

    # Create review
    resp = client.post("/api/reviews", json=payload)
    assert resp.status_code == 200
    created = resp.json()
    review_id = created["id"]

    assert created["rating"] == 5
    assert created["reviewer_id"] == buyer.id
    assert created["reviewee_id"] == seller.id
    assert created["item_id"] == item.id
    assert created["transaction_id"] == tx.id

    # List reviews for that seller (reviewee)
    list_resp = client.get(f"/api/reviews?user_id={seller.id}")
    assert list_resp.status_code == 200
    reviews = list_resp.json()
    assert any(r["id"] == review_id for r in reviews)

    # Get specific review
    get_resp = client.get(f"/api/reviews/{review_id}")
    assert get_resp.status_code == 200
    got = get_resp.json()
    assert got["id"] == review_id
    assert got["rating"] == created["rating"]


def test_review_response_and_delete(client: TestClient, db: Session):
    """
    - Create a review directly in the DB
    - Seller (current user / reviewee) adds a response
    - Delete the review
    - Verify it's gone
    """
    # In this test, the authenticated user will be the SELLER / reviewee
    seller = create_auth_user(db, email="seller-response@bu.edu")
    buyer = create_other_user(db, email="buyer-response@bu.edu")
    item = create_item(db, seller)
    convo = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, convo)

    review = ReviewDB(
        id=str(uuid.uuid4()),
        transaction_id=tx.id,
        item_id=item.id,
        # Make the authenticated user both the reviewer and reviewee
        # so they are allowed to add a response AND delete.
        reviewer_id=seller.id,
        reviewee_id=seller.id,
        rating=4,
        comment="Pretty good experience!",
        response=None,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Add response as the reviewee (seller / current user)
    resp_payload = {"response": "Thanks for the feedback!"}
    resp = client.put(f"/api/reviews/{review.id}/response", json=resp_payload)
    assert resp.status_code == 200
    updated = resp.json()
    assert "response" in updated
    assert "Thanks" in updated["response"]

    # Delete review
    delete_resp = client.delete(f"/api/reviews/{review.id}")
    assert delete_resp.status_code == 200

    # Should now 404 when fetching
    not_found = client.get(f"/api/reviews/{review.id}")
    assert not_found.status_code == 404


def test_review_validation_rejects_invalid_rating(client: TestClient, db: Session):
    """
    If rating is out of [1, 5], the endpoint should fail with 400/422.
    """
    buyer = create_auth_user(db, email="buyer-rating@bu.edu")
    seller = create_other_user(db, email="seller-rating@bu.edu")
    item = create_item(db, seller)
    convo = create_conversation(db, buyer, seller, item)
    tx = create_completed_transaction(db, buyer, seller, item, convo)

    bad_payload = {
        "transaction_id": tx.id,
        "rating": 10,  # invalid
        "comment": "This should not be accepted",
    }

    resp = client.post("/api/reviews", json=bad_payload)
    # Our implementation raises HTTPException(400) for bad rating
    assert resp.status_code in (400, 422)
