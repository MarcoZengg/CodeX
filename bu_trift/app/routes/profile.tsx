import { useState, useEffect } from "react";
import type { Route } from "./+types/profile";
import { User, Item, Review } from "@/entities";
import type { User as UserType } from "@/entities/User";
import type { Item as ItemType } from "@/entities/Item";
import type { Review as ReviewType } from "@/entities/Review";
import { Link, useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Edit3, Package, User as UserIcon, LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemGridProps {
  items: ItemType[];
  onDelete?: (id: string) => void;
  onMarkSold?: (id: string) => void;
  onEdit?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
}

function ItemGrid({ items, onDelete, onMarkSold, onEdit, deletingId, updatingId }: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No items yet</h3>
        <p className="text-neutral-600 mb-4">Start selling to see your listings here</p>
        <Link to={createPageUrl("Sell")}>
          <Button className="bg-red-600 hover:bg-red-700">
            List Your First Item
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => {
        if (!item.id) return null; // Guard against undefined ids
        return (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-neutral-200/60">
            <Link to={`/items/${item.id}`} className="block">
              <div className="aspect-square bg-neutral-100 relative overflow-hidden">
                {item.images?.[0] ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-neutral-400" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge variant={item.status === "available" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-neutral-900 mb-2 line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xl font-bold text-red-600">
                  ${item.price}
                </p>
              </CardContent>
            </Link>
            {(onDelete || onMarkSold || onEdit) && (
              <div className="px-4 pb-4 space-y-2">
                {onEdit && (
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(item.id);
                    }}
                  >
                    Edit listing
                  </Button>
                )}
                {onMarkSold && item.status === "available" && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={updatingId === item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMarkSold(item.id);
                    }}
                  >
                    {updatingId === item.id ? "Marking..." : "Mark as sold"}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-700 hover:bg-red-50"
                    disabled={deletingId === item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    {deletingId === item.id ? "Removing..." : "Remove listing"}
                  </Button>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - BUThrift" },
    { name: "description", content: "View your profile and listings" },
  ];
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [userItems, setUserItems] = useState<ItemType[]>([]);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [reviewers, setReviewers] = useState<Record<string, UserType>>({}); // reviewer_id -> User
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Try to load fresh user data from backend first (to get updated rating)
      try {
        const freshUserData = await User.me();
        if (freshUserData) {
          setUser(freshUserData);
          setIsLoggedIn(true);
          localStorage.setItem("currentUser", JSON.stringify(freshUserData));
          
          // Load user's items if user has an ID
          if (freshUserData.id) {
            const items = await Item.filter({ seller_id: freshUserData.id }, "-created_date");
            setUserItems(items);
            
            // Load reviews received by this user (where they are the reviewee)
            try {
              const userReviews = await Review.getByUser(freshUserData.id);
              setReviews(userReviews);
              
              // Load reviewer information for all reviews
              const reviewerIds = [...new Set(userReviews.map(r => r.reviewer_id))];
              const reviewerData: Record<string, UserType> = {};
              for (const reviewerId of reviewerIds) {
                try {
                  const reviewer = await User.getById(reviewerId);
                  if (reviewer) {
                    reviewerData[reviewerId] = reviewer;
                  }
                } catch (error) {
                  console.error(`Error loading reviewer ${reviewerId}:`, error);
                }
              }
              setReviewers(reviewerData);
            } catch (error) {
              console.error("Error loading reviews:", error);
              setReviews([]);
            }
          }
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn("Could not load user from API, falling back to localStorage:", apiError);
      }
      
      // Fallback to localStorage if API call fails
      const storedUser = localStorage.getItem("currentUser");
      
      if (storedUser) {
        try {
          const currentUser = JSON.parse(storedUser) as UserType;
          setUser(currentUser);
          setIsLoggedIn(true);
          
          // Load user's items if user has an ID
          if (currentUser.id) {
            const items = await Item.filter({ seller_id: currentUser.id }, "-created_date");
            setUserItems(items);
            
            // Load reviews received by this user (where they are the reviewee)
            try {
              const userReviews = await Review.getByUser(currentUser.id);
              setReviews(userReviews);
              
              // Load reviewer information for all reviews
              const reviewerIds = [...new Set(userReviews.map(r => r.reviewer_id))];
              const reviewerData: Record<string, UserType> = {};
              for (const reviewerId of reviewerIds) {
                try {
                  const reviewer = await User.getById(reviewerId);
                  if (reviewer) {
                    reviewerData[reviewerId] = reviewer;
                  }
                } catch (error) {
                  console.error(`Error loading reviewer ${reviewerId}:`, error);
                }
              }
              setReviewers(reviewerData);
            } catch (error) {
              console.error("Error loading reviews:", error);
              setReviews([]);
            }
          }
        } catch (parseError) {
          console.error("Error parsing stored user:", parseError);
          setIsLoggedIn(false);
        }
      } else {
        // No user logged in
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = window.confirm("Remove this listing? Buyers will no longer see it.");
    if (!confirmed) return;

    setDeleteError(null);
    setDeletingId(itemId);
    try {
      await Item.delete(itemId);
      setUserItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to remove listing");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditItem = (itemId: string) => {
    navigate(`/items/${itemId}/edit`);
  };

  const handleMarkSold = async (itemId: string) => {
    const confirmed = window.confirm("Mark this listing as sold?");
    if (!confirmed) return;

    setUpdateError(null);
    setUpdatingId(itemId);
    try {
      const updated = await Item.updateStatus(itemId, "sold");
      setUserItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: updated.status } : item))
      );
    } catch (error) {
      console.error("Error updating item status:", error);
      setUpdateError(error instanceof Error ? error.message : "Failed to update listing status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Show login prompt if user is not logged in
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-2xl border-0">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6">
                  <UserIcon className="w-10 h-10 text-red-600" />
                </div>
                
                <h1 className="text-3xl font-bold text-neutral-900 mb-4">
                  Welcome to BUThrift
                </h1>
                
                <p className="text-lg text-neutral-600 mb-8 max-w-md mx-auto">
                  Please sign in to view your profile, manage your listings, and track your sales.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <Link to={createPageUrl("Login")} className="flex-1">
                    <Button className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-lg shadow-lg">
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  
                  <Link to={createPageUrl("Register")} className="flex-1">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 border-red-200 text-red-700 hover:bg-red-50 font-semibold text-lg"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 pt-8 border-t border-neutral-200">
                  <p className="text-sm text-neutral-500 mb-4">
                    Don't have an account yet?
                  </p>
                  <Link to={createPageUrl("Register")}>
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      Join BUThrift for free
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-8 border-neutral-200/60 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-red-600 to-red-700"></div>
            <CardContent className="relative pt-0 pb-8">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                <div className="relative -mt-16">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    {user?.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt={user.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-red-600">
                        {user?.display_name?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                        {user?.display_name || "BU Student"}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                        {user?.is_verified && (
                          <Badge className="bg-green-100 text-green-800">
                            ✓ Verified BU Student
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Link to="/profile/edit">
                      <Button variant="outline" className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {user?.bio && (
                <div className="mt-6">
                  <p className="text-neutral-700">{user.bio}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-neutral-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900">{userItems.length}</div>
                  <div className="text-sm text-neutral-600">Items Listed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neutral-900">{user?.total_sales || 0}</div>
                  <div className="text-sm text-neutral-600">Items Sold</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="text-2xl font-bold text-neutral-900">
                      {user?.rating ? user.rating.toFixed(1) : "5.0"}
                    </div>
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  </div>
                  <div className="text-sm text-neutral-600">Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Listings */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">Active ({userItems.filter(item => item.status === "available").length})</TabsTrigger>
              <TabsTrigger value="sold">Sold ({userItems.filter(item => item.status === "sold").length})</TabsTrigger>
              <TabsTrigger value="all">All ({userItems.length})</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {deleteError}
              </div>
            )}
            {updateError && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {updateError}
              </div>
            )}
            
            <TabsContent value="active" className="mt-6">
              <ItemGrid
                items={userItems.filter(item => item.status === "available")}
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
                onMarkSold={handleMarkSold}
                deletingId={deletingId}
                updatingId={updatingId}
              />
            </TabsContent>
            
            <TabsContent value="sold" className="mt-6">
              <ItemGrid
                items={userItems.filter(item => item.status === "sold")}
                onEdit={handleEditItem}
              />
            </TabsContent>
            
            <TabsContent value="all" className="mt-6">
              <ItemGrid
                items={userItems}
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
                onMarkSold={handleMarkSold}
                deletingId={deletingId}
                updatingId={updatingId}
              />
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">No reviews yet</h3>
                  <p className="text-neutral-600">You haven't received any reviews from other users yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const reviewer = reviewers[review.reviewer_id];
                    const reviewerName = reviewer?.display_name || "Anonymous User";
                    const reviewerImage = reviewer?.profile_image_url || null;
                    
                    return (
                      <Card key={review.id} className="border-neutral-200/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Reviewer Avatar */}
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center border-2 border-red-200 flex-shrink-0 overflow-hidden">
                              {reviewerImage ? (
                                <img
                                  src={reviewerImage}
                                  alt={reviewerName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-red-600 font-bold text-lg">
                                  {reviewerName[0]?.toUpperCase() || "U"}
                                </span>
                              )}
                            </div>
                            
                            {/* Review Content */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-neutral-900">{reviewerName}</h4>
                                  <p className="text-xs text-neutral-500">
                                    {review.created_date ? new Date(review.created_date).toLocaleDateString() : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-neutral-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              
                              {review.comment && (
                                <p className="text-neutral-700 mt-2">{review.comment}</p>
                              )}
                              
                              {review.response && (
                                <div className="mt-3 pl-4 border-l-2 border-neutral-200">
                                  <p className="text-xs text-neutral-500 mb-1">Your Response:</p>
                                  <p className="text-neutral-700">{review.response}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
