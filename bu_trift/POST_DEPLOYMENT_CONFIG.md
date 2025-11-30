# Post-Deployment Configuration Guide

Complete checklist and instructions for configuring your app after deploying to Render.

---

## ✅ Step 7.1: Update CORS in Backend (Already Done!)

**Status**: ✅ **Already configured!**

The backend CORS has been updated to:
- ✅ Accept `FRONTEND_URL` from environment variable
- ✅ Include common Render frontend URLs
- ✅ Support local development URLs

**What was changed:**
- `backend/main.py` now dynamically reads frontend URL from environment
- Includes fallback URLs for common Render patterns

**Next step**: Set `FRONTEND_URL` environment variable in Render (see below)

---

## ✅ Step 7.2: Firebase Web Config

**Status**: ✅ **Already configured correctly!**

Your Firebase config (`app/config/firebase.ts`) is already production-ready:
- ✅ Prevents re-initialization (handles hot reload)
- ✅ Works in both development and production
- ✅ No changes needed

**Note**: Make sure your Firebase project allows your Render domain:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Authentication → Settings → Authorized domains
3. Add your Render frontend domain if needed:
   - `butrift-frontend.onrender.com`
   - `localhost` (already there)

---

## ⚙️ Step 7.3: Configure Environment Variables in Render

After both services are deployed, update environment variables:

### Backend Service Environment Variables

Go to your **backend service** → **Environment** tab and set:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Internal Database URL | From PostgreSQL service |
| `FIREBASE_SERVICE_ACCOUNT` | Full Firebase JSON | Your service account JSON |
| `FRONTEND_URL` | `https://butrift-frontend.onrender.com` | Your actual frontend URL |
| `API_BASE_URL` | `https://butrift-backend.onrender.com` | Your actual backend URL |

**How to set `FRONTEND_URL`:**
1. Go to backend service on Render
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"** or edit existing
4. Key: `FRONTEND_URL`
5. Value: Your frontend URL (e.g., `https://butrift-frontend.onrender.com`)
6. Click **"Save Changes"** (service will redeploy)

**How to set `API_BASE_URL`:**
1. Same process as above
2. Key: `API_BASE_URL`
3. Value: Your backend URL (e.g., `https://butrift-backend.onrender.com`)

### Frontend Service Environment Variables

Go to your **frontend service** → **Environment** tab and verify:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://butrift-backend.onrender.com` | Your backend URL |
| `NODE_VERSION` | `20` | Optional, but recommended |

---

## 🧪 Step 7.4: Test Everything

### Quick Test Checklist

#### 1. Backend Health Check
- [ ] Visit: `https://butrift-backend.onrender.com/docs`
- [ ] Should see FastAPI Swagger documentation
- [ ] Status: ✅ Backend is running

#### 2. Frontend Access
- [ ] Visit: `https://butrift-frontend.onrender.com`
- [ ] Should see your app homepage
- [ ] Status: ✅ Frontend is running

#### 3. API Connection
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Try loading the homepage
- [ ] Check that API calls go to your backend URL
- [ ] Status: ✅ Frontend can reach backend

#### 4. Authentication
- [ ] Try registering a new user
- [ ] Try logging in
- [ ] Check browser console for errors
- [ ] Status: ✅ Authentication works

#### 5. Database Connection
- [ ] After logging in, check if user profile loads
- [ ] Try creating an item
- [ ] Check backend logs for database errors
- [ ] Status: ✅ Database is working

#### 6. CORS Test
- [ ] Make sure frontend can call backend APIs
- [ ] Check browser console for CORS errors
- [ ] Status: ✅ CORS is configured correctly

---

## 🔍 Detailed Testing Steps

### Test 1: Backend API Documentation

```
URL: https://butrift-backend.onrender.com/docs
Expected: FastAPI Swagger UI interface
Status: [ ] Working
```

**What to check:**
- ✅ Page loads without errors
- ✅ Can see all API endpoints
- ✅ Can try API endpoints (if authenticated)

---

### Test 2: Frontend Loading

```
URL: https://butrift-frontend.onrender.com
Expected: Your app homepage
Status: [ ] Working
```

**What to check:**
- ✅ Page loads
- ✅ No console errors
- ✅ Images/assets load correctly
- ✅ Navigation works

---

### Test 3: API Integration

**Open Browser DevTools (F12) → Network Tab**

1. **Load homepage:**
   - Should see API calls to your backend
   - Check request URL matches your backend

2. **Check API calls:**
   - Look for requests to `/api/items`, `/api/users`, etc.
   - Verify they go to: `https://butrift-backend.onrender.com`

3. **Check responses:**
   - Should get successful responses (200 status)
   - Or authentication errors if not logged in (which is expected)

**Status:** [ ] API calls working

---

### Test 4: User Registration

