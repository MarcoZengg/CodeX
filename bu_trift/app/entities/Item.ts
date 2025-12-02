// Import API URL from config
import { API_URL } from "../config";

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
  seller_id?: string;     
  status?: ItemStatus;
  location?: string | null;
  is_negotiable?: boolean;
  created_date?: string;
}

/* =====================================================
   Helper: Get Auth Header using Firebase Token
   ===================================================== */
function getAuthHeaders(includeJson: boolean = true): HeadersInit {
  const token = localStorage.getItem("firebaseToken");

  const headers: HeadersInit = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/* =====================================================
   MOCK DATA (kept exactly for dev fallback)
   ===================================================== */
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

/* =====================================================
   ITEM ENTITY CLASS (Firebase + Backend)
   ===================================================== */
export class ItemEntity {

  /* =============================
     FILTER ITEMS
     ============================= */
  static async filter(
    filters: Partial<Item>,
    sortBy?: string,
    limit?: number
  ): Promise<Item[]> {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.category) params.append("category", filters.category);
      if (filters.condition) params.append("condition", filters.condition);
      if (filters.seller_id) params.append("seller_id", filters.seller_id);

      const url = params.toString()
        ? `${API_URL}/api/items?${params.toString()}`
        : `${API_URL}/api/items`;

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(false),  
      });

      if (!response.ok) throw new Error("Failed to fetch items");

      let items: Item[] = await response.json();

      // Sorting logic preserved
      if (sortBy) {
        if (sortBy.includes("created_date")) {
          items.sort((a, b) =>
            sortBy.startsWith("-")
              ? new Date(b.created_date || "").getTime() -
                new Date(a.created_date || "").getTime()
              : new Date(a.created_date || "").getTime() -
                new Date(b.created_date || "").getTime()
          );
        }
        if (sortBy.includes("price")) {
          items.sort((a, b) =>
            sortBy.startsWith("-") ? b.price - a.price : a.price - b.price
          );
        }
      }

      if (limit) items = items.slice(0, limit);

      return items;
    } catch (error) {
      console.error("Error fetching items; using fallback:", error);
      return mockItems;
    }
  }

  /* =============================
     GET ITEM BY ID
     ============================= */
  static async get(id: string): Promise<Item> {
    try {
      const response = await fetch(`${API_URL}/api/items/${id}`, {
        method: "GET",
        headers: getAuthHeaders(false),  
      });

      if (!response.ok) throw new Error("Failed to fetch item");

      return await response.json();
    } catch (error) {
      console.error("Error fetching item; using fallback:", error);
      return mockItems.find((i) => i.id === id) || mockItems[0];
    }
  }

  /* =============================
     CREATE ITEM (Firebase-protected)
     ============================= */
  static async create(data: Partial<Item>): Promise<Item> {
    try {
      const token = localStorage.getItem("firebaseToken");
      if (!token) throw new Error("You must be logged in to create an item.");

      // 🔥 FIXED — seller_id must NOT be included
      const body = {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        condition: data.condition,
        location: data.location ?? null,
        is_negotiable: data.is_negotiable ?? false,
        images: data.images ?? [],
      };

      const response = await fetch(`${API_URL}/api/items`, {
        method: "POST",
        headers: getAuthHeaders(true),   
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create item");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating item:", error);
      throw error;
    }
  }

  /* =============================
     DELETE ITEM (Firebase-protected)
     ============================= */
  static async delete(id: string): Promise<void> {
    try {
      const token = localStorage.getItem("firebaseToken");
      if (!token) throw new Error("You must be logged in to delete an item.");

      const response = await fetch(`${API_URL}/api/items/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(false),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete item");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  }

  /* =============================
     UPDATE ITEM STATUS (Firebase-protected)
     ============================= */
  static async updateStatus(id: string, status: ItemStatus): Promise<Item> {
    try {
      const token = localStorage.getItem("firebaseToken");
      if (!token) throw new Error("You must be logged in to update an item.");

      const response = await fetch(`${API_URL}/api/items/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update item status");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating item status:", error);
      throw error;
    }
  }
}
