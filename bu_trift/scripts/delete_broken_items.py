#!/usr/bin/env python3
"""
Script to delete broken items from Render PostgreSQL database.

This script will:
1. Delete messages related to broken items
2. Delete conversations related to broken items
3. Delete the broken items themselves

Usage:
    python scripts/delete_broken_items.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Broken item IDs
BROKEN_ITEM_IDS = [
    '86618ca5-ec4d-46b1-a299-04abfeedb8b9',  # Gig Mac
    '4818f43a-153d-4b69-b25a-475d23ad1c26'   # COmp
]


def get_database_url():
    """Get database URL from environment variable."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ Error: DATABASE_URL environment variable not set")
        print("\nPlease set DATABASE_URL to your Render database connection string:")
        print("export DATABASE_URL='postgresql://user:password@host:port/database'")
        sys.exit(1)
    
    # Fix postgres:// to postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    return database_url


def delete_broken_items():
    """Delete broken items and related data."""
    database_url = get_database_url()
    
    print("🔗 Connecting to database...")
    engine = create_engine(database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        print("\n📋 Starting deletion process...")
        
        # Step 1: Delete messages
        print("\n1️⃣ Deleting messages related to broken items...")
        result = db.execute(text("""
            DELETE FROM messages
            WHERE conversation_id IN (
                SELECT c.id 
                FROM conversations c
                WHERE c.item_id IN :item_ids
            )
        """), {"item_ids": tuple(BROKEN_ITEM_IDS)})
        messages_deleted = result.rowcount
        db.commit()
        print(f"   ✅ Deleted {messages_deleted} messages")
        
        # Step 2: Delete conversations
        print("\n2️⃣ Deleting conversations related to broken items...")
        result = db.execute(text("""
            DELETE FROM conversations
            WHERE item_id IN :item_ids
        """), {"item_ids": tuple(BROKEN_ITEM_IDS)})
        conversations_deleted = result.rowcount
        db.commit()
        print(f"   ✅ Deleted {conversations_deleted} conversations")
        
        # Step 3: Delete items
        print("\n3️⃣ Deleting broken items...")
        result = db.execute(text("""
            DELETE FROM items
            WHERE id IN :item_ids
        """), {"item_ids": tuple(BROKEN_ITEM_IDS)})
        items_deleted = result.rowcount
        db.commit()
        print(f"   ✅ Deleted {items_deleted} items")
        
        # Step 4: Verify
        print("\n4️⃣ Verifying deletion...")
        result = db.execute(text("""
            SELECT 
                id,
                title,
                price,
                images,
                status
            FROM items
            ORDER BY created_date DESC
        """))
        remaining_items = result.fetchall()
        
        print(f"\n✅ Deletion complete!")
        print(f"\n📊 Remaining items: {len(remaining_items)}")
        for item in remaining_items:
            print(f"   - {item.title} (${item.price})")
        
        if len(remaining_items) == 1 and remaining_items[0].title == "TV":
            print("\n🎉 Success! Only the TV item with Cloudinary image remains.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    print("🗑️  Delete Broken Items Script")
    print("=" * 50)
    
    # Confirm before deletion
    print("\n⚠️  This will delete:")
    print("   - 2 items: 'Gig Mac' and 'COmp'")
    print("   - All conversations related to these items")
    print("   - All messages in those conversations")
    print("\nThis action cannot be undone!")
    
    response = input("\nDo you want to continue? (yes/no): ").strip().lower()
    if response != "yes":
        print("❌ Deletion cancelled.")
        sys.exit(0)
    
    delete_broken_items()

