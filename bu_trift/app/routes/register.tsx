import { useState } from "react";
import type { FormEvent } from "react";
import type { Route } from "./+types/register";
import { User } from "@/entities";
import type { UserRegister } from "@/entities/User";
import { useNavigate, Link } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { UserPlus, Mail, Lock, User as UserIcon, FileText } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Register - BUTrift" },
    { name: "description", content: "Create your BUTrift account" },
  ];
}

export default function Register(_props: Route.ComponentProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserRegister>({
    email: "",
    password: "",
    display_name: "",
    bio: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.email || !formData.password || !formData.display_name) {
        setError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Validate email is @bu.edu
      if (!formData.email.toLowerCase().endsWith("@bu.edu")) {
        setError("Email must be a @bu.edu email address");
        setIsSubmitting(false);
        return;
      }

      // Validate password length
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        setIsSubmitting(false);
        return;
      }

      // Prepare data - only include non-empty optional fields
      const userData: UserRegister = {
        email: formData.email.trim(),
        password: formData.password,
        display_name: formData.display_name.trim(),
        bio: formData.bio?.trim() || undefined,
      };

      // Call registration API
      const user = await User.register(userData);

      // Store user in localStorage (temporary - will use JWT later)
      localStorage.setItem("currentUser", JSON.stringify(user));

      // Redirect to profile page
      navigate(createPageUrl("Profile"));
    } catch (error) {
      console.error("Error registering user:", error);
      setError(error instanceof Error ? error.message : "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof UserRegister, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-white to-red-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-neutral-900">Create Account</CardTitle>
            <CardDescription className="text-neutral-600">
              Join BUTrift and start buying and selling on campus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-700 font-semibold">
                  BU Email <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@bu.edu"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
                <p className="text-xs text-neutral-500">Must be a @bu.edu email address</p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700 font-semibold">
                  Password <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pl-10 h-12"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-neutral-700 font-semibold">
                  Display Name <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="display_name"
                    type="text"
                    placeholder="Your name as it appears on BUTrift"
                    value={formData.display_name}
                    onChange={(e) => handleChange("display_name", e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-neutral-700 font-semibold">
                  Bio
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-neutral-400" />
                  <Textarea
                    id="bio"
                    placeholder="Tell us a bit about yourself (optional)"
                    value={formData.bio || ""}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    className="pl-10 min-h-[100px] resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed box-border min-w-0 transition-none will-change-auto"
                style={{
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-neutral-600">
                  Already have an account?{" "}
                  <Link
                    to={createPageUrl("Login")}
                    className="text-red-600 hover:text-red-700 font-semibold underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

