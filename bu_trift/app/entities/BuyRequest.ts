import { API_URL } from "../config";
import { fetchWithAuth, getFirebaseToken, getAuthHeaders } from "../utils/auth";

export interface BuyRequest {
  id?: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  conversation_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_date?: string;
  responded_date?: string | null;
}


export class BuyRequestEntity {
  static async create(item_id: string, conversation_id?: string): Promise<BuyRequest> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/buy-requests`, {
        method: "POST",
        headers,
        body: JSON.stringify({ item_id, conversation_id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create buy request: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating buy request:", error);
      throw error;
    }
  }

  static async accept(request_id: string): Promise<{ buy_request: BuyRequest; transaction: any }> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/buy-requests/${request_id}/accept`, {
        method: "PATCH",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to accept buy request: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error accepting buy request:", error);
      throw error;
    }
  }

  static async reject(request_id: string): Promise<BuyRequest> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/buy-requests/${request_id}/reject`, {
        method: "PATCH",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to reject buy request: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error rejecting buy request:", error);
      throw error;
    }
  }

  static async cancel(request_id: string): Promise<BuyRequest> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/buy-requests/${request_id}/cancel`, {
        method: "PATCH",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to cancel buy request: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error cancelling buy request:", error);
      throw error;
    }
  }

  static async getByConversation(conversation_id: string): Promise<BuyRequest[]> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/buy-requests/by-conversation/${conversation_id}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get buy requests: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting buy requests:", error);
      throw error;
    }
  }

  static async get(id: string): Promise<BuyRequest> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/buy-requests/${id}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get buy request: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting buy request:", error);
      throw error;
    }
  }
}

// Import Transaction type
import type { Transaction } from "./Transaction";

