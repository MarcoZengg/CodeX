import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Item, Review } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import type { Review as ReviewType } from "@/entities/Review";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Package, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function meta() {
  return [
    { title: "Student Profile - BUThrift" },
    {
      name: "description",
      content: "View another student's profile and reviews",
    },
  ];
}

export default function UserProfile() {
  const { id } = useParams();
  const [items, setItems] = useState<ItemType[]>([]);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id]);

  const loadData = async (userId: string) => {
    try {
      setIsLoading(true);
      const userItems = await Item.filter(
        { seller_id: userId },
        "-created_date"
      );
      setItems(userItems);
      const userReviews = await Review.filter({
        reviewee_id: userId,
      });
      setReviews(userReviews);
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

  const displayName = id ? `User ${String(id).slice(0, 4)}` : "BU Student";
  const displayInitial = displayName[0]?.toUpperCase() || "U";

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6 flex items-center justify-center">
        <p className="text-neutral-700">User not found.</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-neutral-200/60 overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-red-600 to-red-700" />
            <CardContent className="relative pt-0 pb-6">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                <div className="relative -mt-12">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <span className="text-xl font-bold text-red-600">
                      {displayInitial}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h1 className="text-xl font-bold text-neutral-900 mb-1">
                        {displayName}
                      </h1>
                      <p className="text-sm text-neutral-600">
                        BU student on BUThrift
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-neutral-900">
                            {averageRating ? averageRating.toFixed(1) : "5.0"}
                          </span>
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        </div>
                        <span className="text-xs text-neutral-600">
                          {reviewCount > 0
                            ? `${reviewCount} review${
                                reviewCount > 1 ? "s" : ""
                              }`
                            : "No reviews yet"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-neutral-200">
                <div className="text-center">
                  <div className="text-xl font-bold text-neutral-900">
                    {items.length}
                  </div>
                  <div className="text-sm text-neutral-600">
                    Items Listed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-neutral-900">
                    {reviews.filter((r) => r.rating >= 4).length}
                  </div>
                  <div className="text-sm text-neutral-600">
                    Positive Reviews
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-neutral-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-neutral-600">
                  This student has not received any reviews yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <Star
                              key={i}
                              className={
                                i < review.rating
                                  ? "w-4 h-4 text-yellow-400 fill-current"
                                  : "w-4 h-4 text-neutral-300"
                              }
                            />
                          ))}
                        </div>
                        {review.created_date && (
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(
                              review.created_date
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-neutral-800">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-neutral-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items listed by this student
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-600">
                  This student has not listed any items yet.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <Link key={item.id} to={`/items/${item.id}`}>
                      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 border-neutral-200/60">
                        <div className="h-36 bg-neutral-100 relative overflow-hidden">
                          {item.images?.[0] ? (
                            <img
                              src={item.images[0]}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-neutral-400" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <Badge
                              variant={
                                item.status === "available"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-semibold text-neutral-900 mb-1 line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-sm text-neutral-600 mb-1 line-clamp-1">
                            {item.description}
                          </p>
                          <p className="text-base font-bold text-red-600">
                            ${item.price}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="text-center text-xs text-neutral-400">
          <Link to="/messages" className="underline">
            Back to messages
          </Link>
        </div>
      </div>
    </div>
  );
}
