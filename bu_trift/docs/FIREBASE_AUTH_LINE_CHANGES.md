# Firebase Authentication Integration - Line-by-Line Changes

This document identifies the specific lines that need to be changed in the codebase to implement Firebase Authentication, as outlined in `FIREBASE_AUTH_INTEGRATION.md`.

---

## **Frontend Changes**

### **1. New File: `app/config/firebase.ts`**
- **Action**: Create this new file
- **Reference**: Lines 119-133 in `FIREBASE_AUTH_INTEGRATION.md`
- **Content**: Firebase configuration and initialization

### **2. `app/entities/User.ts`**

#### **Interface Changes:**
- **Line 16-21**: `UserRegister` interface
  - **Change**: Remove `password: string` field (Firebase handles password)
  
- **Line 23-26**: `UserLogin` interface
  - **Change**: Remove `password: string` field (Firebase handles password)

#### **Method Changes:**
- **Line 34-56**: `register()` method
  - **Change**: Replace entire method with Firebase `createUserWithEmailAndPassword` flow
  - **New Flow**: 
    1. Call Firebase to create user
    2. Get ID token from Firebase
    3. Call `/api/users/create-profile` endpoint with token in Authorization header
    4. Store token in localStorage

- **Line 61-83**: `login()` method
  - **Change**: Replace entire method with Firebase `signInWithEmailAndPassword` flow
  - **New Flow**:
    1. Call Firebase to authenticate
    2. Get ID token from Firebase
    3. Store token in localStorage (instead of user object)

- **Line 88-109**: `getById()` method
  - **Line 90-95**: Add Authorization header with Firebase token to fetch request

- **Line 114-132**: `me()` method
  - **Change**: Update to use Firebase token authentication instead of mock data
  - **New Flow**: Call backend with Firebase token to get current user

### **3. `app/routes/register.tsx`**

#### **State Changes:**
- **Line 27-32**: `formData` state initialization
  - **Change**: Remove `password: ""` from `UserRegister` state

#### **Validation Changes:**
- **Line 41-45**: Required fields validation
  - **Change**: Remove password from required fields check

- **Line 48-52**: Email validation
  - **Keep**: This validation should remain (still needed for @bu.edu requirement)

- **Line 54-59**: Password length validation
  - **Change**: Remove this entire validation block (Firebase handles password requirements)

#### **Form Submission:**
- **Line 62-67**: `userData` preparation
  - **Change**: Remove `password: formData.password` from the object

- **Line 70**: `User.register()` call
  - **Change**: Replace with Firebase registration flow:
    1. Call `createUserWithEmailAndPassword` from Firebase
    2. Get ID token
    3. Call backend `/api/users/create-profile` with token

- **Line 72-73**: localStorage storage
  - **Change**: Store Firebase token instead of user object
  - **New**: `localStorage.setItem('firebaseToken', idToken)`

#### **UI Changes:**
- **Line 141-159**: Password input field
  - **Change**: Remove this entire password input section from the form

### **4. `app/routes/login.tsx`**

#### **State Changes:**
- **Line 26-29**: `formData` state initialization
  - **Change**: Remove `password: ""` from `UserLogin` state

#### **Validation Changes:**
- **Line 38-42**: Required fields validation
  - **Change**: Remove password from validation check

#### **Form Submission:**
- **Line 45-48**: `credentials` preparation
  - **Change**: Remove password field from credentials object

- **Line 51**: `User.login()` call
  - **Change**: Replace with Firebase login flow:
    1. Call `signInWithEmailAndPassword` from Firebase
    2. Get ID token
    3. Store token in localStorage

- **Line 53-54**: localStorage storage
  - **Change**: Store Firebase token instead of user object
  - **New**: `localStorage.setItem('firebaseToken', idToken)`

#### **UI Changes:**
- **Line 122-140**: Password input field
  - **Change**: Remove this entire password input section from the form

### **5. `app/entities/Item.ts`**

#### **API Call Updates:**
- **Line 143**: `filter()` method fetch call
  - **Change**: Add Authorization header with Firebase token
  - **New**: `headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }`

- **Line 204**: `get()` method fetch call
  - **Change**: Add Authorization header with Firebase token

- **Line 258-264**: `create()` method fetch call
  - **Change**: Add Authorization header with Firebase token to headers object

### **6. Other API Calls**

#### **`app/routes/sell.tsx`:**
- **Line 115**: Image upload fetch call
  - **Change**: Add Authorization header with Firebase token

#### **Any other files making authenticated API calls:**
- **Action**: Add Authorization headers to all fetch requests that require authentication
- **Format**: `'Authorization': `Bearer ${token}``

---

## **Backend Changes**

### **7. New File: `backend/firebase_config.py`**
- **Action**: Create this new file
- **Reference**: Lines 196-203 in `FIREBASE_AUTH_INTEGRATION.md`
- **Content**: Firebase Admin SDK initialization with service account credentials

### **8. New File: `backend/auth.py`**
- **Action**: Create this new file
- **Reference**: Lines 206-225 in `FIREBASE_AUTH_INTEGRATION.md`
- **Content**: Token verification middleware using `verify_token()` function

### **9. `backend/models/user.py`**

#### **Database Model Changes:**
- **Line 11**: `password_hash` column
  - **Change**: Remove this column entirely, OR mark as nullable for migration period
  - **Note**: Firebase handles password storage, so this is no longer needed

