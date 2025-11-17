export interface User {
  id?: string;
  display_name?: string;
  email?: string;
  profile_image_url?: string;
  rating?: number;
  total_sales?: number;
  is_verified?: boolean;
  bio?: string;
  graduation_year?: string;
  major?: string;
}

// Entity class for User operations
export class UserEntity {
  static async me(): Promise<User> {
    // Mock implementation for development
    const mockUser: User = {
      id: "current_user",
      display_name: "BU Student",
      email: "student@bu.edu",
      profile_image_url: "",
      rating: 4.8,
      total_sales: 12,
      is_verified: true,
      bio: "Current BU student",
      graduation_year: "2026",
      major: "Computer Science",
    };
    
    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockUser), 100);
    });
  }
}

