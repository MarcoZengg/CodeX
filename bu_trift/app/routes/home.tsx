import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Item } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import { Link } from "react-router";
import { createPageUrl } from "@/utils";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import HeroSection from "../components/home/HeroSection";
import FeaturedItems from "../components/home/FeaturedItems";
import CategoryGrid from "../components/home/CategoryGrid";
import CommunityStats from "../components/home/CommunityStats";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BUTrift - Campus Marketplace" },
    { name: "description", content: "Boston University's trusted marketplace for sustainable student living" },
  ];
}

export default function Home() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentItems().catch((error) => {
      console.error("Error loading items:", error);
      setIsLoading(false);
    });
  }, []);

  const loadRecentItems = async () => {
    try {
      setIsLoading(true);
      const recentItems = await Item.filter({ status: "available" }, "-created_date", 6);
      setItems(recentItems);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = createPageUrl(`Browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-neutral-100">
      <HeroSection onSearch={handleSearch} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        <FeaturedItems items={items} isLoading={isLoading} />
        <CategoryGrid />
        <CommunityStats />
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center py-16"
        >
          <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-3xl p-12 shadow-2xl">
            <div className="max-w-2xl mx-auto text-white">
              <Leaf className="w-12 h-12 mx-auto mb-6 text-red-200" />
              <h2 className="text-3xl font-bold mb-4">Start Your Sustainable Journey</h2>
              <p className="text-red-100 text-lg mb-8 leading-relaxed">
                Join hundreds of BU students creating a more sustainable campus community. 
                Every item you buy or sell makes a difference.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={createPageUrl("Browse")}>
                  <Button size="lg" className="bg-white text-red-700 hover:bg-red-50 font-semibold px-8">
                    Browse Items
                  </Button>
                </Link>
                <Link to={createPageUrl("Sell")}>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-red-700 font-semibold px-8">
                    Sell Something
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}