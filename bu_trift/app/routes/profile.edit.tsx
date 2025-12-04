import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { User as UserType } from "@/entities/User";
import { UserEntity } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { API_URL } from "@/config";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

const MAX_BIO_LENGTH = 250;

export function meta() {
  return [{ title: "Edit Profile - BUTrift" }];
}

export default function EditProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserType;
        setUser(parsed);
        setDisplayName(parsed.display_name || "");
        setBio(parsed.bio || "");
        setProfileImageUrl(parsed.profile_image_url || null);
      } catch (e) {
        console.error("Failed to parse currentUser", e);
      }
    }
  }, []);

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    const token = localStorage.getItem("firebaseToken");
    if (!token) {
      setError("Not authenticated");
      return;
    }

    // Client-side validation
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (!allowed.includes(file.type)) {
      setError("Unsupported image type. Use JPG/PNG/WebP/GIF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Image is too large. Max size is 5MB.");
      return;
    }

    // Show local preview while uploading
    try {
      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);
    } catch (e) {
      // ignore
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/upload-image`, {
        method: "POST",
        // Do NOT set Content-Type header when sending FormData;
        // only send Authorization header for auth
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Failed to upload image");
      }

      const data = await res.json();
      setProfileImageUrl(data.url);
      // revoke previous preview URL after upload succeeded
      if (localPreview) {
        try { URL.revokeObjectURL(localPreview); } catch (e) {}
        setLocalPreview(null);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await UserEntity.update({
        display_name: displayName,
        bio,
        profile_image_url: profileImageUrl || undefined,
      });

      // update local state and localStorage
      setUser(updated);
      localStorage.setItem("currentUser", JSON.stringify(updated));

      // navigate back to profile view
      navigate(createPageUrl("Profile"));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    // Final confirmation
    const confirmed = window.confirm(
      "⚠️ PERMANENT ACTION ⚠️\n\n" +
      "This will permanently delete:\n" +
      "• Your account from Firebase\n" +
      "• Your profile from the database\n" +
      "• All your listings\n" +
      "• All your conversations and messages\n\n" +
      "This action CANNOT be undone.\n\n" +
      "Are you absolutely sure?"
    );

    if (!confirmed) {
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeletingAccount(true);
    setError(null);

    try {
      await UserEntity.deleteAccount();
      // Redirect to home page after account deletion
      window.location.href = createPageUrl("Home");
    } catch (e: any) {
      console.error("Error deleting account:", e);
      setError(e.message || "Failed to delete account. Please try again.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold">Not signed in</h3>
              <p className="text-sm text-neutral-600">Please sign in to edit your profile.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Bio</label>
              <Textarea
                value={bio}
                onChange={(e) => {
                  const value = e.target.value;
                  setBio(value.length > MAX_BIO_LENGTH ? value.slice(0, MAX_BIO_LENGTH) : value);
                }}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Character limit: {bio.length} / {MAX_BIO_LENGTH}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Profile Image</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-neutral-100 rounded-full overflow-hidden flex items-center justify-center">
                  {profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-red-600 font-bold">{(user.display_name || "")[0]}</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Profile"))}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - Delete Account */}
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-700">
              Proceed with caution. These actions are irreversible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-red-800">Delete Account</h4>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex items-center gap-2"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : showDeleteConfirm ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete Account
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                  </>
                )}
              </Button>
            </div>
            {showDeleteConfirm && (
              <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">
                <p className="font-semibold mb-2">⚠️ Warning</p>
                <p className="mb-2">
                  Click "Confirm Delete Account" again to finalize. This cannot be undone.
                </p>
                <p className="text-xs">
                  All your data will be permanently deleted, including listings, conversations, and messages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
