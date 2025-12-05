// Import API URL from config
import { API_URL } from "../config";
import { fetchWithAuth, getFirebaseToken, getAuthHeaders } from "../utils/auth";

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
        headers: await getAuthHeaders(false),  
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
      console.error("Error fetching items:", error);
      throw error;
    }
  }

  /* =============================
     GET ITEM BY ID
     ============================= */
  static async get(id: string): Promise<Item> {
    try {
      const response = await fetch(`${API_URL}/api/items/${id}`, {
        method: "GET",
        headers: await getAuthHeaders(false),  
      });

      if (!response.ok) throw new Error("Failed to fetch item");

      return await response.json();
    } catch (error) {
      console.error("Error fetching item:", error);
      throw error;
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
        headers: await getAuthHeaders(true),   
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
     UPDATE ITEM (Firebase-protected)
     ============================= */
  static async update(id: string, data: Partial<Item>): Promise<Item> {
    try {
      const token = await getFirebaseToken(false);
      if (!token) throw new Error("You must be logged in to update an item.");

      const body: Partial<Item> = {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        condition: data.condition,
        location: data.location ?? null,
        is_negotiable: data.is_negotiable,
        images: data.images,
      };

      const response = await fetchWithAuth(`${API_URL}/api/items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update item");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  }

  /* =============================
     DELETE ITEM (Firebase-protected)
     ============================= */
  static async delete(id: string): Promise<void> {
    try {
      const token = await getFirebaseToken(false);
      if (!token) throw new Error("You must be logged in to delete an item.");

      const response = await fetchWithAuth(`${API_URL}/api/items/${id}`, {
        method: "DELETE",
        headers: {},
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
      const token = await getFirebaseToken(false);
      if (!token) throw new Error("You must be logged in to update an item.");

      const response = await fetchWithAuth(`${API_URL}/api/items/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
