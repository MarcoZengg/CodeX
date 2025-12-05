# Endpoint Migration Status

Tracking migration of all endpoints to use new dependencies.

## Migration Patterns

### Pattern 1: Authentication
**BEFORE:**
```python
token_data: dict = Depends(verify_token)
firebase_uid = token_data["uid"]
user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
if not user:
    raise HTTPException(404, "User not found")
```

**AFTER:**
```python
user: UserDB = Depends(get_current_user)
```

### Pattern 2: "Not Found" Checks
**BEFORE:**
```python
item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
if not item:
    raise HTTPException(404, "Item not found")
```

**AFTER:**
```python
item = get_or_404(ItemDB, item_id, db, "Item not found")
```

## Endpoint Status

### Item Endpoints ✅
- [x] POST /api/items - create_item
- [x] GET /api/items/{item_id} - get_item
- [x] PUT /api/items/{item_id} - update_item
- [x] PUT /api/items/{item_id}/status - update_item_status
- [x] DELETE /api/items/{item_id} - delete_item

### User Endpoints ⏳
- [ ] POST /api/users/create-profile - create_profile (needs token_data for check)
- [x] GET /api/users/me - get_current_user_endpoint
- [x] PUT /api/users/me - update_current_user
- [x] POST /api/users/complete-profile - complete_profile
- [x] DELETE /api/users/me - delete_current_user
- [x] GET /api/users/{user_id} - get_user_profile

### Conversation Endpoints ⏳
- [x] POST /api/conversations - create_conversation
- [x] GET /api/conversations - get_conversations
- [ ] GET /api/conversations/{conversation_id} - get_conversation
- [ ] PUT /api/conversations/{conversation_id} - update_conversation
- [ ] DELETE /api/conversations/{conversation_id} - delete_conversation

### Message Endpoints ⏳
- [ ] POST /api/messages - create_message
- [ ] GET /api/messages - get_messages
- [ ] GET /api/messages/{message_id} - get_message
- [ ] PUT /api/messages/{message_id} - update_message
- [ ] PUT /api/conversations/{conversation_id}/mark-read - mark_conversation_read
- [ ] DELETE /api/messages/{message_id} - delete_message

### Buy Request Endpoints ⏳
- [ ] POST /api/buy-requests - create_buy_request
- [ ] PATCH /api/buy-requests/{request_id}/accept - accept_buy_request
- [ ] PATCH /api/buy-requests/{request_id}/reject - reject_buy_request
- [ ] PATCH /api/buy-requests/{request_id}/cancel - cancel_buy_request
- [ ] GET /api/buy-requests/by-conversation/{conversation_id} - get_buy_requests_by_conversation
- [ ] GET /api/buy-requests/{request_id} - get_buy_request

### Transaction Endpoints ⏳
- [ ] GET /api/transactions/{transaction_id} - get_transaction
- [ ] POST /api/transactions/create-with-appointment - create_transaction_with_appointment
- [ ] GET /api/transactions/by-conversation/{conversation_id}/all - get_all_transactions_by_conversation
- [ ] PATCH /api/transactions/{transaction_id} - update_transaction
- [ ] PATCH /api/transactions/{transaction_id}/cancel - cancel_transaction

### Review Endpoints ⏳
- [ ] POST /api/reviews - create_review
- [ ] GET /api/reviews - get_reviews
- [ ] GET /api/reviews/{review_id} - get_review
- [ ] PUT /api/reviews/{review_id}/response - add_review_response
- [ ] DELETE /api/reviews/{review_id} - delete_review

### Special Endpoints
- [ ] POST /api/upload-image - upload_image (needs special handling)
- [ ] WebSocket /ws/{user_id} - websocket_endpoint (needs special handling)

