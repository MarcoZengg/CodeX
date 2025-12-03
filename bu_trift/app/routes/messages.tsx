import { ReviewEntity } from "@/entities/Review";
import type { Review as ReviewType } from "@/entities/Review";
// import ReviewForm from "../components/ReviewForm";
import { useEffect, useState } from "react";
import {
  Conversation,
  Message,
  Transaction as TransactionService,
} from "@/entities";
import { API_URL } from "../config";
import { fetchWithAuth } from "../utils/auth";
import type { Conversation as ConversationType } from "@/entities/Conversation";
import type { User as UserType } from "@/entities/User";
import type { Message as MessageType } from "@/entities/Message";
import type { Transaction as TransactionType } from "@/entities/Transaction";

export function meta() {
  return [
    { title: "Messages - BUTrift" },
    { name: "description", content: "View your conversations" },
  ];
}

// Hard-coded seller user ID for testing the review feature
const SELLER_ID = "a8f2315a-8127-4cb1-9fcc-232e70d6f4d1";

function ReviewTestPanel() {
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Read the "logged-in" user id from localStorage (mocked login)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("userId");
      if (stored) setCurrentUserId(stored);
    }
  }, []);

  // Load all reviews where this SELLER_ID is the reviewee/target
  useEffect(() => {
    setLoading(true);
    setErr(null);

    ReviewEntity.filter({ reviewee_id: SELLER_ID })
      .then((res) => setReviews(res))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (r: ReviewType) => {
    // Append newly created review to the local list
    setReviews((prev) => [...prev, r]);
  };

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  return (
    <div className="mt-10 border-t pt-4">
      <h2 className="text-lg font-semibold mb-1">🔧 Review Test Panel</h2>
      <p className="text-xs text-neutral-500 mb-3">
        (Developer-only section – used to verify the review feature for a fixed
        SELLER_ID)
      </p>

      {loading && (
        <p className="text-sm text-neutral-500">Loading reviews…</p>
      )}
      {err && <p className="text-sm text-red-600">Error: {err}</p>}

      {!loading && !err && (
        <>
          <div className="mb-3 text-sm">
            <div>
              Average rating:{" "}
              {averageRating ? averageRating.toFixed(1) : "N/A"}
            </div>
            <div className="text-xs text-neutral-500">
              {reviewCount} review
              {reviewCount === 1 ? "" : "s"}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {reviews.length === 0 && (
              <div className="text-sm text-neutral-500">No reviews yet.</div>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="border rounded-lg p-2 text-sm">
                <div className="font-semibold">Rating: {r.rating}</div>
                {r.comment && <div>{r.comment}</div>}
                <div className="text-xs text-neutral-500">
                  {new Date(r.created_date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TODO: Re-enable when ReviewForm component is implemented
      {currentUserId && currentUserId !== SELLER_ID && (
        <ReviewForm
          reviewerId={currentUserId}
          revieweeId={SELLER_ID}
          onCreated={handleCreated}
        />
      )}
      */}

      {!currentUserId && (
        <p className="mt-2 text-xs text-neutral-500">
          (Review form is hidden because there is no userId in localStorage.)
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

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Meetup details (time & place)
  const [meetupTime, setMeetupTime] = useState<string | null>(null);
  const [meetupPlace, setMeetupPlace] = useState<string>("");
  const [isEditingMeetup, setIsEditingMeetup] = useState(false);
  const [editMeetupTime, setEditMeetupTime] = useState<string>("");
  const [editMeetupPlace, setEditMeetupPlace] = useState<string>("");

  // Transaction loaded from backend
  const [transaction, setTransaction] = useState<TransactionType | null>(null);

  // Review state (still front-end only for now)
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hasLeftReview, setHasLeftReview] = useState(false);
  const [otherHasLeftReview, setOtherHasLeftReview] = useState(false);
  const [canLeaveReview, setCanLeaveReview] = useState(false); // session-only flag

  // Normalize booleans from the API / DB (true/false, 1/0, "1"/"0", "true"/"false")
  const toBool = (value: unknown) =>
    value === true || value === 1 || value === "1" || value === "true";

  const buyerConfirmed =
    transaction && (transaction as any).buyer_confirmed != null
      ? toBool((transaction as any).buyer_confirmed)
      : false;

  const sellerConfirmed =
    transaction && (transaction as any).seller_confirmed != null
      ? toBool((transaction as any).seller_confirmed)
      : false;

  // Has *this* user confirmed (based on DB flags)?
  const hasUserConfirmed =
    !!transaction &&
    !!currentUser &&
    ((currentUser.id === transaction.buyer_id && buyerConfirmed) ||
      (currentUser.id === transaction.seller_id && sellerConfirmed));

  // Reset review state when switching conversations
  useEffect(() => {
    setRating(null);
    setComment("");
    setHasLeftReview(false);
    setOtherHasLeftReview(false);
    setCanLeaveReview(false); // on new convo or refresh, user must click again
  }, [selectedId]);

  // Load current user from localStorage (set by login / register)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    function loadCurrentUser() {
      setIsLoading(true);
      try {
        const stored = window.localStorage.getItem("currentUser");
        if (!cancelled) {
          if (stored) {
            const parsed: UserType = JSON.parse(stored);
            setCurrentUser(parsed);
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to read currentUser from localStorage:", err);
        if (!cancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load conversations for the current user
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setSelectedId(null);
      return;
    }

    const userId = currentUser.id!;
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/conversations?user_id=${encodeURIComponent(userId)}`,
          {
            method: "GET",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get conversations: ${response.status} ${response.statusText}`
          );
        }

        const data: ConversationType[] = await response.json();

        if (!cancelled) {
          setConversations(data);

          if (data.length > 0) {
            const firstId = data[0].id ?? null;
            setSelectedId(firstId);
          } else {
            setSelectedId(null);
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
        if (!cancelled) {
          setConversations([]);
          setSelectedId(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Load messages for selected conversation
  useEffect(() => {
    async function loadMessages() {
      if (!selectedId) {
        setMessages([]);
        return;
      }
      const result = await Message.filter(
        { conversation_id: selectedId },
        "created_date"
      );
      setMessages(result ?? []);
    }

    loadMessages();
  }, [selectedId]);

  // Sync transaction for selected conversation
  useEffect(() => {
    async function syncTransaction() {
      if (!selectedId || !currentUser) {
        setTransaction(null);
        setMeetupTime(null);
        setMeetupPlace("");
        return;
      }

      const conv = conversations.find((c) => c.id === selectedId);
      if (!conv) return;

      const itemId = (conv as any).item_id ?? "test-item-id";
      const otherId =
        conv.participant_ids?.find((id) => id !== currentUser!.id) ?? "";

      let tx = await TransactionService.getByConversation(selectedId);

      if (!tx) {
        const pickupFromListing =
          (conv as any)?.pickup_location ??
          (conv as any)?.pickup_location_text ??
          "";

        tx = await TransactionService.create({
          item_id: itemId,
          conversation_id: selectedId,
          buyer_id: currentUser!.id!,
          seller_id: otherId,
          meetup_time: null,
          meetup_place: pickupFromListing || null,
        });
      }

      setTransaction(tx);
      setMeetupTime(tx.meetup_time ?? null);
      setMeetupPlace(tx.meetup_place ?? "");
    }

    if (selectedId && currentUser) {
      syncTransaction().catch((e) =>
        console.error("Failed to sync transaction", e)
      );
    }
  }, [selectedId, currentUser, conversations]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !selectedId) return;

    const created = await Message.create({
      conversation_id: selectedId,
      sender_id: currentUser!.id!,
      content: newMessage,
    });

    setMessages((prev) => [...prev, created]);
    setNewMessage("");
  };

  const handleMarkCompleted = async () => {
    if (!currentUser || !selectedId) return;

    try {
      let tx = transaction;

      // If there is no transaction yet, create one on the fly
      if (!tx) {
        const conv = conversations.find((c) => c.id === selectedId);
        if (!conv) return;

        const itemId = (conv as any).item_id ?? "test-item-id";
        const otherId =
          conv.participant_ids?.find((id) => id !== currentUser.id) ?? "";

        const pickupFromListing =
          (conv as any)?.pickup_location ??
          (conv as any)?.pickup_location_text ??
          "";

        tx = await TransactionService.create({
          item_id: itemId,
          conversation_id: selectedId,
          buyer_id: currentUser.id!,
          seller_id: otherId,
          meetup_time: meetupTime ?? null,
          meetup_place: (meetupPlace || pickupFromListing || null) as
            | string
            | null,
        });

        setTransaction(tx);
      }

      // Now mark it as confirmed for this user
      const patch: Partial<TransactionType> = {};

      if (currentUser.id === tx!.buyer_id) {
        patch.buyer_confirmed = true as any;
      } else if (currentUser.id === tx!.seller_id) {
        patch.seller_confirmed = true as any;
      }

      const updated = await TransactionService.update(tx!.id!, patch);
      setTransaction(updated);

      // In this session, unlock the review form (but NOT across refresh)
      setCanLeaveReview(true);
    } catch (e) {
      console.error("Failed to mark transaction as completed", e);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId);

    const handleSubmitReview = async () => {
      if (!rating || !currentUser || !selectedConversation) return;

      // Figure out who we're reviewing.
      // 1) Try conversation.participant_ids
      // 2) Fallback to transaction buyer/seller
      // 3) As a last resort, use the hard-coded SELLER_ID (dev/demo only)
      let otherId: string | null = null;

      if (
        selectedConversation.participant_ids &&
        selectedConversation.participant_ids.length >= 2
      ) {
        otherId =
          selectedConversation.participant_ids.find(
            (id) => id !== currentUser.id
          ) ?? null;
      }

      // Fallback: use the transaction's buyer/seller ids
      if (!otherId && transaction) {
        if (currentUser.id === transaction.buyer_id) {
          otherId = transaction.seller_id ?? null;
        } else if (currentUser.id === transaction.seller_id) {
          otherId = transaction.buyer_id ?? null;
        }
      }

      // Final fallback for now: use SELLER_ID so reviews still work in the demo
      if (!otherId) {
        console.warn(
          "Could not determine other participant for review; falling back to SELLER_ID",
          {
            currentUserId: currentUser.id,
            conversation: selectedConversation,
            transaction,
          }
        );
        otherId = SELLER_ID;
      }

      try {
        await ReviewEntity.create({
          reviewer_id: currentUser.id!,
          reviewee_id: otherId,
          rating,
          comment: comment.trim() || null,
          transaction_id: transaction?.id ?? null,
        } as any);

        setHasLeftReview(true);
        setCanLeaveReview(false); // hide the review form after submitting
        // Optional: reset comment/rating
        // setComment("");
        // setRating(null);
      } catch (err) {
        console.error("Failed to submit review", err);
      }
    };

  // ---------- RENDER ----------

  if (isLoading) {
    return <div style={{ padding: 40 }}>Loading conversations...</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ padding: 40 }}>
        Could not load current user. Try logging out and in again.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Main messages layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 16,
          flex: 1,
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
                c.participant_ids?.find((id) => id !== currentUser!.id) ??
                "Student";
              const name = `User ${otherId.substring(0, 4)}`;
              const isSelected = c.id === selectedId;

              let statusText = "In progress";
              if (isSelected && hasUserConfirmed) {
                if (hasLeftReview && otherHasLeftReview) {
                  statusText = "Reviews exchanged";
                } else if (hasLeftReview) {
                  statusText = "Review left";
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

              {/* Meetup details */}
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
                          meetupTime ? meetupTime.slice(0, 16) : ""
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
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

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <button
                        onClick={async () => {
                          if (!transaction) {
                            setMeetupTime(editMeetupTime || null);
                            setMeetupPlace(editMeetupPlace.trim());
                            setIsEditingMeetup(false);
                            return;
                          }

                          const updated = await TransactionService.update(
                            transaction.id!,
                            {
                              meetup_time: editMeetupTime || null,
                              meetup_place:
                                editMeetupPlace.trim() || null,
                            }
                          );

                          setTransaction(updated);
                          setMeetupTime(updated.meetup_time ?? null);
                          setMeetupPlace(updated.meetup_place ?? "");
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
                        m.sender_id === currentUser!.id
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
                          m.sender_id === currentUser!.id
                            ? "#dc2626"
                            : "#e5e5e5",
                        color:
                          m.sender_id === currentUser!.id
                            ? "#fff"
                            : "#111",
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

              {/* Review flow */}
              <div style={{ marginTop: 16 }}>
                {/* Show "Mark as Completed" until review has been left,
                    and only when review form is NOT open */}
                {!hasLeftReview && !canLeaveReview && (
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
                      onClick={handleMarkCompleted}
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

                {/* Review form: only visible in this session after clicking Mark as Completed */}
                {canLeaveReview && !hasLeftReview && (
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
                      onClick={handleSubmitReview}
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

                {hasUserConfirmed && hasLeftReview && !otherHasLeftReview && (
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

                {hasUserConfirmed && hasLeftReview && otherHasLeftReview && (
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

      {/* Dev-only review testing section for a fixed seller */}
      <ReviewTestPanel />
    </div>
  );
}