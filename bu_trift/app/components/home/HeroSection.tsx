import { Search, Shield, Users, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function HeroSection({ onSearch, searchQuery, setSearchQuery }: HeroSectionProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }} />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              BU<span className="text-red-200">Thrift</span>
            </h1>
            <p className="text-xl md:text-2xl text-red-100 mb-4 max-w-3xl mx-auto leading-relaxed">
              Boston University's trusted marketplace for sustainable student living
            </p>
            <p className="text-red-200 mb-12 max-w-2xl mx-auto">
              Buy and sell secondhand items within our verified campus community
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto mb-16"
          >
            <div className="flex gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-2">
              <Input
                placeholder="Search for textbooks, furniture, electronics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-0 bg-white text-neutral-900 placeholder:text-neutral-500 rounded-xl text-lg py-4"
              />
              <Button
                onClick={onSearch}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 py-4"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            <div className="flex flex-col items-center">
              <Shield className="w-12 h-12 text-red-200 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Verified Students Only</h3>
              <p className="text-red-100 text-sm">Safe transactions within the BU community</p>
            </div>
            <div className="flex flex-col items-center">
              <Users className="w-12 h-12 text-red-200 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Campus Community</h3>
              <p className="text-red-100 text-sm">Connect with fellow Terriers</p>
            </div>
            <div className="flex flex-col items-center">
              <Recycle className="w-12 h-12 text-red-200 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sustainable Living</h3>
              <p className="text-red-100 text-sm">Reduce waste, save money</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

