import { useState } from "react";
import type { FormEvent } from "react";
import type { Route } from "./+types/register";
import { useNavigate, Link } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { UserPlus, Mail, User as UserIcon, FileText } from "lucide-react";

// Firebase imports
import { auth } from "@/config/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { API_URL } from "@/config";

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
  const [formData, setFormData] = useState({
    email: "",
    display_name: "",
    bio: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Required fields (password stays only on frontend for Firebase)
      if (!formData.email || !formData.password || !formData.display_name) {
        setError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Validate BU email
      if (!formData.email.toLowerCase().endsWith("@bu.edu")) {
        setError("Email must be a @bu.edu email address");
        setIsSubmitting(false);
        return;
      }

      // Create account with Firebase
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      // Get Firebase ID token
      const idToken = await cred.user.getIdToken(true);
      localStorage.setItem("firebaseToken", idToken);

      // Call backend to create profile
      const response = await fetch(`${API_URL}/api/users/create-profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create profile");
      }

      const user = await response.json();
      localStorage.setItem("currentUser", JSON.stringify(user));

      navigate(createPageUrl("Profile"));
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Failed to register account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
                <Label>Email (must be @bu.edu)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Password -- REMOVED FROM BACKEND, kept only for Firebase */}
              <div className="space-y-2">
                <Label>Password (Firebase only)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-12"
                  required
                  minLength={6}
                />
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => handleChange("display_name", e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>Bio (optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold text-lg"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-neutral-600 pt-4">
                Already have an account?{" "}
                <Link
                  to={createPageUrl("Login")}
                  className="text-red-600 font-semibold underline hover:text-red-700"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}