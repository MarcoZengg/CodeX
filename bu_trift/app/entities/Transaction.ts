import { API_URL } from "../config";
import { fetchWithAuth, getFirebaseToken } from "../utils/auth";

export interface Transaction {
  id?: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  conversation_id: string;
  status?: "in_progress" | "completed";
  buyer_confirmed?: boolean;
  seller_confirmed?: boolean;
  meetup_time?: string | null;
  meetup_place?: string | null;
  meetup_lat?: number;
  meetup_lng?: number;
  created_date?: string;
  completed_date?: string | null;
}

export interface TransactionCreate {
  item_id: string;
  conversation_id: string;
  buyer_id: string;
  seller_id: string;
  meetup_time?: string | null;
  meetup_place?: string | null;
}

async function getAuthHeaders(includeJSON: boolean = true): Promise<HeadersInit> {
  const token = await getFirebaseToken(false);
  const headers: HeadersInit = {};

  if (includeJSON) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

export class TransactionEntity {
  static async getByConversation(
    conversation_id: string
  ): Promise<Transaction | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(
        `${API_URL}/api/transactions/by_conversation/${conversation_id}`,
        {
          method: "GET",
          headers,
        }
      );

      // No transaction yet
      if (response.status === 404) {
        return null;
      }

      // Any other non-OK status → just log and treat as "no transaction"
      if (!response.ok) {
        console.error(
          `Failed to get transaction: ${response.status} ${response.statusText}`
        );
        return null;
      }

      return (await response.json()) as Transaction;
    } catch (error) {
      console.error("Error getting transaction:", error);
      // On network / CORS / server error, don't crash the UI
      return null;
    }
  }


  static async create(data: TransactionCreate): Promise<Transaction> {
    try {
      const token = await getFirebaseToken(false);
      if (!token) throw new Error("You must be logged in to create a transaction.");

      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`${API_URL}/api/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }

  static async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    try {
      const token = await getFirebaseToken(false);
      if (!token) throw new Error("You must be logged in to update a transaction.");

      const headers = await getAuthHeaders();
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
}