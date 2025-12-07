# backend/tests/test_backend_search_and_auth.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid


from models.user import UserDB
from models.item import ItemDB
from models.message import MessageDB
from models.conversation import ConversationDB


def create_user(db: Session, email: str) -> UserDB:
    user = UserDB(
        id=str(uuid.uuid4()),          
        email=email,
        firebase_uid=email,
        display_name=email.split("@")[0],
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

def create_auth_user(db: Session, email: str = "test@bu.edu") -> UserDB:
    """
    Create the 'current user' that get_current_user will find.

    Must match the uid returned by override_verify_token in conftest.py:
        uid = "test-firebase-uid-123"
    """
    user = UserDB(
        id=str(uuid.uuid4()),
        email=email,
        firebase_uid="test-firebase-uid-123",  # 👈 match token uid
        display_name=email.split("@")[0],
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




def create_item(
    db: Session,
    seller: UserDB,
    title: str,
    category: str,
    condition: str,
    price: float,
    status: str = "available",
) -> ItemDB:
    item = ItemDB(
        id=str(uuid.uuid4()),
        title=title,
        description=title,
        price=price,
        category=category,
        condition=condition,
        seller_id=seller.id,
        status=status,
        location="BU East",
        is_negotiable=True,
        images=[],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def test_item_advanced_filtering(client: TestClient, db: Session):
    """
    Exercise multiple branches of GET /api/items:
    - filter by category
    - filter by condition
    - filter by status
    - (if supported) min_price / max_price
    """
    seller = create_user(db, "seller-search@bu.edu")

    item1 = create_item(db, seller, "Red Chair", "furniture", "good", 10.0, status="available")
    item2 = create_item(db, seller, "Blue Chair", "furniture", "excellent", 25.0, status="sold")
    item3 = create_item(db, seller, "Math Textbook", "books", "good", 40.0, status="available")

    # Filter by category=furniture
    resp_cat = client.get("/api/items", params={"category": "furniture"})
    assert resp_cat.status_code == 200
    data_cat = resp_cat.json()
    assert any(i["id"] == item1.id for i in data_cat)
    assert any(i["id"] == item2.id for i in data_cat)
    assert all(i["category"] == "furniture" for i in data_cat)

    # Filter by condition=good
    resp_cond = client.get("/api/items", params={"condition": "good"})
    assert resp_cond.status_code == 200
    data_cond = resp_cond.json()
    assert any(i["id"] == item1.id for i in data_cond)
    assert any(i["id"] == item3.id for i in data_cond)
    assert all(i["condition"] == "good" for i in data_cond)

    # Filter by status=available
    resp_status = client.get("/api/items", params={"status": "available"})
    assert resp_status.status_code == 200
    data_status = resp_status.json()
    ids = {i["id"] for i in data_status}
    assert item1.id in ids
    assert item3.id in ids
    assert item2.id not in ids

    # If your endpoint supports price range, this will exercise extra branches
    resp_price = client.get("/api/items", params={"min_price": 20, "max_price": 50})
    assert resp_price.status_code == 200
    data_price = resp_price.json()
    # Should include textbook (40) and maybe Blue Chair (25) if not filtered out by sold
    assert any(i["id"] == item3.id for i in data_price)


def test_item_keyword_search(client: TestClient, db: Session):
    """
    If your API supports keyword search via `q` or `search` query param,
    this will hit that branch in main.py.
    """
    seller = create_user(db, "seller-search2@bu.edu")
    item1 = create_item(db, seller, "IKEA Desk", "furniture", "excellent", 80.0)
    create_item(db, seller, "Random Lamp", "furniture", "good", 15.0)

    # Try q=desk or search=desk depending on your API
    resp = client.get("/api/items", params={"q": "desk"})
    if resp.status_code == 404:
        # fallback if your param is named differently
        resp = client.get("/api/items", params={"search": "desk"})
    assert resp.status_code == 200
    results = resp.json()
    assert any("Desk" in i["title"] for i in results)


def test_cannot_delete_item_not_owned(client: TestClient, db: Session):
    """
    Hit the 403 branch for deleting someone else's item.
    """
    # "Current user" = the one returned by verify_token in conftest,
    # which we map to a DB user here:
    current_user = create_auth_user(db, "test@bu.edu")      # 👈 use auth user
    other_user = create_user(db, "other-owner@bu.edu")      # 👈 normal user

    foreign_item = create_item(db, other_user, "Foreign Item", "misc", "good", 5.0)

    resp = client.delete(f"/api/items/{foreign_item.id}")
    assert resp.status_code in (403, 401)



def test_cannot_update_message_not_sender(client: TestClient, db: Session):
    """
    If your API restricts updating/deleting messages to the sender only,
    this hits the 403 branch.
    """
    # Create the authenticated user that get_current_user() will see.
    # This must match the uid from override_verify_token in conftest.py.
    current_user = create_auth_user(db, "test@bu.edu")

    # Create two other users: one will be the sender, one the other participant.
    sender = create_user(db, "sender-msg@bu.edu")
    other = create_user(db, "other-msg@bu.edu")

    # Create an item so we can satisfy NOT NULL item_id on conversations
    item = create_item(db, seller=sender, title="Msg Item", category="misc",
                       condition="good", price=1.0)

    # Create conversation linked to that item
    conv = ConversationDB(
        id=str(uuid.uuid4()),
        participant1_id=sender.id,
        participant2_id=other.id,
        item_id=item.id,   # ✅ NOT NULL and valid
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    # Message from sender
    msg = MessageDB(
        id=str(uuid.uuid4()),   # ✅ correct keyword arg
        conversation_id=conv.id,
        sender_id=sender.id,
        content="Original content",
        is_read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Now, current user = test@bu.edu (via token), which is NOT the sender.
    update_payload = {"content": "Attempt to edit by non-sender"}
    upd = client.put(f"/api/messages/{msg.id}", json=update_payload)
    # If your API uses PATCH instead, you’d call client.patch here.

    assert upd.status_code in (403, 401)

