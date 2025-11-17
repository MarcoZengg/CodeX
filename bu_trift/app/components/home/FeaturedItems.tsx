import { Link } from "react-router";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Item } from "@/entities/Item";

const conditionColors: Record<string, string> = {
  new: "bg-green-100 text-green-800",
  like_new: "bg-blue-100 text-blue-800",
  good: "bg-yellow-100 text-yellow-800",
  fair: "bg-orange-100 text-orange-800",
  poor: "bg-red-100 text-red-800"
};

interface FeaturedItemsProps {
  items: Item[];
  isLoading: boolean;
}

export default function FeaturedItems({ items, isLoading }: FeaturedItemsProps) {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">Latest Finds</h2>
          <p className="text-neutral-600">Fresh listings from your fellow Terriers</p>
        </div>
        <Link
          to={createPageUrl("Browse")}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={`${createPageUrl("ItemDetails")}?id=${item.id}`}>
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
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg text-neutral-900 mb-2 group-hover:text-red-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-red-600">
                        ${item.price}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {item.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}

