import { useEffect, useState, useRef } from "react";
import type { Route } from "./+types/messages";
import { Conversation, User, Message } from "@/entities";
import type { Conversation as ConversationType } from "@/entities/Conversation";
import type { User as UserType } from "@/entities/User";
import type { Message as MessageType } from "@/entities/Message";
import { MessageEntity } from "@/entities/Message";
import { WebSocketClient } from "@/utils/websocket";
import { API_URL } from "@/config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Messages - BUTrift" },
    { name: "description", content: "View your conversations" },
  ];
}

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantUsers, setParticipantUsers] = useState<Record<string, UserType>>({});

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  // Mock meetup details (time & place) – front-end only for now
  const [meetupTime, setMeetupTime] = useState<string | null>(null);
  const [meetupPlace, setMeetupPlace] = useState<string>("");
  const [isEditingMeetup, setIsEditingMeetup] = useState(false);
  const [editMeetupTime, setEditMeetupTime] = useState<string>("");
  const [editMeetupPlace, setEditMeetupPlace] = useState<string>("");


  // Mock transaction + review state – front-end only
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hasLeftReview, setHasLeftReview] = useState(false);
  const [otherHasLeftReview, setOtherHasLeftReview] = useState(false);

  // Reset mock states when switching conversations
  // + initialize meetupPlace from listing's pickup location if available
  useEffect(() => {
    setMeetupTime(null);
    setIsCompleted(false);
    setRating(null);
    setComment("");
    setHasLeftReview(false);
    setOtherHasLeftReview(false);

    const conv = conversations.find((c) => c.id === selectedId);

    const pickupFromListing =
      (conv as any)?.pickup_location ??
      (conv as any)?.pickup_location_text ??
      "";

    setMeetupPlace(pickupFromListing || "");
  }, [selectedId, conversations]);

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
                        return {
                          ...conv,
                          last_message_at: newMsg.created_date,
                          last_message_snippet: newMsg.content.substring(0, 50),
                        };
                      }
                      return conv;
                    });
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
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        // Fallback to empty array on error
        setMessages([]);
      }
    }

    loadMessages();
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
        <h2 style={{ fontWeight: 700, marginBottom: 16 }}>Inbox</h2>
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

            // Simple mock status based on isCompleted/hasLeftReview – per conversation
            // For now, we only show status for the selected conversation
            let statusText = "In progress";
            if (isSelected && isCompleted) {
              if (hasLeftReview && otherHasLeftReview) {
                statusText = "Reviews exchanged";
              } else if (hasLeftReview) {
                statusText = "Waiting for other person";
              } else {
                statusText = "Completed — review pending";
              }
            }

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
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 4,
                    fontSize: 14,
                  }}
                >
                  {name}
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
                {isSelected && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#dc2626",
                    }}
                  >
                    {statusText}
                  </div>
                )}
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
            <div style={{ marginBottom: 16 }}>
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

            {/* Meetup details (time & place) */}
            <div
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Meetup details
              </div>

              {!isEditingMeetup ? (
                <>
                  <div style={{ fontSize: 13, marginBottom: 2 }}>
                    Time:{" "}
                    {meetupTime
                      ? new Date(meetupTime).toLocaleString()
                      : "Not set yet"}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    Place: {meetupPlace || "Not set yet"}
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingMeetup(true);
                      setEditMeetupTime(
                        meetupTime
                          ? meetupTime.slice(0, 16) // for datetime-local
                          : ""
                      );
                      setEditMeetupPlace(meetupPlace || "");
                    }}
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
                    Set / Edit meetup
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13 }}>
                    Time
                    <input
                      type="datetime-local"
                      value={editMeetupTime}
                      onChange={(e) => setEditMeetupTime(e.target.value)}
                      style={{
                        display: "block",
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #e5e5e5",
                        fontSize: 13,
                        width: "100%",
                      }}
                    />
                  </label>

                  <label style={{ fontSize: 13 }}>
                    Place
                    <input
                      type="text"
                      placeholder="e.g., Warren Towers Lobby"
                      value={editMeetupPlace}
                      onChange={(e) => setEditMeetupPlace(e.target.value)}
                      style={{
                        display: "block",
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #e5e5e5",
                        fontSize: 13,
                        width: "100%",
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => {
                        if (editMeetupTime) {
                          setMeetupTime(editMeetupTime);
                        } else {
                          setMeetupTime(null);
                        }
                        setMeetupPlace(editMeetupPlace.trim());
                        setIsEditingMeetup(false);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingMeetup(false)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #e5e5e5",
                        backgroundColor: "#fff",
                        color: "#444",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      m.sender_id === currentUser.id
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
                        m.sender_id === currentUser.id
                          ? "#dc2626"
                          : "#e5e5e5",
                      color:
                        m.sender_id === currentUser.id ? "#fff" : "#111",
                      fontSize: 14,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
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

            {/* Mock: transaction complete + 5-star review */}
            <div style={{ marginTop: 16 }}>
              {/* Step 1: mark as completed */}
              {!isCompleted && (
                <div
                  style={{
                    border: "1px solid #e5e5e5",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: "#444",
                      marginBottom: 8,
                    }}
                  >
                    Mark this transaction as complete to leave a review.
                  </div>
                  <button
                    onClick={() => {
                      setIsCompleted(true);
                      // In real implementation, this would update Transaction in backend
                    }}
                    style={{
                      padding: "8px 14px",
                      backgroundColor: "#dc2626",
                      color: "white",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Mark as Completed
                  </button>
                </div>
              )}

              {/* Step 2: leave review after completion */}
              {isCompleted && !hasLeftReview && (
                <div
                  style={{
                    border: "1px solid #e5e5e5",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: "#444",
                      marginBottom: 8,
                    }}
                  >
                    How was your experience? Leave a short review.
                  </div>

                  {/* Stars */}
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRating(r)}
                        style={{
                          fontSize: 20,
                          color:
                            rating !== null && r <= rating
                              ? "#facc15"
                              : "#ccc",
                          cursor: "pointer",
                          background: "none",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Write a short comment (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 60,
                      padding: 8,
                      borderRadius: 8,
                      border: "1px solid #e5e5e5",
                      fontSize: 13,
                      marginBottom: 8,
                      resize: "vertical",
                    }}
                  />

                  <button
                    onClick={() => {
                      if (!rating) return;
                      setHasLeftReview(true);
                      // In real implementation, this would create a Review in backend
                    }}
                    style={{
                      padding: "8px 14px",
                      backgroundColor: "#dc2626",
                      color: "white",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Submit Review
                  </button>
                </div>
              )}

              {/* Step 3: waiting for the other person's review */}
              {isCompleted && hasLeftReview && !otherHasLeftReview && (
                <div
                  style={{
                    border: "1px solid #e5e5e5",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 12,
                    fontSize: 14,
                    color: "#555",
                    backgroundColor: "#fffbe6",
                  }}
                >
                  You left a review. The other person can now review you.
                </div>
              )}

              {/* Step 4: both reviews done (for demo, you can manually toggle otherHasLeftReview in code) */}
              {isCompleted && hasLeftReview && otherHasLeftReview && (
                <div
                  style={{
                    border: "1px solid #a3e635",
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: "#ecfccb",
                    color: "#3f6212",
                    fontWeight: 600,
                  }}
                >
                  Reviews exchanged for this transaction.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: "#666", paddingTop: 40 }}>
            Select a conversation from the left.
          </div>
        )}
      </div>
    </div>
  );
}
