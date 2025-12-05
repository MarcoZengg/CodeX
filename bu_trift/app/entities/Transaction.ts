import { API_URL } from "../config";
import { fetchWithAuth, getFirebaseToken, getAuthHeaders } from "../utils/auth";

export interface Transaction {
  id?: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  conversation_id: string;
  buy_request_id?: string | null;
  status: "in_progress" | "completed" | "cancelled";
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  buyer_cancel_confirmed: boolean;
  seller_cancel_confirmed: boolean;
  meetup_time?: string | null;
  meetup_place?: string | null;
  meetup_lat?: number;
  meetup_lng?: number;
  created_date?: string;
  completed_date?: string | null;
}


export class TransactionEntity {
  static async get(id: string): Promise<Transaction> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/transactions/${id}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting transaction:", error);
      throw error;
    }
  }

  static async getAllByConversation(conversation_id: string): Promise<Transaction[]> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/transactions/by-conversation/${conversation_id}/all`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get transactions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting transactions:", error);
      throw error;
    }
  }

  static async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/transactions/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  }

  static async cancel(id: string): Promise<Transaction> {
    try {
      const headers = await getAuthHeaders(true, true); // includeJSON=true, requireAuth=true
      const response = await fetchWithAuth(`${API_URL}/api/transactions/${id}/cancel`, {
        method: "PATCH",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to cancel transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error cancelling transaction:", error);
      throw error;
    }
  }
}
