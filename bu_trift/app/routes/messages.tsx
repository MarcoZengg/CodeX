import { useEffect, useState, useRef } from "react";
import type { Route } from "./+types/messages";
import { Conversation, User, Message, Transaction, Item } from "@/entities";
import type { Conversation as ConversationType } from "@/entities/Conversation";
import type { User as UserType } from "@/entities/User";
import type { Message as MessageType } from "@/entities/Message";
import type { Transaction as TransactionType } from "@/entities/Transaction";
import type { Item as ItemType } from "@/entities/Item";
import { MessageEntity } from "@/entities/Message";
import { WebSocketClient } from "@/utils/websocket";
import { API_URL } from "@/config";
import { useNavigate, Link, useSearchParams } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Messages - BUThrift" },
    { name: "description", content: "View your conversations" },
  ];
}

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showingConversationPane, setShowingConversationPane] = useState(false);
  const [participantUsers, setParticipantUsers] = useState<Record<string, UserType>>({});
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Transaction state
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [showTransactionList, setShowTransactionList] = useState(false);
  
  // Item state for the selected conversation
  const [conversationItem, setConversationItem] = useState<ItemType | null>(null);
  
  // Current transaction for this conversation
  const [currentTransaction, setCurrentTransaction] = useState<TransactionType | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleResize = () => setIsMobile(mq.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handleResize);

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
              // Add backward compatibility fields and ensure item_id is present
              const formattedConversations: ConversationType[] = conversations
                .filter((conv) => conv.item_id) // Only include conversations with item_id
                .map((conv) => ({
                  ...conv,
                  item_id: conv.item_id!, // Assert non-null since we filtered
                  participant_ids: [conv.participant1_id, conv.participant2_id],
                  last_message_snippet: conv.last_message_snippet ?? undefined, // Convert null to undefined
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
                } else if (data.type === "transaction_created" || data.type === "transaction_update") {
                  // Handle transaction updates and reload transactions/item
                  const updatedTransaction = data.data;
                  
                  // Reload transactions for the current conversation if it matches
                  if (selectedIdRef.current && updatedTransaction.conversation_id === selectedIdRef.current) {
                    Transaction.getAllByConversation(selectedIdRef.current).then((updated) => {
                      setTransactions(updated);
                      // Find the current in-progress transaction
                      const inProgressTx = updated.find(tx => tx.status === "in_progress");
                      setCurrentTransaction(inProgressTx || null);
                    }).catch(console.error);
                    
                    // Reload item to reflect status changes
                    const selectedConversation = conversations.find(c => c.id === selectedIdRef.current);
                    if (selectedConversation?.item_id) {
                      Item.get(selectedConversation.item_id).then((itemData) => {
                        setConversationItem(itemData);
                      }).catch(console.error);
                    }
                  }
                }
              });
              wsClientRef.current = wsClient;

              if (formattedConversations.length > 0) {
                // Check for conversationId in URL query params
                const conversationIdFromUrl = searchParams.get("conversationId");
                if (conversationIdFromUrl) {
                  // Check if this conversation exists in the list
                  const urlConversation = formattedConversations.find(c => c.id === conversationIdFromUrl);
                  if (urlConversation) {
                    setSelectedId(conversationIdFromUrl);
                    // Clear the query parameter from URL
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.delete("conversationId");
                    navigate(`/messages${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`, { replace: true });
                  } else {
                    // Conversation not found, select first one
                    const firstId = formattedConversations[0].id ?? null;
                    setSelectedId(firstId);
                  }
                } else {
                  // No conversationId in URL, select first conversation
                  const firstId = formattedConversations[0].id ?? null;
                  setSelectedId(firstId);
                }
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
      mq.removeEventListener("change", handleResize);
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, [searchParams, navigate]);

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

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };
    
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, selectedId]);

  // Load transactions and item when conversation is selected
  useEffect(() => {
    async function loadTransactionsAndItem() {
      if (!selectedId || !currentUser) {
        setTransactions([]);
        setConversationItem(null);
        setCurrentTransaction(null);
        return;
      }
      
      try {
        const selectedConversation = conversations.find(c => c.id === selectedId);
        
        // Load transactions for this conversation
        const txs = await Transaction.getAllByConversation(selectedId).catch(() => []);
        setTransactions(txs || []);
        
        // Find the current in-progress transaction for this conversation
        const inProgressTx = (txs || []).find(tx => tx.status === "in_progress");
        setCurrentTransaction(inProgressTx || null);
        
        // Debug logging
        if (inProgressTx) {
          console.log("[Messages] Found in-progress transaction:", {
            id: inProgressTx.id,
            meetup_time: inProgressTx.meetup_time,
            meetup_place: inProgressTx.meetup_place,
            hasAppointment: !!(inProgressTx.meetup_time && inProgressTx.meetup_place)
          });
        } else {
          console.log("[Messages] No in-progress transaction found for conversation:", selectedId);
        }
        
        // Load item for this conversation
        if (selectedConversation?.item_id) {
          try {
            const itemData = await Item.get(selectedConversation.item_id);
            setConversationItem(itemData);
          } catch (error) {
            console.error("Error loading item:", error);
            setConversationItem(null);
          }
        }
      } catch (error) {
        console.error("Error loading transactions/item:", error);
      }
    }
    
    loadTransactionsAndItem();
  }, [selectedId, currentUser, conversations]);

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
        display: isMobile ? "block" : "grid",
        gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
        gap: isMobile ? 0 : 16,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Left: conversation list */}
      <div
      style={{
        display: isMobile && showingConversationPane ? "none" : "block",
        borderRight: "1px solid #e5e5e5",
        paddingRight: isMobile ? 0 : 16,
        marginBottom: isMobile ? 16 : 0,
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
                onClick={() => {
                  setSelectedId(c.id!);
                  if (isMobile) {
                    setShowingConversationPane(true);
                  }
                }}
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
                  <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{name}</div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  📦 {c.item_title ?? "Item"}
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
          flexDirection: "column",
          height: isMobile ? "auto" : "100%",
          boxSizing: "border-box",
          display: isMobile && !showingConversationPane ? "none" : "flex",
        }}
      >
        {selectedConversation ? (
          <>
            {/* Item Card in Header */}
            {conversationItem && (
              <Card style={{ marginBottom: 16, border: "1px solid #e5e5e5" }}>
                <CardContent style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Item Image */}
                    <Link to={`/items/${conversationItem.id}`} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          width: 100,
                          height: 100,
                          backgroundColor: "#f5f5f5",
                          borderRadius: 8,
                          overflow: "hidden",
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      >
                        {conversationItem.images?.[0] ? (
                          <img
                            src={conversationItem.images[0]}
                            alt={conversationItem.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Package style={{ width: 32, height: 32, color: "#999" }} />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Item Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/items/${conversationItem.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            marginBottom: 4,
                            color: "#111",
                            cursor: "pointer",
                          }}
                        >
                          {conversationItem.title}
                        </h3>
                      </Link>
                      
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                        {conversationItem.status === "reserved" && (
                          <Badge style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none" }}>
                            Reserved
                          </Badge>
                        )}
                        {conversationItem.condition && (
                          <Badge style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "none" }}>
                            {conversationItem.condition.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      
                      <p
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#dc2626",
                          margin: "4px 0",
                        }}
                      >
                        ${conversationItem.price}
                      </p>
                      
                      {/* Appointment Info */}
                      {currentTransaction && currentTransaction.meetup_time && currentTransaction.meetup_place && (
                        <div style={{ marginTop: 12, padding: 8, backgroundColor: "#f0f9ff", borderRadius: 6, border: "1px solid #bae6fd" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", marginBottom: 4 }}>
                            📅 Appointment Scheduled
                          </div>
                          <div style={{ fontSize: 12, color: "#0c4a6e", marginBottom: 2 }}>
                            📍 {currentTransaction.meetup_place}
                          </div>
                          <div style={{ fontSize: 12, color: "#0c4a6e" }}>
                            🕐 {new Date(currentTransaction.meetup_time).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Removed Action Buttons - moved to messages header */}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Messages Header with Title and Appointment Buttons */}
            {selectedConversation && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                {/* Left: Conversation Title */}
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    Conversation about {conversationItem?.title || "this item"}
                  </h2>
                  {selectedConversation && (
                    <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                      {(() => {
                        const otherId = selectedConversation.participant_ids?.find((id) => id !== currentUser?.id);
                        const otherUser = otherId ? participantUsers[otherId] : null;
                        return otherUser?.display_name || `User ${otherId?.substring(0, 8)}`;
                      })()}
                    </div>
                  )}
                </div>

                {/* Right: Appointment Buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Show "Set up appointment" or "Edit appointment" based on whether appointment is set */}
                  {currentUser && 
                   conversationItem &&
                   (conversationItem.status === "available" || conversationItem.status === "reserved") && (
                    <>
                      {/* If appointment is not set, show "Set up appointment" */}
                      {(!currentTransaction || !currentTransaction.meetup_time || !currentTransaction.meetup_place) && (
                        <button
                          onClick={() => navigate(`/appointments/${conversationItem.id}${selectedId ? `?conversationId=${selectedId}` : ''}`)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Set up appointment
                        </button>
                      )}
                      
                      {/* If appointment is set, show "Edit appointment" and "Complete Transaction" */}
                      {currentTransaction && currentTransaction.meetup_time && currentTransaction.meetup_place && (
                        <>
                          <button
                            onClick={() => navigate(`/appointments/${conversationItem.id}${selectedId ? `?conversationId=${selectedId}` : ''}`)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              border: "none",
                              backgroundColor: "#dc2626",
                              color: "#fff",
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Edit appointment
                          </button>
                          
                          <button
                            onClick={() => navigate(`/transactions/${currentTransaction.id}`)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              border: "none",
                              backgroundColor: "#16a34a",
                              color: "#fff",
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Complete Transaction
                          </button>
                        </>
                      )}
                    </>
                  )}
                  
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    Transactions {transactions.length > 0 ? `(${transactions.length})` : ""}
                  </button>
                  
                  {isMobile && (
                    <button
                      onClick={() => setShowingConversationPane(false)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #e5e5e5",
                        backgroundColor: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ← Back
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages list */}
            <div
              ref={messagesContainerRef}
              style={{
                flex: 1,
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 12,
                overflowY: "auto",
                maxHeight: isMobile ? "60vh" : "calc(100vh - 260px)",
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
