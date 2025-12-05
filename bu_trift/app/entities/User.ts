// Import API URL from config
import { API_URL } from "../config";

// Import Firebase
import { auth } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseToken, fetchWithAuth, getAuthHeaders } from "../utils/auth";

export interface User {
  id?: string;
  display_name?: string;
  email?: string;
  profile_image_url?: string;
  rating?: number;
  total_sales?: number;
  is_verified?: boolean;
  bio?: string;
  created_date?: string;
}

export interface UserRegister {
  email: string;
  password: string;
  display_name: string;
  bio?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

/** Body sent to backend when creating profile */
export interface UserProfileCreate {
  email: string;
  display_name: string;
  bio?: string;
}


/* USER ENTITY (Firebase + Backend) */
export class UserEntity {
  /**
   * REGISTER:
   *  1) Firebase createUserWithEmailAndPassword
   *  2) Get Firebase ID token
   *  3) Call backend /api/users/create-profile
   */
  static async register(userData: UserRegister): Promise<User> {
    // 1 — Firebase signup
    const cred = await createUserWithEmailAndPassword(
      auth,
      userData.email.trim(),
      userData.password
    );

    // 2 — Get Firebase ID token
    const idToken = await cred.user.getIdToken(true); // Force refresh on login
    localStorage.setItem("firebaseToken", idToken);

    // 3 — Create profile in backend
    const profileBody: UserProfileCreate = {
      email: userData.email.trim().toLowerCase(),
      display_name: userData.display_name.trim(),
      bio: userData.bio?.trim(),
    };

    const response = await fetch(`${API_URL}/api/users/create-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(profileBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to create profile");
    }

    const user: User = await response.json();
    localStorage.setItem("currentUser", JSON.stringify(user));

    return user;

  }

  /** Update current user's profile (requires Firebase token) */
  static async update(payload: Partial<User>): Promise<User> {
    const token = await getFirebaseToken(false);
    if (!token) throw new Error("Not authenticated");

    const body: any = {};
    if (payload.display_name !== undefined) body.display_name = payload.display_name;
    if (payload.bio !== undefined) body.bio = payload.bio;
    if (payload.profile_image_url !== undefined) body.profile_image_url = payload.profile_image_url;

    const response = await fetchWithAuth(`${API_URL}/api/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      throw new Error(e.detail || "Failed to update profile");
    }

    const user: User = await response.json();
    localStorage.setItem("currentUser", JSON.stringify(user));
    return user;
  }

  /**
   * LOGIN:
   * 1) Firebase signInWithEmailAndPassword
   * 2) Get Firebase ID token
   * 3) Call backend /api/users/me
   */
  static async login(credentials: UserLogin): Promise<User> {
    // 1 — Firebase sign in
    const cred = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // 2 — ID token
    const idToken = await cred.user.getIdToken(true); // Force refresh on login
    localStorage.setItem("firebaseToken", idToken);

    // 3 — load profile from backend
    const response = await fetch(`${API_URL}/api/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to load profile");
    }

    const user: User = await response.json();
    localStorage.setItem("currentUser", JSON.stringify(user));

    return user;
  }

  /** Load current user from backend (requires token) */
  static async me(): Promise<User | null> {
    const token = await getFirebaseToken(false);
    if (!token) return null;

    const response = await fetchWithAuth(`${API_URL}/api/users/me`, {
      method: "GET",
    });

    if (!response.ok) return null;
    return response.json();
  }

  /**
   * Get user by ID (public profile)
   */
  static async getById(userId: string): Promise<User> {
    const headers = await getAuthHeaders(false); // no JSON needed
    const response = await fetchWithAuth(`${API_URL}/api/users/${userId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      throw new Error(e.detail || "Failed to get user");
    }

    return response.json();
  }

  /** Logout */
  static async logout(): Promise<void> {
    await signOut(auth);
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("currentUser");
  }

  /**
   * Delete current user's account.
   * Deletes from both Firebase and backend database.
   */
  static async deleteAccount(): Promise<void> {
    const token = await getFirebaseToken(false);
    if (!token) throw new Error("Not authenticated");

    const response = await fetchWithAuth(`${API_URL}/api/users/me`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to delete account");
    }

    // Sign out after successful deletion
    await signOut(auth);
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("currentUser");
  }
}

