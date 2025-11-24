import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Camera, Plus, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import type { ItemCategory, ItemCondition, Item as ItemType } from "@/entities/Item";
import { ItemEntity } from "@/entities/Item";
import { API_URL } from "../config";

const categories = [
  { value: "textbooks", label: "Textbooks" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "furniture", label: "Furniture" },
  { value: "school_supplies", label: "School Supplies" },
  { value: "sports_equipment", label: "Sports Equipment" },
  { value: "home_decor", label: "Home Decor" },
  { value: "kitchen_items", label: "Kitchen Items" },
  { value: "bikes_transport", label: "Bikes & Transport" },
  { value: "other", label: "Other" },
];

const conditions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

interface FormData {
  title: string;
  description: string;
  price: string;
  category: ItemCategory | "";
  condition: ItemCondition | "";
  location: string;
  is_negotiable: boolean;
  images: string[];
}

export default function Sell() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Load Firebase token & redirect if missing
  useEffect(() => {
    const token = localStorage.getItem("firebaseToken");
    if (!token) {
      navigate(createPageUrl("Login"));
      return;
    }
    setFirebaseToken(token);
  }, [navigate]);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    is_negotiable: false,
    images: [],
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // FIXED: Image upload must include Firebase token
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !firebaseToken) return;

    setUploadingImages(true);
    const uploaded: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_URL}/api/upload-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${firebaseToken}` },
          body: form,
        });

        if (!res.ok) throw new Error("Upload failed");

        const json = await res.json();
        uploaded.push(json.url);
      }

      updateField("images", [...formData.images, ...uploaded]);
      setImageError(null);
    } catch {
      alert("Failed to upload image(s). Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (i: number) => {
    const newImgs = formData.images.filter((_, idx) => idx !== i);
    updateField("images", newImgs);

    if (newImgs.length === 0) {
      setImageError("Please upload at least one photo.");
    } else {
      setImageError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!firebaseToken) {
      navigate(createPageUrl("Login"));
      return;
    }
    setIsSubmitting(true);

    try {
      // Validate fields
      if (!formData.category || !formData.condition) {
        alert("Please select category and condition");
        setIsSubmitting(false);
        return;
      }

      if (
        !formData.title.trim() ||
        !formData.description.trim() ||
        !formData.price.trim()
      ) {
        alert("Please fill all required fields");
        setIsSubmitting(false);
        return;
      }

      if (formData.images.length === 0) {
        setImageError("Please upload at least one photo.");
        setIsSubmitting(false);
        return;
      }

      // MUST NOT send seller_id — backend derives from Firebase
      const payload: Partial<ItemType> = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        location: formData.location || undefined,
        is_negotiable: formData.is_negotiable,
        images: formData.images,
      };

      await ItemEntity.create(payload);

      navigate(createPageUrl("Home"));
    } catch (err) {
      alert("Failed to publish listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!firebaseToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-neutral-900">Sell Your Item</h1>
          <p className="text-neutral-600">List your item for fellow BU students</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Item Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" />
                Item Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  required
                  className="h-32"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => updateField("category", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(v) => updateField("condition", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Pricing & Pickup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <Label>Pickup Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  checked={formData.is_negotiable}
                  onCheckedChange={(val) => updateField("is_negotiable", val)}
                />
                <Label>Price is negotiable</Label>
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card id="image-upload-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Photos <span className="text-red-600">*</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {imageError && (
                <motion.div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-700">{imageError}</p>
                </motion.div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Upload ${index}`}
                        className="w-full aspect-square object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center cursor-pointer"
              >
                <Upload className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                <p className="text-neutral-600">
                  {uploadingImages ? "Uploading..." : "Click to add images"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button variant="outline" type="button" onClick={() => navigate(createPageUrl("Home"))}>
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting || uploadingImages} className="bg-red-600">
              {isSubmitting ? "Publishing..." : "Publish Listing"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
