import { Link } from "react-router";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Smartphone,
  Shirt,
  Armchair,
  PenTool,
  Dumbbell,
  Home,
  UtensilsCrossed,
  Bike,
  MoreHorizontal
} from "lucide-react";

const categories = [
  { key: "textbooks", name: "Textbooks", icon: BookOpen, color: "from-blue-500 to-blue-600" },
  { key: "electronics", name: "Electronics", icon: Smartphone, color: "from-purple-500 to-purple-600" },
  { key: "clothing", name: "Clothing", icon: Shirt, color: "from-pink-500 to-pink-600" },
  { key: "furniture", name: "Furniture", icon: Armchair, color: "from-amber-500 to-amber-600" },
  { key: "school_supplies", name: "School Supplies", icon: PenTool, color: "from-green-500 to-green-600" },
  { key: "sports_equipment", name: "Sports", icon: Dumbbell, color: "from-red-500 to-red-600" },
  { key: "home_decor", name: "Home Decor", icon: Home, color: "from-indigo-500 to-indigo-600" },
  { key: "kitchen_items", name: "Kitchen", icon: UtensilsCrossed, color: "from-orange-500 to-orange-600" },
  { key: "bikes_transport", name: "Transport", icon: Bike, color: "from-teal-500 to-teal-600" },
  { key: "other", name: "Other", icon: MoreHorizontal, color: "from-gray-500 to-gray-600" }
];

export default function CategoryGrid() {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-neutral-900 mb-4">Shop by Category</h2>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Find exactly what you need from textbooks to furniture, all from fellow BU students
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 + index * 0.05 }}
          >
            <Link to={`${createPageUrl("Browse")}?category=${category.key}`}>
              <Card className="hover:shadow-lg transition-all duration-300 group border-neutral-200/60">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 group-hover:text-red-600 transition-colors">
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