1. Go to registration page
2. Fill out form
3. Submit
4. **Expected:** 
   - ✅ User created successfully
   - ✅ Redirected to profile/login
   - ✅ No errors in console

**Status:** [ ] Registration working

---

### Test 5: User Login

1. Go to login page
2. Enter credentials
3. Submit
4. **Expected:**
   - ✅ Login successful
   - ✅ Firebase token stored
   - ✅ Redirected to dashboard/profile
   - ✅ Can see user-specific content

**Status:** [ ] Login working

---

### Test 6: Create Item

1. Log in
2. Go to "Sell" page
3. Fill out item form
4. Upload image (if applicable)
5. Submit
6. **Expected:**
   - ✅ Item created successfully
   - ✅ Appears in item list
   - ✅ No errors

**Status:** [ ] Item creation working

---

### Test 7: Messaging (If Implemented)

1. Navigate to messages
2. Try creating a conversation
3. Send a message
4. **Expected:**
   - ✅ Messages load
   - ✅ Can send messages
   - ⚠️ WebSocket might not work on free tier

**Status:** [ ] Messaging working (or known limitations)

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Errors

**Symptom**: Browser console shows CORS errors

**Solution**:
1. Check `FRONTEND_URL` is set in backend environment variables
2. Verify it matches your actual frontend URL exactly
3. Check backend logs for CORS middleware
4. Redeploy backend after setting environment variable

---

### Issue 2: API Calls Going to Localhost

**Symptom**: Frontend still calls `http://localhost:8000`

**Solution**:
1. Check `VITE_API_URL` is set in frontend environment variables
2. Verify it's your backend URL: `https://butrift-backend.onrender.com`
3. Rebuild frontend (environment variables are baked in at build time)
4. Redeploy frontend

---

### Issue 3: 404 Errors on API Calls

**Symptom**: API calls return 404

**Solution**:
1. Verify backend URL is correct
2. Check backend is running (visit `/docs` endpoint)
3. Verify endpoint paths match (check your API routes)

---

### Issue 4: Database Connection Errors

**Symptom**: Backend logs show database errors

**Solution**:
1. Verify `DATABASE_URL` is set correctly
2. Check it's the **Internal Database URL** (not External)
3. Verify PostgreSQL service is running
4. Check database connection string format

---

### Issue 5: Firebase Authentication Errors

**Symptom**: Can't log in or register

**Solution**:
1. Check `FIREBASE_SERVICE_ACCOUNT` is valid JSON
2. Verify Firebase project settings
3. Check authorized domains in Firebase Console
4. Verify Firebase web config matches your project

---

## ✅ Post-Deployment Checklist

### Environment Variables

**Backend:**
- [ ] `DATABASE_URL` - Set to Internal Database URL
- [ ] `FIREBASE_SERVICE_ACCOUNT` - Set to Firebase JSON
- [ ] `FRONTEND_URL` - Set to frontend URL
- [ ] `API_BASE_URL` - Set to backend URL (optional)

**Frontend:**
- [ ] `VITE_API_URL` - Set to backend URL
- [ ] `NODE_VERSION` - Set to 20 (optional)

### Testing

- [ ] Backend accessible at `/docs`
- [ ] Frontend loads correctly
- [ ] API calls work
- [ ] Authentication works
- [ ] Database operations work
- [ ] No CORS errors
- [ ] No console errors

### Firebase

- [ ] Authorized domains include Render frontend URL
- [ ] Firebase config correct in code
- [ ] Service account JSON valid

### Documentation

- [ ] Note down your service URLs
- [ ] Save environment variable values (securely)
- [ ] Document any known limitations (WebSocket, file storage)

---

## 📝 Service URLs Reference

Save these for reference:

**Backend:**
- URL: `https://butrift-backend.onrender.com`
- Docs: `https://butrift-backend.onrender.com/docs`
- Health: `https://butrift-backend.onrender.com/`

**Frontend:**
- URL: `https://butrift-frontend.onrender.com`

**Database:**
- Service: `butrift-db` (internal, not directly accessible)

---

## 🎯 Next Steps After Configuration

1. **Test thoroughly** - Use the testing checklist above
2. **Monitor logs** - Check both services for errors
3. **Update README** - Document your deployed URLs
4. **Share with team** - Provide access to deployed app
5. **Set up monitoring** - Consider adding error tracking

---

## ⚠️ Important Notes

### File Uploads
- Files stored locally will be **lost on server restart**
- Consider migrating to cloud storage (Firebase Storage, S3, etc.)

### WebSocket
- Free tier may have limitations
- Test messaging functionality
- Consider polling fallback for free tier

### Sleep Mode
- Free tier services sleep after 15 min inactivity
- First request after sleep takes ~30 seconds
- Upgrade to paid plan for always-on service

---

**Everything configured? Test thoroughly and enjoy your deployed app! 🚀**

