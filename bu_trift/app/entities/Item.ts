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
    try {
      // Call FastAPI backend endpoint
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.seller_id) params.append('seller_id', filters.seller_id);
      
      const queryString = params.toString();
      const url = queryString 
        ? `http://localhost:8000/api/items?${queryString}`
        : 'http://localhost:8000/api/items';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`);
      }
      
      let items: Item[] = await response.json();
      
      // Apply client-side sorting (backend can do this later)
      if (sortBy) {
        if (sortBy === "-created_date" || sortBy === "created_date") {
          items.sort((a, b) => {
            const dateA = new Date(a.created_date || 0).getTime();
            const dateB = new Date(b.created_date || 0).getTime();
            return sortBy.startsWith("-") ? dateB - dateA : dateA - dateB;
          });
        }
        if (sortBy === "-price" || sortBy === "price") {
          items.sort((a, b) => {
            return sortBy.startsWith("-") ? b.price - a.price : a.price - b.price;
          });
        }
      }
      
      // Apply limit
      if (limit) {
        items = items.slice(0, limit);
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching items from backend, using fallback mock data:', error);
      // Fallback to mock data if backend is unavailable
      let filtered = [...mockItems];
      
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
      
      if (limit) {
        filtered = filtered.slice(0, limit);
      }
      
      return new Promise((resolve) => {
        setTimeout(() => resolve(filtered), 100);
      });
    }
  }

  static async get(id: string): Promise<Item> {
    try {
      // Call FastAPI backend endpoint
      const response = await fetch(`http://localhost:8000/api/items/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch item: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching item from backend, using fallback mock data:', error);
      // Fallback to mock data if backend is unavailable
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
  }

  static async create(data: Partial<Item>): Promise<Item> {
    try {
      // Prepare request body - remove undefined fields and null values for optional fields
      const requestBody: any = {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        condition: data.condition,
        seller_id: data.seller_id,
      };

      // Only include optional fields if they have values (send null to backend for empty strings)
      if (data.location !== undefined && data.location !== null && data.location !== '') {
        requestBody.location = data.location;
      } else {
        requestBody.location = null;  // Send null to backend for optional field
      }
      if (data.is_negotiable !== undefined) {
        requestBody.is_negotiable = data.is_negotiable;
      }

      // Call FastAPI backend endpoint
      const response = await fetch('http://localhost:8000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Get error message from backend if available
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `Failed to create item: ${response.statusText}`;
        console.error('Backend error:', errorData);
        throw new Error(errorMessage);
      }

      // Parse and return the created item from backend
      const createdItem = await response.json();
      return createdItem as Item;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }
}

