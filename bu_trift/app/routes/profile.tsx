import { useState, useEffect } from "react";
import type { Route } from "./+types/profile";
import { User, Item } from "@/entities";
import type { User as UserType } from "@/entities/User";
import type { Item as ItemType } from "@/entities/Item";
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
}

function ItemGrid({ items }: ItemGridProps) {
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
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link key={item.id} to={`/items/${item.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-neutral-200/60">
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
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - BUTrift" },
    { name: "description", content: "View your profile and listings" },
  ];
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [userItems, setUserItems] = useState<ItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get user from localStorage (stored after login/register)
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
                  Welcome to BUTrift
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
                      Join BUTrift for free
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active ({userItems.filter(item => item.status === "available").length})</TabsTrigger>
              <TabsTrigger value="sold">Sold ({userItems.filter(item => item.status === "sold").length})</TabsTrigger>
              <TabsTrigger value="all">All ({userItems.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-6">
              <ItemGrid items={userItems.filter(item => item.status === "available")} />
            </TabsContent>
            
            <TabsContent value="sold" className="mt-6">
              <ItemGrid items={userItems.filter(item => item.status === "sold")} />
            </TabsContent>
            
            <TabsContent value="all" className="mt-6">
              <ItemGrid items={userItems} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

