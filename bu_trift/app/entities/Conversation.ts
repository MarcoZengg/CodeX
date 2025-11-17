export interface Conversation {
  id?: string;
  item_id: string;
  item_title?: string;
  item_image_url?: string;
  participant_ids: string[];
  last_message_snippet?: string;
  last_message_at: string;
}

// Mock data for development
const mockConversations: Conversation[] = [
  {
    id: "conv1",
    item_id: "1",
    item_title: "Calculus Textbook",
    item_image_url: "https://via.placeholder.com/400x400?text=Calculus+Book",
    participant_ids: ["current_user", "student1"],
    last_message_snippet: "Is the book still available?",
    last_message_at: new Date().toISOString(),
  },
  {
    id: "conv2",
    item_id: "2",
    item_title: "MacBook Air 13\" M1",
    item_image_url: "https://via.placeholder.com/400x400?text=MacBook",
    participant_ids: ["current_user", "student2"],
    last_message_snippet: "What's the condition?",
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

// Entity class for Conversation operations
export class ConversationEntity {
  static async filter(
    filters: { participant_ids?: { op: string; value: string } } & Partial<Conversation>,
    sortBy?: string
  ): Promise<Conversation[]> {
    // Mock implementation for development
    let filtered = [...mockConversations];

    // Apply filters
    if (filters.item_id) {
      filtered = filtered.filter((conv) => conv.item_id === filters.item_id);
    }
    if (filters.participant_ids && filters.participant_ids.op === "contains") {
      const userId = filters.participant_ids.value;
      filtered = filtered.filter((conv) => conv.participant_ids.includes(userId));
    }

    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(filtered), 100);
    });
  }

  static async create(data: Partial<Conversation>): Promise<Conversation> {
    // Mock implementation for development
    const newConversation: Conversation = {
      id: `conv${Date.now()}`,
      item_id: data.item_id || "",
      item_title: data.item_title,
      item_image_url: data.item_image_url,
      participant_ids: data.participant_ids || [],
      last_message_snippet: data.last_message_snippet || "",
      last_message_at: data.last_message_at || new Date().toISOString(),
    };

    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(newConversation), 100);
    });
  }
}

