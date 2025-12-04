import { motion } from "framer-motion";
import { Users, ShoppingBag, DollarSign, Leaf } from "lucide-react";

const stats = [
  { icon: Users, label: "Active Students", value: "500+", color: "text-blue-600" },
  { icon: ShoppingBag, label: "Items Sold", value: "1,200+", color: "text-green-600" },
  { icon: DollarSign, label: "Money Saved", value: "$25K+", color: "text-purple-600" },
  { icon: Leaf, label: "Items Reused", value: "800+", color: "text-emerald-600" }
];

export default function CommunityStats() {
  return (
    <section className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mb-12"
      >
        <h2 className="text-3xl font-bold text-neutral-900 mb-4">Community Impact</h2>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Together, we're building a more sustainable and affordable campus lifestyle
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-white to-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-neutral-200/60">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold text-neutral-900 mb-1">{stat.value}</div>
            <div className="text-neutral-600 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
