import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Item } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import { Link } from "react-router";
import { createPageUrl } from "@/utils";
import { Leaf, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import HeroSection from "../components/home/HeroSection";
import FeaturedItems from "../components/home/FeaturedItems";
import CategoryGrid from "../components/home/CategoryGrid";
import CommunityStats from "../components/home/CommunityStats";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BUThrift - Campus Marketplace" },
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
      // Fetch both "available" and "reserved" items
      const [availableItems, reservedItems] = await Promise.all([
        Item.filter({ status: "available" }, "-created_date", 6),
        Item.filter({ status: "reserved" }, "-created_date", 6),
      ]);
      
      // Combine and sort by creation date (newest first), then take top 6
      const allItems = [...availableItems, ...reservedItems]
        .sort(
          (a, b) =>
            new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
        )
        .slice(0, 6);
      
      setItems(allItems);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const browseUrl = createPageUrl("Browse");
      window.location.href = `${browseUrl}?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-neutral-100">
      <HeroSection onSearch={handleSearch} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        <FeaturedItems items={items} isLoading={isLoading} />
        <CategoryGrid />
        <CommunityStats />
        
        {/* About Us Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200/50"
        >
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <Info className="w-8 h-8 text-indigo-600 mt-1" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Learn About BUThrift</h3>
              <p className="text-neutral-700 mb-6">
                Discover our mission to create a sustainable and connected Boston University community. 
                Meet the team, learn about our impact, and join hundreds of students making a difference.
              </p>
              <Link to={createPageUrl("About")}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Learn More About Us
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
        
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
                  <Button size="lg" variant="outline" className="border-white text-red-700 hover:bg-red-50 hover:text-red-700 font-semibold px-8">
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