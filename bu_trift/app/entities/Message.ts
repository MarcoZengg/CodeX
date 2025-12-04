// Import API URL from config
import { API_URL } from "../config";
import { getFirebaseToken, fetchWithAuth } from "../utils/auth";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_date: string;
  message_type?: string; // "text" or "buy_request"
  buy_request_id?: string | null;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  item_id?: string;
  last_message_at?: string;
  created_date: string;
  updated_date: string;
  item_title?: string;
  last_message_snippet?: string | null;
  unread_count?: number;
}

export interface ConversationCreate {
  participant1_id: string;
  participant2_id: string;
  item_id?: string;
}

export interface MessageCreate {
  conversation_id: string;
  sender_id: string;
  content: string;
}

// Helper function to get auth headers
async function getAuthHeaders(includeJSON: boolean = true): Promise<HeadersInit> {
  const token = await getFirebaseToken(false);
  const headers: HeadersInit = {};

  if (includeJSON) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

// Entity class for Message operations
export class MessageEntity {
  /**
   * Create a new conversation
   */
  static async createConversation(data: ConversationCreate): Promise<Conversation> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`${API_URL}/api/conversations`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  static async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`${API_URL}/api/conversations?user_id=${userId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get conversations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting conversations:", error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`${API_URL}/api/messages?conversation_id=${conversationId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting messages:", error);
      throw error;
    }
  }

  /**
   * Send a new message
   */
  static async sendMessage(data: MessageCreate): Promise<Message> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`${API_URL}/api/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  static async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithAuth(`${API_URL}/api/conversations/${conversationId}/mark-read?user_id=${userId}`, {
        method: "PUT",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error marking as read:", error);
      throw error;
    }
  }

  /**
   * Filter messages (for backward compatibility with existing code)
   */
  static async filter(
    filters: Partial<Message>,
    sortBy?: string
  ): Promise<Message[]> {
    // For getting messages by conversation_id
    if (filters.conversation_id) {
      return await this.getMessages(filters.conversation_id);
    }
    return [];
  }

  /**
   * Create message (for backward compatibility with existing code)
   */
  static async create(data: Partial<Message>): Promise<Message> {
    if (!data.conversation_id || !data.sender_id || !data.content) {
      throw new Error("Missing required fields: conversation_id, sender_id, content");
    }
    return await this.sendMessage({
      conversation_id: data.conversation_id,
      sender_id: data.sender_id,
      content: data.content,
    });
  }
}
