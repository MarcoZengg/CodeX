import { useEffect, useState } from "react";
import type { Route } from "./+types/appointments.$itemId";
import { Item, User, Conversation, Transaction } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import { useNavigate, useSearchParams } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";
import { API_URL } from "@/config";
import { fetchWithAuth, getFirebaseToken } from "@/utils/auth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Set up Appointment - BUThrift" },
    { name: "description", content: "Set up meetup details for your transaction" },
  ];
}

export default function AppointmentSetup({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = params.itemId;
  const conversationIdParam = searchParams.get("conversationId");
  
  const [item, setItem] = useState<ItemType | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTransaction, setExistingTransaction] = useState<any>(null);
  
  // Appointment form data
  const [meetupPlace, setMeetupPlace] = useState("");
  const [meetupTime, setMeetupTime] = useState("");
  const [meetupDate, setMeetupDate] = useState("");
  
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        
        // Get current user
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.id && user.id !== "current_user") {
            setCurrentUser(user);
          }
        }
        
        // Load item and seller
        const itemData = await Item.get(itemId);
        setItem(itemData);
        
        if (itemData.seller_id) {
          const sellerData = await User.getById(itemData.seller_id);
          setSeller(sellerData);
        }
        
        // Check for existing transaction if conversationId is provided
        if (conversationIdParam) {
          try {
            const transactions = await Transaction.getAllByConversation(conversationIdParam);
            const inProgressTx = transactions.find(tx => tx.status === "in_progress");
            if (inProgressTx) {
              setExistingTransaction(inProgressTx);
              // Pre-fill with existing appointment details if available
              if (inProgressTx.meetup_time) {
                const date = new Date(inProgressTx.meetup_time);
                setMeetupDate(date.toISOString().split('T')[0]);
                setMeetupTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
              }
              if (inProgressTx.meetup_place) {
                setMeetupPlace(inProgressTx.meetup_place);
              }
            }
          } catch (error) {
            console.error("Error loading existing transaction:", error);
          }
        }
        
        // Pre-fill location if item has one and no existing appointment
        if (itemData.location && !existingTransaction?.meetup_place) {
          setMeetupPlace(itemData.location);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Failed to load item details. Please try again.");
        navigate(createPageUrl("Browse"));
      } finally {
        setIsLoading(false);
      }
    }
    
    if (itemId) {
      load();
    }
  }, [itemId, conversationIdParam, navigate]);
  
  const handleSubmit = async () => {
    if (!currentUser || !item || !seller) return;
    
    // Validate form
    if (!meetupPlace.trim()) {
      alert("Please enter a meetup location");
      return;
    }
    
    if (!meetupDate || !meetupTime) {
      alert("Please select both date and time");
      return;
    }
    
    // Combine date and time
    const dateTimeString = `${meetupDate}T${meetupTime}:00`;
    const meetupDateTime = new Date(dateTimeString);
    
    if (meetupDateTime < new Date()) {
      alert("Please select a future date and time");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let conversationId: string;
      
      // Use conversationId from query params if available, otherwise find/create
      if (conversationIdParam) {
        conversationId = conversationIdParam;
      } else {
        // Find or create conversation for this item
        const existingConvos = await Conversation.filter({
          participant_ids: { op: 'contains', value: currentUser.id! } as any
        });
        
        const existingConvoForItem = existingConvos.find(c => 
          (c.participant1_id === seller.id || c.participant2_id === seller.id) &&
          c.item_id === item.id
        );
        
        if (existingConvoForItem) {
          conversationId = existingConvoForItem.id;
        } else {
          // Determine participant order based on who is setting up
          const isSeller = currentUser.id === seller.id;
          const participant1_id = isSeller ? seller.id : currentUser.id!;
          const participant2_id = isSeller ? (existingConvos.length > 0 ? existingConvos[0].participant2_id : seller.id) : seller.id;
          
          const newConversation = await Conversation.create({
            item_id: item.id!,
            participant1_id: isSeller ? seller.id : currentUser.id!,
            participant2_id: isSeller ? currentUser.id! : seller.id,
          });
          conversationId = newConversation.id;
        }
      }
      
      // Create or update transaction with appointment details
      const token = await getFirebaseToken(false);
      if (!token) throw new Error("You must be logged in.");
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetchWithAuth(`${API_URL}/api/transactions/create-with-appointment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            item_id: item.id,
            conversation_id: conversationId,
            meetup_place: meetupPlace.trim(),
            meetup_time: meetupDateTime.toISOString(),
          }),
          signal: controller.signal, // Add timeout signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to set up appointment: ${response.statusText}`);
        }
        
        const transaction = await response.json();
        
        // Navigate to messages page with conversationId
        const targetConversationId = conversationIdParam || conversationId;
        navigate(`${createPageUrl("Messages")}?conversationId=${targetConversationId}`);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error("Request timed out. The server may be slow. Please try again.");
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Error setting up appointment:", error);
      alert(error.message || "Failed to set up appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!item || !seller || !currentUser) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <p className="text-neutral-600">Item not found or you must be logged in.</p>
          <Button onClick={() => navigate(createPageUrl("Browse"))} className="mt-4">
            Back to Browse
          </Button>
        </div>
      </div>
    );
  }
  
  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  // Get minimum time (if today, current time; otherwise any time)
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Check if we're editing an existing appointment
  const isEditing = existingTransaction && existingTransaction.meetup_time && existingTransaction.meetup_place;
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => {
          if (conversationIdParam) {
            navigate(`${createPageUrl("Messages")}?conversationId=${conversationIdParam}`);
          } else {
            navigate(`/items/${item.id}`);
          }
        }}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {conversationIdParam ? "Back to Messages" : "Back to Item"}
      </Button>
      
      <Card className="border-neutral-200/60">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditing ? "Edit Appointment" : "Set up Appointment"}
          </CardTitle>
          <p className="text-neutral-600 mt-2">
            {isEditing 
              ? "Update the meetup details for this transaction"
              : "Set the meetup details for this transaction"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Item Info */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
            <p className="text-xl font-bold text-red-600">${item.price}</p>
            <p className="text-sm text-neutral-600 mt-1">
              Seller: {seller.display_name}
            </p>
          </div>
          
          {/* Appointment Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="meetup_place" className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                Meetup Location
              </Label>
              <Input
                id="meetup_place"
                placeholder="e.g., Warren Towers Lobby, GSU, Starbucks on Comm Ave..."
                value={meetupPlace}
                onChange={(e) => setMeetupPlace(e.target.value)}
                required
              />
              <p className="text-xs text-neutral-500 mt-1">
                Specify the exact location where you'll meet
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meetup_date" className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="meetup_date"
                  type="date"
                  min={today}
                  value={meetupDate}
                  onChange={(e) => setMeetupDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="meetup_time" className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  Time
                </Label>
                <Input
                  id="meetup_time"
                  type="time"
                  min={meetupDate === today ? currentTime : undefined}
                  value={meetupTime}
                  onChange={(e) => setMeetupTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/items/${item.id}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !meetupPlace.trim() || !meetupDate || !meetupTime}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting 
                ? (isEditing ? "Updating..." : "Setting up...")
                : (isEditing ? "Update" : "Continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

