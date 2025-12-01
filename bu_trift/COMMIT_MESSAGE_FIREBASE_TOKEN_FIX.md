# Commit Message: Firebase Token Expiration Fix

```
fix: Implement automatic Firebase token refresh to prevent 401 errors

Firebase authentication tokens expire after 1 hour, causing all
authenticated API calls to fail with 401 Unauthorized errors after
the expiration period. This fix implements automatic token refresh
and intelligent retry mechanisms to ensure seamless user experience.

Problem:
- Firebase tokens expire after 60 minutes
- Frontend had no token refresh mechanism
- After expiration, all authenticated features failed silently
- Users experienced broken uploads, messaging, and profile updates

Solution:
- Created centralized token refresh utility (app/utils/auth.ts)
- Automatic token refresh every 50 minutes (before expiration)
- Automatic retry on 401 errors with refreshed token
- Updated all API call entities to use new auth utilities

Key Changes:
- NEW: app/utils/auth.ts - Token refresh utility with auto-refresh
- UPDATED: app/components/Layout.tsx - Initialize token refresh on load
- UPDATED: app/entities/User.ts - Use fetchWithAuth() and getFirebaseToken()
- UPDATED: app/entities/Conversation.ts - Use new auth utilities
- UPDATED: app/entities/Message.ts - All API calls use fetchWithAuth()
- UPDATED: app/routes/sell.tsx - Image upload handles token refresh
- NEW: docs/FIREBASE_TOKEN_REFRESH_FIX.md - Implementation guide
- NEW: docs/FIREBASE_TOKEN_EXPIRATION_FIX_CONCLUSION.md - Full documentation

Benefits:
- ✅ No more token expiration errors
- ✅ Seamless user experience (no interruptions)
- ✅ Automatic error recovery
- ✅ Zero backend memory impact (runs client-side)

Impact:
- Resolves backend log errors: "Firebase token expired"
- Fixes 401 Unauthorized errors after 1 hour of usage
- Enables indefinite user sessions
- Improves overall application reliability

Related:
- Backend logs showed repeated "Firebase token expired" errors
- Users reported features stopping after ~1 hour of usage
```

---

## Alternative: Shorter Version

If you prefer a shorter commit message:

```
fix: Add automatic Firebase token refresh to prevent 401 errors

Firebase tokens expire after 1 hour, causing authenticated API calls
to fail. This implements automatic token refresh (every 50 minutes)
and retry-on-401 to ensure seamless user experience.

- Created app/utils/auth.ts with token refresh utilities
- Updated all entities to use fetchWithAuth() for automatic retry
- Added automatic refresh timer in Layout component
- Zero backend impact (all client-side)

Fixes: "Firebase token expired" errors in backend logs
Fixes: 401 Unauthorized errors after 1 hour of usage
```

---

## Alternative: Conventional Commits Style

```
fix(auth): implement automatic Firebase token refresh

Firebase authentication tokens expire after 60 minutes, causing all
authenticated API endpoints to return 401 errors. This commit adds:

- Automatic token refresh every 50 minutes (proactive)
- Automatic retry with fresh token on 401 errors (reactive)
- Centralized auth utilities in app/utils/auth.ts
- Updated all API call entities to use new utilities

BREAKING CHANGE: None
IMPACT: Resolves token expiration issues, enables indefinite sessions

Closes: Token expiration causing 401 errors after 1 hour
```

---

## Recommended: Use the First (Detailed) Version

The first commit message is recommended because:
- ✅ Provides full context for future developers
- ✅ Explains the problem clearly
- ✅ Lists all changes
- ✅ Documents benefits and impact
- ✅ Easy to search in git history

