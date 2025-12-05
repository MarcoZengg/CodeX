/**
 * Firebase Authentication Token Management
 * 
 * This module handles automatic token refresh and provides utilities
 * for managing Firebase authentication tokens.
 * 
 * Firebase tokens expire after ~1 hour. This module automatically:
 * - Refreshes tokens before they expire
 * - Updates localStorage with fresh tokens
 * - Handles token refresh on API calls that fail with 401
 */

import { auth } from "@/config/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

// Token refresh interval: 50 minutes (tokens expire after 60 minutes)
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes in milliseconds

let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
let currentUser: User | null = null;

/**
 * Get the current Firebase token, refreshing if necessary
 */
export async function getFirebaseToken(forceRefresh: boolean = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    // Try to get from localStorage as fallback
    return localStorage.getItem("firebaseToken");
  }

  try {
    // Get fresh token (force refresh if requested)
    const token = await user.getIdToken(forceRefresh);
    
    // Update localStorage with fresh token
    localStorage.setItem("firebaseToken", token);
    
    return token;
  } catch (error) {
    console.error("Error getting Firebase token:", error);
    return null;
  }
}

/**
 * Refresh the Firebase token and update localStorage
 */
export async function refreshFirebaseToken(): Promise<string | null> {
  console.log("🔄 Refreshing Firebase token...");
  return await getFirebaseToken(true);
}

/**
 * Set up automatic token refresh
 */
export function setupTokenRefresh(): () => void {
  // Clear any existing timer
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
  }

  // Listen for auth state changes
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
      // User is signed in - set up token refresh
      console.log("✅ User authenticated, setting up token refresh");
      
      // Initial token fetch
      getFirebaseToken(false).catch((error) => {
        console.error("Error getting initial token:", error);
      });

      // Set up automatic refresh every 50 minutes
      tokenRefreshTimer = setInterval(async () => {
        if (auth.currentUser) {
          await refreshFirebaseToken();
        }
      }, TOKEN_REFRESH_INTERVAL);
    } else {
      // User is signed out - clear token and timer
      console.log("👋 User signed out, clearing token refresh");
      localStorage.removeItem("firebaseToken");
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
      }
    }
  });

  // Return cleanup function
  return () => {
    unsubscribe();
    if (tokenRefreshTimer) {
      clearInterval(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }
  };
}

/**
 * Fetch with automatic token refresh on 401 errors
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current token
  let token = await getFirebaseToken(false);
  
  // Prepare headers
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Make initial request
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401, try refreshing the token and retry once
  if (response.status === 401 && auth.currentUser) {
    console.log("🔄 Token expired, refreshing and retrying...");
    
    // Refresh token
    token = await refreshFirebaseToken();
    
    if (token) {
      // Update authorization header with fresh token
      headers.set("Authorization", `Bearer ${token}`);
      
      // Retry the request
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  return response;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Get current user from Firebase Auth
 */
export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

/**
 * Get authentication headers for API requests
 * Shared utility function used across all entity files
 * 
 * @param includeJSON - Whether to include Content-Type: application/json header (default: true)
 * @param requireAuth - Whether to throw error if token is missing (default: false)
 * @returns Headers object with Authorization and optional Content-Type
 */
export async function getAuthHeaders(
  includeJSON: boolean = true,
  requireAuth: boolean = false
): Promise<HeadersInit> {
  const token = await getFirebaseToken(false);
  
  if (requireAuth && !token) {
    throw new Error("You must be logged in.");
  }
  
  const headers: HeadersInit = {};
  
  if (includeJSON) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

