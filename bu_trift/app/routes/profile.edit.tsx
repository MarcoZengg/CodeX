import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { User as UserType } from "@/entities/User";
import { UserEntity } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { API_URL } from "@/config";

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
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
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
      </div>
    </div>
  );
}