- **Line 9** (after email): Add new column
  - **Add**: `firebase_uid = Column(String, unique=True, nullable=False)` 
  - **Purpose**: Link Firebase user ID to database user record

### **10. `backend/main.py`**

#### **Imports:**
- **Line 12**: `import bcrypt`
  - **Change**: Remove this import (no longer needed)

#### **Function Removals:**
- **Line 17-36**: Password hashing functions
  - **Line 20-28**: `get_password_hash()` function
    - **Action**: Remove entire function
  - **Line 30-36**: `verify_password()` function
    - **Action**: Remove entire function

#### **Pydantic Model Changes:**
- **Line 95-99**: `UserRegister` model
  - **Change**: Remove `password: str` field

- **Line 101-103**: `UserLogin` model
  - **Change**: Remove `password: str` field (or remove model entirely if not used)

#### **Endpoint Modifications:**

##### **User Registration Endpoint:**
- **Line 303-346**: `/api/users/register` endpoint
  - **Line 303**: Change endpoint path to `/api/users/create-profile`
  - **Line 304**: Add `token_data: dict = Depends(verify_token)` parameter
  - **Line 306-311**: Keep email validation
  - **Line 313-319**: Keep duplicate email check
  - **Line 321-326**: Remove password length validation
  - **Line 328-339**: User creation
    - **Line 333**: Remove `password_hash` assignment
    - **Add**: `firebase_uid = token_data['uid']` to get Firebase UID from token
    - **Add**: `firebase_uid=firebase_uid` to UserDB creation

##### **User Login Endpoint:**
- **Line 348-369**: `/api/users/login` endpoint
  - **Action**: Remove entire endpoint OR modify to just return user profile based on token
  - **Alternative**: Keep endpoint but change to token-based authentication

##### **Protected Endpoints - Add Token Verification:**

- **Line 272-296**: `/api/items` POST endpoint (create item)
  - **Line 273**: Add `token_data: dict = Depends(verify_token)` parameter
  - **Line 240-246**: `/api/items` GET endpoint
    - **Note**: May remain public (browsing items), but verify if seller_id filtering needs auth

- **Line 387-415**: `/api/conversations` POST endpoint (create conversation)
  - **Line 388**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 417-425**: `/api/conversations` GET endpoint
  - **Line 418**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 427-433**: `/api/conversations/{conversation_id}` GET endpoint
  - **Line 428**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 435-451**: `/api/conversations/{conversation_id}` PUT endpoint
  - **Line 436**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 453-462**: `/api/conversations/{conversation_id}` DELETE endpoint
  - **Line 454**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 465-495**: `/api/messages` POST endpoint (create message)
  - **Line 466**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 497-504**: `/api/messages` GET endpoint
  - **Line 498**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 506-512**: `/api/messages/{message_id}` GET endpoint
  - **Line 507**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 514-530**: `/api/messages/{message_id}` PUT endpoint
  - **Line 515**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 532-545**: `/api/conversations/{conversation_id}/mark-read` endpoint
  - **Line 533**: Add `token_data: dict = Depends(verify_token)` parameter

- **Line 547-556**: `/api/messages/{message_id}` DELETE endpoint
  - **Line 548**: Add `token_data: dict = Depends(verify_token)` parameter

#### **Helper Function Updates:**
- **Line 168-180**: `user_to_response()` function
  - **Note**: Should remain unchanged (doesn't include password_hash in response)

---

## **Dependencies**

### **Add:**
- **Frontend**: `firebase` package
  - **Command**: `npm install firebase`
  
- **Backend**: `firebase-admin` package
  - **Command**: `pip install firebase-admin`

### **Remove:**
- **Backend**: `bcrypt` package (if no longer used)
  - **Command**: `pip uninstall bcrypt`
  - **Note**: Only remove if not used elsewhere in the codebase

---

## **Summary by File**

### **Files to CREATE:**
1. `app/config/firebase.ts` - Firebase frontend configuration
2. `backend/firebase_config.py` - Firebase Admin SDK initialization
3. `backend/auth.py` - Token verification middleware

### **Files to MODIFY:**

#### **Frontend:**
1. `app/entities/User.ts` - Major refactor of registration/login methods
2. `app/routes/register.tsx` - Remove password handling, add Firebase
3. `app/routes/login.tsx` - Remove password handling, add Firebase
4. `app/entities/Item.ts` - Add Authorization headers to fetch calls
5. `app/routes/sell.tsx` - Add Authorization header to image upload
6. Any other files making authenticated API calls

#### **Backend:**
1. `backend/models/user.py` - Add `firebase_uid`, remove `password_hash`
2. `backend/main.py` - Remove bcrypt, add Firebase verification, update all endpoints

---

## **Migration Notes**

1. **Database Migration**: You'll need to run a migration to:
   - Add `firebase_uid` column to `users` table
   - Remove `password_hash` column (or keep nullable for migration period)

2. **Existing Users**: If you have existing users:
   - Option 1: Delete all existing users and start fresh
   - Option 2: Migrate existing users to Firebase (more complex)

3. **Testing**: After implementation:
   - Test registration flow with Firebase
   - Test login flow with Firebase
   - Test all protected endpoints with token verification
   - Verify token expiration and refresh handling

---

## **Reference**

For detailed implementation guidance, see:
- `FIREBASE_AUTH_INTEGRATION.md` - Complete integration guide with code examples

