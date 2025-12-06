import { useState, useEffect } from "react";
import type { Route } from "./+types/items.$id";
import { Item, User, Conversation, BuyRequest, Transaction } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import type { User as UserType } from "@/entities/User";
import type { Conversation as ConversationType } from "@/entities/Conversation";
import type { BuyRequest as BuyRequestType } from "@/entities/BuyRequest";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, MessageCircle, ShieldCheck, ArrowLeft, ChevronLeft, ChevronRight, Edit3 } from "lucide-react";
import { motion } from "framer-motion";

const conditionColors: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  like_new: "bg-blue-100 text-blue-800",
  good: "bg-yellow-100 text-yellow-800",
  fair: "bg-orange-100 text-orange-800",
  poor: "bg-red-100 text-red-800",
};

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Item Details - BUThrift` },
    { name: "description", content: "View item details" },
  ];
}

export default function ItemDetail({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemType | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [buyRequestStatus, setBuyRequestStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [isRequesting, setIsRequesting] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  
  const itemId = params.id;

  useEffect(() => {
    if (!itemId) {
      setIsLoading(false);
      return;
    }
    loadItemAndSeller(itemId);
    // Get current user from localStorage (actual logged-in user)
    // Only set currentUser if there's a real logged-in user
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Only use if it's a real user (not mock "current_user")
        if (user.id && user.id !== "current_user") {
          setCurrentUser(user);
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
  }, [itemId]);

  const loadItemAndSeller = async (id: string) => {
    setIsLoading(true);
    try {
      const itemData = await Item.get(id);
      if (!itemData.seller_id) {
        throw new Error("Item is missing seller information");
      }
      const userData = await User.getById(itemData.seller_id);
      setItem(itemData);
      if (itemData.seller_id && userData) {
        const sellerData = {
          id: itemData.seller_id,
          display_name: userData.display_name,
          profile_image_url: userData.profile_image_url,
          rating: userData.rating,
          total_sales: userData.total_sales,
          is_verified: userData.is_verified,
        };
        setSeller(sellerData);
      } else {
        console.warn("Seller data missing for item", id);
      }
      
      // Check for existing buy request if user is logged in
      if (currentUser && itemData.seller_id !== currentUser.id) {
        await checkBuyRequestStatus(id);
      }
    } catch (error) {
      console.error("Error loading item details:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkBuyRequestStatus = async (itemId: string) => {
    if (!currentUser || !item) return;
    
    try {
      // Find existing conversation with seller
      const existingConvos = await Conversation.filter({
        participant_ids: { op: 'contains', value: currentUser.id! } as any
      });
      
      for (const conv of existingConvos) {
        const buyRequests = await BuyRequest.getByConversation(conv.id);
        const myRequest = buyRequests.find(r => r.buyer_id === currentUser.id && r.item_id === itemId);
        
        // Check for transactions for this item
        const transactions = await Transaction.getAllByConversation(conv.id);
        const itemTransactions = transactions.filter(tx => tx.item_id === itemId);
        const cancelledTx = itemTransactions.find(tx => tx.status === "cancelled");
        const inProgressTx = itemTransactions.find(tx => tx.status === "in_progress");
        const completedTx = itemTransactions.find(tx => tx.status === "completed");
        
        // If there's an in-progress transaction, show "View Transaction" button
        if (inProgressTx) {
          setBuyRequestStatus("accepted");
          setActiveTransactionId(inProgressTx.id!);
          return;
        }
        
        // If there's a cancelled transaction, allow requesting again (ignore buy request status)
        if (cancelledTx) {
          setBuyRequestStatus("none");
          return;
        }
        
        // If there's a completed transaction, don't allow requesting again
        if (completedTx) {
          setBuyRequestStatus("none");
          return;
        }
        
        if (myRequest) {
          // Only set status for pending or accepted requests
          // For cancelled/rejected, allow requesting again (set to "none")
          if (myRequest.status === "pending" || myRequest.status === "accepted") {
            setBuyRequestStatus(myRequest.status as any);
          } else {
            // Cancelled or rejected - allow requesting again
            setBuyRequestStatus("none");
          }
          return;
        }
      }
      
      setBuyRequestStatus("none");
    } catch (error) {
      console.error("Error checking buy request status:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !seller || !item) return;
    setIsSendingMessage(true);
    try {
        const existingConvos = await Conversation.filter({
            participant_ids: { op: 'contains', value: currentUser.id! } as any
        });

        const existingConvoWithSeller = existingConvos.find(c => 
          (c.participant1_id === seller.id || c.participant2_id === seller.id)
        );

        if (existingConvoWithSeller) {
            navigate(`${createPageUrl("Messages")}?conversationId=${existingConvoWithSeller.id}`);
        } else {
            const newConversation = await Conversation.create({
                item_id: item.id!,
                participant1_id: currentUser.id!,
                participant2_id: seller.id,
            });
            navigate(`${createPageUrl("Messages")}?conversationId=${newConversation.id}`);
        }
    } catch (error) {
        console.error("Error starting conversation:", error);
        alert("Failed to start conversation. Please try again.");
    } finally {
        setIsSendingMessage(false);
    }
  };
  
  const handleRequestToBuy = async () => {
    if (!currentUser || !seller || !item) return;
    setIsRequesting(true);
    
    try {
      // Find existing conversation or create one
      const existingConvos = await Conversation.filter({
        participant_ids: { op: 'contains', value: currentUser.id! } as any
      });
      
      const existingConvoWithSeller = existingConvos.find(c => 
        (c.participant1_id === seller.id || c.participant2_id === seller.id)
      );
      
      const conversation_id = existingConvoWithSeller?.id;
      
      // Create buy request
      const buyRequest = await BuyRequest.create(item.id!, conversation_id);
      setBuyRequestStatus("pending");
      
      // Navigate to messages page
      if (buyRequest.conversation_id) {
        navigate(`${createPageUrl("Messages")}?conversationId=${buyRequest.conversation_id}`);
      }
    } catch (error: any) {
      console.error("Error creating buy request:", error);
      alert(error.message || "Failed to create buy request. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };
  
  useEffect(() => {
    if (item && currentUser && item.seller_id !== currentUser.id) {
      checkBuyRequestStatus(item.id!);
    }
  }, [item, currentUser]);
  
  // Refresh buy request status when page becomes visible (user returns from messages page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && item && currentUser) {
        checkBuyRequestStatus(item.id!);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [item, currentUser]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-32 mb-8" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Item not found</h2>
        <p className="text-neutral-600 mt-2">This item may have been removed or is no longer available.</p>
        <Button onClick={() => navigate(createPageUrl("Browse"))} className="mt-6">Back to Browse</Button>
      </div>
    );
  }

  const isOwner = currentUser && currentUser.id === item.seller_id;

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % (item.images?.length || 1));
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + (item.images?.length || 1)) % (item.images?.length || 1));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="grid md:grid-cols-5 gap-8">
          {/* Image Gallery */}
          <div className="md:col-span-3">
            <div className="aspect-square bg-neutral-100 rounded-2xl relative overflow-hidden shadow-lg">
              {item.images && item.images.length > 0 ? (
                <>
                  <img src={item.images[currentImageIndex]} alt={item.title} className="w-full h-full object-cover" />
                  {item.images.length > 1 && (
                    <>
                      <Button size="icon" variant="ghost" className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50" onClick={prevImage}>
                        <ChevronLeft />
                      </Button>
                      <Button size="icon" variant="ghost" className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50" onClick={nextImage}>
                        <ChevronRight />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400">No image</div>
              )}
            </div>
          </div>

          {/* Item Info */}
          <div className="md:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <Badge className={`${conditionColors[item.condition] || ''} text-sm font-semibold mb-2`}>
                {item.condition.replace('_', ' ')}
              </Badge>
              <h1 className="text-4xl font-bold text-neutral-900">{item.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-4xl font-bold text-red-600 mt-2">${item.price.toFixed(2)}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-700 leading-relaxed">{item.description}</p>
                  {item.location && (
                    <div className="flex items-center gap-2 mt-4 text-neutral-600">
                      <MapPin className="w-4 h-4" />
                      <span>Pickup at: {item.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {seller && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Seller Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl border-2 border-red-200/60">
                        {seller.profile_image_url ? (
                          <img
                            src={seller.profile_image_url}
                            alt={seller.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{seller.display_name[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{seller.display_name}</div>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>{seller.rating} ({seller.total_sales} sales)</span>
                          </div>
                          {seller.is_verified && <ShieldCheck className="w-4 h-4 text-green-600" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 mt-6">
                      {buyRequestStatus === "none" && item.status === "available" && (
                        <>
                          <Button 
                            className="w-full bg-red-600 hover:bg-red-700" 
                            onClick={handleRequestToBuy}
                            disabled={isRequesting || !currentUser || currentUser.id === seller.id}
                          >
                            {isRequesting ? "Requesting..." : "Request to Buy"}
                          </Button>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={handleSendMessage}
                            disabled={isSendingMessage || !currentUser || currentUser.id === seller.id}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {isSendingMessage ? "Starting..." : "Message Seller"}
                          </Button>
                        </>
                      )}
                      {buyRequestStatus === "pending" && (
                        <Button disabled className="w-full" variant="outline">
                          Buy Request Pending
                        </Button>
                      )}
                      {buyRequestStatus === "accepted" && activeTransactionId && (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => navigate(`/transactions/${activeTransactionId}`)}
                        >
                          View Transaction
                        </Button>
                      )}
                      {!currentUser && (
                        <Button 
                          className="w-full bg-red-600 hover:bg-red-700" 
                          onClick={() => navigate(createPageUrl("Login"))}
                        >
                          Log In to Request to Buy
                        </Button>
                      )}
                      {currentUser?.id === seller.id && (
                        <Button disabled className="w-full" variant="outline">
                          This is your item
                        </Button>
                      )}
                      {item.status !== "available" && buyRequestStatus === "none" && !activeTransactionId && currentUser && currentUser.id !== seller.id && (
                        <Button disabled className="w-full" variant="outline">
                          Item is {item.status}
                        </Button>
                      )}
                      {/* Jerry's Edit button - for seller only */}
                      {isOwner && (
                        <Button
                          variant="outline"
                          className="w-full border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => navigate(`/items/${item.id}/edit`)}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit listing
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
