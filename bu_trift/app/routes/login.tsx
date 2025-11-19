import { useState } from "react";
import type { FormEvent } from "react";
import type { Route } from "./+types/login";
import { User } from "@/entities";
import type { UserLogin } from "@/entities/User";
import { useNavigate, Link } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - BUTrift" },
    { name: "description", content: "Sign in to your BUTrift account" },
  ];
}

export default function Login(_props: Route.ComponentProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserLogin>({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.email || !formData.password) {
        setError("Please enter both email and password");
        setIsSubmitting(false);
        return;
      }

      // Prepare data
      const credentials: UserLogin = {
        email: formData.email.trim(),
        password: formData.password,
      };

      // Call login API
      const user = await User.login(credentials);

      // Store user in localStorage (temporary - will use JWT later)
      localStorage.setItem("currentUser", JSON.stringify(user));

      // Redirect to profile page
      navigate(createPageUrl("Profile"));
    } catch (error) {
      console.error("Error logging in:", error);
      setError(error instanceof Error ? error.message : "Incorrect email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof UserLogin, value: string) => {
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
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-neutral-900">Welcome Back</CardTitle>
            <CardDescription className="text-neutral-600">
              Sign in to your BUTrift account to continue
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
                  BU Email
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
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700 font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pl-10 h-12"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6 box-border min-w-0 transition-none will-change-auto"
                style={{
                  boxSizing: 'border-box',
                  WebkitAppearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Register Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-neutral-600">
                  Don't have an account?{" "}
                  <Link
                    to={createPageUrl("Register")}
                    className="text-red-600 hover:text-red-700 font-semibold underline"
                  >
                    Create account
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

