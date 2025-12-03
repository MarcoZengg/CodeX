import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { UserPlus, Lock, User as UserIcon, FileText } from "lucide-react";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { API_URL } from "@/config";
import { useEffect } from "react";

export function meta() {
  return [
    { title: "Complete Profile - BUTrift" },
    { name: "description", content: "Complete your BUTrift profile" },
  ];
}

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userDisplayName, setUserDisplayName] = useState<string>("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    display_name: "",
    bio: "",
  });

  // Get current user info from Firebase
  useEffect(() => {
    console.log("🔍 Complete Profile: Checking auth state...");
    
    // Check current user immediately
    const currentUser = auth.currentUser;
    console.log("🔍 Current user from auth.currentUser:", currentUser?.email);
    
    if (currentUser && currentUser.email) {
      console.log("✅ User found immediately, setting state...");
      setUserEmail(currentUser.email);
      setUserDisplayName(currentUser.displayName || "");
      // Pre-fill display name if available
      if (currentUser.displayName) {
        setFormData(prev => ({ 
          ...prev, 
          display_name: prev.display_name || currentUser.displayName || "" 
        }));
      }
      setIsLoadingAuth(false);
    } else {
      console.log("⏳ No user found immediately, waiting for auth state change...");
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔔 Auth state changed:", user?.email);
      if (user && user.email) {
        console.log("✅ User authenticated, setting state...");
        setUserEmail(user.email);
        setUserDisplayName(user.displayName || "");
        // Pre-fill display name if available
        if (user.displayName) {
          setFormData(prev => ({ 
            ...prev, 
            display_name: prev.display_name || user.displayName || "" 
          }));
        }
        setIsLoadingAuth(false);
      } else {
        console.log("❌ No user in auth state, redirecting to login...");
        // User not logged in, redirect to login
        setIsLoadingAuth(false);
        navigate(createPageUrl("Login"));
      }
    });

    // Short timeout - if no user after 1 second, stop loading
    const timeoutId = setTimeout(() => {
      console.log("⏰ Timeout reached, stopping loading...");
      setIsLoadingAuth(false);
      if (!auth.currentUser) {
        console.log("❌ Still no user after timeout, redirecting to login...");
        navigate(createPageUrl("Login"));
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setError("You must be logged in to complete your profile. Please sign in with Google first.");
        setIsSubmitting(false);
        return;
      }

      // Validation
      if (!formData.password || !formData.display_name) {
        setError("Please fill in all required fields (password and display name)");
        setIsSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        setIsSubmitting(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setIsSubmitting(false);
        return;
      }

      // Complete profile via backend (sets password in Firebase and updates profile)
      const idToken = await currentUser.getIdToken(true);
      const response = await fetch(`${API_URL}/api/users/complete-profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: formData.password,
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to complete profile");
      }

      const userData = await response.json();
      localStorage.setItem("currentUser", JSON.stringify(userData));

      // Redirect to profile page
      navigate(createPageUrl("Profile"));
    } catch (err) {
      console.error("Error completing profile:", err);
      let errorMessage = "Failed to complete profile. Please try again.";
      if (err instanceof Error) {
        const errorCode = (err as any).code;
        if (errorCode === "auth/weak-password") {
          errorMessage = "Password is too weak. Please use at least 6 characters.";
        } else if (errorCode === "auth/email-already-in-use") {
          errorMessage = "This email is already in use with a different account.";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Get email from currentUser if state hasn't updated yet
  const displayEmail = userEmail || auth.currentUser?.email || "";
  const isAuthenticated = !!auth.currentUser || !!userEmail;

  // Show loading only briefly while checking auth (max 1 second)
  if (isLoadingAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, redirect (should be handled by useEffect but just in case)
  if (!isLoadingAuth && !isAuthenticated) {
    navigate(createPageUrl("Login"));
    return null;
  }

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
            <CardTitle className="text-3xl font-bold text-neutral-900">Complete Your Profile</CardTitle>
            <CardDescription className="text-neutral-600">
              Add a password and complete your profile to finish setting up your account
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

              {displayEmail && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                  <p className="font-semibold mb-1">Signed in with Google</p>
                  <p className="text-xs">{displayEmail}</p>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700 font-semibold">
                  Set Password <span className="text-red-600">*</span>
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
                <p className="text-xs text-neutral-500">You'll be able to log in with email/password after this</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-neutral-700 font-semibold">
                  Confirm Password <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
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
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-lg shadow-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Completing Profile...
                  </span>
                ) : (
                  "Complete Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

