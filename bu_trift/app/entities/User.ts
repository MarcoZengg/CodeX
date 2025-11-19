// Import API URL from config
import { API_URL } from "../config";

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

// Entity class for User operations (Simple - no authentication yet)
export class UserEntity {
  /**
   * Register a new user
   * Simple registration - no JWT tokens or authentication
   */
  static async register(userData: UserRegister): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Failed to register: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const user: User = await response.json();
      return user;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  /**
   * Login user - verify email and password
   */
  static async login(credentials: UserLogin): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Failed to login: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const user: User = await response.json();
      return user;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  /**
   * Get user by ID (public profile)
   */
  static async getById(userId: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Failed to get user: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const user: User = await response.json();
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  /**
   * Get current user (mock for now - will add authentication later)
   */
  static async me(): Promise<User> {
    // Mock implementation for development
    // Authentication will be added later
    const mockUser: User = {
      id: "current_user",
      display_name: "BU Student",
      email: "student@bu.edu",
      profile_image_url: "",
      rating: 4.8,
      total_sales: 12,
      is_verified: true,
      bio: "Current BU student",
    };
    
    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockUser), 100);
    });
  }
}

