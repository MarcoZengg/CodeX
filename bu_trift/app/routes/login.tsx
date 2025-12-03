import { useState } from "react";
import type { FormEvent } from "react";
import type { Route } from "./+types/login";
import { useNavigate, Link } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock } from "lucide-react";
// Firebase imports
import { auth } from "@/config/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

import { API_URL } from "@/config";

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

  // Firebase login form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Basic validation
      if (!formData.email || !formData.password) {
        setError("Please enter both email and password");
        setIsSubmitting(false);
        return;
      }

      // Sign in with Firebase
      const cred = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      // Get Firebase ID token
      const idToken = await cred.user.getIdToken(true);
      localStorage.setItem("firebaseToken", idToken);

      // Load user profile from FastAPI
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to load profile");
      }

      const user = await response.json();

      //Save current user
      localStorage.setItem("currentUser", JSON.stringify(user));

      //Redirect
      navigate(createPageUrl("Profile"));
    } catch (err) {
      console.error("Error logging in:", err);
      // Enhanced error messages for Firebase auth errors
      let errorMessage = "Failed to sign in. Please try again.";
      if (err instanceof Error) {
        const errorCode = (err as any).code;
        if (errorCode === "auth/invalid-email") {
          errorMessage = "Invalid email address.";
        } else if (errorCode === "auth/user-disabled") {
          errorMessage = "This account has been disabled.";
        } else if (errorCode === "auth/user-not-found") {
          errorMessage = "No account found with this email.";
        } else if (errorCode === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (errorCode === "auth/network-request-failed") {
          errorMessage = "Network error. Please check your connection.";
        } else if (errorCode === "auth/too-many-requests") {
          errorMessage = "Too many failed attempts. Please try again later.";
        } else if (err.message.includes("Failed to load profile")) {
          errorMessage = "Login successful but could not load profile. Please try again.";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: "email" | "password", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Validate @bu.edu email
      if (!user.email || !user.email.toLowerCase().endsWith("@bu.edu")) {
        // Sign out if email is not @bu.edu
        await signOut(auth);
        setError("Please use a @bu.edu email address to sign in.");
        setIsSubmitting(false);
        return;
      }

      // Get Firebase ID token
      const idToken = await user.getIdToken(true);
      localStorage.setItem("firebaseToken", idToken);

      // Load user profile from FastAPI (ONLY for existing users)
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      // If user doesn't exist, sign them out and redirect to register
      if (response.status === 404) {
        await signOut(auth);
        localStorage.removeItem("firebaseToken");
        setIsSubmitting(false);
        // Show message and redirect to register page where they can sign up with Google
        setError("No account found with this Google email. Redirecting to sign up...");
        setTimeout(() => {
          navigate(`${createPageUrl("Register")}?from=google-login`);
        }, 1500); // Show message for 1.5 seconds before redirecting
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to load profile");
      }

      const userData = await response.json();
      localStorage.setItem("currentUser", JSON.stringify(userData));

      // Redirect to profile
      navigate(createPageUrl("Profile"));
    } catch (err) {
      console.error("Error signing in with Google:", err);
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (err instanceof Error) {
        const errorCode = (err as any).code;
        if (errorCode === "auth/popup-closed-by-user") {
          errorMessage = "Sign-in popup was closed. Please try again.";
        } else if (errorCode === "auth/popup-blocked") {
          errorMessage = "Popup was blocked. Please allow popups and try again.";
        } else if (errorCode === "auth/network-request-failed") {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
            <CardTitle className="text-3xl font-bold text-neutral-900">
              Welcome Back
            </CardTitle>
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
                <Label className="text-neutral-700 font-semibold">
                  BU Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
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
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-neutral-700 font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold text-lg"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-neutral-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-neutral-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                variant="outline"
                className="w-full h-12 border-2 border-neutral-300 hover:bg-neutral-50 font-semibold"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>

              {/* Register link */}
              <p className="text-center text-sm text-neutral-600 pt-4">
                Don't have an account?{" "}
                <Link
                  to={createPageUrl("Register")}
                  className="text-red-600 hover:text-red-700 font-semibold underline"
                >
                  Create account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
