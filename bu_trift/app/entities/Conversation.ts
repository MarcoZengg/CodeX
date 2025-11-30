// Import API URL from config
import { API_URL } from "../config";

// Updated interface to match backend response
export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  item_id?: string;
  last_message_at?: string;
  created_date: string;
  updated_date: string;
  // Optional fields for UI compatibility
  item_title?: string;
  item_image_url?: string;
  participant_ids?: string[]; // For backward compatibility
  last_message_snippet?: string; // For backward compatibility
}

// Helper function to get auth headers
function getAuthHeaders(includeJSON: boolean = true): HeadersInit {
  const token = localStorage.getItem("firebaseToken");
  const headers: HeadersInit = {};

  if (includeJSON) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return headers;
}

// Entity class for Conversation operations
export class ConversationEntity {
  /**
   * Create a new conversation
   */
  static async create(data: Partial<Conversation>): Promise<Conversation> {
    try {
      // Convert from old format (participant_ids array) to new format
      let participant1_id: string;
      let participant2_id: string;

      if (data.participant_ids && data.participant_ids.length >= 2) {
        participant1_id = data.participant_ids[0];
        participant2_id = data.participant_ids[1];
      } else if (data.participant1_id && data.participant2_id) {
        participant1_id = data.participant1_id;
        participant2_id = data.participant2_id;
      } else {
        throw new Error("Missing participant IDs");
      }

      const response = await fetch(`${API_URL}/api/conversations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          participant1_id,
          participant2_id,
          item_id: data.item_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create conversation: ${response.statusText}`);
      }

      const conversation = await response.json();
      // Add backward compatibility fields
      return {
        ...conversation,
        participant_ids: [conversation.participant1_id, conversation.participant2_id],
      };
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  static async filter(
    filters: { participant_ids?: { op: string; value: string } } & Partial<Conversation>,
    sortBy?: string
  ): Promise<Conversation[]> {
    try {
      // For getting conversations for a user
      if (filters.participant_ids?.value) {
        const userId = filters.participant_ids.value;
        const response = await fetch(`${API_URL}/api/conversations?user_id=${userId}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to get conversations: ${response.statusText}`);
        }

        const conversations = await response.json();
        // Add backward compatibility fields
        return conversations.map((conv: Conversation) => ({
          ...conv,
          participant_ids: [conv.participant1_id, conv.participant2_id],
        }));
      }

      // If filtering by item_id, we'd need to add that endpoint or filter client-side
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("Error getting conversations:", error);
      throw error;
    }
  }
}
