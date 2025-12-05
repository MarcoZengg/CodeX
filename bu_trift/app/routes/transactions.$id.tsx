import { useEffect, useState, useRef } from "react";
import type { Route } from "./+types/transactions.$id";
import { Transaction, Item, User, Review } from "@/entities";
import type { Transaction as TransactionType } from "@/entities/Transaction";
import type { Item as ItemType } from "@/entities/Item";
import type { Review as ReviewType } from "@/entities/Review";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Calendar, MapPin, ArrowLeft, Star, Clock, AlertCircle } from "lucide-react";
import { WebSocketClient } from "@/utils/websocket";
import { API_URL } from "@/config";

export default function TransactionDetail({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [item, setItem] = useState<ItemType | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [myReview, setMyReview] = useState<ReviewType | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState<"buyer" | "seller" | "buyer_cancel" | "seller_cancel" | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const transactionId = params.id;
  
  useEffect(() => {
    let wsClient: WebSocketClient | null = null;
    
    async function load() {
      try {
        // Get current user
        let user: any = null;
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          user = JSON.parse(storedUser);
          setCurrentUser(user);
          
          // Connect WebSocket for real-time updates
          const token = localStorage.getItem("firebaseToken");
          if (user.id && token) {
            wsClient = new WebSocketClient(user.id);
            
            // Set up message handler BEFORE connecting
            wsClient.onMessage((data) => {
              console.log("[Transaction Page] WebSocket message received:", data.type, data);
              // Handle transaction updates
              if (data.type === "transaction_update" || data.type === "transaction_created") {
                const updatedTx = data.data;
                console.log("[Transaction Page] Transaction update - received ID:", updatedTx.id, "current page ID:", transactionId);
                // Only update if it's for this transaction
                if (updatedTx.id === transactionId) {
                  console.log("[Transaction Page] ✅ IDs match! Updating transaction state");
                  setTransaction(updatedTx);
                  // Reload item if status changed
                  if (updatedTx.status === "completed" || updatedTx.status === "cancelled") {
                    Item.get(updatedTx.item_id).then(setItem).catch(console.error);
                  }
                  // Reload reviews if transaction completed - non-blocking
                  if (updatedTx.status === "completed") {
                    Review.getByTransaction(updatedTx.id).then((revs) => {
                      setReviews(revs);
                      // Get current user from state
                      const storedUser = localStorage.getItem("currentUser");
                      if (storedUser) {
                        const currentUserObj = JSON.parse(storedUser);
                        const existingReview = revs.find(r => r.reviewer_id === currentUserObj.id);
                        setMyReview(existingReview || null);
                      }
                    }).catch((error) => {
                      console.error("Error loading reviews in WebSocket handler (non-blocking):", error);
                      // Continue - reviews are optional
                    });
                  }
                } else {
                  console.log("[Transaction Page] ❌ ID mismatch - received:", updatedTx.id, "expected:", transactionId);
                }
              } else {
                console.log("[Transaction Page] Ignoring message type:", data.type);
              }
            });
            
            // Now connect (handler is already set)
            wsClient.connect(API_URL, token);
            wsClientRef.current = wsClient;
            
            // Check connection status after a short delay
            setTimeout(() => {
              if (wsClientRef.current) {
                const isConnected = wsClientRef.current.isConnected();
                console.log("WebSocket connection status:", isConnected ? "Connected" : "Not connected");
                if (!isConnected) {
                  console.warn("WebSocket not connected - real-time updates may not work");
                }
              }
            }, 1000);
            
            console.log("WebSocket connection initiated for transaction page, user:", user.id, "transaction:", transactionId);
          } else {
            console.warn("Cannot connect WebSocket - missing user.id or token");
          }
        }
        
        // Load transaction
        const tx = await Transaction.get(transactionId);
        setTransaction(tx);
        
        // Load item
        const itemData = await Item.get(tx.item_id);
        setItem(itemData);
        
        // Load other user (buyer loads seller, seller loads buyer)
        // Get user again to ensure it's available (in case it wasn't loaded earlier)
        if (!user) {
          const storedUserAgain = localStorage.getItem("currentUser");
          if (storedUserAgain) {
            user = JSON.parse(storedUserAgain);
            setCurrentUser(user);
          }
        }
        
        if (user && user.id) {
          const otherUserId = user.id === tx.buyer_id ? tx.seller_id : tx.buyer_id;
          try {
            const otherUserData = await User.getById(otherUserId);
            setOtherUser(otherUserData);
          } catch (error) {
            console.error("Error loading other user:", error);
            // Continue loading even if other user fails
          }
          
          // Load reviews for this transaction (if completed) - non-blocking
          if (tx.status === "completed") {
            try {
              const transactionReviews = await Review.getByTransaction(transactionId);
              setReviews(transactionReviews);
              
              // Check if current user has already reviewed
              const existingReview = transactionReviews.find(r => r.reviewer_id === user.id);
              if (existingReview) {
                setMyReview(existingReview);
              }
            } catch (error) {
              console.error("Error loading reviews (non-blocking):", error);
              // Continue - reviews are optional
              setReviews([]);
            }
          }
        }
      } catch (error: any) {
        console.error("Error loading transaction:", error);
        const errorMessage = error?.message || "Unknown error";
        alert(`Failed to load transaction: ${errorMessage}`);
        navigate(createPageUrl("Messages"));
      }
    }
    
    load();
    
    // Cleanup: disconnect WebSocket on unmount
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [transactionId, navigate]);

  // Reload reviews when transaction completes
  useEffect(() => {
    if (transaction?.status === "completed" && currentUser?.id) {
      loadReviews();
    }
  }, [transaction?.status, transaction?.id, currentUser?.id]);

  // Reload other user when transaction changes
  useEffect(() => {
    async function loadOtherUserData() {
      if (transaction && currentUser?.id && !otherUser) {
        const otherUserId = currentUser.id === transaction.buyer_id ? transaction.seller_id : transaction.buyer_id;
        try {
          const otherUserData = await User.getById(otherUserId);
          setOtherUser(otherUserData);
        } catch (error) {
          console.error("Error loading other user:", error);
        }
      }
    }
    loadOtherUserData();
  }, [transaction?.id, currentUser?.id, transaction?.buyer_id, transaction?.seller_id]);
  
  const isBuyer = currentUser?.id === transaction?.buyer_id;
  const isSeller = currentUser?.id === transaction?.seller_id;
  
  const handleConfirm = async (type: "buyer" | "seller") => {
    if (!transaction) return;
    setIsUpdating(true);
    setJustConfirmed(type === "buyer" ? "buyer" : "seller");
    
    try {
      const update: Partial<TransactionType> = {};
      if (type === "buyer") {
        update.buyer_confirmed = true;
      } else {
        update.seller_confirmed = true;
      }
      
      const updated = await Transaction.update(transaction.id!, update);
      setTransaction(updated);
      
      if (updated.status === "completed") {
        alert("Transaction completed! Item marked as sold.");
        // Reload reviews when transaction completes
        setTimeout(() => {
          loadReviews();
        }, 500);
      }
    } catch (error: any) {
      alert(error.message || "Failed to confirm transaction");
      setJustConfirmed(null);
    } finally {
      setIsUpdating(false);
      // Clear confirmation feedback after 3 seconds
      setTimeout(() => setJustConfirmed(null), 3000);
    }
  };
  
  const handleCancelConfirm = async (type: "buyer" | "seller") => {
    if (!transaction) return;
    setIsUpdating(true);
    setJustConfirmed(type === "buyer" ? "buyer_cancel" : "seller_cancel");
    
    try {
      const update: Partial<TransactionType> = {};
      if (type === "buyer") {
        update.buyer_cancel_confirmed = true;
      } else {
        update.seller_cancel_confirmed = true;
      }
      
      const updated = await Transaction.update(transaction.id!, update);
      setTransaction(updated);
      
      if (updated.status === "cancelled") {
        alert("Transaction cancelled! Item marked as available.");
      }
    } catch (error: any) {
      alert(error.message || "Failed to confirm cancellation");
      setJustConfirmed(null);
    } finally {
      setIsUpdating(false);
      // Clear confirmation feedback after 3 seconds
      setTimeout(() => setJustConfirmed(null), 3000);
    }
  };

  const loadReviews = async () => {
    if (!transaction || transaction.status !== "completed") return;
    try {
      const transactionReviews = await Review.getByTransaction(transaction.id!);
      setReviews(transactionReviews);
      
      // Check if current user has already reviewed
      if (currentUser) {
        const existingReview = transactionReviews.find(r => r.reviewer_id === currentUser.id);
        if (existingReview) {
          setMyReview(existingReview);
        } else {
          setMyReview(null);
        }
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!transaction || !currentUser || reviewRating < 1 || reviewRating > 5) return;
    
    setIsSubmittingReview(true);
    try {
      const newReview = await Review.create({
        transaction_id: transaction.id!,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      
      setMyReview(newReview);
      setReviews([...reviews, newReview]);
      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      
      // Reload other user to get updated rating (they received the review)
      if (otherUser) {
        try {
          const updatedOtherUser = await User.getById(otherUser.id);
          setOtherUser(updatedOtherUser);
        } catch (error) {
          console.error("Error reloading other user:", error);
        }
      }
      
      // Reload current user's data to get updated rating (in case they received a review)
      if (currentUser?.id) {
        try {
          // Reload reviews to check if current user received a review
          const updatedReviews = await Review.getByTransaction(transaction.id!);
          setReviews(updatedReviews);
          
          // Check if current user received a review
          const reviewForCurrentUser = updatedReviews.find(r => r.reviewee_id === currentUser.id);
          if (reviewForCurrentUser) {
            // Current user received a review, reload their data to get updated rating
            const updatedCurrentUser = await User.me();
            if (updatedCurrentUser) {
              setCurrentUser(updatedCurrentUser);
              localStorage.setItem("currentUser", JSON.stringify(updatedCurrentUser));
            }
          }
        } catch (error) {
          console.error("Error reloading current user data:", error);
        }
      }
      
      alert("Review submitted successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  if (!transaction || !item) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div>Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      
      <h1 className="text-2xl font-bold mb-6">Transaction Details</h1>
      
      {/* Item Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {item.images && item.images[0] && (
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
                onClick={() => navigate(`/items/${item.id}`)}
              />
            )}
            <div className="flex-1">
              <h3 
                className="text-lg font-semibold cursor-pointer hover:underline"
                onClick={() => navigate(`/items/${item.id}`)}
              >
                {item.title}
              </h3>
              <p className="text-gray-600">{item.description}</p>
              <p className="text-xl font-bold mt-2">${item.price}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Transaction Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Transaction Status</h3>
            <Badge variant={
              transaction.status === "completed" ? "default" :
              transaction.status === "cancelled" ? "secondary" :
              "outline"
            }>
              {transaction.status}
            </Badge>
          </div>
          
          {/* Meetup Details */}
          {transaction.meetup_time && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">Meetup Time:</span>
              </div>
              <p>{new Date(transaction.meetup_time).toLocaleString()}</p>
            </div>
          )}
          
          {transaction.meetup_place && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold">Meetup Place:</span>
              </div>
              <p>{transaction.meetup_place}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Confirmations */}
      {transaction.status === "in_progress" && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Confirmations</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Seller Confirmation */}
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Seller Confirmation</span>
                  {transaction.seller_confirmed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {isSeller ? (
                  transaction.seller_confirmed ? (
                    <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-700">
                            You have confirmed
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Waiting for buyer to confirm...
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleConfirm("seller")}
                        disabled={isUpdating}
                        className={`w-full mt-2 ${justConfirmed === "seller" ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        {justConfirmed === "seller" ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirmed!
                          </>
                        ) : isUpdating ? (
                          "Confirming..."
                        ) : (
                          "I Confirm"
                        )}
                      </Button>
                      {justConfirmed === "seller" && (
                        <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-green-700">
                              ✓ You have confirmed the transaction
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className={`mt-2 p-3 rounded-lg ${transaction.seller_confirmed ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    <div className="flex items-center gap-2">
                      {transaction.seller_confirmed ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-green-700">
                              Seller has confirmed
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              The seller confirmed the transaction
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-pulse" />
                          <div>
                            <p className="text-sm font-semibold text-yellow-800">
                              Waiting for seller...
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              The seller needs to confirm to complete the transaction
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Buyer Confirmation */}
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Buyer Confirmation</span>
                  {transaction.buyer_confirmed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {isBuyer ? (
                  transaction.buyer_confirmed ? (
                    <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-700">
                            You have confirmed
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Waiting for seller to confirm...
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleConfirm("buyer")}
                        disabled={isUpdating}
                        className={`w-full mt-2 ${justConfirmed === "buyer" ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        {justConfirmed === "buyer" ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirmed!
                          </>
                        ) : isUpdating ? (
                          "Confirming..."
                        ) : (
                          "I Confirm"
                        )}
                      </Button>
                      {justConfirmed === "buyer" && (
                        <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-green-700">
                              ✓ You have confirmed the transaction
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className={`mt-2 p-3 rounded-lg ${transaction.buyer_confirmed ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    <div className="flex items-center gap-2">
                      {transaction.buyer_confirmed ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-green-700">
                              Buyer has confirmed
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              The buyer confirmed the transaction
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-pulse" />
                          <div>
                            <p className="text-sm font-semibold text-yellow-800">
                              Waiting for buyer...
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              The buyer needs to confirm to complete the transaction
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {transaction.buyer_confirmed && transaction.seller_confirmed && (
              <p className="text-center text-green-600 font-semibold mt-4">
                Both parties confirmed! Transaction will complete automatically.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Cancellation Section */}
      {transaction.status === "in_progress" && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Transaction</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Seller Cancel Confirmation */}
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Seller Cancellation</span>
                  {transaction.seller_cancel_confirmed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {isSeller ? (
                  transaction.seller_cancel_confirmed ? (
                    <div className="mt-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-orange-700">
                            You have confirmed cancellation
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            Waiting for buyer to confirm cancellation...
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleCancelConfirm("seller")}
                        disabled={isUpdating}
                        variant="destructive"
                        className={`w-full mt-2 ${justConfirmed === "seller_cancel" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                      >
                        {justConfirmed === "seller_cancel" ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Cancellation Confirmed!
                          </>
                        ) : isUpdating ? (
                          "Confirming..."
                        ) : (
                          "I Confirm Cancel"
                        )}
                      </Button>
                      {justConfirmed === "seller_cancel" && (
                        <div className="mt-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-orange-700">
                              ✓ You have confirmed cancellation
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className={`mt-2 p-3 rounded-lg ${transaction.seller_cancel_confirmed ? "bg-orange-50 border border-orange-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    <div className="flex items-center gap-2">
                      {transaction.seller_cancel_confirmed ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-orange-700">
                              Seller confirmed cancellation
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              The seller confirmed cancellation of this transaction
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-pulse" />
                          <div>
                            <p className="text-sm font-semibold text-yellow-800">
                              Waiting for seller...
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              The seller needs to confirm cancellation
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Buyer Cancel Confirmation */}
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Buyer Cancellation</span>
                  {transaction.buyer_cancel_confirmed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {isBuyer ? (
                  transaction.buyer_cancel_confirmed ? (
                    <div className="mt-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-orange-700">
                            You have confirmed cancellation
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            Waiting for seller to confirm cancellation...
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleCancelConfirm("buyer")}
                        disabled={isUpdating}
                        variant="destructive"
                        className={`w-full mt-2 ${justConfirmed === "buyer_cancel" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                      >
                        {justConfirmed === "buyer_cancel" ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Cancellation Confirmed!
                          </>
                        ) : isUpdating ? (
                          "Confirming..."
                        ) : (
                          "I Confirm Cancel"
                        )}
                      </Button>
                      {justConfirmed === "buyer_cancel" && (
                        <div className="mt-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-orange-700">
                              ✓ You have confirmed cancellation
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className={`mt-2 p-3 rounded-lg ${transaction.buyer_cancel_confirmed ? "bg-orange-50 border border-orange-200" : "bg-yellow-50 border border-yellow-200"}`}>
                    <div className="flex items-center gap-2">
                      {transaction.buyer_cancel_confirmed ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-orange-700">
                              Buyer confirmed cancellation
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              The buyer confirmed cancellation of this transaction
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-pulse" />
                          <div>
                            <p className="text-sm font-semibold text-yellow-800">
                              Waiting for buyer...
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              The buyer needs to confirm cancellation
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {transaction.buyer_cancel_confirmed && transaction.seller_cancel_confirmed && (
              <p className="text-center text-red-600 font-semibold mt-4">
                Both parties confirmed cancellation! Transaction will be cancelled and item will be marked as available.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {transaction.status === "completed" && (
        <>
          <Card>
            <CardContent className="p-4">
              <p className="text-center text-green-600 font-semibold">
                ✓ Transaction Completed!
              </p>
              <p className="text-center text-sm text-gray-500 mt-2">
                Completed on {transaction.completed_date ? new Date(transaction.completed_date).toLocaleString() : ""}
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          {currentUser && otherUser && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>
                  {myReview ? `Your Review of ${otherUser.display_name}` : `Leave a Review for ${otherUser.display_name}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {myReview ? (
                  // Show existing review
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= myReview.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(myReview.created_date!).toLocaleDateString()}
                      </span>
                    </div>
                    {myReview.comment && (
                      <p className="text-gray-700">{myReview.comment}</p>
                    )}
                    {myReview.response && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-500 mb-1">
                          {otherUser.display_name}'s Response:
                        </p>
                        <p className="text-gray-700">{myReview.response}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Show review form
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rating" className="text-sm font-semibold mb-2 block">
                        Rating (1-5 stars)
                      </Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-8 h-8 cursor-pointer transition-colors ${
                                star <= reviewRating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300 hover:text-yellow-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {reviewRating} {reviewRating === 1 ? "star" : "stars"}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="comment" className="text-sm font-semibold mb-2 block">
                        Comment (Optional)
                      </Label>
                      <Textarea
                        id="comment"
                        placeholder="Share your experience with this transaction..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    
                    <Button
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview || reviewRating < 1 || reviewRating > 5}
                      className="w-full"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Display Other User's Review (if they reviewed you) */}
          {currentUser && otherUser && reviews.length > 0 && (
            <>
              {reviews
                .filter(r => r.reviewee_id === currentUser.id)
                .map((review) => {
                  // The reviewer is always the other user in this transaction
                  return (
                    <Card key={review.id} className="mt-4">
                      <CardHeader>
                        <CardTitle>{otherUser.display_name}'s Review of You</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= review.rating
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.created_date!).toLocaleDateString()}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700">{review.comment}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </>
          )}
        </>
      )}
      
      {transaction.status === "cancelled" && (
        <Card>
          <CardContent className="p-4">
            <p className="text-center text-red-600 font-semibold">
              ✗ Transaction Cancelled
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Cancelled on {transaction.completed_date ? new Date(transaction.completed_date).toLocaleString() : ""}
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Item has been marked as available.
            </p>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-6">
        <Button
          onClick={() => navigate(`${createPageUrl("Messages")}?conversationId=${transaction.conversation_id}`)}
          variant="outline"
        >
          Back to Conversation
        </Button>
      </div>
    </div>
  );
}

