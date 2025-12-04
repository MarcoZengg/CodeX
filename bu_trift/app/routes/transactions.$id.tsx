import { useEffect, useState, useRef } from "react";
import type { Route } from "./+types/transactions.$id";
import { Transaction, Item, User } from "@/entities";
import type { Transaction as TransactionType } from "@/entities/Transaction";
import type { Item as ItemType } from "@/entities/Item";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Calendar, MapPin, ArrowLeft } from "lucide-react";
import { WebSocketClient } from "@/utils/websocket";
import { API_URL } from "@/config";

export default function TransactionDetail({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [item, setItem] = useState<ItemType | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const transactionId = params.id;
  
  useEffect(() => {
    let wsClient: WebSocketClient | null = null;
    
    async function load() {
      try {
        // Get current user
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          const user = JSON.parse(storedUser);
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
      } catch (error) {
        console.error("Error loading transaction:", error);
        alert("Failed to load transaction");
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
  
  const isBuyer = currentUser?.id === transaction?.buyer_id;
  const isSeller = currentUser?.id === transaction?.seller_id;
  
  const handleConfirm = async (type: "buyer" | "seller") => {
    if (!transaction) return;
    setIsUpdating(true);
    
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
        // Optionally navigate somewhere
      }
    } catch (error: any) {
      alert(error.message || "Failed to confirm transaction");
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleCancelConfirm = async (type: "buyer" | "seller") => {
    if (!transaction) return;
    setIsUpdating(true);
    
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
    } finally {
      setIsUpdating(false);
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
                {isSeller && !transaction.seller_confirmed && (
                  <Button
                    onClick={() => handleConfirm("seller")}
                    disabled={isUpdating}
                    className="w-full mt-2"
                  >
                    I Confirm
                  </Button>
                )}
                {!isSeller && (
                  <p className="text-sm text-gray-500">
                    {transaction.seller_confirmed ? "Seller has confirmed" : "Waiting for seller..."}
                  </p>
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
                {isBuyer && !transaction.buyer_confirmed && (
                  <Button
                    onClick={() => handleConfirm("buyer")}
                    disabled={isUpdating}
                    className="w-full mt-2"
                  >
                    I Confirm
                  </Button>
                )}
                {!isBuyer && (
                  <p className="text-sm text-gray-500">
                    {transaction.buyer_confirmed ? "Buyer has confirmed" : "Waiting for buyer..."}
                  </p>
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
                {isSeller && !transaction.seller_cancel_confirmed && (
                  <Button
                    onClick={() => handleCancelConfirm("seller")}
                    disabled={isUpdating}
                    variant="destructive"
                    className="w-full mt-2"
                  >
                    I Confirm Cancel
                  </Button>
                )}
                {!isSeller && (
                  <p className="text-sm text-gray-500">
                    {transaction.seller_cancel_confirmed ? "Seller confirmed cancellation" : "Waiting for seller..."}
                  </p>
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
                {isBuyer && !transaction.buyer_cancel_confirmed && (
                  <Button
                    onClick={() => handleCancelConfirm("buyer")}
                    disabled={isUpdating}
                    variant="destructive"
                    className="w-full mt-2"
                  >
                    I Confirm Cancel
                  </Button>
                )}
                {!isBuyer && (
                  <p className="text-sm text-gray-500">
                    {transaction.buyer_cancel_confirmed ? "Buyer confirmed cancellation" : "Waiting for buyer..."}
                  </p>
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

