import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/items";
import { Item } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import { Link, useSearchParams } from "react-router";
import { createPageUrl } from "@/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const conditionColors: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  like_new: "bg-blue-100 text-blue-800",
  good: "bg-yellow-100 text-yellow-800",
  fair: "bg-orange-100 text-orange-800",
  poor: "bg-red-100 text-red-800"
};

const categories = [
  { value: "all", label: "All Categories" },
  { value: "textbooks", label: "Textbooks" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "furniture", label: "Furniture" },
  { value: "school_supplies", label: "School Supplies" },
  { value: "sports_equipment", label: "Sports Equipment" },
  { value: "home_decor", label: "Home Decor" },
  { value: "kitchen_items", label: "Kitchen Items" },
  { value: "bikes_transport", label: "Bikes & Transport" },
  { value: "other", label: "Other" }
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Browse Items - BUThrift" },
    { name: "description", content: "Browse available items on BUThrift" },
  ];
}

export default function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ItemType[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemType[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);

  const filterAndSortItems = useCallback(() => {
    // Create a copy of items array to avoid mutating the original
    let filtered = [...items];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort items
    switch (sortBy) {
      case "price_low":
        // Low to High: ascending order (a - b)
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_high":
        // High to Low: descending order (b - a)
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
        // Newest First: descending order (b - a)
        filtered.sort((a, b) => 
          new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
        );
        break;
      case "oldest":
        // Oldest First: ascending order (a - b)
        filtered.sort((a, b) => 
          new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime()
        );
        break;
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [filterAndSortItems]);

  const loadItems = async () => {
    try {
      const allItems = await Item.filter({ status: "available" }, "-created_date", 100);
      setItems(allItems);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Browse Marketplace</h1>
          <p className="text-neutral-600">Discover great finds from fellow BU students</p>
        </div>

        {/* Search & Filters */}
        <Card className="p-6 mb-8 border-neutral-200/60">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-neutral-600">
            {isLoading ? "Loading..." : `${filteredItems.length} items found`}
          </p>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {isLoading ? (
              Array(12).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Link to={`/items/${item.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-neutral-200/60">
                      <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 relative overflow-hidden">
                        {item.images?.[0] ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-neutral-400 text-sm">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge className={`${conditionColors[item.condition] || ''} font-medium`}>
                            {item.condition.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-neutral-900 mb-2 group-hover:text-red-600 transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-red-600">
                            ${item.price}
                          </span>
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">No items found</h3>
                <p className="text-neutral-600">Try adjusting your search or filters</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
