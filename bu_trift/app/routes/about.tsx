import { motion } from "framer-motion";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Leaf, Users, Target, Heart, ShoppingBag, TrendingUp } from "lucide-react";
import { createPageUrl } from "@/utils";

export function meta() {
  return [
    { title: "About Us - BUTrift" },
    { name: "description", content: "Learn about BUTrift's mission to promote sustainable student living at Boston University" },
  ];
}

export default function About() {
  const team = [
    {
      name: "Jerry Teixeira",
      role: "",
      bio: "",
    },
    {
      name: "Marco Zeng",
      role: "",
      bio: "",
    },
    {
      name: "Minjun Kim",
      role: "",
      bio: "",
    },
    {
      name: "Kenneth Chen",
      role: "",
      bio: "",
    },
  ];

  const features = [
    {
      icon: Shield,
      title: "Verified Students",
      description: "All users are verified Boston University students for a safe, trusted community.",
    },
    {
      icon: Leaf,
      title: "Sustainability Focus",
      description: "Every transaction reduces waste and promotes eco-friendly campus living.",
    },
    {
      icon: Users,
      title: "Campus Community",
      description: "Connect directly with fellow Terriers and support your peers.",
    },
    {
      icon: Heart,
      title: "Affordable Living",
      description: "Find quality secondhand items at prices that fit student budgets.",
    },
  ];

  const stats = [
    { label: "Active Students", value: "500+" },
    { label: "Items Listed", value: "1000+" },
    { label: "Transactions", value: "200+" },
    { label: "CO₂ Saved (tons)", value: "1.2" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-neutral-100">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-7xl mx-auto px-6 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">About BUTrift</h1>
          <p className="text-xl text-red-100 max-w-2xl mx-auto">
            Building a more sustainable and connected Boston University community, one transaction at a time.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Mission */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center"
        >
          <h2 className="text-4xl font-bold text-neutral-900 mb-4">Our Mission</h2>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            To empower Boston University students to live sustainably by providing a trusted, verified marketplace 
            for buying and selling secondhand items within our campus community. We believe that every item has a 
            second life, and every student can make a positive environmental impact.
          </p>
        </motion.section>

        {/* Core Values */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <h2 className="text-4xl font-bold text-neutral-900 mb-12 text-center">Our Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                >
                  <Card className="h-full border-neutral-200/60 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-neutral-900">{feature.title}</h3>
                      <p className="text-neutral-600 text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Impact Stats */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-20 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-12 text-white"
        >
          <h2 className="text-3xl font-bold mb-12 text-center">Our Impact</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-red-400 mb-2">{stat.value}</div>
                <div className="text-neutral-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <h2 className="text-4xl font-bold text-neutral-900 mb-12 text-center">Meet the Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {team.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden border-neutral-200/60">
                  <div className="h-40 bg-gradient-to-br from-red-600 to-red-700" />
                  <CardContent className="p-6 text-center -mt-20 relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold border-4 border-white">
                      {member.name.charAt(0)}
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-1">{member.name}</h3>
                    <p className="text-red-600 font-medium mb-3">{member.role}</p>
                    <p className="text-neutral-600 text-sm">{member.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center py-12"
        >
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">Join the Movement</h2>
          <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
            Be part of a sustainable campus community. Start buying, selling, and making a difference today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl("Browse")}>
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Browse Items
              </Button>
            </Link>
            <Link to={createPageUrl("Sell")}>
              <Button size="lg" variant="outline">
                <TrendingUp className="w-5 h-5 mr-2" />
                Start Selling
              </Button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
