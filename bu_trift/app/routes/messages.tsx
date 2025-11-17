import { useState, useEffect } from "react";
import type { Route } from "./+types/messages";
import { Conversation, Message, User } from "@/entities";
import type { Conversation as ConversationType } from "@/entities/Conversation";
import type { Message as MessageType } from "@/entities/Message";
import type { User as UserType } from "@/entities/User";
import { useSearchParams } from "react-router";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ConversationListProps {
  conversations: ConversationType[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  currentUser: UserType | null;
}

const ConversationList = ({ conversations, onSelect, selectedId, currentUser }: ConversationListProps) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b">
      <h2 className="text-xl font-bold">Inbox</h2>
    </div>
    <div className="flex-1 overflow-y-auto">
      {conversations.map(convo => {
        const otherParticipantId = convo.participant_ids.find(id => id !== currentUser?.id);
        const otherUserName = `User ${otherParticipantId?.substring(0, 4)}`;
        
        return (
          <div
            key={convo.id}
            onClick={() => onSelect(convo.id!)}
            className={`p-4 border-b cursor-pointer transition-colors ${selectedId === convo.id ? 'bg-red-50' : 'hover:bg-neutral-50'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">
                {otherUserName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-neutral-800 truncate">{otherUserName}</div>
                <p className="text-sm text-neutral-600 truncate">{convo.item_title}</p>
                <p className="text-sm text-neutral-500 truncate">{convo.last_message_snippet}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

interface MessageViewProps {
  conversation: ConversationType | undefined;
  currentUser: UserType | null;
}

const MessageView = ({ conversation, currentUser }: MessageViewProps) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (conversation) {
      Message.filter({ conversation_id: conversation.id! }, "created_date").then(setMessages);
    }
  }, [conversation]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation || !currentUser) return;
    await Message.create({
      conversation_id: conversation.id!,
      sender_id: currentUser.id!,
      content: newMessage,
    });
    setMessages(prev => [...prev, { 
      sender_id: currentUser.id!, 
      content: newMessage, 
      conversation_id: conversation.id!,
      created_date: new Date().toISOString() 
    }]);
    setNewMessage("");
  };
  
  if (!conversation) return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8 bg-neutral-50">
      <MessageCircle className="w-16 h-16 text-neutral-300 mb-4" />
      <h3 className="text-xl font-semibold text-neutral-700">Select a conversation</h3>
      <p className="text-neutral-500">Your messages will appear here.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-3">
        {conversation.item_image_url && <img src={conversation.item_image_url} className="w-12 h-12 rounded-lg object-cover" />}
        <div>
          <h3 className="font-bold">{conversation.item_title}</h3>
          <p className="text-sm text-neutral-600">Conversation about this item</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender_id === currentUser?.id ? 'bg-red-600 text-white' : 'bg-neutral-200 text-neutral-800'}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
          />
          <button onClick={handleSend} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Send</button>
        </div>
      </div>
    </div>
  );
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Messages - BUTrift" },
    { name: "description", content: "View and send messages" },
  ];
}

export default function Messages() {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);
        const convos = await Conversation.filter({ participant_ids: { op: 'contains', value: user.id! } }, '-last_message_at');
        setConversations(convos);
        
        const conversationIdFromUrl = searchParams.get('conversationId');
        if (conversationIdFromUrl) {
          setSelectedConversationId(conversationIdFromUrl);
        } else if (convos.length > 0) {
          setSelectedConversationId(convos[0].id || null);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [searchParams]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="h-full p-0 md:p-6 bg-gradient-to-b from-white to-neutral-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <Card className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 overflow-hidden border-0 md:border md:border-neutral-200/60 md:rounded-2xl">
          <div className="col-span-1 border-r border-neutral-200/60">
            {isLoading ? <Skeleton className="h-full w-full" /> : 
              <ConversationList 
                conversations={conversations} 
                onSelect={setSelectedConversationId}
                selectedId={selectedConversationId}
                currentUser={currentUser}
              />
            }
          </div>
          <div className="hidden md:block md:col-span-2 lg:col-span-3">
            {isLoading ? <Skeleton className="h-full w-full" /> : 
              <MessageView conversation={selectedConversation} currentUser={currentUser} />
            }
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

