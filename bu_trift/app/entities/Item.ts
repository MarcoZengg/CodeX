export type ItemCategory =
  | "textbooks"
  | "electronics"
  | "clothing"
  | "furniture"
  | "school_supplies"
  | "sports_equipment"
  | "home_decor"
  | "kitchen_items"
  | "bikes_transport"
  | "other";

export type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor";

export type ItemStatus = "available" | "sold" | "reserved";

export interface Item {
  id?: string;
  title: string;
  description: string;
  price: number;
  category: ItemCategory;
  condition: ItemCondition;
  images?: string[];
  seller_id: string;
  status?: ItemStatus;
  location?: string;
  is_negotiable?: boolean;
  created_date?: string;
}

// Mock data for development
const mockItems: Item[] = [
  {
    id: "1",
    title: "Calculus Textbook - Stewart 8th Edition",
    description: "Great condition, only used for one semester. Includes all chapters and practice problems.",
    price: 45,
    category: "textbooks",
    condition: "like_new",
    images: ["https://via.placeholder.com/400x400?text=Calculus+Book"],
    seller_id: "student1",
    status: "available",
    location: "Warren Towers",
    is_negotiable: true,
    created_date: new Date().toISOString(),
  },
  {
    id: "2",
    title: "MacBook Air 13\" M1",
    description: "Lightly used MacBook Air, works perfectly. Selling because I upgraded.",
    price: 750,
    category: "electronics",
    condition: "good",
    images: ["https://www.bhphotovideo.com/cdn-cgi/image/fit=scale-down,width=500,quality=95/https://www.bhphotovideo.com/images/images500x500/apple_mba13m311mn_13_macbook_air_m3_1709563668_1815056.jpg"],
    seller_id: "student2",
    status: "available",
    location: "West Campus",
    is_negotiable: false,
    created_date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    title: "Winter Jacket - Patagonia",
    description: "Warm and cozy Patagonia jacket. Perfect for Boston winters. Size M.",
    price: 80,
    category: "clothing",
    condition: "good",
    images: ["https://via.placeholder.com/400x400?text=Jacket"],
    seller_id: "student1",
    status: "available",
    location: "Bay State Road",
    is_negotiable: true,
    created_date: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    title: "Desk Chair - Ergonomic",
    description: "Comfortable desk chair perfect for studying. Good back support.",
    price: 60,
    category: "furniture",
    condition: "good",
    images: ["https://via.placeholder.com/400x400?text=Chair"],
    seller_id: "student3",
    status: "available",
    location: "Allston",
    is_negotiable: true,
    created_date: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "5",
    title: "Lab Notebook Set",
    description: "Set of 3 lab notebooks, barely used. Perfect for chemistry or biology classes.",
    price: 12,
    category: "school_supplies",
    condition: "like_new",
    images: ["https://via.placeholder.com/400x400?text=Notebooks"],
    seller_id: "student2",
    status: "available",
    location: "East Campus",
    is_negotiable: false,
    created_date: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: "6",
    title: "Yoga Mat - Lululemon",
    description: "High-quality yoga mat, used a few times. In excellent condition.",
    price: 35,
    category: "sports_equipment",
    condition: "like_new",
    images: [""],
    seller_id: "student1",
    status: "available",
    location: "Central Campus",
    is_negotiable: true,
    created_date: new Date(Date.now() - 432000000).toISOString(),
  },
];

// Entity class for Item operations
export class ItemEntity {
  static async filter(
    filters: Partial<Item>,
    sortBy?: string,
    limit?: number
  ): Promise<Item[]> {
    // Mock implementation for development
    let filtered = [...mockItems];

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }
    if (filters.category) {
      filtered = filtered.filter((item) => item.category === filters.category);
    }
    if (filters.condition) {
      filtered = filtered.filter((item) => item.condition === filters.condition);
    }
    if (filters.seller_id) {
      filtered = filtered.filter((item) => item.seller_id === filters.seller_id);
    }

    // Apply sorting
    if (sortBy) {
      if (sortBy === "-created_date" || sortBy === "created_date") {
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_date || 0).getTime();
          const dateB = new Date(b.created_date || 0).getTime();
          return sortBy.startsWith("-") ? dateB - dateA : dateA - dateB;
        });
      }
      if (sortBy === "-price" || sortBy === "price") {
        filtered.sort((a, b) => {
          return sortBy.startsWith("-") ? b.price - a.price : a.price - b.price;
        });
      }
    }

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(filtered), 100);
    });
  }

  static async get(id: string): Promise<Item> {
    // Mock implementation for development
    const found = mockItems.find((item) => item.id === id);
    if (found) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(found), 100);
      });
    }
    // Return first item as fallback
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockItems[0]), 100);
    });
  }

  static async create(data: Partial<Item>): Promise<Item> {
    // TODO: Implement API call
    throw new Error("Not implemented");
  }
}

