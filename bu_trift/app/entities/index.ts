// Import types for use in runtime objects
import type { Item as ItemType, ItemCategory, ItemCondition, ItemStatus } from "./Item";
import type { Message as MessageType } from "./Message";
import type { Conversation as ConversationType } from "./Conversation";
import type { User as UserType } from "./User";

// Import entity classes for re-export
import { ItemEntity } from "./Item";
import { MessageEntity } from "./Message";
import { ConversationEntity } from "./Conversation";
import { UserEntity } from "./User";

// Note: For type imports, import directly from the source files:
// import type { Item } from "@/entities/Item";
// This avoids conflicts with value exports below

// Export entity classes
export { ItemEntity };
export { MessageEntity };
export { ConversationEntity };
export { UserEntity };

// Create runtime objects with different internal names to avoid type/value conflicts
const ItemService = {
  filter: async (
    filters: Partial<ItemType>,
    sortBy?: string,
    limit?: number
  ): Promise<ItemType[]> => ItemEntity.filter(filters, sortBy, limit),
  get: async (id: string): Promise<ItemType> => ItemEntity.get(id),
  create: async (data: Partial<ItemType>): Promise<ItemType> => ItemEntity.create(data),
};

const MessageService = {
  filter: async (
    filters: Partial<MessageType>,
    sortBy?: string
  ): Promise<MessageType[]> => MessageEntity.filter(filters, sortBy),
  create: async (data: Partial<MessageType>): Promise<MessageType> => MessageEntity.create(data),
};

const ConversationService = {
  filter: async (
    filters: {
      participant_ids?: { op: string; value: string };
    } & Partial<ConversationType>,
    sortBy?: string
  ): Promise<ConversationType[]> => ConversationEntity.filter(filters, sortBy),
  create: async (data: Partial<ConversationType>): Promise<ConversationType> => ConversationEntity.create(data),
};

const UserService = {
  me: async (): Promise<UserType> => UserEntity.me(),
};

// Export runtime objects as values (this is a value export, not a type)
// TypeScript will distinguish between: import { Item } (value) vs import type { Item } (type)
export { ItemService as Item };
export { MessageService as Message };
export { ConversationService as Conversation };
export { UserService as User };

