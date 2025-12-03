// Import types for use in runtime objects
import type { Item as ItemType, ItemCategory, ItemCondition, ItemStatus } from "./Item";
import type { Message as MessageType } from "./Message";
import type { Conversation as ConversationType } from "./Conversation";
import type { User as UserType, UserRegister, UserLogin } from "./User";
import type { Transaction as TransactionType } from "./Transaction";

// Import entity classes for re-export
import { ItemEntity } from "./Item";
import { MessageEntity } from "./Message";
import { ConversationEntity } from "./Conversation";
import { UserEntity } from "./User";
import { TransactionEntity } from "./Transaction";

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
  delete: async (id: string): Promise<void> => ItemEntity.delete(id),
  updateStatus: async (id: string, status: ItemStatus): Promise<ItemType> =>
    ItemEntity.updateStatus(id, status),
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
  register: async (userData: UserRegister): Promise<UserType | null> =>
    UserEntity.register(userData),
  login: async (credentials: UserLogin): Promise<UserType | null> =>
    UserEntity.login(credentials),
  getById: async (userId: string): Promise<UserType | null> =>
    UserEntity.getById(userId),
  me: async (): Promise<UserType | null> => UserEntity.me(),
  update: async (payload: Partial<UserType>): Promise<UserType | null> =>
    UserEntity.update(payload as any),
};

const TransactionService = {
  getByConversation: async (
    conversation_id: string
  ): Promise<TransactionType | null> => TransactionEntity.getByConversation(conversation_id),

  create: async (data: {
    item_id: string;
    conversation_id: string;
    buyer_id: string;
    seller_id: string;
    meetup_time?: string | null;
    meetup_place?: string | null;
  }): Promise<TransactionType> => TransactionEntity.create(data),

  update: async (
    id: string,
    data: Partial<TransactionType>
  ): Promise<TransactionType> => TransactionEntity.update(id, data),
};


// Export runtime objects as values (this is a value export, not a type)
// TypeScript will distinguish between: import { Item } (value) vs import type { Item } (type)
export { ItemService as Item };
export { MessageService as Message };
export { ConversationService as Conversation };
export { UserService as User };
export { TransactionService as Transaction };