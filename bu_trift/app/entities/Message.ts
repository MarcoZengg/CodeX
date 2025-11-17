export interface Message {
  id?: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read?: boolean;
  created_date?: string;
}

// Mock data for development
const mockMessages: Message[] = [
  {
    id: "msg1",
    conversation_id: "conv1",
    sender_id: "student1",
    content: "Hi! Is the book still available?",
    is_read: false,
    created_date: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg2",
    conversation_id: "conv1",
    sender_id: "current_user",
    content: "Yes, it is! Are you interested?",
    is_read: true,
    created_date: new Date(Date.now() - 3300000).toISOString(),
  },
];

// Entity class for Message operations
export class MessageEntity {
  static async filter(
    filters: Partial<Message>,
    sortBy?: string
  ): Promise<Message[]> {
    // Mock implementation for development
    let filtered = [...mockMessages];

    // Apply filters
    if (filters.conversation_id) {
      filtered = filtered.filter((msg) => msg.conversation_id === filters.conversation_id);
    }
    if (filters.sender_id) {
      filtered = filtered.filter((msg) => msg.sender_id === filters.sender_id);
    }

    // Apply sorting
    if (sortBy === "created_date" || sortBy === "-created_date") {
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_date || 0).getTime();
        const dateB = new Date(b.created_date || 0).getTime();
        return sortBy.startsWith("-") ? dateB - dateA : dateA - dateB;
      });
    }

    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(filtered), 100);
    });
  }

  static async create(data: Partial<Message>): Promise<Message> {
    // Mock implementation for development
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      conversation_id: data.conversation_id || "",
      sender_id: data.sender_id || "",
      content: data.content || "",
      is_read: false,
      created_date: data.created_date || new Date().toISOString(),
    };

    // Simulate network delay for Safari compatibility
    return new Promise((resolve) => {
      setTimeout(() => resolve(newMessage), 100);
    });
  }
}

