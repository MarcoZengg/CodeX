import { useEffect, useState, useRef } from "react";
import type { Route } from "./+types/messages";
import { Conversation, User, Message, BuyRequest, Transaction, Item } from "@/entities";
import type { Conversation as ConversationType } from "@/entities/Conversation";
import type { User as UserType } from "@/entities/User";
import type { Message as MessageType } from "@/entities/Message";
import type { BuyRequest as BuyRequestType } from "@/entities/BuyRequest";
import type { Transaction as TransactionType } from "@/entities/Transaction";
import { MessageEntity } from "@/entities/Message";
import { WebSocketClient } from "@/utils/websocket";
import { API_URL } from "@/config";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Messages - BUThrift" },
    { name: "description", content: "View your conversations" },
  ];
}

// Buy Request Message Component
function BuyRequestMessageComponent({
  message,
  buyRequest,
  currentUser,
  onAccept,
  onReject,
  onCancel,
}: {
  message: MessageType;
  buyRequest: BuyRequestType;
  currentUser: UserType | null;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadItem() {
      try {
        const itemData = await Item.get(buyRequest.item_id);
        setItem(itemData);
      } catch (error) {
        console.error("Error loading item:", error);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [buyRequest.item_id]);
  
  const isSeller = currentUser?.id === buyRequest.seller_id;
  const isBuyer = currentUser?.id === buyRequest.buyer_id;
  
  if (loading) {
    return <div style={{ color: "#999", fontSize: 14 }}>Loading buy request...</div>;
  }
  
  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 12,
        padding: 16,
        backgroundColor: "#eff6ff",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Buy Request</h4>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor:
              buyRequest.status === "pending" ? "#fef3c7" :
              buyRequest.status === "accepted" ? "#d1fae5" :
              "#fee2e2",
            color:
              buyRequest.status === "pending" ? "#92400e" :
              buyRequest.status === "accepted" ? "#065f46" :
              "#991b1b",
          }}
        >
          {buyRequest.status.toUpperCase()}
        </span>
      </div>
      
      {item && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px 0" }}>Item: {item.title}</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", margin: 0 }}>${item.price}</p>
        </div>
      )}
      
      {buyRequest.status === "pending" && isSeller && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#dc2626",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Accept
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #e5e5e5",
              backgroundColor: "#fff",
              color: "#444",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
      )}
      
      {buyRequest.status === "pending" && isBuyer && (
        <button
          onClick={onCancel}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            backgroundColor: "#fff",
            color: "#444",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel Request
        </button>
      )}
      
      {buyRequest.status === "accepted" && (
        <p style={{ fontSize: 13, color: "#059669", fontWeight: 600, margin: 0 }}>
          ✓ Request accepted! Transaction started.
        </p>
      )}
      
      {buyRequest.status === "rejected" && (
        <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
          ✗ Request declined.
        </p>
      )}
    </div>
  );
}

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantUsers, setParticipantUsers] = useState<Record<string, UserType>>({});
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  
  // Buy request and transaction state
  const [buyRequests, setBuyRequests] = useState<BuyRequestType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [showTransactionList, setShowTransactionList] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        // Get current user from localStorage (actual logged-in user)
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            // Only use if it's a real user (not mock "current_user")
            if (user.id && user.id !== "current_user") {
              setCurrentUser(user);

              // Load conversations from API
              const conversations = await MessageEntity.getConversations(user.id);
              // Add backward compatibility fields
              const formattedConversations = conversations.map((conv) => ({
                ...conv,
                participant_ids: [conv.participant1_id, conv.participant2_id],
              }));
              setConversations(formattedConversations);
              setUnreadTotal(
                formattedConversations.reduce(
                  (sum, conv) => sum + (conv.unread_count ?? 0),
                  0
                )
              );

              // Fetch user data for all other participants
              const otherParticipantIds = new Set<string>();
              formattedConversations.forEach((conv) => {
                if (conv.participant1_id !== user.id) {
                  otherParticipantIds.add(conv.participant1_id);
                }
                if (conv.participant2_id !== user.id) {
                  otherParticipantIds.add(conv.participant2_id);
                }
              });

              // Fetch all participant user data
              const userDataPromises = Array.from(otherParticipantIds).map(async (userId) => {
                try {
                  const userData = await User.getById(userId);
                  return { userId, userData };
                } catch (error) {
                  console.error(`Error fetching user ${userId}:`, error);
                  return { userId, userData: null };
                }
              });

              const userDataResults = await Promise.all(userDataPromises);
              const usersMap: Record<string, UserType> = {};
              userDataResults.forEach(({ userId, userData }) => {
                if (userData) {
                  usersMap[userId] = userData;
                }
              });
              setParticipantUsers(usersMap);

              // Connect WebSocket for real-time messaging with token
              const token = localStorage.getItem("firebaseToken");
              const wsClient = new WebSocketClient(user.id);
              wsClient.connect(API_URL, token || undefined);
              wsClient.onMessage((data) => {
                if (data.type === "new_message") {
                  const newMsg = data.data;
                  
                  // Update conversations list to show new message indicator
                  setConversations((prevConvs) => {
                    return prevConvs.map((conv) => {
                      if (conv.id === newMsg.conversation_id) {
                        const isFromOther = newMsg.sender_id !== currentUser?.id;
                        return {
                          ...conv,
                          last_message_at: newMsg.created_date,
                          last_message_snippet: newMsg.content.substring(0, 80),
                          unread_count:
                            isFromOther && selectedIdRef.current !== conv.id
                              ? (conv.unread_count || 0) + 1
                              : conv.unread_count || 0,
                        };
                      }
                      return conv;
                    });
                  });
                  // Update unread total
                  setUnreadTotal((prev) => {
                    const isFromOther = newMsg.sender_id !== currentUser?.id;
                    return isFromOther && selectedIdRef.current !== newMsg.conversation_id
                      ? prev + 1
                      : prev;
                  });
                  
                  // Only add message if it's for the currently selected conversation
                  setMessages((prev) => {
                    // Check current selectedId using ref (to get latest value)
                    if (newMsg.conversation_id !== selectedIdRef.current) {
                      return prev; // Don't add messages from other conversations
                    }
                    // Avoid duplicates
                    if (prev.some((m) => m.id === newMsg.id)) {
                      return prev;
                    }
                    return [...prev, newMsg];
                  });
                } else if (data.type === "buy_request_update") {
                  // Handle buy request updates (accept, reject, cancel, or new request)
                  const updatedBuyRequest = data.data;
                  
                  // Check if this conversation exists in our list and reload if it doesn't
                  setConversations((prevConvs) => {
                    const conversationExists = prevConvs.some(conv => conv.id === updatedBuyRequest.conversation_id);
                    
                    // If conversation doesn't exist, reload conversations list (new conversation created)
                    if (!conversationExists && currentUser?.id) {
                      // Reload conversations to include the new one
                      MessageEntity.getConversations(currentUser.id).then((updatedConvs) => {
                        setConversations(updatedConvs);
                      }).catch(console.error);
                    }
                    
                    return prevConvs;
                  });
                  
                  // If this is the selected conversation, reload buy requests and messages
                  if (selectedIdRef.current && updatedBuyRequest.conversation_id === selectedIdRef.current) {
                    BuyRequest.getByConversation(selectedIdRef.current).then((updated) => {
                      setBuyRequests(updated);
                    }).catch(console.error);
                    
                    MessageEntity.getMessages(selectedIdRef.current).then((msgs) => {
                      setMessages(msgs ?? []);
                    }).catch(console.error);
                  }
                } else if (data.type === "transaction_created" || data.type === "transaction_update") {
                  // Handle transaction updates
                  const updatedTransaction = data.data;
                  
                  // Reload transactions for the current conversation if it matches
                  if (selectedIdRef.current && updatedTransaction.conversation_id === selectedIdRef.current) {
                    Transaction.getAllByConversation(selectedIdRef.current).then((updated) => {
                      setTransactions(updated);
                    }).catch(console.error);
                  }
                }
              });
              wsClientRef.current = wsClient;

              if (formattedConversations.length > 0) {
                const firstId = formattedConversations[0].id ?? null;
                setSelectedId(firstId);
              }
            } else {
              // Invalid or mock user - set to null (user not logged in)
              setCurrentUser(null);
            }
          } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            setCurrentUser(null);
          }
        } else {
          // No user in localStorage - user is not logged in
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    load();

    // Cleanup: disconnect WebSocket on unmount
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, []);

  // Update ref when selectedId changes
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedId) {
        setMessages([]);
        return;
      }
      try {
        // Load messages from API
        const result = await MessageEntity.getMessages(selectedId);
        setMessages(result ?? []);

        // Mark conversation as read
        if (currentUser?.id) {
          await MessageEntity.markAsRead(selectedId, currentUser.id);
          // Reset unread counter locally
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === selectedId ? { ...conv, unread_count: 0 } : conv
            )
          );
          const target = conversations.find((c) => c.id === selectedId);
          const decrement = target?.unread_count ?? 0;
          setUnreadTotal((prev) => Math.max(0, prev - decrement));
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        // Fallback to empty array on error
        setMessages([]);
      }
    }

    loadMessages();
  }, [selectedId, currentUser]);

  // Load buy requests and transactions when conversation is selected
  useEffect(() => {
    async function loadBuyRequestsAndTransactions() {
      if (!selectedId || !currentUser) {
        setBuyRequests([]);
        setTransactions([]);
        return;
      }
      
      try {
        const [requests, txs] = await Promise.all([
          BuyRequest.getByConversation(selectedId).catch(() => []),
          Transaction.getAllByConversation(selectedId).catch(() => []),
        ]);
        
        setBuyRequests(requests || []);
        setTransactions(txs || []);
      } catch (error) {
        console.error("Error loading buy requests/transactions:", error);
      }
    }
    
    loadBuyRequestsAndTransactions();
  }, [selectedId, currentUser]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !selectedId) return;

    try {
      // Send message via API (which will also broadcast via WebSocket)
      const created = await MessageEntity.sendMessage({
        conversation_id: selectedId,
        sender_id: currentUser.id!,
        content: newMessage.trim(),
      });

      // Add message to local state (WebSocket will also add it, but this ensures immediate UI update)
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === created.id)) {
          return prev;
        }
        return [...prev, created];
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40 }}>
        Loading conversations...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Please log in to view your messages
        </h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          You need to be logged in to access your conversations.
        </p>
      </div>
    );
  }

  const selectedConversation = conversations.find(
    (c) => c.id === selectedId
  );

  return (
    <div
      style={{
        padding: 24,
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 16,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Left: conversation list */}
      <div
      style={{
        borderRight: "1px solid #e5e5e5",
        paddingRight: 16,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700 }}>Inbox</h2>
        {unreadTotal > 0 && (
          <span
            style={{
              backgroundColor: "#dc2626",
              color: "#fff",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {unreadTotal} new
          </span>
        )}
      </div>
      {conversations.length === 0 && (
        <div style={{ color: "#666", fontSize: 14 }}>
          No conversations yet.
        </div>
      )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {conversations.map((c) => {
            const otherId =
              c.participant_ids?.find((id) => id !== currentUser.id) ??
              null;
            // Get the other participant's display name, or fallback to ID
            const otherUser = otherId ? participantUsers[otherId] : null;
            const name = otherUser?.display_name || (otherId ? `User ${otherId.substring(0, 8)}` : "Unknown User");
            const isSelected = c.id === selectedId;
            const unread = c.unread_count ?? 0;

            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id!)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #eee",
                  backgroundColor: isSelected ? "#fee2e2" : "#fff",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {unread > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#dc2626",
                      color: "#fff",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {unread}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: "#fee2e2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid #fecdd3",
                    }}
                  >
                    {otherUser?.profile_image_url ? (
                      <img
                        src={otherUser.profile_image_url}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700, color: "#b91c1c" }}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 2,
                  }}
                >
                  {c.item_title ?? "Item"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#999",
                    marginBottom: 2,
                  }}
                >
                  {c.last_message_snippet ?? ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: messages + meetup + review flow */}
      <div
        style={{
          paddingLeft: 8,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {selectedConversation ? (
          <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {selectedConversation.item_title ?? "Conversation"}
                </h3>
                <p style={{ color: "#666", fontSize: 14 }}>
                  Conversation ID: {selectedConversation.id}
                </p>
              </div>
              <button
                onClick={() => setShowTransactionList(true)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #dc2626",
                  backgroundColor: "#fff",
                  color: "#dc2626",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Transactions {transactions.length > 0 ? `(${transactions.length})` : ""}
              </button>
            </div>

            {/* Messages list */}
            <div
              style={{
                flex: 1,
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 12,
                overflowY: "auto",
                marginBottom: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {messages.length === 0 && (
                <div style={{ color: "#999", fontSize: 14 }}>
                  No messages yet. Say hi!
                </div>
              )}
              {messages.map((m) => {
                // Check if this is a buy request message
                const isBuyRequestMessage = m.message_type === "buy_request" && m.buy_request_id;
                const buyRequest = isBuyRequestMessage 
                  ? buyRequests.find(br => br.id === m.buy_request_id)
                  : null;
                
                if (isBuyRequestMessage && buyRequest) {
                  // Render buy request message
                  return (
                    <BuyRequestMessageComponent
                      key={m.id}
                      message={m}
                      buyRequest={buyRequest}
                      currentUser={currentUser}
                      onAccept={async () => {
                        try {
                          const result = await BuyRequest.accept(buyRequest.id!);
                          // Reload buy requests and transactions
                          const [updatedRequests, updatedTxs] = await Promise.all([
                            BuyRequest.getByConversation(selectedId!),
                            Transaction.getAllByConversation(selectedId!),
                          ]);
                          setBuyRequests(updatedRequests);
                          setTransactions(updatedTxs);
                          // Reload messages to show acceptance message
                          const result_messages = await MessageEntity.getMessages(selectedId!);
                          setMessages(result_messages ?? []);
                          // Navigate to transaction page
                          setTimeout(() => {
                            navigate(`/transactions/${result.transaction.id}`);
                          }, 500);
                        } catch (error: any) {
                          alert(error.message || "Failed to accept request");
                        }
                      }}
                      onReject={async () => {
                        try {
                          await BuyRequest.reject(buyRequest.id!);
                          // Reload buy requests
                          const updated = await BuyRequest.getByConversation(selectedId!);
                          setBuyRequests(updated);
                          // Reload messages to show rejection message
                          const result_messages = await MessageEntity.getMessages(selectedId!);
                          setMessages(result_messages ?? []);
                        } catch (error: any) {
                          alert(error.message || "Failed to reject request");
                        }
                      }}
                      onCancel={async () => {
                        try {
                          await BuyRequest.cancel(buyRequest.id!);
                          // Reload buy requests
                          const updated = await BuyRequest.getByConversation(selectedId!);
                          setBuyRequests(updated);
                          // Reload messages
                          const result_messages = await MessageEntity.getMessages(selectedId!);
                          setMessages(result_messages ?? []);
                        } catch (error: any) {
                          alert(error.message || "Failed to cancel request");
                        }
                      }}
                    />
                  );
                }
                
                // Regular message rendering
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        m.sender_id === currentUser?.id
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "60%",
                        padding: "8px 10px",
                        borderRadius: 16,
                        backgroundColor:
                          m.sender_id === currentUser?.id
                            ? "#dc2626"
                            : "#e5e5e5",
                        color:
                          m.sender_id === currentUser?.id ? "#fff" : "#111",
                        fontSize: 14,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input + send */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e5e5",
                  fontSize: 14,
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: "#666", paddingTop: 40 }}>
            Select a conversation from the left.
          </div>
        )}
      </div>
      
      {/* Transaction List Modal */}
      {showTransactionList && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowTransactionList(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 600,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Transactions</h2>
              <button
                onClick={() => setShowTransactionList(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {transactions.length === 0 ? (
                <p style={{ textAlign: "center", color: "#999", padding: 20 }}>
                  No transactions with this seller
                </p>
              ) : (
                transactions.map((tx) => (
                  <TransactionListItem
                    key={tx.id}
                    transaction={tx}
                    onClose={() => setShowTransactionList(false)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Transaction List Item Component
function TransactionListItem({
  transaction,
  onClose,
}: {
  transaction: TransactionType;
  onClose: () => void;
}) {
  const [item, setItem] = useState<any>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    async function loadItem() {
      try {
        const itemData = await Item.get(transaction.item_id);
        setItem(itemData);
      } catch (error) {
        console.error("Error loading item:", error);
      }
    }
    loadItem();
  }, [transaction.item_id]);
  
  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: 16,
        cursor: "pointer",
      }}
      onClick={() => {
        navigate(`/transactions/${transaction.id}`);
        onClose();
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        {item?.images?.[0] && (
          <img
            src={item.images[0]}
            alt={item.title}
            style={{
              width: 80,
              height: 80,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px 0" }}>
            {item?.title || "Loading..."}
          </h4>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 8px 0" }}>
            ${item?.price || "—"}
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                backgroundColor:
                  transaction.status === "completed" ? "#d1fae5" :
                  transaction.status === "cancelled" ? "#fee2e2" :
                  "#fef3c7",
                color:
                  transaction.status === "completed" ? "#065f46" :
                  transaction.status === "cancelled" ? "#991b1b" :
                  "#92400e",
              }}
            >
              {transaction.status}
            </span>
            {transaction.status === "in_progress" && (
              <span style={{ fontSize: 12, color: "#666" }}>
                {transaction.buyer_confirmed && transaction.seller_confirmed
                  ? "Both confirmed"
                  : transaction.buyer_confirmed
                  ? "Buyer confirmed"
                  : transaction.seller_confirmed
                  ? "Seller confirmed"
                  : "Pending confirmation"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
